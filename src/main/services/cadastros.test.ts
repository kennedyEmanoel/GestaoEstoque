import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/db', async () => (await import('../testing/bancoDeTeste')).criarBancoDeTeste());

import { sqlite } from '../models/db';
import { ErroNegocio } from '../erros';
import * as operadores from './operadorService';
import * as produtos from './produtoService';
import * as etapas from './etapaService';
import * as variacoes from './variacaoService';
import * as producao from './producaoService';

function limpar() {
  sqlite.exec(`
    DELETE FROM producao_ficha_diaria;
    DELETE FROM operadores;
    DELETE FROM produtos;
    DELETE FROM etapa_variacoes WHERE id > 5;
    DELETE FROM etapas WHERE id > 4;
    UPDATE etapas SET ativo = 1; UPDATE etapa_variacoes SET ativo = 1;
  `);
}

beforeEach(limpar);

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

describe('operadores', () => {
  it('normaliza o nome (espaços e maiúsculas) e devolve o cadastro completo', () => {
    const op = operadores.criar({ nome: '  maria   da silva ' });
    expect(op).toMatchObject({ nome: 'MARIA DA SILVA', ativo: true });
    expect(op.id).toBeGreaterThan(0);
    expect(op.criadoEm).toBeGreaterThan(0);
  });

  it('exige nome e limita o tamanho', () => {
    falhaCom(() => operadores.criar({ nome: '   ' }), /Nome é obrigatório/);
    falhaCom(() => operadores.criar({ nome: 'A'.repeat(61) }), /no máximo 60/);
    falhaCom(() => operadores.criar({ nome: 123 as any }), /Nome é obrigatório/);
  });

  it('recusa duplicidade ignorando acento e maiúsculas, e avisa quando o existente está inativo', () => {
    const joao = operadores.criar({ nome: 'João' });
    falhaCom(() => operadores.criar({ nome: 'JOAO' }), /Já existe um operador chamado "JOÃO"\./);
    operadores.definirAtivo(joao.id, false);
    falhaCom(() => operadores.criar({ nome: 'joão' }), /inativo — basta reativá-lo/);
  });

  it('atualiza o nome, aceitando o próprio nome mas não o de outro operador', () => {
    const ana = operadores.criar({ nome: 'ANA' });
    operadores.criar({ nome: 'BIA' });
    expect(operadores.atualizar(ana.id, { nome: 'Ana' }).nome).toBe('ANA');
    expect(operadores.atualizar(ana.id, { nome: 'ana maria' }).nome).toBe('ANA MARIA');
    falhaCom(() => operadores.atualizar(ana.id, { nome: 'bia' }), /Já existe/);
    falhaCom(() => operadores.atualizar(9999, { nome: 'X' }), /não encontrado/);
  });

  it('lista só os ativos por padrão, em ordem alfabética', () => {
    operadores.criar({ nome: 'Zélia' });
    const b = operadores.criar({ nome: 'Beto' });
    operadores.criar({ nome: 'Ágata' });
    operadores.definirAtivo(b.id, false);

    expect(operadores.listar().map((o) => o.nome)).toEqual(['ÁGATA', 'ZÉLIA']);
    expect(operadores.listar({ incluirInativos: true }).map((o) => o.nome)).toEqual(['ÁGATA', 'BETO', 'ZÉLIA']);
  });

  it('mostra o impacto e exclui o operador junto com as escalas e registros dele (o cartão continua)', () => {
    const livre = operadores.criar({ nome: 'LIVRE' });
    const usado = operadores.criar({ nome: 'USADO' });
    const outro = operadores.criar({ nome: 'OUTRO' });
    const prod = produtos.criar({ nome: 'P' });
    const f1 = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: prod.id, etapaId: 1, metaHoraPadrao: 40 });
    const f2 = producao.getOrCreateFicha({ data: '2026-10-02', produtoId: prod.id, etapaId: 1, metaHoraPadrao: 40 });
    const e1 = producao.addOperador({ fichaId: f1.id, operadorId: usado.id });
    const e2 = producao.addOperador({ fichaId: f2.id, operadorId: usado.id });
    const e3 = producao.addOperador({ fichaId: f1.id, operadorId: outro.id });
    for (const e of [e1, e2, e3]) producao.upsertRegistro({ operadorDiarioId: e.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });

    expect(operadores.impacto(livre.id)).toEqual({ cartoes: 0, operadores: 0, registros: 0, variacoes: 0 });
    expect(operadores.impacto(usado.id)).toEqual({ cartoes: 0, operadores: 2, registros: 2, variacoes: 0 });

    operadores.remover(livre.id);
    operadores.remover(usado.id);

    expect(operadores.listar({ incluirInativos: true }).map((o) => o.nome)).toEqual(['OUTRO']);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM producao_ficha_diaria').get()).toEqual({ n: 2 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM producao_operador_diario').get()).toEqual({ n: 1 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM producao_registro_horario').get()).toEqual({ n: 1 });
    falhaCom(() => operadores.remover(usado.id), /não encontrado/);
  });
});

