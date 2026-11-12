import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState } from '@/components/ui/primitives';
import { toast } from '@/components/ui/Toast';
import { X, Bell, Calendar, RefreshCw, AlertTriangle, MessageSquare, CheckCheck } from 'lucide-react';

const iconMap = {
  relance: RefreshCw,
  entretien: Calendar,
  reponse: MessageSquare,
  oublie: AlertTriangle,
  inactivite: AlertTriangle,
};

const colorMap = {
  relance: 'text-purple-500 dark:text-purple-400 bg-purple-500/10',
  entretien: 'text-orange-500 dark:text-orange-400 bg-orange-500/10',
  reponse: 'text-green-500 dark:text-green-400 bg-green-500/10',
  oublie: 'text-red-500 dark:text-red-400 bg-red-500/10',
  inactivite: 'text-amber-500 dark:text-amber-400 bg-amber-500/10',
};

export default function NotificationsPanel() {
  const open = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);
  const notifications = useAppStore((s) => s.notifications);
  const applications = useAppStore((s) => s.applications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const performRelance = useAppStore((s) => s.performRelance);
  const navigate = useNavigate();
  const onClose = () => setOpen(false);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        aria-label="Notifications"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full surface-raised !border-y-0 !border-r-0 flex flex-col">
          <div className="h-16 px-4 border-b border-[var(--color-border)] flex items-center gap-2 shrink-0">
            <Bell className="w-4 h-4 text-theme" />
            <h2 className="font-semibold text-[var(--color-text)] flex-1">
              Notifications
              {unread > 0 && <span className="ml-2 text-xs font-medium text-muted">{unread} non lue{unread > 1 ? 's' : ''}</span>}
            </h2>
            {unread > 0 && (
              <button onClick={markAllNotificationsRead} className="icon-btn" title="Tout marquer comme lu" aria-label="Tout marquer comme lu">
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="icon-btn" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Vous êtes à jour"
                description="Les relances à effectuer et les entretiens du lendemain apparaîtront ici."
              />
            ) : (
              <ul className="space-y-1">
                {notifications.map((n) => {
                  const Icon = iconMap[n.type];
                  const app = n.applicationId ? applications.find((a) => a.id === n.applicationId) : undefined;
                  return (
                    <li key={n.id}>
                      <div
                        className={`group w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3
                          ${n.read ? 'opacity-60 hover:opacity-100 hover:bg-[var(--color-surface-2)]' : 'bg-theme-subtle-05 hover:bg-theme-subtle'}`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[n.type]}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (app) {
                              navigate(`/applications/${app.id}`);
                              onClose();
                            }
                          }}
                        >
                          <p className="text-sm text-[var(--color-text)] leading-snug">{n.message}</p>
                          <p className="text-xs text-muted mt-1">{formatRelativeDate(n.date)}</p>
                        </button>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-theme-solid mt-1.5 shrink-0" />}
                      </div>
                      {n.type === 'relance' && app && !n.read && (
                        <div className="pl-14 pr-3 pb-2 -mt-1">
                          <button
                            className="text-xs font-medium text-theme hover:underline"
                            onClick={() => {
                              performRelance(app.id);
                              markNotificationRead(n.id);
                              toast.success('Relance enregistrée', { description: `${app.entreprise} — ${app.poste}` });
                            }}
                          >
                            Marquer comme relancée
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-[var(--color-border)]">
              <button onClick={clearNotifications} className="w-full btn-secondary btn-sm">
                Effacer toutes les notifications
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
