import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/db', async () => (await import('../testing/bancoDeTeste')).criarBancoDeTeste());

import { sqlite } from '../models/db';
import { ErroNegocio } from '../erros';
import * as operadores from './operadorService';
import * as produtos from './produtoService';
import * as etapas from './etapaService';
import * as producao from './producaoService';
import { analisarDesempenho, listarOpcoesAnalise } from './analiseService';
import type { FiltroAnalise } from '../../shared/analise';

const B1 = '07:12 - 08:00';
const B2 = '08:00 - 09:00';

let ana: ReturnType<typeof operadores.criar>;
let beto: ReturnType<typeof operadores.criar>;
let produto: ReturnType<typeof produtos.criar>;
let outroProduto: ReturnType<typeof produtos.criar>;
let soldagem: ReturnType<typeof etapas.listar>[number];
let montagem: ReturnType<typeof etapas.listar>[number];
let cabos: number;
let retrabalho: number;

beforeEach(() => {
  sqlite.exec(`
    DELETE FROM producao_ficha_diaria;
    DELETE FROM operadores;
    DELETE FROM produtos;
    UPDATE etapas SET ativo = 1; UPDATE etapa_variacoes SET ativo = 1;
  `);
  ana = operadores.criar({ nome: 'Ana' });
  beto = operadores.criar({ nome: 'Beto' });
  produto = produtos.criar({ nome: '4G SIMCOM' });
  outroProduto = produtos.criar({ nome: 'GPS', versao: 'v2' });
  const lista = etapas.listar();
  soldagem = lista.find((e) => e.nome === 'Soldagem')!;
  montagem = lista.find((e) => e.nome === 'Montagem')!;
  cabos = soldagem.variacoes.find((v) => v.nome === 'Cabos')!.id;
  retrabalho = soldagem.variacoes.find((v) => v.nome === 'Retrabalho')!.id;
});

function registrar(
  operadorId: number,
  data: string,
  blocos: Array<[string, number, number]>,
  opcoes: { produtoId?: number; etapaId?: number; variacaoId?: number | null } = {},
) {
  const ficha = producao.getOrCreateFicha({
    data,
    produtoId: opcoes.produtoId ?? produto.id,
    etapaId: opcoes.etapaId ?? montagem.id,
    variacaoId: opcoes.variacaoId ?? null,
    metaHoraPadrao: 40,
  });
  const escala = producao.addOperador({ fichaId: ficha.id, operadorId });
  for (const [horarioBloco, meta, realizado] of blocos) {
    producao.upsertRegistro({ operadorDiarioId: escala.id, horarioBloco, meta, realizado });
  }
}

const filtro = (extra: Partial<FiltroAnalise> = {}): FiltroAnalise => ({
  operadorId: ana.id,
  produtoId: produto.id,
  etapaId: montagem.id,
  variacao: 'todas',
  inicio: '2026-10-05',
  fim: '2026-10-11',
  ...extra,
});

function falhaCom(acao: () => unknown, trecho: RegExp) {
  try {
    acao();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroNegocio);
    expect((e as Error).message).toMatch(trecho);
    return;
  }
  throw new Error('Esperava um ErroNegocio, mas nada foi lançado');
}

describe('opções da análise', () => {
  it('lista só combinações com registros, com rótulos, primeira/última data e dias', () => {
    registrar(ana.id, '2026-10-05', [[B1, 40, 38]]);
    registrar(ana.id, '2026-10-07', [[B1, 40, 40]]);
    registrar(ana.id, '2026-10-06', [[B1, 50, 45]], { produtoId: outroProduto.id, etapaId: soldagem.id, variacaoId: cabos });

    const ficha = producao.getOrCreateFicha({ data: '2026-10-08', produtoId: produto.id, etapaId: montagem.id, metaHoraPadrao: 40 });
    producao.addOperador({ fichaId: ficha.id, operadorId: beto.id });

    const opcoes = listarOpcoesAnalise();
    expect(opcoes.map((o) => [o.operador, o.produto, o.etapa, o.variacao, o.primeiraData, o.ultimaData, o.dias])).toEqual([
      ['ANA', '4G SIMCOM', 'Montagem', null, '2026-10-05', '2026-10-07', 2],
      ['ANA', 'GPS v2', 'Soldagem', 'Cabos', '2026-10-06', '2026-10-06', 1],
    ]);
    expect(opcoes.every((o) => o.operadorAtivo)).toBe(true);
  });

  it('mantém operador inativo (o histórico dele continua analisável)', () => {
    registrar(ana.id, '2026-10-05', [[B1, 40, 38]]);
    operadores.definirAtivo(ana.id, false);
    expect(listarOpcoesAnalise()[0]).toMatchObject({ operador: 'ANA', operadorAtivo: false });
  });

  it('sem registros não há opções', () => {
    expect(listarOpcoesAnalise()).toEqual([]);
  });
});

