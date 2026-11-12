import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { MapPin, Calendar, RefreshCw, Search, Plus, BellRing, CalendarCheck, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ApplicationStatus } from '@/types';
import { ALL_STATUSES, CATEGORY_LABELS, STATUS_HEX, STATUS_LABELS } from '@/types';
import { daysFromToday, formatDate, formatRelativeDate, isClosed, parseLocalDate, startOfToday } from '@/utils/helpers';
import { matchesSearch } from '@/utils/filters';
import { useApplicationActions } from '@/hooks/useApplicationActions';
import { CategoryTabs, CompanyAvatar, PageHeader } from '@/components/ui/primitives';

/** Libellés de colonnes (la colonne « En attente » correspond aux candidatures envoyées). */
const COLUMN_LABELS: Partial<Record<ApplicationStatus, string>> = { en_attente: 'Envoyée', relance_prevue: 'Relance' };

export default function KanbanView() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();
  const { changeStatus, celebrationNode } = useApplicationActions();
  const [query, setQuery] = useState('');

  const categoryApps = useMemo(() => applications.filter((a) => a.category === activeCategory), [applications, activeCategory]);
  const visible = useMemo(() => (query ? categoryApps.filter((a) => matchesSearch(a, query)) : categoryApps), [categoryApps, query]);

  const columns = useMemo(() => {
    const map = Object.fromEntries(ALL_STATUSES.map((s) => [s, [] as typeof visible])) as Record<ApplicationStatus, typeof visible>;
    [...visible]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .forEach((a) => map[a.status]?.push(a));
    return map;
  }, [visible]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    applications.forEach((a) => (c[a.category] = (c[a.category] || 0) + 1));
    return c;
  }, [applications]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.droppableId === result.source.droppableId) return;
    const app = applications.find((a) => a.id === result.draggableId);
    if (!app) return;
    changeStatus(app, result.destination.droppableId as ApplicationStatus, 'Kanban');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kanban"
        description={`${CATEGORY_LABELS[activeCategory]} · glissez-déposez une carte pour changer son statut`}
        actions={
          <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Nouvelle
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <CategoryTabs value={activeCategory} onChange={setActiveCategory} counts={counts} />
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrer les cartes…" className="glass-input w-full pl-9 pr-8 py-2 text-sm" aria-label="Filtrer les cartes" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-6 h-6" aria-label="Effacer le filtre">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {ALL_STATUSES.map((status) => {
            const apps = columns[status];
            return (
              <section key={status} className="flex-shrink-0 w-[280px] snap-start flex flex-col rounded-2xl bg-[var(--color-surface-2)]/60 border border-[var(--color-border)]" aria-label={STATUS_LABELS[status]}>
                <header className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_HEX[status] }} />
                  <h2 className="font-semibold text-sm text-[var(--color-text)]">{COLUMN_LABELS[status] ?? STATUS_LABELS[status]}</h2>
                  <span className="ml-auto text-xs text-muted tabular-nums px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">{apps.length}</span>
                </header>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 min-h-[160px] px-2 pb-2 mx-1 mb-1 rounded-xl transition-colors ${
                        snapshot.isDraggingOver ? 'bg-theme-subtle-05 ring-1 ring-inset ring-[rgba(var(--color-primary-rgb),0.3)]' : ''
                      }`}
                    >
                      {apps.map((app, index) => {
                        const relDays = isClosed(app) ? null : daysFromToday(app.prochaineRelance);
                        const interview = [...app.entrevueDates].filter((d) => (parseLocalDate(d) ?? new Date(0)) >= startOfToday()).sort()[0];
                        return (
                          <Draggable key={app.id} draggableId={app.id} index={index}>
                            {(p, snap) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                onClick={() => navigate(`/applications/${app.id}`)}
                                className={`card p-3 cursor-grab active:cursor-grabbing select-none ${
                                  snap.isDragging ? 'shadow-xl !border-theme-subtle-40 rotate-[1.5deg]' : 'hover:!border-[var(--color-border-strong)]'
                                }`}
                                style={p.draggableProps.style}
                              >
                                <div className="flex items-start gap-2.5">
                                  <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-sm text-[var(--color-text)] leading-snug line-clamp-2">{app.poste}</h3>
                                    <p className="text-xs text-muted truncate">{app.entreprise}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5 text-[11px] text-muted">
                                  {app.lieu && <span className="inline-flex items-center gap-1 truncate max-w-[110px]"><MapPin className="w-3 h-3 shrink-0" />{app.lieu}</span>}
                                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(app.dateCandidature, 'dd/MM')}</span>
                                  {app.relancesEffectuees > 0 && <span className="inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />{app.relancesEffectuees}</span>}
                                </div>
                                {(interview || (relDays !== null && relDays <= 0)) && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {interview && (
                                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                                        <CalendarCheck className="w-3 h-3" />{formatRelativeDate(interview)}
                                      </span>
                                    )}
                                    {relDays !== null && relDays <= 0 && (
                                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                                        <BellRing className="w-3 h-3" />{relDays < 0 ? 'Relance en retard' : 'Relancer'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {apps.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-24 rounded-xl border border-dashed border-[var(--color-border-strong)] flex items-center justify-center text-xs text-muted">
                          {query ? 'Aucune carte' : 'Déposez une carte ici'}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>

      {celebrationNode}
    </div>
  );
}
