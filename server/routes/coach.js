import { Router } from "express";
import pool from "../db.js";

const router = Router();

/** GET /api/coach/dashboard?teamCode=...&date=...&phase=... - roster + session feed + attendance */
router.get("/dashboard", async (req, res) => {
  try {
    const teamCode = req.query.teamCode;
    const filterDate = req.query.date || null;
    const filterPhase = req.query.phase != null && req.query.phase !== "" ? parseInt(req.query.phase, 10) : null;
    if (!teamCode) {
      return res.status(400).json({ error: "teamCode query required" });
    }
    const code = String(teamCode).trim().toUpperCase();

    const teamRes = await pool.query("SELECT id, COALESCE(show_level_to_athletes, false) AS show_level_to_athletes FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) {
      return res.json({ roster: {}, allSessions: {}, todayAttendance: [], showLevelToAthletes: false });
    }
    const teamId = teamRes.rows[0].id;
    const showLevelToAthletes = teamRes.rows[0].show_level_to_athletes === true;

    const rosterRes = await pool.query(
      "SELECT external_id, name, position, grade, jersey_number, level, joined_at FROM athletes WHERE team_id = $1 ORDER BY name",
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
        joinedAt: row.joined_at,
      };
    }

    const conditions = ["s.team_id = $1"];
    const sessionParams = [teamId];
    if (filterDate) {
      conditions.push(`s.date = $${sessionParams.length + 1}`);
      sessionParams.push(filterDate);
    }
    if (filterPhase != null && !Number.isNaN(filterPhase)) {
      conditions.push(`s.phase = $${sessionParams.length + 1}`);
      sessionParams.push(filterPhase);
    }
    const sessionsRes = await pool.query(
      `SELECT s.id, s.external_id, s.athlete_id, s.date, s.phase, s.type, s.rpe, s.duration, s.notes, s.started_at, s.completed_at, s.complete, s.checkin_json, s.checkin_recommendations,
            a.external_id AS athlete_external_id, a.name AS athlete_name, a.position AS athlete_position, a.grade AS athlete_grade, t.code AS team_code
     FROM sessions s
     JOIN athletes a ON a.id = s.athlete_id
     JOIN teams t ON t.id = s.team_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.date DESC, s.started_at DESC NULLS LAST
     LIMIT 500`,
      sessionParams
    );

    const sessionIds = sessionsRes.rows.map((r) => r.id);
    const exRes =
      sessionIds.length > 0
        ? await pool.query(
            "SELECT id, session_id, name, sets, reps, tempo, sort_order FROM session_exercises WHERE session_id = ANY($1) ORDER BY session_id, sort_order",
            [sessionIds]
          )
        : { rows: [] };
    const exIds = exRes.rows.map((r) => r.id);
    const setsRes =
      exIds.length > 0
        ? await pool.query(
            "SELECT exercise_id, set_index, weight, reps, done FROM session_sets WHERE exercise_id = ANY($1) ORDER BY exercise_id, set_index",
            [exIds]
          )
        : { rows: [] };

    const setsByExercise = {};
    for (const s of setsRes.rows) {
      if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
      setsByExercise[s.exercise_id].push(s);
    }
    const exercisesBySession = {};
    for (const ex of exRes.rows) {
      if (!exercisesBySession[ex.session_id]) exercisesBySession[ex.session_id] = [];
      exercisesBySession[ex.session_id].push(ex);
    }

    const today = filterDate || new Date().toISOString().slice(0, 10);
    const attendanceRes = await pool.query(
      `SELECT a.external_id FROM daily_attendance d
       JOIN athletes a ON a.id = d.athlete_id
       WHERE d.team_id = $1 AND d.date = $2 AND d.status = 'present'`,
      [teamId, today]
    );
    const todayAttendance = attendanceRes.rows.map((r) => r.external_id);

    function rowToSession(row) {
      const exRows = exercisesBySession[row.id] || [];
      const exercises = exRows.map((ex) => {
        const sets = (setsByExercise[ex.id] || []).sort((a, b) => a.set_index - b.set_index);
        return {
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          tempo: ex.tempo || undefined,
          sets_data: sets.map((s) => ({
            weight: s.weight || "",
            reps: s.reps || "",
            done: s.done || false,
          })),
        };
      });
      return {
        id: row.external_id,
        athleteId: row.athlete_external_id,
        athleteName: row.athlete_name,
        position: row.athlete_position || "",
        grade: row.athlete_grade || "",
        teamCode: row.team_code,
        phase: row.phase,
        type: row.type,
        date: row.date,
        exercises,
        rpe: row.rpe != null ? String(row.rpe) : "",
        duration: row.duration != null ? String(row.duration) : "",
        notes: row.notes || "",
        startedAt: row.started_at,
        completedAt: row.completed_at || undefined,
        complete: row.complete || false,
        checkIn: row.checkin_json || undefined,
        checkInRecommendations: row.checkin_recommendations || undefined,
      };
    }

    const allSessions = {};
    for (const row of sessionsRes.rows) {
      const extId = row.athlete_external_id;
      if (!allSessions[extId]) allSessions[extId] = [];
      allSessions[extId].push(rowToSession(row));
    }
    for (const key of Object.keys(allSessions)) {
      allSessions[key].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.startedAt || "").localeCompare(a.startedAt || ""));
    }

    return res.json({
      roster,
      allSessions,
      todayAttendance,
      showLevelToAthletes,
      filterDate: filterDate || null,
      filterPhase: filterPhase != null ? filterPhase : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load dashboard" });
  }
});

