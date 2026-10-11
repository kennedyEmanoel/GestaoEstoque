import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  CartaoDoDia,
  DiaComRegistro,
  Etapa,
  FichaDiariaCompleta,
  ImpactoExclusao,
  Operador,
  OperadorDiario,
  Produto,
  RegistroHorario,
} from '../../../shared/types';
import { rotuloEtapa, rotuloProduto } from '../../../shared/rotulos';
import { chamar, mensagemDeErro } from '../../lib/api';
import SeletorDashboard from './SeletorDashboard';
import ExistentesPanel from './ExistentesPanel';
import Modal from '../../components/ui/Modal';
import { btnPerigo, btnSecundario } from '../../components/ui/estilos';
import { linhasDoImpacto } from '../../lib/impacto';

// ─── Constantes ───────────────────────────────────────────────────────────────

const BLOCOS_HORARIOS = [
  '07:12 - 08:00',
  '08:00 - 09:00',
  '09:15 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:12',
];

const COR_OP = ['#e67e22','#27ae60','#8e44ad','#2980b9','#c0392b','#f39c12','#16a085','#d35400'];

// ─── Tipos locais ─────────────────────────────────────────────────────────────

// Chave: "opId-bloco"
type CellKey = `${number}-${string}`;

// Rascunho local antes de salvar — valores digitados pelo usuário
type Draft = Record<CellKey, { meta: string; realizado: string }>;

interface FiltroState {
  data: string;
  produtoId: number | null;
  etapaId: number | null;
  variacaoId: number | null;
  metaHoraPadrao: number;
}

