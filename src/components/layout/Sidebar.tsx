import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/types';
import { getRelancesDue } from '@/utils/helpers';
import { CATEGORY_LUCIDE, Kbd } from '@/components/ui/primitives';
import { NAV_GROUPS } from './navigation';
import { X, Sparkles, Plus, Search } from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const applications = useAppStore((s) => s.applications);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    applications.forEach((a) => (c[a.category] = (c[a.category] || 0) + 1));
    return c;
  }, [applications]);

  const dueCount = useMemo(
    () => getRelancesDue(applications.filter((a) => a.category === activeCategory)).length,
    [applications, activeCategory]
  );

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center justify-between shrink-0">
        <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-theme-solid flex items-center justify-center shadow-theme">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold font-display text-[var(--color-text)] tracking-tight">ProgressMist</p>
            <p className="text-[11px] text-muted">Suivi de candidatures</p>
          </div>
        </NavLink>
        <button onClick={onClose} className="lg:hidden icon-btn" aria-label="Fermer le menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Recherche */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            onClose();
            setPaletteOpen(true);
          }}
          className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--color-border)] text-sm text-muted hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Rechercher…</span>
          <Kbd>{isMac ? '⌘' : 'Ctrl'} K</Kbd>
        </button>
      </div>

      {/* Catégories */}
      <div className="px-3 pt-3 pb-1">
        <p className="eyebrow px-2 mb-2">Type de contrat</p>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_LUCIDE[cat];
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={active}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium border transition-colors duration-150
                  ${active
                    ? 'bg-theme-subtle border-theme-subtle-30 text-theme'
                    : 'border-transparent text-muted hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                  }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left truncate">{CATEGORY_LABELS[cat]}</span>
                <span className="text-[11px] tabular-nums opacity-70">{counts[cat] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5" aria-label="Navigation principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="eyebrow px-2 mb-1.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                      ${isActive
                        ? 'bg-theme-subtle text-theme before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-[var(--color-primary)] before:-ml-3'
                        : 'text-muted hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                      }`
                    }
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{link.label}</span>
                    {link.to === '/dashboard' && dueCount > 0 && (
                      <span
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center justify-center tabular-nums"
                        title={`${dueCount} relance(s) à effectuer`}
                      >
                        {dueCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Nouvelle candidature */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <NavLink to="/applications/new" onClick={onClose} className="btn-primary w-full btn-sm py-2.5">
          <Plus className="w-4 h-4" />
          Nouvelle candidature
          <span className="ml-auto kbd !bg-white/15 !border-white/20 !text-white/90">N</span>
        </NavLink>
      </div>
    </div>
  );
}
