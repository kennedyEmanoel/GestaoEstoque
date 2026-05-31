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

function Vazio({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16 }}>
      Sem registros para este período
    </div>
  );
}

function EtapaHeader({ etapa, produto, totalRealizado, totalMeta, saldo, pctAtingimento }: EtapaResumo) {
  const cor = corEtapa(etapa);

  return (
    <div style={{
      background: cor.bg,
      color: cor.text,
      borderRadius: '10px 10px 0 0',
      padding: '14px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 40,
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 160 }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1.5 }}>
          {etapa.toUpperCase()}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginTop: 3 }}>
          {produto}
        </div>
      </div>

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
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
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
        borderRadius: 6,
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
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 15 }, padding: 16 } },
      tooltip: {
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
        callbacks: {
          afterLabel: (ctx: any) => {
            const op = operadores[ctx.dataIndex];
            return `Meta: ${op.totalMeta}`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 14 } } },
      x: { grid: { display: false }, ticks: { font: { size: 14 } } },
    },
  };

  return <Bar data={data} options={options} />;
}

function DonutOperadores({ operadores }: { operadores: DadosPorOperador[] }) {
  const total = operadores.reduce((s, o) => s + o.totalRealizado, 0);

  const data = {
    labels: operadores.map(o => o.operadorNome),
    datasets: [{
      data: operadores.map(o => o.totalRealizado),
      backgroundColor: COR_OP,
      borderWidth: 3,
      borderColor: '#fff',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 14 }, boxWidth: 16, padding: 14 } },
      tooltip: {
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
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

function BarConsolidado({ etapas }: { etapas: EtapaResumo[] }) {
  const data = {
    labels: etapas.map(e => e.etapa.toUpperCase()),
    datasets: [
      {
        label: 'Total Realizado',
        data: etapas.map(e => e.totalRealizado),
        backgroundColor: etapas.map(e => corEtapa(e.etapa).bar),
        borderRadius: 6,
        barPercentage: 0.5,
      },
      {
        label: 'Meta',
        data: etapas.map(e => e.totalMeta),
        backgroundColor: 'rgba(203,213,225,0.7)',
        borderRadius: 6,
        barPercentage: 0.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 15 }, padding: 16 } },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 14 } } },
      x: { grid: { display: false }, ticks: { font: { size: 14 } } },
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
      borderWidth: 3,
      borderColor: '#fff',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { font: { size: 15 }, boxWidth: 16, padding: 14 } },
      tooltip: {
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
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
  const today = new Date().toISOString().slice(0, 10);

  const [data, setData]             = useState(today);
  const [produtoInput, setProduto]  = useState('');
  const [dados, setDados]           = useState<DashboardPorEtapasData | null>(null);
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleEtapa = (etapa: string) =>
    setExpandidas(prev => ({ ...prev, [etapa]: !prev[etapa] }));

  // ── Fullscreen ───────────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  // ── Dados ────────────────────────────────────────────────────────────────────

  const carregar = useCallback(async (d: string, prod: string) => {
    setErro(null);
    setLoading(true);
    try {
      const res = await window.api.getDashboardPorEtapas(d, prod || undefined);
      if (!res.success) throw new Error(res.error);
      const payload = res.data as DashboardPorEtapasData;
      setDados(payload);
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  const totalGeral = dados?.totalGeral;
  const pctGeral   = totalGeral && totalGeral.meta > 0
    ? (totalGeral.realizado / totalGeral.meta) * 100
    : null;

  return (
    <div ref={rootRef} style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0f172a', fontFamily: 'system-ui, sans-serif', fontSize: 15,
      overflow: 'auto',
    }}>

      {/* ── Barra de controles ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 20px', background: '#1e3a5f', flexWrap: 'wrap', flexShrink: 0,
      }}>

        {/* Título */}
        <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18, letterSpacing: 1, marginRight: 8 }}>
          PAINEL DE PRODUÇÃO
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />

        <div>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>DATA</div>
          <input type="date" value={data}
            onChange={e => setData(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>PRODUTO</div>
          <input
            value={produtoInput}
            onChange={e => setProduto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar(data, produtoInput)}
            placeholder="Todos"
            style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #334155', background: '#0f2542', color: '#f1f5f9', fontSize: 14, outline: 'none', width: 140 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button
            onClick={() => carregar(data, produtoInput)}
            disabled={loading}
            style={{ padding: '7px 22px', borderRadius: 5, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>

          {/* Toggle fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia (F11)' : 'Tela cheia (F11)'}
            style={{ padding: '7px 14px', borderRadius: 5, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            {isFullscreen ? '⛶' : '⛶'}
            <span style={{ fontSize: 12, marginLeft: 6, color: '#64748b' }}>F11</span>
          </button>

          {standalone && (
            <button
              onClick={() => window.api.closeProductionWindow()}
              style={{ padding: '7px 16px', borderRadius: 5, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              Fechar
            </button>
          )}
        </div>

        {/* Pills de totais gerais */}
        {dados && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 28, alignItems: 'center' }}>
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
        <div style={{ background: '#450a0a', color: '#fca5a5', padding: '10px 20px', fontSize: 14, flexShrink: 0 }}>
          {erro}
          <button style={{ marginLeft: 10, cursor: 'pointer', background: 'none', border: 'none', color: '#fca5a5', fontSize: 16 }} onClick={() => setErro(null)}>✕</button>
        </div>
      )}

      {/* Vazio */}
      {!loading && dados && dados.etapas.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 18 }}>
          Nenhuma ficha encontrada para {data}.
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Cards de etapa */}
        {dados?.etapas.map(etapa => {
          const aberta   = expandidas[etapa.etapa] !== false;
          const cor      = corEtapa(etapa.etapa);
          const temDados = etapa.porOperador.some(o => o.totalRealizado > 0 || o.totalMeta > 0);

          return (
            <div key={etapa.etapa} style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>

              <div onClick={() => toggleEtapa(etapa.etapa)} style={{ cursor: 'pointer' }}>
                <EtapaHeader {...etapa} />
              </div>

              {aberta && (
                <div style={{ background: '#1e293b', padding: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>

                  <div style={{ flex: 2, minWidth: 300 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 }}>
                      REALIZADO × SALDO POR OPERADOR
                    </div>
                    <div style={{ height: 260 }}>
                      {temDados
                        ? <BarOperadores operadores={etapa.porOperador} corBarra={cor.bar} />
                        : <Vazio height={260} />
                      }
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 }}>
                      DISTRIBUIÇÃO
                    </div>
                    <div style={{ height: 260 }}>
                      {temDados && etapa.porOperador.length > 0
                        ? <DonutOperadores operadores={etapa.porOperador} />
                        : <Vazio height={260} />
                      }
                    </div>
                  </div>

                  {/* Tabela de operadores */}
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 }}>
                      DETALHE POR OPERADOR
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {etapa.porOperador.map((op, i) => {
                        const pct = op.totalMeta > 0 ? (op.totalRealizado / op.totalMeta) * 100 : null;
                        const saldo = op.totalRealizado - op.totalMeta;
                        return (
                          <div key={op.operadorNome} style={{
                            background: '#0f172a', borderRadius: 8, padding: '14px 20px',
                            minWidth: 180, flex: '1 1 180px',
                            borderLeft: `4px solid ${COR_OP[i % COR_OP.length]}`,
                          }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
                              {op.operadorNome}
                            </div>
                            <div style={{ display: 'flex', gap: 20 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>REAL.</div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{op.totalRealizado}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>META</div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>{op.totalMeta}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>SALDO</div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: saldo >= 0 ? '#86efac' : '#fca5a5', lineHeight: 1 }}>
                                  {saldo >= 0 ? `+${saldo}` : saldo}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>%</div>
                                <div style={{ fontSize: 26, fontWeight: 800, color: corPct(pct), lineHeight: 1 }}>
                                  {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {/* Consolidado */}
        {dados && dados.etapas.length >= 2 && (
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9', marginBottom: 18, letterSpacing: 0.5 }}>
              CONSOLIDADO — META vs REALIZADO POR SETOR
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

              <div style={{ flex: 2, minWidth: 300 }}>
                <div style={{ height: 280 }}>
                  <BarConsolidado etapas={dados.etapas} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 10, letterSpacing: 0.5 }}>
                  PRODUÇÃO POR SETOR
                </div>
                <div style={{ height: 280 }}>
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

// ─── Pill de total na barra de controles ──────────────────────────────────────

function TotalPill({ label, value, color, isString }: {
  label: string; value: number | string; color: string; isString?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>
        {isString ? value : (value as number).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
