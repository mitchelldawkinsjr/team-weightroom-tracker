import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

/** Run all migrations in server/migrations/*.sql in order. */
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const { rows: applied } = await client.query("SELECT name FROM _migrations ORDER BY name");
    const appliedSet = new Set(applied.map((r) => r.name));

    const migrationsDir = join(__dirname, "migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const name = file.replace(/\.sql$/, "");
      if (appliedSet.has(name)) continue;
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
    }
  } finally {
    client.release();
  }
}

export default pool;
