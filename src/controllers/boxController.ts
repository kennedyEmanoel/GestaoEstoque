import { ipcMain } from 'electron';
import { createBox, getBoxById, NewBoxInput } from '../services/boxServices'; 

export const setupBoxControllers = () => {

  ipcMain.handle('create-box', async (event, boxData: NewBoxInput) => {
    try {

      const newBox = await createBox(boxData);
      
      return { success: true, data: newBox };
       
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-box', async (event, id: string) => {
    try {
      const boxFound = await getBoxById(id);
      return { success: true, data: boxFound };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

};