import { describe, expect, it } from 'vitest';
import {
  formatarData,
  formatarDataCompleta,
  formatarFaixa,
  formatarNumero,
  formatarPct,
  formatarPeriodo,
  formatarPontos,
  formatarSaldo,
  nomeDiaSemana,
  plural,
  rotuloDia,
} from './formatar';

describe('formatação pt-BR', () => {
  it('formata números e percentuais, com traço para ausentes', () => {
    expect(formatarNumero(1234)).toBe('1.234');
    expect(formatarNumero(96.43, 1)).toBe('96,4');
    expect(formatarNumero(null)).toBe('—');
    expect(formatarNumero(Number.NaN)).toBe('—');
    expect(formatarPct(96.43)).toBe('96,4%');
    expect(formatarPct(100, 0)).toBe('100%');
    expect(formatarPct(null)).toBe('—');
  });

  it('mostra sinal explícito nos saldos', () => {
    expect(formatarSaldo(12)).toBe('+12');
    expect(formatarSaldo(-4)).toBe('-4');
    expect(formatarSaldo(0)).toBe('0');
    expect(formatarSaldo(null)).toBe('—');
    expect(formatarPontos(-13.94)).toBe('-13,9 p.p.');
    expect(formatarPontos(2)).toBe('+2,0 p.p.');
  });

  it('formata datas e rótulos de dia', () => {
    expect(formatarData('2026-07-09')).toBe('09/07');
    expect(formatarDataCompleta('2026-07-09')).toBe('09/07/2026');
    expect(formatarPeriodo('2026-06-01', '2026-10-11')).toBe('01/06/2026 a 11/10/2026');
    expect(rotuloDia('2026-10-05')).toBe('seg 05/10');
    expect(nomeDiaSemana(0)).toBe('dom');
    expect(nomeDiaSemana(2, 'longo')).toBe('terça-feira');
  });

  it('formata faixas de horário e plurais', () => {
    expect(formatarFaixa('07:12 - 08:00')).toBe('07:12 – 08:00');
    expect(plural(1, 'dia', 'dias')).toBe('1 dia');
    expect(plural(1500, 'peça', 'peças')).toBe('1.500 peças');
  });
});
