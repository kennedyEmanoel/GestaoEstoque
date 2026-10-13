import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/db', async () => (await import('../testing/bancoDeTeste')).criarBancoDeTeste());

import { sqlite } from '../models/db';
import { ErroNegocio } from '../erros';
import * as operadores from './operadorService';
import * as produtos from './produtoService';
import * as etapas from './etapaService';
import * as variacoes from './variacaoService';
import * as producao from './producaoService';
import { getDashboardPorEtapas } from './producaoDashboardService';

const DIA = '2026-10-05';

let produto: ReturnType<typeof produtos.criar>;
let outroProduto: ReturnType<typeof produtos.criar>;
let joao: ReturnType<typeof operadores.criar>;
let maria: ReturnType<typeof operadores.criar>;
let montagem: ReturnType<typeof etapas.listar>[number];
let soldagem: ReturnType<typeof etapas.listar>[number];
let gravacao: ReturnType<typeof etapas.listar>[number];

beforeEach(() => {
  sqlite.exec(`
    DELETE FROM producao_ficha_diaria;
    DELETE FROM operadores;
    DELETE FROM produtos;
    UPDATE etapas SET ativo = 1; UPDATE etapa_variacoes SET ativo = 1;
  `);
  produto = produtos.criar({ nome: '4G SIMCOM' });
  outroProduto = produtos.criar({ nome: 'GPS 2G', versao: 'v2' });
  joao = operadores.criar({ nome: 'João' });
  maria = operadores.criar({ nome: 'Maria' });
  const lista = etapas.listar();
  montagem = lista.find((e) => e.nome === 'Montagem')!;
  soldagem = lista.find((e) => e.nome === 'Soldagem')!;
  gravacao = lista.find((e) => e.nome === 'Gravação')!;
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

const abrir = (extra: Partial<Parameters<typeof producao.getOrCreateFicha>[0]> = {}) =>
  producao.getOrCreateFicha({ data: DIA, produtoId: produto.id, etapaId: montagem.id, metaHoraPadrao: 40, ...extra });

describe('fichas (cartões do dia)', () => {
  it('cria a ficha com os nomes resolvidos e sem operadores', () => {
    const f = abrir();
    expect(f).toMatchObject({
      data: DIA, produto: '4G SIMCOM', produtoVersao: '', etapa: 'Montagem', variacao: null,
      variacaoId: null, metaHoraPadrao: 40, operadores: [],
    });
  });

  it('é idempotente: a mesma data/produto/etapa/variação devolve a mesma ficha', () => {
    const a = abrir();
    const b = abrir({ metaHoraPadrao: 99 });
    expect(b.id).toBe(a.id);
    expect(b.metaHoraPadrao).toBe(40);
  });

  it('trata variações diferentes (e "sem variação") como fichas diferentes', () => {
    const cabos = soldagem.variacoes.find((v) => v.nome === 'Cabos')!;
    const retrab = soldagem.variacoes.find((v) => v.nome === 'Retrabalho')!;
    const base = { etapaId: soldagem.id };

    const semVar = abrir(base);
    const comCabos = abrir({ ...base, variacaoId: cabos.id });
    const comRetrab = abrir({ ...base, variacaoId: retrab.id });
    expect(new Set([semVar.id, comCabos.id, comRetrab.id]).size).toBe(3);
    expect(comRetrab.variacao).toBe('Retrabalho');
    expect(abrir({ ...base, variacaoId: cabos.id }).id).toBe(comCabos.id);
    expect(abrir(base).id).toBe(semVar.id);
  });

  it('consulta sem criar: devolve null quando não existe', () => {
    const chave = { data: DIA, produtoId: produto.id, etapaId: montagem.id };
    expect(producao.getFichaCompleta(chave)).toBeNull();
    const f = abrir();
    expect(producao.getFichaCompleta(chave)!.id).toBe(f.id);
    expect(producao.getFichaCompleta({ ...chave, produtoId: outroProduto.id })).toBeNull();
  });

  it('valida data, ids e meta', () => {
    falhaCom(() => abrir({ data: '05/10/2026' }), /Data inválida/);
    falhaCom(() => abrir({ produtoId: 0 }), /Produto inválido/);
    falhaCom(() => abrir({ produtoId: 9999 }), /Produto não encontrado/);
    falhaCom(() => abrir({ etapaId: 9999 }), /Etapa não encontrada/);
    falhaCom(() => abrir({ metaHoraPadrao: -1 }), /Meta por hora/);
  });

  it('só aceita variação que pertença à etapa e esteja ativa', () => {
    const firmware = gravacao.variacoes.find((v) => v.nome === 'Firmware')!;
    falhaCom(() => abrir({ etapaId: soldagem.id, variacaoId: firmware.id }), /não pertence à etapa Soldagem/);
    falhaCom(() => abrir({ etapaId: gravacao.id, variacaoId: 9999 }), /Variação não encontrada/);

    variacoes.definirAtivo(firmware.id, false);
    falhaCom(() => abrir({ etapaId: gravacao.id, variacaoId: firmware.id }), /está inativa/);
  });

  it('não cria ficha nova com produto ou etapa inativos, mas continua abrindo a que já existe', () => {
    const existente = abrir();
    produtos.definirAtivo(produto.id, false);
    etapas.definirAtivo(montagem.id, false);

    expect(abrir().id).toBe(existente.id);
    falhaCom(() => abrir({ data: '2026-10-06' }), /produto 4G SIMCOM está inativo/);
    produtos.definirAtivo(produto.id, true);
    falhaCom(() => abrir({ data: '2026-10-06' }), /etapa Montagem está inativa/);
  });

  it('atualiza a meta padrão', () => {
    const f = abrir();
    producao.updateMetaHoraPadrao(f.id, 55);
    expect(producao.getFichaCompleta({ data: DIA, produtoId: produto.id, etapaId: montagem.id })!.metaHoraPadrao).toBe(55);
    falhaCom(() => producao.updateMetaHoraPadrao(9999, 10), /Ficha 9999 não encontrada/);
    falhaCom(() => producao.updateMetaHoraPadrao(f.id, 1.5), /número inteiro/);
  });
});

describe('escala de operadores e registros hora a hora', () => {
  it('escala operadores em ordem e não repete o mesmo operador', () => {
    const f = abrir();
    const a = producao.addOperador({ fichaId: f.id, operadorId: joao.id });
    const b = producao.addOperador({ fichaId: f.id, operadorId: maria.id });
    const repetido = producao.addOperador({ fichaId: f.id, operadorId: joao.id });

    expect(a).toMatchObject({ operadorNome: 'JOÃO', ordem: 0 });
    expect(b).toMatchObject({ operadorNome: 'MARIA', ordem: 1 });
    expect(repetido.id).toBe(a.id);
    const completa = producao.getFichaCompleta({ data: DIA, produtoId: produto.id, etapaId: montagem.id })!;
    expect(completa.operadores.map((o) => o.operadorNome)).toEqual(['JOÃO', 'MARIA']);
  });

  it('recusa operador inexistente, inativo ou ficha inexistente', () => {
    const f = abrir();
    falhaCom(() => producao.addOperador({ fichaId: f.id, operadorId: 9999 }), /Operador não encontrado/);
    falhaCom(() => producao.addOperador({ fichaId: 9999, operadorId: joao.id }), /Ficha 9999 não encontrada/);
    operadores.definirAtivo(maria.id, false);
    falhaCom(() => producao.addOperador({ fichaId: f.id, operadorId: maria.id }), /operador MARIA está inativo/);
  });

  it('grava e atualiza (upsert) o registro de uma hora', () => {
    const f = abrir();
    const op = producao.addOperador({ fichaId: f.id, operadorId: joao.id });
    const bloco = '07:12 - 08:00';

    const r1 = producao.upsertRegistro({ operadorDiarioId: op.id, horarioBloco: bloco, meta: 40, realizado: 35 });
    const r2 = producao.upsertRegistro({ operadorDiarioId: op.id, horarioBloco: bloco, meta: 40, realizado: 42 });
    expect(r2.id).toBe(r1.id);
    expect(r2).toMatchObject({ meta: 40, realizado: 42 });

    const completa = producao.getFichaCompleta({ data: DIA, produtoId: produto.id, etapaId: montagem.id })!;
    expect(completa.operadores[0].registros).toEqual([r2]);
  });

  it('valida o registro', () => {
    const f = abrir();
    const op = producao.addOperador({ fichaId: f.id, operadorId: joao.id });
    const base = { operadorDiarioId: op.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 0 };
    falhaCom(() => producao.upsertRegistro({ ...base, meta: 0 }), /Meta deve ser maior que zero/);
    falhaCom(() => producao.upsertRegistro({ ...base, realizado: -1 }), /Realizado/);
    falhaCom(() => producao.upsertRegistro({ ...base, horarioBloco: '' }), /Horário é obrigatório/);
    falhaCom(() => producao.upsertRegistro({ ...base, operadorDiarioId: 9999 }), /Operador não encontrado nesta ficha/);
  });

  it('remover o operador da ficha apaga os registros dele, e só os dele', () => {
    const f = abrir();
    const a = producao.addOperador({ fichaId: f.id, operadorId: joao.id });
    const b = producao.addOperador({ fichaId: f.id, operadorId: maria.id });
    producao.upsertRegistro({ operadorDiarioId: a.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });
    producao.upsertRegistro({ operadorDiarioId: b.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 20 });

    producao.removeOperador({ operadorDiarioId: a.id });

    const completa = producao.getFichaCompleta({ data: DIA, produtoId: produto.id, etapaId: montagem.id })!;
    expect(completa.operadores.map((o) => o.operadorNome)).toEqual(['MARIA']);
    expect(completa.operadores[0].registros.length).toBe(1);
    expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM producao_registro_horario`).get()).toEqual({ n: 1 });
  });
});

describe('excluir cartão', () => {
  it('mostra o impacto e apaga o cartão com a escala e os registros, sem tocar nos outros', () => {
    const a = abrir();
    const b = abrir({ etapaId: soldagem.id });
    const opA = producao.addOperador({ fichaId: a.id, operadorId: joao.id });
    const opB = producao.addOperador({ fichaId: b.id, operadorId: joao.id });
    producao.addOperador({ fichaId: a.id, operadorId: maria.id });
    for (const h of ['07:12 - 08:00', '08:00 - 09:00']) producao.upsertRegistro({ operadorDiarioId: opA.id, horarioBloco: h, meta: 40, realizado: 30 });
    producao.upsertRegistro({ operadorDiarioId: opB.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });

    expect(producao.impactoDoCartao(a.id)).toEqual({ cartoes: 1, operadores: 2, registros: 2, variacoes: 0 });
    producao.removerCartao(a.id);

    expect(producao.listarCartoesDoDia(DIA).map((c) => c.fichaId)).toEqual([b.id]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM producao_registro_horario').get()).toEqual({ n: 1 });
    expect(operadores.listar().length).toBe(2);
    falhaCom(() => producao.removerCartao(a.id), /Ficha .* não encontrada/);
  });
});

describe('o que já existe (cartões do dia e dias com registro)', () => {
  it('lista os cartões do dia com operadores e totais, e abre um deles pelo id', () => {
    const m = abrir();
    const op = producao.addOperador({ fichaId: m.id, operadorId: joao.id });
    producao.upsertRegistro({ operadorDiarioId: op.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });
    const imei = gravacao.variacoes.find((v) => v.nome === 'IMEI')!;
    abrir({ etapaId: gravacao.id, variacaoId: imei.id, produtoId: outroProduto.id });

    const cartoes = producao.listarCartoesDoDia(DIA);
    expect(cartoes.map((c) => [c.rotulo, c.produto, c.operadores, c.totalRealizado, c.totalMeta])).toEqual([
      ['Montagem', '4G SIMCOM', 1, 30, 40],
      ['Gravação · IMEI', 'GPS 2G v2', 0, 0, 0],
    ]);
    expect(cartoes[0].pctAtingimento).toBe(75);
    expect(cartoes[1].pctAtingimento).toBeNull();
    expect(producao.listarCartoesDoDia('2026-01-01')).toEqual([]);

    expect(producao.getFichaPorId(cartoes[0].fichaId).operadores[0].registros).toHaveLength(1);
    falhaCom(() => producao.getFichaPorId(9999), /Ficha 9999 não encontrada/);
  });

  it('lista os dias mais recentes que têm cartões, com os totais', () => {
    const f1 = abrir({ data: '2026-10-01' });
    const op = producao.addOperador({ fichaId: f1.id, operadorId: joao.id });
    producao.upsertRegistro({ operadorDiarioId: op.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 36 });
    abrir({ data: '2026-10-03' });
    abrir({ data: '2026-10-03', etapaId: soldagem.id });

    expect(producao.listarDiasComRegistro()).toEqual([
      { data: '2026-10-03', cartoes: 2, totalRealizado: 0, totalMeta: 0 },
      { data: '2026-10-01', cartoes: 1, totalRealizado: 36, totalMeta: 40 },
    ]);
    expect(producao.listarDiasComRegistro(1).map((d) => d.data)).toEqual(['2026-10-03']);
    falhaCom(() => producao.listarDiasComRegistro(0), /Limite de dias inválido/);
  });
});

describe('dashboard por etapas', () => {
  function preencher() {
    const m = abrir();
    const mj = producao.addOperador({ fichaId: m.id, operadorId: joao.id });
    const mm = producao.addOperador({ fichaId: m.id, operadorId: maria.id });
    producao.upsertRegistro({ operadorDiarioId: mj.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 38 });
    producao.upsertRegistro({ operadorDiarioId: mj.id, horarioBloco: '08:00 - 09:00', meta: 40, realizado: 41 });
    producao.upsertRegistro({ operadorDiarioId: mm.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 20 });

    const imei = gravacao.variacoes.find((v) => v.nome === 'IMEI')!;
    const g = abrir({ etapaId: gravacao.id, variacaoId: imei.id, metaHoraPadrao: 30 });
    const gm = producao.addOperador({ fichaId: g.id, operadorId: maria.id });
    producao.upsertRegistro({ operadorDiarioId: gm.id, horarioBloco: '07:12 - 08:00', meta: 30, realizado: 29 });

    const s = abrir({ produtoId: outroProduto.id, etapaId: soldagem.id, metaHoraPadrao: 50 });
    const sj = producao.addOperador({ fichaId: s.id, operadorId: joao.id });
    producao.upsertRegistro({ operadorDiarioId: sj.id, horarioBloco: '07:12 - 08:00', meta: 50, realizado: 55 });
  }

  it('soma o dia todo por ficha, operador e hora, na ordem do processo', () => {
    preencher();
    const d = getDashboardPorEtapas(DIA);

    expect(d.produto).toBe('Todos');
    expect(d.totalGeral).toEqual({ realizado: 38 + 41 + 20 + 29 + 55, meta: 40 + 40 + 40 + 30 + 50 });
    expect(d.etapas.map((e) => e.rotulo)).toEqual(['Montagem', 'Soldagem', 'Gravação · IMEI']);
    expect(d.etapas.map((e) => e.produto)).toEqual(['4G SIMCOM', 'GPS 2G v2', '4G SIMCOM']);

    const montagemResumo = d.etapas[0];
    expect(montagemResumo).toMatchObject({ totalRealizado: 99, totalMeta: 120, saldo: -21, etapa: 'Montagem', variacao: null });
    expect(montagemResumo.pctAtingimento).toBeCloseTo(82.5);
    expect(montagemResumo.porOperador).toEqual([
      { operadorNome: 'JOÃO', totalRealizado: 79, totalMeta: 80 },
      { operadorNome: 'MARIA', totalRealizado: 20, totalMeta: 40 },
    ]);
    expect(montagemResumo.porHora).toEqual([
      { horarioBloco: '07:12 - 08:00', realizado: 58, meta: 80 },
      { horarioBloco: '08:00 - 09:00', realizado: 41, meta: 40 },
    ]);
  });

  it('com uma faixa de horário, os totais por operador consideram só aquela hora (e operador sem registro aparece zerado)', () => {
    preencher();
    const d = getDashboardPorEtapas(DIA, null, '08:00 - 09:00');
    const m = d.etapas[0];
    expect(m.porOperador).toEqual([
      { operadorNome: 'JOÃO', totalRealizado: 41, totalMeta: 40 },
      { operadorNome: 'MARIA', totalRealizado: 0, totalMeta: 0 },
    ]);
    expect(m.porHora.length).toBe(2);
    expect(d.etapas.find((e) => e.rotulo === 'Soldagem')).toMatchObject({ totalRealizado: 0, totalMeta: 0, pctAtingimento: null });
  });

  it('filtra por produto', () => {
    preencher();
    const d = getDashboardPorEtapas(DIA, outroProduto.id);
    expect(d.produto).toBe('GPS 2G v2');
    expect(d.etapas.map((e) => e.rotulo)).toEqual(['Soldagem']);
    expect(d.totalGeral).toEqual({ realizado: 55, meta: 50 });
    falhaCom(() => getDashboardPorEtapas(DIA, 9999), /Produto não encontrado/);
  });

  it('dia sem fichas devolve lista vazia e totais zerados', () => {
    expect(getDashboardPorEtapas('2026-01-01')).toMatchObject({ etapas: [], totalGeral: { realizado: 0, meta: 0 } });
  });
});
