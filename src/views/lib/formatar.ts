import { diaDaSemana } from '../../shared/datas';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function formatarNumero(valor: number | null, casas = 0): string {
  if (valor === null || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarPct(valor: number | null, casas = 1): string {
  return valor === null || !Number.isFinite(valor) ? '—' : `${formatarNumero(valor, casas)}%`;
}

export function formatarSaldo(valor: number | null, casas = 0): string {
  if (valor === null || !Number.isFinite(valor)) return '—';
  const texto = formatarNumero(valor, casas);
  return valor > 0 ? `+${texto}` : texto;
}

export function formatarPontos(valor: number | null, casas = 1): string {
  if (valor === null || !Number.isFinite(valor)) return '—';
  return `${formatarSaldo(valor, casas)} p.p.`;
}

export function formatarData(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function formatarDataCompleta(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(inicio: string, fim: string): string {
  return `${formatarDataCompleta(inicio)} a ${formatarDataCompleta(fim)}`;
}

export function nomeDiaSemana(dia: number, formato: 'curto' | 'longo' = 'curto'): string {
  return (formato === 'curto' ? DIAS_CURTOS : DIAS_LONGOS)[dia];
}

export function rotuloDia(iso: string): string {
  return `${nomeDiaSemana(diaDaSemana(iso))} ${formatarData(iso)}`;
}

export function formatarFaixa(bloco: string): string {
  return bloco.replace(' - ', ' – ');
}

export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : pluralTexto}`;
}
