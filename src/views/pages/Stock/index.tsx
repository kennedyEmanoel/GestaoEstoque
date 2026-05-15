import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';
import type { ProductionStep, BoxLocation } from '../../../shared/types';

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

const STEP_COLORS: Partial<Record<ProductionStep, string>> = {
  'Montagem':  'bg-violet-500',
  'Soldagem':  'bg-orange-500',
  'Revisao':   'bg-yellow-500',
  'Firmware':  'bg-blue-500',
  'IMEI':      'bg-cyan-500',
  'Concluida': 'bg-emerald-500',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Atualizar Etapa</p>
            <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{caixa.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {nextSteps.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">Produção concluída</p>
            <p className="text-xs text-slate-400 mt-1">Não há etapas disponíveis para esta caixa.</p>
            <button onClick={onClose} className="mt-5 px-5 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Próxima Etapa</label>
              <div className="flex gap-2">
                {nextSteps.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleStepChange(step)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide border transition-all ${
                      selectedStep === step
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Localização</label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value as BoxLocation)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-slate-400 focus:bg-white outline-none font-medium text-slate-700 transition-colors cursor-pointer"
              >
                {availableLocations.map((loc) => (
                  <option key={loc} value={loc}>{LOCATION_LABELS[loc]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Operador</label>
              <input
                required
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Nome do operador"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-slate-400 focus:bg-white outline-none font-medium text-slate-700 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Observação <span className="normal-case font-normal">(opcional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Retrabalho, peça trocada..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:border-slate-400 focus:bg-white outline-none font-medium text-slate-700 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-[2] py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
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

// ─── Inventory ────────────────────────────────────────────────────────────────

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [scanModalAberto, setScanModalAberto] = useState(false);
  const [caixa, setCaixa] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setBuscando(true);
    setCaixa(null);
    try {
      const response = await (window as any).api.getBox(barcode.toUpperCase());
      if (response.success && response.data) {
        setCaixa(response.data);
      } else {
        alert(response.error || 'Caixa não encontrada!');
      }
    } catch {
      alert('Erro de comunicação com o banco de dados.');
    } finally {
      setBuscando(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full bg-slate-50">

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

      {/* Painel esquerdo — busca */}
      <div className="w-[420px] min-w-[420px] h-full flex flex-col border-r border-slate-200 bg-white">

        {/* Topo */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-base font-bold text-slate-900">Estoque & Produção</h1>
              <p className="text-xs text-slate-400 mt-0.5">Consulta e movimentação de caixas</p>
            </div>
            <button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nova Caixa
            </button>
          </div>

          {/* Campo de busca */}
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Bipar ou digitar código..."
              className="w-full pl-9 pr-4 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:bg-white transition-colors"
              disabled={buscando}
              autoComplete="off"
            />
          </form>
        </div>

        {/* Status da busca */}
        <div className="flex-1 flex items-center justify-center">
          {buscando ? (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Buscando...</p>
            </div>
          ) : !caixa ? (
            <div className="text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Aguardando leitura</p>
              <p className="text-xs text-slate-400 mt-1">Bipe o código de barras ou digite manualmente</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Painel direito — detalhes da caixa */}
      <div className="flex-1 h-full overflow-y-auto">
        {caixa ? (
          <div className="p-8 max-w-2xl">

            {/* Cabeçalho da caixa */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${STEP_COLORS[caixa.step as ProductionStep] ?? 'bg-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {caixa.origin === 'TRAY' ? 'Bandeja' : 'Produção'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {caixa.date ? new Date(caixa.date).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">{caixa.id}</h2>
              <p className="text-sm text-slate-500 mt-1">{caixa.model || 'Modelo não informado'}</p>
            </div>

            {/* Status da etapa */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${STEP_COLORS[caixa.step as ProductionStep] ?? 'bg-slate-400'} flex items-center justify-center`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Etapa atual</p>
                  <p className="text-sm font-bold text-slate-800">{caixa.step}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Localização</p>
                <p className="text-sm font-semibold text-slate-700">
                  {LOCATION_LABELS[caixa.location as BoxLocation] || caixa.location || 'Estoque'}
                </p>
              </div>
            </div>

            {/* Grade de dados */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Quantidade</p>
                <p className="text-xl font-black text-slate-800">{caixa.amount}</p>
                <p className="text-xs text-slate-400">unidades</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Peso</p>
                <p className="text-xl font-black text-slate-800">{caixa.weight}</p>
                <p className="text-xs text-slate-400">kg</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                <p className="text-xl font-black text-slate-800">{caixa.volume || '—'}</p>
                <p className="text-xs text-slate-400">caixa</p>
              </div>
            </div>

            {/* Rodapé de info */}
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                <span className="font-medium">{caixa.operator || 'Sistema'}</span>
              </div>
              <span className="text-xs text-slate-400">Operador responsável</span>
            </div>

            {/* Observação */}
            {caixa.description && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-1">Observação</p>
                <p className="text-sm text-amber-800">{caixa.description}</p>
              </div>
            )}

            {/* Ação */}
            {caixa.step === 'Concluida' ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Produção concluída
              </div>
            ) : (
              <button
                onClick={() => setScanModalAberto(true)}
                className="w-full py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Atualizar Etapa
              </button>
            )}

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-400">Selecione uma caixa para ver os detalhes</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Inventory;
