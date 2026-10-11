import { asc, eq } from 'drizzle-orm';
import { db } from '../models/db';
import { etapaVariacoes, producaoFichaDiaria } from '../models/schema';
import type { EtapaVariacao, ImpactoExclusao } from '../../shared/types';
import { contarDependentesDeFichas, idsDeFichas } from './producaoRepository';

export function listar(incluirInativos: boolean): EtapaVariacao[] {
  const consulta = db.select().from(etapaVariacoes);
  return (incluirInativos ? consulta : consulta.where(eq(etapaVariacoes.ativo, true)))
    .orderBy(asc(etapaVariacoes.id)).all();
}

export function buscarPorId(id: number): EtapaVariacao | undefined {
  return db.select().from(etapaVariacoes).where(eq(etapaVariacoes.id, id)).get();
}

export function inserir(dados: { etapaId: number; nome: string }): EtapaVariacao {
  return db.insert(etapaVariacoes).values(dados).returning().get();
}

export function atualizar(id: number, dados: { nome?: string; ativo?: boolean }): EtapaVariacao | undefined {
  return db.update(etapaVariacoes)
    .set({ ...dados, atualizadoEm: Date.now() })
    .where(eq(etapaVariacoes.id, id))
    .returning()
    .get();
}

/** O que será apagado junto: os cartões que usam esta variação (com escalas e registros). */
export function impacto(id: number): ImpactoExclusao {
  const fichas = idsDeFichas(eq(producaoFichaDiaria.variacaoId, id));
  return { cartoes: fichas.length, ...contarDependentesDeFichas(fichas), variacoes: 0 };
}

/** Apaga a variação e os cartões que a usam. */
export function remover(id: number): void {
  db.transaction((tx) => {
    tx.delete(producaoFichaDiaria).where(eq(producaoFichaDiaria.variacaoId, id)).run();
    tx.delete(etapaVariacoes).where(eq(etapaVariacoes.id, id)).run();
  });
}
