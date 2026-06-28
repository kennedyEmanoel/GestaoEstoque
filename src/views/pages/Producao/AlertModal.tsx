import { useEffect, useRef } from 'react';

export interface AlertData {
  mensagem: string;
  imagemBase64?: string;
  mimeType?: string;
}

interface Props {
  alert: AlertData;
  onClose: () => void;
}

export default function AlertModal({ alert, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const imgSrc = alert.imagemBase64
    ? `data:${alert.mimeType ?? 'image/png'};base64,${alert.imagemBase64}`
    : null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'alertaEntrada 0.2s ease',
      }}
    >
      <div style={{
        background: '#0f2542',
        border: '2px solid #f59e0b',
        borderRadius: 16,
        maxWidth: 680,
        width: '90%',
        boxShadow: '0 0 40px rgba(245,158,11,0.4)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: '#f59e0b',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚠</span>
            <span style={{ fontWeight: 900, fontSize: 14, color: '#1c1917', letterSpacing: 1.5 }}>
              AVISO
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#1c1917', fontSize: 20, lineHeight: 1, fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{
            color: '#f1f5f9', fontSize: 17, fontWeight: 600,
            lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {alert.mensagem}
          </p>

          {imgSrc && (
            <div style={{
              borderRadius: 10, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              maxHeight: 360,
            }}>
              <img
                src={imgSrc}
                alt="Imagem do aviso"
                style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', display: 'block' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 28px', borderRadius: 6, border: 'none',
              background: '#f59e0b', color: '#1c1917',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            OK, ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
}
