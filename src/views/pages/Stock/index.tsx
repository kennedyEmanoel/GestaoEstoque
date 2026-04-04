/*import React from 'react';
const Inventory = () => {
  return (
    <section></section>
  );
};

export default Inventory;*/

import React, { useState, useRef, useEffect } from 'react';

const Inventory = () => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático ao abrir a página
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-forge-navy">Gestão de Estoque</h1>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="BIPAR CAIXA AGORA..."
          className="w-full p-5 text-2xl font-mono border-2 border-slate-300 rounded-xl focus:border-forge-cerulean outline-none bg-white shadow-sm uppercase"
        />
        <div className="mt-2 text-sm text-slate-500">
          Aguardando leitura do código de barras...
        </div>
      </div>
    </div>
  );
};

export default Inventory;