import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { DashboardPorEtapasData, EtapaResumo, DashboardCommand } from '../../../shared/types';
import AlertModal, { type AlertData } from './AlertModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ─── Grade de faixas de horário ───────────────────────────────────────────────

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
  const agora   = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const sexta   = agora.getDay() === 5;
  for (const f of FAIXAS_BASE) {
    const ini    = f.inicio[0] * 60 + f.inicio[1];
    const fim    = ('fimSexta' in f && sexta ? f.fimSexta : f.fim) as [number, number];
    const fimMin = fim[0] * 60 + fim[1];
    if (minutos >= ini && minutos < fimMin) return faixaLabel(f, sexta);
  }
  return todasAsFaixas(sexta)[0];
}

const CARROSSEL_INTERVALO_MS = 1 * 60 * 1000;

// ─── Paleta ───────────────────────────────────────────────────────────────────

const COR_ETAPA: Record<string, { bg: string; text: string; bar: string; accent: string }> = {
  Montagem: { bg: '#1d4ed8', text: '#fff', bar: 'rgba(59,130,246,0.85)',  accent: '#93c5fd' },
  Soldagem: { bg: '#15803d', text: '#fff', bar: 'rgba(34,197,94,0.85)',   accent: '#86efac' },
  Revisão:  { bg: '#7e22ce', text: '#fff', bar: 'rgba(168,85,247,0.85)', accent: '#d8b4fe' },
  Revisao:  { bg: '#7e22ce', text: '#fff', bar: 'rgba(168,85,247,0.85)', accent: '#d8b4fe' },
  Firmware: { bg: '#b45309', text: '#fff', bar: 'rgba(245,158,11,0.85)', accent: '#fde68a' },
  IMEI:     { bg: '#0e7490', text: '#fff', bar: 'rgba(6,182,212,0.85)',  accent: '#a5f3fc' },
};
const COR_DEFAULT = { bg: '#483751', text: '#fff', bar: 'rgba(107,114,128,0.85)', accent: '#e2e8f0' };

function corEtapa(etapa: string) { return COR_ETAPA[etapa] ?? COR_DEFAULT; }

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

