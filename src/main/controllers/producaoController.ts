import {
  getOrCreateFicha,
  getFichaCompleta,
  getFichaPorId,
  impactoDoCartao,
  removerCartao,
  listarCartoesDoDia,
  listarDiasComRegistro,
  addOperador,
  removeOperador,
  upsertRegistro,
  updateMetaHoraPadrao,
} from '../services/producaoService';
import { getDashboardPorEtapas } from '../services/producaoDashboardService';
import { registrar } from './ipc';

export const setupProducaoControllers = () => {
  registrar('producao:get-or-create-ficha', getOrCreateFicha);
  registrar('producao:get-ficha',           getFichaCompleta);
  registrar('producao:get-ficha-por-id',    getFichaPorId);
  registrar('producao:impacto-cartao',      impactoDoCartao);
  registrar('producao:remover-cartao',      removerCartao);
  registrar('producao:cartoes-do-dia',      listarCartoesDoDia);
  registrar('producao:dias-com-registro',   listarDiasComRegistro);
  registrar('producao:add-operador',        addOperador);
  registrar('producao:remove-operador',     removeOperador);
  registrar('producao:upsert-registro',     upsertRegistro);
  registrar('producao:update-meta-padrao',  updateMetaHoraPadrao);
  registrar('producao:get-dashboard-etapas', getDashboardPorEtapas);
};
