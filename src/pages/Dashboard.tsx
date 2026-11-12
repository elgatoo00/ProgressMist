import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  FileText, Clock, CalendarCheck, CheckCircle2, XCircle, TrendingUp, Target, Timer, RefreshCw, Plus,
  ArrowRight, AlertCircle, CalendarDays, Flag, Inbox, History, Trophy, PartyPopper, ChevronDown,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ContractCategory } from '@/types';
import { ALL_CATEGORIES, ALL_STATUSES, CATEGORY_HEX, CATEGORY_LABELS, STATUS_HEX, STATUS_LABELS } from '@/types';
import {
  filterByCategory, formatDateTime, formatRelativeDate, getActionItems, getRecentActivity, getStats,
  getUpcomingDeadlines, getWeeklyApplications, parseLocalDate, parseSalary, daysFromToday, type ActionItem, type DeadlineType,
} from '@/utils/helpers';
import {
  Card, CategoryTabs, CompanyAvatar, EmptyState, PageHeader, StatCard, StatusBadge, CATEGORY_LUCIDE,
} from '@/components/ui/primitives';
import { ChartLegend, ChartTooltip, axisProps, gridProps } from '@/components/ui/chart';
import { toast } from '@/components/ui/Toast';

type Scope = ContractCategory | 'all';

const ACTION_STYLES: Record<ActionItem['kind'], string> = {
  relance_retard: 'text-red-600 dark:text-red-400 bg-red-500/10',
  relance_jour: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  sans_reponse: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
  a_preparer: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  entretien_proche: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
};

