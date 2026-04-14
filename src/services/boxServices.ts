import { db } from '../models/db';
import { box } from '../models/schema/box';
import { eq } from 'drizzle-orm';

export type NewBoxInput = {
  id: string;
  weight: number;
  amount: number;
  step: string;
  model: string | null;
  operator: string | null;
  description: string | null;
  volume: string | null; // Adicionado campo volume
  location?: string;     // Agora aceita as bancadas e armários
};

// REGRA 1 ATUALIZADA: Agora aceita RAW (Insumo) e BDJ (Bandeja)
const ID_REGEX = /^(RAW|BDJ|NB2|4GS|LOR|NBL)\d{4,}$/;

// REGRA 2: Dicionário de Etapas Permitidas
const PRODUCT_RULES: Record<string, string[]> = {
  'RAW': ['Recebimento'], 
  'BDJ': ['Montagem', 'Solda', 'Revisao', 'Firmware', 'Imei', 'Serial'],
  '4GS': ['Montagem', 'Solda', 'Revisao', 'Firmware', 'Imei'],
  'NB2': ['Montagem', 'Solda', 'Revisao', 'Firmware', 'Serial'],
  'LOR': ['Montagem', 'Solda', 'Revisao', 'Firmware', 'Serial'], 
  'NBL': ['Montagem', 'Solda', 'Revisao', 'Firmware', 'Serial'], 
};

// ==========================================
// 2. SERVICES
// ==========================================

// src/services/boxService.ts

export async function createBox(data: NewBoxInput) {
  const cleanId = data.id.trim().toUpperCase();

  // 1. Validação simples de ID (Aceita os prefixos + números)
  if (!ID_REGEX.test(cleanId)) {
    throw new Error("ID inválido. Use prefixos RAW, BDJ, NB2, 4GS, LOR ou NBL.");
  }

  const prefix = cleanId.substring(0, 3);
  
  // 2. Lógica de Origem (Apenas para organização interna)
  let autoOrigin: 'RAW' | 'TRAY' | 'PRODUCTION' = 'PRODUCTION';
  if (prefix === 'RAW') autoOrigin = 'RAW';
  if (prefix === 'BDJ') autoOrigin = 'TRAY';

  // 3. Lógica da Etapa (O que você pediu):
  // Se for RAW, força "Recebimento". Se não for, usa o que o operador escolheu na tela.
  const finalStep = prefix === 'RAW' ? 'Recebimento' : data.step;

  try {
    // 4. Inserção no banco
    // Usamos o 'as any' no objeto inteiro para o TypeScript parar de reclamar das opções de localização
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