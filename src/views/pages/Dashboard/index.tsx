import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, DashboardFilters, ProductionStep } from '../../../shared/types';
import { formatWorkingTime } from '../../../shared/workingTime';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEP_COLOR: Record<string, { bar: string; dot: string; badge: string }> = {
  Montagem:  { bar: 'bg-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  Soldagem:  { bar: 'bg-orange-500', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
  Revisao:   { bar: 'bg-yellow-500', dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700' },
  Firmware:  { bar: 'bg-blue-500',   dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700'   },
  IMEI:      { bar: 'bg-cyan-500',   dot: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-700'   },
  Concluida: { bar: 'bg-emerald-500',dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700' },
};

const PERIOD_OPTIONS = [
  { label: 'Hoje',       days: 1   },
  { label: '7 dias',     days: 7   },
  { label: '30 dias',    days: 30  },
  { label: '90 dias',    days: 90  },
  { label: 'Tudo',       days: 0   },
];

function fmtLeadTime(sec: number): string {
  if (!sec) return '—';
  return formatWorkingTime(sec);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black tracking-tight ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function FunnelBar({ step, units, maxUnits, isBottleneck }: {
  step: string; units: number; maxUnits: number; isBottleneck: boolean;
}) {
  const pct = maxUnits > 0 ? Math.round((units / maxUnits) * 100) : 0;
  const c = STEP_COLOR[step] ?? STEP_COLOR.Concluida;

  return (
    <div className={`relative bg-white rounded-xl border p-4 transition-all ${
      isBottleneck ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-200'
    }`}>
      {isBottleneck && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600">
          Gargalo
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className="text-sm font-bold text-slate-700">{step}</span>
      </div>
      <p className="text-2xl font-black text-slate-900 mb-3">{units.toLocaleString('pt-BR')}</p>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{pct}% do total</p>
    </div>
  );
}

function StepTable({ funnel, bottleneck }: {
  funnel: DashboardData['funnel'];
  bottleneck: ProductionStep | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Detalhamento por etapa</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Etapa</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Unidades</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Em posto</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Paradas</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Tempo médio</th>
          </tr>
        </thead>
        <tbody>
          {funnel.map((row) => {
            const c = STEP_COLOR[row.step] ?? STEP_COLOR.Concluida;
            const isBottleneck = row.step === bottleneck;
            return (
              <tr key={row.step} className={`border-b border-slate-50 last:border-0 ${isBottleneck ? 'bg-red-50/40' : ''}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className="font-medium text-slate-700">{row.step}</span>
                    {isBottleneck && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">gargalo</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-800">{row.totalUnits.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-right text-slate-600">{row.boxesActive}</td>
                <td className="px-5 py-3 text-right text-slate-600">{row.boxesInStock}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600">{fmtLeadTime(row.avgLeadTimeSec)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelTable({ byModel }: { byModel: DashboardData['byModel'] }) {
  if (byModel.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Inventário por produto</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Produto</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Em estoque</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Em produção</th>
            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Total</th>
          </tr>
        </thead>
        <tbody>
          {byModel.map((row) => (
            <tr key={row.model} className="border-b border-slate-50 last:border-0">
              <td className="px-5 py-3 font-medium text-slate-700">{row.model}</td>
              <td className="px-5 py-3 text-right text-slate-600">{row.unitsInStock.toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3 text-right text-slate-600">{row.unitsInProduction.toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3 text-right font-bold text-slate-800">
                {(row.unitsInStock + row.unitsInProduction).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const filters: DashboardFilters = {};
    if (selectedModel) filters.model = selectedModel;
    if (selectedPeriod > 0) {
      filters.dateFrom = Date.now() - selectedPeriod * 24 * 3600 * 1000;
      filters.dateTo = Date.now();
    }
    try {
      const res = await window.api.getDashboard(filters);
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [selectedModel, selectedPeriod]);

  useEffect(() => { load(); }, [load]);

  const maxUnits = data ? Math.max(...data.funnel.map(f => f.totalUnits), 1) : 1;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-base font-bold text-slate-900">Dashboard de Produção</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : 'Carregando...'}
            </p>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            {data && data.availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-400 text-slate-700 cursor-pointer"
              >
                <option value="">Todos os produtos</option>
                {data.availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}

            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setSelectedPeriod(opt.days)}
                  className={`px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedPeriod === opt.days
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-colors disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-6">

            {/* ── KPIs principais ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Unidades em estoque"
                value={data.totalUnitsInStock.toLocaleString('pt-BR')}
                sub="pronto para uso"
                accent="text-slate-900"
              />
              <KpiCard
                label="Unidades em produção"
                value={data.totalUnitsInProduction.toLocaleString('pt-BR')}
                sub="em processamento"
                accent="text-blue-700"
              />
              <KpiCard
                label="Lead time médio"
                value={fmtLeadTime(data.avgLeadTimeSec)}
                sub="Montagem → Concluída"
                accent="text-violet-700"
              />
              <KpiCard
                label="UPH"
                value={data.uphLast8h}
                sub="unidades / hora (últimas 8h)"
                accent="text-emerald-700"
              />
            </div>

            {/* ── Funil de produção ── */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Funil de Produção</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {data.funnel.map(f => (
                  <FunnelBar
                    key={f.step}
                    step={f.step}
                    units={f.totalUnits}
                    maxUnits={maxUnits}
                    isBottleneck={f.step === data.bottleneckStep}
                  />
                ))}
              </div>
            </div>

            {/* ── Tabela de detalhamento ── */}
            <StepTable funnel={data.funnel} bottleneck={data.bottleneckStep} />

            {/* ── Inventário por produto ── */}
            <ModelTable byModel={data.byModel} />

            {/* ── Rodapé de gargalo ── */}
            {data.bottleneckStep && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800">
                    Gargalo identificado: <span className="font-black">{data.bottleneckStep}</span>
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Etapa com maior tempo médio de permanência no período selecionado.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
