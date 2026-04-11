import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema'; 

const dbPath = path.join(app.getPath('userData'), 'gestao_estoque_v2.sqlite');
const sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');

console.log("DB", dbPath);

export const db = drizzle(sqlite, { schema });