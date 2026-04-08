import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';

import * as schema from './schema'; 

// Pega a pasta segura do sistema
const dbPath = path.join(app.getPath('userData'), 'gestao_estoque_v2.sqlite');
const sqlite = new Database(dbPath);

// Ativa o modo WAL (Deixa o SQLite muito mais rápido e seguro contra corrupção)
sqlite.pragma('journal_mode = WAL');

// 👇 O PULO DO GATO: Garante que a tabela SEMPRE exista! 👇
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS box (
    id TEXT PRIMARY KEY,
    etapa TEXT DEFAULT 'estoque' NOT NULL, /* <-- AQUI: Mudei de step para etapa */
    weight REAL NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    model TEXT,
    operator TEXT,
    date INTEGER
  );
`);

console.log("📍 MEU BANCO DE DADOS ESTÁ AQUI:", dbPath);

export const db = drizzle(sqlite, { schema });