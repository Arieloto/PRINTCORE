import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * SQLite persistence for PrintCore.
 *
 * The app's domain objects are rich and nested (a Quote carries a full cost
 * breakdown and a list of commercial items), so each record is stored as a JSON
 * document keyed by its id. That keeps the schema stable as the TypeScript types
 * evolve, while still giving us a real SQLite file with transactions, WAL and
 * easy backups. Records stay queryable with json_extract(), e.g.:
 *
 *   SELECT json_extract(data, '$.quoteNumber') FROM documents WHERE collection = 'quotes';
 */

export const COLLECTIONS = [
  'printers',
  'materials',
  'customers',
  'quotes',
  'workOrders',
  'payments',
  'taxDocuments'
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollectionName(value: string): value is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(value);
}

export const DB_PATH = process.env.PRINTCORE_DB_PATH
  ? path.resolve(process.env.PRINTCORE_DB_PATH)
  : path.resolve(process.cwd(), 'data', 'printcore.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

// WAL keeps readers from blocking the writer and survives crashes cleanly.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );

  CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (collection);
`);

export function readSettings(): unknown | null {
  const row = db.prepare('SELECT data FROM settings WHERE id = 1').get() as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function writeSettings(value: unknown): void {
  db.prepare(
    `INSERT INTO settings (id, data, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).run(JSON.stringify(value), new Date().toISOString());
}

export function readCollection(name: CollectionName): unknown[] {
  // rowid preserves the array order the client sent (newest items are unshifted to the front).
  const rows = db.prepare('SELECT data FROM documents WHERE collection = ? ORDER BY rowid').all(name) as {
    data: string;
  }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function writeCollection(name: CollectionName, items: unknown[]): void {
  const now = new Date().toISOString();
  const remove = db.prepare('DELETE FROM documents WHERE collection = ?');
  const insert = db.prepare(
    'INSERT INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    remove.run(name);
    items.forEach((item, index) => {
      const id =
        item && typeof item === 'object' && 'id' in item && (item as { id?: unknown }).id
          ? String((item as { id: unknown }).id)
          : `idx_${index}`;
      insert.run(name, id, JSON.stringify(item), now);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function readState(): Record<string, unknown> {
  const state: Record<string, unknown> = { settings: readSettings() };
  for (const name of COLLECTIONS) {
    state[name] = readCollection(name);
  }
  return state;
}
