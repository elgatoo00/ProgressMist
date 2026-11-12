import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApplicationMethod, ApplicationStatus, ContractCategory } from '@/types';
import { ALL_STATUSES, METHOD_LABELS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_FILTERS, PERIOD_LABELS, SORT_LABELS, applyFilters, type ApplicationFilters, type PeriodKey, type SortKey } from '@/utils/filters';
import { filterByCategory } from '@/utils/helpers';

/**
 * Filtres de liste stockés dans l'URL (?q=…&status=…&due=1&cat=all).
 * Les filtres survivent ainsi à la navigation et peuvent être ouverts depuis le dashboard ou la recherche globale.
 */
export function useApplicationFilters(defaultSort: SortKey = 'date_desc') {
  const [params, setParams] = useSearchParams();
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);

  const scope: ContractCategory | 'all' = params.get('cat') === 'all' ? 'all' : activeCategory;

  const filters: ApplicationFilters = useMemo(() => {
    const statuses = (params.get('status') || '')
      .split(',')
      .filter((s): s is ApplicationStatus => ALL_STATUSES.includes(s as ApplicationStatus));
    const method = params.get('method') || '';
    const period = params.get('period') || 'all';
    const sort = params.get('sort') || defaultSort;
    return {
      ...DEFAULT_FILTERS,
      search: params.get('q') || '',
      statuses,
      method: (method in METHOD_LABELS ? method : '') as ApplicationMethod | '',
      period: (period in PERIOD_LABELS ? period : 'all') as PeriodKey,
      remoteOnly: params.get('remote') === '1',
      relanceDueOnly: params.get('due') === '1',
      sort: (sort in SORT_LABELS ? sort : defaultSort) as SortKey,
    };
  }, [params, defaultSort]);

  const setFilters = useCallback(
    (patch: Partial<ApplicationFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const f = { ...filters, ...patch };
          const put = (k: string, v: string | false | undefined) => (v ? next.set(k, v) : next.delete(k));
          put('q', f.search);
          put('status', f.statuses.join(','));
          put('method', f.method);
          put('period', f.period !== 'all' && f.period);
          put('remote', f.remoteOnly && '1');
          put('due', f.relanceDueOnly && '1');
          put('sort', f.sort !== defaultSort && f.sort);
          return next;
        },
        { replace: true }
      );
    },
    [filters, setParams, defaultSort]
  );

  const resetFilters = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams();
      if (prev.get('cat')) next.set('cat', prev.get('cat')!);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setScope = useCallback(
    (c: ContractCategory | 'all') => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (c === 'all') next.set('cat', 'all');
          else next.delete('cat');
          return next;
        },
        { replace: true }
      );
      if (c !== 'all') setActiveCategory(c);
    },
    [setParams, setActiveCategory]
  );

  const scoped = useMemo(() => filterByCategory(applications, scope), [applications, scope]);
  const results = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);

  const counts = useMemo(() => {
    const c: Partial<Record<ContractCategory | 'all', number>> = { all: applications.length };
    applications.forEach((a) => (c[a.category] = (c[a.category] || 0) + 1));
    (['stage', 'alternance', 'cdi', 'cdd'] as const).forEach((k) => (c[k] = c[k] || 0));
    return c;
  }, [applications]);

  return { filters, setFilters, resetFilters, scope, setScope, scoped, results, counts };
}
