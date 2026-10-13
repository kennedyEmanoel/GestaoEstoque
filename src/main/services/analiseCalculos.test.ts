import { describe, expect, it } from 'vitest';
import type { RegistroDeAnalise } from '../../shared/analise';
import { calcularAnalise } from './analiseCalculos';

const SEMANA = ['2026-10-05', '2026-10-11'] as const;

const r = (data: string, horarioBloco: string, meta: number, realizado: number): RegistroDeAnalise => ({
  data, horarioBloco, meta, realizado,
});

const B1 = '07:12 - 08:00';
const B2 = '08:00 - 09:00';

const registrosBase = [
  r('2026-10-05', B1, 40, 38),
  r('2026-10-05', B2, 40, 42),
  r('2026-10-06', B1, 40, 20),
  r('2026-10-06', B2, 40, 0),
  r('2026-10-08', B1, 40, 40),
];

describe('calcularAnalise: visão geral', () => {
  const analise = calcularAnalise(registrosBase, ...SEMANA);

  it('soma produzido e meta só dos registros existentes e calcula a eficiência global', () => {
    expect(analise.geral.totalMeta).toBe(200);
    expect(analise.geral.totalRealizado).toBe(140);
    expect(analise.geral.saldo).toBe(-60);
    expect(analise.geral.eficienciaGlobal).toBeCloseTo(70);
    expect(analise.geral.status).toBe('critico');
  });

  it('separa a eficiência global (ponderada) da média simples dos dias', () => {
    expect(analise.geral.eficienciaMediaDiaria).toBeCloseTo(75);
    expect(analise.geral.diasComEficiencia).toBe(3);
    expect(analise.geral.diasNaMeta).toBe(2);
    expect(analise.geral.percDiasNaMeta).toBeCloseTo(66.67, 1);
  });

  it('informa a cobertura: dias úteis do período, com e sem registro', () => {
    expect(analise.geral.diasNoPeriodo).toBe(7);
    expect(analise.geral.diasUteisNoPeriodo).toBe(5);
    expect(analise.geral.diasComRegistro).toBe(3);
    expect(analise.geral.diasUteisSemRegistro).toBe(2);
    expect(analise.geral.blocosRegistrados).toBe(5);
  });

  it('resume a meta horária praticada', () => {
    expect(analise.geral.metaHoraria).toEqual({ media: 40, minima: 40, maxima: 40 });
  });

  it('mostra a variação da meta quando ela muda', () => {
    const a = calcularAnalise([r('2026-10-05', B1, 40, 40), r('2026-10-05', B2, 60, 60)], ...SEMANA);
    expect(a.geral.metaHoraria).toEqual({ media: 50, minima: 40, maxima: 60 });
  });

  it('destaca o pior dia e os melhores/piores horários', () => {
    expect(analise.geral.piorDia).toEqual({ data: '2026-10-06', eficiencia: 25 });
    expect(analise.geral.melhorDia?.eficiencia).toBe(100);
    expect(analise.geral.piorHorario?.bloco).toBe(B2);
    expect(analise.geral.melhorHorario?.bloco).toBe(B1);
  });
});

