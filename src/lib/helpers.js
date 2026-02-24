import { PHASES, LIFT_TEMPLATES, SPEED_TEMPLATES } from "./constants.js";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function calcLoad(rpe, duration) {
  const r = parseFloat(rpe), d = parseFloat(duration);
  return r && d ? Math.round(r * d) : 0;
}

export function phaseColor(id, program) {
  const phases = program?.phases && Array.isArray(program.phases) ? program.phases : PHASES;
  return phases.find(p => p.id === id)?.color || "#555";
}

export function makeSessionKey(teamCode, athleteId, sessionId) {
  return `tc:${teamCode}:athlete:${athleteId}:session:${sessionId}`;
}

export function makeRosterKey(teamCode) {
  return `tc:${teamCode}:roster`;
}

export function makeAthleteMetaKey(teamCode, athleteId) {
  return `tc:${teamCode}:meta:${athleteId}`;
}

/** Key for coach-generated one-time login code (shared storage). Value: { identity, expiresAt }. */
export function makeLoginCodeKey(code) {
  return `login:${String(code).toUpperCase().trim()}`;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Generate a 6-character code for login-on-another-device. */
export function generateLoginCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

/** Default lifetime for a login code (ms). */
export const LOGIN_CODE_TTL_MS = 15 * 60 * 1000;

export function buildExercises(phase, type, program) {
  const liftT = program?.liftTemplates && typeof program.liftTemplates === "object" ? program.liftTemplates : LIFT_TEMPLATES;
  const speedT = program?.speedTemplates && typeof program.speedTemplates === "object" ? program.speedTemplates : SPEED_TEMPLATES;
  const template = type === "lift" ? (liftT[phase] ?? liftT[String(phase)]) : (speedT[phase] ?? speedT[String(phase)]);
  if (!template || !Array.isArray(template)) return [];
  return template.map(ex => ({
    ...ex,
    sets_data: Array(typeof ex.sets === "number" ? ex.sets : 4)
      .fill(null).map(() => ({ weight: "", reps: "", done: false })),
  }));
}
