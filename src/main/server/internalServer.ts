import express from 'express';
import cors from 'cors';
import { createServer } from 'node:net';
import os from 'node:os';
import {
  getOrCreateFicha,
  getFichaCompleta,
  addOperador,
  removeOperador,
  upsertRegistro,
  updateMetaHoraPadrao,
} from '../services/producaoService';
import { getDashboardPorEtapas } from '../services/producaoDashboardService';

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

export async function startInternalServer(): Promise<string> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Status ───────────────────────────────────────────────────────────────────
  app.get('/api/status', (_req, res) => {
    res.json({ status: 'online', message: 'Servidor do Dashboard operante' });
  });

  // ── Ficha ────────────────────────────────────────────────────────────────────
  app.post('/api/producao/ficha', (req, res) => {
    try { res.json({ success: true, data: getOrCreateFicha(req.body) }); }
    catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  app.get('/api/producao/ficha', (req, res) => {
    try {
      const { data, etapa, produto } = req.query as Record<string, string>;
      const result = getFichaCompleta({ data, etapa: etapa as any, produto });
      res.json({ success: true, data: result });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Operadores ───────────────────────────────────────────────────────────────
  app.post('/api/producao/operador', (req, res) => {
    try { res.json({ success: true, data: addOperador(req.body) }); }
    catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  app.delete('/api/producao/operador/:id', (req, res) => {
    try {
      removeOperador({ operadorDiarioId: Number(req.params.id) });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Registro horário ─────────────────────────────────────────────────────────
  app.post('/api/producao/registro', (req, res) => {
    try { res.json({ success: true, data: upsertRegistro(req.body) }); }
    catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Meta padrão ──────────────────────────────────────────────────────────────
  app.patch('/api/producao/ficha/:id/meta', (req, res) => {
    try {
      updateMetaHoraPadrao(Number(req.params.id), Number(req.body.meta));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
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
    try {
      const data    = (req.query.data    as string) || new Date().toISOString().slice(0, 10);
      const produto = req.query.produto  as string | undefined;
      const faixa   = req.query.faixa   as string | undefined;
      res.json({ success: true, data: getDashboardPorEtapas(data, produto, faixa) });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Página de Controle de Produção (web) ────────────────────────────────────
  app.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pageControle());
  });

  // ── Página do Dashboard (web) ────────────────────────────────────────────────
  app.get('/dashboard', (req, res) => {
    const data    = (req.query.data    as string) || new Date().toISOString().slice(0, 10);
    const produto = (req.query.produto as string) || '';
    const faixa   = (req.query.faixa  as string) || '';
    let dadosJSON = 'null';
    try {
      dadosJSON = JSON.stringify(getDashboardPorEtapas(data, produto || undefined, faixa || undefined));
    } catch (_e) { /* página mostrará erro */ }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pageDashboard(data, produto, faixa, dadosJSON));
  });

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

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: CONTROLE DE PRODUÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function pageControle(): string {
  const SCRIPT_CLOSE = '</scr' + 'ipt>';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Controle de Produção</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f1f5f9;min-height:100vh;font-size:14px}

/* Nav */
.nav{background:#0f172a;padding:8px 14px;display:flex;gap:6px;flex-shrink:0}
.nav a{color:#94a3b8;font-size:12px;font-weight:600;text-decoration:none;padding:4px 10px;border-radius:4px}
.nav a.active,.nav a:hover{background:#1e3a5f;color:#e2e8f0}

/* Painel do Dashboard */
.dash-panel{background:#0f2542;padding:10px 14px;border-bottom:2px solid #1e3a5f}
.dash-panel-title{font-size:9px;font-weight:700;color:#475569;letter-spacing:1.5px;margin-bottom:8px}
.dash-panel-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}

/* Toolbar */
.toolbar{background:#1e3a5f;padding:10px 14px}
.toolbar-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}

/* Campos */
.field{display:flex;flex-direction:column;gap:3px}
.field label{color:#64748b;font-size:10px;font-weight:700;letter-spacing:1px}
input,select{padding:6px 8px;border-radius:4px;border:1px solid #334155;background:#0f2542;color:#f1f5f9;font-size:13px;outline:none;-webkit-appearance:none}
input[type=date]{min-width:130px}

/* Botões */
.btn{padding:7px 14px;border-radius:4px;border:none;color:#fff;cursor:pointer;font-weight:700;font-size:12px;white-space:nowrap;transition:opacity .15s}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn:hover:not(:disabled){opacity:.85}
.btn-green{background:#16a34a}.btn-slate{background:#334155}.btn-blue{background:#2563eb}.btn-red{background:#dc2626}

/* Info bar */
.info-bar{background:#0f2542;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid #1e3a5f}
.info-tag{color:#94a3b8;font-size:11px}

/* Erro */
.erro{background:#fee2e2;color:#991b1b;padding:8px 14px;font-size:13px;display:flex;justify-content:space-between;align-items:center}

/* Estado vazio */
.empty{padding:60px 20px;text-align:center;color:#94a3b8;font-size:14px}

/* Cabeçalho da ficha */
.ficha-header{background:#1e3a5f;color:#fff;padding:8px 14px;font-weight:700;font-size:13px;letter-spacing:.6px;display:flex;justify-content:space-between;align-items:center;margin:10px 10px 0}
.ficha-data{opacity:.55;font-size:11px;font-weight:400}

/* Tabela desktop */
.table-wrap{overflow-x:auto;padding:0 10px 10px}
table{border-collapse:collapse;background:#fff;width:100%;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
th{position:sticky;top:0;z-index:2;padding:5px 6px;text-align:center;font-weight:700;font-size:10px;letter-spacing:.4px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1)}
td{padding:3px 5px;text-align:center;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;font-size:11px}
.td-bloco{padding:4px 8px;font-weight:600;font-size:10px;white-space:nowrap;background:#f8fafc;border-right:2px solid #cbd5e1;color:#374151}
.input-cell{width:46px;padding:2px 3px;text-align:center;font-size:11px;border:1px solid #cbd5e1;border-radius:2px;background:#f0f9ff;color:#1e293b}
.input-cell.meta-cell{background:#fefce8;color:#1e293b}
.input-cell.dirty{background:#fef9c3;border-color:#fbbf24;color:#1e293b}
.save-btn{padding:3px 8px;border-radius:3px;border:none;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;font-size:10px;white-space:nowrap;min-width:46px;transition:background .2s}
.save-btn:disabled{background:#cbd5e1;color:#94a3b8;cursor:not-allowed}
.tfoot-row td{background:#1e3a5f;color:#fff;font-weight:700;font-size:11px;padding:5px 6px}

/* Mobile: cartões */
.mobile-cards{display:none;flex-direction:column}
.bloco-card{border-bottom:2px solid #cbd5e1}
.bloco-label{background:#334155;color:#e2e8f0;font-size:12px;font-weight:700;padding:8px 14px;letter-spacing:.5px}
.op-row{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.op-name{font-size:15px;font-weight:800;color:#1e3a5f}
.op-inputs{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
.op-field{display:flex;flex-direction:column;gap:4px}
.op-field label{font-size:11px;font-weight:700;color:#64748b;letter-spacing:.8px}
.op-field input{width:90px;padding:10px;font-size:18px;border:2px solid #cbd5e1;border-radius:8px;text-align:center;background:#f0f9ff;color:#1e293b}
.op-field input.meta-cell{background:#fefce8;color:#1e293b}
.op-field input.dirty{background:#fef9c3;border-color:#fbbf24;color:#1e293b}
.saldo-col{display:flex;flex-direction:column;gap:4px;align-items:center;padding-bottom:2px}
.saldo-col span:first-child{font-size:11px;font-weight:700;color:#64748b}
.saldo-val{font-size:26px;font-weight:900}
.save-btn-mobile{flex:1;min-width:90px;padding:12px;border-radius:8px;border:none;background:#2563eb;color:#fff;font-weight:800;font-size:15px;cursor:pointer;transition:background .2s}
.save-btn-mobile:disabled{background:#cbd5e1;color:#94a3b8;cursor:not-allowed}
.total-bloco{background:#e2e8f0;padding:8px 14px;display:flex;gap:16px;font-size:12px;font-weight:700;color:#475569}

/* Responsividade */
@media(max-width:700px){
  .table-wrap{display:none}
  .mobile-cards{display:flex}
  input,select{font-size:15px;padding:9px 10px}
  .btn{padding:10px 16px;font-size:13px}
  .dash-panel-row,.toolbar-row{gap:6px}
}
</style>
</head>
<body>

<div class="nav">
  <a href="/" class="active">Controle de Produção</a>
  <a href="/dashboard">Dashboard</a>
</div>

<!-- Painel de controle do Dashboard (TV) -->
<div class="dash-panel">
  <div class="dash-panel-title">CONTROLE DO PAINEL DE PRODUÇÃO (TV)</div>
  <div class="dash-panel-row">
    <div class="field"><label>DATA</label><input type="date" id="dash-data"/></div>
    <div class="field"><label>PRODUTO</label><input type="text" id="dash-produto" placeholder="Todos" style="width:120px"/></div>
    <div class="field"><label>FAIXA DE HORÁRIO</label>
      <select id="dash-faixa">
        <option>07:12 - 08:00</option><option>08:00 - 09:00</option>
        <option>09:15 - 10:00</option><option>10:00 - 11:00</option>
        <option>11:00 - 12:00</option><option>13:00 - 14:00</option>
        <option>14:00 - 15:00</option><option>15:00 - 16:00</option>
        <option>16:00 - 17:12</option>
      </select>
    </div>
    <button class="btn btn-blue" id="btn-atualizar-painel">Atualizar Painel</button>
    <span id="dash-status" style="color:#64748b;font-size:11px;align-self:flex-end;padding-bottom:2px"></span>
  </div>
</div>

<!-- Toolbar de filtros da ficha -->
<div class="toolbar">
  <div class="toolbar-row">
    <div class="field"><label>DATA</label><input type="date" id="inp-data"/></div>
    <div class="field"><label>PRODUTO</label><input type="text" id="inp-produto" placeholder="Ex: 4G SIMCOM" style="width:130px"/></div>
    <div class="field"><label>ETAPA</label>
      <select id="inp-etapa">
        <option>Montagem</option><option selected>Soldagem</option>
        <option>Revisão</option><option>Firmware</option><option>IMEI</option>
      </select>
    </div>
    <div class="field"><label>META/H</label><input type="number" id="inp-meta" min="1" value="40" style="width:70px"/></div>
    <button class="btn btn-slate" id="btn-consultar">Consultar</button>
    <button class="btn btn-green" id="btn-abrir">Abrir / Criar</button>
  </div>
</div>

<!-- Info bar (visível quando ficha carregada) -->
<div id="info-bar" style="display:none" class="info-bar">
  <span class="info-tag">Ficha <b id="info-id"></b></span>
  <span class="info-tag">| Meta padrão:
    <input type="number" id="inp-meta-padrao" min="1" style="width:56px;display:inline-block;vertical-align:middle;padding:4px 6px;font-size:13px"/>
  </span>
  <span class="info-tag">|</span>
  <input type="text" id="inp-novo-op" placeholder="Nome do operador" style="width:150px;display:inline-block;vertical-align:middle;padding:6px 8px;font-size:13px"/>
  <button class="btn btn-blue" id="btn-add-op">+ Operador</button>
</div>

<!-- Barra de erro -->
<div id="erro-bar" style="display:none" class="erro">
  <span id="erro-msg"></span>
  <button id="btn-fechar-erro" style="background:none;border:none;cursor:pointer;font-size:18px;color:#991b1b;padding:0 4px">✕</button>
</div>

<!-- Estado inicial -->
<div id="empty-state" class="empty">Selecione os filtros e clique em "Abrir / Criar" para começar.</div>

<!-- Ficha carregada -->
<div id="ficha-wrap" style="display:none">
  <div class="ficha-header">
    <span id="ficha-titulo"></span>
    <span id="ficha-data-span" class="ficha-data"></span>
  </div>
  <div class="table-wrap" id="table-wrap"></div>
  <div class="mobile-cards" id="mobile-cards"></div>
</div>

<script>
(function() {
// ── Constantes ────────────────────────────────────────────────────────────────
const BLOCOS = [
  '07:12 - 08:00','08:00 - 09:00','09:15 - 10:00',
  '10:00 - 11:00','11:00 - 12:00','13:00 - 14:00',
  '14:00 - 15:00','15:00 - 16:00','16:00 - 17:12',
];
const COR_OP = ['#e67e22','#27ae60','#8e44ad','#2980b9','#c0392b','#f39c12','#16a085','#d35400'];

function faixaAtual() {
  const agora = new Date(), m = agora.getHours()*60+agora.getMinutes();
  const limites = [[7*60+12,8*60],[8*60,9*60],[9*60+15,10*60],[10*60,11*60],[11*60,12*60],
                   [13*60,14*60],[14*60,15*60],[15*60,16*60],[16*60,17*60+12]];
  for (let i=0;i<limites.length;i++) if (m>=limites[i][0]&&m<limites[i][1]) return BLOCOS[i];
  return BLOCOS[0];
}

// ── Estado ────────────────────────────────────────────────────────────────────
let FICHA = null;
const DRAFT  = {}; // DRAFT[opId][bloco] = {meta, realizado}
const SAVING = new Set();
const SAVED  = new Set();

// ── Init ──────────────────────────────────────────────────────────────────────
const hoje = new Date().toISOString().slice(0,10);
document.getElementById('inp-data').value  = hoje;
document.getElementById('dash-data').value = hoje;
document.getElementById('dash-faixa').value = faixaAtual();

// ── Helpers ───────────────────────────────────────────────────────────────────
function apiCall(method, path, body) {
  return fetch(path, {
    method,
    headers: body ? {'Content-Type':'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}
function mostrarErro(msg) {
  document.getElementById('erro-msg').textContent = msg;
  document.getElementById('erro-bar').style.display = 'flex';
}
function esconderErro() { document.getElementById('erro-bar').style.display = 'none'; }

function getReg(op, bloco) { return (op.registros||[]).find(r => r.horarioBloco===bloco); }
function getDraft(opId, bloco) { return (DRAFT[opId]||{})[bloco]; }
function getValues(opId, bloco) {
  const d = getDraft(opId, bloco);
  if (d) return d;
  const op  = FICHA.operadores.find(o => o.id===opId);
  const reg = op ? getReg(op, bloco) : null;
  return { meta: reg ? String(reg.meta) : String(FICHA.metaHoraPadrao||0), realizado: reg ? String(reg.realizado) : '0' };
}
function setDraftVal(opId, bloco, field, val) {
  if (!DRAFT[opId]) DRAFT[opId] = {};
  const cur = getDraft(opId, bloco) || getValues(opId, bloco);
  DRAFT[opId][bloco] = { ...cur, [field]: val };
}
function clearDraft(opId, bloco) { if (DRAFT[opId]) delete DRAFT[opId][bloco]; }

function corPct(p) { return p===null?'#94a3b8':p>=100?'#16a34a':p>=80?'#d97706':'#dc2626'; }
function corSaldo(v) { return v<0?'#dc2626':v>0?'#2563eb':'#16a34a'; }
function calcPct(r, m) { return m===0?null:(r/m)*100; }

function totBloco(bloco, field) {
  return (FICHA.operadores||[]).reduce((s,op) => s+(parseInt(getValues(op.id,bloco)[field])||0), 0);
}
function totOp(op) {
  return BLOCOS.reduce((acc,b) => {
    const v=getValues(op.id,b); const reg=getReg(op,b); const d=getDraft(op.id,b);
    if (!reg&&!d) return acc;
    return {meta:acc.meta+(parseInt(v.meta)||0), realizado:acc.realizado+(parseInt(v.realizado)||0)};
  },{meta:0,realizado:0});
}
function grandTotal() {
  return (FICHA.operadores||[]).reduce((g,op)=>{const t=totOp(op);return{meta:g.meta+t.meta,realizado:g.realizado+t.realizado}},{meta:0,realizado:0});
}

// ── Controle do Dashboard TV ──────────────────────────────────────────────────
document.getElementById('btn-atualizar-painel').addEventListener('click', async () => {
  const data    = document.getElementById('dash-data').value;
  const produto = document.getElementById('dash-produto').value.trim();
  const faixa   = document.getElementById('dash-faixa').value;
  const status  = document.getElementById('dash-status');
  try {
    const res = await apiCall('POST', '/api/dashboard/comando', { type:'refresh', data, produto, faixa });
    status.textContent = res.success ? '✓ Painel atualizado' : ('Erro: '+(res.error||''));
    status.style.color = res.success ? '#86efac' : '#fca5a5';
  } catch(e) {
    status.textContent = '✓ Comando enviado';
    status.style.color = '#86efac';
  }
  setTimeout(() => { status.textContent = ''; }, 3000);
});

// ── Consulta / Criação ────────────────────────────────────────────────────────
document.getElementById('btn-consultar').addEventListener('click', async () => {
  esconderErro();
  const data=document.getElementById('inp-data').value, etapa=document.getElementById('inp-etapa').value, produto=document.getElementById('inp-produto').value.trim();
  if (!data||!produto||!etapa) { mostrarErro('Preencha data, produto e etapa.'); return; }
  const res = await apiCall('GET','/api/producao/ficha?data='+encodeURIComponent(data)+'&etapa='+encodeURIComponent(etapa)+'&produto='+encodeURIComponent(produto));
  if (!res.success) { mostrarErro(res.error); return; }
  if (!res.data)    { mostrarErro('Nenhuma ficha encontrada.'); return; }
  carregarFicha(res.data);
});

document.getElementById('btn-abrir').addEventListener('click', async () => {
  esconderErro();
  const data=document.getElementById('inp-data').value, etapa=document.getElementById('inp-etapa').value;
  const produto=document.getElementById('inp-produto').value.trim();
  const metaHoraPadrao=parseInt(document.getElementById('inp-meta').value)||40;
  if (!data||!produto||!etapa) { mostrarErro('Preencha data, produto e etapa.'); return; }
  const res = await apiCall('POST','/api/producao/ficha',{data,etapa,produto,metaHoraPadrao});
  if (!res.success) { mostrarErro(res.error); return; }
  carregarFicha(res.data);
});

document.getElementById('btn-fechar-erro').addEventListener('click', esconderErro);

function carregarFicha(ficha) {
  FICHA = ficha;
  Object.keys(DRAFT).forEach(k => delete DRAFT[k]);
  SAVING.clear(); SAVED.clear();
  renderTudo();
}

// ── Operadores ────────────────────────────────────────────────────────────────
document.getElementById('btn-add-op').addEventListener('click', addOperador);
document.getElementById('inp-novo-op').addEventListener('keydown', e => { if(e.key==='Enter') addOperador(); });

async function addOperador() {
  if (!FICHA) return;
  const nome = document.getElementById('inp-novo-op').value.trim().toUpperCase();
  if (!nome) return;
  const res = await apiCall('POST','/api/producao/operador',{fichaId:FICHA.id,operadorNome:nome});
  if (!res.success) { mostrarErro(res.error); return; }
  FICHA.operadores.push({...res.data, registros:[]});
  document.getElementById('inp-novo-op').value = '';
  renderTudo();
}

async function removerOperador(id) {
  if (!FICHA) return;
  const res = await apiCall('DELETE','/api/producao/operador/'+id);
  if (!res.success) { mostrarErro(res.error); return; }
  FICHA.operadores = FICHA.operadores.filter(o => o.id!==id);
  if (DRAFT[id]) delete DRAFT[id];
  renderTudo();
}

// ── Meta padrão ───────────────────────────────────────────────────────────────
document.getElementById('inp-meta-padrao').addEventListener('change', async function() {
  if (!FICHA) return;
  const meta = parseInt(this.value)||0;
  FICHA.metaHoraPadrao = meta;
  const res = await apiCall('PATCH','/api/producao/ficha/'+FICHA.id+'/meta',{meta});
  if (!res.success) mostrarErro(res.error);
});

// ── Salvar registro ───────────────────────────────────────────────────────────
async function salvar(opId, bloco) {
  const key = opId+'|'+bloco;
  const v   = getValues(opId, bloco);
  const meta=parseInt(v.meta), realizado=parseInt(v.realizado);
  if (isNaN(meta)||meta<=0) { mostrarErro('Meta deve ser maior que zero para o horário '+bloco); return; }
  if (isNaN(realizado)||realizado<0) { mostrarErro('Realizado inválido para '+bloco); return; }

  SAVING.add(key);
  renderCelula(opId, bloco);

  const res = await apiCall('POST','/api/producao/registro',{operadorDiarioId:opId,horarioBloco:bloco,meta,realizado});
  SAVING.delete(key);

  if (!res.success) { mostrarErro(res.error); renderCelula(opId,bloco); return; }

  const op = FICHA.operadores.find(o=>o.id===opId);
  if (op) {
    const idx = op.registros.findIndex(r=>r.horarioBloco===bloco);
    if (idx>=0) op.registros[idx]=res.data; else op.registros.push(res.data);
  }
  clearDraft(opId, bloco);
  SAVED.add(key);
  renderCelula(opId, bloco);
  setTimeout(()=>{ SAVED.delete(key); renderCelula(opId,bloco); }, 1500);
}

// ── Delegação de eventos (funciona para elementos criados dinamicamente) ──────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action==='salvar')         salvar(+btn.dataset.op, btn.dataset.bloco);
  if (action==='remover-op')     removerOperador(+btn.dataset.id);
});

document.addEventListener('change', function(e) {
  const el = e.target;
  if (!el.dataset.op) return;
  setDraftVal(+el.dataset.op, el.dataset.bloco, el.dataset.field, el.value);
  // Atualiza saldo visual imediato
  atualizarSaldoVisual(+el.dataset.op, el.dataset.bloco);
});

function atualizarSaldoVisual(opId, bloco) {
  const v = getValues(opId, bloco);
  const m = parseInt(v.meta)||0, r = parseInt(v.realizado)||0;
  const s = r-m;
  // Desktop: saldo td
  const saldoTd = document.querySelector('[data-saldo="'+opId+'|'+bloco+'"]');
  if (saldoTd) { saldoTd.textContent=(s>0?'+':'')+s; saldoTd.style.color=corSaldo(s); }
  // Mobile: saldo span
  const saldoMob = document.querySelector('[data-saldo-mob="'+opId+'|'+bloco+'"]');
  if (saldoMob) { saldoMob.textContent=(s>0?'+':'')+s; saldoMob.style.color=corSaldo(s); }
  // Marca dirty
  document.querySelectorAll('[data-op="'+opId+'"][data-bloco="'+bloco+'"]').forEach(el => {
    if (el.tagName==='INPUT') el.classList.add('dirty');
  });
}

// ── Render principal ──────────────────────────────────────────────────────────
function renderTudo() {
  if (!FICHA) return;
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('ficha-wrap').style.display  = 'block';
  document.getElementById('info-bar').style.display    = 'flex';
  document.getElementById('info-id').textContent       = '#'+FICHA.id;
  document.getElementById('inp-meta-padrao').value     = FICHA.metaHoraPadrao;
  document.getElementById('ficha-titulo').textContent  = 'CONTROLE DE PRODUÇÃO — '+FICHA.etapa.toUpperCase()+' | '+FICHA.produto.toUpperCase();
  document.getElementById('ficha-data-span').textContent = FICHA.data;
  renderTabela();
  renderMobile();
}

// ── Tabela desktop ────────────────────────────────────────────────────────────
function renderTabela() {
  const ops = FICHA.operadores;
  let h = '<table><thead><tr>';
  h += '<th rowspan="2" style="background:#1e3a5f;color:#fff;width:105px">HORÁRIO</th>';
  ops.forEach((op,i) => {
    const cor = COR_OP[i%COR_OP.length];
    h += '<th colspan="4" style="background:'+cor+';color:#fff;min-width:190px">'+op.operadorNome+
         ' <button data-action="remover-op" data-id="'+op.id+'" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:12px;padding:0 2px">✕</button></th>';
  });
  h += '<th rowspan="2" style="background:#0f766e;color:#fff;min-width:52px">TOT.<br/>REAL.</th>';
  h += '<th rowspan="2" style="background:#0f766e;color:#fff;min-width:52px">TOT.<br/>META</th>';
  h += '<th rowspan="2" style="background:#0f766e;color:#fff;min-width:58px">%<br/>ATING.</th>';
  h += '</tr><tr>';
  ops.forEach(()=>{
    h += '<th style="background:#334155;color:#64748b;font-size:9px">META</th>';
    h += '<th style="background:#334155;color:#64748b;font-size:9px">REAL.</th>';
    h += '<th style="background:#334155;color:#64748b;font-size:9px">SALDO</th>';
    h += '<th style="background:#334155;font-size:9px"></th>';
  });
  h += '</tr></thead><tbody>';

  BLOCOS.forEach(bloco => {
    const totR=totBloco(bloco,'realizado'), totM=totBloco(bloco,'meta'), p=calcPct(totR,totM);
    h += '<tr><td class="td-bloco">'+bloco+'</td>';
    ops.forEach(op => { h += celulasTD(op.id, bloco); });
    h += '<td style="font-weight:700">'+(totR||'—')+'</td>';
    h += '<td style="font-weight:700">'+(totM||'—')+'</td>';
    h += '<td style="font-weight:700;color:'+corPct(p)+'">'+(p!==null?p.toFixed(1)+'%':'—')+'</td></tr>';
  });

  // Rodapé
  h += '<tfoot><tr class="tfoot-row"><td class="td-bloco" style="color:#fff">TOTAL GERAL</td>';
  ops.forEach(op => {
    const t=totOp(op), s=t.realizado-t.meta;
    h += '<td>'+t.meta+'</td><td>'+t.realizado+'</td>';
    h += '<td style="color:'+(s<0?'#fca5a5':'#86efac')+'">'+(s>0?'+':'')+s+'</td><td></td>';
  });
  const gt=grandTotal(), gp=calcPct(gt.realizado,gt.meta);
  h += '<td>'+gt.realizado+'</td><td>'+gt.meta+'</td>';
  h += '<td style="color:'+(gp===null?'#94a3b8':gp>=100?'#86efac':gp>=80?'#fde68a':'#fca5a5')+'">'+(gt.meta>0?((gt.realizado/gt.meta*100).toFixed(1)+'%'):'—')+'</td>';
  h += '</tr></tfoot></table>';
  document.getElementById('table-wrap').innerHTML = h;
}

function celulasTD(opId, bloco) {
  const key=opId+'|'+bloco, v=getValues(opId,bloco), d=getDraft(opId,bloco);
  const isDirty=!!d, isSaving=SAVING.has(key), wasSaved=SAVED.has(key);
  const op=FICHA.operadores.find(o=>o.id===opId), reg=op?getReg(op,bloco):null;
  const meta=parseInt(v.meta), real=parseInt(v.realizado);
  const saldo=(isNaN(real)?0:real)-(isNaN(meta)?0:meta);
  const metaInvalida=isNaN(meta)||meta<=0;
  const dc=isDirty?' dirty':'';
  let btnBg=wasSaved?'#16a34a':metaInvalida?'#cbd5e1':isSaving?'#93c5fd':'#2563eb';
  return (
    '<td style="padding:2px 3px'+(isDirty?';background:#fefce8':'')+'">' +
    '<input type="number" min="0" class="input-cell meta-cell'+dc+'" value="'+v.meta+'"'+
    ' data-op="'+opId+'" data-bloco="'+bloco+'" data-field="meta"/></td>'+
    '<td style="padding:2px 3px'+(isDirty?';background:#fefce8':'')+'">' +
    '<input type="number" min="0" class="input-cell'+dc+'" value="'+v.realizado+'"'+
    ' data-op="'+opId+'" data-bloco="'+bloco+'" data-field="realizado"/></td>'+
    '<td style="font-weight:700;color:'+corSaldo(saldo)+'" data-saldo="'+key+'">'+(reg||isDirty?(saldo>0?'+'+saldo:saldo):'—')+'</td>'+
    '<td style="padding:2px 4px"><button class="save-btn" data-action="salvar" data-op="'+opId+'" data-bloco="'+bloco+'"'+
    ' style="background:'+btnBg+'"'+(isSaving||metaInvalida?' disabled':'')+'>'+
    (isSaving?'...':wasSaved?'✓':'Salvar')+'</button></td>'
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────────
function renderMobile() {
  let h = '';
  BLOCOS.forEach(bloco => {
    const totR=totBloco(bloco,'realizado'), totM=totBloco(bloco,'meta'), p=calcPct(totR,totM);
    h += '<div class="bloco-card"><div class="bloco-label">'+bloco+'</div>';
    (FICHA.operadores||[]).forEach(op => { h += mobileCelula(op, bloco); });
    h += '<div class="total-bloco">'+
         '<span>REAL.: <b>'+totR+'</b></span><span>META: <b>'+totM+'</b></span>'+
         '<span style="color:'+corPct(p)+'"><b>'+(p!==null?p.toFixed(1)+'%':'—')+'</b></span>'+
         '</div></div>';
  });
  const gt=grandTotal(), gp=calcPct(gt.realizado,gt.meta);
  h += '<div style="background:#1e3a5f;color:#fff;padding:12px 14px;display:flex;gap:16px;font-weight:700;font-size:14px">'+
       '<span>TOTAL: '+gt.realizado+'</span><span>META: '+gt.meta+'</span>'+
       '<span style="color:'+(gp!==null?gp>=100?'#86efac':gp>=80?'#fde68a':'#fca5a5':'#94a3b8')+'">'+
       (gt.meta>0?((gt.realizado/gt.meta*100).toFixed(1)+'%'):'—')+'</span></div>';
  document.getElementById('mobile-cards').innerHTML = h;
}

function mobileCelula(op, bloco) {
  const key=op.id+'|'+bloco, v=getValues(op.id,bloco), d=getDraft(op.id,bloco);
  const isDirty=!!d, isSaving=SAVING.has(key), wasSaved=SAVED.has(key);
  const reg=getReg(op,bloco);
  const meta=parseInt(v.meta), real=parseInt(v.realizado);
  const saldo=(isNaN(real)?0:real)-(isNaN(meta)?0:meta);
  const metaInvalida=isNaN(meta)||meta<=0;
  let btnBg=wasSaved?'#16a34a':metaInvalida?'#cbd5e1':isSaving?'#93c5fd':'#2563eb';
  const dc=isDirty?' dirty':'';
  return (
    '<div class="op-row" id="mob-'+op.id+'-'+bloco.replace(/ /g,'_')+'">'+
    '<div class="op-name">'+op.operadorNome+'</div>'+
    '<div class="op-inputs">'+
    '<div class="op-field"><label>META</label>'+
    '<input type="number" inputmode="numeric" class="meta-cell'+dc+'" min="0" value="'+v.meta+'"'+
    ' data-op="'+op.id+'" data-bloco="'+bloco+'" data-field="meta"/></div>'+
    '<div class="op-field"><label>REALIZADO</label>'+
    '<input type="number" inputmode="numeric" class="'+dc.trim()+'" min="0" value="'+v.realizado+'"'+
    ' data-op="'+op.id+'" data-bloco="'+bloco+'" data-field="realizado"/></div>'+
    '<div class="saldo-col"><span>SALDO</span>'+
    '<span class="saldo-val" style="color:'+corSaldo(saldo)+'" data-saldo-mob="'+key+'">'+(reg||isDirty?(saldo>0?'+'+saldo:saldo):'—')+'</span>'+
    '</div>'+
    '<button class="save-btn-mobile" data-action="salvar" data-op="'+op.id+'" data-bloco="'+bloco+'"'+
    ' style="background:'+btnBg+'"'+(isSaving||metaInvalida?' disabled':'')+'>'+
    (isSaving?'Salvando...':wasSaved?'✓ Salvo':'Salvar')+'</button>'+
    '</div></div>'
  );
}

// ── renderCelula (após save) ──────────────────────────────────────────────────
function renderCelula(opId, bloco) {
  // Desktop: re-render as 4 colunas da linha (substitui innerHTML parcial via tabela)
  const inputs = document.querySelectorAll('input[data-op="'+opId+'"][data-bloco="'+bloco+'"]');
  if (inputs.length) {
    const tr = inputs[0].closest('tr');
    if (tr) {
      // Substitui células do operador: localiza pelo índice de operador
      const opIdx = FICHA.operadores.findIndex(o=>o.id===opId);
      if (opIdx>=0) {
        // Cada operador tem 4 tds após a td do horário
        const allTds = tr.querySelectorAll('td');
        const start  = 1 + opIdx*4; // +1 pula td-bloco
        const novoCelulas = document.createElement('template');
        novoCelulas.innerHTML = celulasTD(opId, bloco);
        for (let i=0;i<4;i++) {
          const td = allTds[start+i];
          const novo = novoCelulas.content.querySelectorAll('td')[i];
          if (td && novo) td.replaceWith(novo.cloneNode(true));
        }
      }
    }
  }
  // Mobile: re-render card
  const mobEl = document.getElementById('mob-'+opId+'-'+bloco.replace(/ /g,'_'));
  if (mobEl) {
    const op = FICHA.operadores.find(o=>o.id===opId);
    if (op) {
      const t = document.createElement('template');
      t.innerHTML = mobileCelula(op, bloco);
      mobEl.replaceWith(t.content.firstElementChild);
    }
  }
}

})();
` + SCRIPT_CLOSE + `
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function pageDashboard(data: string, produto: string, faixa: string, dadosJSON: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Dashboard de Produção</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></` + `script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f1f5f9;min-height:100vh}
.nav{background:#0f172a;padding:8px 14px;display:flex;gap:6px}
.nav a{color:#94a3b8;font-size:12px;font-weight:600;text-decoration:none;padding:4px 10px;border-radius:4px}
.nav a.active,.nav a:hover{background:#1e3a5f;color:#e2e8f0}
.topbar{background:#1e3a5f;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.topbar h1{font-size:14px;font-weight:800;color:#fff;letter-spacing:1px}
.topbar form{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-left:auto}
.topbar input,.topbar select{padding:6px 10px;border-radius:5px;border:none;font-size:13px;background:#0f2542;color:#e2e8f0}
.topbar button{padding:6px 14px;border-radius:5px;border:none;background:#3b82f6;color:#fff;font-weight:700;cursor:pointer;font-size:13px}
.kpi-bar{display:flex;gap:10px;padding:10px 16px;background:#e2e8f0;flex-wrap:wrap;border-bottom:1px solid #cbd5e1}
.kpi{background:#fff;border-radius:8px;padding:8px 14px;min-width:110px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.kpi-label{font-size:10px;font-weight:700;color:#64748b;letter-spacing:.8px}
.kpi-value{font-size:22px;font-weight:900;line-height:1.1}
.layout{display:flex;min-height:calc(100vh - 140px)}
.sidebar{width:270px;min-width:270px;background:#e2e8f0;border-right:1px solid #cbd5e1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.etapa-card{border-radius:10px;padding:12px;cursor:pointer;color:#fff;transition:opacity .15s,box-shadow .15s}
.etapa-card:hover{opacity:.9}
.etapa-card.ativa{box-shadow:0 0 0 3px #fff,0 0 0 5px rgba(0,0,0,.4)}
.etapa-nome{font-size:17px;font-weight:800;letter-spacing:1px}
.etapa-stats{display:flex;gap:6px;margin-top:8px}
.estat{flex:1;background:rgba(0,0,0,.25);border-radius:5px;padding:6px 8px}
.estat-label{font-size:9px;font-weight:700;opacity:.6;letter-spacing:.8px}
.estat-val{font-size:16px;font-weight:800;line-height:1}
.detail{flex:1;overflow-y:auto;padding:16px}
.detail-header{border-radius:10px;padding:12px 18px;color:#fff;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.chart-box{background:#fff;border-radius:10px;padding:12px;border:1px solid #e2e8f0;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.chart-title{font-size:11px;font-weight:700;color:#475569;margin-bottom:8px}
.ops-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.op-card{border-radius:10px;padding:12px;border:3px solid;display:flex;flex-direction:column;gap:8px}
.progress-bar{height:10px;background:rgba(0,0,0,.3);border-radius:5px;overflow:hidden}
.progress-fill{height:100%;border-radius:5px;transition:width .5s}
.empty{padding:60px;text-align:center;color:#94a3b8;font-size:15px}
.auto-tag{font-size:11px;color:#93c5fd;margin-left:auto}
@media(max-width:700px){
  .layout{flex-direction:column}
  .sidebar{width:100%;min-width:0}
  .topbar form{margin-left:0;width:100%}
  .topbar input,.topbar select{flex:1;min-width:0}
}
</style>
</head>
<body>
<div class="nav">
  <a href="/">Controle de Produção</a>
  <a href="/dashboard" class="active">Dashboard</a>
</div>
<div class="topbar">
  <h1>PAINEL DE PRODUÇÃO</h1>
  <form method="GET" action="/dashboard">
    <input type="date" name="data" value="${data}"/>
    <input type="text" name="produto" placeholder="Produto (opcional)" value="${produto}" style="min-width:130px"/>
    <select name="faixa">
      <option value="">Dia inteiro</option>
      ${['07:12 - 08:00','08:00 - 09:00','09:15 - 10:00','10:00 - 11:00','11:00 - 12:00',
         '13:00 - 14:00','14:00 - 15:00','15:00 - 16:00','16:00 - 17:12']
        .map(f => `<option value="${f}"${faixa === f ? ' selected' : ''}>${f}</option>`).join('')}
    </select>
    <button type="submit">Filtrar</button>
  </form>
  <span class="auto-tag">⟳ auto-refresh 60s</span>
</div>
<div id="kpi-bar" class="kpi-bar"></div>
<div class="layout">
  <div class="sidebar" id="sidebar"></div>
  <div class="detail" id="detail"></div>
</div>
<script>
const DADOS = ${dadosJSON};
const FAIXA = ${JSON.stringify(faixa || 'Dia inteiro')};
const COR = {
  Montagem:{ bg:'#1d4ed8', bar:'rgba(59,130,246,.85)'  },
  Soldagem:{ bg:'#15803d', bar:'rgba(34,197,94,.85)'   },
  'Revisão':{ bg:'#7e22ce', bar:'rgba(168,85,247,.85)' },
  Revisao: { bg:'#7e22ce', bar:'rgba(168,85,247,.85)'  },
  Firmware:{ bg:'#b45309', bar:'rgba(245,158,11,.85)'  },
  IMEI:    { bg:'#0e7490', bar:'rgba(6,182,212,.85)'   },
};
const COR_DEF = { bg:'#483751', bar:'rgba(107,114,128,.85)' };
function cor(e){ return COR[e]||COR_DEF; }
function pctColor(p){ return p===null?'#94a3b8':p>=100?'#86efac':p>=80?'#fde68a':'#fca5a5'; }

let etapaAtiva = DADOS && DADOS.etapas.length ? DADOS.etapas[0] : null;
let chartBar = null;

function render() {
  if (!DADOS) {
    document.getElementById('detail').innerHTML = '<div class="empty">Erro ao carregar dados.</div>';
    return;
  }
  const tot = DADOS.totalGeral;
  const gp  = tot.meta>0?(tot.realizado/tot.meta*100):null;

  // KPI bar
  document.getElementById('kpi-bar').innerHTML =
    kpi('REALIZADO', tot.realizado.toLocaleString('pt-BR'), gp!==null&&gp>=100?'#16a34a':'#1e293b')+
    kpi('META', tot.meta.toLocaleString('pt-BR'), '#3b82f6')+
    kpi('EFICIÊNCIA', gp!==null?gp.toFixed(1)+'%':'—', gp!==null?gp>=100?'#16a34a':gp>=80?'#d97706':'#dc2626':'#94a3b8')+
    kpi('PRODUTO', DADOS.produto, '#1e293b', '14px')+
    kpi('ETAPAS', DADOS.etapas.length, '#1e293b');

  // Sidebar
  let sb = '';
  DADOS.etapas.forEach((e,i) => {
    const c  = cor(e.etapa);
    const pc = e.totalMeta>0?(e.totalRealizado/e.totalMeta*100):null;
    const ativa = etapaAtiva && etapaAtiva.etapa===e.etapa;
    sb += '<div class="etapa-card'+(ativa?' ativa':'')+'" style="background:'+c.bg+'" onclick="selecionar('+i+')">'+
          '<div class="etapa-nome">'+e.etapa.toUpperCase()+'</div>'+
          '<div style="font-size:11px;opacity:.6;margin-top:2px">'+e.produto+'</div>'+
          '<div class="etapa-stats">'+
          '<div class="estat"><div class="estat-label">REALIZADO</div><div class="estat-val">'+e.totalRealizado+'</div></div>'+
          '<div class="estat"><div class="estat-label">META</div><div class="estat-val" style="opacity:.6">'+e.totalMeta+'</div></div>'+
          '<div class="estat"><div class="estat-label">EFIC.</div><div class="estat-val" style="color:'+pctColor(pc)+'">'+(pc!==null?pc.toFixed(1)+'%':'—')+'</div></div>'+
          '</div></div>';
  });
  document.getElementById('sidebar').innerHTML = sb || '<div style="padding:20px;color:#94a3b8;font-size:13px">Nenhum dado.</div>';

  // Detail
  renderDetalhe();
}

function kpi(label, value, color, fs) {
  return '<div class="kpi"><div class="kpi-label">'+label+'</div>'+
         '<div class="kpi-value" style="color:'+color+';font-size:'+(fs||'22px')+'">'+value+'</div></div>';
}

function renderDetalhe() {
  const e = etapaAtiva;
  if (!e) { document.getElementById('detail').innerHTML = '<div class="empty">Selecione uma etapa.</div>'; return; }
  const c  = cor(e.etapa);
  const pc = e.totalMeta>0?(e.totalRealizado/e.totalMeta*100):null;

  let h = '<div class="detail-header" style="background:'+c.bg+'">'+
    '<div><div style="font-size:24px;font-weight:900;letter-spacing:2px">'+e.etapa.toUpperCase()+'</div>'+
    '<div style="font-size:11px;opacity:.65;margin-top:2px">'+e.produto+'</div></div>'+
    '<div style="background:rgba(0,0,0,.25);border-radius:8px;padding:8px 14px;text-align:right;border:2px solid rgba(255,255,255,.3)">'+
    '<div style="font-size:9px;font-weight:700;opacity:.6;letter-spacing:2px">FAIXA</div>'+
    '<div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:2px">'+FAIXA+'</div></div></div>';

  h += '<div class="chart-box"><div class="chart-title">REALIZADO × SALDO POR OPERADOR</div>'+
       '<div style="height:190px"><canvas id="chartOps"></canvas></div></div>';

  h += '<div class="chart-title" style="margin-bottom:8px">DETALHE POR OPERADOR</div>';
  h += '<div class="ops-grid">';
  e.porOperador.forEach(op => {
    const opPct = op.totalMeta>0?(op.totalRealizado/op.totalMeta*100):null;
    const saldo = op.totalRealizado-op.totalMeta;
    const bateu   = opPct!==null&&opPct>=100;
    const parcial = opPct!==null&&opPct>=80&&opPct<100;
    const bg     = bateu?'#14532d':parcial?'#78350f':'#7f1d1d';
    const border = bateu?'#22c55e':parcial?'#f59e0b':'#dc2626';
    const nc     = bateu?'#86efac':parcial?'#fde68a':'#fca5a5';
    const barPct = Math.min(opPct??0,120);
    h += '<div class="op-card" style="background:'+bg+';border-color:'+border+';box-shadow:0 0 14px '+border+'55">'+
         '<div style="display:flex;justify-content:space-between;align-items:center">'+
         '<div style="font-size:13px;font-weight:800;color:#fff">'+op.operadorNome+'</div>'+
         '<div style="font-size:20px;color:'+border+'">'+( bateu?'✓':parcial?'~':'✗')+'</div></div>'+
         '<div style="display:flex;gap:10px">'+
         numCol('REAL.',op.totalRealizado,'#fff')+
         numCol('META',op.totalMeta,'rgba(255,255,255,.5)')+
         numCol('SALDO',(saldo>=0?'+':'')+saldo,nc)+
         '</div>'+
         '<div><div style="display:flex;justify-content:space-between;margin-bottom:3px">'+
         '<div style="font-size:9px;color:rgba(255,255,255,.5);font-weight:700">EFICIÊNCIA</div>'+
         '<div style="font-size:12px;font-weight:900;color:'+nc+'">'+(opPct!==null?opPct.toFixed(1)+'%':'—')+'</div></div>'+
         '<div class="progress-bar"><div class="progress-fill" style="width:'+barPct+'%;background:'+border+'"></div></div>'+
         '</div></div>';
  });
  h += '</div>';
  document.getElementById('detail').innerHTML = h;

  // Chart
  if (e.porOperador.length>0) {
    const ctx = document.getElementById('chartOps');
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctx, {
      type:'bar',
      data:{
        labels: e.porOperador.map(o=>o.operadorNome),
        datasets:[
          { label:'Realizado', data:e.porOperador.map(o=>o.totalRealizado), backgroundColor:c.bar, borderRadius:5, barPercentage:.6 },
          { label:'Saldo', data:e.porOperador.map(o=>o.totalRealizado-o.totalMeta),
            backgroundColor:e.porOperador.map(o=>o.totalRealizado-o.totalMeta>=0?'rgba(134,239,172,.8)':'rgba(252,165,165,.8)'),
            borderRadius:5, barPercentage:.6 },
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ font:{size:12}, color:'#334155' } } },
        scales:{
          y:{ beginAtZero:true, ticks:{color:'#475569',font:{size:12}}, grid:{color:'#e2e8f0'} },
          x:{ ticks:{color:'#475569',font:{size:12}}, grid:{display:false} }
        }
      }
    });
  }
}

function numCol(label, value, color) {
  return '<div style="border-left:1px solid rgba(255,255,255,.15);padding-left:8px;first-child:border-left:none">'+
         '<div style="font-size:9px;color:rgba(255,255,255,.5);font-weight:700">'+label+'</div>'+
         '<div style="font-size:24px;font-weight:900;color:'+color+';line-height:1">'+value+'</div></div>';
}

function selecionar(i) {
  etapaAtiva = DADOS.etapas[i];
  render();
}

render();
setTimeout(() => location.reload(), 60000);
</` + `script>
</body>
</html>`;
}
