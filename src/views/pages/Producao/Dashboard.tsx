import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { DashboardPorEtapasData, EtapaResumo, DadosPorOperador } from '../../../shared/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ─── Grade de faixas de horário (fonte da verdade) ────────────────────────────

const FAIXAS_BASE = [
  { inicio: [7, 12],  fim: [8,  0]  },
  { inicio: [8,  0],  fim: [9,  0]  },
  { inicio: [9, 15],  fim: [10, 0]  },
  { inicio: [10, 0],  fim: [11, 0]  },
  { inicio: [11, 0],  fim: [12, 0]  },
  { inicio: [13, 0],  fim: [14, 0]  },
  { inicio: [14, 0],  fim: [15, 0]  },
  { inicio: [15, 0],  fim: [16, 0], fimSexta: [16, 12] },
  { inicio: [16, 0],  fim: [17, 12] },
] as const;

function pad(n: number) { return String(n).padStart(2, '0'); }

function faixaLabel(f: typeof FAIXAS_BASE[number], sexta: boolean): string {
  const fim = 'fimSexta' in f && sexta ? f.fimSexta : f.fim;
  return `${pad(f.inicio[0])}:${pad(f.inicio[1])} - ${pad(fim[0])}:${pad(fim[1])}`;
}

function todasAsFaixas(sexta: boolean): string[] {
  return FAIXAS_BASE.map(f => faixaLabel(f, sexta));
}

function faixaAtual(): string {
  const agora  = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const sexta  = agora.getDay() === 5;

  for (const f of FAIXAS_BASE) {
    const ini = f.inicio[0] * 60 + f.inicio[1];
    const fim = ('fimSexta' in f && sexta ? f.fimSexta : f.fim) as [number, number];
    const fimMin = fim[0] * 60 + fim[1];
    if (minutos >= ini && minutos < fimMin) return faixaLabel(f, sexta);
  }
  return todasAsFaixas(sexta)[0]; // fora do expediente → primeira faixa
}

const CARROSSEL_INTERVALO_MS = 1 * 60 * 1000; // 2 minutos

// ─── Paleta ───────────────────────────────────────────────────────────────────

const COR_ETAPA: Record<string, { bg: string; text: string; bar: string }> = {
  Montagem: { bg: '#1d4ed8', text: '#fff', bar: 'rgba(59,130,246,0.85)'  },
  Soldagem: { bg: '#15803d', text: '#fff', bar: 'rgba(34,197,94,0.85)'   },
  Revisao:  { bg: '#7e22ce', text: '#fff', bar: 'rgba(168,85,247,0.85)'  },
  Firmware: { bg: '#b45309', text: '#fff', bar: 'rgba(245,158,11,0.85)'  },
  IMEI:     { bg: '#0e7490', text: '#fff', bar: 'rgba(6,182,212,0.85)'   },
};
const COR_DEFAULT = { bg: '#374151', text: '#fff', bar: 'rgba(107,114,128,0.85)' };

function corEtapa(etapa: string) {
  return COR_ETAPA[etapa] ?? COR_DEFAULT;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Vazio({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16 }}>
      Sem registros para esta faixa de horário
    </div>
  );
}

function BadgeFaixa({ faixa }: { faixa: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#0f2542', borderRadius: 8, padding: '5px 16px',
      border: '2px solid #3b82f6',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', letterSpacing: 1.5 }}>FAIXA</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
        {faixa}
      </div>
    </div>
  );
}

