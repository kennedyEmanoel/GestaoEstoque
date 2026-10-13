import { useMemo } from 'react';
import { statusDaEficiencia, type DiaAnalise, type HorarioAnalise, type StatusEficiencia } from '../../../../shared/analise';
import { formatarFaixa, formatarNumero, formatarPct, plural } from '../../../lib/formatar';
import { COR_STATUS } from '../cores';
import { alturaMarcadorAusente, eixoPecas, itemComDados, legendaComStatus } from './base';
import GraficoMisto, { type DadosGrafico, type OpcoesGrafico } from './GraficoMisto';

export type ModoGraficoHorario = 'dia' | 'periodo';

interface GraficoHorarioProps {
  modo: ModoGraficoHorario;
  dia: DiaAnalise | null;
  horarios: readonly HorarioAnalise[];
}

interface PontoHorario {
  bloco: string;
  meta: number | null;
  realizado: number | null;
  eficiencia: number | null;
  status: StatusEficiencia;
  detalhe: string;
}

function pontosDoDia(dia: DiaAnalise): PontoHorario[] {
  return dia.horas.map((h) => ({
    bloco: h.bloco,
    meta: h.meta,
    realizado: h.realizado,
    eficiencia: h.eficiencia,
    status: statusDaEficiencia(h.eficiencia),
    detalhe: '',
  }));
}

function pontosDoPeriodo(horarios: readonly HorarioAnalise[]): PontoHorario[] {
  return horarios.map((h) => ({
    bloco: h.bloco,
    meta: h.metaMedia,
    realizado: h.realizadoMedio,
    eficiencia: h.eficiencia,
    status: h.status,
    detalhe: `Média de ${plural(h.diasComRegistro, 'dia com registro', 'dias com registro')}`,
  }));
}

export default function GraficoHorario({ modo, dia, horarios }: GraficoHorarioProps) {
  const pontos = useMemo(
    () => (modo === 'dia' && dia ? pontosDoDia(dia) : pontosDoPeriodo(horarios)),
    [modo, dia, horarios],
  );
  const porDia = modo === 'dia' && dia !== null;

  const dados = useMemo<DadosGrafico>(() => {
    const realizado = pontos.map((p) => p.realizado);
    const marcador = alturaMarcadorAusente([...realizado, ...pontos.map((p) => p.meta)]);
    return {
      labels: pontos.map((p) => p.bloco.split(' - ')),
      datasets: [
        {
          type: 'bar',
          label: porDia ? 'Realizado' : 'Realizado (média por dia)',
          data: realizado,
          stack: 'faixa',
          backgroundColor: pontos.map((p) => COR_STATUS[p.status].hex),
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'bar',
          label: 'Sem registro',
          data: pontos.map((p) => (p.realizado === null ? marcador : null)),
          stack: 'faixa',
          backgroundColor: COR_STATUS['sem-dados'].hex,
          borderRadius: 4,
          order: 3,
        },
        {
          type: 'line',
          label: porDia ? 'Meta' : 'Meta (média por dia)',
          data: pontos.map((p) => p.meta),
          borderColor: '#475569',
          backgroundColor: '#475569',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0,
          order: 1,
        },
      ],
    };
  }, [pontos, porDia]);

  const opcoes = useMemo<OpcoesGrafico>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: legendaComStatus,
      tooltip: {
        filter: itemComDados,
        callbacks: {
          title: (itens) => formatarFaixa(pontos[itens[0]?.dataIndex]?.bloco ?? ''),
          label: (item) =>
            item.dataset.label === 'Sem registro'
              ? 'Sem registro nesta faixa'
              : `${item.dataset.label}: ${formatarNumero(item.parsed.y, porDia ? 0 : 1)}`,
          afterBody: (itens) => {
            const ponto = pontos[itens[0]?.dataIndex];
            if (!ponto || ponto.realizado === null) return [];
            return [`Eficiência: ${formatarPct(ponto.eficiencia)}`, ...(ponto.detalhe ? [ponto.detalhe] : [])];
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#475569' } },
      y: eixoPecas,
    },
  }), [pontos, porDia]);

  return <GraficoMisto tipo="bar" dados={dados} opcoes={opcoes} />;
}
