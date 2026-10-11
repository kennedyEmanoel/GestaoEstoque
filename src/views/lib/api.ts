import type { ApiResponse } from '../../shared/types';

/** Desembrulha um ApiResponse do processo principal: devolve os dados ou lança Error com a mensagem do servidor. */
export async function chamar<T>(promessa: Promise<ApiResponse<T>>): Promise<T> {
  const resposta = await promessa;
  if (!resposta.success) throw new Error(resposta.error ?? 'Erro inesperado.');
  return resposta.data as T;
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
