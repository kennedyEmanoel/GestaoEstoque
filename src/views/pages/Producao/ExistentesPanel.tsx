import type { CSSProperties } from 'react';
import type { CartaoDoDia, DiaComRegistro } from '../../../shared/types';
import { corEtapa } from './cores';

interface ExistentesPanelProps {
  dataSelecionada: string;
  dias: DiaComRegistro[];
  cartoes: CartaoDoDia[];
  carregando: boolean;
  onEscolherDia: (data: string) => void;
  onAbrir: (fichaId: number) => void;
}

function pct(realizado: number, meta: number): number | null {
  return meta > 0 ? (realizado / meta) * 100 : null;
}

function corPct(p: number | null): string {
  if (p === null) return '#94a3b8';
  if (p >= 100) return '#16a34a';
  if (p >= 80) return '#d97706';
  return '#dc2626';
}

/** "2026-10-11" → "11/10" e "dom." (meio-dia local evita virar o dia por fuso). */
function rotuloDia(data: string): { curto: string; semana: string } {
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia, 12);
  return {
    curto: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
    semana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
  };
}

/**
 * O que já existe: faixa com os últimos dias que têm cartões e a lista de cartões do dia escolhido.
 * Aparece quando nenhum cartão está aberto.
 */
export default function ExistentesPanel({
  dataSelecionada, dias, cartoes, carregando, onEscolherDia, onAbrir,
}: ExistentesPanelProps) {
  const rotuloSelecionado = rotuloDia(dataSelecionada);
  const totalRealizado = cartoes.reduce((s, c) => s + c.totalRealizado, 0);
  const totalMeta = cartoes.reduce((s, c) => s + c.totalMeta, 0);
  const pctDia = pct(totalRealizado, totalMeta);

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Dias com registro */}
      <section>
        <div style={titulo}>DIAS COM REGISTRO</div>
        {dias.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Ainda não há registros. Escolha os filtros acima e clique em "Abrir / Criar".</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {dias.map((d) => {
              const r = rotuloDia(d.data);
              const p = pct(d.totalRealizado, d.totalMeta);
              const ativo = d.data === dataSelecionada;
              return (
                <button
                  key={d.data}
                  onClick={() => onEscolherDia(d.data)}
                  style={{
                    flex: '0 0 auto', minWidth: 104, textAlign: 'left', cursor: 'pointer',
                    padding: '8px 10px', borderRadius: 8, background: '#fff',
                    border: ativo ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    boxShadow: ativo ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{r.semana}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{r.curto}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {d.cartoes} {d.cartoes === 1 ? 'cartão' : 'cartões'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: corPct(p) }}>{p !== null ? `${p.toFixed(0)}%` : '—'}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cartões do dia */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ ...titulo, marginBottom: 0 }}>
            CARTÕES DE {rotuloSelecionado.semana.toUpperCase()} {rotuloSelecionado.curto}
          </div>
          {cartoes.length > 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {cartoes.length} {cartoes.length === 1 ? 'cartão' : 'cartões'} · {totalRealizado} de {totalMeta}
              {pctDia !== null && <b style={{ color: corPct(pctDia), marginLeft: 6 }}>{pctDia.toFixed(1)}%</b>}
            </div>
          )}
        </div>

        {carregando ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Carregando...</div>
        ) : cartoes.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Nenhum cartão neste dia. Escolha produto e etapa acima e clique em "Abrir / Criar" para começar um novo.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {cartoes.map((c) => {
              const cor = corEtapa(c);
              const p = c.pctAtingimento;
              return (
                <button
                  key={c.fichaId}
                  onClick={() => onAbrir(c.fichaId)}
                  title="Abrir este cartão"
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden',
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ background: cor.bg, color: cor.text, padding: '8px 12px' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>{c.rotulo.toUpperCase()}</div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{c.produto}</div>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      <div>{c.operadores} {c.operadores === 1 ? 'operador' : 'operadores'}</div>
                      <div><b style={{ color: '#0f172a' }}>{c.totalRealizado}</b> de {c.totalMeta}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: corPct(p) }}>{p !== null ? `${p.toFixed(0)}%` : '—'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const titulo: CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, marginBottom: 8,
};
