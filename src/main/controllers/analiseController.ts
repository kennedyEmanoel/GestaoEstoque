import { analisarDesempenho, listarOpcoesAnalise } from '../services/analiseService';
import { registrar } from './ipc';

export const setupAnaliseControllers = () => {
  registrar('analise:opcoes', listarOpcoesAnalise);
  registrar('analise:desempenho', analisarDesempenho);
};
