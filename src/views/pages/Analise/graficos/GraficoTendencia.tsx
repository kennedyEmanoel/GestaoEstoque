import { useMemo } from 'react';
import type { DiaAnalise, StatusEficiencia, Tendencia } from '../../../../shared/analise';
import { statusDaEficiencia } from '../../../../shared/analise';
import { formatarData, formatarPct, nomeDiaSemana, plural, rotuloDia } from '../../../lib/formatar';
import { COR_GRAFICO, COR_STATUS } from '../cores';
import { alturaMarcadorAusente, eixoEficiencia, itemComDados, legenda, legendaComStatus } from './base';
import GraficoMisto, { type DadosGrafico, type OpcoesGrafico } from './GraficoMisto';

export type VisaoTendencia = 'periodo' | 'semanas' | 'dia-da-semana';

interface GraficoTendenciaProps {
  visao: VisaoTendencia;
  dias: readonly DiaAnalise[];
  tendencia: Tendencia;
}

interface Montagem {
  tipo: 'bar' | 'line';
  dados: DadosGrafico;
  opcoes: OpcoesGrafico;
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

const tooltipPct: NonNullable<OpcoesGrafico['plugins']>['tooltip'] = {
  filter: (item) => item.dataset.label !== 'Meta (100%)' && itemComDados(item),
  callbacks: {
    label: (item) =>
      item.dataset.label === 'Sem registro' ? 'Sem registro' : `${item.dataset.label}: ${formatarPct(item.parsed.y)}`,
  },
};

const linhaReferencia = (quantidade: number): DadosGrafico['datasets'][number] => ({
  type: 'line',
  label: 'Meta (100%)',
  data: Array.from({ length: quantidade }, () => 100),
  borderColor: COR_GRAFICO.referencia,
  borderDash: [2, 4],
  borderWidth: 1.5,
  pointRadius: 0,
  order: 5,
});

function montarEvolucao(dias: readonly DiaAnalise[], tendencia: Tendencia): Montagem {
  const eficiencias = dias.map((d) => d.eficiencia);
  const temLinha = tendencia.linha.some((v) => v !== null);

  return {
    tipo: 'line',
    dados: {
      labels: dias.map((d) => rotuloDia(d.data)),
      datasets: [
        {
          type: 'line',
          label: 'Eficiência diária',
          data: eficiencias,
          borderColor: COR_GRAFICO.eficiencia,
          backgroundColor: COR_GRAFICO.eficiencia,
          pointBackgroundColor: dias.map((d) => COR_STATUS[d.status].hex),
          pointBorderColor: '#ffffff',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          tension: 0,
          spanGaps: true,
          order: 2,
        },
        {
          type: 'line',
          label: 'Média móvel (3 dias)',
          data: tendencia.mediaMovel,
          borderColor: COR_GRAFICO.mediaMovel,
          backgroundColor: COR_GRAFICO.mediaMovel,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
          order: 3,
        },
        ...(temLinha
          ? [{
              type: 'line' as const,
              label: 'Linha de tendência',
              data: tendencia.linha,
              borderColor: COR_GRAFICO.tendencia,
              backgroundColor: COR_GRAFICO.tendencia,
              borderDash: [8, 5],
              borderWidth: 2,
              pointRadius: 0,
              spanGaps: true,
              order: 4,
            }]
          : []),
        linhaReferencia(dias.length),
      ],
    },
    opcoes: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: legenda, tooltip: tooltipPct },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 60, font: { size: 10 }, color: COR_GRAFICO.rotulo } },
        y: eixoEficiencia([...eficiencias, ...tendencia.mediaMovel, ...tendencia.linha]),
      },
    },
  };
}

function montarBarras(
  rotulos: string[],
  eficiencias: (number | null)[],
  rotuloSerie: string,
  detalhes: string[],
): Montagem {
  const marcador = alturaMarcadorAusente(eficiencias.map((e) => (e === null ? null : e)));
  const status = (e: number | null): StatusEficiencia => statusDaEficiencia(e);

  return {
    tipo: 'bar',
    dados: {
      labels: rotulos,
      datasets: [
        {
          type: 'bar',
          label: rotuloSerie,
          data: eficiencias,
          stack: 'serie',
          backgroundColor: eficiencias.map((e) => COR_STATUS[status(e)].hex),
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Sem registro',
          data: eficiencias.map((e) => (e === null ? marcador : null)),
          stack: 'serie',
          backgroundColor: COR_STATUS['sem-dados'].hex,
          borderRadius: 4,
          order: 3,
        },
        linhaReferencia(rotulos.length),
      ],
    },
    opcoes: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legendaComStatus,
        tooltip: {
          ...tooltipPct,
          callbacks: {
            ...tooltipPct?.callbacks,
            afterBody: (itens) => (detalhes[itens[0]?.dataIndex] ? [detalhes[itens[0].dataIndex]] : []),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: COR_GRAFICO.rotulo } },
        y: eixoEficiencia(eficiencias),
      },
    },
  };
}

function montarSemanas(tendencia: Tendencia): Montagem {
  return montarBarras(
    tendencia.semanal.map((s) => `${formatarData(s.inicio)}–${formatarData(s.fim)}`),
    tendencia.semanal.map((s) => s.eficiencia),
    'Eficiência da semana',
    tendencia.semanal.map((s) => `${plural(s.diasComRegistro, 'dia com registro', 'dias com registro')}`),
  );
}

function montarDiasDaSemana(tendencia: Tendencia): Montagem {
  return montarBarras(
    tendencia.porDiaDaSemana.map((p) => capitalizar(nomeDiaSemana(p.diaSemana, 'curto'))),
    tendencia.porDiaDaSemana.map((p) => p.eficiencia),
    'Eficiência no dia da semana',
    tendencia.porDiaDaSemana.map((p) => `${plural(p.diasComRegistro, 'dia com registro', 'dias com registro')}`),
  );
}

export default function GraficoTendencia({ visao, dias, tendencia }: GraficoTendenciaProps) {
  const { tipo, dados, opcoes } = useMemo(() => {
    if (visao === 'semanas') return montarSemanas(tendencia);
    if (visao === 'dia-da-semana') return montarDiasDaSemana(tendencia);
    return montarEvolucao(dias, tendencia);
  }, [visao, dias, tendencia]);

  return <GraficoMisto tipo={tipo} dados={dados} opcoes={opcoes} />;
}
