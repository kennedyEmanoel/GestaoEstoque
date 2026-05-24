import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { DashboardPorEtapasData, EtapaResumo, DadosPorOperador } from '../../../shared/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ─── Paleta ───────────────────────────────────────────────────────────────────

const COR_ETAPA: Record<string, { bg: string; text: string; bar: string }> = {
  Montagem: { bg: '#1d4ed8', text: '#fff', bar: 'rgba(59,130,246,0.85)'  },
  Soldagem: { bg: '#15803d', text: '#fff', bar: 'rgba(34,197,94,0.85)'   },
  Revisao:  { bg: '#7e22ce', text: '#fff', bar: 'rgba(168,85,247,0.85)'  },
  Firmware: { bg: '#b45309', text: '#fff', bar: 'rgba(245,158,11,0.85)'  },
  IMEI:     { bg: '#0e7490', text: '#fff', bar: 'rgba(6,182,212,0.85)'   },
};
const COR_DEFAULT = { bg: '#374151', text: '#fff', bar: 'rgba(107,114,128,0.85)' };

const COR_OP = [
  '#3b82f6','#22c55e','#a855f7','#f97316',
  '#ef4444','#eab308','#06b6d4','#ec4899',
];

function corEtapa(etapa: string) {
  return COR_ETAPA[etapa] ?? COR_DEFAULT;
}

