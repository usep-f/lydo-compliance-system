import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  /** Show a toast. Defaults to 'info' if type is omitted. */
  addToast: (message: string, type?: ToastType) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Call inside any component that is a descendant of <ToastProvider> to get
 * the `addToast` function.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

// ---------------------------------------------------------------------------
// Design tokens (mirror index.css design system)
// ---------------------------------------------------------------------------

const DURATION_MS = 4000;

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '!',
  info:    'i',
};

const ACCENT: Record<ToastType, string> = {
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#4F46E5',
};

const BG: Record<ToastType, string> = {
  success: '#F0FDF4',
  error:   '#FEF2F2',
  warning: '#FFFBEB',
  info:    '#EEF2FF',
};

// ---------------------------------------------------------------------------
// Provider + Renderer
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => removeToast(id), DURATION_MS);
    timers.current.set(id, timer);
  }, [removeToast]);

  const portal = createPortal(
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className="lydo-toast"
          style={{
            pointerEvents: 'all',
            background: BG[toast.type],
            borderLeft: `4px solid ${ACCENT[toast.type]}`,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(24,24,27,0.1), 0 4px 6px -4px rgba(24,24,27,0.06)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '380px',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'var(--font-body)',
          }}
        >
          {/* Coloured icon circle */}
          <span style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: ACCENT[toast.type],
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800,
            flexShrink: 0,
            marginTop: '1px',
          }}>
            {ICONS[toast.type]}
          </span>

          {/* Message */}
          <span style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: 500,
            color: '#18181B',
            lineHeight: 1.5,
          }}>
            {toast.message}
          </span>

          {/* Dismiss button */}
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717A',
              fontSize: '18px',
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
              marginTop: '-2px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#18181B')}
            onMouseLeave={e => (e.currentTarget.style.color = '#71717A')}
          >
            ×
          </button>

          {/* Auto-dismiss progress bar */}
          <div
            className="lydo-toast-progress"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              background: ACCENT[toast.type],
              opacity: 0.5,
              '--toast-duration': `${DURATION_MS}ms`,
            } as React.CSSProperties}
          />
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}
