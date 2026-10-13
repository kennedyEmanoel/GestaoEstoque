import { describe, expect, it } from 'vitest';
import type { CombinacaoAnalise } from '../../../shared/analise';
import {
  corrigirPeriodo,
  corrigirSelecao,
  etapasDoProduto,
  intervaloDosDados,
  operadoresDisponiveis,
  periodoAbrangendo,
  periodoPadrao,
  periodoPorUltimosDias,
  produtosDoOperador,
  selecaoInicial,
  variacoesDaEtapa,
} from './opcoes';

const combo = (extra: Partial<CombinacaoAnalise>): CombinacaoAnalise => ({
  operadorId: 1, operador: 'ANA', operadorAtivo: true,
  produtoId: 1, produto: '4G SIMCOM',
  etapaId: 1, etapa: 'Montagem', variacaoId: null, variacao: null,
  primeiraData: '2026-06-01', ultimaData: '2026-10-11', dias: 10,
  ...extra,
});

const COMBOS: CombinacaoAnalise[] = [
  combo({ ultimaData: '2026-10-11', dias: 50 }),
  combo({ etapaId: 2, etapa: 'Soldagem', variacaoId: 1, variacao: 'Cabos', primeiraData: '2026-07-01', ultimaData: '2026-09-20' }),
  combo({ etapaId: 2, etapa: 'Soldagem', variacaoId: 2, variacao: 'Retrabalho', primeiraData: '2026-08-01', ultimaData: '2026-08-10' }),
  combo({ etapaId: 2, etapa: 'Soldagem', primeiraData: '2026-06-02', ultimaData: '2026-06-30' }),
  combo({ operadorId: 2, operador: 'BETO', produtoId: 2, produto: 'GPS v2', primeiraData: '2026-10-01', ultimaData: '2026-10-10' }),
  combo({ operadorId: 3, operador: 'CIDA', operadorAtivo: false, etapaId: 3, etapa: 'Revisão', primeiraData: '2026-03-01', ultimaData: '2026-03-20' }),
];

describe('opções em cascata', () => {
  it('lista operadores em ordem alfabética, marcando os inativos', () => {
    expect(operadoresDisponiveis(COMBOS)).toEqual([
      { valor: 1, rotulo: 'ANA' }, { valor: 2, rotulo: 'BETO' }, { valor: 3, rotulo: 'CIDA (inativo)' },
    ]);
  });

  it('mostra só os produtos e etapas em que o operador atuou, etapas na ordem do processo', () => {
    expect(produtosDoOperador(COMBOS, 1)).toEqual([{ valor: 1, rotulo: '4G SIMCOM' }]);
    expect(produtosDoOperador(COMBOS, 2)).toEqual([{ valor: 2, rotulo: 'GPS v2' }]);
    expect(etapasDoProduto(COMBOS, 1, 1).map((e) => e.rotulo)).toEqual(['Montagem', 'Soldagem']);
    expect(etapasDoProduto(COMBOS, 2, 1)).toEqual([]);
  });

  it('oferece variação só quando há mais de uma opção, incluindo "sem variação" do legado', () => {
    expect(variacoesDaEtapa(COMBOS, 1, 1, 2).map((v) => v.rotulo)).toEqual([
      'Todas as variações', 'Sem variação', 'Cabos', 'Retrabalho',
    ]);
    expect(variacoesDaEtapa(COMBOS, 1, 1, 1)).toEqual([]);
  });

  it('corrige a seleção em cascata quando algo deixa de existir', () => {
    expect(corrigirSelecao(COMBOS, { operadorId: 2, produtoId: 1, etapaId: 2, variacao: 5 })).toEqual({
      operadorId: 2, produtoId: 2, etapaId: 1, variacao: 'todas',
    });
    expect(corrigirSelecao(COMBOS, { operadorId: 99, produtoId: null, etapaId: null, variacao: 'todas' })).toMatchObject({
      operadorId: 1, produtoId: 1, etapaId: 1,
    });
  });

  it('mantém uma seleção que continua válida', () => {
    const valida = { operadorId: 1, produtoId: 1, etapaId: 2, variacao: 2 };
    expect(corrigirSelecao(COMBOS, valida)).toEqual(valida);
    expect(corrigirSelecao(COMBOS, { ...valida, variacao: 'sem' })).toMatchObject({ variacao: 'sem' });
  });

  it('sem combinações, não há seleção', () => {
    expect(corrigirSelecao([], { operadorId: 1, produtoId: 1, etapaId: 1, variacao: 'todas' })).toEqual({
      operadorId: null, produtoId: null, etapaId: null, variacao: 'todas',
    });
    expect(selecaoInicial([])).toEqual({ operadorId: null, produtoId: null, etapaId: null, variacao: 'todas' });
  });

  it('a seleção inicial parte do operador com registro mais recente', () => {
    expect(selecaoInicial(COMBOS)).toEqual({ operadorId: 1, produtoId: 1, etapaId: 1, variacao: 'todas' });
  });
});

describe('intervalo e períodos', () => {
  const sel = { operadorId: 1, produtoId: 1, etapaId: 2 };

  it('acha o intervalo com dados da seleção (todas, sem variação ou específica)', () => {
    expect(intervaloDosDados(COMBOS, { ...sel, variacao: 'todas' })).toEqual({ primeira: '2026-06-02', ultima: '2026-09-20' });
    expect(intervaloDosDados(COMBOS, { ...sel, variacao: 'sem' })).toEqual({ primeira: '2026-06-02', ultima: '2026-06-30' });
    expect(intervaloDosDados(COMBOS, { ...sel, variacao: 1 })).toEqual({ primeira: '2026-07-01', ultima: '2026-09-20' });
    expect(intervaloDosDados(COMBOS, { operadorId: 2, produtoId: 1, etapaId: 1, variacao: 'todas' })).toBeNull();
  });

  it('período padrão: 30 dias terminando na data de referência', () => {
    expect(periodoPadrao('2026-10-11')).toEqual({ inicio: '2026-09-12', fim: '2026-10-11' });
    expect(periodoPorUltimosDias(7, '2026-10-11')).toEqual({ inicio: '2026-10-05', fim: '2026-10-11' });
  });

  it('período dos dados respeita o mínimo e o máximo', () => {
    expect(periodoAbrangendo({ primeira: '2026-10-10', ultima: '2026-10-11' })).toEqual({ inicio: '2026-10-05', fim: '2026-10-11' });
    expect(periodoAbrangendo({ primeira: '2026-06-01', ultima: '2026-10-11' })).toEqual({ inicio: '2026-06-01', fim: '2026-10-11' });
    expect(periodoAbrangendo({ primeira: '2024-01-01', ultima: '2026-10-11' }).inicio).toBe('2025-10-11');
  });

  it('sugere correção para períodos inválidos e nada para os válidos', () => {
    expect(corrigirPeriodo({ inicio: '2026-10-05', fim: '2026-10-08' })).toEqual({ inicio: '2026-10-05', fim: '2026-10-11' });
    expect(corrigirPeriodo({ inicio: '2026-10-11', fim: '2026-10-01' })).toEqual({ inicio: '2026-10-01', fim: '2026-10-11' });
    expect(corrigirPeriodo({ inicio: '2026-10-05', fim: '2026-10-11' })).toBeNull();
    expect(corrigirPeriodo({ inicio: '', fim: '2026-10-11' })).toBeNull();
    expect(corrigirPeriodo({ inicio: '2024-01-01', fim: '2026-10-11' })).toEqual({ inicio: '2025-10-11', fim: '2026-10-11' });
  });
});
