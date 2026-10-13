import type { ReactNode } from 'react';

export type DestaqueIndicador = 'neutro' | 'meta' | 'proximo' | 'critico';

const BORDA: Record<DestaqueIndicador, string> = {
  neutro: 'border-t-zinc-300',
  meta: 'border-t-emerald-500',
  proximo: 'border-t-amber-500',
  critico: 'border-t-red-500',
};

const VALOR: Record<DestaqueIndicador, string> = {
  neutro: 'text-zinc-900',
  meta: 'text-emerald-600',
  proximo: 'text-amber-600',
  critico: 'text-red-600',
};

interface CartaoIndicadorProps {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  destaque?: DestaqueIndicador;
  dica?: string;
  compacto?: boolean;
  children?: ReactNode;
}

export default function CartaoIndicador({
  rotulo, valor, detalhe, destaque = 'neutro', dica, compacto = false, children,
}: CartaoIndicadorProps) {
  return (
    <div
      title={dica}
      className={`flex flex-col gap-2 rounded-xl border border-t-4 border-zinc-200 bg-white p-4 shadow-sm ${BORDA[destaque]}`}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{rotulo}</div>
      <div className={`${compacto ? 'text-2xl' : 'text-3xl'} font-extrabold leading-tight tabular-nums ${VALOR[destaque]}`}>{valor}</div>
      {children}
      {detalhe && <div className="text-xs leading-relaxed text-zinc-500">{detalhe}</div>}
    </div>
  );
}
