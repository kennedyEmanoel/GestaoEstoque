import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  
  const [caixa, setCaixa] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
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
    } catch (error) {
      alert('Erro de comunicação com o banco de dados.');
    } finally {
      setBuscando(false);
      setBarcode(''); 
      inputRef.current?.focus();
    }
  };

  const getOriginStyle = (origin: string) => {
    switch (origin) {
      case 'RAW': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TRAY': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="p-8 pb-30 flex flex-col items-center justify-start h-full overflow-y-auto">
      
      <NewBox isOpen={modalAberto} onClose={() => setModalAberto(false)} />

      <div className="w-full max-w-2xl mx-auto flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Estoque e Produção</h2>
        <button onClick={() => setModalAberto(true)} className="bg-[#04203b] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          CRIAR CAIXA
        </button>
      </div>

      <div className="w-full max-w-2xl text-center">
        <div className="w-full max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="relative w-full shadow-sm rounded-xl">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="BIPAR CÓDIGO DE BARRAS (RAW, BDJ, NB2...)"
              className="w-full p-4 pr-16 text-xl font-mono uppercase bg-white border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              disabled={buscando}
            />
            
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
            {buscando ? <span>Buscando informações...</span> : "Aguardando leitura do código..."}
          </div>
        </div>

        {caixa && (
          <div className="w-full max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="text-left">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border mb-2 inline-block uppercase ${getOriginStyle(caixa.origin)}`}>
                  {caixa.origin === 'RAW' ? 'Insumo China' : caixa.origin === 'TRAY' ? 'Bandeja' : 'Produção'}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                  {caixa.id}
                </h2>
                <p className="text-sm font-bold text-blue-600 uppercase italic">
                  {caixa.model || 'MODELO NÃO INFORMADO'}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Volume</span>
                 <span className="text-xl font-black text-slate-700">{caixa.volume || 'S/V'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quantidade</p>
                <p className="text-xl font-bold text-slate-800">{caixa.amount} <span className="text-xs">UN</span></p>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Peso Atual</p>
                <p className="text-xl font-bold text-slate-800">{caixa.weight} <span className="text-xs">KG</span></p>
              </div>

              <div className="col-span-2 bg-blue-50/30 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Localização Atual</p>
                  <p className="text-sm font-black text-blue-900 uppercase">{caixa.location || 'Estoque Central'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Etapa</p>
                  <p className="text-sm font-black text-blue-900 uppercase">{caixa.step}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <span className="opacity-50">RESP:</span>
                <span className="text-slate-600">{caixa.operator || 'SISTEMA'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-50">ENTRADA:</span>
                <span className="text-slate-600">
                  {caixa.date ? new Date(caixa.date).toLocaleDateString('pt-BR') : '--/--/--'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              {caixa.origin === 'RAW' ? (
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-sm">
                  Mover para Produção
                </button>
              ) : (
                <button className="w-full bg-[#04203b] hover:bg-blue-900 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-sm">
                  Atualizar Etapa
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;