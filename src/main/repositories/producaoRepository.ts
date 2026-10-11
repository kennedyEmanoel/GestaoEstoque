import { and, asc, count, desc, eq, inArray, isNull, max, sql, type SQL } from 'drizzle-orm';
import { db } from '../models/db';
import {
  etapas,
  etapaVariacoes,
  operadores,
  producaoFichaDiaria as fichas,
  producaoOperadorDiario as escalas,
  producaoRegistroHorario as registros,
  produtos,
} from '../models/schema';
import type { DiaComRegistro, FichaDiaria, OperadorDiario, RegistroHorario } from '../../shared/types';

export interface ChaveFicha {
  data: string;
  produtoId: number;
  etapaId: number;
  variacaoId: number | null;
}

// ─── Fichas (cartões do dia) ─────────────────────────────────────────────────

function consultaFicha() {
  return db
    .select({
      id:             fichas.id,
      data:           fichas.data,
      produtoId:      fichas.produtoId,
      produto:        produtos.nome,
      produtoVersao:  produtos.versao,
      etapaId:        fichas.etapaId,
      etapa:          etapas.nome,
      variacaoId:     fichas.variacaoId,
      variacao:       etapaVariacoes.nome,
      metaHoraPadrao: fichas.metaHoraPadrao,
      criadoEm:       fichas.criadoEm,
    })
    .from(fichas)
    .innerJoin(produtos, eq(produtos.id, fichas.produtoId))
    .innerJoin(etapas, eq(etapas.id, fichas.etapaId))
    .leftJoin(etapaVariacoes, eq(etapaVariacoes.id, fichas.variacaoId));
}

export function buscarFichaPorId(id: number): FichaDiaria | undefined {
  return consultaFicha().where(eq(fichas.id, id)).get();
}

export function buscarFichaPorChave(chave: ChaveFicha): FichaDiaria | undefined {
  return consultaFicha().where(and(
    eq(fichas.data, chave.data),
    eq(fichas.produtoId, chave.produtoId),
    eq(fichas.etapaId, chave.etapaId),
    chave.variacaoId === null ? isNull(fichas.variacaoId) : eq(fichas.variacaoId, chave.variacaoId),
  )).get();
}

export function inserirFicha(dados: ChaveFicha & { metaHoraPadrao: number }): number {
  return db.insert(fichas)
    .values({ ...dados, criadoEm: Date.now() })
    .returning({ id: fichas.id })
    .get().id;
}

/** Os dias mais recentes que têm cartões, do mais novo para o mais antigo. */
export function listarDiasComRegistro(limite: number): DiaComRegistro[] {
  return db
    .select({
      data:           fichas.data,
      cartoes:        sql<number>`count(distinct ${fichas.id})`.mapWith(Number),
      totalRealizado: sql<number>`coalesce(sum(${registros.realizado}), 0)`.mapWith(Number),
      totalMeta:      sql<number>`coalesce(sum(${registros.meta}), 0)`.mapWith(Number),
    })
    .from(fichas)
    .leftJoin(escalas, eq(escalas.fichaId, fichas.id))
    .leftJoin(registros, eq(registros.operadorDiarioId, escalas.id))
    .groupBy(fichas.data)
    .orderBy(desc(fichas.data))
    .limit(limite)
    .all();
}

export function atualizarMetaPadrao(id: number, meta: number): boolean {
  return db.update(fichas).set({ metaHoraPadrao: meta }).where(eq(fichas.id, id)).run().changes > 0;
}

// ─── Escala de operadores na ficha ───────────────────────────────────────────

function consultaEscala() {
  return db
    .select({
      id:           escalas.id,
      fichaId:      escalas.fichaId,
      operadorId:   escalas.operadorId,
      operadorNome: operadores.nome,
      ordem:        escalas.ordem,
    })
    .from(escalas)
    .innerJoin(operadores, eq(operadores.id, escalas.operadorId));
}

export function listarEscala(fichaId: number): OperadorDiario[] {
  return consultaEscala().where(eq(escalas.fichaId, fichaId)).orderBy(asc(escalas.ordem), asc(escalas.id)).all();
}

export function buscarEscalaPorId(id: number): OperadorDiario | undefined {
  return consultaEscala().where(eq(escalas.id, id)).get();
}

export function buscarEscala(fichaId: number, operadorId: number): OperadorDiario | undefined {
  return consultaEscala().where(and(eq(escalas.fichaId, fichaId), eq(escalas.operadorId, operadorId))).get();
}

export function proximaOrdem(fichaId: number): number {
  const linha = db.select({ maior: max(escalas.ordem) }).from(escalas).where(eq(escalas.fichaId, fichaId)).get();
  return (linha?.maior ?? -1) + 1;
}

export function inserirEscala(dados: { fichaId: number; operadorId: number; ordem: number }): number {
  return db.insert(escalas).values(dados).returning({ id: escalas.id }).get().id;
}

/** Ids das fichas que atendem a uma condição (base para medir/apagar o que depende de um cadastro). */
export function idsDeFichas(condicao: SQL): number[] {
  return db.select({ id: fichas.id }).from(fichas).where(condicao).all().map((f) => f.id);
}

/** Quantas escalas e registros horários existem nas fichas informadas. */
export function contarDependentesDeFichas(fichaIds: number[]): { operadores: number; registros: number } {
  if (fichaIds.length === 0) return { operadores: 0, registros: 0 };
  const operadores = db.select({ total: count() }).from(escalas)
    .where(inArray(escalas.fichaId, fichaIds)).get()?.total ?? 0;
  const regs = db.select({ total: count() }).from(registros)
    .innerJoin(escalas, eq(escalas.id, registros.operadorDiarioId))
    .where(inArray(escalas.fichaId, fichaIds)).get()?.total ?? 0;
  return { operadores, registros: regs };
}

/** Apaga a ficha; escala e registros saem junto (ON DELETE CASCADE). */
export function removerFicha(id: number): void {
  db.delete(fichas).where(eq(fichas.id, id)).run();
}

/** Os registros horários saem junto (ON DELETE CASCADE). */
export function removerEscala(id: number): void {
  db.delete(escalas).where(eq(escalas.id, id)).run();
}

// ─── Registros hora a hora ───────────────────────────────────────────────────

export function listarRegistrosDaFicha(fichaId: number): RegistroHorario[] {
  return db
    .select({
      id:               registros.id,
      operadorDiarioId: registros.operadorDiarioId,
      horarioBloco:     registros.horarioBloco,
      meta:             registros.meta,
      realizado:        registros.realizado,
    })
    .from(registros)
    .innerJoin(escalas, eq(escalas.id, registros.operadorDiarioId))
    .where(eq(escalas.fichaId, fichaId))
    .orderBy(asc(registros.horarioBloco))
    .all();
}

export function gravarRegistro(dados: Omit<RegistroHorario, 'id'>): RegistroHorario {
  return db.insert(registros)
    .values(dados)
    .onConflictDoUpdate({
      target: [registros.operadorDiarioId, registros.horarioBloco],
      set: { meta: dados.meta, realizado: dados.realizado },
    })
    .returning()
    .get();
}
