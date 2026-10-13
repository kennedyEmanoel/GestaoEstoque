import { BLOCOS_HORARIOS } from '../../shared/horarios';
import { adicionarDias, diaDaSemana, diasEntre, inicioDaSemana, intervaloDeDias } from '../../shared/datas';
import {
  JANELA_MEDIA_MOVEL,
  LIMITE_CONSISTENCIA_ALTA,
  LIMITE_CONSISTENCIA_MODERADA,
  LIMITE_CRITICO,
  LIMITE_META,
  MAX_ITENS_CRITICOS,
  MIN_DIAS_CONSISTENCIA,
  MIN_DIAS_TENDENCIA,
  R2_MIN_TENDENCIA,
  VARIACAO_MIN_TENDENCIA,
  statusDaEficiencia,
  type AnaliseDesempenho,
  type CelulaHoraria,
  type Criticos,
  type DiaAnalise,
  type DirecaoTendencia,
  type HorarioAnalise,
  type PontoDiaSemana,
  type PontoSemanal,
  type RegistroDeAnalise,
  type ResumoConsistencia,
  type ResumoGeral,
  type Tendencia,
} from '../../shared/analise';

type CelulasDoDia = Map<string, { meta: number; realizado: number }>;
type ResultadoCalculo = Omit<AnaliseDesempenho, 'filtro'>;

const eficiencia = (realizado: number, meta: number): number | null =>
  meta > 0 ? (realizado / meta) * 100 : null;

const soma = (valores: readonly number[]): number => valores.reduce((total, v) => total + v, 0);

const media = (valores: readonly number[]): number | null =>
  valores.length > 0 ? soma(valores) / valores.length : null;

function desvioPadraoAmostral(valores: readonly number[]): number | null {
  if (valores.length < 2) return null;
  const m = soma(valores) / valores.length;
  return Math.sqrt(soma(valores.map((v) => (v - m) ** 2)) / (valores.length - 1));
}

function regressaoLinear(pontos: readonly { x: number; y: number }[]) {
  if (pontos.length < 2) return null;
  const mx = soma(pontos.map((p) => p.x)) / pontos.length;
  const my = soma(pontos.map((p) => p.y)) / pontos.length;
  const sxx = soma(pontos.map((p) => (p.x - mx) ** 2));
  const syy = soma(pontos.map((p) => (p.y - my) ** 2));
  const sxy = soma(pontos.map((p) => (p.x - mx) * (p.y - my)));
  if (sxx === 0) return null;
  const inclinacao = sxy / sxx;
  return {
    inclinacao,
    intercepto: my - inclinacao * mx,
    r2: syy === 0 ? 0 : (sxy * sxy) / (sxx * syy),
  };
}

function agruparPorDia(registros: readonly RegistroDeAnalise[]): Map<string, CelulasDoDia> {
  const porDia = new Map<string, CelulasDoDia>();
  for (const r of registros) {
    let celulas = porDia.get(r.data);
    if (!celulas) {
      celulas = new Map();
      porDia.set(r.data, celulas);
    }
    const atual = celulas.get(r.horarioBloco);
    if (atual) {
      atual.meta += r.meta;
      atual.realizado += r.realizado;
    } else {
      celulas.set(r.horarioBloco, { meta: r.meta, realizado: r.realizado });
    }
  }
  return porDia;
}

function listarBlocos(registros: readonly RegistroDeAnalise[]): string[] {
  const padrao: string[] = [...BLOCOS_HORARIOS];
  const extras = new Set(registros.map((r) => r.horarioBloco).filter((b) => !padrao.includes(b)));
  return [...padrao, ...extras].sort();
}

const celulaAusente = (bloco: string): CelulaHoraria => ({
  bloco, registrado: false, meta: null, realizado: null, saldo: null, eficiencia: null,
});

