import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, Edit3, Trash2, RefreshCw, MoreHorizontal, SearchX, Inbox, Plus, Download } from 'lucide-react';
import type { Application } from '@/types';
import { CATEGORY_LABELS, METHOD_LABELS, STATUS_LABELS } from '@/types';
import { daysFromToday, formatDate, isClosed } from '@/utils/helpers';
import type { SortKey } from '@/utils/filters';
import { useApplicationFilters } from '@/hooks/useApplicationFilters';
import { useApplicationActions } from '@/hooks/useApplicationActions';
import FilterBar from '@/components/application/FilterBar';
import { Dropdown, MenuItems, StatusOptions } from '@/components/application/StatusMenu';
import { CategoryTabs, CompanyAvatar, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { toast } from '@/components/ui/Toast';

type Column = {
  id: string;
  label: string;
  sort?: [SortKey, SortKey?];
  className?: string;
};

const COLUMNS: Column[] = [
  { id: 'entreprise', label: 'Entreprise', sort: ['entreprise_asc', 'entreprise_desc'] },
  { id: 'poste', label: 'Poste', className: 'hidden md:table-cell' },
  { id: 'status', label: 'Statut', sort: ['status'] },
  { id: 'date', label: 'Envoyée le', sort: ['date_desc', 'date_asc'] },
  { id: 'relance', label: 'Relance', sort: ['relance'], className: 'hidden lg:table-cell' },
  { id: 'contact', label: 'Contact', className: 'hidden xl:table-cell' },
  { id: 'method', label: 'Plateforme', className: 'hidden xl:table-cell' },
];

function exportCsv(rows: Application[]) {
  const headers = ['Entreprise', 'Poste', 'Catégorie', 'Statut', 'Date d’envoi', 'Prochaine relance', 'Contact', 'E-mail', 'Plateforme', 'Localisation', 'Salaire', 'Lien'];
  const lines = rows.map((a) =>
    [a.entreprise, a.poste, CATEGORY_LABELS[a.category], STATUS_LABELS[a.status], formatDate(a.dateCandidature), a.prochaineRelance ? formatDate(a.prochaineRelance) : '', a.contact.name, a.contact.email, METHOD_LABELS[a.moyenCandidature], a.lieu, a.salaire, a.lienOffre]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(';')
  );
  const blob = new Blob(['﻿' + [headers.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'progressmist-tableau.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Export CSV téléchargé', { description: `${rows.length} ligne${rows.length > 1 ? 's' : ''}` });
}

export default function TableView() {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters, scope, setScope, scoped, results, counts } = useApplicationFilters();
  const { changeStatus, relance, remove, celebrationNode } = useApplicationActions();

  const onSort = (col: Column) => {
    if (!col.sort) return;
    const [first, second] = col.sort;
    setFilters({ sort: filters.sort === first && second ? second : first });
  };

  const sortIcon = (col: Column) => {
    if (!col.sort) return null;
    const [first, second] = col.sort;
    if (filters.sort === first) return second ? (first.endsWith('desc') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />) : <ChevronUp className="w-3.5 h-3.5" />;
    if (second && filters.sort === second) return second.endsWith('desc') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60" />;
  };

  const ariaSort = (col: Column): 'ascending' | 'descending' | 'none' | undefined => {
    if (!col.sort) return undefined;
    if (!col.sort.includes(filters.sort)) return 'none';
    return filters.sort.endsWith('desc') ? 'descending' : 'ascending';
  };

  const scopeLabel = scope === 'all' ? 'toutes catégories' : CATEGORY_LABELS[scope];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tableau"
        description={`${results.length} candidature${results.length > 1 ? 's' : ''} affichée${results.length > 1 ? 's' : ''} · ${scopeLabel}`}
        actions={
          <>
            <button onClick={() => exportCsv(results)} disabled={results.length === 0} className="btn-secondary btn-sm">
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Nouvelle
            </button>
          </>
        }
      />

      <CategoryTabs value={scope} onChange={setScope} includeAll counts={counts} />
      <FilterBar filters={filters} setFilters={setFilters} resetFilters={resetFilters} hideSort />

      <div className="card overflow-hidden">
        {results.length === 0 ? (
          scoped.length === 0 ? (
            <EmptyState icon={Inbox} title={`Aucune candidature en ${scopeLabel}`} action={<button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Nouvelle candidature</button>} />
          ) : (
            <EmptyState icon={SearchX} title="Aucun résultat" description="Aucune candidature ne correspond à ces critères." action={<button onClick={resetFilters} className="btn-secondary btn-sm">Réinitialiser les filtres</button>} />
          )
        ) : (
          <div className="overflow-x-auto max-h-[calc(100dvh-320px)] min-h-[240px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
                <tr className="border-b border-[var(--color-border)]">
                  {COLUMNS.map((col) => (
                    <th key={col.id} scope="col" aria-sort={ariaSort(col)} className={`px-4 py-3 text-left font-medium text-xs text-muted whitespace-nowrap ${col.className || ''}`}>
                      {col.sort ? (
                        <button onClick={() => onSort(col)} className={`group inline-flex items-center gap-1 hover:text-[var(--color-text)] ${col.sort.includes(filters.sort) ? 'text-[var(--color-text)]' : ''}`}>
                          {col.label}
                          {sortIcon(col)}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 w-12"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {results.map((app) => {
                  const relDays = isClosed(app) ? null : daysFromToday(app.prochaineRelance);
                  return (
                    <tr key={app.id} className="row-hover cursor-pointer" onClick={() => navigate(`/applications/${app.id}`)}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text)] truncate max-w-[220px]">{app.entreprise}</p>
                            <p className="text-xs text-muted truncate max-w-[220px] md:hidden">{app.poste}</p>
                            {scope === 'all' && <p className="text-[11px] text-muted hidden md:block">{CATEGORY_LABELS[app.category]}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell"><span className="block truncate max-w-[260px]">{app.poste}</span></td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          align="left"
                          label="Changer le statut"
                          trigger={(p) => (
                            <button {...p} className="rounded-full hover:ring-2 hover:ring-[rgba(var(--color-primary-rgb),0.25)] transition-shadow" title="Changer le statut">
                              <StatusBadge status={app.status} size="sm" />
                            </button>
                          )}
                        >
                          {(close) => <StatusOptions current={app.status} onSelect={(s) => changeStatus(app, s, 'Tableau')} close={close} />}
                        </Dropdown>
                      </td>
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap tabular-nums">{formatDate(app.dateCandidature)}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell whitespace-nowrap">
                        {app.prochaineRelance && relDays !== null ? (
                          <span className={relDays <= 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted'}>
                            {formatDate(app.prochaineRelance, 'dd/MM')}
                            {relDays < 0 && ' · en retard'}
                            {relDays === 0 && " · aujourd'hui"}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {app.relancesEffectuees > 0 && <span className="ml-2 text-[11px] text-muted">({app.relancesEffectuees} faite{app.relancesEffectuees > 1 ? 's' : ''})</span>}
                      </td>
                      <td className="px-4 py-2.5 hidden xl:table-cell text-muted"><span className="block truncate max-w-[180px]">{app.contact.name || '—'}</span></td>
                      <td className="px-4 py-2.5 hidden xl:table-cell text-muted whitespace-nowrap">{METHOD_LABELS[app.moyenCandidature]}</td>
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Dropdown label="Actions" trigger={(p) => <button {...p} className="icon-btn w-8 h-8" aria-label={`Actions pour ${app.entreprise}`}><MoreHorizontal className="w-4 h-4" /></button>}>
                          {(close) => (
                            <MenuItems
                              close={close}
                              items={[
                                { label: 'Ouvrir', icon: Eye, onSelect: () => navigate(`/applications/${app.id}`) },
                                { label: 'Modifier', icon: Edit3, onSelect: () => navigate(`/applications/${app.id}?edit=true`) },
                                { label: 'J’ai relancé', icon: RefreshCw, onSelect: () => relance(app), hidden: isClosed(app) },
                                { label: 'Supprimer', icon: Trash2, danger: true, onSelect: () => remove(app) },
                              ]}
                            />
                          )}
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {celebrationNode}
    </div>
  );
}
