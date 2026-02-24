import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { requireAuth } from "./middleware/auth.js";
import profileRouter from "./routes/profile.js";
import sessionsRouter from "./routes/sessions.js";
import athletesRouter from "./routes/athletes.js";
import coachRouter from "./routes/coach.js";
import rosterRouter from "./routes/roster.js";
import loginCodesRouter from "./routes/login-codes.js";
import programRouter from "./routes/program.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

app.use("/api/profile", profileRouter);
app.use("/api/sessions", requireAuth, sessionsRouter);
app.use("/api/athletes", requireAuth, athletesRouter);
app.use("/api/coach", requireAuth, coachRouter);
app.use("/api/roster", rosterRouter);
app.use("/api/login-codes", loginCodesRouter);
app.use("/api/program", requireAuth, programRouter);

const distPath = join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(join(distPath, "index.html"));
});

export default app;
