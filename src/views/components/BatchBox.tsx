import React, { useState, useEffect } from 'react';
import type { ProductionStep, BoxLocation } from '../../shared/types';

const PREFIX_OPTIONS = [
  { value: 'NB2', label: 'NB2' },
  { value: '4GS', label: '4G SIMCOM' },
  { value: 'LOR', label: 'LORA' },
  { value: 'NBL', label: 'NB + LORA' },
  { value: 'BDJ', label: 'BDJ (Bandeja)' },
  { value: 'INS', label: 'INS (Insumo)' },
];

const PRODUCT_OPTIONS = [
  { value: 'NB2',       label: 'NB2' },
  { value: '4G SIMCOM', label: '4G SIMCOM' },
  { value: 'LORA',      label: 'LORA' },
  { value: 'NB + LORA', label: 'NB + LORA' },
];

const STEP_OPTIONS: ProductionStep[] = ['Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI', 'Concluida'];
const QUICK_COUNTS = [5, 10, 20, 50];

interface BatchBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const BatchBox = ({ isOpen, onClose }: BatchBoxProps) => {
  const [prefix, setPrefix]         = useState('NB2');
  const [count, setCount]           = useState('');
  const [weight, setWeight]         = useState('');
  const [amount, setAmount]         = useState('');
  const [operator, setOperator]     = useState('');
  const [step, setStep]             = useState<ProductionStep>('Montagem');
  const [description, setDescription] = useState('');
  const [volume, setVolume]         = useState('');
  const [bdjModel, setBdjModel]     = useState(PRODUCT_OPTIONS[0].value);
  const [insumoModel, setInsumoModel] = useState('');
  const [isInsumo, setIsInsumo]     = useState(false);

