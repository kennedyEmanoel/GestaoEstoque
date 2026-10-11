import * as repo from '../repositories/producaoRepository';
import * as dashboardRepo from '../repositories/dashboardRepository';
import { rotuloEtapa, rotuloProduto } from '../../shared/rotulos';
import * as operadorRepo from '../repositories/operadorRepository';
import * as produtoRepo from '../repositories/produtoRepository';
import * as etapaRepo from '../repositories/etapaRepository';
import * as variacaoRepo from '../repositories/variacaoRepository';
import { ErroNegocio } from '../erros';
import type {
  AddOperadorInput,
  CartaoDoDia,
  CreateFichaDiariaInput,
  DiaComRegistro,
  FichaDiaria,
  FichaDiariaCompleta,
  GetFichaInput,
  ImpactoExclusao,
  OperadorDiario,
  RegistroHorario,
  RemoveOperadorInput,
  UpsertRegistroInput,
} from '../../shared/types';
import {
  dataIso,
  idObrigatorio,
  idOpcional,
  inteiroNaoNegativo,
  textoObrigatorio,
} from './validacao';

function montarFichaCompleta(ficha: FichaDiaria): FichaDiariaCompleta {
  const escala    = repo.listarEscala(ficha.id);
  const registros = repo.listarRegistrosDaFicha(ficha.id);
  return {
    ...ficha,
    operadores: escala.map((op) => ({
      ...op,
      registros: registros.filter((r) => r.operadorDiarioId === op.id),
    })),
  };
}

function chaveValida(input: GetFichaInput) {
  return {
    data:       dataIso(input?.data),
    produtoId:  idObrigatorio(input?.produtoId, 'Produto'),
    etapaId:    idObrigatorio(input?.etapaId, 'Etapa'),
    variacaoId: idOpcional(input?.variacaoId, 'Variação'),
  };
}

/** Confere se produto, etapa e variação existem, estão ativos e se a variação pertence à etapa. */
function garantirCadastrosUsaveis(produtoId: number, etapaId: number, variacaoId: number | null): void {
  const produto = produtoRepo.buscarPorId(produtoId);
  if (!produto) throw new ErroNegocio('Produto não encontrado.');
  if (!produto.ativo) throw new ErroNegocio(`O produto ${produto.nome} está inativo.`);

  const etapa = etapaRepo.buscarPorId(etapaId);
  if (!etapa) throw new ErroNegocio('Etapa não encontrada.');
  if (!etapa.ativo) throw new ErroNegocio(`A etapa ${etapa.nome} está inativa.`);

  if (variacaoId !== null) {
    const variacao = variacaoRepo.buscarPorId(variacaoId);
    if (!variacao) throw new ErroNegocio('Variação não encontrada.');
    if (variacao.etapaId !== etapaId) {
      throw new ErroNegocio(`A variação ${variacao.nome} não pertence à etapa ${etapa.nome}.`);
    }
    if (!variacao.ativo) throw new ErroNegocio(`A variação ${variacao.nome} está inativa.`);
  }
}

function fichaOuFalhar(id: number): FichaDiaria {
  const ficha = repo.buscarFichaPorId(id);
  if (!ficha) throw new ErroNegocio(`Ficha ${id} não encontrada.`);
  return ficha;
}

// ─── Funções exportadas ──────────────────────────────────────────────────────

export function getFichaCompleta(input: GetFichaInput): FichaDiariaCompleta | null {
  const ficha = repo.buscarFichaPorChave(chaveValida(input));
  return ficha ? montarFichaCompleta(ficha) : null;
}

export function getFichaPorId(id: number): FichaDiariaCompleta {
  return montarFichaCompleta(fichaOuFalhar(idObrigatorio(id, 'Ficha')));
}

/** O que será apagado junto com o cartão (para o aviso antes de excluir). */
export function impactoDoCartao(id: number): ImpactoExclusao {
  const ficha = fichaOuFalhar(idObrigatorio(id, 'Ficha'));
  return { cartoes: 1, ...repo.contarDependentesDeFichas([ficha.id]), variacoes: 0 };
}

