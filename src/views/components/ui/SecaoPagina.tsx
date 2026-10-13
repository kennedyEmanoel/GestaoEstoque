import type { ReactNode } from 'react';

interface SecaoPaginaProps {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}

export default function SecaoPagina({ titulo, descricao, acoes, children }: SecaoPaginaProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200 pb-2">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{titulo}</h2>
          {descricao && <p className="text-sm text-zinc-500">{descricao}</p>}
        </div>
        {acoes}
      </header>
      {children}
    </section>
  );
}