/** Ao escolher uma etapa que tem variações, já deixa a primeira selecionada. */
function variacaoPadrao(etapa: Etapa | null | undefined): number | null {
  return etapa?.variacoes[0]?.id ?? null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReg(op: OperadorDiario & { registros: RegistroHorario[] }, bloco: string) {
  return op.registros.find(r => r.horarioBloco === bloco);
}

function totalRealizadoBloco(ops: Array<OperadorDiario & { registros: RegistroHorario[] }>, bloco: string) {
  return ops.reduce((s, op) => s + (getReg(op, bloco)?.realizado ?? 0), 0);
}

function totalMetaBloco(ops: Array<OperadorDiario & { registros: RegistroHorario[] }>, bloco: string) {
  return ops.reduce((s, op) => s + (getReg(op, bloco)?.meta ?? 0), 0);
}

function pct(realizado: number, meta: number): number | null {
  return meta === 0 ? null : (realizado / meta) * 100;
}

function corPct(p: number | null) {
  if (p === null) return '#94a3b8';
  if (p >= 100) return '#16a34a';
  if (p >= 80)  return '#d97706';
  return '#dc2626';
}

function corSaldo(v: number) {
  if (v < 0) return '#dc2626';
  if (v > 0) return '#2563eb';
  return '#16a34a';
}

// ─── Componente ──────────────────────────────────────────────────────────────

// ─── Controles do painel de produção ─────────────────────────────────────────

const BLOCOS_DASHBOARD = [
  '07:12 - 08:00', '08:00 - 09:00', '09:15 - 10:00',
  '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00',
  '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:12',
];

function faixaAtualDashboard(): string {
  const agora   = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const blocos = [
    { ini: 7*60+12, fim: 8*60    },
    { ini: 8*60,    fim: 9*60    },
    { ini: 9*60+15, fim: 10*60   },
    { ini: 10*60,   fim: 11*60   },
    { ini: 11*60,   fim: 12*60   },
    { ini: 13*60,   fim: 14*60   },
    { ini: 14*60,   fim: 15*60   },
    { ini: 15*60,   fim: 16*60   },
    { ini: 16*60,   fim: 17*60+12},
  ];
  for (let i = 0; i < blocos.length; i++) {
    if (minutos >= blocos[i].ini && minutos < blocos[i].fim) return BLOCOS_DASHBOARD[i];
  }
  return BLOCOS_DASHBOARD[0];
}

export default function Producao() {
  const today = new Date().toISOString().slice(0, 10);

  const [filtro, setFiltro] = useState<FiltroState>({
    data: today, produtoId: null, etapaId: null, variacaoId: null, metaHoraPadrao: 40,
  });

  // ── Cadastros que alimentam os seletores ───────────────────────────────────
  const [produtos, setProdutos]       = useState<Produto[]>([]);
  const [etapas, setEtapas]           = useState<Etapa[]>([]);
  const [operadores, setOperadores]   = useState<Operador[]>([]);

  // ── Estado dos controles do Dashboard ──────────────────────────────────────
  const [dashData, setDashData]         = useState(today);
  const [dashProdutoId, setDashProdutoId] = useState<number | null>(null);
  const [dashFaixa, setDashFaixa]       = useState<string>(faixaAtualDashboard());
  const [seletorAberto, setSeletorAberto] = useState(false);


  const [ficha, setFicha]       = useState<FichaDiariaCompleta | null>(null);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [novoOpId, setNovoOpId] = useState<number | null>(null);
  const [addingOp, setAddingOp] = useState(false);

  // ── O que já existe (aparece quando nenhum cartão está aberto) ─────────────
  const [dias, setDias]                 = useState<DiaComRegistro[]>([]);
  const [cartoes, setCartoes]           = useState<CartaoDoDia[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  // Aviso de exclusão do cartão aberto (com o que será apagado junto)
  const [exclusaoCartao, setExclusaoCartao] = useState<ImpactoExclusao | null>(null);
  const [excluindoCartao, setExcluindoCartao] = useState(false);

  // Rascunho: valores que o usuário digitou mas ainda não salvou
  const [draft, setDraft] = useState<Draft>({});
  // Células com save em andamento
  const [saving, setSaving] = useState<Set<CellKey>>(new Set());
  // Células salvas com sucesso (feedback visual temporário)
  const [saved, setSaved] = useState<Set<CellKey>>(new Set());

  // Refs que espelham sempre o valor atual — usados dentro de callbacks estáveis
  const fichaRef = useRef<FichaDiariaCompleta | null>(null);
  const draftRef = useRef<Draft>({});
  fichaRef.current = ficha;
  draftRef.current = draft;

  // ── Cadastros (carregados ao abrir a tela e escolhidos os valores iniciais) ──

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [listaProdutos, listaEtapas, listaOperadores] = await Promise.all([
          chamar(window.api.produtos.listar()),
          chamar(window.api.etapas.listar()),
          chamar(window.api.operadores.listar()),
        ]);
        if (!ativo) return;
        setProdutos(listaProdutos);
        setEtapas(listaEtapas);
        setOperadores(listaOperadores);
        setFiltro(f => {
          const etapa = listaEtapas.find(e => e.id === f.etapaId) ?? listaEtapas[0] ?? null;
          return {
            ...f,
            produtoId: listaProdutos.find(p => p.id === f.produtoId)?.id ?? listaProdutos[0]?.id ?? null,
            etapaId: etapa?.id ?? null,
            variacaoId: etapa?.variacoes.some(v => v.id === f.variacaoId) ? f.variacaoId : variacaoPadrao(etapa),
          };
        });
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e));
      }
    })();
    return () => { ativo = false; };
  }, []);

  // Recarrega a lista sempre que a data muda ou o usuário volta de um cartão aberto (totais atualizados)
  const cartaoAberto = ficha !== null;
  useEffect(() => {
    if (cartaoAberto) return;
    let ativo = true;
    setCarregandoLista(true);
    (async () => {
      try {
        const [listaDias, listaCartoes] = await Promise.all([
          chamar(window.api.listarDiasComRegistro()),
          chamar(window.api.listarCartoesDoDia(filtro.data)),
        ]);
        if (!ativo) return;
        setDias(listaDias);
        setCartoes(listaCartoes);
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e));
      } finally {
        if (ativo) setCarregandoLista(false);
      }
    })();
    return () => { ativo = false; };
  }, [filtro.data, cartaoAberto]);

  const pedirExclusaoCartao = async () => {
    if (!ficha) return;
    try { setExclusaoCartao(await chamar(window.api.impactoDoCartao(ficha.id))); }
    catch (e) { setErro(mensagemDeErro(e)); }
  };

  const confirmarExclusaoCartao = async () => {
    if (!ficha) return;
    setExcluindoCartao(true);
    try {
      await chamar(window.api.removerCartao(ficha.id));
      setFicha(null); // volta para a lista, que recarrega sozinha
    } catch (e) { setErro(mensagemDeErro(e)); }
    finally { setExcluindoCartao(false); setExclusaoCartao(null); }
  };

  /** Abre um cartão que já existe e ajusta os filtros para ele. */
  const abrirCartao = async (fichaId: number) => {
    setErro(null); setLoading(true); setDraft({});
    try {
      const aberta = await chamar(window.api.getFichaPorId(fichaId));
      setFiltro(f => ({
        ...f, data: aberta.data, produtoId: aberta.produtoId,
        etapaId: aberta.etapaId, variacaoId: aberta.variacaoId,
      }));
      setFicha(aberta);
    } catch (e) { setErro(mensagemDeErro(e)); }
    finally { setLoading(false); }
  };

  const etapaDoFiltro = etapas.find(e => e.id === filtro.etapaId) ?? null;

  const handleEtapa = (etapaId: number) => {
    const etapa = etapas.find(e => e.id === etapaId);
    setFiltro(f => ({ ...f, etapaId, variacaoId: variacaoPadrao(etapa) }));
  };

  // ── Comandos para o Dashboard ───────────────────────────────────────────────

  const enviarRefresh = () => {
    window.api.sendDashboardCommand({ type: 'refresh', data: dashData, produtoId: dashProdutoId, faixa: dashFaixa });
  };

  const enviarRefreshGeral = () => {
    window.api.sendDashboardGeralCommand({ type: 'refresh', data: dashData, produtoId: dashProdutoId, faixa: dashFaixa });
  };

  // ── Carregar / criar ────────────────────────────────────────────────────────

  const carregarFicha = useCallback(async (criar = false) => {
    if (filtro.produtoId === null || filtro.etapaId === null) {
      setErro('Selecione o produto e a etapa. Se a lista estiver vazia, cadastre-os em "Cadastros".');
      return;
    }
    setErro(null); setLoading(true); setDraft({});
    try {
      const chave = {
        data: filtro.data, produtoId: filtro.produtoId,
        etapaId: filtro.etapaId, variacaoId: filtro.variacaoId,
      };
      const res = criar
        ? await window.api.getOrCreateFicha({ ...chave, metaHoraPadrao: filtro.metaHoraPadrao })
        : await window.api.getFichaCompleta(chave);
      if (!res.success) throw new Error(res.error);
      setFicha(res.data ?? null);
    } catch (e) { setErro(mensagemDeErro(e)); }
    finally { setLoading(false); }
  }, [filtro]);

  // ── Operadores ──────────────────────────────────────────────────────────────

  // Só entram na lista de escolha os operadores ativos que ainda não estão nesta ficha
  const operadoresDisponiveis = operadores.filter(
    o => !ficha?.operadores.some(escalado => escalado.operadorId === o.id),
  );
  const operadorEscolhido = operadoresDisponiveis.find(o => o.id === novoOpId) ?? operadoresDisponiveis[0] ?? null;

  const handleAddOp = async () => {
    if (!ficha || !operadorEscolhido) return;
    setAddingOp(true);
    try {
      const res = await window.api.addOperador({ fichaId: ficha.id, operadorId: operadorEscolhido.id });
      if (!res.success || !res.data) { setErro(res.error ?? 'Erro'); return; }
      setFicha({
        ...ficha,
        operadores: [...ficha.operadores, { ...res.data, registros: [] }],
      });
      setNovoOpId(null);
    } finally { setAddingOp(false); }
  };

  const handleRemoveOp = async (id: number) => {
    if (!ficha) return;
    const res = await window.api.removeOperador({ operadorDiarioId: id });
    if (!res.success) { setErro(res.error ?? 'Erro'); return; }
    setFicha({ ...ficha, operadores: ficha.operadores.filter(op => op.id !== id) });
    // Limpa rascunhos do operador removido
    setDraft(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${id}-`)) delete next[k as CellKey]; });
      return next;
    });
  };

  // ── Rascunho local (sem salvar) ──────────────────────────────────────────────

  // Lê rascunho ou valor confirmado no banco — usa refs para nunca ter closure stale
  const getDraftOrReg = useCallback((opId: number, bloco: string): { meta: string; realizado: string } => {
    const key: CellKey = `${opId}-${bloco}`;
    const curDraft = draftRef.current;
    const curFicha = fichaRef.current;
    if (curDraft[key]) return curDraft[key];
    const op  = curFicha?.operadores.find(o => o.id === opId);
    const reg = op ? getReg(op as any, bloco) : undefined;
    return {
      meta:      reg ? String(reg.meta)      : String(curFicha?.metaHoraPadrao ?? 0),
      realizado: reg ? String(reg.realizado) : '0',
    };
  }, []);

  const handleDraftChange = (opId: number, bloco: string, field: 'meta' | 'realizado', raw: string) => {
    const key: CellKey = `${opId}-${bloco}`;
    setDraft(prev => {
      const current = prev[key] ?? getDraftOrReg(opId, bloco);
      return { ...prev, [key]: { ...current, [field]: raw } };
    });
  };

  // ── Salvar uma célula (linha do operador × bloco) ───────────────────────────

  const handleSalvar = useCallback(async (opId: number, bloco: string) => {
    if (!fichaRef.current) return;

    const key: CellKey = `${opId}-${bloco}`;
    const values = getDraftOrReg(opId, bloco);

    const meta      = parseInt(values.meta,      10);
    const realizado = parseInt(values.realizado, 10);

    // Validação: meta obrigatória e maior que zero
    if (isNaN(meta) || meta <= 0) {
      setErro(`Informe a meta para o horário ${bloco} antes de salvar.`);
      return;
    }
    if (isNaN(realizado) || realizado < 0) {
      setErro(`Valor de realizado inválido para o horário ${bloco}.`);
      return;
    }

    setSaving(prev => new Set(prev).add(key));
    setErro(null);

    try {
      // upsertRegistro usa INSERT ... ON CONFLICT DO UPDATE — trata criação e atualização
      const res = await window.api.upsertRegistro({
        operadorDiarioId: opId,
        horarioBloco: bloco,
        meta,
        realizado,
      });

      if (!res.success) {
        setErro(res.error ?? 'Erro ao salvar');
        return;
      }

      const savedReg = res.data as RegistroHorario;

      // Atualiza o estado local da ficha com o registro confirmado pelo banco
      setFicha(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          operadores: prev.operadores.map(op => {
            if (op.id !== opId) return op;
            const existe = op.registros.find(r => r.horarioBloco === bloco);
            return {
              ...op,
              registros: existe
                ? op.registros.map(r => r.horarioBloco === bloco ? savedReg : r)
                : [...op.registros, savedReg],
            };
          }),
        };
      });

      // Remove o rascunho — o valor oficial agora é o que veio do banco
      setDraft(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      // Feedback visual de sucesso por 1,5s
      setSaved(prev => new Set(prev).add(key));
      setTimeout(() => setSaved(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }), 1500);

    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [getDraftOrReg]);

  const handleMetaPadrao = async (v: number) => {
    if (!ficha) return;
    setFiltro(f => ({ ...f, metaHoraPadrao: v }));
    const res = await window.api.updateMetaHoraPadrao(ficha.id, v);
    if (!res.success) setErro(res.error ?? 'Erro');
    else setFicha({ ...ficha, metaHoraPadrao: v });
  };

  // ── Totais ──────────────────────────────────────────────────────────────────

  const totaisOp = ficha?.operadores.map(op => ({
    id: op.id,
    meta:      op.registros.reduce((s, r) => s + r.meta,      0),
    realizado: op.registros.reduce((s, r) => s + r.realizado, 0),
  })) ?? [];

  const grandTotal = {
    meta:      totaisOp.reduce((s, t) => s + t.meta,      0),
    realizado: totaisOp.reduce((s, t) => s + t.realizado, 0),
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>

      {/* ── Painel de controle dos Dashboards ── */}
      <div style={{
        background: '#0f2542', padding: '10px 14px', flexShrink: 0,
        borderBottom: '2px solid #1e3a5f',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 1.5, marginBottom: 8 }}>
          CONTROLE DOS PAINÉIS DE PRODUÇÃO
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>

          {/* Data */}
          <div>
            <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>DATA</div>
            <input type="date" value={dashData} onChange={e => setDashData(e.target.value)} style={inp} />
          </div>

          {/* Produto */}
          <div>
            <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>PRODUTO</div>
            <select
              value={dashProdutoId ?? ''}
              onChange={e => setDashProdutoId(e.target.value ? Number(e.target.value) : null)}
              style={{ ...inp, minWidth: 130 }}
            >
              <option value="">Todos</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{rotuloProduto(p.nome, p.versao)}</option>)}
            </select>
          </div>

          {/* Faixa de horário */}
          <div>
            <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>FAIXA DE HORÁRIO</div>
            <select value={dashFaixa} onChange={e => setDashFaixa(e.target.value)} style={inp}>
              {BLOCOS_DASHBOARD.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />

          {/* ── Botão unificado: abre seletor ── */}
          <button
            onClick={() => setSeletorAberto(true)}
            style={{ padding: '4px 16px', borderRadius: 3, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}
          >
            Abrir Painel ▾
          </button>

          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />

          {/* ── Atualizar / Fechar por painel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ color: '#3b82f6', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>DETALHADO</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={enviarRefresh}
                style={{ padding: '4px 10px', borderRadius: 3, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                Atualizar
              </button>
              <button onClick={() => window.api.closeProductionWindow()}
                style={{ padding: '4px 10px', borderRadius: 3, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                Fechar
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ color: '#34d399', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>GERAL</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={enviarRefreshGeral}
                style={{ padding: '4px 10px', borderRadius: 3, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                Atualizar
              </button>
              <button onClick={() => window.api.closeProductionWindowGeral()}
                style={{ padding: '4px 10px', borderRadius: 3, border: '1px solid #059669', background: 'transparent', color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                Fechar
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Seletor de dashboard ── */}
      {seletorAberto && (
        <SeletorDashboard
          onSelecionar={(tipo) => {
            setSeletorAberto(false);
            if (tipo === 'detalhado') window.api.openProductionWindow();
            else window.api.openProductionWindowGeral();
          }}
          onFechar={() => setSeletorAberto(false)}
        />
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e3a5f', flexShrink: 0, flexWrap: 'wrap' }}>

        {([
          { label: 'DATA',    node: <input type="date" value={filtro.data} onChange={e => setFiltro(f => ({ ...f, data: e.target.value }))} style={inp} /> },
          { label: 'PRODUTO', node: (
            <select
              value={filtro.produtoId ?? ''}
              onChange={e => setFiltro(f => ({ ...f, produtoId: e.target.value ? Number(e.target.value) : null }))}
              style={{ ...inp, minWidth: 130 }}
            >
              {produtos.length === 0 && <option value="">Cadastre um produto</option>}
              {produtos.map(p => <option key={p.id} value={p.id}>{rotuloProduto(p.nome, p.versao)}</option>)}
            </select>
          )},
          { label: 'ETAPA',   node: (
            <select
              value={filtro.etapaId ?? ''}
              onChange={e => handleEtapa(Number(e.target.value))}
              style={inp}
            >
              {etapas.length === 0 && <option value="">Cadastre uma etapa</option>}
              {etapas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          )},
          ...(etapaDoFiltro && etapaDoFiltro.variacoes.length > 0 ? [{ label: 'VARIAÇÃO', node: (
            <select
              value={filtro.variacaoId ?? ''}
              onChange={e => setFiltro(f => ({ ...f, variacaoId: e.target.value ? Number(e.target.value) : null }))}
              style={inp}
            >
              <option value="">— sem variação —</option>
              {etapaDoFiltro.variacoes.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          )}] : []),
          { label: 'META/H',  node: <input type="number" min={0} value={filtro.metaHoraPadrao} onChange={e => setFiltro(f => ({ ...f, metaHoraPadrao: parseInt(e.target.value) || 0 }))} style={{ ...inp, width: 52 }} /> },
        ] as const).map(({ label, node }) => (
          <div key={label}>
            <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
            {node}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end', marginBottom: 1 }}>
          <button style={btnStyle('#334155')} onClick={() => carregarFicha(false)} disabled={loading}>Consultar</button>
          <button style={btnStyle('#16a34a')} onClick={() => carregarFicha(true)}  disabled={loading}>{loading ? '...' : 'Abrir / Criar'}</button>
        </div>

        {ficha && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 11 }}>
            <span>Ficha #{ficha.id} | Meta padrão:</span>
            <input type="number" min={0} value={ficha.metaHoraPadrao}
              onChange={e => handleMetaPadrao(parseInt(e.target.value) || 0)}
              style={{ ...inp, width: 44, display: 'inline-block' }}
            />
            <span style={{ marginLeft: 8 }}>| + Operador:</span>
            <select
              value={operadorEscolhido?.id ?? ''}
              onChange={e => setNovoOpId(Number(e.target.value))}
              style={{ ...inp, width: 150 }}
            >
              {operadoresDisponiveis.length === 0 && (
                <option value="">{operadores.length === 0 ? 'Cadastre operadores' : 'Todos já escalados'}</option>
              )}
              {operadoresDisponiveis.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <button style={btnStyle('#2563eb')} onClick={handleAddOp} disabled={addingOp || !operadorEscolhido}>
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', fontSize: 11, flexShrink: 0 }}>
          {erro}
          <button onClick={() => setErro(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>✕</button>
        </div>
      )}

      {!ficha && !loading && (
        <ExistentesPanel
          dataSelecionada={filtro.data}
          dias={dias}
          cartoes={cartoes}
          carregando={carregandoLista}
          onEscolherDia={(data) => setFiltro(f => ({ ...f, data }))}
          onAbrir={abrirCartao}
        />
      )}

      {/* ── Tabela ── */}
      {ficha && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 10px' }}>

          <div style={{
            background: '#1e3a5f', color: '#fff', padding: '5px 12px',
            borderRadius: '5px 5px 0 0', marginBottom: -1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <button
              onClick={() => setFicha(null)}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 3, padding: '2px 8px', fontSize: 11, fontWeight: 700, marginRight: 10 }}
            >
              ← Cartões do dia
            </button>
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.8, flex: 1 }}>
              CONTROLE DE PRODUÇÃO — {rotuloEtapa(ficha.etapa, ficha.variacao).toUpperCase()} | {rotuloProduto(ficha.produto, ficha.produtoVersao).toUpperCase()}
            </span>
            <span style={{ fontSize: 10, opacity: 0.6, marginRight: 10 }}>{ficha.data}</span>
            <button
              onClick={pedirExclusaoCartao}
              style={{ background: 'rgba(220,38,38,0.85)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 3, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}
            >
              Excluir cartão
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              borderCollapse: 'collapse', background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)', width: '100%',
              tableLayout: 'auto', fontSize: 11,
            }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...TH('#1e3a5f'), width: 105, minWidth: 105 }}>HORÁRIO</th>
                  {ficha.operadores.map((op, i) => (
                    <th key={op.id} colSpan={4} style={{ ...TH(COR_OP[i % COR_OP.length]), minWidth: 190 }}>
                      <span style={{ fontSize: 11 }}>{op.operadorNome}</span>
                      <button onClick={() => handleRemoveOp(op.id)}
                        style={{ marginLeft: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                        ✕
                      </button>
                    </th>
                  ))}
                  <th rowSpan={2} style={{ ...TH('#0f766e'), minWidth: 52 }}>TOT.<br/>REAL.</th>
                  <th rowSpan={2} style={{ ...TH('#0f766e'), minWidth: 52 }}>TOT.<br/>META</th>
                  <th rowSpan={2} style={{ ...TH('#0f766e'), minWidth: 58 }}>%<br/>ATING.</th>
                </tr>
                <tr>
                  {ficha.operadores.map(op => (
                    <>
                      <th key={`${op.id}-m`} style={TH('#334155', '#64748b')}>META</th>
                      <th key={`${op.id}-r`} style={TH('#334155', '#64748b')}>REAL.</th>
                      <th key={`${op.id}-s`} style={TH('#334155', '#64748b')}>SALDO</th>
                      <th key={`${op.id}-sv`} style={TH('#334155', '#64748b')}></th>
                    </>
                  ))}
                </tr>
              </thead>

              <tbody>
                {BLOCOS_HORARIOS.map(bloco => {
                  const totReal = totalRealizadoBloco(ficha.operadores, bloco);
                  const totMeta = totalMetaBloco(ficha.operadores, bloco);
                  const p       = pct(totReal, totMeta);

                  return (
                    <tr key={bloco}>
                      <td style={{
                        padding: '3px 7px', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap',
                        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                        borderRight: '2px solid #cbd5e1', color: '#374151',
                      }}>
                        {bloco}
                      </td>

                      {ficha.operadores.map(op => {
                        const key: CellKey  = `${op.id}-${bloco}`;
                        const reg           = getReg(op as any, bloco);
                        const values        = getDraftOrReg(op.id, bloco);
                        const isDirty       = !!draft[key];
                        const isSaving      = saving.has(key);
                        const wasSaved      = saved.has(key);
                        const metaNum       = parseInt(values.meta, 10);
                        const realizadoNum  = parseInt(values.realizado, 10);
                        const saldo         = (isNaN(realizadoNum) ? 0 : realizadoNum) - (isNaN(metaNum) ? 0 : metaNum);
                        const metaInvalida  = isNaN(metaNum) || metaNum <= 0;

                        return (
                          <>
                            {/* Meta */}
                            <td key={`${op.id}-m`} style={TD(isDirty ? { background: '#fefce8' } : undefined)}>
                              <input
                                type="number" min={0}
                                value={values.meta}
                                style={{ ...cellInput, borderColor: metaInvalida && isDirty ? '#fca5a5' : '#cbd5e1' }}
                                onChange={e => handleDraftChange(op.id, bloco, 'meta', e.target.value)}
                              />
                            </td>

                            {/* Realizado */}
                            <td key={`${op.id}-r`} style={TD(isDirty ? { background: '#fefce8' } : undefined)}>
                              <input
                                type="number" min={0}
                                value={values.realizado}
                                style={{ ...cellInput, background: '#f0fdf4' }}
                                onChange={e => handleDraftChange(op.id, bloco, 'realizado', e.target.value)}
                              />
                            </td>

                            {/* Saldo (calculado ao vivo a partir do rascunho) */}
                            <td key={`${op.id}-s`} style={TD({ color: corSaldo(saldo), fontWeight: 700 })}>
                              {(reg || isDirty) ? (saldo > 0 ? `+${saldo}` : saldo) : '—'}
                            </td>

                            {/* Botão Salvar */}
                            <td key={`${op.id}-sv`} style={TD({ padding: '2px 4px' })}>
                              <button
                                onClick={() => handleSalvar(op.id, bloco)}
                                disabled={isSaving || metaInvalida}
                                title={metaInvalida ? 'Informe a meta antes de salvar' : 'Salvar este registro'}
                                style={saveBtnStyle(isSaving, wasSaved, metaInvalida)}
                              >
                                {isSaving ? '...' : wasSaved ? '✓' : 'Salvar'}
                              </button>
                            </td>
                          </>
                        );
                      })}

                      <td style={TD({ fontWeight: 700, fontSize: 11 })}>{totReal || '—'}</td>
                      <td style={TD({ fontWeight: 700, fontSize: 11 })}>{totMeta || '—'}</td>
                      <td style={TD({ fontWeight: 700, color: corPct(p), fontSize: 11 })}>
                        {p !== null ? `${p.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Rodapé */}
                <tr style={{ background: '#1e3a5f', color: '#fff', fontWeight: 700 }}>
                  <td style={{ padding: '4px 7px', fontSize: 10, fontWeight: 700, borderRight: '2px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                    TOTAL GERAL
                  </td>
                  {totaisOp.map(t => {
                    const saldo = t.realizado - t.meta;
                    return (
                      <>
                        <td key={`${t.id}-m`}  style={TD({ color: '#fff', fontWeight: 700, fontSize: 11 })}>{t.meta}</td>
                        <td key={`${t.id}-r`}  style={TD({ color: '#fff', fontWeight: 700, fontSize: 11 })}>{t.realizado}</td>
                        <td key={`${t.id}-s`}  style={TD({ fontWeight: 700, fontSize: 11, color: saldo < 0 ? '#fca5a5' : '#86efac' })}>
                          {saldo > 0 ? `+${saldo}` : saldo}
                        </td>
                        <td key={`${t.id}-sv`} style={TD()} />
                      </>
                    );
                  })}
                  <td style={TD({ color: '#fff', fontWeight: 800, fontSize: 12 })}>{grandTotal.realizado}</td>
                  <td style={TD({ color: '#fff', fontWeight: 800, fontSize: 12 })}>{grandTotal.meta}</td>
                  <td style={TD({
                    fontWeight: 800, fontSize: 12,
                    color: (() => {
                      const p = pct(grandTotal.realizado, grandTotal.meta);
                      return p === null ? '#94a3b8' : p >= 100 ? '#86efac' : p >= 80 ? '#fde68a' : '#fca5a5';
                    })(),
                  })}>
                    {grandTotal.meta > 0 ? `${((grandTotal.realizado / grandTotal.meta) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aviso de exclusão do cartão ── */}
      {ficha && exclusaoCartao && (
        <Modal titulo="Excluir cartão" onFechar={() => setExclusaoCartao(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-700">
              Excluir o cartão <strong>{rotuloEtapa(ficha.etapa, ficha.variacao)} · {rotuloProduto(ficha.produto, ficha.produtoVersao)}</strong> de {ficha.data}?
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              <div className="font-semibold">⚠ Será apagado tudo isto, definitivamente:</div>
              <ul className="mt-1 list-disc pl-5">
                <li>o próprio cartão</li>
                {linhasDoImpacto({ ...exclusaoCartao, cartoes: 0 }).map((linha) => <li key={linha}>{linha}</li>)}
              </ul>
              <div className="mt-2 text-xs text-red-700">Não há como desfazer. Operadores e produto continuam cadastrados.</div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecundario} onClick={() => setExclusaoCartao(null)}>Cancelar</button>
              <button type="button" className={btnPerigo} disabled={excluindoCartao} onClick={confirmarExclusaoCartao}>
                {excluindoCartao ? 'Excluindo...' : 'Excluir cartão'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  padding: '3px 6px', borderRadius: 3, border: '1px solid #334155',
  background: '#0f2542', color: '#f1f5f9', fontSize: 12, outline: 'none',
};

const cellInput: React.CSSProperties = {
  width: 44, padding: '1px 2px', textAlign: 'center', fontSize: 11,
  border: '1px solid #cbd5e1', borderRadius: 2, outline: 'none', background: '#f0f9ff',
};

function saveBtnStyle(saving: boolean, saved: boolean, disabled: boolean): React.CSSProperties {
  let bg = '#2563eb';
  if (saved)    bg = '#16a34a';
  if (disabled) bg = '#cbd5e1';
  if (saving)   bg = '#93c5fd';
  return {
    padding: '2px 7px', borderRadius: 3, border: 'none',
    background: bg, color: disabled ? '#94a3b8' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap',
    minWidth: 44, transition: 'background 0.2s',
  };
}

function btnStyle(bg: string): React.CSSProperties {
  return { padding: '3px 10px', borderRadius: 3, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 11 };
}

function TH(bg: string, color = '#fff'): React.CSSProperties {
  return {
    background: bg, color, padding: '4px 6px', textAlign: 'center',
    fontWeight: 700, fontSize: 10, letterSpacing: 0.4, whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky', top: 0, zIndex: 2,
  };
}

function TD(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '3px 5px', textAlign: 'center',
    borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
    fontSize: 11,
    ...extra,
  };
}