function montarDias(
  porDia: Map<string, CelulasDoDia>,
  blocos: readonly string[],
  inicio: string,
  fim: string,
): DiaAnalise[] {
  const dias: DiaAnalise[] = [];

  for (const data of intervaloDeDias(inicio, fim)) {
    const celulas = porDia.get(data);
    const diaSemana = diaDaSemana(data);
    const diaUtil = diaSemana >= 1 && diaSemana <= 5;
    if (!celulas && !diaUtil) continue;

    const horas = blocos.map((bloco): CelulaHoraria => {
      const c = celulas?.get(bloco);
      if (!c) return celulaAusente(bloco);
      return {
        bloco,
        registrado: true,
        meta: c.meta,
        realizado: c.realizado,
        saldo: c.realizado - c.meta,
        eficiencia: eficiencia(c.realizado, c.meta),
      };
    });

    const registradas = horas.filter((h) => h.registrado);
    const meta = soma(registradas.map((h) => h.meta ?? 0));
    const realizado = soma(registradas.map((h) => h.realizado ?? 0));
    const registrado = registradas.length > 0;
    const efic = registrado ? eficiencia(realizado, meta) : null;

    dias.push({
      data, diaSemana, registrado, meta, realizado,
      saldo: realizado - meta,
      eficiencia: efic,
      status: statusDaEficiencia(efic),
      horas,
    });
  }

  return dias;
}

function montarHorarios(dias: readonly DiaAnalise[], blocos: readonly string[]): HorarioAnalise[] {
  return blocos.map((bloco, i) => {
    const celulas = dias.map((d) => d.horas[i]).filter((h) => h.registrado);
    const meta = soma(celulas.map((h) => h.meta ?? 0));
    const realizado = soma(celulas.map((h) => h.realizado ?? 0));
    const efic = eficiencia(realizado, meta);
    return {
      bloco,
      diasComRegistro: celulas.length,
      meta,
      realizado,
      saldo: realizado - meta,
      eficiencia: efic,
      metaMedia: celulas.length > 0 ? meta / celulas.length : null,
      realizadoMedio: celulas.length > 0 ? realizado / celulas.length : null,
      diasAbaixoDaMeta: celulas.filter((h) => (h.realizado ?? 0) < (h.meta ?? 0)).length,
      diasZerados: celulas.filter((h) => h.realizado === 0 && (h.meta ?? 0) > 0).length,
      status: statusDaEficiencia(efic),
    };
  });
}

function montarConsistencia(eficienciasDiarias: readonly number[]): ResumoConsistencia {
  const diasConsiderados = eficienciasDiarias.length;
  const insuficiente: ResumoConsistencia = {
    nivel: 'insuficiente', desvioPadrao: null, coeficienteVariacao: null, diasConsiderados,
  };
  if (diasConsiderados < MIN_DIAS_CONSISTENCIA) return insuficiente;

  const m = media(eficienciasDiarias);
  const desvioPadrao = desvioPadraoAmostral(eficienciasDiarias);
  if (m === null || m <= 0 || desvioPadrao === null) return insuficiente;

  const coeficienteVariacao = (desvioPadrao / m) * 100;
  const nivel =
    coeficienteVariacao <= LIMITE_CONSISTENCIA_ALTA ? 'alta'
    : coeficienteVariacao <= LIMITE_CONSISTENCIA_MODERADA ? 'moderada'
    : 'baixa';
  return { nivel, desvioPadrao, coeficienteVariacao, diasConsiderados };
}

