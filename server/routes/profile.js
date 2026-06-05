import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateCoachPin } from "../lib/authHelpers.js";

const router = Router();
const JWT_EXPIRY = "365d";

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

/** POST /api/profile - create or update athlete or coach profile. */
router.post("/", async (req, res) => {
  try {
    const { name, teamCode, athleteId, position, grade, isCoach, jerseyNumber, coachPin } = req.body || {};
    if (!name || !teamCode) {
      return res.status(400).json({ error: "name and teamCode required" });
    }
    const code = String(teamCode).trim().toUpperCase();
    const externalId = athleteId || (isCoach ? "coach" : `${String(name).toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`);

    let teamRow;
    const teamRes = await pool.query(
      "INSERT INTO teams (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id, code",
      [code, code]
    );
    teamRow = teamRes.rows[0];

    if (isCoach) {
      if (!validateCoachPin(coachPin)) {
        return res.status(403).json({ error: "Incorrect coach PIN" });
      }
      let coach = await pool.query(
        "SELECT name FROM users WHERE team_id = $1 AND role = 'coach' LIMIT 1",
        [teamRow.id]
      );
      if (coach.rows.length === 0) {
        await pool.query(
          "INSERT INTO users (team_id, role, name) VALUES ($1, 'coach', $2)",
          [teamRow.id, String(name).trim()]
        );
      }
      const identity = {
        athleteId: "coach",
        name: String(name).trim(),
        teamCode: code,
        position: position || "",
        grade: grade || "",
        isCoach: true,
      };
      const token = signToken({ teamCode: code, athleteId: "coach", isCoach: true, name: identity.name });
      return res.json({ ...identity, token });
    }

    const athleteRes = await pool.query(
      `INSERT INTO athletes (team_id, external_id, name, position, grade, jersey_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (team_id, external_id) DO UPDATE SET
         name = EXCLUDED.name,
         position = EXCLUDED.position,
         grade = EXCLUDED.grade,
         jersey_number = EXCLUDED.jersey_number
       RETURNING id, external_id, name, position, grade, jersey_number`,
      [teamRow.id, externalId, String(name).trim(), position || null, grade || null, jerseyNumber || null]
    );
    const athlete = athleteRes.rows[0];
    try {
      await pool.query(
        "INSERT INTO users (team_id, role, athlete_id, name) VALUES ($1, 'athlete', $2, $3)",
        [teamRow.id, athlete.id, String(name).trim()]
      );
    } catch (_) {
      // ignore duplicate user if any
    }

    const identity = {
      athleteId: athlete.external_id,
      name: athlete.name,
      teamCode: code,
      position: athlete.position || "",
      grade: athlete.grade || "",
      isCoach: false,
      jerseyNumber: athlete.jersey_number || undefined,
    };
    const token = signToken({ teamCode: code, athleteId: identity.athleteId, isCoach: false, name: identity.name });
    return res.json({ ...identity, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

/** POST /api/profile/claim - athlete selects self from roster and verifies with jersey; returns identity, no new athlete. */
router.post("/claim", async (req, res) => {
  try {
    const { teamCode, athleteId, jerseyNumber } = req.body || {};
    if (!teamCode || !athleteId) {
      return res.status(400).json({ error: "teamCode and athleteId required" });
    }
    const code = String(teamCode).trim().toUpperCase();

    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: "Team not found" });
    const teamId = teamRes.rows[0].id;

    const athleteRes = await pool.query(
      "SELECT id, external_id, name, position, grade, jersey_number, level FROM athletes WHERE team_id = $1 AND external_id = $2",
      [teamId, athleteId]
    );
    if (athleteRes.rows.length === 0) return res.status(404).json({ error: "Athlete not found" });
    const a = athleteRes.rows[0];

    const rosterJersey = a.jersey_number != null ? String(a.jersey_number).trim() : "";
    const providedJersey = jerseyNumber != null ? String(jerseyNumber).trim() : "";
    if (rosterJersey !== providedJersey) {
      return res.status(400).json({ error: "Jersey number does not match" });
    }

    const existingUser = await pool.query(
      "SELECT 1 FROM users WHERE team_id = $1 AND athlete_id = $2 LIMIT 1",
      [teamId, a.id]
    );
    if (existingUser.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (team_id, role, athlete_id, name) VALUES ($1, 'athlete', $2, $3)",
        [teamId, a.id, a.name]
      );
    }

    const identity = {
      athleteId: a.external_id,
      name: a.name,
      teamCode: code,
      position: a.position || "",
      grade: a.grade || "",
      isCoach: false,
      jerseyNumber: a.jersey_number || undefined,
      level: a.level || undefined,
    };
    const token = signToken({ teamCode: code, athleteId: identity.athleteId, isCoach: false, name: identity.name });
    return res.json({ ...identity, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to claim profile" });
  }
});

/** GET /api/profile/:id - get profile by external athleteId; requires teamCode query. Auth required. */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const teamCode = req.query.teamCode;
    if (!teamCode) return res.status(400).json({ error: "teamCode query required" });
    const code = String(teamCode).trim().toUpperCase();

    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: "Team not found" });
    const teamId = teamRes.rows[0].id;

    if (id === "coach") {
      const userRes = await pool.query(
        "SELECT name FROM users WHERE team_id = $1 AND role = 'coach' LIMIT 1",
        [teamId]
      );
      if (userRes.rows.length === 0) return res.status(404).json({ error: "Coach not found" });
      const u = userRes.rows[0];
      return res.json({
        athleteId: "coach",
        name: u.name,
        teamCode: code,
        position: "",
        grade: "",
        isCoach: true,
      });
    }

    const athleteRes = await pool.query(
      "SELECT external_id, name, position, grade, jersey_number, level FROM athletes WHERE team_id = $1 AND external_id = $2",
      [teamId, id]
    );
    if (athleteRes.rows.length === 0) return res.status(404).json({ error: "Profile not found" });
    const a = athleteRes.rows[0];
    return res.json({
      athleteId: a.external_id,
      name: a.name,
      teamCode: code,
      position: a.position || "",
      grade: a.grade || "",
      isCoach: false,
      jerseyNumber: a.jersey_number || undefined,
      level: a.level || undefined,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

export default router;
