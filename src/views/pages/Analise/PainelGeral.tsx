import type { NivelConsistencia, ResumoGeral } from '../../../shared/analise';
import { LIMITE_CONSISTENCIA_ALTA, LIMITE_CONSISTENCIA_MODERADA, MIN_DIAS_CONSISTENCIA } from '../../../shared/analise';
import BarraProgresso from '../../components/ui/BarraProgresso';
import CartaoIndicador, { type DestaqueIndicador } from '../../components/ui/CartaoIndicador';
import {
  formatarFaixa, formatarNumero, formatarPct, formatarPontos, formatarSaldo, plural, rotuloDia,
} from '../../lib/formatar';
import { COR_STATUS, destaqueDoStatus } from './cores';

const CONSISTENCIA: Record<NivelConsistencia, { rotulo: string; destaque: DestaqueIndicador }> = {
  alta: { rotulo: 'Alta', destaque: 'meta' },
  moderada: { rotulo: 'Moderada', destaque: 'proximo' },
  baixa: { rotulo: 'Baixa', destaque: 'critico' },
  insuficiente: { rotulo: 'Dados insuficientes', destaque: 'neutro' },
};

interface PainelGeralProps {
  geral: ResumoGeral;
}

export default function PainelGeral({ geral }: PainelGeralProps) {
  const { consistencia, metaHoraria } = geral;
  const nivel = CONSISTENCIA[consistencia.nivel];
  const saldoRelativo = geral.eficienciaGlobal === null ? null : geral.eficienciaGlobal - 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador
          rotulo="Eficiência global no período"
          valor={formatarPct(geral.eficienciaGlobal)}
          destaque={destaqueDoStatus(geral.status)}
          dica="Total produzido ÷ total das metas, considerando só as faixas com registro."
          detalhe={
            <>
              Média simples dos dias: <b className="text-zinc-700">{formatarPct(geral.eficienciaMediaDiaria)}</b>
              {' '}({plural(geral.diasComEficiencia, 'dia', 'dias')})
            </>
          }
        >
          <BarraProgresso valor={geral.eficienciaGlobal} cor={COR_STATUS[geral.status].hex} rotulo="Eficiência global" />
        </CartaoIndicador>

        <CartaoIndicador
          rotulo="Produzido × metas acumuladas"
          valor={
            <>
              {formatarNumero(geral.totalRealizado)}
              <span className="text-lg font-semibold text-zinc-400"> / {formatarNumero(geral.totalMeta)}</span>
            </>
          }
          destaque={geral.saldo >= 0 ? 'meta' : destaqueDoStatus(geral.status)}
          dica="Soma do realizado e soma das metas de todas as faixas registradas no período."
          detalhe={
            <>
              Saldo: <b className="text-zinc-700">{formatarSaldo(geral.saldo)} peças</b>
              {saldoRelativo !== null && <> ({formatarPontos(saldoRelativo)} da meta)</>}
            </>
          }
        />

        <CartaoIndicador
          rotulo="Consistência de desempenho"
          valor={nivel.rotulo}
          compacto
          destaque={nivel.destaque}
          dica={
            `Coeficiente de variação (desvio padrão ÷ média) da eficiência diária. Alta: até ${LIMITE_CONSISTENCIA_ALTA}%; ` +
            `moderada: até ${LIMITE_CONSISTENCIA_MODERADA}%; baixa: acima disso. Exige ${MIN_DIAS_CONSISTENCIA} dias com registro.`
          }
          detalhe={
            consistencia.coeficienteVariacao === null ? (
              <>São necessários pelo menos {MIN_DIAS_CONSISTENCIA} dias com registro (há {geral.diasComEficiencia}).</>
            ) : (
              <>
                Oscilação diária de <b className="text-zinc-700">{formatarPct(consistencia.coeficienteVariacao)}</b>
                {' '}(desvio de {formatarPontos(consistencia.desvioPadrao).replace('+', '')}).
                <br />
                <b className="text-zinc-700">{geral.diasNaMeta}</b> de {geral.diasComEficiencia} dias na meta ({formatarPct(geral.percDiasNaMeta, 0)}).
              </>
            )
          }
        />

        <CartaoIndicador
          rotulo="Registros e meta horária"
          valor={plural(geral.diasComRegistro, 'dia', 'dias')}
          dica="Dias úteis sem registro não entram nas contas (não são tratados como produção zero)."
          detalhe={
            <>
              de {geral.diasUteisNoPeriodo} dias úteis
              {geral.diasUteisSemRegistro > 0 && <> ({geral.diasUteisSemRegistro} sem registro)</>}
              <br />
              {plural(geral.blocosRegistrados, 'faixa registrada', 'faixas registradas')}
              {metaHoraria.media !== null && (
                <>
                  <br />
                  Meta horária: <b className="text-zinc-700">{formatarNumero(metaHoraria.media, 1)}/h</b>
                  {metaHoraria.minima !== metaHoraria.maxima && <> (de {metaHoraria.minima} a {metaHoraria.maxima})</>}
                </>
              )}
            </>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {geral.melhorDia && <Destaque tom="meta" rotulo="Melhor dia" valor={`${rotuloDia(geral.melhorDia.data)} · ${formatarPct(geral.melhorDia.eficiencia)}`} />}
        {geral.piorDia && <Destaque tom="critico" rotulo="Pior dia" valor={`${rotuloDia(geral.piorDia.data)} · ${formatarPct(geral.piorDia.eficiencia)}`} />}
        {geral.melhorHorario && <Destaque tom="meta" rotulo="Melhor horário" valor={`${formatarFaixa(geral.melhorHorario.bloco)} · ${formatarPct(geral.melhorHorario.eficiencia)}`} />}
        {geral.piorHorario && <Destaque tom="critico" rotulo="Pior horário" valor={`${formatarFaixa(geral.piorHorario.bloco)} · ${formatarPct(geral.piorHorario.eficiencia)}`} />}
      </div>
    </div>
  );
}

function Destaque({ tom, rotulo, valor }: { tom: 'meta' | 'critico'; rotulo: string; valor: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${COR_STATUS[tom].selo}`}>
      <span className="font-semibold">{rotulo}:</span>
      <span>{valor}</span>
    </span>
  );
}
