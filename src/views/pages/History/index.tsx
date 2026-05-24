import { useState, useEffect } from 'react';
import type { ProductionStep } from '../../../shared/types';
import { calcWorkingSeconds, formatWorkingTime } from '../../../shared/workingTime';

const STEP_COLORS: Record<string, { dot: string; badge: string }> = {
  'Montagem':  { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-200' },
  'Soldagem':  { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  'Revisao':   { dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  'Firmware':  { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200'       },
  'IMEI':      { dot: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200'       },
  'Concluida': { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const STEP_OPTIONS: ProductionStep[] = ['Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI', 'Concluida'];
const PAGE_LIMIT = 100;

function toMs(ts: number | Date | null): number | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  return ts * 1000;
}

function formatDate(ts: number | Date | null): string {
  const ms = toMs(ts);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR');
}

interface LogRecord {
  id: number;
  boxId: string;
  step: string;
  startTime: number | Date | null;
  endTime: number | Date | null;
  timeSpent: number | null;
  operator: string | null;
  location: string | null;
  description: string | null;
}

function DetailPanel({ record }: { record: LogRecord }) {
  const startMs = toMs(record.startTime);
  const endMs   = toMs(record.endTime);
  const duration = startMs && endMs
    ? formatWorkingTime(calcWorkingSeconds(startMs, endMs))
    : null;

  return (
    <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-3">
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Operador</p>
        <p className="text-sm font-semibold text-zinc-700">{record.operator || '—'}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Duração</p>
        <p className="text-sm font-semibold text-zinc-700">{duration ?? '—'}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Início</p>
        <p className="text-sm text-zinc-600">{formatDate(record.startTime)}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Fim</p>
        <p className="text-sm text-zinc-600">{formatDate(record.endTime)}</p>
      </div>
      {record.location && (
        <div className="col-span-2">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Localização</p>
          <p className="text-sm text-zinc-600">{record.location.replace(/_/g, ' ')}</p>
        </div>
      )}
      {record.description && (
        <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-0.5">Observação</p>
          <p className="text-sm text-amber-800">{record.description}</p>
        </div>
      )}
    </div>
  );
}

const History = () => {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStep, setFilterStep] = useState<string>('');
  const [filterBox, setFilterBox] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await (window as any).api.getRecentHistory(PAGE_LIMIT);
      if (res.success) setLogs(res.data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((r) => {
    const matchStep = filterStep ? r.step === filterStep : true;
    const matchBox  = filterBox  ? r.boxId.includes(filterBox.toUpperCase()) : true;
    return matchStep && matchBox;
  });

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Log de Movimentações</h1>
            <p className="text-sm text-zinc-500 mt-1">Últimas {PAGE_LIMIT} operações registradas no sistema</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-4 flex gap-3">
          <input
            type="text"
            value={filterBox}
            onChange={(e) => setFilterBox(e.target.value)}
            placeholder="Filtrar por código da caixa..."
            className="flex-1 px-3 py-2 text-sm font-mono uppercase bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors text-zinc-700 placeholder:normal-case placeholder:font-sans"
          />
          <select
            value={filterStep}
            onChange={(e) => setFilterStep(e.target.value)}
            className="px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors text-zinc-700 cursor-pointer"
          >
            <option value="">Todas as etapas</option>
            {STEP_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">

          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_140px_160px_100px_40px] gap-4 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Caixa</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Etapa</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Data/Hora</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Status</p>
            <span />
          </div>

          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">Carregando log...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-sm font-semibold text-zinc-500">Nenhum registro encontrado</p>
              <p className="text-xs text-zinc-400">Tente ajustar os filtros ou aguarde novas movimentações</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {filtered.map((record) => {
                const c = STEP_COLORS[record.step] ?? { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200' };
                const isOpen = expandedId === record.id;
                return (
                  <div key={record.id}>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : record.id)}
                      className="w-full grid grid-cols-[1fr_140px_160px_100px_40px] gap-4 px-5 py-3 hover:bg-zinc-50 transition-colors items-center text-left"
                    >
                      <span className="text-sm font-mono font-bold text-zinc-800">{record.boxId}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 w-fit ${c.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        {record.step}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(record.startTime)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
                        record.endTime
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}>
                        {record.endTime ? 'Concluída' : 'Aberta'}
                      </span>
                      <span className={`flex items-center justify-center text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </span>
                    </button>

                    {isOpen && <DetailPanel record={record} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
              <p className="text-xs text-zinc-400">
                <input type="text" placeholder="Filtrar por caixa..." className="px-2 py-1 text-xs font-mono uppercase bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors text-zinc-700 placeholder:normal-case placeholder:font-sans" />
                Exibindo <span className="font-semibold text-zinc-600">{filtered.length}</span> de <span className="font-semibold text-zinc-600">{logs.length}</span> registros
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default History;