function corPct(pct: number | null): string {
  if (pct === null) return '#64748b';
  if (pct >= 100)   return '#16a34a';
  if (pct >= 80)    return '#d97706';
  return '#dc2626';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Vazio({ height = 160 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
      Sem registros para este período
    </div>
  );
}

/** Card de total no topo de cada seção de etapa */
function EtapaHeader({ etapa, totalRealizado, totalMeta, saldo, pctAtingimento }: EtapaResumo) {
  const cor = corEtapa(etapa);

  return (
    <div style={{
      background: cor.bg,
      color: cor.text,
      borderRadius: '8px 8px 0 0',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 32,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, minWidth: 110 }}>
        {etapa.toUpperCase()}
      </span>

      <Stat label="REALIZADO" value={totalRealizado.toLocaleString('pt-BR')} color="#fff" />
      <Stat label="META"      value={totalMeta.toLocaleString('pt-BR')}      color="rgba(255,255,255,0.7)" />
      <Stat
        label="SALDO"
        value={saldo >= 0 ? `+${saldo}` : String(saldo)}
        color={saldo >= 0 ? '#86efac' : '#fca5a5'}
      />
      <Stat
        label="% ATING."
        value={pctAtingimento !== null ? `${pctAtingimento.toFixed(1)}%` : '—'}
        color={pctAtingimento !== null
          ? pctAtingimento >= 100 ? '#86efac'
          : pctAtingimento >= 80  ? '#fde68a'
          : '#fca5a5'
          : 'rgba(255,255,255,0.5)'}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

/** Gráfico de barras: realizado por operador na etapa */
function BarOperadores({ operadores, corBarra }: { operadores: DadosPorOperador[]; corBarra: string }) {
  const data = {
    labels: operadores.map(o => o.operadorNome),
    datasets: [
      {
        label: 'Realizado',
        data: operadores.map(o => o.totalRealizado),
        backgroundColor: corBarra,
        borderRadius: 4,
        barPercentage: 0.6,
      },
      {
        label: 'Saldo',
        data: operadores.map(o => o.totalRealizado - o.totalMeta),
        backgroundColor: operadores.map(o =>
          o.totalRealizado - o.totalMeta >= 0
            ? 'rgba(134,239,172,0.8)'
            : 'rgba(252,165,165,0.8)'
        ),
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          afterLabel: (ctx: any) => {
            const op = operadores[ctx.dataIndex];
            return `Meta: ${op.totalMeta}`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  return <Bar data={data} options={options} />;
}

/** Rosca de distribuição de produção por operador */
function DonutOperadores({ operadores }: { operadores: DadosPorOperador[] }) {
  const total = operadores.reduce((s, o) => s + o.totalRealizado, 0);

  const data = {
    labels: operadores.map(o => o.operadorNome),
    datasets: [{
      data: operadores.map(o => o.totalRealizado),
      backgroundColor: COR_OP,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 12 } },
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

/** Gráfico de barras consolidado: Meta vs Realizado por etapa */
function BarConsolidado({ etapas }: { etapas: EtapaResumo[] }) {
  const data = {
    labels: etapas.map(e => e.etapa.toUpperCase()),
    datasets: [
      {
        label: 'Total Realizado',
        data: etapas.map(e => e.totalRealizado),
        backgroundColor: etapas.map(e => corEtapa(e.etapa).bar),
        borderRadius: 4,
        barPercentage: 0.5,
      },
      {
        label: 'Meta',
        data: etapas.map(e => e.totalMeta),
        backgroundColor: 'rgba(203,213,225,0.7)',
        borderRadius: 4,
        barPercentage: 0.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } },
    },
  };

  return <Bar data={data} options={options} />;
}

/** Rosca de distribuição de produção por setor (etapa) */
function DonutSetores({ etapas }: { etapas: EtapaResumo[] }) {
  const total = etapas.reduce((s, e) => s + e.totalRealizado, 0);

  const data = {
    labels: etapas.map(e => e.etapa.toUpperCase()),
    datasets: [{
      data: etapas.map(e => e.totalRealizado),
      backgroundColor: etapas.map(e => corEtapa(e.etapa).bar),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { font: { size: 12 }, boxWidth: 14 } },
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

export default function ProducaoDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [data, setData]           = useState(today);
  const [produtoInput, setProduto] = useState('');
  const [dados, setDados]          = useState<DashboardPorEtapasData | null>(null);
  const [loading, setLoading]      = useState(false);
  const [erro, setErro]            = useState<string | null>(null);
  // controla quais seções estão expandidas
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const toggleEtapa = (etapa: string) =>
    setExpandidas(prev => ({ ...prev, [etapa]: !prev[etapa] }));

  const carregar = useCallback(async (d: string, prod: string) => {
    setErro(null);
    setLoading(true);
    try {
      const res = await window.api.getDashboardPorEtapas(d, prod || undefined);
      if (!res.success) throw new Error(res.error);
      const payload = res.data as DashboardPorEtapasData;
      setDados(payload);
      // expande todas as etapas ao carregar
      const exp: Record<string, boolean> = {};
      payload.etapas.forEach(e => { exp[e.etapa] = true; });
      setExpandidas(exp);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(today, ''); }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalGeral = dados?.totalGeral;
  const pctGeral   = totalGeral && totalGeral.meta > 0
    ? (totalGeral.realizado / totalGeral.meta) * 100
    : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#f1f5f9', fontFamily: 'system-ui, sans-serif', fontSize: 13,
      overflow: 'auto',
    }}>

      {/* ── Barra de filtros ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: '#1e3a5f', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>DATA</div>
          <input type="date" value={data}
            onChange={e => setData(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 13, outline: 'none' }}
          />
        </div>

        <div>
          <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>PRODUTO</div>
          <input
            value={produtoInput}
            onChange={e => setProduto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar(data, produtoInput)}
            placeholder="Todos"
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 13, outline: 'none', width: 130 }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => carregar(data, produtoInput)}
            disabled={loading}
            style={{ padding: '5px 18px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>

        {dados && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, alignItems: 'center' }}>
            <TotalPill label="TOTAL REALIZADO" value={totalGeral?.realizado ?? 0} color="#86efac" />
            <TotalPill label="META TOTAL"      value={totalGeral?.meta      ?? 0} color="#93c5fd" />
            <TotalPill
              label="% GERAL"
              value={pctGeral !== null ? `${pctGeral.toFixed(1)}%` : '—'}
              color={pctGeral !== null
                ? pctGeral >= 100 ? '#86efac' : pctGeral >= 80 ? '#fde68a' : '#fca5a5'
                : '#94a3b8'}
              isString
            />
          </div>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 16px', fontSize: 12 }}>
          {erro} <button style={{ marginLeft: 8, cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setErro(null)}>✕</button>
        </div>
      )}

      {/* Vazio */}
      {!loading && dados && dados.etapas.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          Nenhuma ficha encontrada para {data}.
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Seção por etapa ── */}
        {dados?.etapas.map(etapa => {
          const aberta = expandidas[etapa.etapa] !== false;
          const cor    = corEtapa(etapa.etapa);
          const temDados = etapa.porOperador.some(o => o.totalRealizado > 0 || o.totalMeta > 0);

          return (
            <div key={etapa.etapa} style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}>

              {/* Cabeçalho clicável */}
              <div
                onClick={() => toggleEtapa(etapa.etapa)}
                style={{ cursor: 'pointer' }}
              >
                <EtapaHeader {...etapa} />
              </div>

              {/* Corpo colapsável */}
              {aberta && (
                <div style={{ background: '#fff', padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>

                  {/* Gráfico de barras por operador (maior, flex 2) */}
                  <div style={{ flex: 2, minWidth: 260 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                      Realizado × Saldo por Operador
                    </div>
                    <div style={{ height: 200 }}>
                      {temDados
                        ? <BarOperadores operadores={etapa.porOperador} corBarra={cor.bar} />
                        : <Vazio height={200} />
                      }
                    </div>
                  </div>

                  {/* Rosca de distribuição (flex 1) */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                      Distribuição
                    </div>
                    <div style={{ height: 200 }}>
                      {temDados && etapa.porOperador.length > 0
                        ? <DonutOperadores operadores={etapa.porOperador} />
                        : <Vazio height={200} />
                      }
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {/* ── Painel consolidado (só aparece se há ≥ 2 etapas) ── */}
        {dados && dados.etapas.length >= 2 && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 14 }}>
              Consolidado — Meta vs Realizado por Setor
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

              <div style={{ flex: 2, minWidth: 260 }}>
                <div style={{ height: 220 }}>
                  <BarConsolidado etapas={dados.etapas} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Produção por Setor
                </div>
                <div style={{ height: 220 }}>
                  <DonutSetores etapas={dados.etapas} />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Pill de total na barra de filtros ───────────────────────────────────────

function TotalPill({ label, value, color, isString }: {
  label: string; value: number | string; color: string; isString?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>
        {isString ? value : (value as number).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
