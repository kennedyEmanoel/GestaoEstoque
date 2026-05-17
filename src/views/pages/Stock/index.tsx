import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';
import type { ProductionStep, BoxLocation } from '../../../shared/types';
import { calcWorkingSeconds, formatWorkingTime } from '../../../shared/workingTime';

// ─── Máquina de estados ───────────────────────────────────────────────────────

const DEFAULT_TRANSITIONS: Partial<Record<ProductionStep, ProductionStep[]>> = {
  'Montagem':  ['Soldagem'],
  'Soldagem':  ['Revisao'],
  'Revisao':   ['Firmware'],
  'Firmware':  ['IMEI'],
  'IMEI':      ['Concluida'],
};

const TRANSITIONS_4GS: Partial<Record<ProductionStep, ProductionStep[]>> = {
  'Montagem':  ['Soldagem'],
  'Soldagem':  ['Revisao'],
  'Revisao':   ['IMEI', 'Firmware'],
  'IMEI':      ['Firmware', 'Concluida'],
  'Firmware':  ['IMEI', 'Concluida'],
};

function getNextSteps(boxId: string, currentStep: ProductionStep): ProductionStep[] {
  const map = boxId.startsWith('4GS') ? TRANSITIONS_4GS : DEFAULT_TRANSITIONS;
  return map[currentStep] ?? [];
}

// ─── Localizações ─────────────────────────────────────────────────────────────

const LOCATION_LABELS: Record<BoxLocation, string> = {
  'ESTOQUE':      'Estoque',
  'ARMARIO_A':    'Estoque — Armário A',
  'ARMARIO_B':    'Estoque — Armário B',
  'ARMARIO_C':    'Estoque — Armário C',
  'ARMARIO_D':    'Estoque — Armário D',
  'ARMARIO_E':    'Estoque — Armário E',
  'ARMARIO_F':    'Estoque — Armário F',
  'ARMARIO_G':    'Estoque — Armário G',
  'ARMARIO_H':    'Estoque — Armário H',
  'ARMARIO_I':    'Estoque — Armário I',
  'ARMARIO_J':    'Estoque — Armário J',
  'ARMARIO_K':    'Estoque — Armário K',
  'ARMARIO_L':    'Estoque — Armário L',
  'ARMARIO_M':    'Estoque — Armário M',
  'ARMARIO_N':    'Estoque — Armário N',
  'ARMARIO_O':    'Estoque — Armário O',
  'MONTAGEM_01':  'Produção — Montagem 01',
  'MONTAGEM_02':  'Produção — Montagem 02',
  'SOLDAGEM_01':  'Produção — Soldagem 01',
  'SOLDAGEM_02':  'Produção — Soldagem 02',
  'SOLDAGEM_03':  'Produção — Soldagem 03',
  'SOLDAGEM_04':  'Produção — Soldagem 04',
  'REVISAO_01':   'Produção — Revisão 01',
  'REVISAO_02':   'Produção — Revisão 02',
  'REVISAO_03':   'Produção — Revisão 03',
  'REVISAO_04':   'Produção — Revisão 04',
  'GRAVACAO_01':  'Produção — Gravação 01',
  'GRAVACAO_02':  'Produção — Gravação 02',
  'GRAVACAO_03':  'Produção — Gravação 03',
  'GRAVACAO_04':  'Produção — Gravação 04',
  'GRAVACAO_05':  'Produção — Gravação 05',
  'GRAVACAO_06':  'Produção — Gravação 06',
};

const LOCATIONS_BY_STEP: Partial<Record<ProductionStep, BoxLocation[]>> = {
  'Montagem':  ['MONTAGEM_01', 'MONTAGEM_02'],
  'Soldagem':  ['SOLDAGEM_01', 'SOLDAGEM_02', 'SOLDAGEM_03', 'SOLDAGEM_04'],
  'Revisao':   ['REVISAO_01', 'REVISAO_02', 'REVISAO_03', 'REVISAO_04'],
  'Firmware':  ['GRAVACAO_01', 'GRAVACAO_02', 'GRAVACAO_03', 'GRAVACAO_04', 'GRAVACAO_05', 'GRAVACAO_06'],
  'IMEI':      ['GRAVACAO_01', 'GRAVACAO_02', 'GRAVACAO_03', 'GRAVACAO_04', 'GRAVACAO_05', 'GRAVACAO_06'],
  'Concluida': ['ESTOQUE', 'ARMARIO_A', 'ARMARIO_B', 'ARMARIO_C', 'ARMARIO_D', 'ARMARIO_E',
                'ARMARIO_F', 'ARMARIO_G', 'ARMARIO_H', 'ARMARIO_I', 'ARMARIO_J',
                'ARMARIO_K', 'ARMARIO_L', 'ARMARIO_M', 'ARMARIO_N', 'ARMARIO_O'],
};

