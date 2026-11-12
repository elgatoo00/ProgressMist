import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X, ArrowUpDown, Home, BellRing } from 'lucide-react';
import type { ApplicationMethod } from '@/types';
import { ALL_STATUSES, METHOD_LABELS, STATUS_DOT_COLORS, STATUS_LABELS } from '@/types';
import { PERIOD_LABELS, SORT_LABELS, countActiveFilters, type ApplicationFilters, type PeriodKey, type SortKey } from '@/utils/filters';

interface FilterBarProps {
  filters: ApplicationFilters;
  setFilters: (patch: Partial<ApplicationFilters>) => void;
  resetFilters: () => void;
  /** Contrôles supplémentaires à droite (sélecteur de vue…) */
  trailing?: ReactNode;
  hideSort?: boolean;
}

export default function FilterBar({ filters, setFilters, resetFilters, trailing, hideSort }: FilterBarProps) {
  const active = countActiveFilters(filters);
  const [open, setOpen] = useState(active > 0);
  const [search, setSearch] = useState(filters.search);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recherche légèrement différée pour ne pas réécrire l'URL à chaque frappe
  useEffect(() => {
    if (search === filters.search) return;
    const t = window.setTimeout(() => setFilters({ search }), 150);
    return () => window.clearTimeout(t);
  }, [search, filters.search, setFilters]);

  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);

  const toggleStatus = (s: (typeof ALL_STATUSES)[number]) =>
    setFilters({ statuses: filters.statuses.includes(s) ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && search) {
                e.stopPropagation();
                setSearch('');
              }
            }}
            placeholder="Entreprise, poste, ville, contact, technologie…"
            aria-label="Rechercher dans les candidatures"
            className="w-full glass-input pl-9 pr-9 py-2 text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-6 h-6"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`btn-secondary btn-sm !py-2 ${active > 0 ? '!border-theme-subtle-40 text-theme' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {active > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-theme-solid text-white text-[10px] font-semibold flex items-center justify-center">
              {active}
            </span>
          )}
        </button>

        {!hideSort && (
          <label className="relative inline-flex items-center">
            <ArrowUpDown className="absolute left-3 w-3.5 h-3.5 text-muted pointer-events-none" />
            <span className="sr-only">Trier par</span>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value as SortKey })}
              className="glass-input text-sm py-2 pl-8 pr-8 appearance-none cursor-pointer"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </label>
        )}

        <div className="flex-1 hidden lg:block" />
        {trailing}
      </div>

      {open && (
        <div className="card p-4 space-y-4 animate-slide-down">
          <div>
            <p className="eyebrow mb-2">Statut</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => {
                const on = filters.statuses.includes(s);
                return (
                  <button key={s} onClick={() => toggleStatus(s)} aria-pressed={on} className={`chip ${on ? 'chip-active' : ''}`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s]}`} />
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow mb-2 block" htmlFor="filter-method">Plateforme</label>
              <select
                id="filter-method"
                value={filters.method}
                onChange={(e) => setFilters({ method: e.target.value as ApplicationMethod | '' })}
                className="glass-input w-full text-sm py-2"
              >
                <option value="">Toutes les plateformes</option>
                {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="eyebrow mb-2 block" htmlFor="filter-period">Date d’envoi</label>
              <select
                id="filter-period"
                value={filters.period}
                onChange={(e) => setFilters({ period: e.target.value as PeriodKey })}
                className="glass-input w-full text-sm py-2"
              >
                {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => <option key={k} value={k}>{PERIOD_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <p className="eyebrow mb-2">Options</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilters({ remoteOnly: !filters.remoteOnly })} aria-pressed={filters.remoteOnly} className={`chip ${filters.remoteOnly ? 'chip-active' : ''}`}>
                  <Home className="w-3.5 h-3.5" /> Télétravail
                </button>
                <button onClick={() => setFilters({ relanceDueOnly: !filters.relanceDueOnly })} aria-pressed={filters.relanceDueOnly} className={`chip ${filters.relanceDueOnly ? 'chip-active' : ''}`}>
                  <BellRing className="w-3.5 h-3.5" /> Relance à faire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(active > 0 || filters.search) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.search && (
            <ActiveChip label={`« ${filters.search} »`} onRemove={() => setFilters({ search: '' })} />
          )}
          {filters.statuses.map((s) => (
            <ActiveChip key={s} label={STATUS_LABELS[s]} onRemove={() => toggleStatus(s)} />
          ))}
          {filters.method && <ActiveChip label={METHOD_LABELS[filters.method]} onRemove={() => setFilters({ method: '' })} />}
          {filters.period !== 'all' && <ActiveChip label={PERIOD_LABELS[filters.period]} onRemove={() => setFilters({ period: 'all' })} />}
          {filters.remoteOnly && <ActiveChip label="Télétravail" onRemove={() => setFilters({ remoteOnly: false })} />}
          {filters.relanceDueOnly && <ActiveChip label="Relance à faire" onRemove={() => setFilters({ relanceDueOnly: false })} />}
          <button onClick={resetFilters} className="text-xs font-medium text-muted hover:text-[var(--color-text)] px-2 py-1">
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="chip chip-active !pr-1">
      {label}
      <button onClick={onRemove} className="w-4 h-4 rounded flex items-center justify-center hover:bg-theme-subtle-20" aria-label={`Retirer le filtre ${label}`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
