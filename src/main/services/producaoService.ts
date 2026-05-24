import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import type {
  FichaDiariaCompleta,
  OperadorDiario,
  RegistroHorario,
  CreateFichaDiariaInput,
  AddOperadorInput,
  RemoveOperadorInput,
  UpsertRegistroInput,
  GetFichaInput,
} from '../../shared/types';

// Reutiliza a mesma instância de banco já inicializada em db.ts via singleton de caminho
const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
const sqlite = new Database(dbPath);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFichaCompleta(fichaId: number): FichaDiariaCompleta {
  const ficha = sqlite
    .prepare<number, any>(`SELECT * FROM producao_ficha_diaria WHERE id = ?`)
    .get(fichaId);

  if (!ficha) throw new Error(`Ficha ${fichaId} não encontrada`);

  const operadores = sqlite
    .prepare<number, any>(`
      SELECT * FROM producao_operador_diario
      WHERE ficha_id = ?
      ORDER BY ordem ASC
    `)
    .all(fichaId);

  const fichaCompleta: FichaDiariaCompleta = {
    id:             ficha.id,
    data:           ficha.data,
    produto:        ficha.produto,
    etapa:          ficha.etapa,
    metaHoraPadrao: ficha.meta_hora_padrao,
    criadoEm:       ficha.criado_em,
    operadores:     operadores.map((op: any) => {
      const registros = sqlite
        .prepare<number, any>(`
          SELECT * FROM producao_registro_horario
          WHERE operador_diario_id = ?
          ORDER BY horario_bloco ASC
        `)
        .all(op.id);

      return {
        id:           op.id,
        fichaId:      op.ficha_id,
        operadorNome: op.operador_nome,
        ordem:        op.ordem,
        registros:    registros.map((r: any): RegistroHorario => ({
          id:               r.id,
          operadorDiarioId: r.operador_diario_id,
          horarioBloco:     r.horario_bloco,
          meta:             r.meta,
          realizado:        r.realizado,
        })),
      };
    }),
  };

  return fichaCompleta;
}

// ─── Funções Exportadas ───────────────────────────────────────────────────────

export function getFichaCompleta(input: GetFichaInput): FichaDiariaCompleta | null {
  const ficha = sqlite
    .prepare<[string, string, string], any>(`
      SELECT id FROM producao_ficha_diaria
      WHERE data = ? AND etapa = ? AND produto = ?
    `)
    .get(input.data, input.etapa, input.produto);

  if (!ficha) return null;
  return buildFichaCompleta(ficha.id);
}

export function getOrCreateFicha(data: CreateFichaDiariaInput): FichaDiariaCompleta {
  const existing = sqlite
    .prepare<[string, string, string], any>(`
      SELECT id FROM producao_ficha_diaria
      WHERE data = ? AND etapa = ? AND produto = ?
    `)
    .get(data.data, data.etapa, data.produto);

  if (existing) return buildFichaCompleta(existing.id);

  const result = sqlite
    .prepare(`
      INSERT INTO producao_ficha_diaria (data, produto, etapa, meta_hora_padrao, criado_em)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(data.data, data.produto, data.etapa, data.metaHoraPadrao, Date.now());

  return buildFichaCompleta(result.lastInsertRowid as number);
}

export function addOperador(input: AddOperadorInput): OperadorDiario {
  const maxOrdem = sqlite
    .prepare<number, any>(`
      SELECT COALESCE(MAX(ordem), -1) as max_ordem
      FROM producao_operador_diario
      WHERE ficha_id = ?
    `)
    .get(input.fichaId);

  const novaOrdem = (maxOrdem?.max_ordem ?? -1) + 1;

  const result = sqlite
    .prepare(`
      INSERT OR IGNORE INTO producao_operador_diario (ficha_id, operador_nome, ordem)
      VALUES (?, ?, ?)
    `)
    .run(input.fichaId, input.operadorNome, novaOrdem);

  if (result.changes === 0) {
    // Operador já existe na ficha — retorna o registro existente
    const existing = sqlite
      .prepare<[number, string], any>(`
        SELECT * FROM producao_operador_diario
        WHERE ficha_id = ? AND operador_nome = ?
      `)
      .get(input.fichaId, input.operadorNome);

    return {
      id:           existing.id,
      fichaId:      existing.ficha_id,
      operadorNome: existing.operador_nome,
      ordem:        existing.ordem,
    };
  }

  return {
    id:           result.lastInsertRowid as number,
    fichaId:      input.fichaId,
    operadorNome: input.operadorNome,
    ordem:        novaOrdem,
  };
}

export function removeOperador(input: RemoveOperadorInput): void {
  // ON DELETE CASCADE remove os registros horários vinculados automaticamente
  sqlite
    .prepare(`DELETE FROM producao_operador_diario WHERE id = ?`)
    .run(input.operadorDiarioId);
}

export function upsertRegistro(input: UpsertRegistroInput): RegistroHorario {
  sqlite
    .prepare(`
      INSERT INTO producao_registro_horario (operador_diario_id, horario_bloco, meta, realizado)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(operador_diario_id, horario_bloco)
      DO UPDATE SET meta = excluded.meta, realizado = excluded.realizado
    `)
    .run(input.operadorDiarioId, input.horarioBloco, input.meta, input.realizado);

  const row = sqlite
    .prepare<[number, string], any>(`
      SELECT * FROM producao_registro_horario
      WHERE operador_diario_id = ? AND horario_bloco = ?
    `)
    .get(input.operadorDiarioId, input.horarioBloco);

  return {
    id:               row.id,
    operadorDiarioId: row.operador_diario_id,
    horarioBloco:     row.horario_bloco,
    meta:             row.meta,
    realizado:        row.realizado,
  };
}

export function updateMetaHoraPadrao(fichaId: number, meta: number): void {
  sqlite
    .prepare(`UPDATE producao_ficha_diaria SET meta_hora_padrao = ? WHERE id = ?`)
    .run(meta, fichaId);
}
