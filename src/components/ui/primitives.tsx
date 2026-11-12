import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { GraduationCap, Repeat, Briefcase, CalendarClock, Layers } from 'lucide-react';
import type { ApplicationStatus, ContractCategory } from '@/types';
import { ALL_CATEGORIES, CATEGORY_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, STATUS_LABELS } from '@/types';
import { initials } from '@/utils/helpers';
import { safeImageSrc } from '@/utils/security';

// ---------------------------------------------------------------------------
// Catégories
// ---------------------------------------------------------------------------

export const CATEGORY_LUCIDE: Record<ContractCategory, ElementType> = {
  stage: GraduationCap,
  alternance: Repeat,
  cdi: Briefcase,
  cdd: CalendarClock,
};

interface CategoryTabsProps<T extends ContractCategory | 'all'> {
  value: T;
  onChange: (c: T) => void;
  counts?: Partial<Record<ContractCategory | 'all', number>>;
  includeAll?: boolean;
  className?: string;
}

/** Sélecteur segmenté de catégorie de contrat, partagé par toutes les pages. */
export function CategoryTabs<T extends ContractCategory | 'all'>({
  value,
  onChange,
  counts,
  includeAll,
  className = '',
}: CategoryTabsProps<T>) {
  const items: (ContractCategory | 'all')[] = includeAll ? ['all', ...ALL_CATEGORIES] : ALL_CATEGORIES;
  return (
    <div role="tablist" aria-label="Type de contrat" className={`segmented ${className}`}>
      {items.map((cat) => {
        const Icon = cat === 'all' ? Layers : CATEGORY_LUCIDE[cat];
        const active = value === cat;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(cat as T)}
            className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5 hidden sm:block" />
            {cat === 'all' ? 'Tout' : CATEGORY_LABELS[cat]}
            {counts && counts[cat] !== undefined && (
              <span className={`tabular-nums text-[11px] ${active ? 'opacity-80' : 'text-muted'}`}>{counts[cat]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statut
// ---------------------------------------------------------------------------

export function StatusBadge({ status, size = 'md' }: { status: ApplicationStatus; size?: 'sm' | 'md' }) {
  return (
    <span className={`badge ${STATUS_COLORS[status]} ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar entreprise
// ---------------------------------------------------------------------------

export function CompanyAvatar({ name, logo, size = 'md' }: { name: string; logo?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-8 h-8 text-xs rounded-lg', md: 'w-10 h-10 text-sm rounded-xl', lg: 'w-14 h-14 text-xl rounded-2xl' }[size];
  return (
    <div className={`${dims} shrink-0 flex items-center justify-center font-semibold text-theme bg-theme-subtle border border-theme-subtle overflow-hidden`}>
      {safeImageSrc(logo) ? <img src={safeImageSrc(logo)} alt="" className="w-full h-full object-cover" /> : initials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// En-tête de page
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ElementType;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-theme-subtle border border-theme-subtle flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-theme" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="section-title truncate">{title}</h1>
          {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// États vides
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: ElementType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
      <div className="relative mb-4">
        <div className={`${compact ? 'w-11 h-11' : 'w-14 h-14'} rounded-2xl bg-theme-subtle border border-theme-subtle flex items-center justify-center`}>
          <Icon className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-theme`} />
        </div>
        {!compact && (
          <>
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-theme-subtle-30" />
            <span className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full bg-theme-subtle-30" />
          </>
        )}
      </div>
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-[var(--color-text)]`}>{title}</h3>
      {description && <p className={`text-sm text-muted mt-1 max-w-sm ${compact ? 'text-xs' : ''}`}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carte de section
// ---------------------------------------------------------------------------

export function Card({
  title,
  icon: Icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
  description,
}: {
  title?: ReactNode;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  description?: ReactNode;
}) {
  return (
    <section className={`card min-w-0 ${className}`}>
      {title && (
        <header className="flex items-center gap-2 px-5 pt-4 pb-3">
          {Icon && <Icon className="w-4 h-4 text-muted" />}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={title ? `px-5 pb-5 ${bodyClassName}` : `p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Anime un nombre de sa valeur précédente vers la nouvelle (≈ 600 ms). */
export function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const fromRef = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      setValue(v);
      fromRef.current = v;
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return Math.round(value);
}

export type Tone = 'theme' | 'yellow' | 'orange' | 'green' | 'red' | 'blue' | 'gray';

export const TONE_CLASSES: Record<Tone, string> = {
  theme: 'text-theme bg-theme-subtle',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
  green: 'text-green-600 dark:text-green-400 bg-green-500/10',
  red: 'text-red-600 dark:text-red-400 bg-red-500/10',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  gray: 'text-gray-500 dark:text-gray-400 bg-gray-500/10',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = 'theme',
  hint,
  onClick,
  emphasis,
}: {
  icon: ElementType;
  label: string;
  value: number;
  suffix?: string;
  tone?: Tone;
  hint?: ReactNode;
  onClick?: () => void;
  emphasis?: boolean;
}) {
  const animated = useCountUp(value);
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`card text-left p-4 flex flex-col gap-3 min-w-0 ${onClick ? 'card-interactive' : ''} ${
        emphasis ? 'ring-1 ring-inset ring-[rgba(var(--color-primary-rgb),0.35)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted truncate">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TONE_CLASSES[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold font-display tabular-nums tracking-tight text-[var(--color-text)]">{animated.toLocaleString('fr-FR')}</span>
        {suffix && <span className="text-sm font-medium text-muted">{suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-muted -mt-1 truncate">{hint}</div>}
    </Comp>
  );
}

// ---------------------------------------------------------------------------
// Divers
// ---------------------------------------------------------------------------

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Squelette affiché pendant le chargement (code-splitting) d'une page. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = 'theme' }: { value: number; tone?: 'theme' | 'green' }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone === 'green' ? 'bg-green-500' : 'bg-theme-solid'}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
