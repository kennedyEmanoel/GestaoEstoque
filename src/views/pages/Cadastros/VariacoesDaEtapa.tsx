import { useState, type FormEvent } from 'react';
import type { Etapa, EtapaVariacao, ImpactoExclusao } from '../../../shared/types';
import { chamar, mensagemDeErro } from '../../lib/api';
import { linhasDoImpacto } from '../../lib/impacto';
import StatusBadge from '../../components/ui/StatusBadge';
import { btnLinha, btnLinhaPerigo, btnPrimario, btnSecundario, inputBase } from '../../components/ui/estilos';

interface VariacoesDaEtapaProps {
  etapa: Etapa;
  /** Chamado depois de qualquer alteração, para a tela recarregar as etapas. */
  aoAlterar: () => void;
}

const api = window.api.variacoes;

/** Variações de uma etapa (ex.: Soldagem → Cabos, Retrabalho). Cada uma é um tipo de trabalho dentro da etapa. */
export default function VariacoesDaEtapa({ etapa, aoAlterar }: VariacoesDaEtapaProps) {
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [confirmando, setConfirmando] = useState<{ id: number; impacto: ImpactoExclusao } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /** Executa uma alteração, mostra o erro (se houver) e avisa a tela para recarregar. */
  const executar = async (acao: () => Promise<unknown>) => {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      aoAlterar();
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const adicionar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (novoNome.trim() === '') return;
    if (await executar(() => chamar(api.criar({ etapaId: etapa.id, nome: novoNome })))) setNovoNome('');
  };

  const salvarEdicao = async (ev: FormEvent, variacao: EtapaVariacao) => {
    ev.preventDefault();
    if (await executar(() => chamar(api.atualizar(variacao.id, { nome: nomeEdicao })))) setEditandoId(null);
  };

  const excluir = async (variacao: EtapaVariacao) => {
    await executar(() => chamar(api.remover(variacao.id)));
    setConfirmando(null);
  };

  /** Mede o que seria apagado junto antes de pedir a confirmação. */
  const pedirExclusao = async (variacao: EtapaVariacao) => {
    setErro(null);
    try {
      setConfirmando({ id: variacao.id, impacto: await chamar(api.impacto(variacao.id)) });
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Variações de {etapa.nome}
      </div>

      {etapa.variacoes.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Esta etapa não tem variações. Ela é usada diretamente nos cartões de produção.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {etapa.variacoes.map((v) => (
            <li key={v.id} className={`flex items-center gap-3 px-3 py-2 ${v.ativo ? '' : 'text-zinc-400'}`}>
              {editandoId === v.id ? (
                <form className="flex flex-1 items-center gap-2" onSubmit={(ev) => salvarEdicao(ev, v)}>
                  <input
                    autoFocus
                    value={nomeEdicao}
                    onChange={(e) => setNomeEdicao(e.target.value)}
                    maxLength={40}
                    className={`${inputBase} max-w-xs`}
                  />
                  <button type="submit" className={btnPrimario} disabled={ocupado}>Salvar</button>
                  <button type="button" className={btnSecundario} onClick={() => setEditandoId(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{v.nome}</span>
                  <StatusBadge ativo={v.ativo} />
                  {confirmando?.id === v.id ? (
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <span className="mr-1 max-w-md text-right text-xs text-red-700">
                        {linhasDoImpacto(confirmando.impacto).length > 0
                          ? `⚠ Apaga também: ${linhasDoImpacto(confirmando.impacto).join(', ')}. Sem volta.`
                          : 'Excluir esta variação?'}
                      </span>
                      <button type="button" className={btnLinhaPerigo} disabled={ocupado} onClick={() => excluir(v)}>Confirmar</button>
                      <button type="button" className={btnLinha} onClick={() => setConfirmando(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="whitespace-nowrap">
                      <button type="button" className={btnLinha} onClick={() => { setEditandoId(v.id); setNomeEdicao(v.nome); setErro(null); }}>
                        Editar
                      </button>
                      <button type="button" className={btnLinha} disabled={ocupado} onClick={() => executar(() => chamar(api.definirAtivo(v.id, !v.ativo)))}>
                        {v.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                      <button type="button" className={btnLinhaPerigo} disabled={ocupado} onClick={() => pedirExclusao(v)}>
                        Excluir
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="flex items-center gap-2">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nova variação (ex.: Retrabalho)"
          maxLength={40}
          className={`${inputBase} max-w-xs`}
        />
        <button type="submit" className={btnSecundario} disabled={ocupado || novoNome.trim() === ''}>
          + Adicionar variação
        </button>
      </form>

      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</div>
      )}
    </div>
  );
}
