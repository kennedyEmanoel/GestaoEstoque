import type { Server } from 'node:http';
import vm from 'node:vm';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/db', async () => (await import('../testing/bancoDeTeste')).criarBancoDeTeste());

import { sqlite } from '../models/db';
import * as operadores from '../services/operadorService';
import * as produtos from '../services/produtoService';
import { criarApp } from './internalServer';

let servidor: Server;
let base: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    servidor = criarApp().listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => servidor.close(() => resolve())));

beforeEach(() => {
  sqlite.exec(`
    DELETE FROM producao_ficha_diaria;
    DELETE FROM operadores;
    DELETE FROM produtos;
  `);
});

async function chamar(metodo: string, caminho: string, corpo?: unknown) {
  const res = await fetch(base + caminho, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: res.status, json: await res.json() as any };
}

describe('API para o gestor', () => {
  it('lista os cadastros ativos para os seletores (operadores, produtos, etapas com variações)', async () => {
    operadores.criar({ nome: 'Ana' });
    const inativo = operadores.criar({ nome: 'Beto' });
    operadores.definirAtivo(inativo.id, false);
    produtos.criar({ nome: '4G SIMCOM', versao: 'v2' });

    const { status, json } = await chamar('GET', '/api/cadastros');
    expect(status).toBe(200);
    expect(json.data.operadores.map((o: any) => o.nome)).toEqual(['ANA']);
    expect(json.data.produtos.map((p: any) => p.nome)).toEqual(['4G SIMCOM']);
    expect(json.data.etapas.map((e: any) => e.nome)).toEqual(['Montagem', 'Soldagem', 'Revisão', 'Gravação']);
    expect(json.data.etapas[3].variacoes.map((v: any) => v.nome)).toEqual(['Firmware', 'IMEI', 'Serial']);
  });

  it('abre a ficha, escala operador, grava registro e consulta tudo de volta', async () => {
    const ana = operadores.criar({ nome: 'Ana' });
    const prod = produtos.criar({ nome: 'GPS' });
    const { json: cad } = await chamar('GET', '/api/cadastros');
    const soldagem = cad.data.etapas.find((e: any) => e.nome === 'Soldagem');
    const retrabalho = soldagem.variacoes.find((v: any) => v.nome === 'Retrabalho');

    const criada = await chamar('POST', '/api/producao/ficha', {
      data: '2026-10-05', produtoId: prod.id, etapaId: soldagem.id, variacaoId: retrabalho.id, metaHoraPadrao: 40,
    });
    expect(criada.status).toBe(200);
    expect(criada.json.data).toMatchObject({ etapa: 'Soldagem', variacao: 'Retrabalho', produto: 'GPS' });

    const escala = await chamar('POST', '/api/producao/operador', { fichaId: criada.json.data.id, operadorId: ana.id });
    expect(escala.json.data).toMatchObject({ operadorNome: 'ANA', ordem: 0 });

    const reg = await chamar('POST', '/api/producao/registro', {
      operadorDiarioId: escala.json.data.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 37,
    });
    expect(reg.json.data).toMatchObject({ meta: 40, realizado: 37 });

    const consulta = await chamar(
      'GET',
      `/api/producao/ficha?data=2026-10-05&produtoId=${prod.id}&etapaId=${soldagem.id}&variacaoId=${retrabalho.id}`,
    );
    expect(consulta.json.data.operadores[0].registros).toHaveLength(1);

    const semVariacao = await chamar('GET', `/api/producao/ficha?data=2026-10-05&produtoId=${prod.id}&etapaId=${soldagem.id}`);
    expect(semVariacao.json).toEqual({ success: true, data: null });

    expect((await chamar('PATCH', `/api/producao/ficha/${criada.json.data.id}/meta`, { meta: 55 })).json.success).toBe(true);
    expect((await chamar('DELETE', `/api/producao/operador/${escala.json.data.id}`)).json.success).toBe(true);
  });

  it('mostra o que já existe: dias com cartões, cartões de um dia e abertura por id', async () => {
    const ana = operadores.criar({ nome: 'Ana' });
    const prod = produtos.criar({ nome: 'GPS' });
    const { json: ficha } = await chamar('POST', '/api/producao/ficha', { data: '2026-10-05', produtoId: prod.id, etapaId: 2, variacaoId: 2, metaHoraPadrao: 40 });
    const { json: escala } = await chamar('POST', '/api/producao/operador', { fichaId: ficha.data.id, operadorId: ana.id });
    await chamar('POST', '/api/producao/registro', { operadorDiarioId: escala.data.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 20 });

    const dias = await chamar('GET', '/api/producao/dias');
    expect(dias.json.data).toEqual([{ data: '2026-10-05', cartoes: 1, totalRealizado: 20, totalMeta: 40 }]);

    const cartoes = await chamar('GET', '/api/producao/cartoes?data=2026-10-05');
    expect(cartoes.json.data[0]).toMatchObject({ rotulo: 'Soldagem · Retrabalho', produto: 'GPS', operadores: 1, pctAtingimento: 50 });

    const aberta = await chamar('GET', `/api/producao/ficha/${cartoes.json.data[0].fichaId}`);
    expect(aberta.json.data.operadores[0].registros).toHaveLength(1);
    expect((await chamar('GET', '/api/producao/ficha/9999')).status).toBe(400);
    expect((await chamar('DELETE', `/api/producao/ficha/${ficha.data.id}`)).json.success).toBe(true);
    expect((await chamar('GET', '/api/producao/cartoes?data=2026-10-05')).json.data).toEqual([]);
    expect((await chamar('DELETE', `/api/producao/ficha/${ficha.data.id}`)).status).toBe(400);
    expect((await chamar('GET', '/api/producao/cartoes')).json.error).toMatch(/Data inválida/);
  });

  it('devolve 400 com a mensagem de negócio quando algo é inválido', async () => {
    const r = await chamar('POST', '/api/producao/ficha', { data: '2026-10-05', produtoId: 999, etapaId: 1, metaHoraPadrao: 40 });
    expect(r.status).toBe(400);
    expect(r.json).toEqual({ success: false, error: 'Produto não encontrado.' });

    const sem = await chamar('GET', '/api/producao/ficha?data=2026-10-05');
    expect(sem.status).toBe(400);
    expect(sem.json.error).toBe('Produto inválido.');
  });

  it('entrega o dashboard em JSON, filtrando por produto e faixa', async () => {
    const ana = operadores.criar({ nome: 'Ana' });
    const prod = produtos.criar({ nome: 'GPS' });
    const { json: ficha } = await chamar('POST', '/api/producao/ficha', { data: '2026-10-05', produtoId: prod.id, etapaId: 1, metaHoraPadrao: 40 });
    const { json: escala } = await chamar('POST', '/api/producao/operador', { fichaId: ficha.data.id, operadorId: ana.id });
    await chamar('POST', '/api/producao/registro', { operadorDiarioId: escala.data.id, horarioBloco: '07:12 - 08:00', meta: 40, realizado: 30 });

    const d = await chamar('GET', `/api/dashboard/producao?data=2026-10-05&produtoId=${prod.id}&faixa=${encodeURIComponent('07:12 - 08:00')}`);
    expect(d.json.data.totalGeral).toEqual({ realizado: 30, meta: 40 });
    expect(d.json.data.etapas[0]).toMatchObject({ rotulo: 'Montagem', produto: 'GPS' });
  });

  it('repassa o último comando do painel (TV) com carimbo de tempo', async () => {
    expect((await chamar('GET', '/api/dashboard/comando')).json.data).toBeNull();
    await chamar('POST', '/api/dashboard/comando', { type: 'refresh', data: '2026-10-05', produtoId: null, faixa: '07:12 - 08:00' });
    const { json } = await chamar('GET', '/api/dashboard/comando');
    expect(json.data).toMatchObject({ type: 'refresh', produtoId: null });
    expect(typeof json.data.ts).toBe('number');
  });
});

