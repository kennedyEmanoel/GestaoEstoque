import * as repo from '../repositories/analiseRepository';
import * as operadorRepo from '../repositories/operadorRepository';
import * as produtoRepo from '../repositories/produtoRepository';
import * as etapaRepo from '../repositories/etapaRepository';
import * as variacaoRepo from '../repositories/variacaoRepository';
import { ErroNegocio } from '../erros';
import { diasEntre } from '../../shared/datas';
import { rotuloProduto } from '../../shared/rotulos';
import {
  validarPeriodo,
  type AnaliseDesempenho,
  type CombinacaoAnalise,
  type FiltroAnalise,
  type FiltroVariacao,
} from '../../shared/analise';
import { calcularAnalise } from './analiseCalculos';
import { idObrigatorio } from './validacao';

function variacaoValida(valor: unknown): FiltroVariacao {
  if (valor === 'todas' || valor === 'sem') return valor;
  return idObrigatorio(valor, 'Variação');
}

export function listarOpcoesAnalise(): CombinacaoAnalise[] {
  return repo.listarCombinacoes().flatMap((linha) =>
    linha.primeiraData === null || linha.ultimaData === null
      ? []
      : [{
          operadorId: linha.operadorId,
          operador: linha.operador,
          operadorAtivo: linha.operadorAtivo,
          produtoId: linha.produtoId,
          produto: rotuloProduto(linha.produto, linha.produtoVersao),
          etapaId: linha.etapaId,
          etapa: linha.etapa,
          variacaoId: linha.variacaoId,
          variacao: linha.variacao,
          primeiraData: linha.primeiraData,
          ultimaData: linha.ultimaData,
          dias: linha.dias,
        }],
  );
}

export function analisarDesempenho(filtro: FiltroAnalise): AnaliseDesempenho {
  const operadorId = idObrigatorio(filtro?.operadorId, 'Operador');
  const produtoId = idObrigatorio(filtro?.produtoId, 'Produto');
  const etapaId = idObrigatorio(filtro?.etapaId, 'Etapa');
  const variacao = variacaoValida(filtro?.variacao);

  const erroPeriodo = validarPeriodo(filtro?.inicio, filtro?.fim);
  if (erroPeriodo) throw new ErroNegocio(erroPeriodo);
  const { inicio, fim } = filtro;

  const operador = operadorRepo.buscarPorId(operadorId);
  if (!operador) throw new ErroNegocio('Operador não encontrado.');
  const produto = produtoRepo.buscarPorId(produtoId);
  if (!produto) throw new ErroNegocio('Produto não encontrado.');
  const etapa = etapaRepo.buscarPorId(etapaId);
  if (!etapa) throw new ErroNegocio('Etapa não encontrada.');

  let variacaoRotulo = variacao === 'sem' ? 'Sem variação' : 'Todas';
  if (typeof variacao === 'number') {
    const encontrada = variacaoRepo.buscarPorId(variacao);
    if (!encontrada) throw new ErroNegocio('Variação não encontrada.');
    if (encontrada.etapaId !== etapaId) {
      throw new ErroNegocio(`A variação ${encontrada.nome} não pertence à etapa ${etapa.nome}.`);
    }
    variacaoRotulo = encontrada.nome;
  }

  const registros = repo.listarRegistros({ operadorId, produtoId, etapaId, variacao, inicio, fim });

  return {
    filtro: {
      operadorId,
      operador: operador.nome,
      produtoId,
      produto: rotuloProduto(produto.nome, produto.versao),
      etapaId,
      etapa: etapa.nome,
      variacao,
      variacaoRotulo,
      inicio,
      fim,
      diasNoPeriodo: diasEntre(inicio, fim) + 1,
    },
    ...calcularAnalise(registros, inicio, fim),
  };
}
