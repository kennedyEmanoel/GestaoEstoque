const MS_DIA = 86_400_000;
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

function paraUtc(iso: string): number | null {
  const m = FORMATO.exec(iso);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const ms = Date.UTC(ano, mes - 1, dia);
  const d = new Date(ms);
  const existe = d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
  return existe ? ms : null;
}

function utcOuErro(iso: string): number {
  const ms = paraUtc(iso);
  if (ms === null) throw new Error(`Data inválida: ${iso}`);
  return ms;
}

function paraIso(ms: number): string {
  const d = new Date(ms);
  const ano = String(d.getUTCFullYear()).padStart(4, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function dataIsoValida(valor: unknown): valor is string {
  return typeof valor === 'string' && paraUtc(valor) !== null;
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((utcOuErro(fim) - utcOuErro(inicio)) / MS_DIA);
}

export function adicionarDias(iso: string, dias: number): string {
  return paraIso(utcOuErro(iso) + dias * MS_DIA);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(iso: string): number {
  return new Date(utcOuErro(iso)).getUTCDay();
}

export function inicioDaSemana(iso: string): string {
  return adicionarDias(iso, -((diaDaSemana(iso) + 6) % 7));
}

export function intervaloDeDias(inicio: string, fim: string): string[] {
  const total = diasEntre(inicio, fim);
  return Array.from({ length: total + 1 }, (_, i) => adicionarDias(inicio, i));
}

export function hojeLocal(agora: Date = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}
