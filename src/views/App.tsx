import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Settings from './pages/Settings';
import Header from './components/Header';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('estoque');
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {sidebarAberta && (
        <div style={{
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 50, 
          height: '100vh',
          boxShadow: '10px 0 15px rgba(0,0,0,0.1)'
        }}>
          <Sidebar 
            abaAtiva={abaAtiva} 
            setAbaAtiva={setAbaAtiva} 
            setSidebarAberta={setSidebarAberta} 
          />
        </div>
      )}

      <main style={{ 
        width: '100vw', 
        height: '100vh', 
        padding: 0, 
        boxSizing: 'border-box'
      }}>

        <Header 
          abaAtiva={abaAtiva} 
          sidebarAberta={sidebarAberta} 
          setSidebarAberta={setSidebarAberta} 
        />

        <div style={{ width: '100%', height: '100%' }}>
          {abaAtiva === 'dashboard' && <Dashboard />}
          {abaAtiva === 'estoque'   && <Stock />}
          {abaAtiva === 'config'    && <Settings />}
          {abaAtiva === 'producao'  && <h1 style={{ textAlign: 'center', margin: 0, paddingTop: '20px' }}>🔨 Linha de Produção</h1>}
        </div>

      </main>
    </div>
  );
};

export default App;