function EtapaCard({ etapa, faixaDados }: { etapa: EtapaResumo; faixaDados: EtapaResumo | undefined }) {
  const cor = corEtapa(etapa.etapa);

  // Dados do dia inteiro (sidebar) vs faixa atual (destaque)
  const realizadoDia   = etapa.totalRealizado;
  const metaDia        = etapa.totalMeta;
  const pctDia         = metaDia > 0 ? (realizadoDia / metaDia) * 100 : null;

  const realizadoFaixa = faixaDados?.totalRealizado ?? 0;
  const metaFaixa      = faixaDados?.totalMeta      ?? 0;
  const pctFaixa       = metaFaixa > 0 ? (realizadoFaixa / metaFaixa) * 100 : null;

  const pctColor = (pct: number | null) =>
    pct === null ? 'rgba(255,255,255,0.5)'
    : pct >= 100 ? '#86efac'
    : pct >= 80  ? '#fde68a'
    : '#fca5a5';

  return (
    <div style={{ background: cor.bg, color: cor.text, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1.5 }}>{etapa.etapa.toUpperCase()}</div>
      {etapa.produto && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{etapa.produto}</div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>DIA</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{realizadoDia}</div>
          <div style={{ fontSize: 11, color: pctColor(pctDia), fontWeight: 700 }}>
            {pctDia !== null ? `${pctDia.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>FAIXA</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: cor.accent, lineHeight: 1 }}>{realizadoFaixa}</div>
          <div style={{ fontSize: 11, color: pctColor(pctFaixa), fontWeight: 700 }}>
            {pctFaixa !== null ? `${pctFaixa.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
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

// ─── Painel de detalhe de uma etapa (sem operadores) ─────────────────────────

function DetalheEtapa({ etapa, faixaDados, faixaSelecionada }: {
  etapa: EtapaResumo;
  faixaDados: EtapaResumo | undefined;
  faixaSelecionada: string;
}) {
  const cor = corEtapa(etapa.etapa);

  const realizadoFaixa = faixaDados?.totalRealizado ?? 0;
  const metaFaixa      = faixaDados?.totalMeta      ?? 0;
  const pctFaixa       = metaFaixa > 0 ? (realizadoFaixa / metaFaixa) * 100 : null;
  const saldoFaixa     = realizadoFaixa - metaFaixa;

  const realizadoDia   = etapa.totalRealizado;
  const metaDia        = etapa.totalMeta;
  const pctDia         = metaDia > 0 ? (realizadoDia / metaDia) * 100 : null;
  const saldoDia       = realizadoDia - metaDia;

  const pctColor = (pct: number | null) =>
    pct === null ? '#94a3b8' : pct >= 100 ? '#86efac' : pct >= 80 ? '#fde68a' : '#fca5a5';

  // Gráfico de barras por hora (sem operadores — totais por hora)
  const porHora = faixaDados?.porHora ?? etapa.porHora;
  const barData = {
    labels: porHora.map(h => h.horarioBloco),
    datasets: [
      {
        label: 'Realizado',
        data: porHora.map(h => h.realizado),
        backgroundColor: cor.bar,
        borderRadius: 5, barPercentage: 0.6,
      },
      {
        label: 'Meta',
        data: porHora.map(h => h.meta),
        backgroundColor: 'rgba(148,163,184,0.45)',
        borderRadius: 5, barPercentage: 0.6,
      },
    ],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 13 }, padding: 14, color: '#334155' } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 12 }, color: '#475569' } },
      x: { grid: { display: false },                       ticks: { font: { size: 11 }, color: '#475569' } },
    },
  };

  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        background: cor.bg, borderRadius: 12, padding: '14px 20px',
      }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
            {etapa.etapa.toUpperCase()}
          </div>
          {etapa.produto && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
              {etapa.produto}
            </div>
          )}
        </div>
        <BadgeFaixa faixa={faixaSelecionada} />
      </div>

      {/* KPIs em destaque */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {/* Realizado na faixa */}
        <KpiBox
          label={`REALIZADO — ${faixaSelecionada}`}
          value={String(realizadoFaixa)}
          sub={`Meta: ${metaFaixa}`}
          color={cor.accent}
          bg={cor.bg}
        />
        {/* Eficiência na faixa */}
        <KpiBox
          label="EFICIÊNCIA DA FAIXA"
          value={pctFaixa !== null ? `${pctFaixa.toFixed(1)}%` : '—'}
          sub={`Saldo: ${saldoFaixa >= 0 ? '+' : ''}${saldoFaixa}`}
          color={pctColor(pctFaixa)}
          bg="#0f2542"
        />
        {/* Acumulado no dia */}
        <KpiBox
          label="ACUMULADO DO DIA"
          value={String(realizadoDia)}
          sub={pctDia !== null ? `Efic.: ${pctDia.toFixed(1)}% | Saldo: ${saldoDia >= 0 ? '+' : ''}${saldoDia}` : 'Sem meta'}
          color="#fff"
          bg="#1e3a5f"
        />
      </div>

      {/* Gráfico por hora */}
      <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
          PRODUÇÃO POR FAIXA DE HORÁRIO
        </div>
        <div style={{ height: 220 }}>
          {porHora.length > 0
            ? <Bar data={barData} options={barOptions} />
            : <Vazio height={220} />
          }
        </div>
      </div>

      {/* Progresso visual do dia */}
      <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 10, letterSpacing: 0.5 }}>
          PROGRESSO DO DIA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 28, background: '#e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(pctDia ?? 0, 100)}%`,
              background: cor.bg,
              borderRadius: 14,
              transition: 'width 0.8s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
            }}>
              {(pctDia ?? 0) > 15 && (
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>
                  {pctDia!.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(pctDia), minWidth: 56, textAlign: 'right' }}>
            {pctDia !== null ? `${pctDia.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#64748b' }}>
          <span>Realizado: <strong>{realizadoDia}</strong></span>
          <span>Meta: <strong>{metaDia}</strong></span>
          <span>Saldo: <strong style={{ color: pctColor(pctDia) }}>{saldoDia >= 0 ? '+' : ''}{saldoDia}</strong></span>
        </div>
      </div>

    </div>
  );
}

function KpiBox({ label, value, sub, color, bg }: { label: string; value: string; sub: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function Vazio({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16 }}>
      Sem registros para esta faixa de horário
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardGeral({ standalone = false }: { standalone?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);

  const [faixaSelecionada, setFaixaSelecionada] = useState<string>(faixaAtual());
  const [dados, setDados]                       = useState<DashboardPorEtapasData | null>(null);
  const [dadosDia, setDadosDia]                 = useState<DashboardPorEtapasData | null>(null);
  const [loading, setLoading]                   = useState(false);
  const [erro, setErro]                         = useState<string | null>(null);
  const [etapaSelecionada, setEtapaSelecionada] = useState<EtapaResumo | null>(null);
  const [isFullscreen, setIsFullscreen]         = useState(false);
  const [rotacaoAtiva, setRotacaoAtiva]         = useState(false);
  const [alertAtivo, setAlertAtivo]             = useState<AlertData | null>(null);

  const rootRef   = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const etapasRef = useRef<EtapaResumo[]>([]);
  const indiceRef = useRef(0);

  useEffect(() => { etapasRef.current = dadosDia?.etapas ?? []; }, [dadosDia]);

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
      const [resFaixa, resDia] = await Promise.all([
        api.getDashboardPorEtapas(d, prod || undefined, faixa),
        api.getDashboardPorEtapas(d, prod || undefined, undefined),
      ]);
      if (!resFaixa.success) throw new Error(resFaixa.error);
      if (!resDia.success)   throw new Error(resDia.error);
      const payload    = resFaixa.data as DashboardPorEtapasData;
      const payloadDia = resDia.data   as DashboardPorEtapasData;
      etapasRef.current = payloadDia.etapas;
      setDados(payload);
      setDadosDia(payloadDia);
      iniciarCarrossel(payloadDia.etapas);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [pararCarrossel, iniciarCarrossel]);

  useEffect(() => { carregar(today, '', faixaAtual()); }, []);

  // ── Listener de comandos ─────────────────────────────────────────────────────
  useEffect(() => {
    const api = window.api as typeof window.api;
    api.onDashboardGeralCommand((cmd: DashboardCommand) => {
      if (cmd.type === 'refresh') {
        setFaixaSelecionada(cmd.faixa);
        carregar(cmd.data, cmd.produto, cmd.faixa);
      } else if (cmd.type === 'alert') {
        setAlertAtivo({ mensagem: cmd.mensagem });
      } else if (cmd.type === 'alert-image') {
        setAlertAtivo({ mensagem: cmd.mensagem, imagemBase64: cmd.imagemBase64, mimeType: cmd.mimeType });
      }
    });
    return () => { api.offDashboardGeralCommand(); };
  }, [carregar]);

  const selecionarManual = (etapa: EtapaResumo) => {
    pararCarrossel();
    setEtapaSelecionada(etapa);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const totalGeral = dadosDia?.totalGeral;
  const pctGeral   = totalGeral && totalGeral.meta > 0
    ? (totalGeral.realizado / totalGeral.meta) * 100 : null;

  return (
    <div ref={rootRef} style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f1f5f9', fontFamily: 'system-ui, sans-serif', fontSize: 15,
      overflow: 'hidden',
    }}>

      {/* ── Barra de status ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '8px 16px', background: '#0f2542', flexWrap: 'wrap', flexShrink: 0,
        borderBottom: '2px solid #1e3a5f',
      }}>
        <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>
          PAINEL GERAL DE PRODUÇÃO
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
        <BadgeFaixa faixa={faixaSelecionada} />

        {rotacaoAtiva && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb923c', fontSize: 11, fontWeight: 700 }}>
            <span style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>⟳</span>
            CARROSSEL ATIVO
          </div>
        )}

        {totalGeral && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, alignItems: 'center' }}>
            <TotalPill label="REALIZADO" value={totalGeral.realizado} color="#86efac" />
            <TotalPill label="META"      value={totalGeral.meta}      color="#93c5fd" />
            <TotalPill
              label="% GERAL"
              value={pctGeral !== null ? `${pctGeral.toFixed(1)}%` : '—'}
              color={pctGeral !== null ? pctGeral >= 100 ? '#86efac' : '#fca5a5' : '#94a3b8'}
              isString
            />
            <button onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair (F11)' : 'Tela cheia (F11)'}
              style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #334155', background: '#1e3a5f', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
              ⛶
            </button>
            {standalone && (
              <button onClick={() => window.api.closeProductionWindowGeral()}
                style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                Fechar
              </button>
            )}
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
          width: '260px', minWidth: '260px', height: '100%',
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
            const ativa        = etapaSelecionada?.etapa === etapa.etapa;
            const faixaDados   = dados?.etapas.find(e => e.etapa === etapa.etapa);
            return (
              <div
                key={etapa.etapa}
                onClick={() => selecionarManual(etapa)}
                style={{
                  borderRadius: 10, cursor: 'pointer',
                  boxShadow: ativa ? `0 0 0 3px ${corEtapa(etapa.etapa).bg}` : '0 1px 4px rgba(0,0,0,0.10)',
                  opacity: ativa ? 1 : 0.72,
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                  transform: ativa ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <EtapaCard etapa={etapa} faixaDados={faixaDados} />
              </div>
            );
          })}

          {/* Consolidado */}
          {dadosDia && dadosDia.etapas.length >= 2 && (
            <div style={{ marginTop: 6, background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#475569', marginBottom: 8, letterSpacing: 0.5 }}>
                CONSOLIDADO
              </div>
              <div style={{ height: 150 }}><BarConsolidado etapas={dadosDia.etapas} /></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginTop: 12, marginBottom: 6 }}>
                PRODUÇÃO POR SETOR
              </div>
              <div style={{ height: 150 }}><DonutSetores etapas={dadosDia.etapas} /></div>
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
            <DetalheEtapa
              etapa={dadosDia?.etapas.find(e => e.etapa === etapaSelecionada.etapa) ?? etapaSelecionada}
              faixaDados={dados?.etapas.find(e => e.etapa === etapaSelecionada.etapa)}
              faixaSelecionada={faixaSelecionada}
            />
          )}
        </div>
      </div>

      {/* ── Alert Modal ── */}
      {alertAtivo && (
        <AlertModal alert={alertAtivo} onClose={() => setAlertAtivo(null)} />
      )}

      <style>{`
        @keyframes alertaEntrada {
          from { transform: scale(1.04); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function TotalPill({ label, value, color, isString }: {
  label: string; value: number | string; color: string; isString?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>
        {isString ? value : (value as number).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
