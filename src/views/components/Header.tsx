// src/components/Header.tsx
import React from 'react';

interface HeaderProps {
  abaAtiva: string;
  sidebarAberta: boolean;
  setSidebarAberta: (aberta: boolean) => void;
}

const Header = ({ abaAtiva, sidebarAberta, setSidebarAberta }: HeaderProps) => {
  
  // Função para formatar o título do header com base na aba
  const getTituloAba = () => {
    const titulos: Record<string, string> = {
      dashboard: 'Dashboard',
      estoque: 'Gestão de Estoque',
      config: 'Configurações',
      producao: 'Linha de Produção'
    };
    return titulos[abaAtiva] || 'Sistema';
  };

  return (
    <header className="h-16 bg-[#04203b] flex items-center justify-between px-6 shadow-md border-b border-slate-800 z-10">
      
      {/* Lado Esquerdo: Botão Menu e Título */}
      <div className="flex items-center gap-4">
        {!sidebarAberta && (
          <button 
            onClick={() => setSidebarAberta(true)}
            className="
              text-slate-300 hover:text-white hover:bg-slate-700/50 
              p-2 rounded-lg transition-colors flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
            title="Abrir Menu"
          >
            {/* Ícone de Hamburger (Menu) em SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        
        <h1 className="text-lg font-semibold text-white tracking-wide m-0">
          {getTituloAba()}
        </h1>
      </div>

      {/* Lado Direito: Ações (Notificação, Configuração, Perfil) */}
      <div className="flex items-center gap-5">
        
        {/* Ícone de Sino (Notificações) com o "pontinho" vermelho */}
        <button className="relative text-slate-300 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {/* Bolinha vermelha de notificação */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 border-2 border-[#04203b] rounded-full"></span>
        </button>

        {/* Foto/Avatar do Usuário */}
        <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-slate-700 flex items-center justify-center text-sm font-bold text-white shadow-sm cursor-pointer hover:border-slate-500 transition-colors">
          OP
        </div>

      </div>

    </header>
  );
};

export default Header;

{/*// src/components/Header.tsx
import React from 'react';

interface HeaderProps {
  abaAtiva: string;
  sidebarAberta: boolean;
  setSidebarAberta: (aberta: boolean) => void;
}

const Header = ({ abaAtiva, sidebarAberta, setSidebarAberta }: HeaderProps) => {
  
  // Função para formatar o título do header com base na aba
  const getTituloAba = () => {
    const titulos: Record<string, string> = {
      dashboard: 'Dashboard',
      estoque: 'Gestão de Estoque',
      config: 'Configurações',
      producao: 'Linha de Produção'
    };
    return titulos[abaAtiva] || 'Sistema';
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#04203b',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      {!sidebarAberta && (
        <button 
          onClick={() => setSidebarAberta(true)}
          style={{
            fontSize: '20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            marginRight: '16px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          ☰
        </button>
      )}
      
      <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white', margin: 0 }}>
        {getTituloAba()}
      </h1>
    </header>
  );
};

export default Header;*/}