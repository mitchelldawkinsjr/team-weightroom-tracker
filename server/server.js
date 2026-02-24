import pool, { runMigrations } from "./db.js";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await runMigrations();
    await pool.query("SELECT 1");
  } catch (e) {
    console.error("Database error:", e.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