describe('páginas web', () => {
  it('o JavaScript embutido de cada página é válido (erro de sintaxe derrubaria a tela inteira)', async () => {
    for (const url of ['/', '/dashboard?data=2026-10-05']) {
      const html = await (await fetch(base + url)).text();
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      expect(scripts.length, url).toBeGreaterThan(0);
      for (const codigo of scripts) expect(() => new vm.Script(codigo), url).not.toThrow();
    }
  });

  it('a página de controle é servida', async () => {
    const html = await (await fetch(base + '/')).text();
    expect(html).toContain('<title>Controle de Produção</title>');
    expect(html).toContain('/api/cadastros');
  });

  it('a página do dashboard mostra os rótulos e não deixa texto de operador quebrar o <script>', async () => {
    const op = operadores.criar({ nome: '</script><b>x' });
    const prod = produtos.criar({ nome: 'GPS' });
    const { json: ficha } = await chamar('POST', '/api/producao/ficha', { data: '2026-10-05', produtoId: prod.id, etapaId: 4, variacaoId: 3, metaHoraPadrao: 40 });
    await chamar('POST', '/api/producao/operador', { fichaId: ficha.data.id, operadorId: op.id });

    const html = await (await fetch(`${base}/dashboard?data=2026-10-05&produtoId=${prod.id}`)).text();
    expect(html).toContain('Gravação · Firmware');
    expect(html).toContain(`<option value="${prod.id}" selected>GPS</option>`);
    expect(html).not.toContain('</SCRIPT><B>X');
    expect(html).toContain('\\u003c/SCRIPT>');
  });

  it('a página do dashboard explica quando os dados não carregam', async () => {
    const html = await (await fetch(`${base}/dashboard?data=2026-10-05&produtoId=9999`)).text();
    expect(html).toContain('Produto não encontrado.');
  });
});
