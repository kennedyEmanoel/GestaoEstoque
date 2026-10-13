import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import * as schema from '../models/schema';
import { migrarBanco } from '../models/migrador';

export const PASTA_MIGRACOES = path.resolve(__dirname, '../../../drizzle');

export function criarBancoDeTeste() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES });
  return { db, sqlite };
}
