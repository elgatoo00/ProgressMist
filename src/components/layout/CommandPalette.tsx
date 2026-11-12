import { useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { CATEGORY_LABELS } from '@/types';
import { matchesSearch } from '@/utils/filters';
import { formatDate } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';
import { CompanyAvatar, Kbd, StatusBadge } from '@/components/ui/primitives';
import { NAV_ITEMS } from './navigation';
import { Search, Plus, Bot, Moon, Sun, CornerDownLeft, ArrowRight, Keyboard } from 'lucide-react';

type Item =
  | { kind: 'app'; id: string; appId: string }
  | { kind: 'command'; id: string; label: string; icon: ElementType; hint?: string; run: () => void };

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const applications = useAppStore((s) => s.applications);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const darkMode = useAppStore((s) => s.settings.darkMode);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const close = () => setOpen(false);

  const commands = useMemo<Extract<Item, { kind: 'command' }>[]>(
    () => [
      { kind: 'command', id: 'new', label: 'Nouvelle candidature', icon: Plus, hint: 'N', run: () => navigate('/applications/new') },
      { kind: 'command', id: 'assistant', label: 'Nouvelle candidature avec l’assistant', icon: Bot, run: () => navigate('/applications/new/assistant') },
      ...NAV_ITEMS.map((n) => ({
        kind: 'command' as const,
        id: `nav-${n.to}`,
        label: `Aller à : ${n.label}`,
        icon: n.icon,
        hint: `G ${n.key.toUpperCase()}`,
        run: () => navigate(n.to),
      })),
      { kind: 'command', id: 'theme', label: darkMode ? 'Passer en mode clair' : 'Passer en mode sombre', icon: darkMode ? Sun : Moon, run: toggleDarkMode },
      { kind: 'command', id: 'shortcuts', label: 'Afficher les raccourcis clavier', icon: Keyboard, hint: '?', run: () => setShortcutsOpen(true) },
    ],
    [navigate, darkMode, toggleDarkMode, setShortcutsOpen]
  );

  const { appResults, commandResults } = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recent = [...applications]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      return { appResults: recent, commandResults: commands.slice(0, 2) };
    }
    const nq = normalize(q);
    return {
      appResults: applications.filter((a) => matchesSearch(a, q)).slice(0, 8),
      commandResults: commands.filter((c) => normalize(c.label).includes(nq)).slice(0, 5),
    };
  }, [query, applications, commands]);

  const items: Item[] = useMemo(
    () => [
      ...appResults.map((a) => ({ kind: 'app' as const, id: `app-${a.id}`, appId: a.id })),
      ...commandResults,
    ],
    [appResults, commandResults]
  );

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const runItem = (item: Item) => {
    close();
    if (item.kind === 'app') {
      const app = applications.find((a) => a.id === item.appId);
      if (app) setActiveCategory(app.category);
      navigate(`/applications/${item.appId}`);
    } else {
      item.run();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[index];
      if (item) runItem(item);
      else if (query.trim()) {
        close();
        navigate(`/applications?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  let cursor = -1;
  const rowClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
      active ? 'bg-theme-subtle' : 'hover:bg-[var(--color-surface-2)]'
    }`;

  return (
    <Modal open={open} onClose={close} size="lg" align="top" hideClose>
      <div className="-mx-5 -mb-5">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-border)] mt-1">
          <Search className="w-[18px] h-[18px] text-muted shrink-0" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher une entreprise, un poste, un contact…"
            className="flex-1 bg-transparent outline-none text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
            aria-label="Recherche globale"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
          />
          <Kbd>Échap</Kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {appResults.length > 0 && (
            <p className="eyebrow px-3 pt-2 pb-1.5">{query ? 'Candidatures' : 'Modifiées récemment'}</p>
          )}
          {appResults.map((app) => {
            cursor++;
            const i = cursor;
            return (
              <button
                key={app.id}
                data-index={i}
                role="option"
                aria-selected={index === i}
                onMouseMove={() => setIndex(i)}
                onClick={() => runItem(items[i])}
                className={rowClass(index === i)}
              >
                <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{app.poste}</p>
                  <p className="text-xs text-muted truncate">
                    {app.entreprise} · {CATEGORY_LABELS[app.category]} · {formatDate(app.dateCandidature)}
                  </p>
                </div>
                <StatusBadge status={app.status} size="sm" />
              </button>
            );
          })}

          {commandResults.length > 0 && <p className="eyebrow px-3 pt-3 pb-1.5">Actions</p>}
          {commandResults.map((c) => {
            cursor++;
            const i = cursor;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                data-index={i}
                role="option"
                aria-selected={index === i}
                onMouseMove={() => setIndex(i)}
                onClick={() => runItem(c)}
                className={rowClass(index === i)}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-surface-2)] text-muted">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 text-sm text-[var(--color-text)]">{c.label}</span>
                {c.hint && <Kbd>{c.hint}</Kbd>}
              </button>
            );
          })}

          {items.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text)]">Aucun résultat pour « {query} »</p>
              <p className="text-xs text-muted mt-1">Essayez le nom d’une entreprise, un poste, une ville ou une technologie.</p>
            </div>
          )}

          {query.trim() && appResults.length > 0 && (
            <button
              onClick={() => {
                close();
                navigate(`/applications?q=${encodeURIComponent(query.trim())}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg text-sm text-theme hover:bg-theme-subtle-05"
            >
              Voir tous les résultats dans Candidatures
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 h-10 border-t border-[var(--color-border)] text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
          <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft className="w-3 h-3" /></Kbd> ouvrir</span>
        </div>
      </div>
    </Modal>
  );
}
