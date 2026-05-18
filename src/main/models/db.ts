import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema';

const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
const sqlite = new Database(dbPath);

console.log(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS box (
    id          TEXT PRIMARY KEY NOT NULL,
    model       TEXT,
    amount      INTEGER NOT NULL DEFAULT 500,
    step        TEXT NOT NULL,
    volume      TEXT,
    origin      TEXT DEFAULT 'PRODUCTION',
    location    TEXT DEFAULT 'ESTOQUE',
    weight      REAL NOT NULL,
    operator    TEXT,
    description TEXT,
    date        INTEGER
  );

  CREATE TABLE IF NOT EXISTS history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    box_id         TEXT NOT NULL REFERENCES box(id),
    start_time     INTEGER NOT NULL,
    end_time       INTEGER,
    time_spent     INTEGER,
    type_operation TEXT NOT NULL,
    step_status    TEXT NOT NULL DEFAULT 'OPEN',
    step           TEXT NOT NULL,
    location       TEXT,
    lot            TEXT,
    description    TEXT,
    operator       TEXT
  );
`);

try {
  sqlite.exec(`ALTER TABLE history ADD COLUMN step_status TEXT NOT NULL DEFAULT 'OPEN'`);
} catch { /* coluna já existe */ }

try {
  sqlite.exec(`ALTER TABLE box ADD COLUMN parent_id TEXT`);
} catch { /* coluna já existe */ }

export const db = drizzle(sqlite, { schema });
