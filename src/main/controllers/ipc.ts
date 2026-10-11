import { ipcMain } from 'electron';
import type { FiltroCadastro, ImpactoExclusao } from '../../shared/types';
import { executar } from './resposta';

/** Registra um canal IPC que responde sempre com ApiResponse. */
export function registrar<A extends unknown[], R>(canal: string, acao: (...args: A) => R): void {
  ipcMain.handle(canal, (_evento, ...args) => executar(() => acao(...(args as A))));
}

interface ServicoCrud<T, TCriar, TAtualizar> {
  listar(filtro?: FiltroCadastro): T[];
  criar(input: TCriar): T;
  atualizar(id: number, input: TAtualizar): T;
  definirAtivo(id: number, ativo: boolean): T;
  remover(id: number): void;
  impacto(id: number): ImpactoExclusao;
}

/** Registra os canais padrão de um cadastro: listar, criar, atualizar, definir-ativo, remover e impacto. */
export function registrarCrud<T, TCriar, TAtualizar>(
  prefixo: string,
  servico: ServicoCrud<T, TCriar, TAtualizar>,
): void {
  registrar(`${prefixo}:listar`,        (filtro?: FiltroCadastro) => servico.listar(filtro));
  registrar(`${prefixo}:criar`,         (input: TCriar) => servico.criar(input));
  registrar(`${prefixo}:atualizar`,     (id: number, input: TAtualizar) => servico.atualizar(id, input));
  registrar(`${prefixo}:definir-ativo`, (id: number, ativo: boolean) => servico.definirAtivo(id, ativo));
  registrar(`${prefixo}:remover`,       (id: number) => servico.remover(id));
  registrar(`${prefixo}:impacto`,        (id: number) => servico.impacto(id));
}
