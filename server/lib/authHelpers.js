export function normalizeTeamCode(teamCode) {
  return String(teamCode || "").trim().toUpperCase();
}

/** Returns error message string, or null if access allowed. */
export function assertTeamAccess(user, teamCode) {
  if (!user) return "Unauthorized";
  if (normalizeTeamCode(user.teamCode) !== normalizeTeamCode(teamCode)) {
    return "Can only access your own team";
  }
  return null;
}

/** Athletes may only access their own data; coaches may access any athlete on their team. */
export function assertAthleteAccess(user, teamCode, athleteId) {
  const teamErr = assertTeamAccess(user, teamCode);
  if (teamErr) return teamErr;
  if (user.isCoach) return null;
  if (user.athleteId !== athleteId) return "Can only access your own data";
  return null;
}

export function getCoachPin() {
  return process.env.COACH_PIN || "COACH2025";
}

export function validateCoachPin(provided) {
  const expected = getCoachPin();
  const pin = provided != null ? String(provided).trim() : "";
  return pin === expected;
}
