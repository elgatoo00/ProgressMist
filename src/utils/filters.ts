import type { Application, ApplicationMethod, ApplicationStatus } from '@/types';
import { STATUS_LABELS, ALL_STATUSES } from '@/types';
import { daysFromToday, getRelancesDue, parseLocalDate } from '@/utils/helpers';

export type SortKey = 'date_desc' | 'date_asc' | 'entreprise_asc' | 'entreprise_desc' | 'status' | 'relance' | 'updated';

export const SORT_LABELS: Record<SortKey, string> = {
  date_desc: 'Date d’envoi (récentes)',
  date_asc: 'Date d’envoi (anciennes)',
  entreprise_asc: 'Entreprise (A → Z)',
  entreprise_desc: 'Entreprise (Z → A)',
  status: 'Statut',
  relance: 'Prochaine relance',
  updated: 'Dernière modification',
};

export type PeriodKey = 'all' | '7' | '30' | '90';

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  all: 'Toute période',
  '7': '7 derniers jours',
  '30': '30 derniers jours',
  '90': '3 derniers mois',
};

export interface ApplicationFilters {
  search: string;
  statuses: ApplicationStatus[];
  method: ApplicationMethod | '';
  period: PeriodKey;
  remoteOnly: boolean;
  relanceDueOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ApplicationFilters = {
  search: '',
  statuses: [],
  method: '',
  period: 'all',
  remoteOnly: false,
  relanceDueOnly: false,
  sort: 'date_desc',
};

export function countActiveFilters(f: ApplicationFilters): number {
  return (
    (f.statuses.length > 0 ? 1 : 0) +
    (f.method ? 1 : 0) +
    (f.period !== 'all' ? 1 : 0) +
    (f.remoteOnly ? 1 : 0) +
    (f.relanceDueOnly ? 1 : 0)
  );
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Recherche plein texte tolérante aux accents. Tous les mots doivent correspondre. */
export function matchesSearch(app: Application, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(
    [
      app.entreprise,
      app.poste,
      app.lieu,
      app.contact.name,
      app.contact.email,
      app.notes,
      STATUS_LABELS[app.status],
      ...app.technologies,
    ].join(' ')
  );
  return terms.every((t) => haystack.includes(t));
}

export function applyFilters(apps: Application[], f: ApplicationFilters): Application[] {
  const dueIds = f.relanceDueOnly ? new Set(getRelancesDue(apps).map((a) => a.id)) : null;
  const result = apps.filter((a) => {
    if (f.search && !matchesSearch(a, f.search)) return false;
    if (f.statuses.length > 0 && !f.statuses.includes(a.status)) return false;
    if (f.method && a.moyenCandidature !== f.method) return false;
    if (f.remoteOnly && !a.teletravail) return false;
    if (dueIds && !dueIds.has(a.id)) return false;
    if (f.period !== 'all') {
      const days = daysFromToday(a.dateCandidature);
      if (days === null || -days > Number(f.period)) return false;
    }
    return true;
  });
  return sortApplications(result, f.sort);
}

const time = (v: string | null | undefined, fallback: number) => parseLocalDate(v)?.getTime() ?? fallback;

export function sortApplications(apps: Application[], sort: SortKey): Application[] {
  const copy = [...apps];
  switch (sort) {
    case 'date_asc':
      return copy.sort((a, b) => time(a.dateCandidature, 0) - time(b.dateCandidature, 0));
    case 'entreprise_asc':
      return copy.sort((a, b) => a.entreprise.localeCompare(b.entreprise, 'fr', { sensitivity: 'base' }));
    case 'entreprise_desc':
      return copy.sort((a, b) => b.entreprise.localeCompare(a.entreprise, 'fr', { sensitivity: 'base' }));
    case 'status':
      return copy.sort((a, b) => ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status));
    case 'relance':
      return copy.sort((a, b) => {
        const x = time(a.prochaineRelance, Infinity);
        const y = time(b.prochaineRelance, Infinity);
        return x === y ? 0 : x < y ? -1 : 1;
      });
    case 'updated':
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'date_desc':
    default:
      return copy.sort((a, b) => time(b.dateCandidature, 0) - time(a.dateCandidature, 0));
  }
}
