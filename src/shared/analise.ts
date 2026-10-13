import { dataIsoValida, diasEntre } from './datas';

export const PERIODO_MIN_DIAS = 7;
export const PERIODO_MAX_DIAS = 366;

export const LIMITE_META = 100;
export const LIMITE_CRITICO = 80;

export const LIMITE_CONSISTENCIA_ALTA = 10;
export const LIMITE_CONSISTENCIA_MODERADA = 20;
export const MIN_DIAS_CONSISTENCIA = 3;

export const MIN_DIAS_TENDENCIA = 5;
export const VARIACAO_MIN_TENDENCIA = 3;
export const R2_MIN_TENDENCIA = 0.1;
export const JANELA_MEDIA_MOVEL = 3;
export const MAX_ITENS_CRITICOS = 10;

export type FiltroVariacao = 'todas' | 'sem' | number;
export type StatusEficiencia = 'meta' | 'proximo' | 'critico' | 'sem-dados';
export type NivelConsistencia = 'alta' | 'moderada' | 'baixa' | 'insuficiente';
export type DirecaoTendencia = 'subindo' | 'estavel' | 'caindo' | 'insuficiente';

export interface FiltroAnalise {
  operadorId: number;
  produtoId: number;
  etapaId: number;
  variacao: FiltroVariacao;
  inicio: string;
  fim: string;
}

export interface CombinacaoAnalise {
  operadorId: number;
  operador: string;
  operadorAtivo: boolean;
  produtoId: number;
  produto: string;
  etapaId: number;
  etapa: string;
  variacaoId: number | null;
  variacao: string | null;
  primeiraData: string;
  ultimaData: string;
  dias: number;
}

export interface RegistroDeAnalise {
  data: string;
  horarioBloco: string;
  meta: number;
  realizado: number;
}

export interface FiltroResolvido {
  operadorId: number;
  operador: string;
  produtoId: number;
  produto: string;
  etapaId: number;
  etapa: string;
  variacao: FiltroVariacao;
  variacaoRotulo: string;
  inicio: string;
  fim: string;
  diasNoPeriodo: number;
}

export interface CelulaHoraria {
  bloco: string;
  registrado: boolean;
  meta: number | null;
  realizado: number | null;
  saldo: number | null;
  eficiencia: number | null;
}

export interface DiaAnalise {
  data: string;
  diaSemana: number;
  registrado: boolean;
  meta: number;
  realizado: number;
  saldo: number;
  eficiencia: number | null;
  status: StatusEficiencia;
  horas: CelulaHoraria[];
}

export interface HorarioAnalise {
  bloco: string;
  diasComRegistro: number;
  meta: number;
  realizado: number;
  saldo: number;
  eficiencia: number | null;
  metaMedia: number | null;
  realizadoMedio: number | null;
  diasAbaixoDaMeta: number;
  diasZerados: number;
  status: StatusEficiencia;
}

export interface ResumoConsistencia {
  nivel: NivelConsistencia;
  desvioPadrao: number | null;
  coeficienteVariacao: number | null;
  diasConsiderados: number;
}

export interface DiaDestaque {
  data: string;
  eficiencia: number;
}

export interface HorarioDestaque {
  bloco: string;
  eficiencia: number;
}

export interface ResumoGeral {
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  eficienciaGlobal: number | null;
  status: StatusEficiencia;
  eficienciaMediaDiaria: number | null;
  diasNaMeta: number;
  diasComEficiencia: number;
  percDiasNaMeta: number | null;
  diasNoPeriodo: number;
  diasUteisNoPeriodo: number;
  diasComRegistro: number;
  diasUteisSemRegistro: number;
  blocosRegistrados: number;
  metaHoraria: { media: number | null; minima: number | null; maxima: number | null };
  melhorDia: DiaDestaque | null;
  piorDia: DiaDestaque | null;
  melhorHorario: HorarioDestaque | null;
  piorHorario: HorarioDestaque | null;
  consistencia: ResumoConsistencia;
}

export interface DiaCritico {
  data: string;
  diaSemana: number;
  meta: number;
  realizado: number;
  deficit: number;
  eficiencia: number;
  desvio: number;
}

export interface HorarioCritico {
  bloco: string;
  diasComRegistro: number;
  diasAbaixoDaMeta: number;
  meta: number;
  realizado: number;
  deficit: number;
  eficiencia: number;
  desvio: number;
}

export interface OcorrenciaCritica {
  data: string;
  diaSemana: number;
  bloco: string;
  meta: number;
  realizado: number;
  deficit: number;
  eficiencia: number;
  desvio: number;
}

export interface Criticos {
  limite: number;
  dias: DiaCritico[];
  totalDias: number;
  horarios: HorarioCritico[];
  ocorrencias: OcorrenciaCritica[];
  totalOcorrencias: number;
}

export interface PontoSemanal {
  inicio: string;
  fim: string;
  diasComRegistro: number;
  meta: number;
  realizado: number;
  eficiencia: number | null;
}

export interface PontoDiaSemana {
  diaSemana: number;
  diasComRegistro: number;
  meta: number;
  realizado: number;
  eficiencia: number | null;
}

export interface Tendencia {
  mediaMovel: (number | null)[];
  linha: (number | null)[];
  direcao: DirecaoTendencia;
  inclinacaoPorDia: number | null;
  variacaoNoPeriodo: number | null;
  r2: number | null;
  semanal: PontoSemanal[];
  porDiaDaSemana: PontoDiaSemana[];
}

export interface AnaliseDesempenho {
  filtro: FiltroResolvido;
  geral: ResumoGeral;
  dias: DiaAnalise[];
  horarios: HorarioAnalise[];
  criticos: Criticos;
  tendencia: Tendencia;
}

export function statusDaEficiencia(eficiencia: number | null): StatusEficiencia {
  if (eficiencia === null) return 'sem-dados';
  if (eficiencia >= LIMITE_META) return 'meta';
  if (eficiencia >= LIMITE_CRITICO) return 'proximo';
  return 'critico';
}

export function validarPeriodo(inicio: unknown, fim: unknown): string | null {
  if (!dataIsoValida(inicio) || !dataIsoValida(fim)) return 'Informe a data inicial e a data final.';
  if (inicio > fim) return 'A data inicial não pode ser depois da data final.';

  const dias = diasEntre(inicio, fim) + 1;
  if (dias < PERIODO_MIN_DIAS) {
    return `O período deve ter pelo menos ${PERIODO_MIN_DIAS} dias (1 semana). Selecionado: ${dias} ${dias === 1 ? 'dia' : 'dias'}.`;
  }
  if (dias > PERIODO_MAX_DIAS) {
    return `O período pode ter no máximo ${PERIODO_MAX_DIAS} dias. Selecionado: ${dias} dias.`;
  }
  return null;
}
