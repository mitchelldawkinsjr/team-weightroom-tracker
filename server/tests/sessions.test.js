import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

const hasDb = !!process.env.DATABASE_URL;

describe("POST /api/sessions", { skip: !hasDb }, () => {
  before(() => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
  });

  it("returns 401 without token", async () => {
    await request(app)
      .post("/api/sessions")
      .send({
        id: "s1",
        teamCode: "X",
        athleteId: "a1",
        date: "2025-02-21",
        phase: 1,
        type: "lift",
        exercises: [],
      })
      .expect(401);
  });

  it("creates session when authorized and returns 201", async () => {
    const teamCode = `S${Date.now()}`;
    const createProfile = await request(app)
      .post("/api/profile")
      .send({ name: "Session Athlete", teamCode, position: "QB", grade: "10" });
    const token = createProfile.body.token;
    const athleteId = createProfile.body.athleteId;
    const sessionId = `sess_${Date.now()}`;

    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: sessionId,
        athleteId,
        teamCode,
        date: "2025-02-21",
        phase: 1,
        type: "lift",
        complete: true,
        rpe: "7",
        duration: "45",
        notes: "Good workout",
        exercises: [
          {
            name: "Squat",
            sets: 3,
            reps: "5",
            sets_data: [
              { weight: "135", reps: "5", done: true },
              { weight: "135", reps: "5", done: true },
              { weight: "135", reps: "5", done: true },
            ],
          },
        ],
      })
      .expect(201);

    assert.ok(res.body.id);
    assert.strictEqual(res.body.id, sessionId);
    assert.ok(String(res.body.date).startsWith("2025-02-21"), "date should match session date");
    assert.strictEqual(res.body.phase, 1);
    assert.strictEqual(res.body.type, "lift");
    assert.ok(res.body.exercises);
    assert.ok(Array.isArray(res.body.exercises));
  });
});

describe("GET /api/athletes/:id/sessions", { skip: !hasDb }, () => {
  let token;
  let teamCode;
  let athleteId;

  before(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    teamCode = `A${Date.now()}`;
    const create = await request(app)
      .post("/api/profile")
      .send({ name: "List Sessions Athlete", teamCode, position: "RB", grade: "11" });
    token = create.body.token;
    athleteId = create.body.athleteId;
  });

  it("returns 401 without token", async () => {
    await request(app)
      .get(`/api/athletes/${athleteId}/sessions`)
      .query({ teamCode })
      .expect(401);
  });

  it("returns sessions array when authorized", async () => {
    const res = await request(app)
      .get(`/api/athletes/${athleteId}/sessions`)
      .query({ teamCode })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.ok(Array.isArray(res.body));
  });
});
