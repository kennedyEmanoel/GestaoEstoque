import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3'; // <-- A linha que corrige o erro
import { app } from 'electron';
import path from 'path';

import * as schema from './schema'; 

const dbPath = path.join(app.getPath('userData'), 'gestao_estoque.sqlite');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });