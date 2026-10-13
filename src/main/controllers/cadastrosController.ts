import * as operadores from '../services/operadorService';
import * as produtos from '../services/produtoService';
import * as etapas from '../services/etapaService';
import * as variacoes from '../services/variacaoService';
import { registrarCrud } from './ipc';

export const setupCadastrosControllers = () => {
  registrarCrud('operadores', operadores);
  registrarCrud('produtos',   produtos);
  registrarCrud('etapas',     etapas);
  registrarCrud('variacoes',  variacoes);
};
