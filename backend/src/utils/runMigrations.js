const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../../migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`Executed: ${file}`);
  }

  console.log("All migrations completed");
  process.exit(0);
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
