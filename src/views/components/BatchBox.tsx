import React, { useState, useEffect } from 'react';
import type { ProductionStep, BoxLocation } from '../../shared/types';

const PREFIX_OPTIONS = [
  { value: 'NB2', label: 'NB2' },
  { value: '4GS', label: '4G SIMCOM' },
  { value: 'LOR', label: 'LORA' },
  { value: 'NBL', label: 'NB + LORA' },
  { value: 'BDJ', label: 'BDJ (Bandeja)' },
];

const STEP_OPTIONS: ProductionStep[] = ['Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI', 'Concluida'];
const QUICK_COUNTS = [5, 10, 20, 50];

interface BatchBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const BatchBox = ({ isOpen, onClose }: BatchBoxProps) => {
  const [prefix, setPrefix] = useState('NB2');
  const [count, setCount] = useState('');
  const [weight, setWeight] = useState('');
  const [amount, setAmount] = useState('');
  const [operator, setOperator] = useState('');
  const [step, setStep] = useState<ProductionStep>('Montagem');
  const [description, setDescription] = useState('');

  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const n = parseInt(count, 10);
    if (!prefix || !n || n < 1 || n > 500) {
      setPreviewIds([]);
      return;
    }
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
    setPrefix('NB2');
    setCount('');
    setWeight('');
    setAmount('');
    setOperator('');
    setStep('Montagem');
    setDescription('');
    setPreviewIds([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const n = parseInt(count, 10);
    if (!n || n < 1) return;
    setSubmitting(true);
    try {
      const res = await (window as any).api.createBatchBoxes({
        ids: previewIds,
        weight: parseFloat(weight),
        amount: amount ? parseInt(amount, 10) : undefined,
        step,
        operator: operator.trim() || null,
        description: description.trim() || null,
        location: 'ESTOQUE' as BoxLocation,
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
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 grid grid-cols-2 gap-4 overflow-y-auto">

            {/* Prefixo / Modelo */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Modelo</label>
              <div className="flex gap-2">
                {PREFIX_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrefix(opt.value)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      prefix === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Quantidade de Caixas</label>
              <div className="flex gap-1.5 mb-2">
                {QUICK_COUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCount(String(q))}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                      count === String(q)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                required
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Qtd. de caixas (máx. 500)"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors"
              />
            </div>

            {/* Peso */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Peso padrão (kg)</label>
              <div className="h-8 mb-2" />
              <input
                required
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors"
              />
            </div>

            {/* Quantidade de unidades */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Unidades por caixa</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500 (padrão)"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
              />
            </div>

            {/* Operador */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Operador</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Nome do operador"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
              />
            </div>

            {/* Etapa */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Etapa Inicial</label>
              <select
                value={step}
                onChange={(e) => setStep(e.target.value as ProductionStep)}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-semibold text-zinc-700 transition-colors cursor-pointer"
              >
                {STEP_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Observações <span className="normal-case font-normal text-zinc-300">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Lote de retrabalho, observação geral do lote"
                rows={2}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors resize-none"
              />
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
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                    <p className="font-mono text-xs text-blue-700 leading-relaxed">
                      {previewIds.slice(0, 10).join('  ·  ')}
                      {previewIds.length > 10 && (
                        <span className="text-blue-400">  ·  +{previewIds.length - 10} mais</span>
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loadingPreview || previewIds.length === 0}
              className="flex-[2] py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors shadow-sm"
            >
              {submitting ? 'Registrando...' : `Confirmar ${validCount && previewIds.length ? previewIds.length : ''} Caixas`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchBox;
