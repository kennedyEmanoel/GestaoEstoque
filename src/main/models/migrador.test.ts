import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrarBanco } from './migrador';

const PASTA_MIGRACOES = path.resolve(__dirname, '../../../drizzle');

/** DDL exatamente como o db.ts antigo criava (antes das migrações versionadas). */
const DDL_LEGADO = `
  CREATE TABLE producao_ficha_diaria (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    data             TEXT    NOT NULL,
    produto          TEXT    NOT NULL,
    etapa            TEXT    NOT NULL,
    meta_hora_padrao INTEGER NOT NULL DEFAULT 40,
    criado_em        INTEGER NOT NULL,
    UNIQUE(data, etapa, produto)
  );
  CREATE TABLE producao_operador_diario (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id      INTEGER NOT NULL REFERENCES producao_ficha_diaria(id) ON DELETE CASCADE,
    operador_nome TEXT    NOT NULL,
    ordem         INTEGER NOT NULL DEFAULT 0,
    UNIQUE(ficha_id, operador_nome)
  );
  CREATE TABLE producao_registro_horario (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    operador_diario_id  INTEGER NOT NULL REFERENCES producao_operador_diario(id) ON DELETE CASCADE,
    horario_bloco       TEXT    NOT NULL,
    meta                INTEGER NOT NULL DEFAULT 0,
    realizado           INTEGER NOT NULL DEFAULT 0,
    UNIQUE(operador_diario_id, horario_bloco)
  );
  CREATE INDEX idx_ficha_data_etapa ON producao_ficha_diaria(data, etapa);
  CREATE INDEX idx_operador_ficha   ON producao_operador_diario(ficha_id);
  CREATE INDEX idx_registro_op      ON producao_registro_horario(operador_diario_id);
`;

let pasta: string;
const abertos: Database.Database[] = [];

function abrir(arquivo: string) {
  const sqlite = new Database(arquivo);
  sqlite.pragma('foreign_keys = ON');
  abertos.push(sqlite);
  return { sqlite, db: drizzle(sqlite) };
}

function criarLegado(arquivo: string, seed: (sqlite: Database.Database) => void) {
  const { sqlite, db } = abrir(arquivo);
  sqlite.exec(DDL_LEGADO);
  seed(sqlite);
  return { sqlite, db };
}

/** Massa de dados parecida com a real: grafias variadas, etapas antigas Firmware/IMEI, registros por hora. */
function seedPadrao(sqlite: Database.Database) {
  const ficha = sqlite.prepare(`INSERT INTO producao_ficha_diaria (data, produto, etapa, meta_hora_padrao, criado_em) VALUES (?, ?, ?, ?, 1)`);
  const op = sqlite.prepare(`INSERT INTO producao_operador_diario (ficha_id, operador_nome, ordem) VALUES (?, ?, ?)`);
  const reg = sqlite.prepare(`INSERT INTO producao_registro_horario (operador_diario_id, horario_bloco, meta, realizado) VALUES (?, ?, ?, ?)`);

  const f1 = ficha.run('2026-10-01', '4G SIMCOM', 'Soldagem', 40).lastInsertRowid as number;
  const f2 = ficha.run('2026-10-01', '4G SIMCOM', 'Revisao', 40).lastInsertRowid as number;   // grafia antiga
  const f3 = ficha.run('2026-10-01', '4G SIMCOM', 'Firmware', 30).lastInsertRowid as number;
  const f4 = ficha.run('2026-10-01', '4G SIMCOM', 'IMEI', 30).lastInsertRowid as number;
  const f5 = ficha.run('2026-10-02', ' 4g simcom', 'Soldagem', 40).lastInsertRowid as number; // mesmo produto, outra grafia
  const f6 = ficha.run('2026-10-02', 'GPS 2G', 'Montagem', 50).lastInsertRowid as number;

  const o1 = op.run(f1, 'JOAO', 0).lastInsertRowid as number;
  const o2 = op.run(f1, 'MARIA', 1).lastInsertRowid as number;
  const o3 = op.run(f2, 'JOAO', 0).lastInsertRowid as number;
  const o4 = op.run(f3, 'PEDRO', 0).lastInsertRowid as number;
  const o5 = op.run(f4, 'PEDRO', 0).lastInsertRowid as number;
  const o6 = op.run(f5, 'joao ', 0).lastInsertRowid as number;
  const o7 = op.run(f6, 'ANA', 0).lastInsertRowid as number;

  reg.run(o1, '07:12 - 08:00', 40, 38);
  reg.run(o1, '08:00 - 09:00', 40, 41);
  reg.run(o2, '07:12 - 08:00', 40, 20);
  reg.run(o3, '07:12 - 08:00', 40, 40);
  reg.run(o4, '07:12 - 08:00', 30, 31);
  reg.run(o5, '07:12 - 08:00', 30, 29);
  reg.run(o6, '07:12 - 08:00', 40, 10);
  reg.run(o7, '07:12 - 08:00', 50, 55);
}

