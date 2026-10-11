import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { CrudApi, ImpactoExclusao } from '../../../shared/types';
import { normalizarTexto } from '../../../shared/rotulos';
import { chamar, mensagemDeErro } from '../../lib/api';
import { linhasDoImpacto } from '../../lib/impacto';
import Modal from '../../components/ui/Modal';
import {
  btnLinha, btnLinhaPerigo, btnPerigo, btnPrimario, btnSecundario, inputBase,
} from '../../components/ui/estilos';

export interface Coluna<T> {
  titulo: string;
  className?: string;
  render: (item: T) => ReactNode;
}

export interface Campo<TForm> {
  chave: keyof TForm & string;
  rotulo: string;
  tipo?: 'texto' | 'area';
  obrigatorio?: boolean;
  maxLength?: number;
  dica?: string;
}

interface CadastroCrudProps<T extends { id: number; ativo: boolean }, TForm extends Record<string, string>, TInput> {
  nome: { singular: string; plural: string; feminino?: boolean };
  api: CrudApi<T, TInput, TInput>;
  colunas: Coluna<T>[];
  campos: Campo<TForm>[];
  /** Valores iniciais do formulário (item = null quando é um cadastro novo). */
  formDoItem: (item: T | null) => TForm;
  paraEnvio: (form: TForm) => TInput;
  rotuloItem: (item: T) => string;
  /** Texto usado pela caixa de busca. */
  textoBusca: (item: T) => string;
  /** Conteúdo exibido abaixo da linha quando ela é expandida (ex.: variações de uma etapa). */
  expandido?: (item: T, recarregar: () => void) => ReactNode;
}

type Edicao<T> = { tipo: 'novo' } | { tipo: 'editar'; item: T };

/**
 * Tela padrão de um cadastro: listagem com busca e filtro de inativos, formulário em janela
 * (criar/editar), ativar/desativar e exclusão com confirmação. Cada cadastro só descreve
 * suas colunas e campos.
 */
export default function CadastroCrud<
  T extends { id: number; ativo: boolean },
  TForm extends Record<string, string>,
  TInput,
