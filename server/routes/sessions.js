import { Router } from "express";
import pool from "../db.js";
import { hasWorkoutInfo, countEvidence } from "../lib/attendance.js";

const router = Router();

async function resolveTeamAndAthlete(teamCode, athleteId) {
  const code = String(teamCode).trim().toUpperCase();
  const teamRes = await pool.query("SELECT id FROM teams WHERE code = $1", [code]);
  if (teamRes.rows.length === 0) return { teamId: null, athleteId: null };
  const teamId = teamRes.rows[0].id;
  const athRes = await pool.query(
    "SELECT id FROM athletes WHERE team_id = $1 AND external_id = $2",
    [teamId, athleteId]
  );
  if (athRes.rows.length === 0) return { teamId, athleteId: null };
  return { teamId, athleteId: athRes.rows[0].id };
}

function sessionToJson(row, exercisesRows, setsByExercise) {
  const exercises = (exercisesRows || []).map((ex) => {
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

/** POST /api/sessions - create session */
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const session = req.body;
    if (!session || !session.teamCode || !session.athleteId || !session.id) {
      return res.status(400).json({ error: "teamCode, athleteId, and session id required" });
    }
    const { teamId, athleteId: dbAthleteId } = await resolveTeamAndAthlete(session.teamCode, session.athleteId);
    if (!teamId || !dbAthleteId) {
      return res.status(404).json({ error: "Team or athlete not found" });
    }

    await client.query("BEGIN");

    const sessionIns = await client.query(
      `INSERT INTO sessions (team_id, athlete_id, external_id, date, phase, type, rpe, duration, notes, started_at, complete, checkin_json, checkin_recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        teamId,
        dbAthleteId,
        session.id,
        session.date,
        session.phase,
        session.type,
        session.rpe !== "" && session.rpe != null ? (parseFloat(session.rpe) || null) : null,
        session.duration !== "" && session.duration != null ? (parseFloat(session.duration) || null) : null,
        session.notes || null,
        session.startedAt || null,
        session.complete || false,
        session.checkIn ? JSON.stringify(session.checkIn) : null,
        session.checkInRecommendations ? JSON.stringify(session.checkInRecommendations) : null,
      ]
    );
    const sessionDbId = sessionIns.rows[0].id;
    const exercises = session.exercises || [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const exRes = await client.query(
        `INSERT INTO session_exercises (session_id, name, sets, reps, tempo, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [sessionDbId, ex.name, ex.sets ?? 0, ex.reps ?? "", ex.tempo || null, i]
      );
      const exId = exRes.rows[0].id;
      const setsData = ex.sets_data || [];
      for (let si = 0; si < setsData.length; si++) {
        const s = setsData[si];
        await client.query(
          `INSERT INTO session_sets (exercise_id, set_index, weight, reps, done)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (exercise_id, set_index) DO UPDATE SET weight = EXCLUDED.weight, reps = EXCLUDED.reps, done = EXCLUDED.done`,
          [exId, si, s.weight || null, s.reps || null, s.done || false]
        );
      }
    }

    if (session.complete && hasWorkoutInfo(session)) {
      const evidence = countEvidence(session);
      await client.query(
        `INSERT INTO daily_attendance (team_id, athlete_id, date, status, evidence_count, updated_at)
         VALUES ($1, $2, $3, 'present', $4, NOW())
         ON CONFLICT (team_id, athlete_id, date) DO UPDATE SET status = 'present', evidence_count = $4, updated_at = NOW()`,
        [teamId, dbAthleteId, session.date, evidence]
      );
    }

    const full = await getSessionByExternalId(client, teamId, session.id);
    await client.query("COMMIT");
    return res.status(201).json(full);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    return res.status(500).json({ error: "Failed to create session" });
  } finally {
    client.release();
  }
});

