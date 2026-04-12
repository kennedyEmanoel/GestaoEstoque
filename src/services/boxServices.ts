import { db } from '../models/db';
import { box } from '../models/schema/box';
import { eq } from 'drizzle-orm';

// ==========================================
// 1. TYPES E PADRÕES
// ==========================================
export type NewBoxInput = {
  id: string;
  weight: number;
  amount: number;
  step: string;
  model: string | null;
  operator: string | null;
  description: string | null;
  location?: 'Estoque' | 'Produção';
};

// REGRA 1: O ID DEVE ser NB2, 4GS, LOR ou NBL seguido de EXATAMENTE 4 números.
// Ex: NB20001 (Válido), NB2-0001 (Inválido), 4GS001 (Inválido, falta 1 número)
const ID_REGEX = /^(NB2|4GS|LOR|NBL)\d{4}$/;

// REGRA 2: Dicionário de Etapas Permitidas por Produto
// O prefixo do ID (os 3 primeiros caracteres) define quais etapas aquele produto aceita.
const PRODUCT_RULES: Record<string, string[]> = {
  '4GS': ['Montagem', 'Solda', 'Revisão', 'Firmware', 'Imei'],
  'NB2': ['Montagem', 'Solda', 'Revisão', 'Firmware', 'Serial'],
  'LOR': ['Montagem', 'Solda', 'Revisão', 'Firmware', 'Serial'], 
  'NBL': ['Montagem', 'Solda', 'Revisão', 'Firmware', 'Serial'], 
};

// ==========================================
// 2. SERVICES
// ==========================================

export async function createBox(data: NewBoxInput) {
  
  // Limpa o ID (tira espaços e joga pra maiúsculo para evitar erro de digitação do operador)
  const cleanId = data.id.trim().toUpperCase();

  // --- Validação do ID ---
  if (!ID_REGEX.test(cleanId)) {
    throw new Error("ID inválido. Deve começar com NB2, 4GS, LOR ou NBL seguido de 4 números (Ex: NB20001).");
  }

  // --- Descoberta do Produto ---
  // Extrai as 3 primeiras letras para saber qual é o produto (Ex: '4GS0001' -> '4GS')
  const prefix = cleanId.substring(0, 3);
  
  // Pega a lista de etapas permitidas para esse produto específico
  const allowedSteps = PRODUCT_RULES[prefix];

  // --- Validação da Etapa ---
  // Formata a etapa para evitar erros como "montagem " ou " Montagem"
  const cleanStep = data.step.trim();
  
  if (!allowedSteps.includes(cleanStep)) {
    throw new Error(`Etapa '${cleanStep}' inválida para o produto ${prefix}. Etapas permitidas: ${allowedSteps.join(', ')}.`);
  }

  // --- Validação de Quantidade e Peso ---
  if (data.weight <= 0 || data.amount <= 0) {
    throw new Error("Peso e quantidade devem ser valores positivos.");
  }

  // --- Execução ---
  try {
    const result = await db.insert(box).values({
      id: cleanId, 
      weight: data.weight,
      amount: data.amount,
      model: data.model,
      operator: data.operator,
      description: data.description,
      step: cleanStep, 
      location: data.location ?? 'Estoque', 
    }).returning();

    return result[0];
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`A caixa ${cleanId} já está cadastrada no sistema.`);
    }
    throw new Error(`Erro interno: ${error.message}`);
  }
}