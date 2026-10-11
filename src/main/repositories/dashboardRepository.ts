import { and, asc, eq, sql } from 'drizzle-orm';
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
import type { DadosPorHora, DadosPorOperador } from '../../shared/types';

export interface FichaDoDia {
  fichaId: number;
  etapa: string;
  variacao: string | null;
  produto: string;
  produtoVersao: string;
}

/** Fichas do dia na ordem do processo (etapa, depois variação, depois produto). */
export function listarFichasDoDia(data: string, produtoId: number | null): FichaDoDia[] {
  return db
    .select({
      fichaId:       fichas.id,
      etapa:         etapas.nome,
      variacao:      etapaVariacoes.nome,
      produto:       produtos.nome,
      produtoVersao: produtos.versao,
    })
    .from(fichas)
    .innerJoin(produtos, eq(produtos.id, fichas.produtoId))
    .innerJoin(etapas, eq(etapas.id, fichas.etapaId))
    .leftJoin(etapaVariacoes, eq(etapaVariacoes.id, fichas.variacaoId))
    .where(and(
      eq(fichas.data, data),
      produtoId === null ? undefined : eq(fichas.produtoId, produtoId),
    ))
    .orderBy(
      asc(etapas.id),
      asc(sql`coalesce(${fichas.variacaoId}, 0)`),
      asc(produtos.nome),
      asc(fichas.id),
    )
    .all();
}

/** Totais por operador da ficha; com `bloco`, considera só aquela faixa de horário. */
export function totaisPorOperador(fichaId: number, bloco: string | null): DadosPorOperador[] {
  return db
    .select({
      operadorNome:   operadores.nome,
      totalRealizado: sql<number>`coalesce(sum(${registros.realizado}), 0)`.mapWith(Number),
      totalMeta:      sql<number>`coalesce(sum(${registros.meta}), 0)`.mapWith(Number),
    })
    .from(escalas)
    .innerJoin(operadores, eq(operadores.id, escalas.operadorId))
    .leftJoin(registros, and(
      eq(registros.operadorDiarioId, escalas.id),
      bloco === null ? undefined : eq(registros.horarioBloco, bloco),
    ))
    .where(eq(escalas.fichaId, fichaId))
    .groupBy(escalas.id)
    .orderBy(asc(escalas.ordem), asc(escalas.id))
    .all();
}

export function totaisPorHora(fichaId: number): DadosPorHora[] {
  return db
    .select({
      horarioBloco: registros.horarioBloco,
      realizado:    sql<number>`sum(${registros.realizado})`.mapWith(Number),
      meta:         sql<number>`sum(${registros.meta})`.mapWith(Number),
    })
    .from(registros)
    .innerJoin(escalas, eq(escalas.id, registros.operadorDiarioId))
    .where(eq(escalas.fichaId, fichaId))
    .groupBy(registros.horarioBloco)
    .orderBy(asc(registros.horarioBloco))
    .all();
}
