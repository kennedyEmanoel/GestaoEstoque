import { describe, expect, it } from 'vitest';
import {
  adicionarDias,
  dataIsoValida,
  diaDaSemana,
  diasEntre,
  hojeLocal,
  inicioDaSemana,
  intervaloDeDias,
} from './datas';
import { statusDaEficiencia, validarPeriodo } from './analise';

describe('datas', () => {
  it('só aceita datas reais do calendário', () => {
    expect(dataIsoValida('2026-10-05')).toBe(true);
    expect(dataIsoValida('2024-02-29')).toBe(true);
    expect(dataIsoValida('2026-02-29')).toBe(false);
    expect(dataIsoValida('2026-02-30')).toBe(false);
    expect(dataIsoValida('2026-13-01')).toBe(false);
    expect(dataIsoValida('05/10/2026')).toBe(false);
    expect(dataIsoValida('')).toBe(false);
    expect(dataIsoValida(null)).toBe(false);
    expect(dataIsoValida(20261005)).toBe(false);
  });

  it('soma dias atravessando mês, ano e fevereiro bissexto', () => {
    expect(adicionarDias('2026-10-30', 3)).toBe('2026-11-02');
    expect(adicionarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(adicionarDias('2024-02-28', 1)).toBe('2024-02-29');
    expect(adicionarDias('2026-02-28', 1)).toBe('2026-03-01');
    expect(adicionarDias('2026-10-05', -5)).toBe('2026-09-30');
  });

  it('conta dias entre datas (pode ser negativo)', () => {
    expect(diasEntre('2026-10-05', '2026-10-05')).toBe(0);
    expect(diasEntre('2026-10-05', '2026-10-11')).toBe(6);
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
    expect(diasEntre('2026-10-11', '2026-10-05')).toBe(-6);
  });

  it('acha o dia da semana e a segunda-feira da semana', () => {
    expect(diaDaSemana('2026-10-05')).toBe(1);
    expect(diaDaSemana('2026-10-10')).toBe(6);
    expect(diaDaSemana('2026-10-11')).toBe(0);
    expect(inicioDaSemana('2026-10-05')).toBe('2026-10-05');
    expect(inicioDaSemana('2026-10-11')).toBe('2026-10-05');
    expect(inicioDaSemana('2026-10-12')).toBe('2026-10-12');
    expect(inicioDaSemana('2026-10-01')).toBe('2026-09-28');
  });

  it('lista o intervalo inclusive nas duas pontas', () => {
    expect(intervaloDeDias('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(intervaloDeDias('2026-10-05', '2026-10-05')).toEqual(['2026-10-05']);
  });

  it('usa o calendário local para "hoje", mesmo à noite', () => {
    expect(hojeLocal(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12');
    expect(hojeLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('validarPeriodo', () => {
  it('aceita exatamente 7 dias (1 semana, contando as duas pontas)', () => {
    expect(validarPeriodo('2026-10-05', '2026-10-11')).toBeNull();
  });

  it('recusa 6 dias ou menos, informando quantos foram escolhidos', () => {
    expect(validarPeriodo('2026-10-05', '2026-10-10')).toMatch(/pelo menos 7 dias.*6 dias/);
    expect(validarPeriodo('2026-10-05', '2026-10-05')).toMatch(/1 dia\./);
  });

  it('recusa data inicial depois da final', () => {
    expect(validarPeriodo('2026-10-11', '2026-10-05')).toMatch(/não pode ser depois/);
  });

  it('recusa datas ausentes, inválidas ou de outro tipo', () => {
    expect(validarPeriodo('', '2026-10-11')).toMatch(/Informe/);
    expect(validarPeriodo('2026-02-30', '2026-10-11')).toMatch(/Informe/);
    expect(validarPeriodo(undefined, undefined)).toMatch(/Informe/);
    expect(validarPeriodo(20261005, '2026-10-11')).toMatch(/Informe/);
  });

  it('limita o período a 366 dias', () => {
    expect(validarPeriodo('2026-01-01', '2026-12-31')).toBeNull();
    expect(validarPeriodo('2026-01-01', '2027-01-01')).toBeNull();
    expect(validarPeriodo('2026-01-01', '2027-01-02')).toMatch(/no máximo 366 dias.*367/);
  });
});

describe('statusDaEficiencia', () => {
  it('classifica pelos mesmos cortes das telas de produção', () => {
    expect(statusDaEficiencia(150)).toBe('meta');
    expect(statusDaEficiencia(100)).toBe('meta');
    expect(statusDaEficiencia(99.99)).toBe('proximo');
    expect(statusDaEficiencia(80)).toBe('proximo');
    expect(statusDaEficiencia(79.99)).toBe('critico');
    expect(statusDaEficiencia(0)).toBe('critico');
    expect(statusDaEficiencia(null)).toBe('sem-dados');
  });
});
