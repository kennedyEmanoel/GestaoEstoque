import type Database from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';

export interface OpcoesMigracao {
  /** Pasta com os .sql e meta/_journal.json gerados pelo drizzle-kit. */
  pastaMigracoes: string;
  /** Onde guardar a cópia de segurança feita antes de aplicar migrações. Omitir desliga o backup. */
  pastaBackups?: string;
  /** Quantas cópias de segurança manter (as mais recentes). */
  manterBackups?: number;
}

export interface ResultadoMigracao {
  aplicadas: number;
  backup: string | null;
}

const MIGRACOES_TABELA = '__drizzle_migrations';

function totalMigracoes(pasta: string): number {
  const journal = JSON.parse(fs.readFileSync(path.join(pasta, 'meta', '_journal.json'), 'utf8'));
  return journal.entries.length as number;
}

function tabelaExiste(sqlite: Database.Database, nome: string): boolean {
  return !!sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
}

function totalAplicadas(sqlite: Database.Database): number {
  if (!tabelaExiste(sqlite, MIGRACOES_TABELA)) return 0;
  return (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${MIGRACOES_TABELA}`).get() as { n: number }).n;
}

function colunas(sqlite: Database.Database, tabela: string): string[] {
  return (sqlite.pragma(`table_info(${tabela})`) as { name: string }[]).map((c) => c.name);
}

/**
 * Antes de converter os textos livres (produto/etapa/operador) em cadastros, garante que a
 * conversão não vai juntar duas fichas (ou dois operadores) que hoje são distintos só por
 * maiúsculas/espaços. Se juntasse, a migração falharia no meio — melhor avisar antes, com clareza.
 */
function verificarDuplicidadesLegadas(sqlite: Database.Database): void {
  if (!tabelaExiste(sqlite, 'producao_ficha_diaria')) return;
  if (!colunas(sqlite, 'producao_ficha_diaria').includes('produto')) return; // já convertido

  const fichas = sqlite.prepare(`
    SELECT data, GROUP_CONCAT(id) AS ids
    FROM producao_ficha_diaria
    GROUP BY data,
             lower(trim(produto)),
             CASE WHEN lower(trim(etapa)) = 'revisao' THEN 'revisão' ELSE lower(trim(etapa)) END
    HAVING COUNT(*) > 1
  `).all() as { data: string; ids: string }[];

  const operadores = sqlite.prepare(`
    SELECT ficha_id, GROUP_CONCAT(operador_nome, ' / ') AS nomes
    FROM producao_operador_diario
    GROUP BY ficha_id, lower(trim(operador_nome))
    HAVING COUNT(*) > 1
  `).all() as { ficha_id: number; nomes: string }[];

  if (fichas.length === 0 && operadores.length === 0) return;

  const linhas = [
    ...fichas.map((f) => `• Fichas duplicadas em ${f.data} (ids ${f.ids}): mesmo produto/etapa com grafia diferente.`),
    ...operadores.map((o) => `• Ficha ${o.ficha_id} tem o mesmo operador repetido (${o.nomes}).`),
  ];
  throw new Error(
    'Não foi possível atualizar o banco de dados porque existem registros duplicados ' +
    'que seriam unificados:\n' + linhas.join('\n') +
    '\nCorrija ou remova a duplicidade e abra o app novamente. Nenhum dado foi alterado.',
  );
}

function criarBackup(sqlite: Database.Database, pasta: string, manter: number): string {
  fs.mkdirSync(pasta, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = path.join(pasta, `bd_estoque-antes-da-migracao-${carimbo}.sqlite`);
  // VACUUM INTO gera uma cópia consistente do banco sem precisar fechá-lo.
  sqlite.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);

  const antigos = fs.readdirSync(pasta)
    .filter((f) => f.startsWith('bd_estoque-antes-da-migracao-') && f.endsWith('.sqlite'))
    .sort()
    .reverse()
    .slice(manter);
  for (const arquivo of antigos) fs.rmSync(path.join(pasta, arquivo), { force: true });

  return destino;
}

/**
 * Aplica as migrações pendentes. Se houver pendência em um banco que já tem dados,
 * faz antes uma cópia de segurança.
 */
export function migrarBanco(
  db: BetterSQLite3Database<any>,
  sqlite: Database.Database,
  opcoes: OpcoesMigracao,
): ResultadoMigracao {
  const total = totalMigracoes(opcoes.pastaMigracoes);
  const aplicadas = totalAplicadas(sqlite);
  const pendentes = total - aplicadas;
  if (pendentes <= 0) return { aplicadas: 0, backup: null };

  const bancoTemDados = tabelaExiste(sqlite, 'producao_ficha_diaria');
  let backup: string | null = null;
  if (bancoTemDados) {
    verificarDuplicidadesLegadas(sqlite);
    if (opcoes.pastaBackups) backup = criarBackup(sqlite, opcoes.pastaBackups, opcoes.manterBackups ?? 5);
  }

  // As migrações reconstroem tabelas (DROP + RENAME). Com as chaves estrangeiras ligadas, o DROP de
  // uma tabela "pai" apagaria em cascata os filhos. O PRAGMA só vale fora de uma transação, por isso
  // é desligado aqui, antes de o migrador abrir a dele.
  sqlite.pragma('foreign_keys = OFF');
  try {
    migrate(db, { migrationsFolder: opcoes.pastaMigracoes });
    const violacoes = sqlite.pragma('foreign_key_check') as unknown[];
    if (violacoes.length > 0) {
      console.warn(`[migrador] ${violacoes.length} violação(ões) de chave estrangeira após a migração.`);
    }
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }

  return { aplicadas: pendentes, backup };
}
