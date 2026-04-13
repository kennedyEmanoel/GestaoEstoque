import { ipcMain } from 'electron';
// Importamos APENAS as funções do Service. O Controller não sabe que o banco existe.
import { createBox, getBoxById, NewBoxInput } from '../services/boxServices'; 

export const setupBoxControllers = () => {

  // 1. ROTA DE CRIAÇÃO
  ipcMain.handle('create-box', async (event, boxData: NewBoxInput) => {
    try {
      // O Controller entrega o pacote para o Service e aguarda o resultado
      const novaCaixa = await createBox(boxData);
      
      // Devolve para a tela exatamente o que ela precisa ouvir
      return { success: true, data: novaCaixa };
       
    } catch (error: any) {
      // Se o Service gritar (ex: "ID Inválido", "Etapa errada para 4GS")
      // O Controller pega essa mensagem e manda para a tela mostrar em vermelho
      return { success: false, error: error.message };
    }
  });

  // 2. ROTA DE BUSCA (Leitor de Código de Barras)
  ipcMain.handle('get-box', async (event, id: string) => {
    try {
      // O Controller também não faz buscas no banco. Ele pede para o Service.
      const caixaEncontrada = await getBoxById(id);
      return { success: true, data: caixaEncontrada };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

};