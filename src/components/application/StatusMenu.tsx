import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import type { ApplicationStatus } from '@/types';
import { ALL_STATUSES, STATUS_DOT_COLORS, STATUS_LABELS } from '@/types';

interface MenuItem {
  label: string;
  icon?: typeof Check;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** Menu déroulant positionné dans un portail (n'est pas coupé par les conteneurs à overflow). */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: (props: { onClick: (e: React.MouseEvent) => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  label?: string;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; right: number; up: boolean } | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    const onScroll = () => close();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    document.querySelector('main')?.addEventListener('scroll', onScroll, { passive: true });
    window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      document.querySelector('main')?.removeEventListener('scroll', onScroll);
    };
  }, [pos]);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pos) return close();
    anchor.current = e.currentTarget as HTMLElement;
    const r = anchor.current.getBoundingClientRect();
    const up = r.bottom + 300 > window.innerHeight && r.top > 300;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, right: window.innerWidth - r.right, up });
  };

  return (
    <>
      {trigger({ onClick, 'aria-expanded': !!pos, 'aria-haspopup': 'menu' })}
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[8000]" onClick={(e) => { e.stopPropagation(); close(); }} />
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[8001] min-w-[190px] p-1 rounded-xl surface-raised animate-modal-in"
              style={{
                top: pos.up ? undefined : pos.top,
                bottom: pos.up ? window.innerHeight - pos.top : undefined,
                ...(align === 'right' ? { right: Math.max(8, pos.right) } : { left: Math.max(8, pos.left) }),
              }}
            >
              {children(close)}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function MenuItems({ items, close }: { items: MenuItem[]; close: () => void }) {
  return (
    <>
      {items.filter((i) => !i.hidden).map((item) => (
        <button
          key={item.label}
          role="menuitem"
          onClick={() => {
            close();
            item.onSelect();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left outline-none transition-colors
            ${item.danger ? 'text-red-500 dark:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus:bg-[var(--color-surface-2)]'}`}
        >
          {item.icon && <item.icon className="w-4 h-4 opacity-70" />}
          {item.label}
        </button>
      ))}
    </>
  );
}

export function StatusOptions({ current, onSelect, close }: { current: ApplicationStatus; onSelect: (s: ApplicationStatus) => void; close: () => void }) {
  return (
    <>
      <p className="eyebrow px-3 pt-1.5 pb-1">Changer le statut</p>
      {ALL_STATUSES.map((s) => (
        <button
          key={s}
          role="menuitem"
          onClick={() => {
            close();
            onSelect(s);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left outline-none hover:bg-[var(--color-surface-2)] focus:bg-[var(--color-surface-2)]"
        >
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s]}`} />
          <span className={current === s ? 'font-medium text-theme' : 'text-[var(--color-text)]'}>{STATUS_LABELS[s]}</span>
          {current === s && <Check className="w-3.5 h-3.5 ml-auto text-theme" />}
        </button>
      ))}
    </>
  );
}
