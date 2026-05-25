import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
const sqlite = new Database(dbPath);

// ─── Tipos retornados ─────────────────────────────────────────────────────────

export interface EtapaResumo {
  etapa: string;
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  pctAtingimento: number | null;
  /** realizado por operador dentro desta etapa */
  porOperador: DadosPorOperador[];
  /** realizado por hora dentro desta etapa */
  porHora: DadosPorHora[];
}

export interface DashboardPorEtapasData {
  data: string;
  produto: string;
  /** KPI global — soma de todas as etapas */
  totalGeral: { realizado: number; meta: number };
  /** Uma entrada por etapa que tem dados no dia */
  etapas: EtapaResumo[];
}

export interface DashboardProducaoFiltros {
  data: string;           // 'YYYY-MM-DD'
  etapa?: string;         // undefined = todas as etapas
  produto?: string;
}

export interface KpiProducao {
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  pctAtingimento: number | null;
}

export interface DadosPorHora {
  horarioBloco: string;
  realizado: number;
  meta: number;
}

export interface DadosPorOperador {
  operadorNome: string;
  totalRealizado: number;
  totalMeta: number;
}

export interface SaldoAcumulado {
  horarioBloco: string;
  saldoAcumulado: number;
}

export interface DashboardProducaoData {
  kpi: KpiProducao;
  porHora: DadosPorHora[];
  porOperador: DadosPorOperador[];
  saldoAcumulado: SaldoAcumulado[];
  etapasDisponiveis: string[];
  produtosDisponiveis: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWhere(filtros: DashboardProducaoFiltros): { sql: string; params: string[] } {
  const conds: string[] = ['f.data = ?'];
  const params: string[] = [filtros.data];

  if (filtros.etapa) {
    conds.push('f.etapa = ?');
    params.push(filtros.etapa);
  }
  if (filtros.produto) {
    conds.push('f.produto = ?');
    params.push(filtros.produto);
  }

  return { sql: conds.join(' AND '), params };
}

// ─── Função principal ─────────────────────────────────────────────────────────

export function getDashboardProducao(filtros: DashboardProducaoFiltros): DashboardProducaoData {
  const { sql: where, params } = buildWhere(filtros);

  // ── 1. KPIs globais ─────────────────────────────────────────────────────────
  const kpiRow = sqlite.prepare<string[], any>(`
    SELECT
      COALESCE(SUM(r.realizado), 0) AS totalRealizado,
      COALESCE(SUM(r.meta),      0) AS totalMeta
    FROM producao_registro_horario r
    JOIN producao_operador_diario  o ON o.id       = r.operador_diario_id
    JOIN producao_ficha_diaria     f ON f.id       = o.ficha_id
    WHERE ${where}
  `).get(...params) as { totalRealizado: number; totalMeta: number };

  const totalRealizado = kpiRow?.totalRealizado ?? 0;
  const totalMeta      = kpiRow?.totalMeta      ?? 0;
  const saldo          = totalRealizado - totalMeta;
  const pctAtingimento = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : null;

  // ── 2. Produção vs Meta por hora ─────────────────────────────────────────────
  const porHoraRows = sqlite.prepare<string[], any>(`
    SELECT
      r.horario_bloco  AS horarioBloco,
      SUM(r.realizado) AS realizado,
      SUM(r.meta)      AS meta
    FROM producao_registro_horario r
    JOIN producao_operador_diario  o ON o.id   = r.operador_diario_id
    JOIN producao_ficha_diaria     f ON f.id   = o.ficha_id
    WHERE ${where}
    GROUP BY r.horario_bloco
    ORDER BY r.horario_bloco ASC
  `).all(...params) as DadosPorHora[];

  // ── 3. Distribuição por operador ─────────────────────────────────────────────
  const porOperadorRows = sqlite.prepare<string[], any>(`
    SELECT
      o.operador_nome  AS operadorNome,
      SUM(r.realizado) AS totalRealizado,
      SUM(r.meta)      AS totalMeta
    FROM producao_registro_horario r
    JOIN producao_operador_diario  o ON o.id   = r.operador_diario_id
    JOIN producao_ficha_diaria     f ON f.id   = o.ficha_id
    WHERE ${where}
    GROUP BY o.operador_nome
    ORDER BY totalRealizado DESC
  `).all(...params) as DadosPorOperador[];

  // ── 4. Saldo acumulado ao longo do dia ───────────────────────────────────────
  let acumulado = 0;
  const saldoAcumulado: SaldoAcumulado[] = porHoraRows.map(h => {
    acumulado += h.realizado - h.meta;
    return { horarioBloco: h.horarioBloco, saldoAcumulado: acumulado };
  });

  // ── 5. Etapas e produtos disponíveis na data ─────────────────────────────────
  const etapasRows = sqlite.prepare<[string], any>(
    `SELECT DISTINCT etapa FROM producao_ficha_diaria WHERE data = ? ORDER BY etapa`
  ).all(filtros.data) as { etapa: string }[];

  const produtosRows = sqlite.prepare<[string], any>(
    `SELECT DISTINCT produto FROM producao_ficha_diaria WHERE data = ? ORDER BY produto`
  ).all(filtros.data) as { produto: string }[];

  return {
    kpi: { totalRealizado, totalMeta, saldo, pctAtingimento },
    porHora: porHoraRows,
    porOperador: porOperadorRows,
    saldoAcumulado,
    etapasDisponiveis: etapasRows.map(r => r.etapa),
    produtosDisponiveis: produtosRows.map(r => r.produto),
  };
}

// ─── Dashboard separado por etapa ────────────────────────────────────────────

export function getDashboardPorEtapas(data: string, produto?: string): DashboardPorEtapasData {
  const produtoFiltro = produto?.trim() || null;

  // Busca todas as etapas que têm dados no dia (e produto, se filtrado)
  const fichas = sqlite.prepare<any[], any>(`
    SELECT f.id, f.etapa, f.produto
    FROM producao_ficha_diaria f
    WHERE f.data = ?
      ${produtoFiltro ? 'AND f.produto = ?' : ''}
    ORDER BY f.etapa ASC
  `).all(...(produtoFiltro ? [data, produtoFiltro] : [data])) as { id: number; etapa: string; produto: string }[];

  const etapas: EtapaResumo[] = fichas.map(ficha => {
    // Operadores desta etapa
    const porOperador = sqlite.prepare<[number], any>(`
      SELECT
        o.operador_nome  AS operadorNome,
        SUM(r.realizado) AS totalRealizado,
        SUM(r.meta)      AS totalMeta
      FROM producao_operador_diario o
      LEFT JOIN producao_registro_horario r ON r.operador_diario_id = o.id
      WHERE o.ficha_id = ?
      GROUP BY o.operador_nome
      ORDER BY totalRealizado DESC
    `).all(ficha.id) as DadosPorOperador[];

    // Produção por hora desta etapa
    const porHora = sqlite.prepare<[number], any>(`
      SELECT
        r.horario_bloco  AS horarioBloco,
        SUM(r.realizado) AS realizado,
        SUM(r.meta)      AS meta
      FROM producao_registro_horario r
      JOIN producao_operador_diario o ON o.id = r.operador_diario_id
      WHERE o.ficha_id = ?
      GROUP BY r.horario_bloco
      ORDER BY r.horario_bloco ASC
    `).all(ficha.id) as DadosPorHora[];

    const totalRealizado = porOperador.reduce((s, o) => s + (o.totalRealizado ?? 0), 0);
    const totalMeta      = porOperador.reduce((s, o) => s + (o.totalMeta      ?? 0), 0);
    const saldo          = totalRealizado - totalMeta;
    const pctAtingimento = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : null;

    return { etapa: ficha.etapa, produto: ficha.produto, totalRealizado, totalMeta, saldo, pctAtingimento, porOperador, porHora };
  });

  const totalGeral = {
    realizado: etapas.reduce((s, e) => s + e.totalRealizado, 0),
    meta:      etapas.reduce((s, e) => s + e.totalMeta,      0),
  };

  return { data, produto: produtoFiltro ?? 'Todos', totalGeral, etapas };
}