const STEP_COLORS: Partial<Record<ProductionStep, { dot: string; badge: string; icon: string }>> = {
  'Montagem':  { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-200', icon: 'bg-violet-100 text-violet-600' },
  'Soldagem':  { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200', icon: 'bg-orange-100 text-orange-600' },
  'Revisao':   { dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', icon: 'bg-yellow-100 text-yellow-600' },
  'Firmware':  { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200',       icon: 'bg-blue-100 text-blue-600'   },
  'IMEI':      { dot: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-700 ring-cyan-200',       icon: 'bg-cyan-100 text-cyan-600'   },
  'Concluida': { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
};

// ─── ScanModal ────────────────────────────────────────────────────────────────

interface ScanModalProps {
  caixa: any;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

const ScanModal = ({ caixa, onClose, onSuccess }: ScanModalProps) => {
  const nextSteps = getNextSteps(caixa.id, caixa.step as ProductionStep);
  const [selectedStep, setSelectedStep] = useState<ProductionStep>(nextSteps[0]);
  const [location, setLocation] = useState<BoxLocation>(
    (LOCATIONS_BY_STEP[nextSteps[0]] ?? [])[0] ?? 'ESTOQUE'
  );
  const [operator, setOperator] = useState('');
  const [description, setDescription] = useState('');
  const [salvando, setSalvando] = useState(false);

  const availableLocations: BoxLocation[] = LOCATIONS_BY_STEP[selectedStep] ?? ['ESTOQUE'];

  const handleStepChange = (step: ProductionStep) => {
    setSelectedStep(step);
    const locs = LOCATIONS_BY_STEP[step] ?? ['ESTOQUE'];
    setLocation(locs[0]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!operator.trim()) return;
    setSalvando(true);
    try {
      const response = await (window as any).api.scanBox({
        boxId: caixa.id,
        step: selectedStep,
        operator: operator.trim(),
        location,
        description: description.trim() || undefined,
      });
      if (response.success) {
        onSuccess(response.data.box);
      } else {
        alert('Erro: ' + response.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Atualizar Etapa</p>
            <p className="text-base font-bold text-zinc-900 font-mono">{caixa.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {nextSteps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-800">Produção concluída</p>
            <p className="text-xs text-zinc-400 mt-1">Não há etapas disponíveis para esta caixa.</p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 text-sm font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

            {/* Próxima Etapa */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Próxima Etapa</label>
              <div className="flex gap-2">
                {nextSteps.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleStepChange(step)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                      selectedStep === step
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-800'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            {/* Localização */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Localização</label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value as BoxLocation)}
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-zinc-700 transition-colors cursor-pointer"
              >
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>{LOCATION_LABELS[loc]}</option>
                ))}
              </select>
            </div>

            {/* Operador */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Operador</label>
              <input
                required
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Nome do operador"
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-zinc-700 transition-colors"
              />
            </div>

            {/* Observação */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Observação <span className="normal-case font-normal text-zinc-300">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Retrabalho, peça trocada..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-zinc-700 transition-colors resize-none"
              />
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-[2] py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

// ─── Detail Cards ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-black text-zinc-900 leading-none">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{unit}</p>
    </div>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [scanModalAberto, setScanModalAberto] = useState(false);
  const [caixa, setCaixa] = useState<any>(null);
  const [boxHistory, setBoxHistory] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setBuscando(true);
    setCaixa(null);
    setBoxHistory([]);
    try {
      const [boxRes, histRes] = await Promise.all([
        (window as any).api.getBox(barcode.toUpperCase()),
        (window as any).api.getBoxHistory(barcode.toUpperCase()),
      ]);
      if (boxRes.success && boxRes.data) {
        setCaixa(boxRes.data);
      } else {
        alert(boxRes.error || 'Caixa não encontrada!');
      }
      if (histRes.success) {
        setBoxHistory(histRes.data.filter((r: any) => r.typeOperation === 'SCAN_START'));
      }
    } catch {
      alert('Erro de comunicação com o banco de dados.');
    } finally {
      setBuscando(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  const stepColors = caixa ? (STEP_COLORS[caixa.step as ProductionStep] ?? { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200', icon: 'bg-zinc-100 text-zinc-500' }) : null;

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      <NewBox isOpen={modalAberto} onClose={() => setModalAberto(false)} />

      {scanModalAberto && caixa && (
        <ScanModal
          caixa={caixa}
          onClose={() => setScanModalAberto(false)}
          onSuccess={(updated) => {
            setCaixa(updated);
            setScanModalAberto(false);
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-6">
          <span>Estoque</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-zinc-600 font-medium">Consulta & Movimentação</span>
        </div>

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Estoque & Produção</h1>
            <p className="text-sm text-zinc-500 mt-1">Consulte e movimente caixas por código de barras</p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova Caixa
          </button>
        </div>

        {/* ── Barra de busca ── */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Buscar Caixa</p>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Bipar ou digitar código da caixa..."
                className="w-full pl-9 pr-4 py-2.5 text-sm font-mono uppercase bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors text-zinc-700 placeholder:normal-case placeholder:font-sans"
                disabled={buscando}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={buscando || !barcode.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* ── Estado vazio / spinner ── */}
        {!caixa && (
          <div className="bg-white rounded-xl border border-zinc-200 py-16 flex flex-col items-center justify-center text-center">
            {buscando ? (
              <>
                <div className="w-8 h-8 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-zinc-500">Buscando caixa...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-zinc-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-zinc-600">Aguardando leitura</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">Bipe o código de barras ou digite o código manualmente no campo acima</p>
              </>
            )}
          </div>
        )}

        {/* ── Detalhes da caixa ── */}
        {caixa && stepColors && (
          <div className="flex flex-col gap-4">

            {/* Cabeçalho da caixa */}
            <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stepColors.icon} flex items-center justify-center flex-shrink-0`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-zinc-900 font-mono tracking-tight">{caixa.id}</h2>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${stepColors.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stepColors.dot}`} />
                        {caixa.step}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{caixa.model || 'Modelo não informado'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-400">Entrada</p>
                  <p className="text-sm font-medium text-zinc-600">
                    {caixa.date ? new Date(caixa.date).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Quantidade" value={caixa.amount ?? '—'} unit="unidades" />
              <MetricCard label="Peso" value={caixa.weight ?? '—'} unit="kg" />
              <MetricCard label="Volume" value={caixa.volume || '—'} unit="caixa" />
            </div>

            {/* Localização e operador */}
            <div className="bg-white rounded-xl border border-zinc-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Localização</p>
                  <p className="text-sm font-semibold text-zinc-700">
                    {LOCATION_LABELS[caixa.location as BoxLocation] || caixa.location || 'Estoque'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Operador</p>
                  <p className="text-sm font-semibold text-zinc-700">{caixa.operator || 'Sistema'}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Observação */}
            {caixa.description && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-0.5">Observação</p>
                  <p className="text-sm text-amber-800">{caixa.description}</p>
                </div>
              </div>
            )}

            {/* Ação */}
            {caixa.step === 'Concluida' ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">Produção concluída</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Esta caixa completou todas as etapas de produção.</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setScanModalAberto(true)}
                className="w-full py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                Atualizar Etapa
              </button>
            )}

            {/* Histórico de etapas */}
            {boxHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Histórico de Etapas</p>
                  <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{boxHistory.length}</span>
                </div>
                <div className="grid grid-cols-[24px_1fr_1fr_1fr_auto] gap-x-4 px-5 py-2 bg-zinc-50 border-b border-zinc-100">
                  <span />
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Etapa</p>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Início</p>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Operador</p>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Duração</p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {boxHistory.map((record: any, index: number) => {
                    const c = STEP_COLORS[record.step as ProductionStep] ?? { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200' };
                    const startMs = typeof record.startTime === 'number' ? record.startTime * 1000 : record.startTime?.getTime?.() ?? 0;
                    const endMs   = record.endTime ? (typeof record.endTime === 'number' ? record.endTime * 1000 : record.endTime.getTime()) : null;
                    return (
                      <div key={record.id} className="px-5 py-3 grid grid-cols-[24px_1fr_1fr_1fr_auto] gap-x-4 items-center">
                        <span className="text-xs font-bold text-zinc-300 text-right">{index + 1}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 w-fit ${c.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          {record.step}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {startMs ? new Date(startMs).toLocaleString('pt-BR') : '—'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {record.operator || <span className="text-zinc-300">—</span>}
                        </span>
                        {endMs ? (
                          <span className="text-xs font-semibold text-zinc-500">
                            {formatWorkingTime(calcWorkingSeconds(startMs, endMs))}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 rounded-full">Em andamento</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Inventory;
