import React from 'react';

interface HeaderProps {
  abaAtiva: string;
  sidebarAberta: boolean;
  setSidebarAberta: (aberta: boolean) => void;
}

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  dashboard:     { title: 'Painel de Controle', description: 'Indicadores e métricas de produção' },
  movimentacoes: { title: 'Movimentação de Caixas', description: 'Consulta e fluxo de volumes' },
  historico:     { title: 'Histórico',          description: 'Registro de operações realizadas' },
  configuracoes: { title: 'Configurações',      description: 'Parâmetros e preferências do sistema' },
};

const Header = ({ abaAtiva, sidebarAberta, setSidebarAberta }: HeaderProps) => {
  const page = PAGE_TITLES[abaAtiva] ?? { title: 'Sistema', description: '' };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6 flex-shrink-0">

      {/* Esquerda */}
      <div className="flex items-center gap-4">
        {!sidebarAberta && (
          <button
            onClick={() => setSidebarAberta(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            title="Abrir menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div>
          <h1 className="text-sm font-bold text-zinc-900 leading-none">{page.title}</h1>
          {page.description && (
            <p className="text-xs text-zinc-400 mt-0.5">{page.description}</p>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header;
