import * as repo from '../repositories/etapaRepository';
import * as variacaoRepo from '../repositories/variacaoRepository';
import { ErroNegocio } from '../erros';
import { normalizarTexto } from '../../shared/rotulos';
import type { Etapa, EtapaInput, FiltroCadastro, ImpactoExclusao } from '../../shared/types';
import { idObrigatorio, textoObrigatorio, textoOpcional } from './validacao';

const NOME_MAX = 40;
const DESCRICAO_MAX = 300;

/** Junta a etapa com suas variações (respeitando o filtro de inativos). */
function comVariacoes(linha: repo.LinhaEtapa, incluirInativos: boolean): Etapa {
  const variacoes = variacaoRepo.listar(incluirInativos).filter((v) => v.etapaId === linha.id);
  return { ...linha, variacoes };
}

function obterOuFalhar(id: number): repo.LinhaEtapa {
  const etapa = repo.buscarPorId(id);
  if (!etapa) throw new ErroNegocio('Etapa não encontrada.');
  return etapa;
}

function garantirNomeLivre(nome: string, ignorarId?: number): void {
  const igual = repo.listar(true).find(
    (e) => e.id !== ignorarId && normalizarTexto(e.nome) === normalizarTexto(nome),
  );
  if (igual) {
    throw new ErroNegocio(
      `Já existe uma etapa chamada "${igual.nome}"${igual.ativo ? '' : ' (inativa — basta reativá-la)'}.`,
    );
  }
}

/** Lista na ordem do processo. Só as ativas (e suas variações ativas), a menos que se peça o contrário. */
export function listar(filtro?: FiltroCadastro): Etapa[] {
  const incluirInativos = filtro?.incluirInativos ?? false;
  const variacoes = variacaoRepo.listar(incluirInativos);
  return repo.listar(incluirInativos).map((linha) => ({
    ...linha,
    variacoes: variacoes.filter((v) => v.etapaId === linha.id),
  }));
}

export function criar(input: EtapaInput): Etapa {
  const nome = textoObrigatorio(input?.nome, 'Nome', NOME_MAX);
  const descricao = textoOpcional(input?.descricao, 'Descrição', DESCRICAO_MAX);
  garantirNomeLivre(nome);
  return comVariacoes(repo.inserir({ nome, descricao }), true);
}

export function atualizar(id: number, input: EtapaInput): Etapa {
  idObrigatorio(id, 'Etapa');
  obterOuFalhar(id);
  const nome = textoObrigatorio(input?.nome, 'Nome', NOME_MAX);
  const descricao = textoOpcional(input?.descricao, 'Descrição', DESCRICAO_MAX);
  garantirNomeLivre(nome, id);
  return comVariacoes(repo.atualizar(id, { nome, descricao })!, true);
}

export function definirAtivo(id: number, ativo: boolean): Etapa {
  idObrigatorio(id, 'Etapa');
  obterOuFalhar(id);
  return comVariacoes(repo.atualizar(id, { ativo: !!ativo })!, true);
}

/** O que será apagado junto com a etapa (para o aviso antes de excluir). */
export function impacto(id: number): ImpactoExclusao {
  idObrigatorio(id, 'Etapa');
  obterOuFalhar(id);
  return repo.impacto(id);
}

/** Exclui a etapa, suas variações e todos os cartões dela (com escalas e registros). */
export function remover(id: number): void {
  idObrigatorio(id, 'Etapa');
  obterOuFalhar(id);
  repo.remover(id);
}
