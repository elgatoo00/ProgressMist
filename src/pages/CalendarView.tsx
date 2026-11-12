import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Send, RefreshCw, CalendarCheck, Flag, CalendarDays } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ContractCategory } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { filterByCategory, hasTime, isClosed, parseLocalDate, toDateKey } from '@/utils/helpers';
import { CategoryTabs, CompanyAvatar, EmptyState, PageHeader } from '@/components/ui/primitives';

type View = 'month' | 'week' | 'day';
type EventType = 'candidature' | 'relance' | 'entretien' | 'debut';

interface CalEvent {
  id: string;
  key: string; // yyyy-MM-dd
  date: Date;
  timed: boolean;
  type: EventType;
  app: Application;
}

const TYPE_META: Record<EventType, { label: string; icon: typeof Send; chip: string; dot: string }> = {
  candidature: { label: 'Candidature envoyée', icon: Send, chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25', dot: 'bg-blue-500' },
  relance: { label: 'Relance', icon: RefreshCw, chip: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25', dot: 'bg-purple-500' },
  entretien: { label: 'Entretien', icon: CalendarCheck, chip: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25', dot: 'bg-orange-500' },
  debut: { label: 'Début de contrat', icon: Flag, chip: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/25', dot: 'bg-green-500' },
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function CalendarView() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();

  const [scope, setScope] = useState<ContractCategory | 'all'>(activeCategory);
  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'week' : 'month'));
  const [cursor, setCursor] = useState(new Date());
  const [hidden, setHidden] = useState<EventType[]>([]);

  const events = useMemo(() => {
    const out: CalEvent[] = [];
    const push = (raw: string | null | undefined, type: EventType, app: Application, suffix: string) => {
      const d = parseLocalDate(raw);
      if (!d || !raw) return;
      out.push({ id: `${app.id}-${suffix}`, key: toDateKey(d), date: d, timed: type === 'entretien' && hasTime(raw), type, app });
    };
    filterByCategory(applications, scope).forEach((app) => {
      push(app.dateCandidature, 'candidature', app, 'c');
      if (!isClosed(app)) push(app.prochaineRelance, 'relance', app, 'r');
      app.entrevueDates.forEach((d, i) => push(d, 'entretien', app, `e${i}`));
      if (app.dateDebut) push(app.dateDebut, 'debut', app, 'd');
    });
    const order: EventType[] = ['entretien', 'relance', 'debut', 'candidature'];
    return out
      .filter((e) => !hidden.includes(e.type))
      .sort((a, b) => a.date.getTime() - b.date.getTime() || order.indexOf(a.type) - order.indexOf(b.type));
  }, [applications, scope, hidden]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    events.forEach((e) => m.set(e.key, [...(m.get(e.key) || []), e]));
    return m;
  }, [events]);

  const today = new Date();

  const range = useMemo(() => {
    if (view === 'month') {
      return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) });
    }
    if (view === 'week') {
      return eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    }
    return [cursor];
  }, [view, cursor]);

  const move = (dir: number) => {
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : view === 'week' ? addWeeks(c, dir) : addDays(c, dir)));
  };

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy', { locale: fr })
      : view === 'week'
        ? `${format(range[0], 'd MMM', { locale: fr })} – ${format(range[range.length - 1], 'd MMM yyyy', { locale: fr })}`
        : format(cursor, 'EEEE d MMMM yyyy', { locale: fr });

  const upcoming = useMemo(
    () => events.filter((e) => e.type !== 'candidature' && e.date >= new Date(today.getFullYear(), today.getMonth(), today.getDate())).slice(0, 8),
    [events]
  );

  const changeScope = (c: ContractCategory | 'all') => {
    setScope(c);
    if (c !== 'all') setActiveCategory(c);
  };

  const openDay = (d: Date) => {
    setCursor(d);
    setView('day');
  };

  const EventChip = ({ e, compact }: { e: CalEvent; compact?: boolean }) => {
    const meta = TYPE_META[e.type];
    return (
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          navigate(`/applications/${e.app.id}`);
        }}
        className={`w-full text-left rounded-md border truncate transition-opacity hover:opacity-80 ${meta.chip} ${compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'}`}
        title={`${meta.label} — ${e.app.poste} · ${e.app.entreprise}${e.timed ? ` à ${format(e.date, 'HH:mm')}` : ''}`}
      >
        {e.timed && <span className="font-semibold tabular-nums mr-1">{format(e.date, 'HH:mm')}</span>}
        {e.app.entreprise}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendrier"
        description="Candidatures, relances, entretiens et débuts de contrat"
        actions={
          <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Nouvelle
          </button>
        }
      />

      <CategoryTabs value={scope} onChange={changeScope} includeAll />

      <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="card overflow-hidden">
          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1">
              <button onClick={() => move(-1)} className="icon-btn" aria-label="Période précédente"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => move(1)} className="icon-btn" aria-label="Période suivante"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <h2 className="text-base font-semibold font-display capitalize mr-auto">{title}</h2>
            <button onClick={() => setCursor(new Date())} className="btn-secondary btn-sm !py-1.5">Aujourd’hui</button>
            <div className="segmented">
              {(['month', 'week', 'day'] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`segmented-item !py-1 ${view === v ? 'segmented-item-active' : ''}`}>
                  {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
          </div>

          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-[11px] font-medium text-muted uppercase tracking-wide">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {range.map((day, i) => {
                  const key = toDateKey(day);
                  const dayEvents = byDay.get(key) || [];
                  const inMonth = isSameMonth(day, cursor);
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={key}
                      onClick={() => openDay(day)}
                      className={`min-h-[72px] sm:min-h-[108px] p-1 sm:p-1.5 border-b border-[var(--color-border)] cursor-pointer transition-colors hover:bg-theme-subtle-05
                        ${(i + 1) % 7 !== 0 ? 'border-r' : ''} ${inMonth ? '' : 'bg-[var(--color-surface-2)]/50'}`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs tabular-nums
                          ${isToday ? 'bg-theme-solid text-white font-semibold' : inMonth ? 'text-[var(--color-text)]' : 'text-muted opacity-60'}`}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* Mobile : points */}
                      <div className="flex flex-wrap gap-0.5 mt-1 sm:hidden">
                        {dayEvents.slice(0, 4).map((e) => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_META[e.type].dot}`} />)}
                      </div>
                      {/* Desktop : libellés */}
                      <div className="hidden sm:block mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => <EventChip key={e.id} e={e} compact />)}
                        {dayEvents.length > 3 && <p className="text-[10px] text-muted pl-1">+{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="divide-y sm:divide-y-0 sm:grid sm:grid-cols-7 divide-[var(--color-border)]">
              {range.map((day, i) => {
                const key = toDateKey(day);
                const dayEvents = byDay.get(key) || [];
                const isToday = isSameDay(day, today);
                return (
                  <div key={key} className={`sm:min-h-[360px] p-2 ${i < 6 ? 'sm:border-r border-[var(--color-border)]' : ''} ${isToday ? 'bg-theme-subtle-05' : ''}`}>
                    <button onClick={() => openDay(day)} className="flex sm:flex-col items-baseline sm:items-center gap-2 sm:gap-0 w-full mb-2 group">
                      <span className="text-[11px] uppercase text-muted">{WEEKDAYS[i]}</span>
                      <span className={`text-lg font-semibold font-display tabular-nums w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-theme-subtle ${isToday ? 'bg-theme-solid text-white group-hover:bg-theme-solid' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </button>
                    <div className="space-y-1">
                      {dayEvents.map((e) => <EventChip key={e.id} e={e} />)}
                      {dayEvents.length === 0 && <p className="text-[11px] text-muted sm:text-center sm:pt-4">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="p-4">
              {(byDay.get(toDateKey(cursor)) || []).length === 0 ? (
                <EmptyState compact icon={CalendarDays} title="Rien de prévu ce jour-là" description="Aucune candidature, relance ou entretien à cette date." />
              ) : (
                <ul className="space-y-2">
                  {(byDay.get(toDateKey(cursor)) || []).map((e) => {
                    const meta = TYPE_META[e.type];
                    return (
                      <li key={e.id}>
                        <button onClick={() => navigate(`/applications/${e.app.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] row-hover text-left">
                          <span className="w-14 text-sm font-semibold tabular-nums text-muted shrink-0">{e.timed ? format(e.date, 'HH:mm') : 'Journée'}</span>
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${meta.chip}`}>
                            <meta.icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{e.app.poste} · {e.app.entreprise}</p>
                            <p className="text-xs text-muted">{meta.label}{scope === 'all' ? ` · ${CATEGORY_LABELS[e.app.category]}` : ''}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Légende / filtres */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-t border-[var(--color-border)]">
            {(Object.keys(TYPE_META) as EventType[]).map((t) => {
              const on = !hidden.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setHidden((h) => (on ? [...h, t] : h.filter((x) => x !== t)))}
                  aria-pressed={on}
                  className={`chip ${on ? '' : 'opacity-50 line-through'}`}
                  title={on ? 'Masquer' : 'Afficher'}
                >
                  <span className={`w-2 h-2 rounded-full ${TYPE_META[t].dot}`} />
                  {TYPE_META[t].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* À venir */}
        <aside className="card">
          <header className="px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold">À venir</h2>
            <p className="text-xs text-muted">Entretiens, relances et débuts de contrat</p>
          </header>
          {upcoming.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="Aucune échéance" />
          ) : (
            <ul className="px-2 pb-3">
              {upcoming.map((e) => {
                const meta = TYPE_META[e.type];
                return (
                  <li key={e.id}>
                    <button onClick={() => navigate(`/applications/${e.app.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg row-hover text-left">
                      <CompanyAvatar name={e.app.entreprise} logo={e.app.entrepriseLogo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.app.entreprise}</p>
                        <p className="text-xs text-muted truncate flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label} · {format(e.date, e.timed ? "EEE d MMM 'à' HH:mm" : 'EEE d MMM', { locale: fr })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
