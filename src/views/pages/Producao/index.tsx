import { useState, useCallback, useRef } from 'react';
import type {
  FichaDiariaCompleta,
  OperadorDiario,
  RegistroHorario,
  EtapaProducao,
} from '../../../shared/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS: EtapaProducao[] = ['Montagem', 'Soldagem', 'Revisao', 'Firmware', 'IMEI'];

const BLOCOS_HORARIOS = [
  '07:12 - 08:12',
  '08:12 - 09:12',
  '09:15 - 10:12',
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
  etapa: EtapaProducao;
  produto: string;
  metaHoraPadrao: number;
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

export default function Producao() {
  const today = new Date().toISOString().slice(0, 10);

  const [filtro, setFiltro] = useState<FiltroState>({
    data: today, etapa: 'Soldagem', produto: '4G SIMCOM', metaHoraPadrao: 40,
  });

  const [ficha, setFicha]       = useState<FichaDiariaCompleta | null>(null);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [novoOp, setNovoOp]     = useState('');
  const [addingOp, setAddingOp] = useState(false);

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

  // ── Carregar / criar ────────────────────────────────────────────────────────

  const carregarFicha = useCallback(async (criar = false) => {
    setErro(null); setLoading(true); setDraft({});
    try {
      const res = criar
        ? await window.api.getOrCreateFicha({
            data: filtro.data, produto: filtro.produto,
            etapa: filtro.etapa, metaHoraPadrao: filtro.metaHoraPadrao,
          })
        : await window.api.getFichaCompleta({
            data: filtro.data, produto: filtro.produto, etapa: filtro.etapa,
          });
      if (!res.success) throw new Error(res.error);
      setFicha((res.data as FichaDiariaCompleta | null) ?? null);
    } catch (e: any) { setErro(e.message ?? 'Erro'); }
    finally { setLoading(false); }
  }, [filtro]);

  // ── Operadores ──────────────────────────────────────────────────────────────

  const handleAddOp = async () => {
    if (!ficha || !novoOp.trim()) return;
    setAddingOp(true);
    try {
      const res = await window.api.addOperador({
        fichaId: ficha.id, operadorNome: novoOp.trim().toUpperCase(),
      });
      if (!res.success) { setErro(res.error ?? 'Erro'); return; }
      setFicha({
        ...ficha,
        operadores: [...ficha.operadores, { ...(res.data as any), registros: [] }],
      });
      setNovoOp('');
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

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e3a5f', flexShrink: 0, flexWrap: 'wrap' }}>

        {([
          { label: 'DATA',    node: <input type="date" value={filtro.data} onChange={e => setFiltro(f => ({ ...f, data: e.target.value }))} style={inp} /> },
          { label: 'PRODUTO', node: <input value={filtro.produto} onChange={e => setFiltro(f => ({ ...f, produto: e.target.value }))} placeholder="Produto" style={{ ...inp, width: 110 }} /> },
          { label: 'ETAPA',   node: (
            <select value={filtro.etapa} onChange={e => setFiltro(f => ({ ...f, etapa: e.target.value as EtapaProducao }))} style={inp}>
              {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )},
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
            <input
              value={novoOp} placeholder="Nome"
              onChange={e => setNovoOp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddOp()}
              style={{ ...inp, width: 110 }}
            />
            <button style={btnStyle('#2563eb')} onClick={handleAddOp} disabled={addingOp || !novoOp.trim()}>
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          Selecione os filtros e clique em "Abrir / Criar" para começar.
        </div>
      )}

      {/* ── Tabela ── */}
      {ficha && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 10px' }}>

          <div style={{
            background: '#1e3a5f', color: '#fff', padding: '5px 12px',
            borderRadius: '5px 5px 0 0', marginBottom: -1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.8 }}>
              CONTROLE DE PRODUÇÃO — {ficha.etapa.toUpperCase()} | {ficha.produto.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{ficha.data}</span>
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
