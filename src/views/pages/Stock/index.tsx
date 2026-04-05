import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  
  // 👇 NOVO ESTADO: Guarda os dados reais da caixa vinda do banco
  const [caixa, setCaixa] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 👇 NOVA FUNÇÃO: Disparada quando aperta Enter no input
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setBuscando(true);
    setCaixa(null); // Limpa a tela antes de buscar

    try {
      // Chama a nossa API passando o código bipado
      const response = await (window as any).api.getBox(barcode.toUpperCase());
      
      if (response.success && response.data) {
        setCaixa(response.data); // Salva os dados na tela!
      } else {
        alert(response.error || 'Caixa não encontrada!');
      }
    } catch (error) {
      alert('Erro de comunicação com o banco de dados.');
    } finally {
      setBuscando(false);
      setBarcode(''); // Limpa o input para o próximo bipe
      inputRef.current?.focus();
    }
  };

  return (
    <div className="p-8 pb-30 flex flex-col items-center justify-start h-full overflow-y-auto">
      
      <NewBox isOpen={modalAberto} onClose={() => setModalAberto(false)} />

      <div className="w-full max-w-2xl mx-auto flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Estoque</h2>
        <button onClick={() => setModalAberto(true)} className="bg-[#04203b] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          CRIAR CAIXA
        </button>
      </div>

      <div className="w-full max-w-2xl text-center">
        <div className="w-full max-w-2xl mx-auto">
          {/* Adicionamos o onSubmit chamando o handleSearch */}
          <form onSubmit={handleSearch} className="relative w-full shadow-sm rounded-xl">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="BIPAR CÓDIGO DE BARRAS..."
              className="w-full p-4 pr-16 text-xl font-mono uppercase bg-white border-2 border-slate-200 rounded-xl outline-none transition-all placeholder:text-sm placeholder:text-slate-400 placeholder:font-sans focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              disabled={buscando}
            />
            
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
            {buscando ? (
              <span>Buscando caixa no sistema...</span>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                Aguardando leitura do código de barras...
              </>
            )}
          </div>
        </div>

        {/* 👇 RENDERIZAÇÃO CONDICIONAL: Só mostra o card se achar a caixa 👇 */}
        {caixa && (
          <div className="w-full max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className="text-left">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Informações da Caixa
                </h3>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                  {caixa.id} {/* ID DINÂMICO */}
                </h2>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  {caixa.model || 'Sem modelo'} {/* MODELO DINÂMICO */}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
                📦
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Quantidade</p>
                <p className="text-2xl font-bold text-slate-800">
                  {caixa.amount} <span className="text-sm font-medium text-slate-500">UN</span>
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Peso Total</p>
                <p className="text-2xl font-bold text-slate-800">
                  {caixa.weight} <span className="text-sm font-medium text-slate-500">KG</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <p className="text-sm font-semibold text-slate-700">
                Etapa: <span className="text-blue-700 font-bold uppercase">{caixa.etapa}</span>
              </p>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-base">👤</span> {caixa.operator || 'Não informado'}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">🕒</span> 
                {/* Formata a data que vem do banco para o padrão brasileiro */}
                {caixa.date ? new Date(caixa.date).toLocaleDateString('pt-BR') : 'Data não registrada'}
              </div>
            </div>

            <div className="pt-2">
              {caixa.etapa === 'estoque' ? (
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  Iniciar Montagem
                </button>
              ) : (
                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Finalizar Etapa
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
{/*import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 1. Estado para controlar se o Modal está aberto ou fechado
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-8 pb-30 flex flex-col items-center justify-start h-full overflow-y-auto">
      
      {/* 2. O Modal fica aqui aguardando ser chamado * /}
      <NewBox isOpen={modalAberto} onClose={() => setModalAberto(false)} />

      {/* 3. Cabeçalho com o Botão alinhado à direita * /}
      <div className="w-full max-w-2xl mx-auto flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
          Estoque 
        </h2>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-[#04203b] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          CRIAR CAIXA
        </button>
      </div>

      {/* --- DAQUI PARA BAIXO É O SEU CÓDIGO ORIGINAL INTACTO --- * /}
      <div className="w-full max-w-2xl text-center">
        <div className="w-full max-w-2xl mx-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
            }} 
            className="relative w-full shadow-sm rounded-xl"
          >
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="BIPAR CÓDIGO DE BARRAS..."
              className="
                w-full p-4 pr-16 
                text-xl font-mono uppercase bg-white 
                border-2 border-slate-200 rounded-xl outline-none 
                transition-all 
                placeholder:text-sm placeholder:text-slate-400 placeholder:font-sans
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
              "
            />
            
            <button 
              type="submit" 
              className="
                absolute right-2 top-1/2 -translate-y-1/2 
                p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 
                rounded-lg transition-all cursor-pointer flex items-center justify-center
              "
              title="Pesquisar Código"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            Aguardando leitura do código de barras...
          </div>

        </div>
        <div className="
          w-full max-w-md mx-auto mt-10 
          bg-white rounded-2xl shadow-lg 
          border border-slate-200 p-6 flex 
          flex-col gap-6 animate-in fade-in 
          zoom-in-95 duration-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Informações da Caixa
              </h3>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                4GS0001 
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                4G SIMCOM
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
              📦
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Quantidade</p>
              <p className="text-2xl font-bold text-slate-800">
                500 <span className="text-sm font-medium text-slate-500">UN</span>
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Peso Total</p>
              <p className="text-2xl font-bold text-slate-800">
                25,8 <span className="text-sm font-medium text-slate-500">KG</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <p className="text-sm font-semibold text-slate-700">
              Etapa: <span className="text-blue-700 font-bold uppercase">Montagem</span>
            </p>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="text-base">👤</span> Kennedy
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🕒</span> 
              22/04/2026
            </div>
          </div>
          <div className="pt-2">
            {/* BOTÃO AZUL: INICIAR (Use condicional para mostrar apenas este quando a etapa for "estoque") * /}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Iniciar Montagem
            </button>
            {/* BOTÃO VERDE: FINALIZAR (Use condicional para mostrar apenas este quando a etapa for "montagem") * /}
            <button className="hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Finalizar Etapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;

{/*import React, { useState, useRef, useEffect } from 'react';
import NewBox from '../../components/NewBox';

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="
      p-8 flex 
      flex-col 
      items-center 
      justify-center 
    ">
      
      <div className="w-full max-w-2xl text-center">
        <div className="w-full max-w-2xl mx-auto">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
          }} 
          className="relative w-full shadow-sm rounded-xl"
        >
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="BIPAR CÓDIGO DE BARRAS..."
            className="
              w-full p-4 pr-16 
              text-xl font-mono uppercase bg-white 
              border-2 border-slate-200 rounded-xl outline-none 
              transition-all 
              placeholder:text-sm placeholder:text-slate-400 placeholder:font-sans
              focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
            "
          />
          
          <button 
            type="submit" 
            className="
              absolute right-2 top-1/2 -translate-y-1/2 
              p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 
              rounded-lg transition-all cursor-pointer flex items-center justify-center
            "
            title="Pesquisar Código"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          Aguardando leitura do código de barras...
        </div>

      </div>
        <div className="
          w-full max-w-md mx-auto mt-10 
          bg-white rounded-2xl shadow-lg 
          border border-slate-200 p-6 flex 
          flex-col gap-6 animate-in fade-in 
          zoom-in-95 duration-200"
        >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Informações da Caixa
            </h3>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              4GS0001 
            </h2>
            <p className="text-sm font-medium text-slate-600 mt-1">
              4G SIMCOM
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
            📦
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Quantidade</p>
            <p className="text-2xl font-bold text-slate-800">
              500 <span className="text-sm font-medium text-slate-500">UN</span>
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Peso Total</p>
            <p className="text-2xl font-bold text-slate-800">
              25,8 <span className="text-sm font-medium text-slate-500">KG</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <p className="text-sm font-semibold text-slate-700">
            Etapa: <span className="text-blue-700 font-bold uppercase">Montagem</span>
          </p>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👤</span> Kennedy
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🕒</span> 
            22/04/2026
          </div>
        </div>
        <div className="pt-2">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Iniciar Montagem
          </button>
          <button className="hidden w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 uppercase tracking-wide flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Finalizar Etapa
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Inventory;*/}