/** Exclui o cartão com todos os operadores escalados e registros dele. */
export function removerCartao(id: number): void {
  repo.removerFicha(fichaOuFalhar(idObrigatorio(id, 'Ficha')).id);
}

/** Cartões que já existem em um dia, com o total de cada um (para abrir com um clique). */
export function listarCartoesDoDia(data: string): CartaoDoDia[] {
  const dia = dataIso(data);
  return dashboardRepo.listarFichasDoDia(dia, null).map((ficha) => {
    const porOperador    = dashboardRepo.totaisPorOperador(ficha.fichaId, null);
    const totalRealizado = porOperador.reduce((s, o) => s + o.totalRealizado, 0);
    const totalMeta      = porOperador.reduce((s, o) => s + o.totalMeta, 0);
    return {
      fichaId:        ficha.fichaId,
      etapa:          ficha.etapa,
      variacao:       ficha.variacao,
      rotulo:         rotuloEtapa(ficha.etapa, ficha.variacao),
      produto:        rotuloProduto(ficha.produto, ficha.produtoVersao),
      operadores:     porOperador.length,
      totalRealizado,
      totalMeta,
      pctAtingimento: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : null,
    };
  });
}

/** Últimos dias com cartões (padrão: 14). */
export function listarDiasComRegistro(limite = 14): DiaComRegistro[] {
  if (!Number.isInteger(limite) || limite < 1 || limite > 90) {
    throw new ErroNegocio('Limite de dias inválido (1 a 90).');
  }
  return repo.listarDiasComRegistro(limite);
}

export function getOrCreateFicha(input: CreateFichaDiariaInput): FichaDiariaCompleta {
  const chave = chaveValida(input);
  const existente = repo.buscarFichaPorChave(chave);
  if (existente) return montarFichaCompleta(existente);

  const metaHoraPadrao = inteiroNaoNegativo(input.metaHoraPadrao, 'Meta por hora');
  garantirCadastrosUsaveis(chave.produtoId, chave.etapaId, chave.variacaoId);

  const id = repo.inserirFicha({ ...chave, metaHoraPadrao });
  return montarFichaCompleta(fichaOuFalhar(id));
}

export function addOperador(input: AddOperadorInput): OperadorDiario {
  const fichaId    = idObrigatorio(input?.fichaId, 'Ficha');
  const operadorId = idObrigatorio(input?.operadorId, 'Operador');
  fichaOuFalhar(fichaId);

  const jaEscalado = repo.buscarEscala(fichaId, operadorId);
  if (jaEscalado) return jaEscalado;

  const operador = operadorRepo.buscarPorId(operadorId);
  if (!operador) throw new ErroNegocio('Operador não encontrado.');
  if (!operador.ativo) throw new ErroNegocio(`O operador ${operador.nome} está inativo.`);

  const id = repo.inserirEscala({ fichaId, operadorId, ordem: repo.proximaOrdem(fichaId) });
  return repo.buscarEscalaPorId(id)!;
}

export function removeOperador(input: RemoveOperadorInput): void {
  repo.removerEscala(idObrigatorio(input?.operadorDiarioId, 'Operador da ficha'));
}

export function upsertRegistro(input: UpsertRegistroInput): RegistroHorario {
  const operadorDiarioId = idObrigatorio(input?.operadorDiarioId, 'Operador da ficha');
  const horarioBloco     = textoObrigatorio(input?.horarioBloco, 'Horário', 20);
  const meta             = inteiroNaoNegativo(input?.meta, 'Meta');
  const realizado        = inteiroNaoNegativo(input?.realizado, 'Realizado');

  if (meta <= 0) throw new ErroNegocio('Meta deve ser maior que zero para salvar o registro.');
  if (!repo.buscarEscalaPorId(operadorDiarioId)) throw new ErroNegocio('Operador não encontrado nesta ficha.');

  return repo.gravarRegistro({ operadorDiarioId, horarioBloco, meta, realizado });
}

export function updateMetaHoraPadrao(fichaId: number, meta: number): void {
  const id = idObrigatorio(fichaId, 'Ficha');
  const valor = inteiroNaoNegativo(meta, 'Meta por hora');
  if (!repo.atualizarMetaPadrao(id, valor)) throw new ErroNegocio(`Ficha ${id} não encontrada.`);
}
