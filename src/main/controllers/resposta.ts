import { ErroNegocio } from '../erros';
import type { ApiResponse } from '../../shared/types';

export function executar<T>(acao: () => T): ApiResponse<T> {
  try {
    return { success: true, data: acao() };
  } catch (e) {
    if (!(e instanceof ErroNegocio)) console.error(e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
