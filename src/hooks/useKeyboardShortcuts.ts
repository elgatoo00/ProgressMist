import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/useUiStore';
import { NAV_ITEMS } from '@/components/layout/navigation';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * Raccourcis globaux :
 *  - Ctrl/⌘ + K ou / : recherche globale
 *  - N : nouvelle candidature
 *  - G puis une lettre : navigation (G D = Dashboard…)
 *  - ? : aide des raccourcis
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      // Ne pas intercepter quand une modale est ouverte
      if (ui.paletteOpen || ui.shortcutsOpen || document.querySelector('[role="dialog"]')) return;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const item = NAV_ITEMS.find((n) => n.key === e.key.toLowerCase());
        if (item) {
          e.preventDefault();
          navigate(item.to);
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          ui.setPaletteOpen(true);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          navigate('/applications/new');
          break;
        case '?':
          e.preventDefault();
          ui.setShortcutsOpen(true);
          break;
        case 'g':
        case 'G':
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);
}
