import { eq } from 'drizzle-orm';
import { db } from '../models/db';
import { produtos, producaoFichaDiaria } from '../models/schema';
import type { ImpactoExclusao, Produto } from '../../shared/types';
import { contarDependentesDeFichas, idsDeFichas } from './producaoRepository';

export function listar(incluirInativos: boolean): Produto[] {
  const consulta = db.select().from(produtos);
  return incluirInativos ? consulta.all() : consulta.where(eq(produtos.ativo, true)).all();
}

export function buscarPorId(id: number): Produto | undefined {
  return db.select().from(produtos).where(eq(produtos.id, id)).get();
}

export function inserir(dados: { nome: string; descricao: string | null; versao: string }): Produto {
  return db.insert(produtos).values(dados).returning().get();
}

export function atualizar(
  id: number,
  dados: { nome?: string; descricao?: string | null; versao?: string; ativo?: boolean },
): Produto | undefined {
  return db.update(produtos)
    .set({ ...dados, atualizadoEm: Date.now() })
    .where(eq(produtos.id, id))
    .returning()
    .get();
}

export function impacto(id: number): ImpactoExclusao {
  const fichas = idsDeFichas(eq(producaoFichaDiaria.produtoId, id));
  return { cartoes: fichas.length, ...contarDependentesDeFichas(fichas), variacoes: 0 };
}

export function remover(id: number): void {
  db.transaction((tx) => {
    tx.delete(producaoFichaDiaria).where(eq(producaoFichaDiaria.produtoId, id)).run();
    tx.delete(produtos).where(eq(produtos.id, id)).run();
  });
}
