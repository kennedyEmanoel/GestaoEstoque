import * as repo from '../repositories/operadorRepository';
import { ErroNegocio } from '../erros';
import { normalizarTexto } from '../../shared/rotulos';
import type { FiltroCadastro, ImpactoExclusao, Operador, OperadorInput } from '../../shared/types';
import { idObrigatorio, porTexto, textoObrigatorio } from './validacao';

const NOME_MAX = 60;

function obterOuFalhar(id: number): Operador {
  const operador = repo.buscarPorId(id);
  if (!operador) throw new ErroNegocio('Operador não encontrado.');
  return operador;
}

function garantirNomeLivre(nome: string, ignorarId?: number): void {
  const igual = repo.listar(true).find(
    (o) => o.id !== ignorarId && normalizarTexto(o.nome) === normalizarTexto(nome),
  );
  if (igual) {
    throw new ErroNegocio(
      `Já existe um operador chamado "${igual.nome}"${igual.ativo ? '' : ' (inativo — basta reativá-lo)'}.`,
    );
  }
}

/** Convenção do sistema: nomes de operador em maiúsculas, como sempre apareceram nos cartões. */
function nomeValido(valor: unknown): string {
  return textoObrigatorio(valor, 'Nome', NOME_MAX).toUpperCase();
}

export function listar(filtro?: FiltroCadastro): Operador[] {
  return repo.listar(filtro?.incluirInativos ?? false).sort(porTexto((o) => o.nome));
}

export function criar(input: OperadorInput): Operador {
  const nome = nomeValido(input?.nome);
  garantirNomeLivre(nome);
  return repo.inserir({ nome });
}

export function atualizar(id: number, input: OperadorInput): Operador {
  idObrigatorio(id, 'Operador');
  obterOuFalhar(id);
  const nome = nomeValido(input?.nome);
  garantirNomeLivre(nome, id);
  return repo.atualizar(id, { nome })!;
}

export function definirAtivo(id: number, ativo: boolean): Operador {
  idObrigatorio(id, 'Operador');
  obterOuFalhar(id);
  return repo.atualizar(id, { ativo: !!ativo })!;
}

/** O que será apagado junto com o operador (para o aviso antes de excluir). */
export function impacto(id: number): ImpactoExclusao {
  idObrigatorio(id, 'Operador');
  obterOuFalhar(id);
  return repo.impacto(id);
}

/** Exclui o operador e as escalas/registros dele. Os cartões continuam existindo. */
export function remover(id: number): void {
  idObrigatorio(id, 'Operador');
  obterOuFalhar(id);
  repo.remover(id);
}
