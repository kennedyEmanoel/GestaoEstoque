import React, { useState, useRef, useEffect } from 'react';

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
        {/*<input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="BIPAR CÓDIGO DE BARRAS..."
          className="
            w-full 
            p-4      
            pr-14            
            text-xl              
            font-mono 
            border-2 
            border-slate-300 
            rounded-xl           
            bg-white 
            shadow-sm 
            uppercase 
            transition-all 
            placeholder:text-sm
            outline-none         
            focus:outline-none    
            focus:border-forge-cerulean 
          "
        />
        <div className="
          mt-4 
          text-base 
          bg-white 
          font-medium 
          text-slate-500 
          flex items-center 
          justify-center 
          gap-2"
        >
          <span className="w-2 h-2 bg-forge-cerulean rounded-full animate-pulse"></span>
          Aguardando leitura do código de barras...
        </div>*/}

        <div className="w-full max-w-2xl mx-auto">
  
        {/* O Form envolve o input e o botão para capturar o "Enter" do leitor */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            // Aqui você vai chamar a sua função de busca depois (ex: handleSearch)
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
          
          {/* Botão Lupa (Posicionado absolutamente à direita) */}
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

        {/* Indicador de Status com a bolinha piscante aprimorada */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          Aguardando leitura do código de barras...
        </div>

      </div>

        {/*<div className="
         w-full 
         h-100 
         mt-10 
         shadow-sm 
         border-2 
         rounded-xl 
         shadow-sm 
         flex border 
         border-slate-300"
        >
          <h3 className="text-lg font-bold text-slate-800">
            Informações da Caixa.
          </h3>
          <h2 className="text-4xl font-black text-slate-900">
            4GS0001
          </h2>
        </div>*/}

        <div className="w-full max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">

        {/* 1. Cabeçalho: ID e Modelo */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Informações da Caixa
            </h3>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              4GS0001 {/* Ex: 4GS0001 */}
            </h2>
            <p className="text-sm font-medium text-slate-600 mt-1">
              4G SIMCOM
            </p>
          </div>
          
          {/* Ícone da Caixa no canto direito */}
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-blue-100">
            📦
          </div>
        </div>

        {/* 2. Grid de Informações: Quantidade e Peso */}
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

        {/* 3. Indicador de Etapa Atual */}
        <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <span className="relative flex h-3 w-3">
            {/* Bolinha piscando (efeito de "ativo") */}
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <p className="text-sm font-semibold text-slate-700">
            Etapa: <span className="text-blue-700 font-bold uppercase">Montagem</span>
          </p>
        </div>

        {/* 4. Rodapé: Operador e Data */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👤</span> Kennedy
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">🕒</span> 
            22/04/2026
          </div>
        </div>

      </div>

      </div>
    </div>
  );
};

export default Inventory;