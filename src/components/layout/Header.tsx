import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS } from '@/types';
import { formatDate, getDaysRemaining } from '@/utils/helpers';
import {
  Bell,
  Menu,
  Sun,
  Moon,
  Search,
  Timer,
  Plus,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  onNotifsClick: () => void;
}

export default function Header({ onMenuClick, onNotifsClick }: HeaderProps) {
  const activeCategory = useAppStore((s) => s.activeCategory);
  const settings = useAppStore((s) => s.settings);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const applications = useAppStore((s) => s.applications);
  const updateApplication = useAppStore((s) => s.updateApplication);
  const addHistory = useAppStore((s) => s.addHistory);

  // First stage/alternance (we use the first one found for the countdown)
  const eligibleApps = useMemo(
    () => applications.filter((a) => a.category === 'stage' || a.category === 'alternance'),
    [applications]
  );

  // Nearest upcoming start date
  const nearestStart = useMemo(() => {
    return eligibleApps
      .filter((a) => a.dateDebut)
      .sort((a, b) => new Date(a.dateDebut!).getTime() - new Date(b.dateDebut!).getTime())
      .find((a) => getDaysRemaining(a.dateDebut)! >= 0) || null;
  }, [eligibleApps]);

  // Re-render every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const daysLeft = nearestStart ? getDaysRemaining(nearestStart.dateDebut) : null;

  // Format remaining time as months + days
  const formatRemaining = (days: number | null): string => {
    if (days === null || days < 0) return '';
    if (days === 0) return "Aujourd'hui";
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (months > 0 && remainingDays > 0) return `−${months} mois ${remainingDays} jours`;
    if (months > 0) return `−${months} mois`;
    return `−${days} jour${days > 1 ? 's' : ''}`;
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickDate, setPickDate] = useState('');

  const openPicker = () => {
    if (!nearestStart && eligibleApps.length === 0) return;
    setPickDate(nearestStart?.dateDebut || new Date().toISOString().split('T')[0]);
    setPickerOpen(true);
  };

  const saveDate = () => {
    const app = nearestStart || eligibleApps[0];
    if (!app) return; // No eligible app to attach to
    if (pickDate) {
      updateApplication(app.id, { dateDebut: pickDate });
      addHistory(app.id, 'Date de début', `Date de début fixée au ${formatDate(pickDate)}`);
    }
    setPickerOpen(false);
  };

  const deleteDate = () => {
    if (nearestStart) {
      updateApplication(nearestStart.id, { dateDebut: undefined });
      addHistory(nearestStart.id, 'Date de début', 'Date de début supprimée');
    }
    setPickerOpen(false);
  };

  return (
    <header className="glass border-b border-white/10 px-4 md:px-6 py-3 flex items-center gap-4 shrink-0 relative">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2">
        <Menu className="w-5 h-5" />
      </button>

      {/* Current category badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-subtle border border-theme-subtle">
        <span className="w-2 h-2 rounded-full bg-theme-light" />
        <span className="text-sm font-medium text-theme">
          {CATEGORY_LABELS[activeCategory]}
        </span>
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une candidature..."
            className="w-full glass-input pl-10 py-2 text-sm"
          />
        </div>
      </div>

      {/* Countdown — right after search bar */}
      <span className="relative shrink-0">
      {nearestStart ? (
        <button
          onClick={openPicker}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105
            ${daysLeft === 0
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : daysLeft !== null && daysLeft <= 7
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}
          title={`${nearestStart.entreprise} — ${nearestStart.poste}\n${formatDate(nearestStart.dateDebut!, 'dd MMMM yyyy')}`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span className="text-[10px] opacity-70">{formatDate(nearestStart.dateDebut!, 'dd/MM')}</span>
          <span>{formatRemaining(daysLeft)}</span>
        </button>
      ) : (
        <button
          onClick={openPicker}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          title={eligibleApps.length === 0 ? "Ajoutez d'abord un stage ou une alternance" : "Définir une date de début"}
        >
          <Plus className="w-3 h-3" />
          <span>Compte à rebours</span>
        </button>
      )}

      {/* Minimal popup — rendered in portal to body */}
      {pickerOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setPickerOpen(false)} />
          <div className="fixed right-4 top-12 z-[9999] p-4 rounded-2xl shadow-2xl border border-white/10 w-[260px] animate-scale-in bg-[var(--color-surface)]">
            {nearestStart && (
              <p className="text-[11px] text-gray-400 mb-2 truncate">
                {nearestStart.entreprise} — {nearestStart.poste}
              </p>
            )}
            <input
              type="date"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
              className="glass-input w-full text-xs py-2 mb-2"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button onClick={saveDate} className="btn-primary flex-1 text-xs py-2">
                Valider
              </button>
              {nearestStart && (
                <button
                  onClick={deleteDate}
                  className="btn-secondary text-xs py-2 px-3 text-red-400 border-red-500/20 hover:bg-red-500/10"
                  title="Réinitialiser le compte à rebours"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
      </span>

      <div className="flex-1 md:hidden" />

      {/* Theme toggle */}
      <button
        onClick={toggleDarkMode}
        className="btn-ghost p-2"
        title={settings.darkMode ? 'Mode clair' : 'Mode sombre'}
      >
        {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notifications */}
      <button
        onClick={onNotifsClick}
        className="btn-ghost p-2 relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
