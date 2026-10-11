import * as repo from '../repositories/produtoRepository';
import { ErroNegocio } from '../erros';
import { normalizarTexto, rotuloProduto } from '../../shared/rotulos';
import type { FiltroCadastro, ImpactoExclusao, Produto, ProdutoInput } from '../../shared/types';
import { idObrigatorio, porTexto, textoObrigatorio, textoOpcional } from './validacao';

const NOME_MAX = 80;
const DESCRICAO_MAX = 300;
const VERSAO_MAX = 20;

interface DadosProduto {
  nome: string;
  descricao: string | null;
  versao: string;
}

function obterOuFalhar(id: number): Produto {
  const produto = repo.buscarPorId(id);
  if (!produto) throw new ErroNegocio('Produto não encontrado.');
  return produto;
}

function dadosValidos(input: ProdutoInput): DadosProduto {
  return {
    nome: textoObrigatorio(input?.nome, 'Nome', NOME_MAX),
    descricao: textoOpcional(input?.descricao, 'Descrição', DESCRICAO_MAX),
    versao: textoOpcional(input?.versao, 'Versão', VERSAO_MAX) ?? '',
  };
}

function garantirLivre(nome: string, versao: string, ignorarId?: number): void {
  const igual = repo.listar(true).find(
    (p) => p.id !== ignorarId
      && normalizarTexto(p.nome) === normalizarTexto(nome)
      && normalizarTexto(p.versao) === normalizarTexto(versao),
  );
  if (igual) {
    throw new ErroNegocio(
      `Já existe o produto "${rotuloProduto(igual.nome, igual.versao)}"${igual.ativo ? '' : ' (inativo — basta reativá-lo)'}.`,
    );
  }
}

export function listar(filtro?: FiltroCadastro): Produto[] {
  return repo.listar(filtro?.incluirInativos ?? false)
    .sort(porTexto((p) => rotuloProduto(p.nome, p.versao)));
}

export function criar(input: ProdutoInput): Produto {
  const dados = dadosValidos(input);
  garantirLivre(dados.nome, dados.versao);
  return repo.inserir(dados);
}

export function atualizar(id: number, input: ProdutoInput): Produto {
  idObrigatorio(id, 'Produto');
  obterOuFalhar(id);
  const dados = dadosValidos(input);
  garantirLivre(dados.nome, dados.versao, id);
  return repo.atualizar(id, dados)!;
}

export function definirAtivo(id: number, ativo: boolean): Produto {
  idObrigatorio(id, 'Produto');
  obterOuFalhar(id);
  return repo.atualizar(id, { ativo: !!ativo })!;
}

/** O que será apagado junto com o produto (para o aviso antes de excluir). */
export function impacto(id: number): ImpactoExclusao {
  idObrigatorio(id, 'Produto');
  obterOuFalhar(id);
  return repo.impacto(id);
}

/** Exclui o produto e todos os cartões dele (com escalas e registros). */
export function remover(id: number): void {
  idObrigatorio(id, 'Produto');
  obterOuFalhar(id);
  repo.remover(id);
}
