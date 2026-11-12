import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, MoreHorizontal, Edit3, Trash2, Eye, RefreshCw, MapPin, Calendar, Bot, LayoutGrid, List, SearchX, Inbox, BellRing, CalendarCheck, Home,
} from 'lucide-react';
import type { Application } from '@/types';
import { CATEGORY_LABELS, METHOD_LABELS } from '@/types';
import { daysFromToday, formatDate, formatDateTime, formatRelativeDate, isClosed, parseLocalDate, startOfToday } from '@/utils/helpers';
import { useApplicationFilters } from '@/hooks/useApplicationFilters';
import { useApplicationActions } from '@/hooks/useApplicationActions';
import FilterBar from '@/components/application/FilterBar';
import { Dropdown, MenuItems, StatusOptions } from '@/components/application/StatusMenu';
import { CategoryTabs, CompanyAvatar, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives';

type ViewMode = 'grid' | 'list';
const VIEW_KEY = 'progressmist:applications-view';

function readView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

/** Prochain entretien à venir d'une candidature */
function nextInterview(app: Application): string | null {
  const today = startOfToday();
  return [...app.entrevueDates].filter((d) => (parseLocalDate(d) ?? new Date(0)) >= today).sort()[0] ?? null;
}

export default function Applications() {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters, scope, setScope, scoped, results, counts } = useApplicationFilters();
  const { changeStatus, relance, remove, celebrationNode } = useApplicationActions();
  const [view, setView] = useState<ViewMode>(readView);

  const changeView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* stockage indisponible */
    }
  };

  const scopeLabel = scope === 'all' ? 'toutes catégories' : CATEGORY_LABELS[scope];
  const hasFilters = results.length !== scoped.length;

  const menuFor = (app: Application) => (
    <Dropdown
      label="Actions"
      trigger={(p) => (
        <button {...p} className="icon-btn w-8 h-8" aria-label={`Actions pour ${app.poste}`}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItems
            close={close}
            items={[
              { label: 'Ouvrir', icon: Eye, onSelect: () => navigate(`/applications/${app.id}`) },
              { label: 'Modifier', icon: Edit3, onSelect: () => navigate(`/applications/${app.id}?edit=true`) },
              { label: 'J’ai relancé', icon: RefreshCw, onSelect: () => relance(app), hidden: isClosed(app) },
            ]}
          />
          <div className="my-1 border-t border-[var(--color-border)]" />
          <StatusOptions current={app.status} onSelect={(s) => changeStatus(app, s, 'Liste')} close={close} />
          <div className="my-1 border-t border-[var(--color-border)]" />
          <MenuItems close={close} items={[{ label: 'Supprimer', icon: Trash2, danger: true, onSelect: () => remove(app) }]} />
        </>
      )}
    </Dropdown>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Candidatures"
        description={
          hasFilters
            ? `${results.length} résultat${results.length > 1 ? 's' : ''} sur ${scoped.length} · ${scopeLabel}`
            : `${scoped.length} candidature${scoped.length > 1 ? 's' : ''} · ${scopeLabel}`
        }
        actions={
          <>
            <button onClick={() => navigate('/applications/new/assistant')} className="btn-secondary btn-sm">
              <Bot className="w-4 h-4" /> Assistant
            </button>
            <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Nouvelle
            </button>
          </>
        }
      />

      <CategoryTabs value={scope} onChange={setScope} includeAll counts={counts} />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        trailing={
          <div className="segmented" role="group" aria-label="Affichage">
            <button onClick={() => changeView('grid')} aria-pressed={view === 'grid'} className={`segmented-item !px-2 ${view === 'grid' ? 'segmented-item-active' : ''}`} title="Cartes">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => changeView('list')} aria-pressed={view === 'list'} className={`segmented-item !px-2 ${view === 'list' ? 'segmented-item-active' : ''}`} title="Liste">
              <List className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {results.length === 0 ? (
        <div className="card">
          {scoped.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={`Aucune candidature en ${scopeLabel}`}
              description="Ajoutez votre première candidature : il suffit de l’entreprise, du poste et de la date d’envoi."
              action={
                <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Nouvelle candidature
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description="Aucune candidature ne correspond à ces critères. Essayez d’élargir la recherche ou de retirer des filtres."
              action={<button onClick={resetFilters} className="btn-secondary btn-sm">Réinitialiser les filtres</button>}
            />
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map((app) => {
            const relDays = isClosed(app) ? null : daysFromToday(app.prochaineRelance);
            const interview = nextInterview(app);
            return (
              <article
                key={app.id}
                className="card card-interactive p-4 flex flex-col gap-3 group"
                onClick={() => navigate(`/applications/${app.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && navigate(`/applications/${app.id}`)}
                tabIndex={0}
                aria-label={`${app.poste} chez ${app.entreprise}`}
              >
                <div className="flex items-start gap-3">
                  <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[15px] text-[var(--color-text)] truncate leading-snug">{app.poste}</h3>
                    <p className="text-sm text-muted truncate">{app.entreprise}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>{menuFor(app)}</div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {app.lieu && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{app.lieu}</span>}
                  {app.teletravail && <span className="inline-flex items-center gap-1"><Home className="w-3 h-3" />Télétravail</span>}
                  <span className="inline-flex items-center gap-1" title="Date d’envoi"><Calendar className="w-3 h-3" />{formatDate(app.dateCandidature)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3 border-t border-[var(--color-border)]">
                  <StatusBadge status={app.status} size="sm" />
                  {scope === 'all' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-muted">{CATEGORY_LABELS[app.category]}</span>}
                  {interview && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" /> {formatRelativeDate(interview)}
                    </span>
                  )}
                  {relDays !== null && relDays <= 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <BellRing className="w-3 h-3" /> {relDays < 0 ? 'Relance en retard' : 'Relance aujourd’hui'}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted">{METHOD_LABELS[app.moyenCandidature]}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-[var(--color-border)]">
            {results.map((app) => {
              const relDays = isClosed(app) ? null : daysFromToday(app.prochaineRelance);
              const interview = nextInterview(app);
              return (
                <li key={app.id} className="flex items-center gap-3 px-4 py-3 row-hover cursor-pointer" onClick={() => navigate(`/applications/${app.id}`)}>
                  <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{app.poste}</p>
                    <p className="text-xs text-muted truncate">
                      {app.entreprise}{app.lieu && ` · ${app.lieu}`}{scope === 'all' && ` · ${CATEGORY_LABELS[app.category]}`}
                    </p>
                  </div>
                  <span className="hidden md:block w-32 text-xs text-muted">{interview ? `Entretien ${formatDateTime(interview)}` : ''}</span>
                  <span className={`hidden sm:block w-28 text-xs ${relDays !== null && relDays <= 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted'}`}>
                    {app.prochaineRelance && relDays !== null ? `Relance ${formatRelativeDate(app.prochaineRelance).toLowerCase()}` : ''}
                  </span>
                  <span className="hidden sm:block w-20 text-xs text-muted text-right tabular-nums">{formatDate(app.dateCandidature, 'dd/MM/yy')}</span>
                  <StatusBadge status={app.status} size="sm" />
                  <div onClick={(e) => e.stopPropagation()}>{menuFor(app)}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {celebrationNode}
    </div>
  );
}
