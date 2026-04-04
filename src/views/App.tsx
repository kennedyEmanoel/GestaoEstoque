// src/views/App.tsx
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      
      <Sidebar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />

      <main style={{ flex: 1, padding: '30px', background: '#ecf0f1', overflowY: 'auto' }}>
        
        {abaAtiva === 'dashboard' && <Dashboard />}
        {abaAtiva === 'estoque'   && <Inventory />}
        {abaAtiva === 'config'    && <Settings />}

      </main>
    </div>
  );
};

export default App;