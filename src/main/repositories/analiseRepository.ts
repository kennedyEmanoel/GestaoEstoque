import { and, asc, countDistinct, eq, gte, isNull, lte, max, min } from 'drizzle-orm';
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
import type { FiltroVariacao, RegistroDeAnalise } from '../../shared/analise';

export interface LinhaCombinacao {
  operadorId: number;
  operador: string;
  operadorAtivo: boolean;
  produtoId: number;
  produto: string;
  produtoVersao: string;
  etapaId: number;
  etapa: string;
  variacaoId: number | null;
  variacao: string | null;
  primeiraData: string | null;
  ultimaData: string | null;
  dias: number;
}

export interface ConsultaRegistros {
  operadorId: number;
  produtoId: number;
  etapaId: number;
  variacao: FiltroVariacao;
  inicio: string;
  fim: string;
}

export function listarCombinacoes(): LinhaCombinacao[] {
  return db
    .select({
      operadorId:    operadores.id,
      operador:      operadores.nome,
      operadorAtivo: operadores.ativo,
      produtoId:     produtos.id,
      produto:       produtos.nome,
      produtoVersao: produtos.versao,
      etapaId:       etapas.id,
      etapa:         etapas.nome,
      variacaoId:    fichas.variacaoId,
      variacao:      etapaVariacoes.nome,
      primeiraData:  min(fichas.data),
      ultimaData:    max(fichas.data),
      dias:          countDistinct(fichas.data),
    })
    .from(registros)
    .innerJoin(escalas, eq(escalas.id, registros.operadorDiarioId))
    .innerJoin(fichas, eq(fichas.id, escalas.fichaId))
    .innerJoin(operadores, eq(operadores.id, escalas.operadorId))
    .innerJoin(produtos, eq(produtos.id, fichas.produtoId))
    .innerJoin(etapas, eq(etapas.id, fichas.etapaId))
    .leftJoin(etapaVariacoes, eq(etapaVariacoes.id, fichas.variacaoId))
    .groupBy(operadores.id, produtos.id, etapas.id, fichas.variacaoId)
    .orderBy(asc(operadores.nome), asc(produtos.nome), asc(etapas.id), asc(fichas.variacaoId))
    .all();
}

export function listarRegistros(consulta: ConsultaRegistros): RegistroDeAnalise[] {
  const { variacao } = consulta;
  const filtroVariacao =
    variacao === 'todas' ? undefined
    : variacao === 'sem' ? isNull(fichas.variacaoId)
    : eq(fichas.variacaoId, variacao);

  return db
    .select({
      data:         fichas.data,
      horarioBloco: registros.horarioBloco,
      meta:         registros.meta,
      realizado:    registros.realizado,
    })
    .from(registros)
    .innerJoin(escalas, eq(escalas.id, registros.operadorDiarioId))
    .innerJoin(fichas, eq(fichas.id, escalas.fichaId))
    .where(and(
      eq(escalas.operadorId, consulta.operadorId),
      eq(fichas.produtoId, consulta.produtoId),
      eq(fichas.etapaId, consulta.etapaId),
      filtroVariacao,
      gte(fichas.data, consulta.inicio),
      lte(fichas.data, consulta.fim),
    ))
    .orderBy(asc(fichas.data), asc(registros.horarioBloco))
    .all();
}
