import { Router } from "express";
import pool from "../db.js";

const router = Router();

/** GET /api/roster?teamCode=... - public roster for athlete selection; returns roster + showLevelToAthletes */
router.get("/", async (req, res) => {
  try {
    const teamCode = req.query.teamCode;
    if (!teamCode) return res.status(400).json({ error: "teamCode query required" });
    const code = String(teamCode).trim().toUpperCase();

    const teamRes = await pool.query(
      "SELECT id, COALESCE(show_level_to_athletes, false) AS show_level_to_athletes FROM teams WHERE code = $1",
      [code]
    );
    if (teamRes.rows.length === 0) return res.status(404).json({ error: "Team not found" });
    const teamId = teamRes.rows[0].id;
    const showLevelToAthletes = teamRes.rows[0].show_level_to_athletes === true;

    const rosterRes = await pool.query(
      "SELECT external_id, name, position, grade, jersey_number, level FROM athletes WHERE team_id = $1 ORDER BY name",
      [teamId]
    );
    const roster = {};
    for (const row of rosterRes.rows) {
      roster[row.external_id] = {
        name: row.name,
        position: row.position || "",
        grade: row.grade || "",
        jerseyNumber: row.jersey_number || undefined,
        level: row.level || undefined,
      };
    }

    return res.json({ roster, showLevelToAthletes });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load roster" });
  }
});

export default router;