describe('produtos', () => {
  it('guarda nome, descrição e versão (vazia por padrão)', () => {
    const p = produtos.criar({ nome: ' 4G SIMCOM ', descricao: ' Modem 4G ' });
    expect(p).toMatchObject({ nome: '4G SIMCOM', descricao: 'Modem 4G', versao: '', ativo: true });
    expect(produtos.criar({ nome: 'GPS', descricao: '  ' }).descricao).toBeNull();
  });

  it('permite o mesmo nome em versões diferentes, mas não repetir nome + versão', () => {
    produtos.criar({ nome: 'Rastreador', versao: 'v1' });
    produtos.criar({ nome: 'Rastreador', versao: 'v2' });
    falhaCom(() => produtos.criar({ nome: 'RASTREADOR', versao: ' V1 ' }), /Já existe o produto "Rastreador v1"/);
    expect(produtos.criar({ nome: 'Rastreador' }).versao).toBe('');
    falhaCom(() => produtos.criar({ nome: 'rastreador' }), /Já existe o produto "Rastreador"/);
  });

  it('valida tamanhos', () => {
    falhaCom(() => produtos.criar({ nome: '' }), /Nome é obrigatório/);
    falhaCom(() => produtos.criar({ nome: 'X', versao: 'v'.repeat(21) }), /Versão deve ter no máximo 20/);
    falhaCom(() => produtos.criar({ nome: 'X', descricao: 'd'.repeat(301) }), /Descrição deve ter no máximo 300/);
  });

  it('atualiza, desativa/reativa e lista na ordem alfabética com a versão', () => {
    const a = produtos.criar({ nome: 'Beta', versao: '2' });
    produtos.criar({ nome: 'Beta', versao: '1' });
    const c = produtos.criar({ nome: 'Alfa' });

    expect(produtos.atualizar(c.id, { nome: 'Alfa', descricao: 'nova', versao: '' }).descricao).toBe('nova');
    expect(produtos.listar().map((p) => `${p.nome} ${p.versao}`.trim())).toEqual(['Alfa', 'Beta 1', 'Beta 2']);

    produtos.definirAtivo(a.id, false);
    expect(produtos.listar().length).toBe(2);
    expect(produtos.definirAtivo(a.id, true).ativo).toBe(true);
  });

  it('exclui o produto levando junto os cartões, escalas e registros dele', () => {
    const p = produtos.criar({ nome: 'Usado' });
    const outro = produtos.criar({ nome: 'Outro' });
    const op = operadores.criar({ nome: 'ANA' });
    const f = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: p.id, etapaId: 1, metaHoraPadrao: 40 });
    producao.getOrCreateFicha({ data: '2026-10-02', produtoId: p.id, etapaId: 2, metaHoraPadrao: 40 });
    const g = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: outro.id, etapaId: 1, metaHoraPadrao: 40 });
    const esc = producao.addOperador({ fichaId: f.id, operadorId: op.id });
    producao.upsertRegistro({ operadorDiarioId: esc.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });

    expect(produtos.impacto(p.id)).toEqual({ cartoes: 2, operadores: 1, registros: 1, variacoes: 0 });
    produtos.remover(p.id);

    expect(produtos.listar({ incluirInativos: true }).map((x) => x.nome)).toEqual(['Outro']);
    expect(sqlite.prepare('SELECT id FROM producao_ficha_diaria').all()).toEqual([{ id: g.id }]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM producao_registro_horario').get()).toEqual({ n: 0 });
    expect(operadores.listar().map((o) => o.nome)).toEqual(['ANA']);
  });
});

