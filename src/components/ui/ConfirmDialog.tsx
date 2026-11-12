import { create } from 'zustand';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

interface ConfirmStore {
  options: ConfirmOptions | null;
  resolve: ((v: boolean) => void) | null;
  open: (o: ConfirmOptions) => Promise<boolean>;
  close: (v: boolean) => void;
}

const useConfirmStore = create<ConfirmStore>((set, get) => ({
  options: null,
  resolve: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false);
      set({ options, resolve });
    }),
  close: (v) => {
    get().resolve?.(v);
    set({ options: null, resolve: null });
  },
}));

/** Ouvre une boîte de confirmation et renvoie true si l'utilisateur confirme. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open(options);
}

export function ConfirmDialogHost() {
  const { options, close } = useConfirmStore();
  const danger = options?.tone !== 'default';
  return (
    <Modal open={!!options} onClose={() => close(false)} size="sm" hideClose>
      {options && (
        <div className="pt-5">
          <div className="flex gap-4">
            {danger && (
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--color-text)]">{options.title}</h2>
              {options.message && <p className="text-sm text-muted mt-1.5 leading-relaxed">{options.message}</p>}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
            <button className="btn-secondary btn-sm" onClick={() => close(false)}>
              {options.cancelLabel || 'Annuler'}
            </button>
            <button
              data-autofocus
              className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
              onClick={() => close(true)}
            >
              {options.confirmLabel || 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
