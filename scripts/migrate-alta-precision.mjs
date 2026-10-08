// One-off migration: replaces "Fabricación 3D de alta precisión" with "Fabricación 3D"
// in every stored quote (server DB and localStorage mirror). Run: node scripts/migrate-alta-precision.mjs
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';

const dbPath = process.env.PRINTCORE_DB_PATH || new URL('../data/printcore.db', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

if (!existsSync(dbPath)) {
  console.log('No DB found at', dbPath, '- nothing to migrate.');
  process.exit(0);
}

const OLD = 'Fabricaci\u00f3n 3D de alta precisi\u00f3n';
const NEW = 'Fabricaci\u00f3n 3D';

const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

let updated = 0;
for (const { name } of tables) {
  const cols = db.prepare(`PRAGMA table_info(${name})`).all();
  for (const col of cols) {
    const t = String(col.type || '').toUpperCase();
    if (!t.includes('TEXT') && !t.includes('CHAR') && !t.includes('CLOB') && t !== '') continue;
    try {
      const rows = db.prepare(`SELECT rowid, "${col.name}" AS v FROM "${name}" WHERE "${col.name}" LIKE ?`).all(`%${OLD}%`);
      for (const row of rows) {
        db.prepare(`UPDATE "${name}" SET "${col.name}" = REPLACE("${col.name}", ?, ?) WHERE rowid = ?`).run(OLD, NEW, row.rowid);
        updated++;
      }
    } catch { /* column not text-safe; skip */ }
  }
}

db.close();
console.log(`Migrated ${updated} cell(s): "${OLD}" -> "${NEW}"`);
