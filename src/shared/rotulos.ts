export function rotuloProduto(nome: string, versao?: string | null): string {
  const v = (versao ?? '').trim();
  return v ? `${nome} ${v}` : nome;
}

export function rotuloEtapa(etapa: string, variacao?: string | null): string {
  return variacao ? `${etapa} · ${variacao}` : etapa;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
