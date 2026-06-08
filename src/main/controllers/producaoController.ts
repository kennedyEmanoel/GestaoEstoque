import { ipcMain } from 'electron';
import {
  getOrCreateFicha,
  getFichaCompleta,
  addOperador,
  removeOperador,
  upsertRegistro,
  updateMetaHoraPadrao,
} from '../services/producaoService';
import { getDashboardProducao, getDashboardPorEtapas } from '../services/producaoDashboardService';
import type {
  CreateFichaDiariaInput,
  AddOperadorInput,
  RemoveOperadorInput,
  UpsertRegistroInput,
  GetFichaInput,
  DashboardProducaoFiltros,
} from '../../shared/types';

export const setupProducaoControllers = () => {

  ipcMain.handle('producao:get-or-create-ficha', async (_event, data: CreateFichaDiariaInput) => {
    try { return { success: true, data: getOrCreateFicha(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:get-ficha', async (_event, input: GetFichaInput) => {
    try { return { success: true, data: getFichaCompleta(input) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:add-operador', async (_event, data: AddOperadorInput) => {
    try { return { success: true, data: addOperador(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:remove-operador', async (_event, data: RemoveOperadorInput) => {
    try { removeOperador(data); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:upsert-registro', async (_event, data: UpsertRegistroInput) => {
    try { return { success: true, data: upsertRegistro(data) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:update-meta-padrao', async (_event, fichaId: number, meta: number) => {
    try { updateMetaHoraPadrao(fichaId, meta); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:get-dashboard', async (_event, filtros: DashboardProducaoFiltros) => {
    try { return { success: true, data: getDashboardProducao(filtros) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('producao:get-dashboard-etapas', async (_event, data: string, produto?: string, horarioBloco?: string) => {
    try { return { success: true, data: getDashboardPorEtapas(data, produto, horarioBloco) }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

};
