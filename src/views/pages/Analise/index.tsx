import { useCallback, useEffect, useMemo, useState } from 'react';
import { validarPeriodo, type CombinacaoAnalise, type FiltroAnalise } from '../../../shared/analise';
import { hojeLocal } from '../../../shared/datas';
import { rotuloEtapa } from '../../../shared/rotulos';
import CartaoGrafico from '../../components/ui/CartaoGrafico';
import EstadoVazio from '../../components/ui/EstadoVazio';
import Segmentado from '../../components/ui/Segmentado';
import SecaoPagina from '../../components/ui/SecaoPagina';
import { btnPrimario } from '../../components/ui/estilos';
import { chamar, mensagemDeErro } from '../../lib/api';
import { formatarPeriodo, plural, rotuloDia } from '../../lib/formatar';
import FiltrosAnalise from './FiltrosAnalise';
import GraficoDiario from './graficos/GraficoDiario';
import GraficoHorario, { type ModoGraficoHorario } from './graficos/GraficoHorario';
import GraficoTendencia, { type VisaoTendencia } from './graficos/GraficoTendencia';
import ListaCriticos from './ListaCriticos';
import MapaHorario from './MapaHorario';
import PainelGeral from './PainelGeral';
import ResumoTendencia from './ResumoTendencia';
import TabelaHorarios from './TabelaHorarios';
import { useAnalise } from './useAnalise';
import {
  SELECAO_VAZIA,
  intervaloDosDados,
  periodoAbrangendo,
  periodoPadrao,
  selecaoInicial,
  type Periodo,
  type SelecaoFiltros,
} from './opcoes';

