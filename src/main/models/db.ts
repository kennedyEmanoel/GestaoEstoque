import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
const sqlite = new Database(dbPath);

console.log(dbPath);

//sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

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

// Migration: corrige grafia "Revisao" → "Revisão" em fichas existentes
try {
  sqlite.exec(`UPDATE producao_ficha_diaria SET etapa = 'Revisão' WHERE etapa = 'Revisao'`);
} catch { /* ignora se falhar */ }

export const db = drizzle(sqlite, {  });
export { sqlite };