describe('calcularAnalise: dados ausentes', () => {
  const analise = calcularAnalise(registrosBase, ...SEMANA);

  it('lista os dias úteis do período, inclusive os sem registro, e deixa o fim de semana de fora', () => {
    expect(analise.dias.map((d) => d.data)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
    ]);
  });

  it('dia sem registro não vira zero: fica sem eficiência e sem dados', () => {
    const quarta = analise.dias[2];
    expect(quarta.registrado).toBe(false);
    expect(quarta.eficiencia).toBeNull();
    expect(quarta.status).toBe('sem-dados');
    expect(quarta.meta).toBe(0);
    expect(quarta.horas.every((h) => !h.registrado && h.realizado === null)).toBe(true);
  });

  it('hora sem registro é diferente de hora registrada com zero produzido', () => {
    const terca = analise.dias[1];
    const zerada = terca.horas.find((h) => h.bloco === B2)!;
    const ausente = terca.horas.find((h) => h.bloco === '09:15 - 10:00')!;
    expect(zerada).toMatchObject({ registrado: true, realizado: 0, meta: 40, eficiencia: 0 });
    expect(ausente).toMatchObject({ registrado: false, realizado: null, meta: null, eficiencia: null });
  });

  it('o total de um dia considera só as horas registradas', () => {
    expect(analise.dias[3]).toMatchObject({ meta: 40, realizado: 40, eficiencia: 100, status: 'meta' });
  });

  it('inclui o fim de semana quando houve produção', () => {
    const a = calcularAnalise([...registrosBase, r('2026-10-10', B1, 40, 30)], ...SEMANA);
    expect(a.dias.map((d) => d.data)).toContain('2026-10-10');
    expect(a.tendencia.porDiaDaSemana.map((p) => p.diaSemana)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('sem nenhum registro, tudo fica vazio e não quebra', () => {
    const vazio = calcularAnalise([], ...SEMANA);
    expect(vazio.geral).toMatchObject({
      totalMeta: 0, totalRealizado: 0, eficienciaGlobal: null, status: 'sem-dados',
      eficienciaMediaDiaria: null, percDiasNaMeta: null, diasComRegistro: 0, blocosRegistrados: 0,
      melhorDia: null, piorDia: null, melhorHorario: null, piorHorario: null,
    });
    expect(vazio.geral.metaHoraria).toEqual({ media: null, minima: null, maxima: null });
    expect(vazio.geral.consistencia.nivel).toBe('insuficiente');
    expect(vazio.dias).toHaveLength(5);
    expect(vazio.horarios.every((h) => h.status === 'sem-dados' && h.eficiencia === null)).toBe(true);
    expect(vazio.criticos).toMatchObject({ totalDias: 0, dias: [], horarios: [], ocorrencias: [], totalOcorrencias: 0 });
    expect(vazio.tendencia.direcao).toBe('insuficiente');
    expect(vazio.tendencia.linha.every((v) => v === null)).toBe(true);
    expect(vazio.tendencia.semanal).toHaveLength(1);
  });

  it('meta zero em legado não gera eficiência nem divisão por zero', () => {
    const a = calcularAnalise([r('2026-10-05', B1, 0, 5)], ...SEMANA);
    expect(a.dias[0]).toMatchObject({ registrado: true, realizado: 5, meta: 0, eficiencia: null, status: 'sem-dados' });
    expect(a.geral.eficienciaGlobal).toBeNull();
  });

  it('registros fora do período são ignorados', () => {
    const a = calcularAnalise([r('2026-10-04', B1, 40, 40), r('2026-10-12', B1, 40, 40)], ...SEMANA);
    expect(a.geral.blocosRegistrados).toBe(0);
  });
});

describe('calcularAnalise: faixas de horário', () => {
  const analise = calcularAnalise(registrosBase, ...SEMANA);

  it('sempre traz todas as faixas padrão, na ordem do dia', () => {
    expect(analise.horarios).toHaveLength(9);
    expect(analise.horarios[0].bloco).toBe(B1);
    expect(analise.horarios[8].bloco).toBe('16:00 - 17:12');
  });

  it('agrega meta e realizado por faixa e conta dias abaixo da meta e zerados', () => {
    const primeira = analise.horarios[0];
    expect(primeira).toMatchObject({ diasComRegistro: 3, meta: 120, realizado: 98, diasAbaixoDaMeta: 2, diasZerados: 0 });
    expect(primeira.eficiencia).toBeCloseTo(81.67, 1);
    expect(primeira.metaMedia).toBe(40);
    expect(primeira.realizadoMedio).toBeCloseTo(32.67, 1);
    expect(primeira.status).toBe('proximo');

    const segunda = analise.horarios[1];
    expect(segunda).toMatchObject({ diasComRegistro: 2, meta: 80, realizado: 42, diasAbaixoDaMeta: 1, diasZerados: 1, status: 'critico' });
  });

  it('faixa que nunca foi registrada fica sem dados', () => {
    expect(analise.horarios[2]).toMatchObject({
      bloco: '09:15 - 10:00', diasComRegistro: 0, eficiencia: null, metaMedia: null, realizadoMedio: null, status: 'sem-dados',
    });
  });

  it('inclui uma faixa fora do padrão na posição certa, ausente nos outros dias', () => {
    const a = calcularAnalise([r('2026-10-05', '12:00 - 13:00', 40, 40), r('2026-10-06', B1, 40, 40)], ...SEMANA);
    const blocos = a.horarios.map((h) => h.bloco);
    expect(blocos.indexOf('12:00 - 13:00')).toBe(blocos.indexOf('11:00 - 12:00') + 1);
    const terca = a.dias[1].horas.find((h) => h.bloco === '12:00 - 13:00')!;
    expect(terca.registrado).toBe(false);
  });

  it('soma registros da mesma faixa no mesmo dia (duas fichas)', () => {
    const a = calcularAnalise([r('2026-10-05', B1, 40, 10), r('2026-10-05', B1, 40, 20)], ...SEMANA);
    expect(a.dias[0].horas[0]).toMatchObject({ meta: 80, realizado: 30 });
    expect(a.horarios[0].diasComRegistro).toBe(1);
  });
});

describe('calcularAnalise: consistência', () => {
  const diaria = (valores: number[]) =>
    calcularAnalise(valores.map((v, i) => r(`2026-10-0${5 + i}`, B1, 100, v)), ...SEMANA).geral.consistencia;

  it('desempenho estável é "alta" (CV até 10%)', () => {
    const c = diaria([100, 102, 98]);
    expect(c.nivel).toBe('alta');
    expect(c.desvioPadrao).toBeCloseTo(2);
    expect(c.coeficienteVariacao).toBeCloseTo(2);
  });

  it('oscilação média é "moderada" (até 20%)', () => {
    const c = diaria([100, 85, 115]);
    expect(c.nivel).toBe('moderada');
    expect(c.coeficienteVariacao).toBeCloseTo(15);
  });

  it('oscilação grande é "baixa" consistência', () => {
    const c = diaria([100, 60, 140]);
    expect(c.nivel).toBe('baixa');
    expect(c.coeficienteVariacao).toBeCloseTo(40);
  });

  it('com menos de 3 dias não conclui nada', () => {
    expect(diaria([100, 50])).toMatchObject({ nivel: 'insuficiente', coeficienteVariacao: null, diasConsiderados: 2 });
  });
});

describe('calcularAnalise: dias e horários críticos', () => {
  const analise = calcularAnalise(registrosBase, ...SEMANA);

  it('dia abaixo de 80% é crítico, com déficit e desvio', () => {
    expect(analise.criticos.limite).toBe(80);
    expect(analise.criticos.totalDias).toBe(1);
    expect(analise.criticos.dias[0]).toEqual({
      data: '2026-10-06', diaSemana: 2, meta: 80, realizado: 20, deficit: 60, eficiencia: 25, desvio: -75,
    });
  });

  it('faixa abaixo de 80% no período é horário crítico (81,7% não é)', () => {
    expect(analise.criticos.horarios.map((h) => h.bloco)).toEqual([B2]);
    expect(analise.criticos.horarios[0]).toMatchObject({ diasAbaixoDaMeta: 1, diasComRegistro: 2, deficit: 38 });
  });

  it('lista as piores ocorrências (dia × faixa) pelo maior déficit', () => {
    expect(analise.criticos.totalOcorrencias).toBe(2);
    expect(analise.criticos.ocorrencias.map((o) => [o.data, o.bloco, o.deficit, o.eficiencia])).toEqual([
      ['2026-10-06', B2, 40, 0],
      ['2026-10-06', B1, 20, 50],
    ]);
  });

  it('limita a lista a 10 itens mas informa o total', () => {
    const registros = Array.from({ length: 12 }, (_, i) => {
      const dia = i < 5 ? `2026-10-0${5 + i}` : i < 10 ? `2026-10-${12 + (i - 5)}` : `2026-10-${19 + (i - 10)}`;
      return r(dia, B1, 100 + i, 50);
    });
    const a = calcularAnalise(registros, '2026-10-05', '2026-10-25');
    expect(a.criticos.totalDias).toBe(12);
    expect(a.criticos.dias).toHaveLength(10);
    expect(a.criticos.dias[0].deficit).toBe(111 - 50 + 0);
    expect(a.criticos.dias.map((d) => d.deficit)).toEqual([...a.criticos.dias.map((d) => d.deficit)].sort((x, y) => y - x));
  });
});

describe('calcularAnalise: tendência', () => {
  const serie = (valores: number[]) => {
    const dias = ['05', '06', '07', '08', '09', '12', '13', '14', '15', '16'];
    return calcularAnalise(
      valores.map((v, i) => r(`2026-10-${dias[i]}`, B1, 100, v)),
      '2026-10-05',
      '2026-10-18',
    ).tendencia;
  };

  it('detecta produtividade subindo', () => {
    const t = serie([70, 73, 76, 79, 82, 85, 88, 91, 94, 97]);
    expect(t.direcao).toBe('subindo');
    expect(t.variacaoNoPeriodo).toBeGreaterThan(20);
    expect(t.r2).toBeGreaterThan(0.95);
    expect(t.linha).toHaveLength(10);
    expect(t.linha.every((v) => typeof v === 'number')).toBe(true);
  });

  it('detecta produtividade caindo', () => {
    expect(serie([97, 94, 91, 88, 85, 82, 79, 76, 73, 70]).direcao).toBe('caindo');
  });

  it('oscilação sem rumo é "estável"', () => {
    expect(serie([90, 92, 90, 92, 90, 92, 90, 92, 90, 92]).direcao).toBe('estavel');
  });

  it('com menos de 5 dias não afirma tendência nem desenha a linha', () => {
    const t = calcularAnalise(
      [r('2026-10-05', B1, 100, 60), r('2026-10-06', B1, 100, 70), r('2026-10-07', B1, 100, 80), r('2026-10-08', B1, 100, 90)],
      ...SEMANA,
    ).tendencia;
    expect(t.direcao).toBe('insuficiente');
    expect(t.inclinacaoPorDia).toBeNull();
    expect(t.linha.every((v) => v === null)).toBe(true);
  });

  it('média móvel de 3 dias com registro, pulando os dias sem registro', () => {
    const t = calcularAnalise(registrosBase, ...SEMANA).tendencia;
    expect(t.mediaMovel).toEqual([100, 62.5, null, 75, null]);
  });

  it('agrupa por semana (segunda a domingo), cortando nas pontas do período', () => {
    const t = calcularAnalise(
      [r('2026-10-01', B1, 100, 90), r('2026-10-13', B1, 100, 110)],
      '2026-10-01',
      '2026-10-14',
    ).tendencia;
    const arredondar = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
    expect(t.semanal.map((s) => [s.inicio, s.fim, s.diasComRegistro, arredondar(s.eficiencia)])).toEqual([
      ['2026-10-01', '2026-10-04', 1, 90],
      ['2026-10-05', '2026-10-11', 0, null],
      ['2026-10-12', '2026-10-14', 1, 110],
    ]);
  });

  it('resume por dia da semana, de segunda a sexta, mesmo sem registro', () => {
    const p = calcularAnalise(registrosBase, ...SEMANA).tendencia.porDiaDaSemana;
    expect(p.map((x) => x.diaSemana)).toEqual([1, 2, 3, 4, 5]);
    expect(p.map((x) => x.eficiencia)).toEqual([100, 25, null, 100, null]);
    expect(p[2].diasComRegistro).toBe(0);
  });
});
