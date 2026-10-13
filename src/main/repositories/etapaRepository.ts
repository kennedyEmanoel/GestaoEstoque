import { asc, count, eq } from 'drizzle-orm';
import { db } from '../models/db';
import { etapas, etapaVariacoes, producaoFichaDiaria } from '../models/schema';
import type { ImpactoExclusao } from '../../shared/types';
import { contarDependentesDeFichas, idsDeFichas } from './producaoRepository';

export type LinhaEtapa = typeof etapas.$inferSelect;

export function listar(incluirInativos: boolean): LinhaEtapa[] {
  const consulta = db.select().from(etapas);
  return (incluirInativos ? consulta : consulta.where(eq(etapas.ativo, true))).orderBy(asc(etapas.id)).all();
}

export function buscarPorId(id: number): LinhaEtapa | undefined {
  return db.select().from(etapas).where(eq(etapas.id, id)).get();
}

export function inserir(dados: { nome: string; descricao: string | null }): LinhaEtapa {
  return db.insert(etapas).values(dados).returning().get();
}

export function atualizar(
  id: number,
  dados: { nome?: string; descricao?: string | null; ativo?: boolean },
): LinhaEtapa | undefined {
  return db.update(etapas)
    .set({ ...dados, atualizadoEm: Date.now() })
    .where(eq(etapas.id, id))
    .returning()
    .get();
}

export function impacto(id: number): ImpactoExclusao {
  const fichas = idsDeFichas(eq(producaoFichaDiaria.etapaId, id));
  const variacoes = db.select({ total: count() }).from(etapaVariacoes)
    .where(eq(etapaVariacoes.etapaId, id)).get()?.total ?? 0;
  return { cartoes: fichas.length, ...contarDependentesDeFichas(fichas), variacoes };
}

export function remover(id: number): void {
  db.transaction((tx) => {
    tx.delete(producaoFichaDiaria).where(eq(producaoFichaDiaria.etapaId, id)).run();
    tx.delete(etapaVariacoes).where(eq(etapaVariacoes.etapaId, id)).run();
    tx.delete(etapas).where(eq(etapas.id, id)).run();
  });
}
