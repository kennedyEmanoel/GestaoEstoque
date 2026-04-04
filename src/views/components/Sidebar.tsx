// src/views/components/Sidebar.tsx
import React from 'react';

interface SidebarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
}

const Sidebar = ({ abaAtiva, setAbaAtiva }: SidebarProps) => {
  const getStyle = (id: string) => ({
    padding: '10px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    background: abaAtiva === id ? '#34495e' : 'transparent',
    color: 'white',
    border: 'none',
    width: '100%'
  });

  return (
    <aside style={{ width: '250px', background: '#2c3e50', color: 'white', padding: '20px' }}>
      <h2 style={{ marginBottom: '30px' }}>📦 Estoque</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button style={getStyle('dashboard')} onClick={() => setAbaAtiva('dashboard')}>Dashboard</button>
        <button style={getStyle('estoque')} onClick={() => setAbaAtiva('estoque')}>Estoque</button>
        <button style={getStyle('config')} onClick={() => setAbaAtiva('config')}>Configurações</button>
      </nav>
    </aside>
  );
};

export default Sidebar;