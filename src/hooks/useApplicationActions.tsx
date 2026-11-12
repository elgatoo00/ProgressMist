import { useCallback, useState } from 'react';
import type { Application, ApplicationStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';

/**
 * Actions courantes sur une candidature (changement de statut, relance, suppression avec annulation),
 * partagées par les vues liste, tableau et kanban.
 */
export function useApplicationActions() {
  const setStatus = useAppStore((s) => s.setStatus);
  const performRelance = useAppStore((s) => s.performRelance);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const restoreApplication = useAppStore((s) => s.restoreApplication);
  const [celebration, setCelebration] = useState<'acceptee' | 'refusee' | null>(null);

  const changeStatus = useCallback(
    (app: Application, status: ApplicationStatus, source?: string) => {
      if (app.status === status) return;
      setStatus(app.id, status, source);
      if (status === 'acceptee' || status === 'refusee') setCelebration(status);
      else toast.success(`${app.entreprise} → ${STATUS_LABELS[status]}`);
    },
    [setStatus]
  );

  const relance = useCallback(
    (app: Application) => {
      performRelance(app.id);
      toast.success('Relance enregistrée', { description: `${app.entreprise} — ${app.poste}` });
    },
    [performRelance]
  );

  const remove = useCallback(
    async (app: Application) => {
      const ok = await confirmAction({
        title: 'Supprimer cette candidature ?',
        message: `« ${app.poste} — ${app.entreprise} » sera supprimée, ainsi que ses échanges et pièces jointes.`,
        confirmLabel: 'Supprimer',
      });
      if (!ok) return false;
      const index = useAppStore.getState().applications.findIndex((a) => a.id === app.id);
      deleteApplication(app.id);
      toast.success('Candidature supprimée', {
        action: { label: 'Annuler', onClick: () => restoreApplication(app, index) },
        duration: 7000,
      });
      return true;
    },
    [deleteApplication, restoreApplication]
  );

  const celebrationNode = (
    <CelebrationOverlay show={!!celebration} type={celebration ?? 'acceptee'} onComplete={() => setCelebration(null)} />
  );

  return { changeStatus, relance, remove, celebrationNode };
}
