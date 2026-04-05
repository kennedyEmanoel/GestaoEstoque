import React from 'react';

interface SidebarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  setSidebarAberta: (aberta: boolean) => void; 
}

const Sidebar = ({ abaAtiva, setAbaAtiva, setSidebarAberta }: SidebarProps) => {
  
  const getStyle = (id: string) => ({
    padding: '12px 15px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    background: abaAtiva === id ? '#34495e' : 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '100%',
    transition: '0.2'
  });

  return (
    <aside style={{ 
      width: '250px', 
      height: "100%", 
      background: '#04203b', 
      color: 'white', 
      padding: '20px' 
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '30px',
      }}>
        <button 
          onClick={() => setSidebarAberta(false)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            fontSize: '24px', 
            cursor: 'pointer',
            padding: '0'
          }}
        >
          ☰
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button style={getStyle('dashboard')} onClick={() => setAbaAtiva('dashboard')}>📊 Dashboard</button>
        <button style={getStyle('estoque')} onClick={() => setAbaAtiva('estoque')}>📦 Estoque</button>
        <button style={getStyle('producao')} onClick={() => setAbaAtiva('producao')}>🔨 Produção</button>
        <button style={getStyle('Mov')} onClick={() => setAbaAtiva('Mov')}>🔄 Movimentações</button>
        <button style={getStyle('config')} onClick={() => setAbaAtiva('config')}>⚙️ Configurações</button>
      </nav>
    </aside>
  );
};

export default Sidebar;