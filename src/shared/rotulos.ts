/** Funções puras de apresentação compartilhadas entre o processo principal e a interface. */

/** "4G SIMCOM" ou "4G SIMCOM v2" quando o produto tem versão. */
export function rotuloProduto(nome: string, versao?: string | null): string {
  const v = (versao ?? '').trim();
  return v ? `${nome} ${v}` : nome;
}

/** "Soldagem" ou "Soldagem · Retrabalho" quando há variação. */
export function rotuloEtapa(etapa: string, variacao?: string | null): string {
  return variacao ? `${etapa} · ${variacao}` : etapa;
}

/** Texto comparável: sem acentos, sem maiúsculas e com espaços normalizados. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
