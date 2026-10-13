import { Chart as ChartJS, type LegendItem, type TooltipItem } from 'chart.js';
import { COR_GRAFICO, COR_STATUS } from '../cores';
import type { OpcoesGrafico } from './GraficoMisto';

const ROTULO_CURTO = { meta: 'na meta', proximo: 'próximo', critico: 'crítico' } as const;

const rotulosLegenda = { boxWidth: 12, boxHeight: 12, font: { size: 11 }, color: COR_GRAFICO.rotulo };

// Séries com valor nulo (sem registro) não devem aparecer na dica daquele ponto
export const itemComDados = (item: TooltipItem<'bar' | 'line'>): boolean => item.raw !== null && item.raw !== undefined;

export const legenda = {
  position: 'top' as const,
  labels: rotulosLegenda,
};

// As barras de "Realizado" mudam de cor conforme a situação; a legenda mostra cada uma delas
export const legendaComStatus = {
  position: 'top' as const,
  onClick: () => undefined,
  labels: {
    ...rotulosLegenda,
    generateLabels: (grafico: ChartJS): LegendItem[] =>
      ChartJS.defaults.plugins.legend.labels.generateLabels(grafico).flatMap((item) =>
        item.text.startsWith('Realizado')
          ? (['meta', 'proximo', 'critico'] as const).map((status): LegendItem => ({
              ...item,
              text: `Realizado · ${ROTULO_CURTO[status]}`,
              fillStyle: COR_STATUS[status].hex,
              strokeStyle: COR_STATUS[status].hex,
              hidden: false,
            }))
          : [item],
      ),
  },
};

export const eixoPecas: NonNullable<OpcoesGrafico['scales']>['y'] = {
  beginAtZero: true,
  title: { display: true, text: 'Peças', font: { size: 11 }, color: COR_GRAFICO.rotulo },
  grid: { color: COR_GRAFICO.grade },
  ticks: { font: { size: 11 }, color: COR_GRAFICO.rotulo },
};

export function eixoEficiencia(valores: readonly (number | null)[]): NonNullable<OpcoesGrafico['scales']>['y'] {
  const presentes = valores.filter((v): v is number => v !== null);
  const menor = Math.min(100, ...presentes);
  const maior = Math.max(100, ...presentes);
  return {
    suggestedMin: Math.max(0, Math.floor((menor - 10) / 10) * 10),
    suggestedMax: Math.ceil((maior + 10) / 10) * 10,
    title: { display: true, text: 'Eficiência (% da meta)', font: { size: 11 }, color: COR_GRAFICO.rotulo },
    grid: { color: COR_GRAFICO.grade },
    ticks: { font: { size: 11 }, color: COR_GRAFICO.rotulo, callback: (valor) => `${valor}%` },
  };
}

// Barra baixa e cinza que torna visível (e com tooltip) o que não tem registro
export function alturaMarcadorAusente(valores: readonly (number | null)[]): number {
  const maior = Math.max(1, ...valores.filter((v): v is number => v !== null));
  return maior * 0.05;
}
