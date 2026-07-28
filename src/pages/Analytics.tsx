import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS } from '@/types';
import type { ContractCategory } from '@/types';
import { getPlatformDistribution, getStats } from '@/utils/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { TrendingUp, Target, Timer, CheckCircle2, XCircle, Calendar } from 'lucide-react';

const PIE_COLORS = ['#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#f97316', '#3b82f6', '#6b7280'];
const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

export default function Analytics() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);

  const stats = useMemo(() => getStats(applications, activeCategory), [applications, activeCategory]);
  const categoryApps = useMemo(() => applications.filter((a) => a.category === activeCategory), [applications, activeCategory]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7 - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = categoryApps.filter((a) => {
        const d = new Date(a.dateCandidature);
        return d >= start && d < end;
      }).length;
      return { week: `${start.getDate()}/${start.getMonth() + 1}`, count };
    }).reverse();
  }, [categoryApps]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    categoryApps.forEach((a) => { map[a.status] = (map[a.status] || 0) + 1; });
    return Object.entries(map).map(([key, value]) => ({ name: key, value }));
  }, [categoryApps]);

  const platformData = useMemo(() => getPlatformDistribution(categoryApps), [categoryApps]);

  const responseRateData = useMemo(() => {
    return categories.map((cat) => {
      const s = getStats(applications, cat);
      return { name: CATEGORY_LABELS[cat], tauxReponse: s.tauxReponse, tauxAcceptation: s.tauxAcceptation };
    });
  }, [applications]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Analytics</h1>
          <p className="text-sm text-gray-400">Statistiques détaillées de vos candidatures</p>
        </div>
        <div className="flex items-center gap-1 glass-card p-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} label="Taux de réponse" value={`${stats.tauxReponse}%`} color="purple" />
        <KpiCard icon={Target} label="Taux d'acceptation" value={`${stats.tauxAcceptation}%`} color="green" />
        <KpiCard icon={Timer} label="Délai moyen" value={`${stats.avgTime} jours`} color="orange" />
        <KpiCard icon={CheckCircle2} label="Entretiens décrochés" value={stats.entretiens} color="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly applications */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-theme" />
            Candidatures par semaine
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(26,17,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition des statuts</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(26,17,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Platform distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition par plateforme</h3>
          {platformData.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                  {platformData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(26,17,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cross-category comparison */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Comparaison par catégorie</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={responseRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'rgba(26,17,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9' }} />
              <Legend />
              <Bar dataKey="tauxReponse" name="Taux réponse %" fill="#a855f7" radius={[6, 6, 0, 0]} />
              <Bar dataKey="tauxAcceptation" name="Taux acceptation %" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">Résumé par catégorie</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Catégorie', 'Total', 'En attente', 'Entretiens', 'Acceptées', 'Refusées', 'Taux réponse', 'Taux accept.'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const s = getStats(applications, cat);
                return (
                  <tr key={cat} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">{CATEGORY_LABELS[cat]}</td>
                    <td className="px-4 py-3 text-sm">{s.total}</td>
                    <td className="px-4 py-3 text-sm">{s.enAttente}</td>
                    <td className="px-4 py-3 text-sm">{s.entretiens}</td>
                    <td className="px-4 py-3 text-sm text-green-400">{s.acceptees}</td>
                    <td className="px-4 py-3 text-sm text-red-400">{s.refusees}</td>
                    <td className="px-4 py-3 text-sm">{s.tauxReponse}%</td>
                    <td className="px-4 py-3 text-sm">{s.tauxAcceptation}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold font-display text-[var(--color-text)]">{value}</p>
    </div>
  );
}
