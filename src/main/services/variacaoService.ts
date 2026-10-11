import * as repo from '../repositories/variacaoRepository';
import * as etapaRepo from '../repositories/etapaRepository';
import { ErroNegocio } from '../erros';
import { normalizarTexto } from '../../shared/rotulos';
import type {
  EtapaVariacao,
  EtapaVariacaoAtualizarInput,
  EtapaVariacaoCriarInput,
  FiltroCadastro,
  ImpactoExclusao,
} from '../../shared/types';
import { idObrigatorio, textoObrigatorio } from './validacao';

const NOME_MAX = 40;

function obterOuFalhar(id: number): EtapaVariacao {
  const variacao = repo.buscarPorId(id);
  if (!variacao) throw new ErroNegocio('Variação não encontrada.');
  return variacao;
}

function garantirNomeLivre(etapaId: number, nome: string, ignorarId?: number): void {
  const igual = repo.listar(true).find(
    (v) => v.id !== ignorarId && v.etapaId === etapaId && normalizarTexto(v.nome) === normalizarTexto(nome),
  );
  if (igual) {
    throw new ErroNegocio(
      `Esta etapa já tem a variação "${igual.nome}"${igual.ativo ? '' : ' (inativa — basta reativá-la)'}.`,
    );
  }
}

export function listar(filtro?: FiltroCadastro): EtapaVariacao[] {
  return repo.listar(filtro?.incluirInativos ?? false);
}

export function criar(input: EtapaVariacaoCriarInput): EtapaVariacao {
  const etapaId = idObrigatorio(input?.etapaId, 'Etapa');
  if (!etapaRepo.buscarPorId(etapaId)) throw new ErroNegocio('Etapa não encontrada.');
  const nome = textoObrigatorio(input?.nome, 'Nome', NOME_MAX);
  garantirNomeLivre(etapaId, nome);
  return repo.inserir({ etapaId, nome });
}

export function atualizar(id: number, input: EtapaVariacaoAtualizarInput): EtapaVariacao {
  idObrigatorio(id, 'Variação');
  const atual = obterOuFalhar(id);
  const nome = textoObrigatorio(input?.nome, 'Nome', NOME_MAX);
  garantirNomeLivre(atual.etapaId, nome, id);
  return repo.atualizar(id, { nome })!;
}

export function definirAtivo(id: number, ativo: boolean): EtapaVariacao {
  idObrigatorio(id, 'Variação');
  obterOuFalhar(id);
  return repo.atualizar(id, { ativo: !!ativo })!;
}

/** O que será apagado junto com a variação (para o aviso antes de excluir). */
export function impacto(id: number): ImpactoExclusao {
  idObrigatorio(id, 'Variação');
  obterOuFalhar(id);
  return repo.impacto(id);
}

/** Exclui a variação e os cartões que a usam (com escalas e registros). */
export function remover(id: number): void {
  idObrigatorio(id, 'Variação');
  obterOuFalhar(id);
  repo.remover(id);
}
