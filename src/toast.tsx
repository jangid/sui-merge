import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';
type ToastLink = { label: string; href: string; target?: string };
type Toast = { id: number; kind: ToastKind; message: string; link?: ToastLink };
type ToastContextValue = {
  show: (message: string, kind?: ToastKind, opts?: { duration?: number; link?: ToastLink }) => void;
  success: (message: string, opts?: { duration?: number; link?: ToastLink }) => void;
  error: (message: string, opts?: { duration?: number; link?: ToastLink }) => void;
  info: (message: string, opts?: { duration?: number; link?: ToastLink }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message: string, kind: ToastKind = 'info', opts?: { duration?: number; link?: ToastLink }) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, message, link: opts?.link }]);
    const duration = opts?.duration ?? 4200;
    window.setTimeout(() => remove(id), duration);
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m, o) => show(m, 'success', o),
    error: (m, o) => show(m, 'error', o),
    info: (m, o) => show(m, 'info', o),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div style={containerStyle}>
      {toasts.map((t) => (
        <div key={t.id} style={{ ...toastStyle, ...(t.kind === 'success' ? toastSuccess : t.kind === 'error' ? toastError : toastInfo) }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: t.link ? 4 : 0 }}>{t.message}</div>
            {t.link && (
              <a href={t.link.href} target={t.link.target ?? '_blank'} rel="noreferrer" style={linkStyle}>
                {t.link.label}
              </a>
            )}
          </div>
          <button onClick={() => onClose(t.id)} style={closeBtn} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column-reverse',
  gap: 8,
  zIndex: 9999,
};

const toastStyle: React.CSSProperties = {
  minWidth: 300,
  maxWidth: 460,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  borderRadius: 12,
  padding: '12px 14px',
  boxShadow: '0 10px 20px rgba(0,0,0,0.12), 0 6px 8px rgba(0,0,0,0.06)',
  color: '#111827',
  border: '1px solid #e5e7eb',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'saturate(180%) blur(8px)',
};

const toastSuccess: React.CSSProperties = { borderColor: '#86efac' };
const toastError: React.CSSProperties = { borderColor: '#fca5a5' };
const toastInfo: React.CSSProperties = { borderColor: '#bfdbfe' };

const closeBtn: React.CSSProperties = {
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid #d1d5db',
  color: '#374151',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  width: 24,
  height: 24,
  borderRadius: 9999,
  display: 'grid',
  placeItems: 'center',
};

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 2,
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
};
