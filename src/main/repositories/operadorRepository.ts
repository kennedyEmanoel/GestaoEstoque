import { count, countDistinct, eq } from 'drizzle-orm';
import { db } from '../models/db';
import { operadores, producaoOperadorDiario, producaoRegistroHorario } from '../models/schema';
import type { ImpactoExclusao, Operador } from '../../shared/types';

export function listar(incluirInativos: boolean): Operador[] {
  const consulta = db.select().from(operadores);
  return incluirInativos ? consulta.all() : consulta.where(eq(operadores.ativo, true)).all();
}

export function buscarPorId(id: number): Operador | undefined {
  return db.select().from(operadores).where(eq(operadores.id, id)).get();
}

export function inserir(dados: { nome: string }): Operador {
  return db.insert(operadores).values(dados).returning().get();
}

export function atualizar(id: number, dados: { nome?: string; ativo?: boolean }): Operador | undefined {
  return db.update(operadores)
    .set({ ...dados, atualizadoEm: Date.now() })
    .where(eq(operadores.id, id))
    .returning()
    .get();
}

export function impacto(id: number): ImpactoExclusao {
  const escalas = db
    .select({ total: count(), cartoes: countDistinct(producaoOperadorDiario.fichaId) })
    .from(producaoOperadorDiario)
    .where(eq(producaoOperadorDiario.operadorId, id))
    .get();
  const registros = db
    .select({ total: count() })
    .from(producaoRegistroHorario)
    .innerJoin(producaoOperadorDiario, eq(producaoOperadorDiario.id, producaoRegistroHorario.operadorDiarioId))
    .where(eq(producaoOperadorDiario.operadorId, id))
    .get();
  return {
    cartoes: 0,
    operadores: escalas?.total ?? 0,
    registros: registros?.total ?? 0,
    variacoes: 0,
  };
}

export function remover(id: number): void {
  db.transaction((tx) => {
    tx.delete(producaoOperadorDiario).where(eq(producaoOperadorDiario.operadorId, id)).run();
    tx.delete(operadores).where(eq(operadores.id, id)).run();
  });
}
