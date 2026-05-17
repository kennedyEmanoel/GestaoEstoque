import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';
import BatchBox from '../../components/BatchBox';
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

const TRANSITIONS_INS: Partial<Record<ProductionStep, ProductionStep[]>> = {
  'Separacao': ['Montagem'],
};

function getNextSteps(boxId: string, currentStep: ProductionStep): ProductionStep[] {
  if (boxId.startsWith('4GS')) return TRANSITIONS_4GS[currentStep] ?? [];
  if (boxId.startsWith('INS')) return TRANSITIONS_INS[currentStep] ?? [];
  return DEFAULT_TRANSITIONS[currentStep] ?? [];
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

const STOCK_LOCATIONS: BoxLocation[] = [
  'ESTOQUE', 'ARMARIO_A', 'ARMARIO_B', 'ARMARIO_C', 'ARMARIO_D', 'ARMARIO_E',
  'ARMARIO_F', 'ARMARIO_G', 'ARMARIO_H', 'ARMARIO_I', 'ARMARIO_J',
  'ARMARIO_K', 'ARMARIO_L', 'ARMARIO_M', 'ARMARIO_N', 'ARMARIO_O',
];

const STEP_COLORS: Partial<Record<ProductionStep, { dot: string; badge: string; icon: string }>> = {
  'Separacao': { dot: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700 ring-teal-200',       icon: 'bg-teal-100 text-teal-600'   },
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
  mode: 'start' | 'finish';
  openRecord: any | null;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

const ScanModal = ({ caixa, mode, openRecord, onClose, onSuccess }: ScanModalProps) => {
  const isFinish = mode === 'finish';

  const nextSteps = !isFinish ? getNextSteps(caixa.id, caixa.step as ProductionStep) : [];
  const [selectedStep, setSelectedStep] = useState<ProductionStep>(nextSteps[0]);
  const [location, setLocation] = useState<BoxLocation>(
    isFinish ? 'ESTOQUE' : (LOCATIONS_BY_STEP[nextSteps[0]] ?? [])[0] ?? 'ESTOQUE'
  );
  const [operator, setOperator] = useState('');
  const [description, setDescription] = useState('');
  const [salvando, setSalvando] = useState(false);

  const availableLocations: BoxLocation[] = isFinish
    ? STOCK_LOCATIONS
    : LOCATIONS_BY_STEP[selectedStep] ?? ['ESTOQUE'];

  const handleStepChange = (step: ProductionStep) => {
    setSelectedStep(step);
    setLocation((LOCATIONS_BY_STEP[step] ?? ['ESTOQUE'])[0]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!operator.trim()) return;
    setSalvando(true);
    try {
      if (isFinish) {
        const res = await (window as any).api.finishStep(caixa.id, operator.trim(), location);
        if (res.success) {
          onSuccess({ ...caixa, location: res.data.stockLocation });
        } else {
          alert('Erro ao finalizar: ' + res.error);
        }
      } else {
        const res = await (window as any).api.startStep({
          boxId: caixa.id,
          step: selectedStep,
          operator: operator.trim(),
          location,
          description: description.trim() || undefined,
        });
        if (res.success) {
          onSuccess(res.data.box);
        } else {
          alert('Erro ao iniciar: ' + res.error);
        }
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setSalvando(false);
    }
  };

  const stepColors = STEP_COLORS[caixa.step as ProductionStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5 text-zinc-400">
              {isFinish ? 'Finalizar Etapa' : 'Iniciar Próxima Etapa'}
            </p>
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

        {/* Sem próximas etapas (concluída) */}
        {!isFinish && nextSteps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-800">Produção concluída</p>
            <p className="text-xs text-zinc-400 mt-1">Não há etapas disponíveis para esta caixa.</p>
            <button onClick={onClose} className="mt-6 px-5 py-2.5 text-sm font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

            {/* MODO FINALIZAR: etapa em andamento (somente leitura) */}
            {isFinish && (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                stepColors
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-zinc-50 border-zinc-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stepColors?.dot ?? 'bg-zinc-400'}`} />
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">Em andamento</p>
                  <p className="text-sm font-bold text-amber-900">{openRecord?.step ?? caixa.step}</p>
                </div>
              </div>
            )}

            {/* MODO INICIAR: seletor de próxima etapa */}
            {!isFinish && (
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
            )}

            {/* Localização */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                {isFinish ? 'Destino no Estoque' : 'Localização'}
              </label>
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
                className={`flex-[2] py-2.5 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-40 ${
                  isFinish
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {salvando
                  ? (isFinish ? 'Finalizando...' : 'Iniciando...')
                  : (isFinish ? 'Finalizar Etapa' : 'Iniciar Etapa')}
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
  const [batchModalAberto, setBatchModalAberto] = useState(false);
  const [scanModalAberto, setScanModalAberto] = useState(false);
  const [modalMode, setModalMode] = useState<'start' | 'finish'>('start');
  const [caixa, setCaixa] = useState<any>(null);
  const [boxHistory, setBoxHistory] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);
  const [deletePrefixSelecionado, setDeletePrefixSelecionado] = useState<string>('ALL');
  const [excluindoLote, setExcluindoLote] = useState(false);
  const [expedicaoModalAberto, setExpedicaoModalAberto] = useState(false);
  const [expFilial, setExpFilial] = useState('');
  const [expOperador, setExpOperador] = useState('');
  const [expDescricao, setExpDescricao] = useState('');
  const [expedindo, setExpedindo] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Detecta etapa em andamento pelo registro mais recente sem endTime
  // Usa findLast (do fim) porque o histórico é ordenado por startTime ASC
  const openRecord = [...boxHistory].reverse().find(
    (r: any) => r.endTime === null || r.endTime === undefined
  ) ?? null;
  const hasOpenStep = openRecord !== null;

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
        setBoxHistory(histRes.data);
      }
    } catch {
      alert('Erro de comunicação com o banco de dados.');
    } finally {
      setBuscando(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  const handleDelete = async () => {
    if (!caixa) return;
    if (!window.confirm(`Excluir permanentemente "${caixa.id}" e todo o seu histórico?`)) return;
    setExcluindo(true);
    try {
      const res = await (window as any).api.deleteBox(caixa.id);
      if (res.success) {
        setCaixa(null);
        setBoxHistory([]);
      } else {
        alert('Erro ao excluir: ' + res.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleExpedicao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!caixa) return;
    setExpedindo(true);
    try {
      const res = await (window as any).api.expedicao({
        boxId: caixa.id,
        operator: expOperador.trim(),
        filialDestino: expFilial.trim(),
        description: expDescricao.trim() || undefined,
      });
      if (res.success) {
        setCaixa((prev: any) => ({ ...prev, location: expFilial.trim(), operator: expOperador.trim() }));
        setExpedicaoModalAberto(false);
        setExpFilial(''); setExpOperador(''); setExpDescricao('');
        (window as any).api.getBoxHistory(caixa.id).then((r: any) => {
          if (r.success) setBoxHistory(r.data);
        });
      } else {
        alert('Erro: ' + res.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setExpedindo(false);
    }
  };

  const handleDeleteLote = async () => {
    const label = deletePrefixSelecionado === 'ALL'
      ? 'TODOS os produtos e todo o histórico'
      : `todas as caixas do prefixo ${deletePrefixSelecionado} e seu histórico`;
    if (!window.confirm(`Confirma exclusão permanente de ${label}?\n\nEssa ação não pode ser desfeita.`)) return;
    setExcluindoLote(true);
    try {
      const res = await (window as any).api.deleteManyBoxes(deletePrefixSelecionado);
      if (res.success) {
        alert(`${res.data} caixa(s) excluída(s) com sucesso.`);
        setDeleteModalAberto(false);
        setCaixa(null);
        setBoxHistory([]);
      } else {
        alert('Erro: ' + res.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setExcluindoLote(false);
    }
  };

  const openModal = (mode: 'start' | 'finish') => {
    setModalMode(mode);
    setScanModalAberto(true);
  };

  const stepColors = caixa
    ? (STEP_COLORS[caixa.step as ProductionStep] ?? { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200', icon: 'bg-zinc-100 text-zinc-500' })
    : null;

  const DELETE_PREFIX_OPTIONS = [
    { value: 'ALL', label: 'Todos os produtos' },
    { value: 'NB2', label: 'NB2' },
    { value: '4GS', label: '4G SIMCOM' },
    { value: 'LOR', label: 'LORA' },
    { value: 'NBL', label: 'NB + LORA' },
    { value: 'BDJ', label: 'BDJ (Bandejas)' },
    { value: 'INS', label: 'INS (Insumos)' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      <NewBox isOpen={modalAberto} onClose={() => setModalAberto(false)} />
      <BatchBox isOpen={batchModalAberto} onClose={() => setBatchModalAberto(false)} />

      {/* Modal Expedição */}
      {expedicaoModalAberto && caixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-0.5">Movimentação</p>
                <h2 className="text-base font-bold text-zinc-900">Expedir Caixa</h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">{caixa.id}</p>
              </div>
              <button
                onClick={() => setExpedicaoModalAberto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleExpedicao} className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Filial de Destino <span className="normal-case font-semibold text-indigo-500">(obrigatório)</span>
                </label>
                <input
                  required
                  type="text"
                  value={expFilial}
                  onChange={(e) => setExpFilial(e.target.value)}
                  placeholder="Ex: Filial São Paulo"
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-indigo-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Operador</label>
                <input
                  required
                  type="text"
                  value={expOperador}
                  onChange={(e) => setExpOperador(e.target.value)}
                  placeholder="Nome do operador"
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-indigo-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Observação <span className="normal-case font-normal text-zinc-300">(opcional)</span>
                </label>
                <textarea
                  value={expDescricao}
                  onChange={(e) => setExpDescricao(e.target.value)}
                  placeholder="Ex: Envio urgente, NF 12345..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-indigo-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setExpedicaoModalAberto(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={expedindo}
                  className="flex-[2] py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition-colors shadow-sm"
                >
                  {expedindo ? 'Expedindo...' : 'Confirmar Expedição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal exclusão em massa */}
      {deleteModalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-0.5">Ação destrutiva</p>
                <h2 className="text-base font-bold text-zinc-900">Excluir Caixas em Massa</h2>
              </div>
              <button
                onClick={() => setDeleteModalAberto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p className="text-xs text-red-700">Todas as caixas e o histórico completo do grupo selecionado serão apagados permanentemente.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Grupo a excluir</label>
                <div className="flex flex-col gap-1.5">
                  {DELETE_PREFIX_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDeletePrefixSelecionado(opt.value)}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-left border transition-colors ${
                        deletePrefixSelecionado === opt.value
                          ? opt.value === 'ALL'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-zinc-800 text-white border-zinc-800'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteModalAberto(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLote}
                  disabled={excluindoLote}
                  className="flex-[2] py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg transition-colors"
                >
                  {excluindoLote ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scanModalAberto && caixa && (
        <ScanModal
          caixa={caixa}
          mode={modalMode}
          openRecord={openRecord}
          onClose={() => setScanModalAberto(false)}
          onSuccess={(updated) => {
            setCaixa(updated);
            setScanModalAberto(false);
            // Recarrega histórico para refletir o novo status
            (window as any).api.getBoxHistory(updated.id).then((res: any) => {
              if (res.success) setBoxHistory(res.data);
            });
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
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteModalAberto(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Excluir Lote
            </button>
            <button
              onClick={() => setBatchModalAberto(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Lote
            </button>
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
                      {hasOpenStep && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Em andamento
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{caixa.model || 'Modelo não informado'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Entrada</p>
                    <p className="text-sm font-medium text-zinc-600">
                      {caixa.date ? new Date(caixa.date).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={excluindo}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    {excluindo ? 'Excluindo...' : 'Excluir'}
                  </button>
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

            {/* ── Botão de ação principal ── */}
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
            ) : caixa.id.startsWith('INS') && caixa.step === 'Separacao' && !hasOpenStep && !caixa.model ? (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-teal-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-800">Caixa disponível — aguardando novo lote</p>
                  <p className="text-xs text-teal-600 mt-0.5">Registre um novo insumo nesta caixa para reutilizá-la.</p>
                </div>
              </div>
            ) : hasOpenStep ? (
              <button
                onClick={() => openModal('finish')}
                className="w-full py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Finalizar Etapa — {openRecord?.step}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openModal('start')}
                  className="w-full py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  Iniciar Próxima Etapa
                </button>
                <button
                  onClick={() => setExpedicaoModalAberto(true)}
                  className="w-full py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  Expedir para Filial
                </button>
              </div>
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
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Duração Líquida</p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {boxHistory.map((record: any, index: number) => {
                    const c = STEP_COLORS[record.step as ProductionStep] ?? { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200' };
                    const startMs = typeof record.startTime === 'number' ? record.startTime * 1000 : record.startTime?.getTime?.() ?? 0;
                    const endMs   = record.endTime
                      ? (typeof record.endTime === 'number' ? record.endTime * 1000 : record.endTime.getTime())
                      : null;
                    const isOpen  = record.stepStatus === 'OPEN' || record.endTime === null;
                    return (
                      <div key={record.id} className="px-5 py-3 grid grid-cols-[24px_1fr_1fr_1fr_auto] gap-x-4 items-center">
                        <span className="text-xs font-bold text-zinc-300 text-right">{index + 1}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 w-fit ${c.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${isOpen ? 'animate-pulse' : ''}`} />
                          {record.step}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {startMs ? new Date(startMs).toLocaleString('pt-BR') : '—'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {record.operator || <span className="text-zinc-300">—</span>}
                        </span>
                        {isOpen ? (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 ring-1 ring-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Em andamento
                          </span>
                        ) : record.timeSpent != null ? (
                          <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">
                            {formatWorkingTime(record.timeSpent)}
                          </span>
                        ) : endMs ? (
                          <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">
                            {formatWorkingTime(calcWorkingSeconds(startMs, endMs))}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
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
