import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import defaultProgram from "../lib/defaultProgram.js";

const router = Router();

/** GET /api/program?teamCode=... — returns program for team (default if no row). Auth required. */
router.get("/", requireAuth, async (req, res) => {
  try {
    const teamCode = req.query.teamCode;
    if (!teamCode) return res.status(400).json({ error: "teamCode query required" });
    const code = String(teamCode).trim().toUpperCase();

    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) {
      return res.json({
        phases: defaultProgram.phases,
        liftTemplates: defaultProgram.liftTemplates,
        speedTemplates: defaultProgram.speedTemplates,
      });
    }
    const teamId = teamRes.rows[0].id;

    const row = await pool.query(
      "SELECT phases, lift_templates, speed_templates FROM team_program WHERE team_id = $1",
      [teamId]
    );
    if (row.rows.length === 0) {
      return res.json({
        phases: defaultProgram.phases,
        liftTemplates: defaultProgram.liftTemplates,
        speedTemplates: defaultProgram.speedTemplates,
      });
    }
    const r = row.rows[0];
    return res.json({
      phases: r.phases || defaultProgram.phases,
      liftTemplates: r.lift_templates || defaultProgram.liftTemplates,
      speedTemplates: r.speed_templates || defaultProgram.speedTemplates,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load program" });
  }
});

/** PUT /api/program — update program (coach only, own team). Body: { teamCode, phases, liftTemplates, speedTemplates }. */
router.put("/", requireAuth, async (req, res) => {
  try {
    if (!req.user.isCoach) return res.status(403).json({ error: "Coach only" });
    const { teamCode, phases, liftTemplates, speedTemplates } = req.body || {};
    if (!teamCode) return res.status(400).json({ error: "teamCode required" });
    const code = String(teamCode).trim().toUpperCase();
    if (req.user.teamCode !== code) return res.status(403).json({ error: "Can only edit your own team program" });

    const phasesArr = Array.isArray(phases) ? phases : null;
    const liftObj = liftTemplates != null && typeof liftTemplates === "object" && !Array.isArray(liftTemplates) ? liftTemplates : null;
    const speedObj = speedTemplates != null && typeof speedTemplates === "object" && !Array.isArray(speedTemplates) ? speedTemplates : null;
    if (!phasesArr || !liftObj || !speedObj) {
      return res.status(400).json({ error: "phases, liftTemplates, and speedTemplates required" });
    }

    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: "Team not found" });
    const teamId = teamRes.rows[0].id;

    await pool.query(
      `INSERT INTO team_program (team_id, phases, lift_templates, speed_templates, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (team_id) DO UPDATE SET
         phases = EXCLUDED.phases,
         lift_templates = EXCLUDED.lift_templates,
         speed_templates = EXCLUDED.speed_templates,
         updated_at = NOW()`,
      [teamId, JSON.stringify(phasesArr), JSON.stringify(liftObj), JSON.stringify(speedObj)]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to save program" });
  }
});

export default router;
