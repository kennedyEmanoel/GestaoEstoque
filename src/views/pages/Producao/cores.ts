import type { EtapaResumo } from '../../../shared/types';

export interface CorEtapa {
  bg: string;
  text: string;
  bar: string;
  accent: string;
}

/** Cores por nome. A variação (Firmware, IMEI...) tem prioridade sobre a etapa (Gravação...). */
const PALETA: Record<string, CorEtapa> = {
  Montagem:   { bg: '#1d4ed8', text: '#fff', bar: 'rgba(59,130,246,0.85)',  accent: '#93c5fd' },
  Soldagem:   { bg: '#15803d', text: '#fff', bar: 'rgba(34,197,94,0.85)',   accent: '#86efac' },
  Retrabalho: { bg: '#be123c', text: '#fff', bar: 'rgba(244,63,94,0.85)',   accent: '#fda4af' },
  Revisão:    { bg: '#7e22ce', text: '#fff', bar: 'rgba(168,85,247,0.85)',  accent: '#d8b4fe' },
  Gravação:   { bg: '#b45309', text: '#fff', bar: 'rgba(245,158,11,0.85)',  accent: '#fde68a' },
  Firmware:   { bg: '#b45309', text: '#fff', bar: 'rgba(245,158,11,0.85)',  accent: '#fde68a' },
  IMEI:       { bg: '#0e7490', text: '#fff', bar: 'rgba(6,182,212,0.85)',   accent: '#a5f3fc' },
  Serial:     { bg: '#a21caf', text: '#fff', bar: 'rgba(217,70,239,0.85)',  accent: '#f5d0fe' },
};

const COR_PADRAO: CorEtapa = { bg: '#483751', text: '#fff', bar: 'rgba(107,114,128,0.85)', accent: '#e2e8f0' };

export function corEtapa(resumo: Pick<EtapaResumo, 'etapa' | 'variacao'>): CorEtapa {
  return (resumo.variacao ? PALETA[resumo.variacao] : undefined) ?? PALETA[resumo.etapa] ?? COR_PADRAO;
}