export default function Analise() {
  const hoje = useMemo(() => hojeLocal(), []);
  const [combos, setCombos] = useState<CombinacaoAnalise[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<SelecaoFiltros>(SELECAO_VAZIA);
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoPadrao(hoje));

  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null);
  const [modoHorario, setModoHorario] = useState<ModoGraficoHorario>('dia');
  const [visaoTendencia, setVisaoTendencia] = useState<VisaoTendencia>('periodo');

  useEffect(() => {
    let ativo = true;
    chamar(window.api.analise.opcoes())
      .then((lista) => {
        if (!ativo) return;
        const inicial = selecaoInicial(lista);
        const intervalo = intervaloDosDados(lista, inicial);
        setCombos(lista);
        setSelecao(inicial);
        if (intervalo) setPeriodo(periodoPadrao(intervalo.ultima));
      })
      .catch((e) => { if (ativo) setErroCarga(mensagemDeErro(e)); });
    return () => { ativo = false; };
  }, []);

  const erroPeriodo = validarPeriodo(periodo.inicio, periodo.fim);

  const filtro = useMemo<FiltroAnalise | null>(() => {
    const { operadorId, produtoId, etapaId, variacao } = selecao;
    if (operadorId === null || produtoId === null || etapaId === null || erroPeriodo) return null;
    return { operadorId, produtoId, etapaId, variacao, inicio: periodo.inicio, fim: periodo.fim };
  }, [selecao, periodo, erroPeriodo]);

  const { dados, carregando, erro } = useAnalise(filtro);

  const intervaloDados = useMemo(() => intervaloDosDados(combos ?? [], selecao), [combos, selecao]);
  const periodoComDados = useMemo(() => (intervaloDados ? periodoAbrangendo(intervaloDados) : null), [intervaloDados]);

  useEffect(() => {
    if (!dados) {
      setDiaDetalhe(null);
      return;
    }
    const registrados = dados.dias.filter((d) => d.registrado);
    setDiaDetalhe((atual) =>
      atual && registrados.some((d) => d.data === atual) ? atual : (registrados[registrados.length - 1]?.data ?? null));
  }, [dados]);

  const escolherDia = useCallback((data: string) => {
    setDiaDetalhe(data);
    setModoHorario('dia');
  }, []);

  const diaSelecionado = dados?.dias.find((d) => d.data === diaDetalhe) ?? null;
  const diasRegistrados = dados?.dias.filter((d) => d.registrado) ?? [];

  return (
    <div className="flex h-full flex-col bg-zinc-50">
      {combos && combos.length > 0 && (
        <FiltrosAnalise
          combos={combos}
          selecao={selecao}
          periodo={periodo}
          erroPeriodo={erroPeriodo}
          hoje={hoje}
          periodoDosDados={periodoComDados}
          onSelecao={setSelecao}
          onPeriodo={setPeriodo}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-6">
          {erroCarga && <Aviso texto={erroCarga} />}
          {erro && <Aviso texto={erro} />}

          {!combos && !erroCarga && <p className="text-sm text-zinc-400">Carregando...</p>}

          {combos && combos.length === 0 && (
            <EstadoVazio
              titulo="Ainda não há registros para analisar"
              texto="Os registros hora a hora salvos em Controle de Produção aparecem aqui assim que existirem."
            />
          )}

          {carregando && !dados && !erroPeriodo && <p className="text-sm text-zinc-400">Carregando análise...</p>}

          {combos && combos.length > 0 && erroPeriodo && (
            <EstadoVazio titulo="Defina um período válido" texto={erroPeriodo} />
          )}

          {dados && !erroPeriodo && dados.geral.blocosRegistrados === 0 && (
            <EstadoVazio
              titulo="Nenhum registro neste período"
              texto={
                intervaloDados
                  ? `Este operador, nesta combinação de produto e etapa, tem registros de ${formatarPeriodo(intervaloDados.primeira, intervaloDados.ultima)}.`
                  : 'Não há registros desta combinação.'
              }
              acao={periodoComDados && (
                <button type="button" className={btnPrimario} onClick={() => setPeriodo(periodoComDados)}>
                  Ver período com dados
                </button>
              )}
            />
          )}

          {dados && !erroPeriodo && dados.geral.blocosRegistrados > 0 && (
            <>
              <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-extrabold text-zinc-900">{dados.filtro.operador}</h1>
                  <p className="text-sm text-zinc-500">
                    {rotuloEtapa(dados.filtro.etapa, typeof dados.filtro.variacao === 'number' || dados.filtro.variacao === 'sem' ? dados.filtro.variacaoRotulo : null)}
                    {' · '}{dados.filtro.produto}{' · '}
                    {formatarPeriodo(dados.filtro.inicio, dados.filtro.fim)} ({plural(dados.filtro.diasNoPeriodo, 'dia', 'dias')})
                  </p>
                </div>
                {carregando && <span className="text-xs text-zinc-400">Atualizando...</span>}
              </header>

              <SecaoPagina
                titulo="Análise geral"
                descricao="Indicadores consolidados do operador, produto e etapa no período escolhido."
              >
                <PainelGeral geral={dados.geral} />
              </SecaoPagina>

              <SecaoPagina
                titulo="Visualização gráfica"
                descricao="Evolução do realizado contra a meta. Clique em uma barra do gráfico por dia para ver aquele dia hora a hora."
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <CartaoGrafico
                    titulo="Realizado × meta por dia"
                    subtitulo="Cor da barra: verde na meta, âmbar próximo, vermelho crítico"
                    rotuloAria="Gráfico de barras do realizado por dia comparado à meta"
                    rodape="Dias úteis sem registro aparecem como barra cinza baixa (e não como produção zero); fins de semana só aparecem quando houve produção."
                  >
                    <GraficoDiario dias={dados.dias} diaSelecionado={diaDetalhe} onSelecionarDia={escolherDia} />
                  </CartaoGrafico>

                  <CartaoGrafico
                    titulo="Realizado × meta por hora"
                    subtitulo={modoHorario === 'dia' && diaSelecionado ? `Dia ${rotuloDia(diaSelecionado.data)}` : 'Média das faixas em todo o período'}
                    rotuloAria="Gráfico do realizado por faixa de horário comparado à meta"
                    acoes={
                      <div className="flex flex-wrap items-center gap-2">
                        {modoHorario === 'dia' && diasRegistrados.length > 0 && (
                          <select
                            aria-label="Dia para detalhar por hora"
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
                            value={diaDetalhe ?? ''}
                            onChange={(e) => setDiaDetalhe(e.target.value)}
                          >
                            {diasRegistrados.map((d) => <option key={d.data} value={d.data}>{rotuloDia(d.data)}</option>)}
                          </select>
                        )}
                        <Segmentado
                          rotuloAria="Modo do gráfico por hora"
                          valor={modoHorario}
                          onChange={setModoHorario}
                          opcoes={[
                            { valor: 'dia', rotulo: 'Dia escolhido', desabilitada: diasRegistrados.length === 0 },
                            { valor: 'periodo', rotulo: 'Média do período' },
                          ]}
                        />
                      </div>
                    }
                    rodape="Faixas sem registro aparecem como barra cinza baixa."
                  >
                    <GraficoHorario modo={modoHorario} dia={diaSelecionado} horarios={dados.horarios} />
                  </CartaoGrafico>
                </div>

                <CartaoGrafico
                  titulo="Tendência de produtividade"
                  subtitulo="Eficiência (% da meta) ao longo do período"
                  rotuloAria="Gráfico de tendência da eficiência"
                  altura={300}
                  acoes={
                    <Segmentado
                      rotuloAria="Visão da tendência"
                      valor={visaoTendencia}
                      onChange={setVisaoTendencia}
                      opcoes={[
                        { valor: 'periodo', rotulo: 'No período' },
                        { valor: 'semanas', rotulo: 'Semana a semana' },
                        { valor: 'dia-da-semana', rotulo: 'Dia da semana' },
                      ]}
                    />
                  }
                  rodape={<ResumoTendencia tendencia={dados.tendencia} diasComRegistro={dados.geral.diasComEficiencia} />}
                >
                  <GraficoTendencia visao={visaoTendencia} dias={dados.dias} tendencia={dados.tendencia} />
                </CartaoGrafico>
              </SecaoPagina>

              <SecaoPagina
                titulo="Análise detalhada"
                descricao="Quebra dia a dia e hora a hora, comparativo entre meta horária e realizado, e identificação dos pontos críticos."
              >
                <ListaCriticos criticos={dados.criticos} />
                <MapaHorario
                  dias={dados.dias}
                  horarios={dados.horarios}
                  diaSelecionado={diaDetalhe}
                  onSelecionarDia={escolherDia}
                />
                <TabelaHorarios horarios={dados.horarios} />
              </SecaoPagina>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
      {texto}
    </div>
  );
}
