import { ipcMain } from 'electron';
import { createBox, getBoxById } from '../services/boxServices';
import { NewBoxInput } from '../../shared/types';

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', async (_event, boxData: NewBoxInput) => {
    try {
      const newBox = await createBox(boxData);
      return { success: true, data: newBox };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box', async (_event, id: string) => {
    try {
      const boxFound = await getBoxById(id);
      return { success: true, data: boxFound };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

};
