// src/views/App.tsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Settings from './pages/Settings';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [sidebarAberta, setSidebarAberta] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {sidebarAberta && (
        <Sidebar 
          abaAtiva={abaAtiva} 
          setAbaAtiva={setAbaAtiva} 
          setSidebarAberta={setSidebarAberta} 
        />
      )}

      <main style={{ flex: 1, padding: '30px', background: '#ecf0f1', position: 'relative' }}>
        
        {/* Botão de Abrir: Só aparece quando a sidebar está fechada */}
        {!sidebarAberta && (
          <button 
            onClick={() => setSidebarAberta(true)}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              fontSize: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ☰
          </button>
        )}

        {/* Conteúdo das Páginas */}
        <div style={{ marginTop: sidebarAberta ? '0' : '40px' }}>
          {abaAtiva === 'dashboard' && <Dashboard />}
          {abaAtiva === 'estoque'   && <Stock />}
          {abaAtiva === 'config'    && <Settings />}
          {abaAtiva === 'producao'  && <h1>🔨 Linha de Produção</h1>}
        </div>

      </main>
    </div>
  );
};

export default App;