/** PUT /api/sessions/:id - update session (edits or finish). */
router.put("/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    const externalId = req.params.id;
    const session = req.body;
    if (!session || !session.teamCode || !session.athleteId) {
      return res.status(400).json({ error: "teamCode and athleteId required" });
    }
    const { teamId, athleteId: dbAthleteId } = await resolveTeamAndAthlete(session.teamCode, session.athleteId);
    if (!teamId || !dbAthleteId) {
      return res.status(404).json({ error: "Team or athlete not found" });
    }

    const existing = await client.query(
      "SELECT id FROM sessions WHERE team_id = $1 AND external_id = $2",
      [teamId, externalId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    const sessionDbId = existing.rows[0].id;

    await client.query("BEGIN");

    await client.query(
      `UPDATE sessions SET date = $1, phase = $2, type = $3, rpe = $4, duration = $5, notes = $6, started_at = $7, completed_at = $8, complete = $9, checkin_json = $10, checkin_recommendations = $11
       WHERE id = $12`,
      [
        session.date,
        session.phase,
        session.type,
        session.rpe !== "" && session.rpe != null ? (parseFloat(session.rpe) || null) : null,
        session.duration !== "" && session.duration != null ? (parseFloat(session.duration) || null) : null,
        session.notes || null,
        session.startedAt || null,
        session.completedAt || null,
        session.complete || false,
        session.checkIn ? JSON.stringify(session.checkIn) : null,
        session.checkInRecommendations ? JSON.stringify(session.checkInRecommendations) : null,
        sessionDbId,
      ]
    );

    const exIds = await client.query("SELECT id FROM session_exercises WHERE session_id = $1 ORDER BY sort_order", [sessionDbId]);
    const exercises = session.exercises || [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      let exId;
      if (exIds.rows[i]) {
        exId = exIds.rows[i].id;
        await client.query(
          "UPDATE session_exercises SET name = $1, sets = $2, reps = $3, tempo = $4 WHERE id = $5",
          [ex.name, ex.sets ?? 0, ex.reps ?? "", ex.tempo || null, exId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO session_exercises (session_id, name, sets, reps, tempo, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [sessionDbId, ex.name, ex.sets ?? 0, ex.reps ?? "", ex.tempo || null, i]
        );
        exId = ins.rows[0].id;
      }
      const setsData = ex.sets_data || [];
      for (let si = 0; si < setsData.length; si++) {
        const s = setsData[si];
        await client.query(
          `INSERT INTO session_sets (exercise_id, set_index, weight, reps, done)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (exercise_id, set_index) DO UPDATE SET weight = EXCLUDED.weight, reps = EXCLUDED.reps, done = EXCLUDED.done`,
          [exId, si, s.weight || null, s.reps || null, s.done || false]
        );
      }
    }

    if (session.complete && hasWorkoutInfo(session)) {
      const evidence = countEvidence(session);
      await client.query(
        `INSERT INTO daily_attendance (team_id, athlete_id, date, status, evidence_count, updated_at)
         VALUES ($1, $2, $3, 'present', $4, NOW())
         ON CONFLICT (team_id, athlete_id, date) DO UPDATE SET status = 'present', evidence_count = $4, updated_at = NOW()`,
        [teamId, dbAthleteId, session.date, evidence]
      );
    }

    const full = await getSessionByExternalId(client, teamId, externalId);
    await client.query("COMMIT");
    return full ? res.json(full) : res.status(500).json({ error: "Failed to read back session" });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    return res.status(500).json({ error: "Failed to update session" });
  } finally {
    client.release();
  }
});

async function getSessionByExternalId(pool, teamId, externalId) {
  const sRes = await pool.query(
    `SELECT s.id, s.external_id, s.date, s.phase, s.type, s.rpe, s.duration, s.notes, s.started_at, s.completed_at, s.complete, s.checkin_json, s.checkin_recommendations,
            a.external_id AS athlete_external_id, a.name AS athlete_name, a.position AS athlete_position, a.grade AS athlete_grade, t.code AS team_code
     FROM sessions s
     JOIN athletes a ON a.id = s.athlete_id
     JOIN teams t ON t.id = s.team_id
     WHERE s.team_id = $1 AND s.external_id = $2`,
    [teamId, externalId]
  );
  if (sRes.rows.length === 0) return null;
  const row = sRes.rows[0];
  const exRes = await pool.query(
    "SELECT id, name, sets, reps, tempo FROM session_exercises WHERE session_id = $1 ORDER BY sort_order",
    [row.id]
  );
  const setsRes = await pool.query(
    `SELECT exercise_id, set_index, weight, reps, done FROM session_sets
     WHERE exercise_id = ANY($1) ORDER BY exercise_id, set_index`,
    [exRes.rows.map((r) => r.id)]
  );
  const setsByExercise = {};
  for (const s of setsRes.rows) {
    if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
    setsByExercise[s.exercise_id].push(s);
  }
  return sessionToJson(row, exRes.rows, setsByExercise);
}

export async function listAthleteSessions(req, res) {
  try {
    const { athleteId } = req.params;
    const teamCode = req.query.teamCode;
    if (!teamCode) return res.status(400).json({ error: "teamCode query required" });
    const { teamId, athleteId: dbAthleteId } = await resolveTeamAndAthlete(teamCode, athleteId);
    if (!teamId || !dbAthleteId) {
      return res.json([]);
    }

    const sRes = await pool.query(
      `SELECT s.id, s.external_id, s.date, s.phase, s.type, s.rpe, s.duration, s.notes, s.started_at, s.completed_at, s.complete, s.checkin_json, s.checkin_recommendations,
              a.external_id AS athlete_external_id, a.name AS athlete_name, a.position AS athlete_position, a.grade AS athlete_grade, t.code AS team_code
       FROM sessions s
       JOIN athletes a ON a.id = s.athlete_id
       JOIN teams t ON t.id = s.team_id
       WHERE s.team_id = $1 AND s.athlete_id = $2
       ORDER BY s.date DESC, s.started_at DESC NULLS LAST
       LIMIT 50`,
      [teamId, dbAthleteId]
    );

    const sessionIds = sRes.rows.map((r) => r.id);
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

    const sessions = sRes.rows.map((row) => {
      const exRows = exercisesBySession[row.id] || [];
      return sessionToJson(row, exRows, setsByExercise);
    });
    return res.json(sessions);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list sessions" });
  }
}

export default router;
