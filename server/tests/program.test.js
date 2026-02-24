import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

const hasDb = !!process.env.DATABASE_URL;

describe("GET /api/program", { skip: !hasDb }, () => {
  let token;
  let teamCode;

  before(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    teamCode = `PG${Date.now()}`;
    const create = await request(app)
      .post("/api/profile")
      .send({ name: "Program Athlete", teamCode, position: "QB", grade: "10" });
    token = create.body.token;
  });

  it("returns 200 and shape { phases, liftTemplates, speedTemplates }", async () => {
    const res = await request(app)
      .get("/api/program")
      .query({ teamCode })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.ok(Array.isArray(res.body.phases));
    assert.ok(typeof res.body.liftTemplates === "object");
    assert.ok(typeof res.body.speedTemplates === "object");
    assert.ok(res.body.phases.length > 0);
  });

  it("returns 401 without token", async () => {
    await request(app)
      .get("/api/program")
      .query({ teamCode })
      .expect(401);
  });
});

describe("PUT /api/program", { skip: !hasDb }, () => {
  let coachToken;
  let teamCode;

  before(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    teamCode = `PU${Date.now()}`;
    const create = await request(app)
      .post("/api/profile")
      .send({ name: "Program Coach", teamCode, isCoach: true });
    coachToken = create.body.token;
  });

  it("saves program and GET returns updated data", async () => {
    const phases = [{ id: 1, label: "Phase 1", name: "Foundation", weeks: "Wks 1–4", color: "#2E7D52" }];
    const liftTemplates = { 1: [{ name: "Custom Squat", sets: 3, reps: 10, tempo: "3-1-1" }] };
    const speedTemplates = { 1: [{ name: "Custom Sprint", sets: 4, reps: "1 rep" }] };
    await request(app)
      .put("/api/program")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ teamCode, phases, liftTemplates, speedTemplates })
      .expect(200);

    const res = await request(app)
      .get("/api/program")
      .query({ teamCode })
      .set("Authorization", `Bearer ${coachToken}`)
      .expect(200);
    assert.strictEqual(res.body.phases.length, 1);
    assert.strictEqual(res.body.phases[0].name, "Foundation");
    assert.ok(Array.isArray(res.body.liftTemplates[1]));
    assert.strictEqual(res.body.liftTemplates[1][0].name, "Custom Squat");
    assert.ok(Array.isArray(res.body.speedTemplates[1]));
    assert.strictEqual(res.body.speedTemplates[1][0].name, "Custom Sprint");
  });

  it("returns 403 when not coach", async () => {
    const athleteRes = await request(app)
      .post("/api/profile")
      .send({ name: "Non Coach", teamCode: `NC${Date.now()}`, position: "WR", grade: "11" });
    await request(app)
      .put("/api/program")
      .set("Authorization", `Bearer ${athleteRes.body.token}`)
      .send({ teamCode: athleteRes.body.teamCode, phases: [], liftTemplates: {}, speedTemplates: {} })
      .expect(403);
  });
});
