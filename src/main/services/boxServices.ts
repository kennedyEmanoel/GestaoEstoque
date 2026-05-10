import { db } from '../models/db';
import { box } from '../models/schema/box';
import { eq } from 'drizzle-orm';
import { NewBoxInput } from '../../shared/types';

const ID_REGEX = /^(RAW|BDJ|NB2|4GS|LOR|NBL)\d{4,}$/;

export async function createBox(data: NewBoxInput) {
  const cleanId = data.id.trim().toUpperCase();

  if (!ID_REGEX.test(cleanId)) {
    throw new Error("ID inválido. Use prefixos RAW, BDJ, NB2, 4GS, LOR ou NBL.");
  }

  const prefix = cleanId.substring(0, 3);

  let autoOrigin: 'RAW' | 'TRAY' | 'PRODUCTION' = 'PRODUCTION';
  if (prefix === 'RAW') autoOrigin = 'RAW';
  if (prefix === 'BDJ') autoOrigin = 'TRAY';

  const finalStep = prefix === 'RAW' ? 'Recebimento' : data.step;

  try {
    const result = await db.insert(box).values({
      id: cleanId,
      weight: data.weight,
      amount: data.amount,
      model: data.model,
      operator: data.operator,
      description: data.description,
      volume: data.volume,
      origin: autoOrigin as any,
      step: finalStep as any,
      location: (data.location || 'Estoque') as any,
    } as any).returning();

    return result[0];
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`O código ${cleanId} já existe.`);
    }
    throw new Error(`Erro: ${error.message}`);
  }
}

export async function getBoxById(id: string) {
  const cleanId = id.trim().toUpperCase();
  const result = await db.select().from(box).where(eq(box.id, cleanId)).limit(1);

  if (result.length === 0) {
    throw new Error(`Código '${cleanId}' não encontrado.`);
  }
  return result[0];
}
