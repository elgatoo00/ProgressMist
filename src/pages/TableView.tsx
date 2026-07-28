import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_LABELS, STATUS_DOT_COLORS, METHOD_LABELS, CATEGORY_LABELS, STATUS_COLORS } from '@/types';
import type { ContractCategory, ApplicationStatus } from '@/types';
import { formatDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, ArrowUpDown, Edit3, Eye, MoreVertical, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';

type SortField = 'entreprise' | 'poste' | 'dateCandidature' | 'status';
type SortDir = 'asc' | 'desc';

const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

export default function TableView() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const performRelance = useAppStore((s) => s.performRelance);
  const updateApplication = useAppStore((s) => s.updateApplication);
  const addHistory = useAppStore((s) => s.addHistory);
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'acceptee' | 'refusee'>('acceptee');
  const [statusMenuAppId, setStatusMenuAppId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateCandidature');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let apps = applications.filter((a) => a.category === activeCategory);
    if (search) {
      const s = search.toLowerCase();
      apps = apps.filter((a) =>
        a.entreprise.toLowerCase().includes(s) ||
        a.poste.toLowerCase().includes(s) ||
        a.lieu.toLowerCase().includes(s) ||
        a.contact.name.toLowerCase().includes(s) ||
        a.notes.toLowerCase().includes(s)
      );
    }
    if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);
    if (methodFilter) apps = apps.filter((a) => a.moyenCandidature === methodFilter);
    return apps.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [applications, activeCategory, search, statusFilter, methodFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="animate-fade-in">
      <h1 className="section-title mb-1">Tableau</h1>
      <p className="text-sm text-gray-400 mb-6">{filtered.length} candidature{filtered.length !== 1 ? 's' : ''} · {CATEGORY_LABELS[activeCategory]}</p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 glass-card p-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 py-2 text-sm" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-ghost p-2 ${statusFilter || methodFilter ? 'text-theme' : ''}`}>
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 mb-4 animate-slide-down">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-input text-sm py-1.5">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="glass-input text-sm py-1.5">
            <option value="">Toutes les méthodes</option>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {statusFilter && <button onClick={() => { setStatusFilter(''); setMethodFilter(''); }} className="text-xs text-gray-400 hover:text-gray-200">Réinitialiser</button>}
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  { field: 'entreprise' as SortField, label: 'Entreprise' },
                  { field: 'poste' as SortField, label: 'Poste' },
                  { field: 'dateCandidature' as SortField, label: 'Date' },
                  { field: 'status' as SortField, label: 'Statut' },
                  { label: 'Relance' },
                  { label: 'Contact' },
                  { label: 'Type' },
                  { label: 'Actions' },
                ].map((col) => (
                  <th key={col.label}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider
                      ${col.field ? 'cursor-pointer hover:text-gray-200' : ''}`}
                    onClick={() => col.field && toggleSort(col.field)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Aucune candidature trouvée</td></tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/applications/${app.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-theme-gradient-subtle flex items-center justify-center text-xs font-bold text-theme">
                          {app.entreprise.charAt(0)}
                        </div>
                        <span className="font-medium text-sm text-[var(--color-text)]">{app.entreprise}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text)]">{app.poste}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(app.dateCandidature, 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setStatusMenuAppId(statusMenuAppId === app.id ? null : app.id)}
                        className={`badge text-[11px] cursor-pointer hover:scale-105 transition-transform ${STATUS_COLORS[app.status]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[app.status]}`} />
                        {STATUS_LABELS[app.status]}
                      </button>
                      {statusMenuAppId === app.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setStatusMenuAppId(null)} />
                          <div className="absolute left-0 top-full mt-1 z-20 glass p-1 rounded-xl min-w-[160px] animate-scale-in">
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  const newStatus = key as ApplicationStatus;
                                  updateApplication(app.id, { status: newStatus });
                                  addHistory(app.id, 'Statut modifié', `Statut changé en "${label}" (Tableau)`);
                                  setStatusMenuAppId(null);
                                  if (newStatus === 'acceptee' || newStatus === 'refusee') {
                                    setCelebrationType(newStatus);
                                    setShowCelebration(true);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2
                                  ${app.status === key
                                    ? 'bg-theme-subtle-15 text-theme'
                                    : 'hover:bg-white/10 text-gray-400'}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[key as ApplicationStatus]}`} />
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {app.relancesEffectuees > 0 && (
                        <span className="text-xs text-purple-400 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />{app.relancesEffectuees}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{app.contact.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{METHOD_LABELS[app.moyenCandidature]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/applications/${app.id}`)} className="btn-ghost p-1.5">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => navigate(`/applications/${app.id}?edit=true`)} className="btn-ghost p-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Celebration Overlay */}
      <CelebrationOverlay show={showCelebration} type={celebrationType} onComplete={() => setShowCelebration(false)} />
    </div>
  );
}
