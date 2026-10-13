import { useId } from 'react';
import {
  PERIODO_MAX_DIAS,
  PERIODO_MIN_DIAS,
  type CombinacaoAnalise,
  type FiltroVariacao,
} from '../../../shared/analise';
import { adicionarDias, dataIsoValida } from '../../../shared/datas';
import { BarraFiltros, CampoFiltro, botaoFiltro, controleFiltro } from '../../components/ui/BarraFiltros';
import {
  corrigirPeriodo,
  corrigirSelecao,
  etapasDoProduto,
  operadoresDisponiveis,
  periodoPorUltimosDias,
  produtosDoOperador,
  variacoesDaEtapa,
  type Periodo,
  type SelecaoFiltros,
} from './opcoes';

interface FiltrosAnaliseProps {
  combos: readonly CombinacaoAnalise[];
  selecao: SelecaoFiltros;
  periodo: Periodo;
  erroPeriodo: string | null;
  hoje: string;
  periodoDosDados: Periodo | null;
  onSelecao: (selecao: SelecaoFiltros) => void;
  onPeriodo: (periodo: Periodo) => void;
}

const PREDEFINIDOS = [7, 14, 30, 90] as const;

const paraVariacao = (texto: string): FiltroVariacao =>
  texto === 'todas' || texto === 'sem' ? texto : Number(texto);

export default function FiltrosAnalise({
  combos, selecao, periodo, erroPeriodo, hoje, periodoDosDados, onSelecao, onPeriodo,
}: FiltrosAnaliseProps) {
  const id = useId();

  const operadores = operadoresDisponiveis(combos);
  const produtos = produtosDoOperador(combos, selecao.operadorId);
  const etapas = etapasDoProduto(combos, selecao.operadorId, selecao.produtoId);
  const variacoes = variacoesDaEtapa(combos, selecao.operadorId, selecao.produtoId, selecao.etapaId);
  const correcao = erroPeriodo ? corrigirPeriodo(periodo) : null;

  const alterar = (parcial: Partial<SelecaoFiltros>) => onSelecao(corrigirSelecao(combos, { ...selecao, ...parcial }));

  const inicioValido = dataIsoValida(periodo.inicio);
  const fimValido = dataIsoValida(periodo.fim);
  const limitesInicio = {
    min: fimValido ? adicionarDias(periodo.fim, -(PERIODO_MAX_DIAS - 1)) : undefined,
    max: fimValido ? adicionarDias(periodo.fim, -(PERIODO_MIN_DIAS - 1)) : undefined,
  };
  const limitesFim = {
    min: inicioValido ? adicionarDias(periodo.inicio, PERIODO_MIN_DIAS - 1) : undefined,
    max: inicioValido ? adicionarDias(periodo.inicio, PERIODO_MAX_DIAS - 1) : undefined,
  };

  return (
    <BarraFiltros>
      <CampoFiltro rotulo="Operador" obrigatorio htmlFor={`${id}-operador`}>
        <select
          id={`${id}-operador`}
          className={`${controleFiltro} min-w-40`}
          value={selecao.operadorId ?? ''}
          onChange={(e) => alterar({ operadorId: Number(e.target.value) })}
        >
          {operadores.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
      </CampoFiltro>

      <CampoFiltro rotulo="Produto" obrigatorio htmlFor={`${id}-produto`}>
        <select
          id={`${id}-produto`}
          className={`${controleFiltro} min-w-36`}
          value={selecao.produtoId ?? ''}
          onChange={(e) => alterar({ produtoId: Number(e.target.value) })}
        >
          {produtos.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
      </CampoFiltro>

      <CampoFiltro rotulo="Etapa em que atuou" obrigatorio htmlFor={`${id}-etapa`}>
        <select
          id={`${id}-etapa`}
          className={`${controleFiltro} min-w-32`}
          value={selecao.etapaId ?? ''}
          onChange={(e) => alterar({ etapaId: Number(e.target.value), variacao: 'todas' })}
        >
          {etapas.map((et) => <option key={et.valor} value={et.valor}>{et.rotulo}</option>)}
        </select>
      </CampoFiltro>

      {variacoes.length > 0 && (
        <CampoFiltro rotulo="Variação" htmlFor={`${id}-variacao`}>
          <select
            id={`${id}-variacao`}
            className={`${controleFiltro} min-w-36`}
            value={String(selecao.variacao)}
            onChange={(e) => alterar({ variacao: paraVariacao(e.target.value) })}
          >
            {variacoes.map((v) => <option key={String(v.valor)} value={String(v.valor)}>{v.rotulo}</option>)}
          </select>
        </CampoFiltro>
      )}

      <CampoFiltro rotulo="Período (mínimo 1 semana)" obrigatorio htmlFor={`${id}-inicio`}>
        <div className="flex items-center gap-1.5">
          <input
            id={`${id}-inicio`}
            type="date"
            aria-label="Data inicial"
            aria-invalid={erroPeriodo !== null}
            className={controleFiltro}
            value={periodo.inicio}
            min={limitesInicio.min}
            max={limitesInicio.max}
            onChange={(e) => onPeriodo({ ...periodo, inicio: e.target.value })}
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            aria-label="Data final"
            aria-invalid={erroPeriodo !== null}
            className={controleFiltro}
            value={periodo.fim}
            min={limitesFim.min}
            max={limitesFim.max}
            onChange={(e) => onPeriodo({ ...periodo, fim: e.target.value })}
          />
        </div>
      </CampoFiltro>

      <div className="flex items-center gap-1.5 pb-px">
        {PREDEFINIDOS.map((dias) => (
          <button key={dias} type="button" className={botaoFiltro} onClick={() => onPeriodo(periodoPorUltimosDias(dias, hoje))}>
            {dias} dias
          </button>
        ))}
        <button
          type="button"
          className={`${botaoFiltro} disabled:cursor-not-allowed disabled:opacity-40`}
          disabled={periodoDosDados === null}
          title="Do primeiro ao último registro desta combinação (até 366 dias)"
          onClick={() => periodoDosDados && onPeriodo(periodoDosDados)}
        >
          Histórico
        </button>
      </div>

      {erroPeriodo && (
        <div role="alert" className="flex basis-full items-center gap-3 text-xs text-red-300">
          <span>⚠ {erroPeriodo}</span>
          {correcao && (
            <button type="button" className={botaoFiltro} onClick={() => onPeriodo(correcao)}>
              Corrigir período
            </button>
          )}
        </div>
      )}
    </BarraFiltros>
  );
}
