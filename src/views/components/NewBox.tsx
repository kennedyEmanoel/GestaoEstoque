import React, { useState } from 'react';

// Props para controlar o Modal de fora
interface NewBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewBox = ({ isOpen, onClose }: NewBoxProps) => {
  const [formData, setFormData] = useState({
    id: '',
    model: '',
    amount: '',
    weight: '',
    operator: '',
    step:''
  });

  if (!isOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await (window as any).api.createBox(formData);

      if (response.success) {
        alert('Caixa registrada no SQLite com sucesso!');
        setFormData({ id: '', model: '', amount: '', weight: '', operator: '', step:'' });
        onClose(); 
      } else {
        alert('Erro: ' + response.error);
      }
    } catch (error) {
      alert('Erro de comunicação com o sistema.');
    }
  };

  return (
    // Fundo escuro com desfoque que cobre a tela toda
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* Container do Modal */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal com Botão Fechar */}
        <div className="bg-[#04203b] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest">Registrar Nova Caixa</h2>
            <p className="text-blue-200 text-xs mt-1">Preencha os dados para entrada no estoque</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-white bg-slate-800/50 hover:bg-rose-500 rounded-lg p-2 transition-colors"
            title="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
          
          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Código ID (Bipe o código de barras)</label>
            <input required type="text" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value.toUpperCase()})} placeholder="Ex: CS-100235" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none font-mono text-xl transition-all" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Modelo do Produto</label>
            <input required type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="Ex: Módulo 4G v2" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Quantidade</label>
            <input required type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Peso (KG)</label>
            <input required type="number" step="0.01" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} placeholder="0.00" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Nome do Operador</label>
            <input type="text" value={formData.operator} onChange={(e) => setFormData({...formData, operator: e.target.value})} placeholder="Nome completo" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-tighter">Etapa</label>
            <input type="text" value={formData.step} onChange={(e) => setFormData({...formData, step: e.target.value})} placeholder="Etapa" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold" />
          </div>

          <div className="col-span-2 flex gap-4 mt-4">
            <button type="button" onClick={onClose} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 text-lg uppercase tracking-widest">
              Finalizar Cadastro
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NewBox;