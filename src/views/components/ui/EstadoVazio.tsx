import type { ReactNode } from 'react';

interface EstadoVazioProps {
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
}

export default function EstadoVazio({ titulo, texto, acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      <div className="text-sm font-semibold text-zinc-700">{titulo}</div>
      {texto && <div className="max-w-xl text-sm text-zinc-500">{texto}</div>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