function EtapaHeader({ etapa, produto, totalRealizado, pctAtingimento }: EtapaResumo) {
  const cor = corEtapa(etapa);
  const pctColor = pctAtingimento !== null
    ? pctAtingimento >= 100 ? '#86efac'
    : pctAtingimento >= 80  ? '#fde68a'
    : '#fca5a5'
    : 'rgba(255,255,255,0.5)';

  return (
    <div style={{
      background: cor.bg, color: cor.text, borderRadius: 10,
      padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 1.5, lineHeight: 1 }}>
          {etapa.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
          {produto}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '8px 10px', minHeight: 54 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 4 }}>REALIZADO</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {totalRealizado.toLocaleString('pt-BR')}
          </div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '8px 10px', minHeight: 54 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 4 }}>EFICIÊNCIA</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: pctColor, lineHeight: 1 }}>
            {pctAtingimento !== null ? `${pctAtingimento.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardOperador({ op }: { op: DadosPorOperador }) {
  const pct   = op.totalMeta > 0 ? (op.totalRealizado / op.totalMeta) * 100 : null;
  const saldo = op.totalRealizado - op.totalMeta;
  const bateu = pct !== null && pct >= 100;

  const parcial = pct !== null && pct >= 80 && pct < 100;

  const bg       = bateu  ? '#14532d' : parcial ? '#78350f' : '#7f1d1d';
  const border   = bateu  ? '#22c55e' : parcial ? '#f59e0b' : '#dc2626';
  const numColor = bateu  ? '#86efac' : parcial ? '#fde68a' : '#fca5a5';
  const icon     = bateu  ? '✓'       : parcial ? '~'       : '✗';
  const barPct = Math.min(pct ?? 0, 120);

  return (
    <div style={{
      background: bg, borderRadius: 12, border: `3px solid ${border}`,
      padding: '14px 16px', minWidth: 160, flex: '1 1 160px',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: `0 0 16px ${border}55`,
    }}>
      {/* Nome + ícone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
          {op.operadorNome}
        </div>
        <div style={{ fontSize: 24, lineHeight: 1, color: border }}>{icon}</div>
      </div>

      {/* Números */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 0.8 }}>REAL.</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{op.totalRealizado}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 0.8 }}>META</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{op.totalMeta}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 10 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 0.8 }}>SALDO</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: numColor, lineHeight: 1 }}>
            {saldo >= 0 ? `+${saldo}` : saldo}
          </div>
        </div>
      </div>

      {/* Barra de eficiência */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>EFICIÊNCIA</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: numColor }}>
            {pct !== null ? `${pct.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div style={{ height: 12, background: 'rgba(0,0,0,0.35)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${barPct}%`,
            background: border, borderRadius: 6,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

function BarOperadores({ operadores, corBarra }: { operadores: DadosPorOperador[]; corBarra: string }) {
  const data = {
    labels: operadores.map(o => o.operadorNome),
    datasets: [
      {
        label: 'Realizado',
        data: operadores.map(o => o.totalRealizado),
        backgroundColor: corBarra,
        borderRadius: 6, barPercentage: 0.6,
      },
      {
        label: 'Saldo',
        data: operadores.map(o => o.totalRealizado - o.totalMeta),
        backgroundColor: operadores.map(o =>
          o.totalRealizado - o.totalMeta >= 0 ? 'rgba(134,239,172,0.8)' : 'rgba(252,165,165,0.8)'
        ),
        borderRadius: 6, barPercentage: 0.6,
      },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 13 }, padding: 14, color: '#334155' } },
      tooltip: {
        titleFont: { size: 13 }, bodyFont: { size: 13 },
        callbacks: { afterLabel: (ctx: any) => `Meta: ${operadores[ctx.dataIndex].totalMeta}` },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 13 }, color: '#475569' } },
      x: { grid: { display: false },                       ticks: { font: { size: 13 }, color: '#475569' } },
    },
  };

  return <Bar data={data} options={options} />;
}

function BarConsolidado({ etapas }: { etapas: EtapaResumo[] }) {
  const data = {
    labels: etapas.map(e => e.etapa.toUpperCase()),
    datasets: [
      {
        label: 'Realizado',
        data: etapas.map(e => e.totalRealizado),
        backgroundColor: etapas.map(e => corEtapa(e.etapa).bar),
        borderRadius: 6, barPercentage: 0.5,
      },
      {
        label: 'Meta',
        data: etapas.map(e => e.totalMeta),
        backgroundColor: 'rgba(148,163,184,0.5)',
        borderRadius: 6, barPercentage: 0.5,
      },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, padding: 10, color: '#334155' } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 }, color: '#475569' } },
      x: { grid: { display: false },                       ticks: { font: { size: 11 }, color: '#475569' } },
    },
  };

  return <Bar data={data} options={options} />;
}

