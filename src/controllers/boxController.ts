import { ipcMain } from 'electron';
import { db } from '../models/db'; 
import { eq } from 'drizzle-orm';
import { box } from '../models/schema/box'; 

export const setupBoxControllers = () => {
  ipcMain.handle('create-box', async (event, boxData) => {
    try {
      // Fazemos o insert usando Drizzle ORM
      await db.insert(box).values({
        id: boxData.id,
        model: boxData.model,
        amount: Number(boxData.amount), // Garantindo que seja número
        weight: Number(boxData.weight), // Garantindo que seja número (real)
        operator: boxData.operator,
        step: 'estoque', 
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar no SQLite:', error);
      return { success: false, error: 'Erro ao salvar caixa no banco de dados.' };
    }
  });

  ipcMain.handle('get-box', async (event, id: string) => {
    try {
      // Busca a caixa onde o ID seja igual ao código de barras bipado
      const result = await db.select().from(box).where(eq(box.id, id)).limit(1);
      
      if (result.length > 0) {
        return { success: true, data: result[0] };
      }
      return { success: false, error: 'Caixa não encontrada' };
    } catch (error) {
      console.error('Erro ao buscar no SQLite:', error);
      return { success: false, error: 'Erro interno ao buscar caixa.' };
    }
  });
};