function montarResumo(
  dias: readonly DiaAnalise[],
  horarios: readonly HorarioAnalise[],
  inicio: string,
  fim: string,
): ResumoGeral {
  const totalMeta = soma(dias.map((d) => d.meta));
  const totalRealizado = soma(dias.map((d) => d.realizado));
  const eficienciaGlobal = eficiencia(totalRealizado, totalMeta);

  const comEficiencia = dias.filter((d) => d.eficiencia !== null);
  const eficienciasDiarias = comEficiencia.map((d) => d.eficiencia as number);
  const diasNaMeta = eficienciasDiarias.filter((e) => e >= LIMITE_META).length;

  const calendario = intervaloDeDias(inicio, fim);
  const diasUteisNoPeriodo = calendario.filter((d) => {
    const s = diaDaSemana(d);
    return s >= 1 && s <= 5;
  }).length;
  const diasComRegistro = dias.filter((d) => d.registrado).length;

  const metas = dias.flatMap((d) => d.horas).filter((h) => h.registrado).map((h) => h.meta ?? 0);

  const ordenadosPorDia = [...comEficiencia].sort((a, b) => (a.eficiencia as number) - (b.eficiencia as number));
  const piorDia = ordenadosPorDia[0];
  const melhorDia = ordenadosPorDia[ordenadosPorDia.length - 1];

  const horariosComDados = horarios.filter((h) => h.eficiencia !== null);
  const ordenadosPorHorario = [...horariosComDados].sort((a, b) => (a.eficiencia as number) - (b.eficiencia as number));
  const piorHorario = ordenadosPorHorario[0];
  const melhorHorario = ordenadosPorHorario[ordenadosPorHorario.length - 1];

  return {
    totalRealizado,
    totalMeta,
    saldo: totalRealizado - totalMeta,
    eficienciaGlobal,
    status: statusDaEficiencia(eficienciaGlobal),
    eficienciaMediaDiaria: media(eficienciasDiarias),
    diasNaMeta,
    diasComEficiencia: eficienciasDiarias.length,
    percDiasNaMeta: eficienciasDiarias.length > 0 ? (diasNaMeta / eficienciasDiarias.length) * 100 : null,
    diasNoPeriodo: calendario.length,
    diasUteisNoPeriodo,
    diasComRegistro,
    diasUteisSemRegistro: dias.filter((d) => !d.registrado).length,
    blocosRegistrados: metas.length,
    metaHoraria: {
      media: media(metas),
      minima: metas.length > 0 ? Math.min(...metas) : null,
      maxima: metas.length > 0 ? Math.max(...metas) : null,
    },
    melhorDia: melhorDia ? { data: melhorDia.data, eficiencia: melhorDia.eficiencia as number } : null,
    piorDia: piorDia ? { data: piorDia.data, eficiencia: piorDia.eficiencia as number } : null,
    melhorHorario: melhorHorario ? { bloco: melhorHorario.bloco, eficiencia: melhorHorario.eficiencia as number } : null,
    piorHorario: piorHorario ? { bloco: piorHorario.bloco, eficiencia: piorHorario.eficiencia as number } : null,
    consistencia: montarConsistencia(eficienciasDiarias),
  };
}

function montarCriticos(dias: readonly DiaAnalise[], horarios: readonly HorarioAnalise[]): Criticos {
  const piorPrimeiro = (a: { deficit: number; eficiencia: number }, b: { deficit: number; eficiencia: number }) =>
    b.deficit - a.deficit || a.eficiencia - b.eficiencia;

  const diasCriticos = dias
    .filter((d) => d.eficiencia !== null && d.eficiencia < LIMITE_CRITICO)
    .map((d) => ({
      data: d.data,
      diaSemana: d.diaSemana,
      meta: d.meta,
      realizado: d.realizado,
      deficit: d.meta - d.realizado,
      eficiencia: d.eficiencia as number,
      desvio: (d.eficiencia as number) - LIMITE_META,
    }))
    .sort(piorPrimeiro);

  const horariosCriticos = horarios
    .filter((h) => h.eficiencia !== null && h.eficiencia < LIMITE_CRITICO)
    .map((h) => ({
      bloco: h.bloco,
      diasComRegistro: h.diasComRegistro,
      diasAbaixoDaMeta: h.diasAbaixoDaMeta,
      meta: h.meta,
      realizado: h.realizado,
      deficit: h.meta - h.realizado,
      eficiencia: h.eficiencia as number,
      desvio: (h.eficiencia as number) - LIMITE_META,
    }))
    .sort((a, b) => a.eficiencia - b.eficiencia);

  const ocorrencias = dias
    .flatMap((d) =>
      d.horas
        .filter((h) => h.registrado && h.eficiencia !== null && h.eficiencia < LIMITE_CRITICO)
        .map((h) => ({
          data: d.data,
          diaSemana: d.diaSemana,
          bloco: h.bloco,
          meta: h.meta ?? 0,
          realizado: h.realizado ?? 0,
          deficit: (h.meta ?? 0) - (h.realizado ?? 0),
          eficiencia: h.eficiencia as number,
          desvio: (h.eficiencia as number) - LIMITE_META,
        })),
    )
    .sort(piorPrimeiro);

  return {
    limite: LIMITE_CRITICO,
    dias: diasCriticos.slice(0, MAX_ITENS_CRITICOS),
    totalDias: diasCriticos.length,
    horarios: horariosCriticos,
    ocorrencias: ocorrencias.slice(0, MAX_ITENS_CRITICOS),
    totalOcorrencias: ocorrencias.length,
  };
}

