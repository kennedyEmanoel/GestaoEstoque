import type { ReactNode } from 'react';

export const controleFiltro =
  'rounded border border-slate-600 bg-[#0f2542] px-2 py-1 text-xs text-slate-100 outline-none ' +
  'focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-400';

export const botaoFiltro =
  'rounded border border-slate-600 bg-transparent px-2 py-1 text-[11px] font-semibold text-slate-300 ' +
  'transition-colors hover:border-blue-400 hover:text-white';

export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-shrink-0 flex-wrap items-end gap-x-4 gap-y-2 border-b-2 border-[#162d4d] bg-[#1e3a5f] px-4 py-2.5">
      {children}
    </div>
  );
}

interface CampoFiltroProps {
  rotulo: string;
  obrigatorio?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function CampoFiltro({ rotulo, obrigatorio, htmlFor, children }: CampoFiltroProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={htmlFor} className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {rotulo}
        {obrigatorio && <span className="text-amber-400"> *</span>}
      </label>
      {children}
    </div>
  );
}
