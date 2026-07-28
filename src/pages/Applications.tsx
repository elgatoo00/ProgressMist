import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_DOT_COLORS, METHOD_LABELS, STATUS_COLORS } from '@/types';
import type { Application, ContractCategory, ApplicationStatus } from '@/types';
import { formatDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  MapPin,
  Calendar,
} from 'lucide-react';

const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

export default function Applications() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const performRelance = useAppStore((s) => s.performRelance);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let apps = applications.filter((a) => a.category === activeCategory);
    if (search) {
      const s = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.entreprise.toLowerCase().includes(s) ||
          a.poste.toLowerCase().includes(s) ||
          a.lieu.toLowerCase().includes(s) ||
          a.contact.name.toLowerCase().includes(s) ||
          a.notes.toLowerCase().includes(s) ||
          a.technologies.some((t) => t.toLowerCase().includes(s))
      );
    }
    if (statusFilter) {
      apps = apps.filter((a) => a.status === statusFilter);
    }
    return apps.sort(
      (a, b) => new Date(b.dateCandidature).getTime() - new Date(a.dateCandidature).getTime()
    );
  }, [applications, activeCategory, search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="section-title">Candidatures</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length} candidature{filtered.length !== 1 ? 's' : ''} en {CATEGORY_LABELS[activeCategory]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/applications/new/assistant')}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Assistant
          </button>
          <button
            onClick={() => navigate('/applications/new')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle
          </button>
        </div>
      </div>

      {/* Category + Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 glass-card p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${activeCategory === cat
                  ? 'bg-theme-solid text-white'
                  : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-ghost p-2 ${statusFilter ? 'text-theme' : ''}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Status filter chips */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap animate-slide-down">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${!statusFilter ? 'bg-theme-subtle-20 text-theme' : 'text-gray-400'}`}
          >
            Tous
          </button>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${statusFilter === key ? 'bg-theme-subtle-20 text-theme ring-1 ring-[var(--color-primary)]/30' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT_COLORS[key as ApplicationStatus]} mr-1.5`} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Applications grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-theme-subtle flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-theme" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune candidature</h3>
          <p className="text-gray-400 mb-4">
            {search || statusFilter
              ? 'Aucun résultat pour cette recherche'
              : `Commencez par ajouter votre première candidature en ${CATEGORY_LABELS[activeCategory]}`}
          </p>
          <button
            onClick={() => navigate('/applications/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle candidature
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onView={() => navigate(`/applications/${app.id}`)}
              onEdit={() => navigate(`/applications/${app.id}?edit=true`)}
              onDelete={() => {
                if (confirm('Supprimer cette candidature ?')) deleteApplication(app.id);
              }}
              onRelance={() => performRelance(app.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  onView,
  onEdit,
  onDelete,
  onRelance,
}: {
  app: Application;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRelance: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="glass-card p-5 group relative overflow-hidden">
      <div className="card-highlight" />
      
      {/* Status dot + date */}
      <div className="flex items-center justify-between mb-4">
        <span className={`badge ${STATUS_COLORS[app.status]}`}>
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[app.status]}`} />
          {STATUS_LABELS[app.status]}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="btn-ghost p-1.5"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 glass p-1 rounded-xl min-w-[140px] animate-scale-in">
                <button onClick={() => { onView(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-white/10 text-left">
                  <Eye className="w-3.5 h-3.5" /> Voir
                </button>
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-white/10 text-left">
                  <Edit3 className="w-3.5 h-3.5" /> Modifier
                </button>
                {app.prochaineRelance && (
                  <button onClick={() => { onRelance(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-white/10 text-left">
                    <RefreshCw className="w-3.5 h-3.5" /> Relance faite
                  </button>
                )}
                <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-500/20 text-red-400 text-left">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <button onClick={onView} className="w-full text-left">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-theme-gradient-subtle flex items-center justify-center text-lg font-bold text-theme shrink-0">
            {app.entrepriseLogo ? (
              <img src={app.entrepriseLogo} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              app.entreprise.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--color-text)] truncate">{app.poste}</h3>
            <p className="text-sm text-gray-400 truncate">{app.entreprise}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400">
          {app.lieu && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {app.lieu}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(app.dateCandidature)}
          </span>
        </div>

        {/* Méthode */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-gray-400">
            {METHOD_LABELS[app.moyenCandidature]}
          </span>
          {app.relancesEffectuees > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
              {app.relancesEffectuees} relance{app.relancesEffectuees > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
