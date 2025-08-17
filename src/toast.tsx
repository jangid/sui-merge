import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = {
  show: (message: string, kind?: ToastKind, opts?: { duration?: number }) => void;
  success: (message: string, opts?: { duration?: number }) => void;
  error: (message: string, opts?: { duration?: number }) => void;
  info: (message: string, opts?: { duration?: number }) => void;
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

  const show = useCallback((message: string, kind: ToastKind = 'info', opts?: { duration?: number }) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, message }]);
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
          <div style={{ flex: 1 }}>{t.message}</div>
          <button onClick={() => onClose(t.id)} style={closeBtn} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'grid',
  gap: 8,
  zIndex: 9999,
};

const toastStyle: React.CSSProperties = {
  minWidth: 280,
  maxWidth: 420,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 8,
  padding: '10px 12px',
  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  color: '#111827',
  border: '1px solid transparent',
};

const toastSuccess: React.CSSProperties = { background: '#ecfdf5', borderColor: '#a7f3d0' };
const toastError: React.CSSProperties = { background: '#fef2f2', borderColor: '#fecaca' };
const toastInfo: React.CSSProperties = { background: '#eff6ff', borderColor: '#bfdbfe' };

const closeBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#374151',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
};

