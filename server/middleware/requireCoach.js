/** Require authenticated coach. Optionally verify teamCode from body or query. */
export function requireCoach(req, res, next) {
  if (!req.user?.isCoach) {
    return res.status(403).json({ error: "Coach only" });
  }
  next();
}

/** After requireCoach: ensure teamCode in body/query matches JWT team. */
export function requireCoachTeam(req, res, next) {
  const teamCode = req.body?.teamCode ?? req.query?.teamCode;
  if (!teamCode) {
    return res.status(400).json({ error: "teamCode required" });
  }
  const code = String(teamCode).trim().toUpperCase();
  if (req.user.teamCode !== code) {
    return res.status(403).json({ error: "Can only access your own team" });
  }
  next();
}
