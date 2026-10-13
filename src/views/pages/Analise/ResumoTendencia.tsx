import { MIN_DIAS_TENDENCIA, VARIACAO_MIN_TENDENCIA, type DirecaoTendencia, type Tendencia } from '../../../shared/analise';
import { formatarNumero, formatarPontos, plural } from '../../lib/formatar';

const DIRECAO: Record<DirecaoTendencia, { rotulo: string; seta: string; classe: string }> = {
  subindo: { rotulo: 'Produtividade subindo', seta: '↗', classe: 'bg-emerald-100 text-emerald-700' },
  caindo: { rotulo: 'Produtividade caindo', seta: '↘', classe: 'bg-red-100 text-red-700' },
  estavel: { rotulo: 'Produtividade estável', seta: '→', classe: 'bg-zinc-100 text-zinc-700' },
  insuficiente: { rotulo: 'Tendência indisponível', seta: '·', classe: 'bg-zinc-100 text-zinc-500' },
};

interface ResumoTendenciaProps {
  tendencia: Tendencia;
  diasComRegistro: number;
}

export default function ResumoTendencia({ tendencia, diasComRegistro }: ResumoTendenciaProps) {
  const direcao = DIRECAO[tendencia.direcao];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${direcao.classe}`}>
        <span aria-hidden="true">{direcao.seta}</span>
        {direcao.rotulo}
      </span>
      <span>
        {tendencia.direcao === 'insuficiente'
          ? `São necessários pelo menos ${MIN_DIAS_TENDENCIA} dias com registro (há ${plural(diasComRegistro, 'dia', 'dias')}).`
          : `${formatarPontos(tendencia.variacaoNoPeriodo)} do primeiro ao último dia analisado (ajuste linear, R² ${formatarNumero(tendencia.r2, 2)}). ` +
            (tendencia.direcao === 'estavel'
              ? `Variações abaixo de ${VARIACAO_MIN_TENDENCIA} p.p. ou sem direção clara são tratadas como estáveis.`
              : '')}
      </span>
    </div>
  );
}
