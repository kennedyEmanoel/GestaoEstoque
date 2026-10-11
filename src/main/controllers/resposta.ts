import { ErroNegocio } from '../erros';
import type { ApiResponse } from '../../shared/types';

/**
 * Executa uma ação e converte o resultado (ou o erro) no formato ApiResponse usado
 * por toda a aplicação (IPC e HTTP). Erros de negócio têm mensagem pronta para o usuário;
 * os demais são registrados no log e devolvidos com a mensagem original.
 */
export function executar<T>(acao: () => T): ApiResponse<T> {
  try {
    return { success: true, data: acao() };
  } catch (e) {
    if (!(e instanceof ErroNegocio)) console.error(e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
