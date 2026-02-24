import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const JWT_EXPIRY = "365d";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const TTL_MINUTES = 15;

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

function generateCode() {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

/** POST /api/login-codes - create a one-time login code (coach only). Body: { athleteId, teamCode }. */
router.post("/", requireAuth, async (req, res) => {
  try {
    if (!req.user.isCoach) {
      return res.status(403).json({ error: "Only coaches can create login codes" });
    }
    const { athleteId, teamCode } = req.body || {};
    if (!athleteId || !teamCode) {
      return res.status(400).json({ error: "athleteId and teamCode required" });
    }
    const code = String(teamCode).trim().toUpperCase();
    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: "Team not found" });
    const teamId = teamRes.rows[0].id;
    const athRes = await pool.query(
      "SELECT id, external_id, name, position, grade FROM athletes WHERE team_id = $1 AND external_id = $2",
      [teamId, athleteId]
    );
    if (athRes.rows.length === 0) return res.status(404).json({ error: "Athlete not found" });
    const athlete = athRes.rows[0];

    const loginCode = generateCode();
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);
    await pool.query(
      "INSERT INTO login_codes (code, team_id, athlete_id, expires_at) VALUES ($1, $2, $3, $4)",
      [loginCode, teamId, athlete.id, expiresAt]
    );

    return res.status(201).json({ code: loginCode, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to create login code" });
  }
});

/** GET /api/login-codes/:code - redeem code (no auth). Optional query teamCode to verify team. Returns identity + token. */
router.get("/:code", async (req, res) => {
  try {
    const rawCode = String(req.params.code || "").toUpperCase().trim();
    const teamCodeQuery = req.query.teamCode ? String(req.query.teamCode).trim().toUpperCase() : null;
    if (!rawCode) return res.status(400).json({ error: "Code required" });

    const row = await pool.query(
      `SELECT lc.code, lc.team_id, lc.athlete_id, lc.expires_at, lc.used,
              t.code AS team_code,
              a.external_id, a.name, a.position, a.grade
       FROM login_codes lc
       JOIN teams t ON t.id = lc.team_id
       JOIN athletes a ON a.id = lc.athlete_id
       WHERE lc.code = $1`,
      [rawCode]
    );
    if (row.rows.length === 0) return res.status(404).json({ error: "Code not found or already used" });
    const r = row.rows[0];
    if (r.used) return res.status(404).json({ error: "Code not found or already used" });
    if (new Date(r.expires_at) < new Date()) {
      return res.status(400).json({ error: "This code has expired" });
    }
    if (teamCodeQuery && r.team_code !== teamCodeQuery) {
      return res.status(400).json({ error: "Team code does not match" });
    }

    await pool.query("UPDATE login_codes SET used = TRUE WHERE code = $1", [rawCode]);

    const identity = {
      athleteId: r.external_id,
      name: r.name,
      teamCode: r.team_code,
      position: r.position || "",
      grade: r.grade || "",
      isCoach: false,
    };
    const token = signToken({ teamCode: r.team_code, athleteId: r.external_id, isCoach: false, name: r.name });
    return res.json({ ...identity, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to redeem code" });
  }
});

export default router;