  const [previewIds, setPreviewIds]       = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting]       = useState(false);

  const isBandeja      = prefix === 'BDJ';
  const isInsumoPrefix = prefix === 'INS';
  const showInsumo     = isInsumo || isInsumoPrefix;

  // sincroniza toggle ↔ prefixo
  const handlePrefixChange = (val: string) => {
    setPrefix(val);
    if (val === 'INS') setIsInsumo(true);
    else if (isInsumoPrefix) setIsInsumo(false);
  };

  const handleInsumoToggle = () => {
    const next = !isInsumo;
    setIsInsumo(next);
    if (next) setPrefix('INS');
    else if (isInsumoPrefix) setPrefix('NB2');
  };

  useEffect(() => {
    const n = parseInt(count, 10);
    if (!prefix || !n || n < 1 || n > 500) { setPreviewIds([]); return; }
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await (window as any).api.getNextBatchIds(prefix, n);
        if (res.success) setPreviewIds(res.data);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [prefix, count]);

  const reset = () => {
    setPrefix('NB2'); setCount(''); setWeight(''); setAmount('');
    setOperator(''); setStep('Montagem'); setDescription(''); setVolume('');
    setBdjModel(PRODUCT_OPTIONS[0].value); setInsumoModel('');
    setIsInsumo(false); setPreviewIds([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (showInsumo && !insumoModel.trim()) {
      alert('Informe o produto deste insumo antes de continuar.');
      return;
    }
    const n = parseInt(count, 10);
    if (!n || n < 1) return;
    setSubmitting(true);
    try {
      const res = await (window as any).api.createBatchBoxes({
        ids:         previewIds,
        weight:      parseFloat(weight) || 0,
        amount:      amount ? parseInt(amount, 10) : undefined,
        step:        showInsumo ? 'Montagem' : step,
        model:       isBandeja ? bdjModel : showInsumo ? insumoModel.trim() : undefined,
        operator:    operator.trim() || null,
        description: description.trim() || null,
        volume:      volume.trim() || null,
        location:    'ESTOQUE' as BoxLocation,
        isInsumo:    showInsumo,
      });
      if (res.success) {
        alert(`${res.data.length} caixas registradas com sucesso!`);
        reset();
        onClose();
      } else {
        alert('Erro: ' + res.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const n = parseInt(count, 10);
  const validCount = !isNaN(n) && n >= 1 && n <= 500;
  const canSubmit = !submitting && !loadingPreview && previewIds.length > 0
    && (!showInsumo || insumoModel.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Criação em Lote</p>
            <h2 className="text-base font-bold text-zinc-900">Registrar Múltiplas Caixas</h2>
            <p className="text-xs text-zinc-400 mt-0.5">IDs gerados sequencialmente a partir do último cadastrado</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 grid grid-cols-2 gap-4 overflow-y-auto">

            {/* Prefixo */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Tipo / Prefixo</label>
              <div className="flex gap-2 flex-wrap">
                {PREFIX_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => handlePrefixChange(opt.value)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      prefix === opt.value
                        ? opt.value === 'BDJ' ? 'bg-orange-500 text-white border-orange-500'
                        : opt.value === 'INS' ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Insumo */}
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div onClick={handleInsumoToggle}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${showInsumo ? 'bg-teal-600' : 'bg-zinc-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${showInsumo ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className={`text-sm font-semibold ${showInsumo ? 'text-teal-700' : 'text-zinc-500'}`}>
                  Marcar lote como Insumo
                </span>
                {showInsumo && (
                  <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">INSUMO</span>
                )}
              </label>
            </div>

            {/* Produto do insumo — obrigatório quando insumo */}
            {showInsumo && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Produto deste Insumo <span className="normal-case font-semibold text-teal-600">(obrigatório)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {PRODUCT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setInsumoModel(opt.value)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                        insumoModel === opt.value
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input type="text" value={insumoModel}
                  onChange={e => setInsumoModel(e.target.value)}
                  placeholder="Ou digite o produto manualmente..."
                  className={`w-full px-3 py-2.5 bg-zinc-50 border rounded-lg focus:bg-white outline-none text-sm font-semibold text-zinc-700 transition-colors ${
                    insumoModel.trim() ? 'border-teal-400' : 'border-red-300 focus:border-teal-400'
                  }`} />
                {!insumoModel.trim() && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">Selecione ou informe o produto do insumo para continuar.</p>
                )}
              </div>
            )}

            {/* Modelo BDJ */}
            {isBandeja && !showInsumo && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Modelo da Bandeja <span className="normal-case font-semibold text-orange-600">(obrigatório)</span>
                </label>
                <div className="flex gap-2">
                  {PRODUCT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setBdjModel(opt.value)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                        bdjModel === opt.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantidade de caixas */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Quantidade de Caixas</label>
              <div className="flex gap-1.5 mb-2">
                {QUICK_COUNTS.map((q) => (
                  <button key={q} type="button" onClick={() => setCount(String(q))}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                      count === String(q)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}>
                    {q}
                  </button>
                ))}
              </div>
              <input required type="number" min={1} max={500} value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Qtd. de caixas (máx. 500)"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors" />
            </div>

            {/* Volume */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Volume <span className="normal-case font-normal text-zinc-300">(opcional)</span>
              </label>
              <div className="h-8 mb-0" />
              <input type="text" value={volume} onChange={(e) => setVolume(e.target.value)}
                placeholder="Ex: 1/111"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 focus:border-blue-400 focus:bg-white rounded-lg outline-none text-sm font-bold text-zinc-700 transition-colors" />
            </div>

            {/* Peso */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Peso padrão (kg)</label>
              <input required type="number" step="0.01" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors" />
            </div>

            {/* Unidades por caixa */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Unidades por caixa</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="500 (padrão)"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors" />
            </div>

            {/* Operador */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Operador</label>
              <input type="text" value={operator} onChange={(e) => setOperator(e.target.value)}
                placeholder="Nome do operador"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors" />
            </div>

            {/* Etapa */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Etapa Inicial</label>
              {showInsumo ? (
                <div className="w-full px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm font-semibold text-teal-700">
                  Montagem (fixo para Insumo)
                </div>
              ) : (
                <select value={step} onChange={(e) => setStep(e.target.value as ProductionStep)}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-semibold text-zinc-700 transition-colors cursor-pointer">
                  {STEP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Observações <span className="normal-case font-normal text-zinc-300">(opcional)</span>
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Lote de retrabalho, observação geral do lote"
                rows={2}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors resize-none" />
            </div>

            {/* Preview IDs */}
            {validCount && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  IDs que serão gerados
                </label>
                {loadingPreview ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <div className="w-3 h-3 border border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs text-zinc-400">Calculando...</span>
                  </div>
                ) : previewIds.length > 0 ? (
                  <div className={`border rounded-lg px-3 py-2.5 ${
                    showInsumo ? 'bg-teal-50 border-teal-100'
                    : isBandeja ? 'bg-orange-50 border-orange-100'
                    : 'bg-blue-50 border-blue-100'
                  }`}>
                    <p className={`font-mono text-xs leading-relaxed ${
                      showInsumo ? 'text-teal-700' : isBandeja ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {previewIds.slice(0, 10).join('  ·  ')}
                      {previewIds.length > 10 && (
                        <span className={showInsumo ? 'text-teal-400' : isBandeja ? 'text-orange-400' : 'text-blue-400'}>
                          {'  ·  '}+{previewIds.length - 10} mais
                        </span>
                      )}
                    </p>
                    {showInsumo && insumoModel.trim() && (
                      <p className="text-[11px] text-teal-600 font-semibold mt-1.5">
                        Produto: {insumoModel.trim()} · {previewIds.length} caixa(s) INS serão criadas
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 shrink-0">
            <button type="button" onClick={handleClose}
              className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit}
              className={`flex-[2] py-2.5 text-sm font-bold text-white disabled:opacity-40 rounded-lg transition-colors shadow-sm ${
                showInsumo ? 'bg-teal-600 hover:bg-teal-700'
                : isBandeja ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {submitting ? 'Registrando...' : `Confirmar ${validCount && previewIds.length ? previewIds.length : ''} Caixas`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchBox;
