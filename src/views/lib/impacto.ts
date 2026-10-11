import type { ImpactoExclusao } from '../../shared/types';

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

/** Linhas do aviso "isto também será apagado" (só o que for maior que zero). */
export function linhasDoImpacto(impacto: ImpactoExclusao): string[] {
  const linhas: string[] = [];
  if (impacto.cartoes > 0) linhas.push(plural(impacto.cartoes, 'cartão de produção', 'cartões de produção'));
  if (impacto.operadores > 0) linhas.push(plural(impacto.operadores, 'escala de operador', 'escalas de operador'));
  if (impacto.registros > 0) linhas.push(plural(impacto.registros, 'registro hora a hora', 'registros hora a hora'));
  if (impacto.variacoes > 0) linhas.push(plural(impacto.variacoes, 'variação', 'variações'));
  return linhas;
}
