// Debug helper: prints tables and searches for a phrase in the DB. Usage: node scripts/db-inspect.mjs [phrase]
import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.PRINTCORE_DB_PATH || 'c:/Users/ariel/Desktop/PRINTCORE/data/printcore.db';
const phrase = process.argv[2];

const db = new DatabaseSync(dbPath, { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map((t) => t.name).join(', '));

if (!phrase) {
  for (const { name } of tables) {
    const count = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n;
    const cols = db.prepare(`PRAGMA table_info(${name})`).all();
    console.log(`\n== ${name} (${count} rows) ==`);
    console.log('  columns:', cols.map((c) => `${c.name}:${c.type}`).join(', '));
  }
  db.close();
  process.exit(0);
}

let hits = 0;
for (const { name } of tables) {
  const cols = db.prepare(`PRAGMA table_info(${name})`).all();
  for (const col of cols) {
    try {
      const rows = db.prepare(`SELECT COUNT(*) AS n FROM "${name}" WHERE CAST("${col.name}" AS TEXT) LIKE ?`).get(`%${phrase}%`);
      if (rows.n > 0) {
        console.log(`  ${name}.${col.name}: ${rows.n} row(s)`);
        hits += rows.n;
      }
    } catch { /* skip */ }
  }
}
console.log(hits === 0 ? `No cells contain "${phrase}"` : `Total matching cells: ${hits}`);
db.close();
