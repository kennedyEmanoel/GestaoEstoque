import { useMemo } from 'react';
import type { DiaAnalise } from '../../../../shared/analise';
import { formatarNumero, formatarPct, formatarSaldo, rotuloDia } from '../../../lib/formatar';
import { COR_GRAFICO, COR_STATUS } from '../cores';
import { alturaMarcadorAusente, eixoPecas, itemComDados, legendaComStatus } from './base';
import GraficoMisto, { type DadosGrafico, type OpcoesGrafico } from './GraficoMisto';

interface GraficoDiarioProps {
  dias: readonly DiaAnalise[];
  diaSelecionado: string | null;
  onSelecionarDia: (data: string) => void;
}

export default function GraficoDiario({ dias, diaSelecionado, onSelecionarDia }: GraficoDiarioProps) {
  const dados = useMemo<DadosGrafico>(() => {
    const realizado = dias.map((d) => (d.registrado ? d.realizado : null));
    const marcador = alturaMarcadorAusente(realizado);
    return {
      labels: dias.map((d) => rotuloDia(d.data)),
      datasets: [
        {
          type: 'bar',
          label: 'Realizado',
          data: realizado,
          stack: 'dia',
          backgroundColor: dias.map((d) => COR_STATUS[d.status].hex),
          borderColor: dias.map((d) => (d.data === diaSelecionado ? COR_GRAFICO.selecionado : 'transparent')),
          borderWidth: 2,
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Sem registro',
          data: dias.map((d) => (d.registrado ? null : marcador)),
          stack: 'dia',
          backgroundColor: COR_STATUS['sem-dados'].hex,
          borderRadius: 4,
          order: 3,
        },
        {
          type: 'line',
          label: 'Meta',
          data: dias.map((d) => (d.registrado ? d.meta : null)),
          borderColor: COR_GRAFICO.meta,
          backgroundColor: COR_GRAFICO.meta,
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0,
          order: 1,
        },
      ],
    };
  }, [dias, diaSelecionado]);

  const opcoes = useMemo<OpcoesGrafico>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (_evento, elementos) => {
      const dia = elementos[0] ? dias[elementos[0].index] : undefined;
      if (dia?.registrado) onSelecionarDia(dia.data);
    },
    onHover: (evento, elementos) => {
      const alvo = evento.native?.target;
      if (alvo instanceof HTMLElement) alvo.style.cursor = elementos.length > 0 ? 'pointer' : 'default';
    },
    plugins: {
      legend: legendaComStatus,
      tooltip: {
        filter: itemComDados,
        callbacks: {
          label: (item) =>
            item.dataset.label === 'Sem registro'
              ? 'Sem registro neste dia'
              : `${item.dataset.label}: ${formatarNumero(item.parsed.y)}`,
          afterBody: (itens) => {
            const dia = dias[itens[0]?.dataIndex];
            if (!dia?.registrado) return [];
            return [`Eficiência: ${formatarPct(dia.eficiencia)}`, `Saldo: ${formatarSaldo(dia.saldo)} peças`, 'Clique para ver hora a hora'];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: true,
          maxRotation: 60,
          font: { size: 10 },
          color: (contexto) => (dias[contexto.index]?.registrado ? COR_GRAFICO.rotulo : COR_GRAFICO.rotuloAusente),
        },
      },
      y: eixoPecas,
    },
  }), [dias, onSelecionarDia]);

  return <GraficoMisto tipo="bar" dados={dados} opcoes={opcoes} />;
}
