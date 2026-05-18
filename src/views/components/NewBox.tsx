import React, { useState, useMemo } from 'react';

const PREFIX_TO_MODEL: Record<string, string> = {
  'NB2': 'NB2',
  '4GS': '4G SIMCOM',
  'LOR': 'LORA',
  'NBL': 'NB + LORA',
  'INS': 'Insumo',
};

interface NewBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = ['200', '300', '450', '500'];

const PRODUCT_OPTIONS = [
  { value: 'NB2',      label: 'NB2' },
  { value: '4G SIMCOM',label: '4G SIMCOM' },
  { value: 'LORA',     label: 'LORA' },
  { value: 'NB + LORA',label: 'NB + LORA' },
];

// mantém retrocompatibilidade com código que referencia INS_PRODUCT_OPTIONS
const INS_PRODUCT_OPTIONS = PRODUCT_OPTIONS;

const NewBox = ({ isOpen, onClose }: NewBoxProps) => {
  const [formData, setFormData] = useState({
    id: '',
    amount: '',
    weight: '',
    operator: '',
    step: 'Montagem',
    description: '',
    volume: '',
    location: 'ESTOQUE',
  });
  const [insProduct, setInsProduct] = useState(INS_PRODUCT_OPTIONS[0].value);

  const derivedPrefix = useMemo(() => formData.id.trim().toUpperCase().substring(0, 3), [formData.id]);
  const derivedModel = useMemo(() => PREFIX_TO_MODEL[derivedPrefix] ?? null, [derivedPrefix]);
  const isInsumo = derivedPrefix === 'INS';
  const isBandeja = derivedPrefix === 'BDJ';
  const [bdjModel, setBdjModel] = useState(PRODUCT_OPTIONS[0].value);

  if (!isOpen) return null;

  const set = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const payload = isInsumo
        ? { ...formData, amount: '450', step: 'Separacao', weight: formData.weight || '0', model: insProduct }
        : isBandeja
        ? { ...formData, model: bdjModel }
        : formData;
      const response = await (window as any).api.createBox(payload);
      if (response.success) {
        alert('Caixa registrada com sucesso no sistema!');
        setFormData({ id: '', amount: '', weight: '', operator: '', step: 'Montagem', description: '', volume: '', location: 'ESTOQUE' });
        onClose();
      } else {
        alert('Atenção: ' + response.error);
      }
    } catch {
      alert('Erro de comunicação com o sistema.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Nova Entrada</p>
            <h2 className="text-base font-bold text-zinc-900">Registrar Nova Caixa</h2>
            <p className="text-xs text-zinc-400 mt-0.5">BDJ (Bandeja) · NB2 / 4GS (Produto) · INS (Insumo)</p>
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">

          {/* ID */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Código ID — Bipe o etiqueta</label>
            <input
              required
              type="text"
              value={formData.id}
              onChange={(e) => set('id', e.target.value.toUpperCase())}
              placeholder="INS..., BDJ... ou NB2..."
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none font-mono text-lg text-zinc-900 transition-colors"
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Volume</label>
            <input
              type="text"
              value={formData.volume}
              onChange={(e) => set('volume', e.target.value)}
              placeholder="Ex: 1/111"
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
            />
          </div>

          {/* Localização (readonly) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Localização</label>
            <div className="w-full px-3 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-400 font-medium">
              Estoque (entrada padrão)
            </div>
          </div>

          {/* Produto */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Produto{' '}
              {(isInsumo || isBandeja) && (
                <span className="normal-case font-semibold text-teal-600">(obrigatório)</span>
              )}
            </label>
            {isInsumo ? (
              <div className="flex gap-2">
                {PRODUCT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setInsProduct(opt.value)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      insProduct === opt.value
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : isBandeja ? (
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
            ) : (
              <div className={`w-full px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                derivedModel
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400'
              }`}>
                {derivedModel ?? 'Será definido pelo código ID'}
              </div>
            )}
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Quantidade
            </label>
            {isInsumo ? (
              <div className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-bold text-amber-700">
                450 unidades (fixo para Insumo)
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 mb-2">
                  {QUICK_AMOUNTS.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => set('amount', qty)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                        formData.amount === qty
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
                <input
                  required
                  type="number"
                  value={formData.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors"
                />
              </>
            )}
          </div>

          {/* Peso */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Peso (kg) {isInsumo && <span className="normal-case font-normal text-zinc-300">(opcional)</span>}
            </label>
            {!isInsumo && <div className="h-8 mb-2" />}
            <input
              required={!isInsumo}
              type="number"
              step="0.01"
              value={formData.weight}
              onChange={(e) => set('weight', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-bold text-zinc-700 transition-colors"
            />
          </div>

          {/* Operador */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Operador</label>
            <input
              required
              type="text"
              value={formData.operator}
              onChange={(e) => set('operator', e.target.value)}
              placeholder="Nome do operador"
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors"
            />
          </div>

          {/* Etapa */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Etapa Atual</label>
            {isInsumo ? (
              <div className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-700">
                Separação (fixo para Insumo)
              </div>
            ) : (
              <select
                value={formData.step}
                onChange={(e) => set('step', e.target.value)}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm font-semibold text-zinc-700 transition-colors cursor-pointer"
              >
                <option value="Montagem">Montagem</option>
                <option value="Soldagem">Soldagem</option>
                <option value="Revisao">Revisão</option>
                <option value="Firmware">Firmware</option>
                <option value="IMEI">IMEI</option>
                <option value="Concluida">Concluída</option>
              </select>
            )}
          </div>

          {/* Observações */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Observações <span className="normal-case font-normal text-zinc-300">(opcional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ex: Lote vindo de retrabalho ou observação da caixa"
              rows={2}
              className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-blue-400 focus:bg-white outline-none text-sm text-zinc-700 transition-colors resize-none"
            />
          </div>

          {/* Ações */}
          <div className="col-span-2 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              Confirmar Entrada
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NewBox;
