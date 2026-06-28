interface Props {
  onSelecionar: (tipo: 'detalhado' | 'geral') => void;
  onFechar: () => void;
}

export default function SeletorDashboard({ onSelecionar, onFechar }: Props) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'alertaEntrada 0.18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f2542',
          border: '1px solid #1e3a5f',
          borderRadius: 16,
          padding: '28px 32px',
          width: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', letterSpacing: 0.5 }}>
              Abrir Painel de Produção
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Escolha o tipo de visualização
            </div>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <OpcaoCard
            titulo="Dashboard Detalhado"
            descricao="Visualização completa com desempenho individual de cada operador, gráficos e saldo por hora."
            icone="📊"
            cor="#2563eb"
            corBorda="#3b82f6"
            onClick={() => onSelecionar('detalhado')}
          />
          <OpcaoCard
            titulo="Dashboard Geral"
            descricao="Visão executiva por etapa de produção: quantidade realizada e eficiência total por faixa de horário."
            icone="📈"
            cor="#059669"
            corBorda="#34d399"
            onClick={() => onSelecionar('geral')}
          />
        </div>
      </div>

      <style>{`
        @keyframes alertaEntrada {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function OpcaoCard({ titulo, descricao, icone, cor, corBorda, onClick }: {
  titulo: string; descricao: string; icone: string;
  cor: string; corBorda: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: 'transparent',
        border: `2px solid ${corBorda}33`,
        borderRadius: 12,
        padding: '20px 16px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = corBorda;
        (e.currentTarget as HTMLButtonElement).style.background = `${cor}18`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${corBorda}33`;
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <div style={{ fontSize: 32, lineHeight: 1 }}>{icone}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{titulo}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.55 }}>{descricao}</div>
      <div style={{
        marginTop: 4, alignSelf: 'flex-start',
        padding: '5px 14px', borderRadius: 6,
        background: cor, color: '#fff',
        fontWeight: 700, fontSize: 11,
      }}>
        Abrir →
      </div>
    </button>
  );
}
