import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

const hasDb = !!process.env.DATABASE_URL;

describe("GET /api/coach/dashboard", { skip: !hasDb }, () => {
  let coachToken;
  let teamCode;

  before(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    if (!process.env.COACH_PIN) process.env.COACH_PIN = "COACH2025";
    teamCode = `D${Date.now()}`;
    const create = await request(app)
      .post("/api/profile")
      .send({ name: "Dashboard Coach", teamCode, isCoach: true, coachPin: "COACH2025" });
    coachToken = create.body.token;
  });

  it("returns roster, allSessions, todayAttendance when authorized", async () => {
    const res = await request(app)
      .get("/api/coach/dashboard")
      .query({ teamCode })
      .set("Authorization", `Bearer ${coachToken}`)
      .expect(200);
    assert.ok(typeof res.body.roster === "object");
    assert.ok(typeof res.body.allSessions === "object");
    assert.ok(Array.isArray(res.body.todayAttendance));
  });

  it("returns 401 without token", async () => {
    await request(app)
      .get("/api/coach/dashboard")
      .query({ teamCode })
      .expect(401);
  });

  it("returns 403 for athlete token", async () => {
    const athlete = await request(app)
      .post("/api/profile")
      .send({ name: "Not Coach", teamCode: `NC${Date.now()}`, position: "WR", grade: "11" });
    await request(app)
      .get("/api/coach/dashboard")
      .query({ teamCode: athlete.body.teamCode })
      .set("Authorization", `Bearer ${athlete.body.token}`)
      .expect(403);
  });
});

describe("POST /api/sessions and attendance", { skip: !hasDb }, () => {
  it("marks attendance present when session has workout info and complete", async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    const teamCode = `AT${Date.now()}`;
    const profile = await request(app)
      .post("/api/profile")
      .send({ name: "Attendance Athlete", teamCode, position: "TE", grade: "12" });
    const token = profile.body.token;
    const athleteId = profile.body.athleteId;
    const sessionId = `att_${Date.now()}`;

    await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: sessionId,
        athleteId,
        teamCode,
        date: new Date().toISOString().slice(0, 10),
        phase: 1,
        type: "lift",
        complete: true,
        rpe: "8",
        duration: "60",
        exercises: [
          {
            name: "Bench",
            sets: 2,
            reps: "10",
            sets_data: [
              { weight: "95", reps: "10", done: true },
              { weight: "95", reps: "10", done: true },
            ],
          },
        ],
      })
      .expect(201);

    const coach = await request(app)
      .post("/api/profile")
      .send({ name: "Attendance Coach", teamCode, isCoach: true, coachPin: "COACH2025" });
    const dash = await request(app)
      .get("/api/coach/dashboard")
      .query({ teamCode })
      .set("Authorization", `Bearer ${coach.body.token}`)
      .expect(200);

    assert.ok(
      Array.isArray(dash.body.todayAttendance) && dash.body.todayAttendance.includes(athleteId),
      "todayAttendance should include athlete id when session with workout info is completed"
    );
  });
});
