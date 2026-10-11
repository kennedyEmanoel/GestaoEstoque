export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Cadastros ────────────────────────────────────────────────────────────────

export interface FiltroCadastro {
  /** Por padrão a listagem traz só os ativos (é o que alimenta os seletores). */
  incluirInativos?: boolean;
}

export interface Operador {
  id: number;
  nome: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface OperadorInput {
  nome: string;
}

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  /** Vazio quando o produto não tem versão. */
  versao: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface ProdutoInput {
  nome: string;
  descricao?: string | null;
  versao?: string;
}

export interface EtapaVariacao {
  id: number;
  etapaId: number;
  nome: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface EtapaVariacaoCriarInput {
  etapaId: number;
  nome: string;
}

export interface EtapaVariacaoAtualizarInput {
  nome: string;
}

export interface Etapa {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
  /** Variações da etapa (só as ativas, a menos que a listagem peça os inativos). */
  variacoes: EtapaVariacao[];
}

export interface EtapaInput {
  nome: string;
  descricao?: string | null;
}

/** O que também será apagado junto quando um item (ou cartão) é excluído. */
export interface ImpactoExclusao {
  cartoes: number;
  operadores: number;
  registros: number;
  variacoes: number;
}

/** As operações que todo cadastro expõe. */
export interface CrudApi<T, TCriar, TAtualizar = TCriar> {
  /** Quanto será apagado junto, para o aviso antes de excluir. */
  impacto:      (id: number) => Promise<ApiResponse<ImpactoExclusao>>;
  listar:       (filtro?: FiltroCadastro) => Promise<ApiResponse<T[]>>;
  criar:        (input: TCriar) => Promise<ApiResponse<T>>;
  atualizar:    (id: number, input: TAtualizar) => Promise<ApiResponse<T>>;
  definirAtivo: (id: number, ativo: boolean) => Promise<ApiResponse<T>>;
  remover:      (id: number) => Promise<ApiResponse>;
}

// ─── Módulo: Controle de Produção Hora a Hora ────────────────────────────────

export interface FichaDiaria {
  id: number;
  data: string;
  produtoId: number;
  produto: string;
  produtoVersao: string;
  etapaId: number;
  etapa: string;
  variacaoId: number | null;
  variacao: string | null;
  metaHoraPadrao: number;
  criadoEm: number;
}

export interface OperadorDiario {
  id: number;
  fichaId: number;
  operadorId: number;
  operadorNome: string;
  ordem: number;
}

export interface RegistroHorario {
  id: number;
  operadorDiarioId: number;
  horarioBloco: string;
  meta: number;
  realizado: number;
}

export interface FichaDiariaCompleta extends FichaDiaria {
  operadores: Array<OperadorDiario & {
    registros: RegistroHorario[];
  }>;
}

export interface CreateFichaDiariaInput {
  data: string;
  produtoId: number;
  etapaId: number;
  variacaoId?: number | null;
  metaHoraPadrao: number;
}

export interface GetFichaInput {
  data: string;
  produtoId: number;
  etapaId: number;
  variacaoId?: number | null;
}

export interface AddOperadorInput {
  fichaId: number;
  operadorId: number;
}

export interface RemoveOperadorInput {
  operadorDiarioId: number;
}

export interface UpsertRegistroInput {
  operadorDiarioId: number;
  horarioBloco: string;
  meta: number;
  realizado: number;
}

/** Cartão existente em um dia (para a lista de abertura rápida). */
export interface CartaoDoDia {
  fichaId: number;
  etapa: string;
  variacao: string | null;
  rotulo: string;
  produto: string;
  operadores: number;
  totalRealizado: number;
  totalMeta: number;
  pctAtingimento: number | null;
}

/** Dia que já tem cartões, com o total produzido. */
export interface DiaComRegistro {
  data: string;
  cartoes: number;
  totalRealizado: number;
  totalMeta: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DadosPorHora {
  horarioBloco: string;
  realizado: number;
  meta: number;
}

export interface DadosPorOperador {
  operadorNome: string;
  totalRealizado: number;
  totalMeta: number;
}

/** Resumo de uma ficha (cartão) do dia: uma etapa/variação de um produto. */
export interface EtapaResumo {
  fichaId: number;
  etapa: string;
  variacao: string | null;
  /** Texto de exibição: "Soldagem" ou "Soldagem · Retrabalho". */
  rotulo: string;
  produto: string;
  totalRealizado: number;
  totalMeta: number;
  saldo: number;
  pctAtingimento: number | null;
  porOperador: DadosPorOperador[];
  porHora: DadosPorHora[];
}

export interface DashboardPorEtapasData {
  data: string;
  produto: string;
  totalGeral: { realizado: number; meta: number };
  etapas: EtapaResumo[];
}

// ─── Comandos do Controle de Produção → Dashboard ─────────────────────────────

export type DashboardCommand =
  | { type: 'refresh';      data: string; produtoId: number | null; faixa: string }
  | { type: 'alert';        mensagem: string }
  | { type: 'alert-image';  mensagem: string; imagemBase64: string; mimeType?: string };

declare global {
  interface Window {
    api: {
      getOrCreateFicha:     (data: CreateFichaDiariaInput) => Promise<ApiResponse<FichaDiariaCompleta>>;
      getFichaCompleta:     (input: GetFichaInput) => Promise<ApiResponse<FichaDiariaCompleta | null>>;
      getFichaPorId:        (id: number) => Promise<ApiResponse<FichaDiariaCompleta>>;
      impactoDoCartao:      (id: number) => Promise<ApiResponse<ImpactoExclusao>>;
      removerCartao:        (id: number) => Promise<ApiResponse>;
      listarCartoesDoDia:   (data: string) => Promise<ApiResponse<CartaoDoDia[]>>;
      listarDiasComRegistro: (limite?: number) => Promise<ApiResponse<DiaComRegistro[]>>;
      addOperador:          (data: AddOperadorInput) => Promise<ApiResponse<OperadorDiario>>;
      removeOperador:       (data: RemoveOperadorInput) => Promise<ApiResponse>;
      upsertRegistro:       (data: UpsertRegistroInput) => Promise<ApiResponse<RegistroHorario>>;
      updateMetaHoraPadrao: (fichaId: number, meta: number) => Promise<ApiResponse>;
      getDashboardPorEtapas: (data: string, produtoId?: number | null, horarioBloco?: string) => Promise<ApiResponse<DashboardPorEtapasData>>;

      operadores: CrudApi<Operador, OperadorInput>;
      produtos:   CrudApi<Produto, ProdutoInput>;
      etapas:     CrudApi<Etapa, EtapaInput>;
      variacoes:  CrudApi<EtapaVariacao, EtapaVariacaoCriarInput, EtapaVariacaoAtualizarInput>;

      openProductionWindow:       () => void;
      closeProductionWindow:      () => void;
      openProductionWindowGeral:  () => void;
      closeProductionWindowGeral: () => void;
      sendDashboardCommand:       (payload: DashboardCommand) => void;
      sendDashboardGeralCommand:  (payload: DashboardCommand) => void;
      onDashboardCommand:         (cb: (payload: DashboardCommand) => void) => void;
      offDashboardCommand:        () => void;
      onDashboardGeralCommand:    (cb: (payload: DashboardCommand) => void) => void;
      offDashboardGeralCommand:   () => void;
      getServerUrl:               () => Promise<string | null>;
      openServerUrl:              () => void;
    };
  }
}
