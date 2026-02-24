import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";

const hasDb = !!process.env.DATABASE_URL;

describe("POST /api/profile", { skip: !hasDb }, () => {
  before(() => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
  });

  it("creates team and athlete, returns identity shape with token", async () => {
    const teamCode = `T${Date.now()}`;
    const res = await request(app)
      .post("/api/profile")
      .send({ name: "Test Athlete", teamCode, position: "WR", grade: "11" })
      .expect(200);
    assert.ok(res.body.athleteId);
    assert.strictEqual(res.body.name, "Test Athlete");
    assert.strictEqual(res.body.teamCode, teamCode);
    assert.strictEqual(res.body.position, "WR");
    assert.strictEqual(res.body.isCoach, false);
    assert.ok(res.body.token, "response must include token");
  });

  it("creates coach and returns identity with token", async () => {
    const teamCode = `C${Date.now()}`;
    const res = await request(app)
      .post("/api/profile")
      .send({ name: "Coach Smith", teamCode, isCoach: true })
      .expect(200);
    assert.strictEqual(res.body.athleteId, "coach");
    assert.strictEqual(res.body.name, "Coach Smith");
    assert.strictEqual(res.body.teamCode, teamCode);
    assert.strictEqual(res.body.isCoach, true);
    assert.ok(res.body.token);
  });
});

describe("GET /api/profile/:id", { skip: !hasDb }, () => {
  let token;
  let teamCode;
  let athleteId;

  before(async () => {
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret";
    teamCode = `G${Date.now()}`;
    const create = await request(app)
      .post("/api/profile")
      .send({ name: "Profile Get Athlete", teamCode, position: "LB", grade: "12" });
    token = create.body.token;
    athleteId = create.body.athleteId;
  });

  it("returns profile when authorized with valid teamCode", async () => {
    const res = await request(app)
      .get(`/api/profile/${athleteId}`)
      .query({ teamCode })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    assert.strictEqual(res.body.athleteId, athleteId);
    assert.strictEqual(res.body.name, "Profile Get Athlete");
    assert.strictEqual(res.body.teamCode, teamCode);
  });

  it("returns 401 without token", async () => {
    await request(app)
      .get(`/api/profile/${athleteId}`)
      .query({ teamCode })
      .expect(401);
  });

  it("returns 404 for unknown athlete id", async () => {
    await request(app)
      .get("/api/profile/nonexistent_external_id_123")
      .query({ teamCode })
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
