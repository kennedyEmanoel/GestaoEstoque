import type { StatusEficiencia } from '../../../shared/analise';
import type { DestaqueIndicador } from '../../components/ui/CartaoIndicador';

interface CoresStatus {
  hex: string;
  fundo: string;
  texto: string;
  selo: string;
  rotulo: string;
}

export const COR_STATUS: Record<StatusEficiencia, CoresStatus> = {
  meta:        { hex: '#16a34a', fundo: 'bg-emerald-50', texto: 'text-emerald-700', selo: 'bg-emerald-100 text-emerald-700', rotulo: 'Na meta' },
  proximo:     { hex: '#d97706', fundo: 'bg-amber-50',   texto: 'text-amber-700',   selo: 'bg-amber-100 text-amber-700',     rotulo: 'Próximo da meta' },
  critico:     { hex: '#dc2626', fundo: 'bg-red-50',     texto: 'text-red-700',     selo: 'bg-red-100 text-red-700',         rotulo: 'Crítico' },
  'sem-dados': { hex: '#cbd5e1', fundo: 'bg-zinc-50',    texto: 'text-zinc-400',    selo: 'bg-zinc-100 text-zinc-500',       rotulo: 'Sem registro' },
};

export const COR_GRAFICO = {
  meta: '#475569',
  eficiencia: '#0f766e',
  mediaMovel: '#7c3aed',
  tendencia: '#2563eb',
  referencia: '#94a3b8',
  selecionado: '#1e3a5f',
  rotuloAusente: '#cbd5e1',
  rotulo: '#475569',
  grade: '#e2e8f0',
};

export function destaqueDoStatus(status: StatusEficiencia): DestaqueIndicador {
  return status === 'sem-dados' ? 'neutro' : status;
}
