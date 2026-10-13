import { ErroNegocio } from '../erros';

export function limparEspacos(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

export function textoObrigatorio(valor: unknown, campo: string, max: number): string {
  if (typeof valor !== 'string' || limparEspacos(valor) === '') {
    throw new ErroNegocio(`${campo} é obrigatório.`);
  }
  const texto = limparEspacos(valor);
  if (texto.length > max) throw new ErroNegocio(`${campo} deve ter no máximo ${max} caracteres.`);
  return texto;
}

export function textoOpcional(valor: unknown, campo: string, max: number): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') throw new ErroNegocio(`${campo} inválido.`);
  const texto = valor.trim();
  if (texto === '') return null;
  if (texto.length > max) throw new ErroNegocio(`${campo} deve ter no máximo ${max} caracteres.`);
  return texto;
}

export function idObrigatorio(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
    throw new ErroNegocio(`${campo} inválido.`);
  }
  return valor;
}

export function idOpcional(valor: unknown, campo: string): number | null {
  if (valor === undefined || valor === null) return null;
  return idObrigatorio(valor, campo);
}

export function inteiroNaoNegativo(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    throw new ErroNegocio(`${campo} deve ser um número inteiro maior ou igual a zero.`);
  }
  return valor;
}

export function dataIso(valor: unknown, campo = 'Data'): string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroNegocio(`${campo} inválida (use AAAA-MM-DD).`);
  }
  return valor;
}

export function porTexto<T>(extrair: (item: T) => string) {
  return (a: T, b: T) => extrair(a).localeCompare(extrair(b), 'pt-BR', { sensitivity: 'base' });
}
