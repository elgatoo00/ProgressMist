import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Target, Timer, CalendarCheck, BarChart3, Filter as FunnelIcon, Globe, Layers, Table2, Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ContractCategory } from '@/types';
import { ALL_CATEGORIES, ALL_STATUSES, CATEGORY_HEX, CATEGORY_LABELS, STATUS_HEX, STATUS_LABELS } from '@/types';
import { filterByCategory, getPlatformDistribution, getResponseDate, getStats, getWeeklyApplications, isSent, parseLocalDate } from '@/utils/helpers';
import { Card, CategoryTabs, EmptyState, PageHeader, StatCard } from '@/components/ui/primitives';
import { ChartLegend, ChartTooltip, axisProps, gridProps } from '@/components/ui/chart';

type Scope = ContractCategory | 'all';

export default function Analytics() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>(activeCategory);
  const [granularity, setGranularity] = useState<'week' | 'month'>('week');

  const changeScope = (s: Scope) => {
    setScope(s);
    if (s !== 'all') setActiveCategory(s);
  };

  const scoped = useMemo(() => filterByCategory(applications, scope), [applications, scope]);
  const stats = useMemo(() => getStats(scoped), [scoped]);

  const timeline = useMemo(() => {
    if (granularity === 'week') return getWeeklyApplications(scoped, 12);
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const start = startOfMonth(subMonths(now, 11 - i));
      const end = startOfMonth(subMonths(now, 10 - i));
      const count = scoped.filter((a) => {
        const d = parseLocalDate(a.dateCandidature);
        return !!d && d >= start && d < end;
      }).length;
      return { week: format(start, 'MMM', { locale: fr }), label: format(start, 'MMMM yyyy', { locale: fr }), count };
    });
  }, [scoped, granularity]);

  const statusData = useMemo(
    () => ALL_STATUSES.map((s) => ({ key: s, name: STATUS_LABELS[s], value: scoped.filter((a) => a.status === s).length, fill: STATUS_HEX[s] })).filter((d) => d.value > 0),
    [scoped]
  );

  const platformData = useMemo(() => {
    const dist = getPlatformDistribution(scoped);
    return dist.map((d) => {
      const apps = scoped.filter((a) => a.moyenCandidature === d.key && isSent(a));
      const responded = apps.filter((a) => ['entretien', 'acceptee', 'refusee'].includes(a.status)).length;
      return { ...d, taux: apps.length ? Math.round((responded / apps.length) * 100) : 0 };
    });
  }, [scoped]);

  const funnel = useMemo(() => {
    const sent = scoped.filter(isSent);
    const responded = sent.filter((a) => ['entretien', 'acceptee', 'refusee'].includes(a.status) || a.echanges.some((e) => e.direction === 'entrant'));
    const interviews = sent.filter((a) => a.status === 'entretien' || a.status === 'acceptee' || a.entrevueDates.length > 0);
    const accepted = sent.filter((a) => a.status === 'acceptee');
    return [
      { label: 'Envoyées', value: sent.length },
      { label: 'Réponses reçues', value: responded.length },
      { label: 'Entretiens', value: interviews.length },
      { label: 'Offres acceptées', value: accepted.length },
    ];
  }, [scoped]);

  const delayBuckets = useMemo(() => {
    const buckets = [
      { label: '< 1 sem.', max: 7, value: 0 },
      { label: '1–2 sem.', max: 14, value: 0 },
      { label: '2–4 sem.', max: 30, value: 0 },
      { label: '> 1 mois', max: Infinity, value: 0 },
    ];
    scoped.forEach((a) => {
      if (!['entretien', 'acceptee', 'refusee'].includes(a.status)) return;
      const sent = parseLocalDate(a.dateCandidature);
      const reply = getResponseDate(a);
      if (!sent || !reply) return;
      const days = Math.max(0, Math.round((reply.getTime() - sent.getTime()) / 86400000));
      buckets.find((b) => days < b.max)!.value++;
    });
    return buckets;
  }, [scoped]);

  const categoryComparison = useMemo(
    () => ALL_CATEGORIES.map((cat) => {
      const s = getStats(applications, cat);
      return { name: CATEGORY_LABELS[cat], key: cat, ...s };
    }),
    [applications]
  );

  const scopeLabel = scope === 'all' ? 'toutes catégories' : CATEGORY_LABELS[scope];
  const funnelMax = Math.max(1, funnel[0].value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Statistiques détaillées · ${scopeLabel}`}
        actions={<CategoryTabs value={scope} onChange={changeScope} includeAll />}
      />

      {scoped.length === 0 ? (
        <div className="card">
          <EmptyState icon={BarChart3} title={`Pas encore de données en ${scopeLabel}`} description="Les graphiques se rempliront automatiquement à mesure que vous ajoutez des candidatures." action={<button onClick={() => navigate('/applications/new')} className="btn-primary btn-sm">Ajouter une candidature</button>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Taux de réponse" value={stats.tauxReponse} suffix="%" hint={`${stats.envoyees} candidatures envoyées`} />
            <StatCard icon={Target} label="Taux d’acceptation" value={stats.tauxAcceptation} suffix="%" tone="green" hint={`${stats.acceptees} offre${stats.acceptees > 1 ? 's' : ''} acceptée${stats.acceptees > 1 ? 's' : ''}`} />
            <StatCard icon={Timer} label="Délai moyen de réponse" value={stats.avgTime} suffix={stats.avgTime > 1 ? 'jours' : 'jour'} tone="blue" hint={stats.hasAvgTime ? 'Entre l’envoi et la 1re réponse' : 'Pas encore de réponse'} />
            <StatCard icon={CalendarCheck} label="Entretiens décrochés" value={funnel[2].value} tone="orange" hint={`${stats.entretiensProgrammes} à venir`} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card
              title="Volume de candidatures"
              icon={Send}
              className="lg:col-span-2"
              actions={
                <div className="segmented">
                  {(['week', 'month'] as const).map((g) => (
                    <button key={g} onClick={() => setGranularity(g)} aria-pressed={granularity === g} className={`segmented-item !py-1 !px-2.5 text-xs ${granularity === g ? 'segmented-item-active' : ''}`}>
                      {g === 'week' ? 'Semaines' : 'Mois'}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="h-[260px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="week" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
                    <YAxis {...axisProps} allowDecimals={false} width={32} />
                    <Tooltip content={<ChartTooltip labelKey="label" />} cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.06)' }} />
                    <Bar dataKey="count" name="Candidatures" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Entonnoir de conversion" icon={FunnelIcon}>
              <ol className="space-y-4">
                {funnel.map((step, i) => {
                  const pct = Math.round((step.value / funnelMax) * 100);
                  const prev = i > 0 ? funnel[i - 1].value : null;
                  const conv = prev ? Math.round((step.value / prev) * 100) : null;
                  return (
                    <li key={step.label}>
                      <div className="flex items-baseline justify-between text-sm mb-1.5">
                        <span className="text-muted">{step.label}</span>
                        <span>
                          <span className="font-semibold tabular-nums">{step.value}</span>
                          {conv !== null && <span className="text-xs text-muted ml-1.5">({conv}%)</span>}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-theme-solid transition-[width] duration-700" style={{ width: `${pct}%`, opacity: 1 - i * 0.18 }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs text-muted mt-5">Entre parenthèses : taux de passage depuis l’étape précédente.</p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Répartition des statuts" icon={Target}>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={74} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.key} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <ChartLegend items={statusData.map((d) => ({ label: d.name, value: d.value, color: d.fill }))} />
              </div>
            </Card>

            <Card title="Par plateforme" icon={Globe} description="Volume et taux de réponse">
              {platformData.length === 0 ? (
                <EmptyState compact icon={Globe} title="Aucune donnée" />
              ) : (
                <ul className="space-y-3">
                  {platformData.map((p) => (
                    <li key={p.key}>
                      <div className="flex items-baseline justify-between text-sm mb-1">
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted shrink-0 ml-2">
                          <span className="font-semibold text-[var(--color-text)] tabular-nums">{p.value}</span> · {p.taux}% réponses
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-theme-solid" style={{ width: `${(p.value / platformData[0].value) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Délai de réponse" icon={Timer} description="Nombre de réponses selon le délai">
              <div className="h-[220px] -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={delayBuckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} allowDecimals={false} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.06)' }} />
                    <Bar dataKey="value" name="Réponses" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Comparaison entre catégories */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card title="Comparaison par catégorie" icon={Layers} className="lg:col-span-2">
          <div className="h-[240px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryComparison} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} domain={[0, 100]} width={32} unit="%" />
                <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.06)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                <Bar dataKey="tauxReponse" name="Taux de réponse" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="tauxAcceptation" name="Taux d’acceptation" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Résumé par catégorie" icon={Table2} className="lg:col-span-3" bodyClassName="!px-0 !pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[var(--color-border)]">
                  {['Catégorie', 'Total', 'En attente', 'Entretiens', 'Acceptées', 'Refusées', 'Réponse', 'Accept.'].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-2.5 text-xs font-medium text-muted whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {categoryComparison.map((c) => (
                  <tr key={c.key} className={`row-hover cursor-pointer ${scope === c.key ? 'bg-theme-subtle-05' : ''}`} onClick={() => changeScope(c.key)}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: CATEGORY_HEX[c.key] }} />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{c.enAttente}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{c.entretiens}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">{c.acceptees}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">{c.refusees}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.tauxReponse}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.tauxAcceptation}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
