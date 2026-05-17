import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, DashboardFilters, ProductionStep } from '../../../shared/types';
import { formatWorkingTime } from '../../../shared/workingTime';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEP_COLOR: Record<string, { bar: string; dot: string; badge: string; icon: string }> = {
  Montagem:  { bar: 'bg-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-200', icon: 'bg-violet-100 text-violet-600' },
  Soldagem:  { bar: 'bg-orange-500', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200', icon: 'bg-orange-100 text-orange-600' },
  Revisao:   { bar: 'bg-yellow-500', dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', icon: 'bg-yellow-100 text-yellow-600' },
  Firmware:  { bar: 'bg-blue-500',   dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200',       icon: 'bg-blue-100 text-blue-600'   },
  IMEI:      { bar: 'bg-cyan-500',   dot: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',       icon: 'bg-cyan-100 text-cyan-600'   },
  Concluida: { bar: 'bg-emerald-500',dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
};

const PERIOD_OPTIONS = [
  { label: 'Hoje',   days: 1  },
  { label: '7 dias', days: 7  },
  { label: '30 dias',days: 30 },
  { label: '90 dias',days: 90 },
  { label: 'Tudo',   days: 0  },
];

function fmtLeadTime(sec: number): string {
  if (!sec) return '—';
  return formatWorkingTime(sec);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, iconClass, icon }: {
  label: string;
  value: string | number;
  sub?: string;
  iconClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${iconClass} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-zinc-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
      </div>
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
      isBottleneck ? 'border-red-300 shadow-sm shadow-red-100' : 'border-zinc-200'
    }`}>
      {isBottleneck && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
          Gargalo
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className="text-sm font-bold text-zinc-700">{step}</span>
      </div>
      <p className="text-2xl font-black text-zinc-900 mb-3">{units.toLocaleString('pt-BR')}</p>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-400 mt-1">{pct}% do total</p>
    </div>
  );
}

function StepTable({ funnel, bottleneck }: {
  funnel: DashboardData['funnel'];
  bottleneck: ProductionStep | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Detalhamento por etapa</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Etapa</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Unidades</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Em posto</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Paradas</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Tempo médio</th>
          </tr>
        </thead>
        <tbody>
          {funnel.map((row) => {
            const c = STEP_COLOR[row.step] ?? STEP_COLOR.Concluida;
            const isBottleneck = row.step === bottleneck;
            return (
              <tr key={row.step} className={`border-b border-zinc-50 last:border-0 ${isBottleneck ? 'bg-red-50/40' : 'hover:bg-zinc-50/50'}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${c.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {row.step}
                    </span>
                    {isBottleneck && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 ring-1 ring-red-200">gargalo</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-zinc-800">{row.totalUnits.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-right text-zinc-500">{row.boxesActive}</td>
                <td className="px-5 py-3.5 text-right text-zinc-500">{row.boxesInStock}</td>
                <td className="px-5 py-3.5 text-right font-mono text-zinc-500">{fmtLeadTime(row.avgLeadTimeSec)}</td>
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
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Inventário por produto</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Produto</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Em estoque</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Em produção</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Total</th>
          </tr>
        </thead>
        <tbody>
          {byModel.map((row) => (
            <tr key={row.model} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
              <td className="px-5 py-3.5 font-medium text-zinc-700">{row.model}</td>
              <td className="px-5 py-3.5 text-right text-zinc-500">{row.unitsInStock.toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3.5 text-right text-zinc-500">{row.unitsInProduction.toLocaleString('pt-BR')}</td>
              <td className="px-5 py-3.5 text-right font-bold text-zinc-800">
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
    <div className="h-full overflow-y-auto bg-zinc-50">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-6">
          <span>Sistema</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-zinc-600 font-medium">Dashboard de Produção</span>
        </div>

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Dashboard de Produção</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : 'Carregando dados...'}
            </p>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            {data && data.availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-400 text-zinc-700 cursor-pointer"
              >
                <option value="">Todos os produtos</option>
                {data.availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}

            <div className="flex bg-white border border-zinc-200 rounded-lg overflow-hidden">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setSelectedPeriod(opt.days)}
                  className={`px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedPeriod === opt.days
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-zinc-700 bg-white border border-zinc-200 rounded-lg transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-6">

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Unidades em estoque"
                value={data.totalUnitsInStock.toLocaleString('pt-BR')}
                sub="pronto para uso"
                iconClass="bg-emerald-100"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                }
              />
              <KpiCard
                label="Unidades em produção"
                value={data.totalUnitsInProduction.toLocaleString('pt-BR')}
                sub="em processamento"
                iconClass="bg-blue-100"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                  </svg>
                }
              />
              <KpiCard
                label="Lead time médio"
                value={fmtLeadTime(data.avgLeadTimeSec)}
                sub="Montagem → Concluída"
                iconClass="bg-violet-100"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-violet-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                }
              />
              <KpiCard
                label="UPH"
                value={data.uphLast8h}
                sub="unidades / hora (últimas 8h)"
                iconClass="bg-orange-100"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                }
              />
            </div>

            {/* ── Funil de produção ── */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Funil de Produção</p>
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

            {/* ── Alerta de gargalo ── */}
            {data.bottleneckStep && (
              <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-600">
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