function normalizeLevel(value) {
  if (value == null || String(value).trim() === "") return null;
  const v = String(value).trim().toLowerCase();
  if (["varsity", "v", "var"].includes(v)) return "varsity";
  if (["junior varsity", "junior_varsity", "jv", "jr varsity", "jr"].includes(v)) return "junior_varsity";
  return null;
}

/** POST /api/coach/roster/import - bulk import roster from CSV rows */
router.post("/roster/import", async (req, res) => {
  try {
    const { teamCode, rows } = req.body || {};
    if (!teamCode || !Array.isArray(rows)) {
      return res.status(400).json({ error: "teamCode and rows (array) required" });
    }
    const code = String(teamCode).trim().toUpperCase();
    const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
    if (teamRes.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    const teamId = teamRes.rows[0].id;

    let imported = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r && String(r.name || "").trim();
      if (!name) {
        errors.push({ row: i + 1, message: "Name is required" });
        continue;
      }
      const position = r.position != null ? String(r.position).trim() || null : null;
      const grade = r.grade != null ? String(r.grade).trim() || null : null;
      const jersey_number = r.jersey_number != null ? String(r.jersey_number).trim() || null : null;
      const level = normalizeLevel(r.level);

      const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const external_id = jersey_number ? `${slug}_${jersey_number}` : `${slug}_${Date.now()}_${i}`;

      try {
        const existing = await pool.query(
          "SELECT 1 FROM athletes WHERE team_id = $1 AND external_id = $2",
          [teamId, external_id]
        );
        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE athletes SET name = $1, position = $2, grade = $3, jersey_number = $4, level = $5
             WHERE team_id = $6 AND external_id = $7`,
            [name, position, grade, jersey_number, level, teamId, external_id]
          );
          updated += 1;
        } else {
          await pool.query(
            `INSERT INTO athletes (team_id, external_id, name, position, grade, jersey_number, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [teamId, external_id, name, position, grade, jersey_number, level]
          );
          imported += 1;
        }
      } catch (err) {
        errors.push({ row: i + 1, message: err.message || "Insert failed" });
      }
    }

    return res.json({ imported, updated, errors });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to import roster" });
  }
});

/** PATCH /api/coach/settings - update team setting (e.g. show_level_to_athletes) */
router.patch("/settings", async (req, res) => {
  try {
    const { teamCode, showLevelToAthletes } = req.body || {};
    if (!teamCode) return res.status(400).json({ error: "teamCode required" });
    const code = String(teamCode).trim().toUpperCase();
    await pool.query(
      "UPDATE teams SET show_level_to_athletes = $1 WHERE code = $2",
      [showLevelToAthletes === true, code]
    );
    return res.json({ showLevelToAthletes: showLevelToAthletes === true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