describe('etapas e variações', () => {
  it('vêm com as etapas e variações padrão do processo, na ordem', () => {
    const lista = etapas.listar();
    expect(lista.map((e) => e.nome)).toEqual(['Montagem', 'Soldagem', 'Revisão', 'Gravação']);
    expect(lista.find((e) => e.nome === 'Soldagem')!.variacoes.map((v) => v.nome)).toEqual(['Cabos', 'Retrabalho']);
    expect(lista.find((e) => e.nome === 'Gravação')!.variacoes.map((v) => v.nome)).toEqual(['Firmware', 'IMEI', 'Serial']);
    expect(lista.find((e) => e.nome === 'Montagem')!.variacoes).toEqual([]);
  });

  it('cria, edita e valida etapas (nome único sem diferenciar acento)', () => {
    const nova = etapas.criar({ nome: 'Embalagem', descricao: 'Última etapa' });
    expect(nova).toMatchObject({ nome: 'Embalagem', descricao: 'Última etapa', ativo: true, variacoes: [] });
    falhaCom(() => etapas.criar({ nome: 'REVISAO' }), /Já existe uma etapa chamada "Revisão"/);
    falhaCom(() => etapas.criar({ nome: '' }), /Nome é obrigatório/);
    expect(etapas.atualizar(nova.id, { nome: 'Embalagem final', descricao: null }).descricao).toBeNull();
  });

  it('cria variações por etapa; o mesmo nome pode existir em etapas diferentes', () => {
    const soldagem = etapas.listar().find((e) => e.nome === 'Soldagem')!;
    const montagem = etapas.listar().find((e) => e.nome === 'Montagem')!;

    const v = variacoes.criar({ etapaId: soldagem.id, nome: 'Reflow' });
    expect(v).toMatchObject({ etapaId: soldagem.id, nome: 'Reflow', ativo: true });
    falhaCom(() => variacoes.criar({ etapaId: soldagem.id, nome: 'reflow' }), /já tem a variação "Reflow"/);
    expect(variacoes.criar({ etapaId: montagem.id, nome: 'Reflow' }).etapaId).toBe(montagem.id);
    falhaCom(() => variacoes.criar({ etapaId: 9999, nome: 'X' }), /Etapa não encontrada/);

    expect(variacoes.atualizar(v.id, { nome: 'Reflow forno' }).nome).toBe('Reflow forno');
  });

  it('esconde inativas por padrão: etapa inativa some, variação inativa some da etapa', () => {
    const grav = etapas.listar().find((e) => e.nome === 'Gravação')!;
    const serial = grav.variacoes.find((v) => v.nome === 'Serial')!;

    variacoes.definirAtivo(serial.id, false);
    expect(etapas.listar().find((e) => e.nome === 'Gravação')!.variacoes.map((v) => v.nome)).toEqual(['Firmware', 'IMEI']);
    expect(etapas.listar({ incluirInativos: true }).find((e) => e.nome === 'Gravação')!.variacoes.length).toBe(3);

    etapas.definirAtivo(grav.id, false);
    expect(etapas.listar().map((e) => e.nome)).toEqual(['Montagem', 'Soldagem', 'Revisão']);
    expect(etapas.listar({ incluirInativos: true }).length).toBe(4);
  });

  it('exclui a etapa levando junto as variações e os cartões dela', () => {
    const prod = produtos.criar({ nome: 'P' });
    const op = operadores.criar({ nome: 'ANA' });
    const lista = etapas.listar();
    const soldagem = lista.find((e) => e.nome === 'Soldagem')!;
    const montagem = lista.find((e) => e.nome === 'Montagem')!;
    const cabos = soldagem.variacoes.find((v) => v.nome === 'Cabos')!;
    const fSold = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: prod.id, etapaId: soldagem.id, variacaoId: cabos.id, metaHoraPadrao: 40 });
    const fMont = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: prod.id, etapaId: montagem.id, metaHoraPadrao: 40 });
    const esc = producao.addOperador({ fichaId: fSold.id, operadorId: op.id });
    producao.upsertRegistro({ operadorDiarioId: esc.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });

    expect(etapas.impacto(soldagem.id)).toEqual({ cartoes: 1, operadores: 1, registros: 1, variacoes: 2 });
    etapas.remover(soldagem.id);

    expect(etapas.listar({ incluirInativos: true }).map((e) => e.nome)).toEqual(['Montagem', 'Revisão', 'Gravação']);
    expect(variacoes.listar({ incluirInativos: true }).map((v) => v.nome)).toEqual(['Firmware', 'IMEI', 'Serial']);
    expect(sqlite.prepare('SELECT id FROM producao_ficha_diaria').all()).toEqual([{ id: fMont.id }]);
  });

  it('exclui a variação levando junto os cartões que a usam, e só eles', () => {
    const prod = produtos.criar({ nome: 'P' });
    const grav = etapas.listar().find((e) => e.nome === 'Gravação')!;
    const imei = grav.variacoes.find((v) => v.nome === 'IMEI')!;
    const firmware = grav.variacoes.find((v) => v.nome === 'Firmware')!;
    producao.getOrCreateFicha({ data: '2026-10-01', produtoId: prod.id, etapaId: grav.id, variacaoId: imei.id, metaHoraPadrao: 40 });
    const fFirm = producao.getOrCreateFicha({ data: '2026-10-01', produtoId: prod.id, etapaId: grav.id, variacaoId: firmware.id, metaHoraPadrao: 40 });

    expect(variacoes.impacto(imei.id)).toEqual({ cartoes: 1, operadores: 0, registros: 0, variacoes: 0 });
    variacoes.remover(imei.id);

    expect(etapas.listar().find((e) => e.nome === 'Gravação')!.variacoes.map((v) => v.nome)).toEqual(['Firmware', 'Serial']);
    expect(sqlite.prepare('SELECT id FROM producao_ficha_diaria').all()).toEqual([{ id: fFirm.id }]);
  });
});
