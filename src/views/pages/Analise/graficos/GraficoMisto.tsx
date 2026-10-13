import { Chart as ChartJS, BarController, BarElement, CategoryScale, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(BarController, BarElement, CategoryScale, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip);

export type DadosGrafico = ChartData<'bar' | 'line', (number | null)[], string | string[]>;
export type OpcoesGrafico = ChartOptions<'bar' | 'line'>;

interface GraficoMistoProps {
  tipo: 'bar' | 'line';
  dados: DadosGrafico;
  opcoes: OpcoesGrafico;
}

export default function GraficoMisto({ tipo, dados, opcoes }: GraficoMistoProps) {
  return <Chart<'bar' | 'line', (number | null)[], string | string[]> type={tipo} data={dados} options={opcoes} />;
}