function esquemaNormalizado(sqlite: Database.Database): string[] {
  return (sqlite.prepare(`
    SELECT type || ' ' || name || ' :: ' || REPLACE(REPLACE(COALESCE(sql, ''), CHAR(10), ' '), CHAR(9), ' ') AS definicao
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_\\_drizzle%' ESCAPE '\\'
    ORDER BY type, name
  `).all() as { definicao: string }[]).map((r) => r.definicao.replace(/\s+/g, ' ').replace(/__new_/g, ''));
}

beforeEach(() => {
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'migrador-'));
});

afterEach(() => {
  while (abertos.length) abertos.pop()!.close();
  fs.rmSync(pasta, { recursive: true, force: true });
});

describe('migrarBanco', () => {
  it('cria o schema completo em um banco novo, sem backup, com as etapas padrão', () => {
    const { sqlite, db } = abrir(path.join(pasta, 'novo.sqlite'));
    const r = migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES, pastaBackups: path.join(pasta, 'bk') });

    expect(r.aplicadas).toBe(3);
    expect(r.backup).toBeNull();
    expect(sqlite.prepare(`SELECT nome FROM etapas ORDER BY id`).all()).toEqual([
      { nome: 'Montagem' }, { nome: 'Soldagem' }, { nome: 'Revisão' }, { nome: 'Gravação' },
    ]);
    expect(sqlite.prepare(`
      SELECT e.nome AS etapa, v.nome AS variacao FROM etapa_variacoes v JOIN etapas e ON e.id = v.etapa_id ORDER BY v.id
    `).all()).toEqual([
      { etapa: 'Soldagem', variacao: 'Cabos' },
      { etapa: 'Soldagem', variacao: 'Retrabalho' },
      { etapa: 'Gravação', variacao: 'Firmware' },
      { etapa: 'Gravação', variacao: 'IMEI' },
      { etapa: 'Gravação', variacao: 'Serial' },
    ]);
    expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM produtos`).get()).toEqual({ n: 0 });
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('é idempotente: rodar de novo não aplica nada', () => {
    const { sqlite, db } = abrir(path.join(pasta, 'novo.sqlite'));
    migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES });
    const segunda = migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES });
    expect(segunda.aplicadas).toBe(0);
  });

  describe('a partir de um banco legado com dados', () => {
    it('converte textos em cadastros sem perder fichas, operadores nem registros', () => {
      const { sqlite, db } = criarLegado(path.join(pasta, 'legado.sqlite'), seedPadrao);
      const antes = sqlite.prepare(`SELECT SUM(meta) AS meta, SUM(realizado) AS realizado, COUNT(*) AS n FROM producao_registro_horario`).get();

      const r = migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES, pastaBackups: path.join(pasta, 'bk') });

      expect(r.aplicadas).toBe(3);
      expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM producao_ficha_diaria`).get()).toEqual({ n: 6 });
      expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM producao_operador_diario`).get()).toEqual({ n: 7 });
      expect(sqlite.prepare(`SELECT SUM(meta) AS meta, SUM(realizado) AS realizado, COUNT(*) AS n FROM producao_registro_horario`).get()).toEqual(antes);
      expect(sqlite.pragma('foreign_key_check')).toEqual([]);
      expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);

      // produtos: "4G SIMCOM" e " 4g simcom" viram um só; "GPS 2G" é outro
      expect(sqlite.prepare(`SELECT nome FROM produtos ORDER BY nome`).all()).toEqual([{ nome: '4G SIMCOM' }, { nome: 'GPS 2G' }]);

      // operadores: "joao " e "JOAO" viram um só
      expect(sqlite.prepare(`SELECT nome FROM operadores ORDER BY nome`).all()).toEqual([
        { nome: 'ANA' }, { nome: 'JOAO' }, { nome: 'MARIA' }, { nome: 'PEDRO' },
      ]);

      // etapas/variações: Firmware e IMEI viram variações de Gravação; "Revisao" vira "Revisão"
      const fichas = sqlite.prepare(`
        SELECT f.data, p.nome AS produto, e.nome AS etapa, v.nome AS variacao
        FROM producao_ficha_diaria f
        JOIN produtos p ON p.id = f.produto_id
        JOIN etapas   e ON e.id = f.etapa_id
        LEFT JOIN etapa_variacoes v ON v.id = f.variacao_id
        ORDER BY f.id
      `).all();
      expect(fichas).toEqual([
        { data: '2026-10-01', produto: '4G SIMCOM', etapa: 'Soldagem', variacao: null },
        { data: '2026-10-01', produto: '4G SIMCOM', etapa: 'Revisão',  variacao: null },
        { data: '2026-10-01', produto: '4G SIMCOM', etapa: 'Gravação', variacao: 'Firmware' },
        { data: '2026-10-01', produto: '4G SIMCOM', etapa: 'Gravação', variacao: 'IMEI' },
        { data: '2026-10-02', produto: '4G SIMCOM', etapa: 'Soldagem', variacao: null },
        { data: '2026-10-02', produto: 'GPS 2G',    etapa: 'Montagem', variacao: null },
      ]);

      // a escala de operadores continua ligada às mesmas fichas
      expect(sqlite.prepare(`
        SELECT f.id AS ficha, o.nome AS operador FROM producao_operador_diario d
        JOIN producao_ficha_diaria f ON f.id = d.ficha_id JOIN operadores o ON o.id = d.operador_id
        ORDER BY d.id
      `).all().map((x: any) => `${x.ficha}:${x.operador}`)).toEqual(['1:JOAO', '1:MARIA', '2:JOAO', '3:PEDRO', '4:PEDRO', '5:JOAO', '6:ANA']);
    });

    it('termina com a mesma estrutura de um banco criado do zero', () => {
      const novo = abrir(path.join(pasta, 'novo.sqlite'));
      migrarBanco(novo.db, novo.sqlite, { pastaMigracoes: PASTA_MIGRACOES });

      const legado = criarLegado(path.join(pasta, 'legado.sqlite'), seedPadrao);
      migrarBanco(legado.db, legado.sqlite, { pastaMigracoes: PASTA_MIGRACOES });

      expect(esquemaNormalizado(legado.sqlite)).toEqual(esquemaNormalizado(novo.sqlite));
    });

    it('faz cópia de segurança consistente antes de migrar', () => {
      const { sqlite, db } = criarLegado(path.join(pasta, 'legado.sqlite'), seedPadrao);
      const r = migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES, pastaBackups: path.join(pasta, 'bk') });

      expect(r.backup).not.toBeNull();
      const copia = new Database(r.backup!, { readonly: true });
      abertos.push(copia);
      // a cópia é o banco ANTES da migração: ainda tem os textos livres e nenhum cadastro
      expect(copia.prepare(`SELECT COUNT(*) AS n FROM producao_ficha_diaria`).get()).toEqual({ n: 6 });
      expect(copia.prepare(`SELECT name FROM sqlite_master WHERE name = 'operadores'`).get()).toBeUndefined();
    });

    it('mantém só as últimas cópias de segurança', () => {
      const bk = path.join(pasta, 'bk');
      fs.mkdirSync(bk);
      for (let i = 1; i <= 4; i++) fs.writeFileSync(path.join(bk, `bd_estoque-antes-da-migracao-2020-01-0${i}.sqlite`), '');

      const { sqlite, db } = criarLegado(path.join(pasta, 'legado.sqlite'), seedPadrao);
      migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES, pastaBackups: bk, manterBackups: 2 });

      expect(fs.readdirSync(bk).length).toBe(2);
    });

    it('recusa migrar (sem alterar nada) quando a conversão juntaria fichas distintas', () => {
      const { sqlite, db } = criarLegado(path.join(pasta, 'legado.sqlite'), (s) => {
        s.exec(`
          INSERT INTO producao_ficha_diaria (data, produto, etapa, criado_em) VALUES ('2026-10-01', '4G SIMCOM',  'Soldagem', 1);
          INSERT INTO producao_ficha_diaria (data, produto, etapa, criado_em) VALUES ('2026-10-01', '4g simcom ', 'Soldagem', 1);
        `);
      });

      expect(() => migrarBanco(db, sqlite, { pastaMigracoes: PASTA_MIGRACOES }))
        .toThrow(/Fichas duplicadas em 2026-10-01/);
      expect(sqlite.prepare(`SELECT name FROM sqlite_master WHERE name = '__drizzle_migrations'`).get()).toBeUndefined();
      expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM producao_ficha_diaria`).get()).toEqual({ n: 2 });
    });
  });
});
