import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import * as schema from './schema';

/**
 * Conexão única com o SQLite. Este módulo só abre a conexão: a criação e a evolução
 * das tabelas é responsabilidade das migrações versionadas (pasta /drizzle),
 * aplicadas por `migrarBanco` na inicialização do app.
 */
export const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');

export const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;

/** Pasta com os arquivos .sql gerados pelo drizzle-kit (vai junto do app via extraResource). */
export function pastaMigracoes(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(app.getAppPath(), 'drizzle');
}

export const pastaBackups = path.join(app.getPath('userData'), 'backups');
