import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { formatDate, getDaysRemaining } from '@/utils/helpers';
import { Kbd } from '@/components/ui/primitives';
import { toast } from '@/components/ui/Toast';
import { getPageTitle } from './navigation';
import { Bell, Menu, Sun, Moon, Search, Timer, Plus, Keyboard } from 'lucide-react';

export default function Header() {
  const settings = useAppStore((s) => s.settings);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const applications = useAppStore((s) => s.applications);
  const updateApplication = useAppStore((s) => s.updateApplication);
  const addHistory = useAppStore((s) => s.addHistory);
  const { setPaletteOpen, setNotificationsOpen, notificationsOpen, setMobileNavOpen, setShortcutsOpen } = useUiStore();
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  // Stages / alternances éligibles au compte à rebours
  const eligibleApps = useMemo(
    () => applications.filter((a) => a.category === 'stage' || a.category === 'alternance'),
    [applications]
  );

  // Re-render every minute
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Date de début la plus proche
  const nearestStart = useMemo(() => {
    void tick;
    return (
      eligibleApps
        .filter((a) => a.dateDebut && (getDaysRemaining(a.dateDebut) ?? -1) >= 0)
        .sort((a, b) => (getDaysRemaining(a.dateDebut) ?? 0) - (getDaysRemaining(b.dateDebut) ?? 0))[0] || null
    );
  }, [eligibleApps, tick]);

  const daysLeft = nearestStart ? getDaysRemaining(nearestStart.dateDebut) : null;

  const formatRemaining = (days: number | null): string => {
    if (days === null || days < 0) return '';
    if (days === 0) return "Aujourd'hui";
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (months > 0 && remainingDays > 0) return `J-${days} · ${months} mois ${remainingDays} j`;
    if (months > 0) return `J-${days} · ${months} mois`;
    return `J-${days}`;
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickDate, setPickDate] = useState('');

  const openPicker = () => {
    if (eligibleApps.length === 0) {
      toast.info('Aucun stage ou alternance', {
        description: "Ajoutez d'abord un stage ou une alternance pour suivre un compte à rebours.",
      });
      return;
    }
    setPickDate(nearestStart?.dateDebut || new Date().toISOString().split('T')[0]);
    setPickerOpen(true);
  };

  const saveDate = () => {
    const app = nearestStart || eligibleApps[0];
    if (!app) return;
    if (pickDate) {
      updateApplication(app.id, { dateDebut: pickDate });
      addHistory(app.id, 'Date de début', `Date de début fixée au ${formatDate(pickDate)}`);
      toast.success('Compte à rebours mis à jour', { description: `${app.entreprise} — début le ${formatDate(pickDate)}` });
    }
    setPickerOpen(false);
  };

  const deleteDate = () => {
    if (nearestStart) {
      updateApplication(nearestStart.id, { dateDebut: undefined });
      addHistory(nearestStart.id, 'Date de début', 'Date de début supprimée');
      toast.info('Compte à rebours réinitialisé');
    }
    setPickerOpen(false);
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center gap-3 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md sticky top-0 z-30">
      <button onClick={() => setMobileNavOpen(true)} className="lg:hidden icon-btn -ml-1" aria-label="Ouvrir le menu">
        <Menu className="w-5 h-5" />
      </button>

      <h2 className="text-sm font-semibold text-[var(--color-text)] truncate lg:hidden">{title}</h2>

      {/* Recherche globale */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 w-full max-w-sm px-3 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-sm text-muted hover:border-[rgba(var(--color-primary-rgb),0.4)] transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Rechercher une candidature, une page…</span>
        <Kbd>{isMac ? '⌘' : 'Ctrl'} K</Kbd>
      </button>

      <div className="flex-1" />

      {/* Compte à rebours */}
      <span className="relative shrink-0">
        {nearestStart ? (
          <button
            onClick={openPicker}
            className={`hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors
              ${daysLeft === 0
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25'
                : daysLeft !== null && daysLeft <= 7
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              }`}
            title={`${nearestStart.entreprise} — ${nearestStart.poste}\nDébut le ${formatDate(nearestStart.dateDebut!, 'dd MMMM yyyy')}`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="opacity-70">{formatDate(nearestStart.dateDebut!, 'dd/MM')}</span>
            <span className="tabular-nums">{formatRemaining(daysLeft)}</span>
          </button>
        ) : (
          <button
            onClick={openPicker}
            className="hidden sm:flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
            title="Définir une date de début de stage ou d'alternance"
          >
            <Plus className="w-3 h-3" />
            <span>Compte à rebours</span>
          </button>
        )}

        {pickerOpen &&
          createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setPickerOpen(false)} />
              <div className="fixed right-4 top-16 z-[9999] p-4 rounded-xl w-[280px] animate-modal-in surface-raised">
                <p className="text-sm font-medium text-[var(--color-text)]">Date de début</p>
                <p className="text-xs text-muted mb-3 truncate">
                  {(nearestStart || eligibleApps[0])?.entreprise} — {(nearestStart || eligibleApps[0])?.poste}
                </p>
                <input
                  type="date"
                  value={pickDate}
                  onChange={(e) => setPickDate(e.target.value)}
                  className="glass-input w-full text-sm py-2 mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDate();
                    if (e.key === 'Escape') setPickerOpen(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  <button onClick={saveDate} className="btn-primary btn-sm flex-1">
                    Valider
                  </button>
                  {nearestStart && (
                    <button onClick={deleteDate} className="btn-danger-ghost" title="Réinitialiser le compte à rebours">
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </>,
            document.body
          )}
      </span>

      <button onClick={() => setPaletteOpen(true)} className="md:hidden icon-btn" aria-label="Rechercher">
        <Search className="w-[18px] h-[18px]" />
      </button>

      <button
        onClick={() => setShortcutsOpen(true)}
        className="hidden lg:inline-flex icon-btn"
        title="Raccourcis clavier (?)"
        aria-label="Raccourcis clavier"
      >
        <Keyboard className="w-[18px] h-[18px]" />
      </button>

      <button
        onClick={toggleDarkMode}
        className="icon-btn"
        title={settings.darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        aria-label={settings.darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
      >
        {settings.darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      <button
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        className="icon-btn relative"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-[var(--color-bg)] tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
