import jwt from "jsonwebtoken";

/**
 * Require valid JWT in Authorization: Bearer <token>.
 * Sets req.user = { teamCode, athleteId, isCoach, name }.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
