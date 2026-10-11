import express from 'express';
import cors from 'cors';
import { createServer } from 'node:net';
import os from 'node:os';
import * as producao from '../services/producaoService';
import { getDashboardPorEtapas } from '../services/producaoDashboardService';
import * as operadores from '../services/operadorService';
import * as produtos from '../services/produtoService';
import * as etapas from '../services/etapaService';
import { executar } from '../controllers/resposta';
import { pageControle } from './paginas/controle';
import { pageDashboard } from './paginas/dashboard';

function getLocalIPv4(): string | null {
  const interfaces = os.networkInterfaces();
  // Prefira redes locais reais (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  // e ignore VPNs como Radmin (26.x.x.x)
  const privateRanges = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];
  for (const [name, iface] of Object.entries(interfaces)) {
    if (!iface) continue;
    // Pula adaptadores de VPN pelo nome
    const lname = name.toLowerCase();
    if (lname.includes('vpn') || lname.includes('radmin') || lname.includes('virtual') || lname.includes('loopback')) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) {
        if (privateRanges.some((r) => r.test(entry.address))) return entry.address;
      }
    }
  }
  // Fallback: qualquer IPv4 não-interno não-VPN
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return null;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) port++;
  return port;
}

/** Parâmetro de query opcional → número (ou null quando ausente/vazio). */
function numeroOuNulo(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '' || valor === 'null') return null;
  return Number(valor);
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor !== '' ? valor : undefined;
}

/** Responde com o mesmo envelope ApiResponse do IPC (400 quando a operação falha). */
function responder<T>(res: express.Response, acao: () => T): void {
  const resposta = executar(acao);
  res.status(resposta.success ? 200 : 400).json(resposta);
}

export function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Status ───────────────────────────────────────────────────────────────────
  app.get('/api/status', (_req, res) => {
    res.json({ status: 'online', message: 'Servidor do Dashboard operante' });
  });

  // ── Cadastros (somente leitura: alimentam os seletores das páginas) ──────────
  app.get('/api/cadastros', (_req, res) => {
    responder(res, () => ({
      operadores: operadores.listar(),
      produtos:   produtos.listar(),
      etapas:     etapas.listar(),
    }));
  });

  // ── Ficha ────────────────────────────────────────────────────────────────────
  app.post('/api/producao/ficha', (req, res) => {
    responder(res, () => producao.getOrCreateFicha(req.body));
  });

  app.get('/api/producao/ficha', (req, res) => {
    const q = req.query;
    responder(res, () => producao.getFichaCompleta({
      data:       q.data as string,
      produtoId:  numeroOuNulo(q.produtoId) as number,
      etapaId:    numeroOuNulo(q.etapaId) as number,
      variacaoId: numeroOuNulo(q.variacaoId),
    }));
  });

  app.get('/api/producao/ficha/:id', (req, res) => {
    responder(res, () => producao.getFichaPorId(Number(req.params.id)));
  });

  app.delete('/api/producao/ficha/:id', (req, res) => {
    responder(res, () => producao.removerCartao(Number(req.params.id)));
  });

  // ── O que já existe: dias com cartões e cartões de um dia ────────────────────
  app.get('/api/producao/dias', (req, res) => {
    responder(res, () => producao.listarDiasComRegistro(numeroOuNulo(req.query.limite) ?? undefined));
  });

  app.get('/api/producao/cartoes', (req, res) => {
    responder(res, () => producao.listarCartoesDoDia(req.query.data as string));
  });

  // ── Operadores na ficha ──────────────────────────────────────────────────────
  app.post('/api/producao/operador', (req, res) => {
    responder(res, () => producao.addOperador(req.body));
  });

  app.delete('/api/producao/operador/:id', (req, res) => {
    responder(res, () => producao.removeOperador({ operadorDiarioId: Number(req.params.id) }));
  });

  // ── Registro horário ─────────────────────────────────────────────────────────
  app.post('/api/producao/registro', (req, res) => {
    responder(res, () => producao.upsertRegistro(req.body));
  });

  // ── Meta padrão ──────────────────────────────────────────────────────────────
  app.patch('/api/producao/ficha/:id/meta', (req, res) => {
    responder(res, () => producao.updateMetaHoraPadrao(Number(req.params.id), Number(req.body.meta)));
  });

  // ── Comando para o dashboard TV (broadcast via polling) ──────────────────────
  let ultimoComando: Record<string, unknown> | null = null;

  app.post('/api/dashboard/comando', (req, res) => {
    ultimoComando = { ...req.body, ts: Date.now() };
    res.json({ success: true });
  });

  app.get('/api/dashboard/comando', (_req, res) => {
    res.json({ success: true, data: ultimoComando });
  });

  // ── Dashboard de produção (JSON) ─────────────────────────────────────────────
  app.get('/api/dashboard/producao', (req, res) => {
    const data = texto(req.query.data) ?? new Date().toISOString().slice(0, 10);
    responder(res, () => getDashboardPorEtapas(data, numeroOuNulo(req.query.produtoId), texto(req.query.faixa)));
  });

  // ── Página de Controle de Produção (web) ────────────────────────────────────
  app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pageControle());
  });

  // ── Página do Dashboard (web) ────────────────────────────────────────────────
  app.get('/dashboard', (req, res) => {
    const data      = texto(req.query.data) ?? new Date().toISOString().slice(0, 10);
    const produtoId = numeroOuNulo(req.query.produtoId);
    const faixa     = texto(req.query.faixa) ?? '';
    const resultado = executar(() => getDashboardPorEtapas(data, produtoId, faixa || undefined));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pageDashboard({
      data,
      produtoId,
      faixa,
      dados: resultado.success ? resultado.data ?? null : null,
      erro: resultado.error,
      produtos: produtos.listar(),
    }));
  });

  return app;
}

export async function startInternalServer(): Promise<string> {
  const app  = criarApp();
  const port = await findAvailablePort(3000);
  const ip   = getLocalIPv4();
  const url  = ip ? `http://${ip}:${port}` : `http://localhost:${port}`;

  return new Promise<string>((resolve) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Servidor disponível para a rede em: ${url}`);
      resolve(url);
    });
  });
}