function DonutSetores({ etapas }: { etapas: EtapaResumo[] }) {
  const total = etapas.reduce((s, e) => s + e.totalRealizado, 0);

  const data = {
    labels: etapas.map(e => e.etapa.toUpperCase()),
    datasets: [{
      data: etapas.map(e => e.totalRealizado),
      backgroundColor: etapas.map(e => corEtapa(e.etapa).bar),
      borderWidth: 2, borderColor: '#f1f5f9',
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { font: { size: 11 }, boxWidth: 12, padding: 10, color: '#334155' } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${ctx.parsed} pçs (${pct}%)`;
          },
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProducaoDashboard({ standalone = false }: { standalone?: boolean }) {
  const today  = new Date().toISOString().slice(0, 10);
  const sexta  = new Date().getDay() === 5;
  const faixas = todasAsFaixas(sexta);

  const [data, setData]                         = useState(today);
  const [produtoInput, setProduto]              = useState('');
  const [faixaSelecionada, setFaixaSelecionada] = useState<string>(faixaAtual());
  const [dados, setDados]                       = useState<DashboardPorEtapasData | null>(null);
  const [dadosDia, setDadosDia]                 = useState<DashboardPorEtapasData | null>(null); // totais sem filtro de bloco
  const [loading, setLoading]                   = useState(false);
  const [erro, setErro]                         = useState<string | null>(null);
  const [etapaSelecionada, setEtapaSelecionada] = useState<EtapaResumo | null>(null);
  const [isFullscreen, setIsFullscreen]         = useState(false);
  const [rotacaoAtiva, setRotacaoAtiva]         = useState(false);

  const rootRef    = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const etapasRef  = useRef<EtapaResumo[]>([]);
  const indiceRef  = useRef(0);

  // etapasRef é atualizado tanto pelo useEffect quanto diretamente no carregar
  // para evitar race condition entre setState assíncrono e setInterval
  useEffect(() => { etapasRef.current = dados?.etapas ?? []; }, [dados]);

  // ── Carrossel ────────────────────────────────────────────────────────────────
  const pararCarrossel = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRotacaoAtiva(false);
  }, []);

  const iniciarCarrossel = useCallback((etapas: EtapaResumo[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (etapas.length === 0) return;
    indiceRef.current = 0;
    setEtapaSelecionada(etapas[0]);
    setRotacaoAtiva(true);
    timerRef.current = setInterval(() => {
      indiceRef.current = (indiceRef.current + 1) % etapasRef.current.length;
      setEtapaSelecionada(etapasRef.current[indiceRef.current]);
    }, CARROSSEL_INTERVALO_MS);
  }, []);

  useEffect(() => () => pararCarrossel(), [pararCarrossel]);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11' || e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  // ── Dados ────────────────────────────────────────────────────────────────────
  const carregar = useCallback(async (d: string, prod: string, faixa: string) => {
    setErro(null);
    setLoading(true);
    pararCarrossel();
    setEtapaSelecionada(null);
    try {
      const api = window.api as typeof window.api & {
        getDashboardPorEtapas: (d: string, p?: string, h?: string) => Promise<any>;
      };
      // Busca filtrada por bloco (para o painel de detalhe e carrossel)
      const [resFaixa, resDia] = await Promise.all([
        api.getDashboardPorEtapas(d, prod || undefined, faixa),
        api.getDashboardPorEtapas(d, prod || undefined, undefined),
      ]);
      if (!resFaixa.success) throw new Error(resFaixa.error);
      if (!resDia.success)   throw new Error(resDia.error);
      const payload    = resFaixa.data as DashboardPorEtapasData;
      const payloadDia = resDia.data   as DashboardPorEtapasData;
      etapasRef.current = payload.etapas;
      setDados(payload);
      setDadosDia(payloadDia);
      iniciarCarrossel(payload.etapas);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [pararCarrossel, iniciarCarrossel]);

  useEffect(() => { carregar(today, '', faixaAtual()); }, []);

  const selecionarManual = (etapa: EtapaResumo) => {
    pararCarrossel();
    setEtapaSelecionada(etapa);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const totalGeral = dados?.totalGeral;
  const pctGeral   = totalGeral && totalGeral.meta > 0
    ? (totalGeral.realizado / totalGeral.meta) * 100 : null;

  return (
    <div ref={rootRef} style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f1f5f9', fontFamily: 'system-ui, sans-serif', fontSize: 15,
      overflow: 'hidden',
    }}>

      {/* ── Barra de controles ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '8px 16px', background: '#1e3a5f', flexWrap: 'wrap', flexShrink: 0,
      }}>

        <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
          PAINEL DE PRODUÇÃO
        </div>

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />

        {/* Badge da faixa de horário */}
        <BadgeFaixa faixa={faixaSelecionada} />

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />

        <div>
          <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>DATA</div>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 12, outline: 'none' }}
          />
        </div>

        <div>
          <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>PRODUTO</div>
          <input value={produtoInput} onChange={e => setProduto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar(data, produtoInput, faixaSelecionada)}
            placeholder="Todos"
            style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 12, outline: 'none', width: 110 }}
          />
        </div>

        <div>
          <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>FAIXA DE HORÁRIO</div>
          <select
            value={faixaSelecionada}
            onChange={e => setFaixaSelecionada(e.target.value)}
            style={{ padding: '3px 7px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 12, outline: 'none' }}
          >
            {faixas.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
          <button
            onClick={() => carregar(data, produtoInput, faixaSelecionada)}
            disabled={loading}
            style={{ padding: '5px 18px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>

          {rotacaoAtiva && (
            <button onClick={pararCarrossel}
              style={{ padding: '5px 12px', borderRadius: 4, border: '1px solid #f97316', background: 'transparent', color: '#fb923c', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
              ⏸ Pausar
            </button>
          )}

          {!rotacaoAtiva && dados && dados.etapas.length > 0 && (
            <button onClick={() => iniciarCarrossel(dados.etapas)}
              style={{ padding: '5px 12px', borderRadius: 4, border: '1px solid #22c55e', background: 'transparent', color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
              ▶ Carrossel
            </button>
          )}

          <button onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair (F11)' : 'Tela cheia (F11)'}
            style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#94a3b8', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center' }}>
            ⛶<span style={{ fontSize: 10, marginLeft: 4, color: '#64748b' }}>F11</span>
          </button>

          {standalone && (
            <button onClick={() => window.api.closeProductionWindow()}
              style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              Fechar
            </button>
          )}
        </div>

        {/* Pills de totais */}
        {dados && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 22, alignItems: 'center' }}>
            <TotalPill label="TOTAL REALIZADO" value={totalGeral?.realizado ?? 0} color="#86efac" />
            <TotalPill label="META TOTAL"      value={totalGeral?.meta      ?? 0} color="#93c5fd" />
            <TotalPill
              label="% GERAL"
              value={pctGeral !== null ? `${pctGeral.toFixed(1)}%` : '—'}
              color={pctGeral !== null ? pctGeral >= 100 ? '#86efac' : '#fca5a5' : '#94a3b8'}
              isString
            />
          </div>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>
          {erro}
          <button onClick={() => setErro(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 15 }}>✕</button>
        </div>
      )}

      {/* ── Layout Master-Detail ── */}
      <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: '300px', minWidth: '300px', height: '100%',
          overflowY: 'auto', padding: '12px 10px',
          background: '#e2e8f0', borderRight: '1px solid #cbd5e1',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {!loading && dadosDia && dadosDia.etapas.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
              Nenhum registro para esta data.
            </div>
          )}

          {dadosDia?.etapas.map(etapa => {
            const ativa = etapaSelecionada?.etapa === etapa.etapa;
            // seleciona a etapa filtrada por bloco (dados), não a do dia inteiro
            const etapaBloco = dados?.etapas.find(e => e.etapa === etapa.etapa) ?? etapa;
            return (
              <div
                key={etapa.etapa}
                onClick={() => selecionarManual(etapaBloco)}
                style={{
                  borderRadius: 10, cursor: 'pointer',
                  boxShadow: ativa ? `0 0 0 3px ${corEtapa(etapa.etapa).bg}` : '0 1px 4px rgba(0,0,0,0.10)',
                  opacity: ativa ? 1 : 0.7,
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  transform: ativa ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <EtapaHeader {...etapa} />
              </div>
            );
          })}

          {/* Consolidado */}
          {dadosDia && dadosDia.etapas.length >= 2 && (
            <div style={{ marginTop: 6, background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
                CONSOLIDADO
              </div>
              <div style={{ height: 160 }}><BarConsolidado etapas={dadosDia.etapas} /></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginTop: 12, marginBottom: 6 }}>
                PRODUÇÃO POR SETOR
              </div>
              <div style={{ height: 160 }}><DonutSetores etapas={dadosDia.etapas} /></div>
            </div>
          )}
        </div>

        {/* ── Painel de detalhe ── */}
        <div style={{ flex: 1, height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          {!etapaSelecionada ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
              <div style={{ fontSize: 48 }}>←</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Selecione uma etapa no menu lateral</div>
            </div>
          ) : (
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Cabeçalho: etapa + faixa em destaque */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
                background: corEtapa(etapaSelecionada.etapa).bg,
                borderRadius: 12, padding: '16px 24px',
              }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
                    {etapaSelecionada.etapa.toUpperCase()}
                  </div>
                  {etapaSelecionada.produto && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                      {etapaSelecionada.produto}
                    </div>
                  )}
                </div>

                {/* Faixa de horário em DESTAQUE no header */}
                <div style={{
                  background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                  padding: '10px 20px', textAlign: 'right',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 2 }}>
                    FAIXA DE HORÁRIO
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>
                    {faixaSelecionada}
                  </div>
                </div>
              </div>

              {/* Gráfico */}
              <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, letterSpacing: 0.5 }}>
                  REALIZADO × SALDO POR OPERADOR — {faixaSelecionada}
                </div>
                <div style={{ height: 240 }}>
                  {etapaSelecionada.porOperador.some(o => o.totalRealizado > 0 || o.totalMeta > 0)
                    ? <BarOperadores operadores={etapaSelecionada.porOperador} corBarra={corEtapa(etapaSelecionada.etapa).bar} />
                    : <Vazio height={240} />
                  }
                </div>
              </div>

              {/* Cards de operadores */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, letterSpacing: 0.5 }}>
                  DETALHE POR OPERADOR — {faixaSelecionada}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {etapaSelecionada.porOperador.map(op => (
                    <CardOperador key={op.operadorNome} op={op} />
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Pill de total ────────────────────────────────────────────────────────────

function TotalPill({ label, value, color, isString }: {
  label: string; value: number | string; color: string; isString?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>
        {isString ? value : (value as number).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
