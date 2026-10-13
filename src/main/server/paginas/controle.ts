export function pageControle(): string {
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

/* O que já existe (dias e cartões) */
.existentes{padding:14px;display:flex;flex-direction:column;gap:10px}
.ex-titulo{font-size:11px;font-weight:800;color:#475569;letter-spacing:1px}
.ex-vazio{color:#94a3b8;font-size:13px}
.ex-dias{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.ex-dia{flex:0 0 auto;min-width:100px;text-align:left;cursor:pointer;padding:8px 10px;border-radius:8px;background:#fff;border:1px solid #cbd5e1;color:#0f172a}
.ex-dia.ativo{border:2px solid #2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.ex-dia small{display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}
.ex-dia b{display:block;font-size:16px;font-weight:800;line-height:1.1}
.ex-cartoes{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.ex-cartao{text-align:left;cursor:pointer;padding:0;overflow:hidden;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.ex-cartao-topo{color:#fff;padding:8px 12px}
.ex-cartao-topo b{display:block;font-size:13px;letter-spacing:1px}
.ex-cartao-topo span{font-size:11px;opacity:.75}
.ex-cartao-base{padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:#475569}
.ex-cartao-base strong{font-size:22px;font-weight:900}

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
    <div class="field"><label>PRODUTO</label>
      <select id="dash-produto" style="min-width:140px"><option value="">Todos</option></select>
    </div>
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
    <div class="field"><label>PRODUTO</label><select id="inp-produto" style="min-width:150px"></select></div>
    <div class="field"><label>ETAPA</label><select id="inp-etapa"></select></div>
    <div class="field" id="campo-variacao" style="display:none"><label>VARIAÇÃO</label><select id="inp-variacao"></select></div>
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
  <select id="sel-novo-op" style="width:170px;display:inline-block;vertical-align:middle;padding:6px 8px;font-size:13px"></select>
  <button class="btn btn-blue" id="btn-add-op">+ Operador</button>
</div>

<!-- Barra de erro -->
<div id="erro-bar" style="display:none" class="erro">
  <span id="erro-msg"></span>
  <button id="btn-fechar-erro" style="background:none;border:none;cursor:pointer;font-size:18px;color:#991b1b;padding:0 4px">✕</button>
</div>

<!-- O que já existe (visível quando nenhum cartão está aberto) -->
<div id="empty-state" class="existentes">
  <div class="ex-titulo">DIAS COM REGISTRO</div>
  <div id="ex-dias" class="ex-dias"></div>
  <div class="ex-titulo" id="ex-titulo-dia"></div>
  <div id="ex-cartoes" class="ex-cartoes"></div>
</div>

<!-- Ficha carregada -->
<div id="ficha-wrap" style="display:none">
  <div class="ficha-header">
    <button class="btn btn-slate" id="btn-voltar" style="padding:3px 9px;font-size:11px">← Cartões do dia</button>
    <span id="ficha-titulo" style="flex:1;margin-left:10px"></span>
    <span id="ficha-data-span" class="ficha-data"></span>
    <button class="btn btn-red" id="btn-excluir-cartao" style="padding:3px 9px;font-size:11px;margin-left:10px">Excluir cartão</button>
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
let CAD = { operadores: [], produtos: [], etapas: [] };
const DRAFT  = {}; // DRAFT[opId][bloco] = {meta, realizado}
const SAVING = new Set();
const SAVED  = new Set();

// ── Helpers ───────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function rotuloProduto(nome, versao) { return versao ? nome+' '+versao : nome; }
function rotuloFicha(f) { return f.variacao ? f.etapa+' · '+f.variacao : f.etapa; }

function apiCall(method, path, body) {
  return fetch(path, {
    method,
    headers: body ? {'Content-Type':'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}
function mostrarErro(msg) {
  $('erro-msg').textContent = msg;
  $('erro-bar').style.display = 'flex';
}
function esconderErro() { $('erro-bar').style.display = 'none'; }

// ── Init ──────────────────────────────────────────────────────────────────────
const hoje = new Date().toISOString().slice(0,10);
$('inp-data').value  = hoje;
$('dash-data').value = hoje;
$('dash-faixa').value = faixaAtual();

// ── Cadastros (listas dos seletores) ──────────────────────────────────────────
async function carregarCadastros() {
  const res = await apiCall('GET', '/api/cadastros');
  if (!res.success) { mostrarErro(res.error || 'Não foi possível carregar os cadastros.'); return; }
  CAD = res.data;

  const produtos = CAD.produtos.map(p => '<option value="'+p.id+'">'+esc(rotuloProduto(p.nome, p.versao))+'</option>').join('');
  $('inp-produto').innerHTML  = produtos;
  $('dash-produto').innerHTML = '<option value="">Todos</option>' + produtos;
  $('inp-etapa').innerHTML = CAD.etapas.map(e => '<option value="'+e.id+'">'+esc(e.nome)+'</option>').join('');
  preencherVariacoes();
  atualizarSeletorOperador();
}

function preencherVariacoes() {
  const etapa = CAD.etapas.find(e => e.id === +$('inp-etapa').value);
  const variacoes = etapa ? etapa.variacoes : [];
  $('inp-variacao').innerHTML = '<option value="">— sem variação —</option>' +
    variacoes.map(v => '<option value="'+v.id+'">'+esc(v.nome)+'</option>').join('');
  $('campo-variacao').style.display = variacoes.length ? '' : 'none';
  $('inp-variacao').value = variacoes.length ? String(variacoes[0].id) : '';
}
$('inp-etapa').addEventListener('change', preencherVariacoes);

function atualizarSeletorOperador() {
  const sel = $('sel-novo-op');
  const escalados = new Set(FICHA ? FICHA.operadores.map(o => o.operadorId) : []);
  const livres = CAD.operadores.filter(o => !escalados.has(o.id));
  sel.innerHTML = livres.length
    ? livres.map(o => '<option value="'+o.id+'">'+esc(o.nome)+'</option>').join('')
    : '<option value="">Nenhum operador disponível</option>';
  $('btn-add-op').disabled = livres.length === 0;
}

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
$('btn-atualizar-painel').addEventListener('click', async () => {
  const data      = $('dash-data').value;
  const produtoId = $('dash-produto').value ? +$('dash-produto').value : null;
  const faixa     = $('dash-faixa').value;
  const status    = $('dash-status');
  try {
    const res = await apiCall('POST', '/api/dashboard/comando', { type:'refresh', data, produtoId, faixa });
    status.textContent = res.success ? '✓ Painel atualizado' : ('Erro: '+(res.error||''));
    status.style.color = res.success ? '#86efac' : '#fca5a5';
  } catch(e) {
    status.textContent = '✓ Comando enviado';
    status.style.color = '#86efac';
  }
  setTimeout(() => { status.textContent = ''; }, 3000);
});

// ── Consulta / Criação ────────────────────────────────────────────────────────
function filtrosDaFicha() {
  return {
    data: $('inp-data').value,
    produtoId: $('inp-produto').value ? +$('inp-produto').value : null,
    etapaId: $('inp-etapa').value ? +$('inp-etapa').value : null,
    variacaoId: $('inp-variacao').value ? +$('inp-variacao').value : null,
  };
}

$('btn-consultar').addEventListener('click', async () => {
  esconderErro();
  const f = filtrosDaFicha();
  if (!f.data||!f.produtoId||!f.etapaId) { mostrarErro('Preencha data, produto e etapa.'); return; }
  let url = '/api/producao/ficha?data='+encodeURIComponent(f.data)+'&produtoId='+f.produtoId+'&etapaId='+f.etapaId;
  if (f.variacaoId) url += '&variacaoId='+f.variacaoId;
  const res = await apiCall('GET', url);
  if (!res.success) { mostrarErro(res.error); return; }
  if (!res.data)    { mostrarErro('Nenhuma ficha encontrada.'); return; }
  carregarFicha(res.data);
});

$('btn-abrir').addEventListener('click', async () => {
  esconderErro();
  const f = filtrosDaFicha();
  const metaHoraPadrao = parseInt($('inp-meta').value)||40;
  if (!f.data||!f.produtoId||!f.etapaId) { mostrarErro('Preencha data, produto e etapa.'); return; }
  const res = await apiCall('POST','/api/producao/ficha',{ data:f.data, produtoId:f.produtoId, etapaId:f.etapaId, variacaoId:f.variacaoId, metaHoraPadrao });
  if (!res.success) { mostrarErro(res.error); return; }
  carregarFicha(res.data);
});

$('btn-fechar-erro').addEventListener('click', esconderErro);

function carregarFicha(ficha) {
  FICHA = ficha;
  Object.keys(DRAFT).forEach(k => delete DRAFT[k]);
  SAVING.clear(); SAVED.clear();
  renderTudo();
}

// ── O que já existe: dias com registro e cartões do dia ───────────────────────
const COR_CARTAO = {
  Montagem:'#1d4ed8', Soldagem:'#15803d', Retrabalho:'#be123c', 'Revisão':'#7e22ce',
  'Gravação':'#b45309', Firmware:'#b45309', IMEI:'#0e7490', Serial:'#a21caf'
};
function corCartao(c) { return COR_CARTAO[c.variacao] || COR_CARTAO[c.etapa] || '#483751'; }
function rotuloDia(data) {
  const p = data.split('-').map(Number);
  const d = new Date(p[0], p[1]-1, p[2], 12);
  return { curto: String(p[2]).padStart(2,'0')+'/'+String(p[1]).padStart(2,'0'),
           semana: d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','') };
}

async function carregarExistentes() {
  const data = $('inp-data').value;
  const rd = rotuloDia(data || hoje);
  $('ex-titulo-dia').textContent = 'CARTÕES DE '+rd.semana.toUpperCase()+' '+rd.curto;
  const [dias, cartoes] = await Promise.all([
    apiCall('GET', '/api/producao/dias'),
    apiCall('GET', '/api/producao/cartoes?data='+encodeURIComponent(data)),
  ]);
  if (!dias.success || !cartoes.success) { mostrarErro(dias.error || cartoes.error); return; }

  $('ex-dias').innerHTML = dias.data.length ? dias.data.map(d => {
    const r = rotuloDia(d.data), p = calcPct(d.totalRealizado, d.totalMeta);
    return '<button class="ex-dia'+(d.data===data?' ativo':'')+'" data-action="dia" data-data="'+d.data+'">'+
           '<small>'+esc(r.semana)+'</small><b>'+r.curto+'</b>'+
           '<span style="font-size:11px;color:#64748b">'+d.cartoes+(d.cartoes===1?' cartão':' cartões')+'</span>'+
           '<span style="display:block;font-size:12px;font-weight:800;color:'+corPct(p)+'">'+(p!==null?p.toFixed(0)+'%':'—')+'</span></button>';
  }).join('') : '<div class="ex-vazio">Ainda não há registros. Escolha os filtros acima e clique em "Abrir / Criar".</div>';

  $('ex-cartoes').innerHTML = cartoes.data.length ? cartoes.data.map(c => {
    return '<button class="ex-cartao" data-action="abrir-cartao" data-id="'+c.fichaId+'">'+
           '<div class="ex-cartao-topo" style="background:'+corCartao(c)+'"><b>'+esc(c.rotulo.toUpperCase())+'</b><span>'+esc(c.produto)+'</span></div>'+
           '<div class="ex-cartao-base"><div>'+c.operadores+(c.operadores===1?' operador':' operadores')+'<br/><b style="color:#0f172a">'+c.totalRealizado+'</b> de '+c.totalMeta+'</div>'+
           '<strong style="color:'+corPct(c.pctAtingimento)+'">'+(c.pctAtingimento!==null?c.pctAtingimento.toFixed(0)+'%':'—')+'</strong></div></button>';
  }).join('') : '<div class="ex-vazio">Nenhum cartão neste dia. Escolha produto e etapa acima e clique em "Abrir / Criar" para começar um novo.</div>';
}

async function abrirCartao(id) {
  esconderErro();
  const res = await apiCall('GET', '/api/producao/ficha/'+id);
  if (!res.success) { mostrarErro(res.error); return; }
  const f = res.data;
  // Ajusta os filtros para o cartão aberto
  $('inp-data').value = f.data;
  $('inp-produto').value = String(f.produtoId);
  $('inp-etapa').value = String(f.etapaId);
  preencherVariacoes();
  $('inp-variacao').value = f.variacaoId ? String(f.variacaoId) : '';
  carregarFicha(f);
}

function mostrarLista() {
  FICHA = null;
  $('ficha-wrap').style.display = 'none';
  $('info-bar').style.display = 'none';
  $('empty-state').style.display = '';
  carregarExistentes();
}
$('btn-voltar').addEventListener('click', mostrarLista);

$('btn-excluir-cartao').addEventListener('click', async () => {
  if (!FICHA) return;
  const ops = FICHA.operadores.length;
  const regs = FICHA.operadores.reduce((s,o) => s+(o.registros||[]).length, 0);
  const msg = 'Excluir o cartão '+rotuloFicha(FICHA)+' · '+rotuloProduto(FICHA.produto, FICHA.produtoVersao)+' de '+FICHA.data+'?'+
    '\\n\\nSerá apagado definitivamente, junto com ele:'+
    '\\n• '+ops+(ops===1?' operador escalado':' operadores escalados')+
    '\\n• '+regs+(regs===1?' registro hora a hora':' registros hora a hora')+
    '\\n\\nNão há como desfazer.';
  if (!window.confirm(msg)) return;
  const res = await apiCall('DELETE', '/api/producao/ficha/'+FICHA.id);
  if (!res.success) { mostrarErro(res.error); return; }
  mostrarLista();
});

$('inp-data').addEventListener('change', () => { if (!FICHA) carregarExistentes(); });

// ── Operadores ────────────────────────────────────────────────────────────────
$('btn-add-op').addEventListener('click', addOperador);

async function addOperador() {
  if (!FICHA) return;
  const operadorId = +$('sel-novo-op').value;
  if (!operadorId) return;
  const res = await apiCall('POST','/api/producao/operador',{fichaId:FICHA.id,operadorId});
  if (!res.success) { mostrarErro(res.error); return; }
  FICHA.operadores.push({...res.data, registros:[]});
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
$('inp-meta-padrao').addEventListener('change', async function() {
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
  if (action==='abrir-cartao')   abrirCartao(+btn.dataset.id);
  if (action==='dia')            { $('inp-data').value = btn.dataset.data; carregarExistentes(); }
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
  $('empty-state').style.display = 'none';
  $('ficha-wrap').style.display  = 'block';
  $('info-bar').style.display    = 'flex';
  $('info-id').textContent       = '#'+FICHA.id;
  $('inp-meta-padrao').value     = FICHA.metaHoraPadrao;
  $('ficha-titulo').textContent  = 'CONTROLE DE PRODUÇÃO — '+rotuloFicha(FICHA).toUpperCase()+' | '+rotuloProduto(FICHA.produto, FICHA.produtoVersao).toUpperCase();
  $('ficha-data-span').textContent = FICHA.data;
  atualizarSeletorOperador();
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
    h += '<th colspan="4" style="background:'+cor+';color:#fff;min-width:190px">'+esc(op.operadorNome)+
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
  $('table-wrap').innerHTML = h;
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
  $('mobile-cards').innerHTML = h;
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
    '<div class="op-name">'+esc(op.operadorNome)+'</div>'+
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

carregarCadastros();
carregarExistentes();

})();
</script>
</body>
</html>`;
}