describe('analisarDesempenho', () => {
  it('devolve o contexto, os totais e a quebra por dia e hora do operador', () => {
    registrar(ana.id, '2026-10-05', [[B1, 40, 38], [B2, 40, 42]]);
    registrar(ana.id, '2026-10-06', [[B1, 40, 20]]);

    const a = analisarDesempenho(filtro());
    expect(a.filtro).toMatchObject({
      operador: 'ANA', produto: '4G SIMCOM', etapa: 'Montagem', variacaoRotulo: 'Todas',
      inicio: '2026-10-05', fim: '2026-10-11', diasNoPeriodo: 7,
    });
    expect(a.geral).toMatchObject({ totalMeta: 120, totalRealizado: 100, diasComRegistro: 2, blocosRegistrados: 3 });
    expect(a.geral.eficienciaGlobal).toBeCloseTo(83.33, 1);
    expect(a.dias[0].horas.slice(0, 2).map((h) => [h.bloco, h.meta, h.realizado])).toEqual([[B1, 40, 38], [B2, 40, 42]]);
  });

  it('não mistura registros de outro operador, produto ou etapa', () => {
    registrar(ana.id, '2026-10-05', [[B1, 40, 40]]);
    registrar(beto.id, '2026-10-05', [[B1, 40, 10]]);
    registrar(ana.id, '2026-10-06', [[B1, 40, 10]], { produtoId: outroProduto.id });
    registrar(ana.id, '2026-10-07', [[B1, 40, 10]], { etapaId: soldagem.id });

    const a = analisarDesempenho(filtro());
    expect(a.geral).toMatchObject({ totalMeta: 40, totalRealizado: 40, diasComRegistro: 1 });
  });

  it('o período inclui os dois extremos e exclui o que está fora', () => {
    registrar(ana.id, '2026-10-04', [[B1, 40, 40]]);
    registrar(ana.id, '2026-10-05', [[B1, 40, 30]]);
    registrar(ana.id, '2026-10-11', [[B1, 40, 20]]);
    registrar(ana.id, '2026-10-12', [[B1, 40, 40]]);

    const a = analisarDesempenho(filtro());
    expect(a.geral).toMatchObject({ totalMeta: 80, totalRealizado: 50 });
    expect(a.dias.map((d) => d.data)).toContain('2026-10-11');
  });

  it('filtra por variação: específica, "sem variação" ou todas', () => {
    registrar(ana.id, '2026-10-05', [[B1, 40, 40]], { etapaId: soldagem.id, variacaoId: cabos });
    registrar(ana.id, '2026-10-06', [[B1, 40, 20]], { etapaId: soldagem.id, variacaoId: retrabalho });
    registrar(ana.id, '2026-10-07', [[B1, 40, 10]], { etapaId: soldagem.id, variacaoId: null });
    const base = { etapaId: soldagem.id };

    expect(analisarDesempenho(filtro({ ...base, variacao: cabos })).geral.totalRealizado).toBe(40);
    expect(analisarDesempenho(filtro({ ...base, variacao: retrabalho })).geral.totalRealizado).toBe(20);
    expect(analisarDesempenho(filtro({ ...base, variacao: 'sem' })).geral.totalRealizado).toBe(10);
    expect(analisarDesempenho(filtro({ ...base, variacao: 'todas' })).geral.totalRealizado).toBe(70);
    expect(analisarDesempenho(filtro({ ...base, variacao: cabos })).filtro.variacaoRotulo).toBe('Cabos');
    expect(analisarDesempenho(filtro({ ...base, variacao: 'sem' })).filtro.variacaoRotulo).toBe('Sem variação');
  });

  it('período sem registros devolve análise vazia, não erro', () => {
    const a = analisarDesempenho(filtro());
    expect(a.geral.blocosRegistrados).toBe(0);
    expect(a.geral.eficienciaGlobal).toBeNull();
  });
});

describe('validação do período e dos filtros', () => {
  it('exige pelo menos 7 dias (1 semana)', () => {
    expect(() => analisarDesempenho(filtro({ inicio: '2026-10-05', fim: '2026-10-11' }))).not.toThrow();
    falhaCom(() => analisarDesempenho(filtro({ inicio: '2026-10-05', fim: '2026-10-10' })), /pelo menos 7 dias.*6 dias/);
    falhaCom(() => analisarDesempenho(filtro({ inicio: '2026-10-05', fim: '2026-10-05' })), /pelo menos 7 dias/);
  });

  it('recusa datas invertidas, inválidas e período acima de 366 dias', () => {
    falhaCom(() => analisarDesempenho(filtro({ inicio: '2026-10-11', fim: '2026-10-05' })), /não pode ser depois/);
    falhaCom(() => analisarDesempenho(filtro({ inicio: '2026-02-30', fim: '2026-10-05' })), /Informe/);
    falhaCom(() => analisarDesempenho(filtro({ inicio: '2026-01-01', fim: '2027-01-02' })), /no máximo 366/);
  });

  it('recusa ids inválidos ou inexistentes', () => {
    falhaCom(() => analisarDesempenho(filtro({ operadorId: 0 })), /Operador inválido/);
    falhaCom(() => analisarDesempenho(filtro({ produtoId: 1.5 })), /Produto inválido/);
    falhaCom(() => analisarDesempenho(filtro({ operadorId: 9999 })), /Operador não encontrado/);
    falhaCom(() => analisarDesempenho(filtro({ produtoId: 9999 })), /Produto não encontrado/);
    falhaCom(() => analisarDesempenho(filtro({ etapaId: 9999 })), /Etapa não encontrada/);
  });

  it('recusa variação inexistente, mal formada ou de outra etapa', () => {
    falhaCom(() => analisarDesempenho(filtro({ variacao: 9999 })), /Variação não encontrada/);
    falhaCom(() => analisarDesempenho(filtro({ variacao: 'abc' as never })), /Variação inválid/);
    falhaCom(() => analisarDesempenho(filtro({ etapaId: montagem.id, variacao: cabos })), /não pertence à etapa Montagem/);
  });
});
