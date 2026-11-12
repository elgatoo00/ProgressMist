import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let counter = 0;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { duration: 4000, ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

type ToastOptions = { description?: string; action?: ToastItem['action']; duration?: number };

const make = (tone: ToastTone) => (title: string, opts: ToastOptions = {}) =>
  useToastStore.getState().push({ tone, title, ...opts });

/** API impérative : toast.success('Enregistré'), toast.error(...), etc. */
export const toast = {
  success: make('success'),
  error: make('error'),
  info: make('info'),
  warning: make('warning'),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
};

const toneStyles: Record<ToastTone, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-500 dark:text-green-400' },
  error: { icon: XCircle, color: 'text-red-500 dark:text-red-400' },
  info: { icon: Info, color: 'text-theme' },
  warning: { icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400' },
};

function ToastView({ t }: { t: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { icon: Icon, color } = toneStyles[t.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(t.id), t.duration);
    return () => window.clearTimeout(timer);
  }, [t.id, t.duration, dismiss]);

  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto w-full sm:w-[360px] surface-raised rounded-xl px-4 py-3 flex items-start gap-3 animate-toast-in"
    >
      <Icon className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{t.title}</p>
        {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
      </div>
      {t.action && (
        <button
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
          className="text-xs font-semibold text-theme hover:underline shrink-0 mt-0.5"
        >
          {t.action.label}
        </button>
      )}
      <button onClick={() => dismiss(t.id)} className="icon-btn -mr-1.5 -mt-0.5 w-7 h-7" aria-label="Fermer la notification">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="fixed z-[10000] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastView key={t.id} t={t} />
      ))}
    </div>
  );
}
