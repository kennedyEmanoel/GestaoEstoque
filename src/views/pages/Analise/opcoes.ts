import {
  PERIODO_MAX_DIAS,
  PERIODO_MIN_DIAS,
  validarPeriodo,
  type CombinacaoAnalise,
  type FiltroVariacao,
} from '../../../shared/analise';
import { adicionarDias, dataIsoValida, diasEntre } from '../../../shared/datas';

export interface OpcaoSelect<V extends string | number> {
  valor: V;
  rotulo: string;
}

export interface SelecaoFiltros {
  operadorId: number | null;
  produtoId: number | null;
  etapaId: number | null;
  variacao: FiltroVariacao;
}

export interface Periodo {
  inicio: string;
  fim: string;
}

export const SELECAO_VAZIA: SelecaoFiltros = { operadorId: null, produtoId: null, etapaId: null, variacao: 'todas' };

const porRotulo = <V extends string | number>(a: OpcaoSelect<V>, b: OpcaoSelect<V>) =>
  a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' });

function unicos<V extends string | number>(opcoes: OpcaoSelect<V>[]): OpcaoSelect<V>[] {
  const vistos = new Set<V>();
  return opcoes.filter((o) => (vistos.has(o.valor) ? false : (vistos.add(o.valor), true)));
}

export function operadoresDisponiveis(combos: readonly CombinacaoAnalise[]): OpcaoSelect<number>[] {
  return unicos(combos.map((c) => ({
    valor: c.operadorId,
    rotulo: c.operadorAtivo ? c.operador : `${c.operador} (inativo)`,
  }))).sort(porRotulo);
}

export function produtosDoOperador(combos: readonly CombinacaoAnalise[], operadorId: number | null): OpcaoSelect<number>[] {
  return unicos(
    combos.filter((c) => c.operadorId === operadorId).map((c) => ({ valor: c.produtoId, rotulo: c.produto })),
  ).sort(porRotulo);
}

export function etapasDoProduto(
  combos: readonly CombinacaoAnalise[],
  operadorId: number | null,
  produtoId: number | null,
): OpcaoSelect<number>[] {
  const doProduto = combos.filter((c) => c.operadorId === operadorId && c.produtoId === produtoId);
  return unicos([...doProduto].sort((a, b) => a.etapaId - b.etapaId).map((c) => ({ valor: c.etapaId, rotulo: c.etapa })));
}

// Só vale a pena escolher variação quando há mais de uma possibilidade
export function variacoesDaEtapa(
  combos: readonly CombinacaoAnalise[],
  operadorId: number | null,
  produtoId: number | null,
  etapaId: number | null,
): OpcaoSelect<FiltroVariacao>[] {
  const daEtapa = combos.filter((c) => c.operadorId === operadorId && c.produtoId === produtoId && c.etapaId === etapaId);
  if (daEtapa.length < 2) return [];

  const comVariacao = unicos(
    daEtapa.flatMap((c) => (c.variacaoId === null || c.variacao === null ? [] : [{ valor: c.variacaoId, rotulo: c.variacao }])),
  ).sort(porRotulo);

  const opcoes: OpcaoSelect<FiltroVariacao>[] = [{ valor: 'todas', rotulo: 'Todas as variações' }];
  if (daEtapa.some((c) => c.variacaoId === null)) opcoes.push({ valor: 'sem', rotulo: 'Sem variação' });
  return [...opcoes, ...comVariacao];
}

export function corrigirSelecao(combos: readonly CombinacaoAnalise[], pedida: SelecaoFiltros): SelecaoFiltros {
  const operadores = operadoresDisponiveis(combos);
  const operadorId = operadores.some((o) => o.valor === pedida.operadorId) ? pedida.operadorId : (operadores[0]?.valor ?? null);

  const produtos = produtosDoOperador(combos, operadorId);
  const produtoId = produtos.some((p) => p.valor === pedida.produtoId) ? pedida.produtoId : (produtos[0]?.valor ?? null);

  const etapas = etapasDoProduto(combos, operadorId, produtoId);
  const etapaId = etapas.some((e) => e.valor === pedida.etapaId) ? pedida.etapaId : (etapas[0]?.valor ?? null);

  const variacoes = variacoesDaEtapa(combos, operadorId, produtoId, etapaId);
  const variacao = variacoes.some((v) => v.valor === pedida.variacao) ? pedida.variacao : 'todas';

  return { operadorId, produtoId, etapaId, variacao };
}

// Começa pelo operador com o registro mais recente, na combinação que ele usou por último
export function selecaoInicial(combos: readonly CombinacaoAnalise[]): SelecaoFiltros {
  const maisRecente = [...combos].sort(
    (a, b) => b.ultimaData.localeCompare(a.ultimaData) || b.dias - a.dias || a.operador.localeCompare(b.operador, 'pt-BR'),
  )[0];
  if (!maisRecente) return SELECAO_VAZIA;
  return corrigirSelecao(combos, {
    operadorId: maisRecente.operadorId,
    produtoId: maisRecente.produtoId,
    etapaId: maisRecente.etapaId,
    variacao: 'todas',
  });
}

export function intervaloDosDados(
  combos: readonly CombinacaoAnalise[],
  selecao: SelecaoFiltros,
): { primeira: string; ultima: string } | null {
  const correspondentes = combos.filter((c) =>
    c.operadorId === selecao.operadorId
    && c.produtoId === selecao.produtoId
    && c.etapaId === selecao.etapaId
    && (selecao.variacao === 'todas'
      || (selecao.variacao === 'sem' ? c.variacaoId === null : c.variacaoId === selecao.variacao)),
  );
  if (correspondentes.length === 0) return null;
  return {
    primeira: correspondentes.map((c) => c.primeiraData).sort()[0],
    ultima: correspondentes.map((c) => c.ultimaData).sort().reverse()[0],
  };
}

export function periodoPadrao(fim: string): Periodo {
  return { inicio: adicionarDias(fim, -29), fim };
}

export function periodoAbrangendo(intervalo: { primeira: string; ultima: string }): Periodo {
  const fim = intervalo.ultima;
  const dias = diasEntre(intervalo.primeira, fim) + 1;
  if (dias < PERIODO_MIN_DIAS) return { inicio: adicionarDias(fim, -(PERIODO_MIN_DIAS - 1)), fim };
  if (dias > PERIODO_MAX_DIAS) return { inicio: adicionarDias(fim, -(PERIODO_MAX_DIAS - 1)), fim };
  return { inicio: intervalo.primeira, fim };
}

export function periodoPorUltimosDias(dias: number, hoje: string): Periodo {
  return { inicio: adicionarDias(hoje, -(dias - 1)), fim: hoje };
}

// Sugere o período válido mais próximo do que foi digitado; null quando já está válido ou faltam datas
export function corrigirPeriodo(periodo: Periodo): Periodo | null {
  if (!dataIsoValida(periodo.inicio) || !dataIsoValida(periodo.fim)) return null;
  if (validarPeriodo(periodo.inicio, periodo.fim) === null) return null;

  const [inicio, fim] = periodo.inicio <= periodo.fim ? [periodo.inicio, periodo.fim] : [periodo.fim, periodo.inicio];
  const dias = diasEntre(inicio, fim) + 1;
  if (dias < PERIODO_MIN_DIAS) return { inicio, fim: adicionarDias(inicio, PERIODO_MIN_DIAS - 1) };
  if (dias > PERIODO_MAX_DIAS) return { inicio: adicionarDias(fim, -(PERIODO_MAX_DIAS - 1)), fim };
  return { inicio, fim };
}
