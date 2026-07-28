import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS } from '@/types';
import type { ContractCategory } from '@/types';
import { getStats, getRelancesToday, getUpcomingInterviews, getRecentActivity, formatRelativeDate, parseSalary, getDaysRemaining, formatDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Target,
  Timer,
  RefreshCw,
  ArrowUpRight,
  Plus,
  DollarSign,
  MapPin,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

const PIE_COLORS = ['#a855f7', '#f59e0b', '#f97316', '#22c55e', '#ef4444', '#6b7280'];

export default function Dashboard() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const navigate = useNavigate();

  const stats = useMemo(() => getStats(applications, activeCategory), [applications, activeCategory]);
  const relancesToday = useMemo(() => getRelancesToday(applications), [applications]);
  const upcomingInterviews = useMemo(() => getUpcomingInterviews(applications), [applications]);
  const recentActivity = useMemo(() => getRecentActivity(applications, 5), [applications]);

  const categoryApps = useMemo(
    () => applications.filter((a) => a.category === activeCategory),
    [applications, activeCategory]
  );

  const allAccepted = useMemo(
    () => applications.filter((a) => a.status === 'acceptee' && a.category === activeCategory),
    [applications, activeCategory]
  );

  const upcomingStarts = useMemo(
    () => applications
      .filter((a) => a.dateDebut && (a.category === 'stage' || a.category === 'alternance'))
      .sort((a, b) => new Date(a.dateDebut!).getTime() - new Date(b.dateDebut!).getTime())
      .filter((a) => {
        const days = getDaysRemaining(a.dateDebut);
        return days !== null && days >= 0;
      })
      .slice(0, 5),
    [applications]
  );

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    categoryApps.forEach((a) => {
      map[a.status] = (map[a.status] || 0) + 1;
    });
    return Object.entries(map).map(([key, value]) => ({ name: key, value }));
  }, [categoryApps]);

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${activeCategory === cat
                ? 'bg-theme-solid text-white shadow-lg shadow-theme'
                : 'glass-card text-gray-400 hover:text-gray-200'
              }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => navigate('/applications/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle candidature
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={FileText} label="Total" value={stats.total} color="purple" />
        <StatCard icon={Clock} label="En attente" value={stats.enAttente} color="yellow" />
        <StatCard icon={Calendar} label="Entretiens" value={stats.entretiens} color="orange" />
        <StatCard icon={CheckCircle2} label="Acceptées" value={stats.acceptees} color="green" />
        <StatCard icon={XCircle} label="Refusées" value={stats.refusees} color="red" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Taux de réponse" value={`${stats.tauxReponse}%`} color="purple" />
        <StatCard icon={Target} label="Taux d'acceptation" value={`${stats.tauxAcceptation}%`} color="green" />
        <StatCard icon={Timer} label="Délai moyen" value={`${stats.avgTime}j`} color="orange" />
        <StatCard icon={RefreshCw} label="Relances" value={stats.relances} color="blue" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly applications */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Candidatures par semaine</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={
              (() => {
                const now = new Date();
                const data = [];
                for (let i = 11; i >= 0; i--) {
                  const start = new Date(now);
                  start.setDate(start.getDate() - i * 7 - start.getDay() + 1);
                  const end = new Date(start);
                  end.setDate(end.getDate() + 7);
                  const count = categoryApps.filter((a) => {
                    const d = new Date(a.dateCandidature);
                    return d >= start && d < end;
                  }).length;
                  data.push({ week: `${start.getDate()}/${start.getMonth() + 1}`, count });
                }
                return data;
              })()
            }>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 17, 40, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition par statut</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 17, 40, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Countdown: Upcoming stage/alternance start dates */}
      {upcomingStarts.length > 0 && (
        <div className="glass-card p-6 border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Objectifs à venir</h3>
              <p className="text-xs text-gray-400">{upcomingStarts.length} date{upcomingStarts.length > 1 ? 's' : ''} de début à venir</p>
            </div>
          </div>
          <div className="space-y-2">
            {upcomingStarts.map((app) => {
              const days = getDaysRemaining(app.dateDebut);
              const isUrgent = days !== null && days <= 14;
              const isToday = days === 0;
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/5
                    ${isToday ? 'bg-green-500/10 border border-green-500/20' : isUrgent ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                    ${isToday ? 'bg-green-500/20' : isUrgent ? 'bg-blue-500/20' : 'bg-white/10'}`}>
                    <span className={`text-lg font-bold font-display
                      ${isToday ? 'text-green-400' : isUrgent ? 'text-blue-400' : 'text-gray-400'}`}>
                      {days === 0 ? '🎉' : days}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-sm text-[var(--color-text)] truncate">
                      {app.entreprise} — {app.poste}
                    </p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[app.category as ContractCategory]} · Début le {formatDate(app.dateDebut!, 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${isToday ? 'text-green-400' : isUrgent ? 'text-blue-400' : 'text-gray-400'}`}>
                      {isToday ? "C'est aujourd'hui !" : days === 1 ? 'Demain !' : `${days} jours restants`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Negotiation: Compare accepted offers */}
      {allAccepted.length >= 2 && (() => {
        const withSalary = allAccepted.filter((a) => a.salaire && parseSalary(a.salaire) > 0);
        const maxSal = withSalary.length > 0 ? Math.max(...withSalary.map((a) => parseSalary(a.salaire))) : 1;

        return (
          <div className="glass-card p-6 border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Comparaison des offres · {CATEGORY_LABELS[activeCategory]}</h3>
                <p className="text-xs text-gray-400">{allAccepted.length} offres acceptées — comparez pour négocier</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...allAccepted]
                .sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire))
                .map((offer, index) => {
                  const sal = parseSalary(offer.salaire);
                  const pct = maxSal > 0 ? (sal / maxSal) * 100 : 0;
                  const isBest = index === 0 && sal > 0;
                  const diffPct = maxSal > 0 && sal > 0 ? Math.round(((maxSal - sal) / maxSal) * 100) : 0;

                  return (
                    <div
                      key={offer.id}
                      className={`relative p-4 rounded-2xl border transition-all hover:border-white/20 cursor-pointer
                        ${isBest ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20' : 'bg-white/5 border-white/10'}`}
                      onClick={() => navigate(`/applications/${offer.id}`)}
                    >
                      {isBest && sal > 0 && (
                        <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold shadow-lg">
                          🏆 Best
                        </div>
                      )}

                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-theme-gradient-subtle flex items-center justify-center text-sm font-bold text-theme shrink-0">
                          {offer.entreprise.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-[var(--color-text)] truncate">{offer.poste}</h4>
                          <p className="text-xs text-gray-400 truncate">{offer.entreprise}</p>
                          {offer.lieu && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />{offer.lieu}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-green-400" />
                          <span className={`text-lg font-bold font-display ${isBest ? 'text-green-400' : 'text-[var(--color-text)]'}`}>
                            {offer.salaire || 'N/A'}
                          </span>
                        </div>
                        {sal > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isBest ? 'bg-green-500' : 'bg-theme-solid'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {!isBest && diffPct > 0 && (
                              <span className="text-[10px] text-gray-500">-{diffPct}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })()}

      {/* Bottom row: Relances, Interviews, Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Relances today */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-400" />
            Relances du jour
          </h3>
          {relancesToday.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune relance aujourd'hui</p>
          ) : (
            <div className="space-y-2">
              {relancesToday.map((app) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="w-full text-left p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                >
                  <p className="font-medium text-sm">{app.poste}</p>
                  <p className="text-xs text-gray-400">{app.entreprise}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming interviews */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-400" />
            Entretiens à venir
          </h3>
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun entretien prévu</p>
          ) : (
            <div className="space-y-2">
              {upcomingInterviews.map((app) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="w-full text-left p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
                >
                  <p className="font-medium text-sm">{app.poste}</p>
                  <p className="text-xs text-gray-400">{app.entreprise}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-3">Activité récente</h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune activité récente</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(({ app, history }) => (
                <div key={history.date} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-light" />
                    <p className="text-sm font-medium">{history.action}</p>
                  </div>
                  <p className="text-xs text-gray-400 ml-3.5">
                    {app.poste} - {app.entreprise} · {formatRelativeDate(history.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="glass-card p-4 group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold font-display text-[var(--color-text)]">{value}</p>
    </div>
  );
}
