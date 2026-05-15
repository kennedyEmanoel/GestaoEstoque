import { useState } from 'react';
import type { BoxLocation } from '../../../shared/types';
import { calcWorkingSeconds, formatWorkingTime } from '../../../shared/workingTime';

type Tab = 'criacao' | 'etapas';

interface BoxRecord {
  id: string;
  model: string | null;
  amount: number;
  step: string;
  volume: string | null;
  origin: string;
  location: BoxLocation | null;
  weight: number;
  operator: string | null;
  description: string | null;
  date: number | null;
}

interface HistoryRecord {
  id: number;
  boxId: string;
  startTime: number;
  endTime: number | null;
  timeSpent: number | null;
  typeOperation: string;
  step: string;
  location: string | null;
  operator: string | null;
  description: string | null;
}

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR');
}

const ORIGIN_LABEL: Record<string, string> = {
  'TRAY': 'Bandeja',
  'PRODUCTION': 'Produção',
};

const STEP_COLORS: Record<string, string> = {
  'Montagem':  'bg-violet-500',
  'Soldagem':  'bg-orange-500',
  'Revisao':   'bg-yellow-500',
  'Firmware':  'bg-blue-500',
  'IMEI':      'bg-cyan-500',
  'Concluida': 'bg-emerald-500',
};

const History = () => {
  const [tab, setTab] = useState<Tab>('criacao');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [boxRecord, setBoxRecord] = useState<BoxRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setBoxRecord(null);
    setHistoryRecords([]);
    setSearched(false);

    try {
      const [boxRes, histRes] = await Promise.all([
        (window as any).api.getBox(search.trim().toUpperCase()),
        (window as any).api.getBoxHistory(search.trim().toUpperCase()),
      ]);

      if (boxRes.success) setBoxRecord(boxRes.data);
      if (histRes.success) setHistoryRecords(histRes.data);
      setSearched(true);

      if (!boxRes.success) alert(boxRes.error || 'Caixa não encontrada.');
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setLoading(false);
    }
  };

  const stepRecords = historyRecords.filter(r => r.typeOperation === 'SCAN_START');

  return (
    <div className="flex h-full bg-slate-50">

      {/* Painel esquerdo — busca */}
      <div className="w-[420px] min-w-[420px] h-full flex flex-col border-r border-slate-200 bg-white">

        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="mb-5">
            <h1 className="text-base font-bold text-slate-900">Histórico</h1>
            <p className="text-xs text-slate-400 mt-0.5">Criação e movimentação de caixas</p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              placeholder="Bipar ou digitar código..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors"
              disabled={loading}
              autoComplete="off"
            />
          </form>
        </div>

        {/* Estado vazio / loading no painel esquerdo */}
        <div className="flex-1 flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Buscando...</p>
            </div>
          ) : !boxRecord ? (
            <div className="text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhuma caixa selecionada</p>
              <p className="text-xs text-slate-400 mt-1">Bipe ou digite o código para carregar o histórico</p>
            </div>
          ) : (
            /* Mini-resumo da caixa no painel esquerdo após busca */
            <div className="w-full px-6 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${STEP_COLORS[boxRecord.step] ?? 'bg-slate-400'}`} />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  {ORIGIN_LABEL[boxRecord.origin] ?? boxRecord.origin}
                </span>
              </div>
              <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{boxRecord.id}</p>
              <p className="text-xs text-slate-500 mt-0.5">{boxRecord.model || 'Modelo não informado'}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Etapa</p>
                  <p className="text-sm font-bold text-slate-700">{boxRecord.step}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Moviment.</p>
                  <p className="text-sm font-bold text-slate-700">{stepRecords.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Painel direito — conteúdo */}
      <div className="flex-1 h-full overflow-y-auto">
        {searched && boxRecord ? (
          <div className="p-8 max-w-2xl">

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-slate-200">
              <button
                onClick={() => setTab('criacao')}
                className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  tab === 'criacao'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Criação
              </button>
              <button
                onClick={() => setTab('etapas')}
                className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-2 ${
                  tab === 'etapas'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Etapas
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">
                  {stepRecords.length}
                </span>
              </button>
            </div>

            {/* ── Tab: Criação ── */}
            {tab === 'criacao' && (
              <div className="flex flex-col gap-4">

                {/* Cabeçalho */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${STEP_COLORS[boxRecord.step] ?? 'bg-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      {ORIGIN_LABEL[boxRecord.origin] ?? boxRecord.origin}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 font-mono tracking-tight">{boxRecord.id}</h2>
                  <p className="text-sm text-slate-500 mt-1">{boxRecord.model || 'Modelo não informado'}</p>
                </div>

                {/* Data de entrada em destaque */}
                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Data de entrada</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDate(boxRecord.date)}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>

                {/* Grade de dados */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Quantidade</p>
                    <p className="text-xl font-black text-slate-800">{boxRecord.amount}</p>
                    <p className="text-xs text-slate-400">unidades</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Peso</p>
                    <p className="text-xl font-black text-slate-800">{boxRecord.weight}</p>
                    <p className="text-xs text-slate-400">kg</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                    <p className="text-xl font-black text-slate-800">{boxRecord.volume || '—'}</p>
                    <p className="text-xs text-slate-400">caixa</p>
                  </div>
                </div>

                {/* Operador */}
                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">{boxRecord.operator || 'Sistema'}</span>
                  </div>
                  <span className="text-xs text-slate-400">Operador responsável</span>
                </div>

                {/* Observação */}
                {boxRecord.description && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-1">Observação</p>
                    <p className="text-sm text-amber-800">{boxRecord.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Etapas ── */}
            {tab === 'etapas' && (
              <div className="flex flex-col gap-3">
                {stepRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">Nenhuma movimentação registrada</p>
                    <p className="text-xs text-slate-400 mt-1">As etapas aparecerão aqui após a primeira bipagem</p>
                  </div>
                ) : (
                  stepRecords.map((record, index) => (
                    <div key={record.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                      {/* Header do card */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-md ${STEP_COLORS[record.step] ?? 'bg-slate-400'} flex items-center justify-center`}>
                            <span className="text-[10px] font-black text-white">{index + 1}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-800">{record.step}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          record.endTime
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {record.endTime ? 'Concluída' : 'Em andamento'}
                        </span>
                      </div>

                      {/* Corpo do card */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Início</p>
                          <p className="text-sm font-medium text-slate-700">{formatDate(record.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Fim</p>
                          <p className="text-sm font-medium text-slate-700">{formatDate(record.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Tempo em serviço</p>
                          <p className="text-sm font-bold text-slate-800">
                            {record.endTime
                              ? formatWorkingTime(calcWorkingSeconds(record.startTime, record.endTime))
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Operador</p>
                          <p className="text-sm font-medium text-slate-700">{record.operator || '—'}</p>
                        </div>
                        {record.location && (
                          <div className="col-span-2">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Localização</p>
                            <p className="text-sm font-medium text-slate-700">{record.location.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {record.description && (
                          <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-0.5">Observação</p>
                            <p className="text-sm text-amber-800">{record.description}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        ) : !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-400">Selecione uma caixa para ver o histórico</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default History;
