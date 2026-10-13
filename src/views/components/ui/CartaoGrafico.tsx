import type { ReactNode } from 'react';

interface CartaoGraficoProps {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
  altura?: number;
  rotuloAria: string;
  rodape?: ReactNode;
  children: ReactNode;
}

export default function CartaoGrafico({
  titulo, subtitulo, acoes, altura = 280, rotuloAria, rodape, children,
}: CartaoGraficoProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">{titulo}</h3>
          {subtitulo && <p className="text-xs text-zinc-500">{subtitulo}</p>}
        </div>
        {acoes}
      </header>
      <div role="img" aria-label={rotuloAria} className="relative" style={{ height: altura }}>
        {children}
      </div>
      {rodape && <div className="text-[11px] leading-relaxed text-zinc-500">{rodape}</div>}
    </section>
  );
}