const DEADLINE_META: Record<DeadlineType, { label: string; icon: typeof Flag; cls: string }> = {
  entretien: { label: 'Entretien', icon: CalendarCheck, cls: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' },
  relance: { label: 'Relance', icon: RefreshCw, cls: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  debut: { label: 'Début du contrat', icon: Flag, cls: 'text-green-600 dark:text-green-400 bg-green-500/10' },
};

export default function Dashboard() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const performRelance = useAppStore((s) => s.performRelance);
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>(activeCategory);
  const [showAllActions, setShowAllActions] = useState(false);

  const changeScope = (s: Scope) => {
    setScope(s);
    if (s !== 'all') setActiveCategory(s);
  };

  const scoped = useMemo(() => filterByCategory(applications, scope), [applications, scope]);
  const stats = useMemo(() => getStats(scoped), [scoped]);
  const weekly = useMemo(() => getWeeklyApplications(scoped, 12), [scoped]);
  const actions = useMemo(() => getActionItems(scoped), [scoped]);
  const deadlines = useMemo(() => getUpcomingDeadlines(scoped, 60).slice(0, 6), [scoped]);
  const recentApps = useMemo(
    () => [...scoped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [scoped]
  );
  const activity = useMemo(() => getRecentActivity(scoped, 6), [scoped]);
  const accepted = useMemo(() => scoped.filter((a) => a.status === 'acceptee'), [scoped]);

  const counts = useMemo(() => {
    const c: Partial<Record<Scope, number>> = { all: applications.length };
    ALL_CATEGORIES.forEach((cat) => (c[cat] = applications.filter((a) => a.category === cat).length));
    return c;
  }, [applications]);

  const statusData = useMemo(
    () =>
      ALL_STATUSES.map((s) => ({ key: s, name: STATUS_LABELS[s], value: scoped.filter((a) => a.status === s).length, fill: STATUS_HEX[s] }))
        .filter((d) => d.value > 0),
    [scoped]
  );

  const contractData = useMemo(
    () => ALL_CATEGORIES.map((c) => ({ key: c, name: CATEGORY_LABELS[c], value: counts[c] || 0, fill: CATEGORY_HEX[c] })),
    [counts]
  );
  const maxContract = Math.max(1, ...contractData.map((d) => d.value));

  /** Ouvre la liste des candidatures avec des filtres pré-appliqués. */
  const goList = (params: string) => {
    const qs = [params, scope === 'all' ? 'cat=all' : ''].filter(Boolean).join('&');
    navigate(`/applications${qs ? `?${qs}` : ''}`);
  };

  const weekDelta = stats.thisWeek - stats.lastWeek;
  const scopeLabel = scope === 'all' ? 'toutes catégories' : CATEGORY_LABELS[scope];
  const todayLabel = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });

  const visibleActions = showAllActions ? actions : actions.slice(0, 5);

  const markRelanced = (id: string, label: string) => {
    performRelance(id);
    toast.success('Relance enregistrée', { description: label });
  };

  // ---------------------------------------------------------------------------
  // Premier lancement : aucune candidature
  // ---------------------------------------------------------------------------
  if (applications.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord" description={<span className="capitalize">{todayLabel}</span>} />
        <div className="card">
          <EmptyState
            icon={Inbox}
            title="Bienvenue sur ProgressMist"
            description="Ajoutez votre première candidature pour voir apparaître vos statistiques, vos relances et vos prochaines échéances."
            action={
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Ajouter une candidature
                </button>
                <button onClick={() => navigate('/applications/new/assistant')} className="btn-secondary btn-sm">
                  Utiliser l’assistant pas-à-pas
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={
          <>
            <span className="capitalize">{todayLabel}</span> · {stats.total} candidature{stats.total > 1 ? 's' : ''} ({scopeLabel})
          </>
        }
        actions={
          <button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Nouvelle candidature
          </button>
        }
      />

      <CategoryTabs value={scope} onChange={changeScope} includeAll counts={counts} />

      {/* KPIs */}
      <section aria-label="Indicateurs clés" className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatCard
            icon={FileText}
            label="Candidatures"
            value={stats.total}
            hint={
              weekDelta === 0 ? `${stats.thisWeek} cette semaine` : (
                <span className={weekDelta > 0 ? 'text-green-600 dark:text-green-400' : ''}>
                  {stats.thisWeek} cette semaine ({weekDelta > 0 ? '+' : ''}{weekDelta})
                </span>
              )
            }
            onClick={() => goList('')}
          />
          <StatCard icon={Clock} label="En attente" value={stats.enAttente} tone="yellow" hint="Sans réponse pour l’instant" onClick={() => goList('status=en_attente,relance_prevue')} />
          <StatCard icon={CalendarCheck} label="Entretiens programmés" value={stats.entretiensProgrammes} tone="orange" hint={`${stats.entretiens} candidature${stats.entretiens > 1 ? 's' : ''} au stade entretien`} onClick={() => navigate('/calendar')} />
          <StatCard icon={CheckCircle2} label="Acceptées" value={stats.acceptees} tone="green" onClick={() => goList('status=acceptee')} />
          <StatCard icon={XCircle} label="Refusées" value={stats.refusees} tone="red" onClick={() => goList('status=refusee')} />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard icon={TrendingUp} label="Taux de réponse" value={stats.tauxReponse} suffix="%" hint={`Sur ${stats.envoyees} candidature${stats.envoyees > 1 ? 's' : ''} envoyée${stats.envoyees > 1 ? 's' : ''}`} />
          <StatCard icon={Target} label="Taux d’acceptation" value={stats.tauxAcceptation} suffix="%" tone="green" hint="Offres acceptées / envoyées" />
          <StatCard icon={Timer} label="Délai moyen de réponse" value={stats.avgTime} suffix={stats.avgTime > 1 ? 'jours' : 'jour'} tone="blue" hint={stats.hasAvgTime ? 'Entre l’envoi et la 1re réponse' : 'Pas encore de réponse'} />
          <StatCard
            icon={RefreshCw}
            label="Relances à effectuer"
            value={stats.relancesDues}
            tone={stats.relancesDues > 0 ? 'yellow' : 'gray'}
            emphasis={stats.relancesDues > 0}
            hint={`${stats.relances} relance${stats.relances > 1 ? 's' : ''} déjà effectuée${stats.relances > 1 ? 's' : ''}`}
            onClick={() => goList('due=1')}
          />
        </div>
      </section>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Évolution des candidatures"
          description="Candidatures envoyées par semaine, sur les 12 dernières semaines"
          className="lg:col-span-2"
          icon={TrendingUp}
        >
          <div className="h-[240px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="week" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} allowDecimals={false} width={32} />
                <Tooltip content={<ChartTooltip labelKey="label" />} cursor={{ stroke: 'var(--color-border-strong)' }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Candidatures"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#dashArea)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Répartition par statut" icon={Target}>
          {statusData.length === 0 ? (
            <EmptyState compact icon={Target} title="Aucune donnée" description="Aucune candidature dans cette catégorie." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="h-[150px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.key} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold font-display tabular-nums">{stats.total}</span>
                  <span className="text-[11px] text-muted">au total</span>
                </div>
              </div>
              <ChartLegend items={statusData.map((d) => ({ label: d.name, value: d.value, color: d.fill }))} />
            </div>
          )}
        </Card>
      </div>

      {/* Actions & échéances */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Actions à effectuer"
          icon={AlertCircle}
          description={actions.length > 0 ? `${actions.length} élément${actions.length > 1 ? 's' : ''} nécessite${actions.length > 1 ? 'nt' : ''} votre attention` : undefined}
          className="lg:col-span-2"
          bodyClassName="!px-2"
        >
          {actions.length === 0 ? (
            <EmptyState compact icon={PartyPopper} title="Rien à faire pour le moment" description="Aucune relance en attente ni candidature à finaliser." />
          ) : (
            <>
              <ul className="divide-y divide-[var(--color-border)]">
                {visibleActions.map((item) => {
                  const canRelance = item.kind === 'relance_retard' || item.kind === 'relance_jour' || item.kind === 'sans_reponse';
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg row-hover">
                      <CompanyAvatar name={item.app.entreprise} logo={item.app.entrepriseLogo} size="sm" />
                      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/applications/${item.app.id}`)}>
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">
                          {item.app.poste} <span className="text-muted font-normal">· {item.app.entreprise}</span>
                        </p>
                        <p className="text-xs text-muted truncate mt-0.5">
                          <span className={`inline-block px-1.5 py-px rounded mr-1.5 font-medium ${ACTION_STYLES[item.kind]}`}>{item.label}</span>
                          {item.detail}
                        </p>
                      </button>
                      {canRelance ? (
                        <button
                          onClick={() => markRelanced(item.app.id, `${item.app.entreprise} — ${item.app.poste}`)}
                          className="btn-secondary btn-sm !px-2.5 !py-1.5 text-xs shrink-0"
                          title="J’ai relancé cette candidature"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Relancée</span>
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/applications/${item.app.id}`)} className="icon-btn" aria-label="Ouvrir">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {actions.length > 5 && (
                <button onClick={() => setShowAllActions((v) => !v)} className="mt-2 mx-3 text-xs font-medium text-theme inline-flex items-center gap-1 hover:underline">
                  {showAllActions ? 'Afficher moins' : `Afficher les ${actions.length - 5} autres`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllActions ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          )}
        </Card>

        <Card
          title="Prochaines échéances"
          icon={CalendarDays}
          actions={
            <button onClick={() => navigate('/calendar')} className="text-xs font-medium text-theme hover:underline">
              Calendrier
            </button>
          }
          bodyClassName="!px-2"
        >
          {deadlines.length === 0 ? (
            <EmptyState compact icon={CalendarDays} title="Aucune échéance" description="Ajoutez une date d’entretien ou de relance à vos candidatures." />
          ) : (
            <ul className="space-y-0.5">
              {deadlines.map((d) => {
                const meta = DEADLINE_META[d.type];
                const date = parseLocalDate(d.date)!;
                const days = daysFromToday(d.date) ?? 0;
                return (
                  <li key={d.id}>
                    <button onClick={() => navigate(`/applications/${d.app.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg row-hover text-left">
                      <div className="w-11 shrink-0 text-center rounded-lg border border-[var(--color-border)] py-1">
                        <p className="text-[10px] uppercase text-muted leading-none">{format(date, 'MMM', { locale: fr })}</p>
                        <p className="text-base font-semibold font-display tabular-nums leading-tight">{format(date, 'd')}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{d.app.entreprise}</p>
                        <p className="text-xs text-muted truncate flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 rounded ${meta.cls}`}>
                            <meta.icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          {days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} j`}
                          {d.type === 'entretien' && d.date.includes('T') && ` · ${formatDateTime(d.date).split('à ')[1] ?? ''}`}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Dernières candidatures & contrats */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Dernières candidatures ajoutées"
          icon={FileText}
          className="lg:col-span-2"
          actions={
            <button onClick={() => navigate('/applications')} className="text-xs font-medium text-theme hover:underline inline-flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </button>
          }
          bodyClassName="!px-2"
        >
          {recentApps.length === 0 ? (
            <EmptyState compact icon={FileText} title="Aucune candidature" description={`Aucune candidature en ${scopeLabel}.`} />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentApps.map((app) => (
                <li key={app.id}>
                  <button onClick={() => navigate(`/applications/${app.id}`)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg row-hover text-left">
                    <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{app.poste}</p>
                      <p className="text-xs text-muted truncate">
                        {app.entreprise}
                        {app.lieu && ` · ${app.lieu}`}
                        {scope === 'all' && ` · ${CATEGORY_LABELS[app.category]}`}
                      </p>
                    </div>
                    <span className="hidden sm:block text-xs text-muted whitespace-nowrap">{formatRelativeDate(app.createdAt)}</span>
                    <StatusBadge status={app.status} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Répartition par type de contrat" icon={CATEGORY_LUCIDE.cdi} description="Toutes catégories confondues">
          <ul className="space-y-3.5">
            {contractData.map((d) => {
              const Icon = CATEGORY_LUCIDE[d.key];
              const active = scope === d.key;
              return (
                <li key={d.key}>
                  <button onClick={() => changeScope(d.key)} className="w-full text-left group" aria-pressed={active}>
                    <div className="flex items-center gap-2 text-sm mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted" />
                      <span className={`flex-1 ${active ? 'font-semibold text-[var(--color-text)]' : 'text-muted group-hover:text-[var(--color-text)]'}`}>{d.name}</span>
                      <span className="font-medium tabular-nums">{d.value}</span>
                      <span className="text-xs text-muted tabular-nums w-9 text-right">
                        {applications.length ? Math.round((d.value / applications.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(d.value / maxContract) * 100}%`, background: d.fill, opacity: active || scope === 'all' ? 1 : 0.55 }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Activité & offres */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Activité récente" icon={History} bodyClassName="!px-2">
          {activity.length === 0 ? (
            <EmptyState compact icon={History} title="Aucune activité" />
          ) : (
            <ol className="relative">
              {activity.map(({ app, history }) => (
                <li key={history.id} className="flex gap-3 px-3 py-2 rounded-lg row-hover">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-theme-solid shrink-0" />
                  <button className="min-w-0 text-left" onClick={() => navigate(`/applications/${app.id}`)}>
                    <p className="text-sm text-[var(--color-text)]">
                      <span className="font-medium">{history.action}</span> <span className="text-muted">· {app.entreprise}</span>
                    </p>
                    <p className="text-xs text-muted truncate">{formatRelativeDate(history.date)} · {history.detail}</p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card
          title="Offres acceptées"
          icon={Trophy}
          className="lg:col-span-2"
          actions={
            accepted.length > 0 && (
              <button onClick={() => navigate('/negociation')} className="text-xs font-medium text-theme hover:underline inline-flex items-center gap-1">
                Comparer <ArrowRight className="w-3 h-3" />
              </button>
            )
          }
        >
          {accepted.length === 0 ? (
            <EmptyState compact icon={Trophy} title="Pas encore d’offre acceptée" description="Les offres acceptées apparaîtront ici pour vous aider à négocier." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {[...accepted]
                .sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire))
                .slice(0, 4)
                .map((offer, i) => {
                  const best = i === 0 && parseSalary(offer.salaire) > 0 && accepted.length > 1;
                  return (
                    <button
                      key={offer.id}
                      onClick={() => navigate(`/applications/${offer.id}`)}
                      className={`text-left p-3.5 rounded-xl border transition-colors hover:border-[rgba(var(--color-primary-rgb),0.35)] ${
                        best ? 'border-green-500/30 bg-green-500/5' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CompanyAvatar name={offer.entreprise} logo={offer.entrepriseLogo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{offer.poste}</p>
                          <p className="text-xs text-muted truncate">{offer.entreprise}</p>
                        </div>
                        {best && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">Meilleure</span>}
                      </div>
                      <p className="mt-2.5 text-sm font-semibold tabular-nums">{offer.salaire || <span className="text-muted font-normal">Salaire non renseigné</span>}</p>
                    </button>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
