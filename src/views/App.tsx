import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import History from './pages/History';
import Settings from './pages/Settings';
import Producao from './pages/Producao';
import ProducaoDashboard from './pages/Producao/Dashboard';
import Header from './components/Header';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
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
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}>

        <Header
          abaAtiva={abaAtiva}
          sidebarAberta={sidebarAberta}
          setSidebarAberta={setSidebarAberta}
        />

        <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
          {abaAtiva === 'dashboard'    && <Dashboard />}
          {abaAtiva === 'movimentacoes' && <Stock />}
          {abaAtiva === 'historico'    && <History />}
          {abaAtiva === 'configuracoes' && <Settings />}
          {abaAtiva === 'producao'     && <Producao />}
          {abaAtiva === 'producao-dashboard' && <ProducaoDashboard />}
        </div>

      </main>
    </div>
  );
};

export default App;