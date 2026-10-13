import { rotuloProduto } from '../../../shared/rotulos';
import type { DashboardPorEtapasData, Produto } from '../../../shared/types';

export interface OpcoesPaginaDashboard {
  data: string;
  produtoId: number | null;
  faixa: string;
  dados: DashboardPorEtapasData | null;
  erro?: string;
  produtos: Produto[];
}

const FAIXAS = [
  '07:12 - 08:00', '08:00 - 09:00', '09:15 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
  '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:12',
];

function escHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function jsonParaScript(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

export function pageDashboard(o: OpcoesPaginaDashboard): string {
  const opcoesProduto = o.produtos
    .map((p) => `<option value="${p.id}"${o.produtoId === p.id ? ' selected' : ''}>${escHtml(rotuloProduto(p.nome, p.versao))}</option>`)
    .join('');
  const opcoesFaixa = FAIXAS
    .map((f) => `<option value="${f}"${o.faixa === f ? ' selected' : ''}>${f}</option>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Dashboard de Produção</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
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
    <input type="date" name="data" value="${escHtml(o.data)}"/>
    <select name="produtoId" style="min-width:130px">
      <option value="">Todos os produtos</option>
      ${opcoesProduto}
    </select>
    <select name="faixa">
      <option value="">Dia inteiro</option>
      ${opcoesFaixa}
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
const DADOS = ${jsonParaScript(o.dados)};
const ERRO = ${jsonParaScript(o.erro ?? null)};
const FAIXA = ${jsonParaScript(o.faixa || 'Dia inteiro')};

// Cor pela variação (ex.: Firmware, IMEI) e, se não houver, pela etapa.
const COR = {
  Montagem:  { bg:'#1d4ed8', bar:'rgba(59,130,246,.85)'  },
  Soldagem:  { bg:'#15803d', bar:'rgba(34,197,94,.85)'   },
  Retrabalho:{ bg:'#be123c', bar:'rgba(244,63,94,.85)'   },
  'Revisão': { bg:'#7e22ce', bar:'rgba(168,85,247,.85)'  },
  'Gravação':{ bg:'#b45309', bar:'rgba(245,158,11,.85)'  },
  Firmware:  { bg:'#b45309', bar:'rgba(245,158,11,.85)'  },
  IMEI:      { bg:'#0e7490', bar:'rgba(6,182,212,.85)'   },
  Serial:    { bg:'#a21caf', bar:'rgba(217,70,239,.85)'  },
};
const COR_DEF = { bg:'#483751', bar:'rgba(107,114,128,.85)' };
function cor(e){ return COR[e.variacao]||COR[e.etapa]||COR_DEF; }
function pctColor(p){ return p===null?'#94a3b8':p>=100?'#86efac':p>=80?'#fde68a':'#fca5a5'; }
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let etapaAtiva = DADOS && DADOS.etapas.length ? DADOS.etapas[0] : null;
let chartBar = null;

function render() {
  if (!DADOS) {
    document.getElementById('detail').innerHTML = '<div class="empty">'+esc(ERRO || 'Erro ao carregar dados.')+'</div>';
    return;
  }
  const tot = DADOS.totalGeral;
  const gp  = tot.meta>0?(tot.realizado/tot.meta*100):null;

  // KPI bar
  document.getElementById('kpi-bar').innerHTML =
    kpi('REALIZADO', tot.realizado.toLocaleString('pt-BR'), gp!==null&&gp>=100?'#16a34a':'#1e293b')+
    kpi('META', tot.meta.toLocaleString('pt-BR'), '#3b82f6')+
    kpi('EFICIÊNCIA', gp!==null?gp.toFixed(1)+'%':'—', gp!==null?gp>=100?'#16a34a':gp>=80?'#d97706':'#dc2626':'#94a3b8')+
    kpi('PRODUTO', esc(DADOS.produto), '#1e293b', '14px')+
    kpi('ETAPAS', DADOS.etapas.length, '#1e293b');

  // Sidebar
  let sb = '';
  DADOS.etapas.forEach((e,i) => {
    const c  = cor(e);
    const pc = e.totalMeta>0?(e.totalRealizado/e.totalMeta*100):null;
    const ativa = etapaAtiva && etapaAtiva.fichaId===e.fichaId;
    sb += '<div class="etapa-card'+(ativa?' ativa':'')+'" style="background:'+c.bg+'" onclick="selecionar('+i+')">'+
          '<div class="etapa-nome">'+esc(e.rotulo.toUpperCase())+'</div>'+
          '<div style="font-size:11px;opacity:.6;margin-top:2px">'+esc(e.produto)+'</div>'+
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
  const c  = cor(e);

  let h = '<div class="detail-header" style="background:'+c.bg+'">'+
    '<div><div style="font-size:24px;font-weight:900;letter-spacing:2px">'+esc(e.rotulo.toUpperCase())+'</div>'+
    '<div style="font-size:11px;opacity:.65;margin-top:2px">'+esc(e.produto)+'</div></div>'+
    '<div style="background:rgba(0,0,0,.25);border-radius:8px;padding:8px 14px;text-align:right;border:2px solid rgba(255,255,255,.3)">'+
    '<div style="font-size:9px;font-weight:700;opacity:.6;letter-spacing:2px">FAIXA</div>'+
    '<div style="font-size:18px;font-weight:900;color:#fff;letter-spacing:2px">'+esc(FAIXA)+'</div></div></div>';

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
         '<div style="font-size:13px;font-weight:800;color:#fff">'+esc(op.operadorNome)+'</div>'+
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
  return '<div style="border-left:1px solid rgba(255,255,255,.15);padding-left:8px">'+
         '<div style="font-size:9px;color:rgba(255,255,255,.5);font-weight:700">'+label+'</div>'+
         '<div style="font-size:24px;font-weight:900;color:'+color+';line-height:1">'+value+'</div></div>';
}

function selecionar(i) {
  etapaAtiva = DADOS.etapas[i];
  render();
}

render();
setTimeout(() => location.reload(), 60000);
</script>
</body>
</html>`;
}