>({ nome, api, colunas, campos, formDoItem, paraEnvio, rotuloItem, textoBusca, expandido }: CadastroCrudProps<T, TForm, TInput>) {
  const [itens, setItens] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const [edicao, setEdicao] = useState<Edicao<T> | null>(null);
  const [form, setForm] = useState<TForm | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<{ item: T; impacto: ImpactoExclusao } | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const novo = nome.feminino ? 'Nova' : 'Novo';

  // A API vem de fora; guardá-la em uma ref mantém `recarregar` estável e evita refazer a consulta a cada render.
  const apiRef = useRef(api);
  apiRef.current = api;

  const recarregar = useCallback(async () => {
    try {
      setItens(await chamar(apiRef.current.listar({ incluirInativos: true })));
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const visiveis = useMemo(() => {
    const termo = normalizarTexto(busca);
    return itens.filter((item) =>
      (mostrarInativos || item.ativo) && (termo === '' || normalizarTexto(textoBusca(item)).includes(termo)));
  }, [itens, busca, mostrarInativos, textoBusca]);

  const totalInativos = itens.filter((i) => !i.ativo).length;

  const abrir = (e: Edicao<T>) => {
    setForm(formDoItem(e.tipo === 'editar' ? e.item : null));
    setErroForm(null);
    setEdicao(e);
  };

  const fecharFormulario = useCallback(() => setEdicao(null), []);

  const salvar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!edicao || !form) return;
    const faltando = campos.find((c) => c.obrigatorio && form[c.chave].trim() === '');
    if (faltando) { setErroForm(`${faltando.rotulo} é obrigatório.`); return; }

    setSalvando(true);
    setErroForm(null);
    try {
      const dados = paraEnvio(form);
      if (edicao.tipo === 'novo') await chamar(api.criar(dados));
      else await chamar(api.atualizar(edicao.item.id, dados));
      setEdicao(null);
      await recarregar();
    } catch (e) {
      setErroForm(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (item: T) => {
    try {
      await chamar(api.definirAtivo(item.id, !item.ativo));
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  /** Mede o que seria apagado junto e abre o aviso de confirmação. */
  const pedirExclusao = async (item: T) => {
    try {
      const impacto = await chamar(apiRef.current.impacto(item.id));
      setErroForm(null);
      setParaExcluir({ item, impacto });
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await chamar(api.remover(paraExcluir.item.id));
      setParaExcluir(null);
      await recarregar();
    } catch (e) {
      // ex.: "já foi usado... desative em vez de excluir" — mostra no próprio diálogo
      setErroForm(mensagemDeErro(e));
    } finally {
      setExcluindo(false);
    }
  };

  const alternarExpansao = (id: number) =>
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
      return proximo;
    });

  const totalColunas = colunas.length + 2 + (expandido ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar ${nome.singular}...`}
          className={`${inputBase} max-w-xs`}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600 select-none">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Mostrar inativos{totalInativos > 0 ? ` (${totalInativos})` : ''}
        </label>
        <button type="button" className={`${btnPrimario} ml-auto`} onClick={() => abrir({ tipo: 'novo' })}>
          + {novo} {nome.singular}
        </button>
      </div>

      {erro && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <span>{erro}</span>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso" className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {expandido && <th className="w-10 px-2 py-2.5" />}
              <th className="w-16 px-4 py-2.5">ID</th>
              {colunas.map((c) => (
                <th key={c.titulo} className={`px-4 py-2.5 ${c.className ?? ''}`}>{c.titulo}</th>
              ))}
              <th className="px-4 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={totalColunas} className="px-4 py-8 text-center text-zinc-400">Carregando...</td></tr>
            )}
            {!carregando && visiveis.length === 0 && (
              <tr>
                <td colSpan={totalColunas} className="px-4 py-8 text-center text-zinc-400">
                  {itens.length === 0
                    ? `Nenhum ${nome.singular} cadastrado${nome.feminino ? 'a' : ''} ainda.`
                    : `Nenhum ${nome.singular} encontrado${nome.feminino ? 'a' : ''}.`}
                </td>
              </tr>
            )}
            {visiveis.map((item) => {
              const aberto = expandidos.has(item.id);
              return (
                <Fragment key={item.id}>
                  <tr className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 ${item.ativo ? '' : 'text-zinc-400'}`}>
                    {expandido && (
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => alternarExpansao(item.id)}
                          aria-label={aberto ? 'Recolher' : 'Expandir'}
                          aria-expanded={aberto}
                          className="h-6 w-6 rounded-md text-zinc-500 hover:bg-zinc-100"
                        >
                          <span className={`inline-block transition-transform ${aberto ? 'rotate-90' : ''}`}>▸</span>
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-2.5 tabular-nums text-zinc-400">{item.id}</td>
                    {colunas.map((c) => (
                      <td key={c.titulo} className={`px-4 py-2.5 ${c.className ?? ''}`}>{c.render(item)}</td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button type="button" className={btnLinha} onClick={() => abrir({ tipo: 'editar', item })}>Editar</button>
                      <button type="button" className={btnLinha} onClick={() => alternarAtivo(item)}>
                        {item.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                      <button type="button" className={btnLinhaPerigo} onClick={() => pedirExclusao(item)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                  {expandido && aberto && (
                    <tr className="border-b border-zinc-100 bg-zinc-50/70">
                      <td colSpan={totalColunas} className="px-4 py-3">{expandido(item, recarregar)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formulário de criação / edição */}
      {edicao && form && (
        <Modal
          titulo={edicao.tipo === 'novo' ? `${novo} ${nome.singular}` : `Editar ${nome.singular}`}
          onFechar={fecharFormulario}
        >
          <form onSubmit={salvar} className="flex flex-col gap-4">
            {campos.map((campo, indice) => (
              <label key={campo.chave} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-zinc-600">
                  {campo.rotulo}{campo.obrigatorio && <span className="text-red-500"> *</span>}
                </span>
                {campo.tipo === 'area' ? (
                  <textarea
                    rows={3}
                    value={form[campo.chave]}
                    maxLength={campo.maxLength}
                    onChange={(e) => setForm({ ...form, [campo.chave]: e.target.value })}
                    className={inputBase}
                  />
                ) : (
                  <input
                    type="text"
                    autoFocus={indice === 0}
                    value={form[campo.chave]}
                    maxLength={campo.maxLength}
                    onChange={(e) => setForm({ ...form, [campo.chave]: e.target.value })}
                    className={inputBase}
                  />
                )}
                {campo.dica && <span className="text-xs text-zinc-400">{campo.dica}</span>}
              </label>
            ))}

            {erroForm && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erroForm}</div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={btnSecundario} onClick={fecharFormulario}>Cancelar</button>
              <button type="submit" className={btnPrimario} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmação de exclusão */}
      {paraExcluir && (
        <Modal titulo={`Excluir ${nome.singular}`} onFechar={() => setParaExcluir(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-700">
              Excluir {nome.feminino ? 'a' : 'o'} {nome.singular} <strong>{rotuloItem(paraExcluir.item)}</strong>?
            </p>
            {linhasDoImpacto(paraExcluir.impacto).length > 0 ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
                <div className="font-semibold">⚠ Será apagado tudo isto, definitivamente:</div>
                <ul className="mt-1 list-disc pl-5">
                  {linhasDoImpacto(paraExcluir.impacto).map((linha) => <li key={linha}>{linha}</li>)}
                </ul>
                <div className="mt-2 text-xs text-red-700">
                  Não há como desfazer. Para apenas tirá{nome.feminino ? '-la' : '-lo'} das listas, use <em>Desativar</em>.
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Nada mais depende {nome.feminino ? 'dela' : 'dele'}. Esta ação não pode ser desfeita.
              </p>
            )}
            {erroForm && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erroForm}</div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecundario} onClick={() => setParaExcluir(null)}>Cancelar</button>
              <button type="button" className={btnPerigo} disabled={excluindo} onClick={confirmarExclusao}>
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