function montarMediaMovel(dias: readonly DiaAnalise[]): (number | null)[] {
  const recentes: number[] = [];
  return dias.map((d) => {
    if (d.eficiencia === null) return null;
    recentes.push(d.eficiencia);
    return media(recentes.slice(-JANELA_MEDIA_MOVEL));
  });
}

function montarSemanas(dias: readonly DiaAnalise[], inicio: string, fim: string): PontoSemanal[] {
  const semanas: PontoSemanal[] = [];
  for (let segunda = inicioDaSemana(inicio); segunda <= fim; segunda = adicionarDias(segunda, 7)) {
    const domingo = adicionarDias(segunda, 6);
    const de = segunda < inicio ? inicio : segunda;
    const ate = domingo > fim ? fim : domingo;
    const registrados = dias.filter((d) => d.registrado && d.data >= de && d.data <= ate);
    const meta = soma(registrados.map((d) => d.meta));
    const realizado = soma(registrados.map((d) => d.realizado));
    semanas.push({
      inicio: de,
      fim: ate,
      diasComRegistro: registrados.length,
      meta,
      realizado,
      eficiencia: eficiencia(realizado, meta),
    });
  }
  return semanas;
}

function montarDiasDaSemana(dias: readonly DiaAnalise[]): PontoDiaSemana[] {
  const porDiaSemana = new Map<number, { dias: number; meta: number; realizado: number }>();
  for (const s of [1, 2, 3, 4, 5]) porDiaSemana.set(s, { dias: 0, meta: 0, realizado: 0 });

  for (const d of dias.filter((x) => x.registrado)) {
    const atual = porDiaSemana.get(d.diaSemana) ?? { dias: 0, meta: 0, realizado: 0 };
    atual.dias += 1;
    atual.meta += d.meta;
    atual.realizado += d.realizado;
    porDiaSemana.set(d.diaSemana, atual);
  }

  return [...porDiaSemana.entries()]
    .sort(([a], [b]) => ((a + 6) % 7) - ((b + 6) % 7))
    .map(([diaSemana, v]) => ({
      diaSemana,
      diasComRegistro: v.dias,
      meta: v.meta,
      realizado: v.realizado,
      eficiencia: eficiencia(v.realizado, v.meta),
    }));
}

function montarTendencia(dias: readonly DiaAnalise[], inicio: string, fim: string): Tendencia {
  const pontos = dias
    .filter((d) => d.eficiencia !== null)
    .map((d) => ({ x: diasEntre(inicio, d.data), y: d.eficiencia as number }));

  const modelo = pontos.length >= MIN_DIAS_TENDENCIA ? regressaoLinear(pontos) : null;

  let direcao: DirecaoTendencia = 'insuficiente';
  let variacaoNoPeriodo: number | null = null;
  if (modelo) {
    variacaoNoPeriodo = modelo.inclinacao * (pontos[pontos.length - 1].x - pontos[0].x);
    if (Math.abs(variacaoNoPeriodo) < VARIACAO_MIN_TENDENCIA || modelo.r2 < R2_MIN_TENDENCIA) direcao = 'estavel';
    else direcao = variacaoNoPeriodo > 0 ? 'subindo' : 'caindo';
  }

  return {
    mediaMovel: montarMediaMovel(dias),
    linha: dias.map((d) => (modelo ? modelo.intercepto + modelo.inclinacao * diasEntre(inicio, d.data) : null)),
    direcao,
    inclinacaoPorDia: modelo ? modelo.inclinacao : null,
    variacaoNoPeriodo,
    r2: modelo ? modelo.r2 : null,
    semanal: montarSemanas(dias, inicio, fim),
    porDiaDaSemana: montarDiasDaSemana(dias),
  };
}

export function calcularAnalise(
  registros: readonly RegistroDeAnalise[],
  inicio: string,
  fim: string,
): ResultadoCalculo {
  const blocos = listarBlocos(registros);
  const dias = montarDias(agruparPorDia(registros), blocos, inicio, fim);
  const horarios = montarHorarios(dias, blocos);

  return {
    geral: montarResumo(dias, horarios, inicio, fim),
    dias,
    horarios,
    criticos: montarCriticos(dias, horarios),
    tendencia: montarTendencia(dias, inicio, fim),
  };
}
