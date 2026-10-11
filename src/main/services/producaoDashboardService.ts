import * as repo from '../repositories/dashboardRepository';
import * as produtoRepo from '../repositories/produtoRepository';
import { ErroNegocio } from '../erros';
import { rotuloEtapa, rotuloProduto } from '../../shared/rotulos';
import type { DashboardPorEtapasData, EtapaResumo } from '../../shared/types';
import { dataIso, idOpcional, textoOpcional } from './validacao';

/**
 * Dashboard do dia: um resumo por ficha (etapa/variação de um produto).
 *
 * @param data          'AAAA-MM-DD'
 * @param produtoId     filtra por produto; omitido/null = todos
 * @param horarioBloco  quando informado, os totais por operador consideram só aquela faixa
 */
export function getDashboardPorEtapas(
  data: string,
  produtoId?: number | null,
  horarioBloco?: string,
): DashboardPorEtapasData {
  const dia     = dataIso(data);
  const filtro  = idOpcional(produtoId, 'Produto');
  const bloco   = textoOpcional(horarioBloco, 'Horário', 20);

  let produtoRotulo = 'Todos';
  if (filtro !== null) {
    const produto = produtoRepo.buscarPorId(filtro);
    if (!produto) throw new ErroNegocio('Produto não encontrado.');
    produtoRotulo = rotuloProduto(produto.nome, produto.versao);
  }

  const etapas: EtapaResumo[] = repo.listarFichasDoDia(dia, filtro).map((ficha) => {
    const porOperador = repo.totaisPorOperador(ficha.fichaId, bloco);
    const porHora     = repo.totaisPorHora(ficha.fichaId);

    const totalRealizado = porOperador.reduce((s, o) => s + o.totalRealizado, 0);
    const totalMeta      = porOperador.reduce((s, o) => s + o.totalMeta, 0);

    return {
      fichaId:        ficha.fichaId,
      etapa:          ficha.etapa,
      variacao:       ficha.variacao,
      rotulo:         rotuloEtapa(ficha.etapa, ficha.variacao),
      produto:        rotuloProduto(ficha.produto, ficha.produtoVersao),
      totalRealizado,
      totalMeta,
      saldo:          totalRealizado - totalMeta,
      pctAtingimento: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : null,
      porOperador,
      porHora,
    };
  });

  return {
    data: dia,
    produto: produtoRotulo,
    totalGeral: {
      realizado: etapas.reduce((s, e) => s + e.totalRealizado, 0),
      meta:      etapas.reduce((s, e) => s + e.totalMeta, 0),
    },
    etapas,
  };
}
