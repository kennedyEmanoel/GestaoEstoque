import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema';

const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
const sqlite = new Database(dbPath);

console.log(dbPath);

//sqlite.pragma('journal_mode = WAL');
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

// Índices para evitar full table scan nas queries mais frequentes
try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_history_box_id    ON history(box_id)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_history_step      ON history(step)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_history_status    ON history(step_status)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_box_step          ON box(step)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_box_location      ON box(location)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_box_model         ON box(model)`);
} catch { /* índices já existem */ }

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS box_composition (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    new_box_id     TEXT    NOT NULL REFERENCES box(id),
    source_box_id  TEXT    NOT NULL REFERENCES box(id),
    amount_taken   INTEGER NOT NULL,
    created_at     INTEGER NOT NULL,
    operator       TEXT
  );
`);

try {
  sqlite.exec(`ALTER TABLE box ADD COLUMN parent_id TEXT`);
} catch { /* coluna já existe */ }

try {
  sqlite.exec(`ALTER TABLE box ADD COLUMN is_insumo INTEGER NOT NULL DEFAULT 0`);
} catch { /* coluna já existe */ }

try {
  sqlite.exec(`ALTER TABLE history ADD COLUMN modelo TEXT`);
} catch { /* coluna já existe */ }

// ─── Módulo: Controle de Produção Hora a Hora ───────────────────────────────

// Migration: recria ficha_diaria sem turno na UNIQUE constraint (caso banco antigo exista)
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS producao_ficha_diaria (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      data             TEXT    NOT NULL,
      produto          TEXT    NOT NULL,
      etapa            TEXT    NOT NULL,
      meta_hora_padrao INTEGER NOT NULL DEFAULT 40,
      criado_em        INTEGER NOT NULL,
      UNIQUE(data, etapa, produto)
    );
  `);
} catch { /* tabela já existe com schema correto */ }

// Se a tabela existia com o schema antigo (continha coluna turno), migra os dados
const fichaColumns = sqlite.pragma('table_info(producao_ficha_diaria)') as { name: string }[];
const hasTurno = fichaColumns.some(col => col.name === 'turno');
if (hasTurno) {
  sqlite.transaction(() => {
    sqlite.exec(`
      CREATE TABLE producao_ficha_diaria_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        data             TEXT    NOT NULL,
        produto          TEXT    NOT NULL,
        etapa            TEXT    NOT NULL,
        meta_hora_padrao INTEGER NOT NULL DEFAULT 40,
        criado_em        INTEGER NOT NULL,
        UNIQUE(data, etapa, produto)
      );
    `);
    sqlite.exec(`
      INSERT OR IGNORE INTO producao_ficha_diaria_new (id, data, produto, etapa, meta_hora_padrao, criado_em)
        SELECT id, data, produto, etapa, meta_hora_padrao, criado_em FROM producao_ficha_diaria;
    `);
    sqlite.exec(`DROP TABLE producao_ficha_diaria;`);
    sqlite.exec(`ALTER TABLE producao_ficha_diaria_new RENAME TO producao_ficha_diaria;`);
  })();
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS producao_operador_diario (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id      INTEGER NOT NULL REFERENCES producao_ficha_diaria(id) ON DELETE CASCADE,
    operador_nome TEXT    NOT NULL,
    ordem         INTEGER NOT NULL DEFAULT 0,
    UNIQUE(ficha_id, operador_nome)
  );

  CREATE TABLE IF NOT EXISTS producao_registro_horario (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    operador_diario_id  INTEGER NOT NULL REFERENCES producao_operador_diario(id) ON DELETE CASCADE,
    horario_bloco       TEXT    NOT NULL,
    meta                INTEGER NOT NULL DEFAULT 0,
    realizado           INTEGER NOT NULL DEFAULT 0,
    UNIQUE(operador_diario_id, horario_bloco)
  );
`);

try {
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_ficha_data_etapa ON producao_ficha_diaria(data, etapa)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_operador_ficha   ON producao_operador_diario(ficha_id)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_registro_op      ON producao_registro_horario(operador_diario_id)`);
} catch { /* índices já existem */ }

export const db = drizzle(sqlite, { schema });
export { sqlite };
