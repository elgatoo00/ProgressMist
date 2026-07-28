import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Company, Contact } from '@/types';
import { generateId } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Edit3, Trash2, Globe, MapPin, Users, Search, Save, X, ArrowLeft,
} from 'lucide-react';

export default function Companies() {
  const companies = useAppStore((s) => s.companies);
  const applications = useAppStore((s) => s.applications);
  const addCompany = useAppStore((s) => s.addCompany);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const deleteCompany = useAppStore((s) => s.deleteCompany);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Company>>({
    nom: '', secteur: '', taille: '', adresse: '', siteWeb: '', notes: '',
    contactsRH: [], recruteurs: [], candidatureIds: [],
  });

  const filtered = useMemo(() => {
    if (!search) return companies;
    const s = search.toLowerCase();
    return companies.filter((c) =>
      c.nom.toLowerCase().includes(s) || c.secteur.toLowerCase().includes(s)
    );
  }, [companies, search]);

  const getAppCount = (company: Company) => {
    return applications.filter((a) => a.entreprise.toLowerCase() === company.nom.toLowerCase()).length;
  };

  const resetForm = () => {
    setForm({ nom: '', secteur: '', taille: '', adresse: '', siteWeb: '', notes: '', contactsRH: [], recruteurs: [], candidatureIds: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.nom?.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      updateCompany(editingId, { ...form, updatedAt: now } as Partial<Company>);
    } else {
      addCompany({
        id: generateId(),
        nom: form.nom || '',
        logo: '',
        secteur: form.secteur || '',
        taille: form.taille || '',
        adresse: form.adresse || '',
        siteWeb: form.siteWeb || '',
        contactsRH: [],
        recruteurs: [],
        notes: form.notes || '',
        candidatureIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }
    resetForm();
  };

  const startEdit = (company: Company) => {
    setForm(company);
    setEditingId(company.id);
    setShowForm(true);
  };

  const inputClass = "glass-input w-full text-sm py-2";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Entreprises</h1>
          <p className="text-sm text-gray-400">{companies.length} entreprise{companies.length !== 1 ? 's' : ''} suivie{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />Nouvelle entreprise
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-slide-down">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={resetForm} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold">{editingId ? "Modifier l'entreprise" : "Nouvelle entreprise"}</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-400">Nom *</label><input className={inputClass} value={form.nom || ''} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom de l'entreprise" /></div>
            <div><label className="text-sm text-gray-400">Secteur</label><input className={inputClass} value={form.secteur || ''} onChange={(e) => setForm({ ...form, secteur: e.target.value })} placeholder="Ex: Tech, Finance..." /></div>
            <div><label className="text-sm text-gray-400">Taille</label><input className={inputClass} value={form.taille || ''} onChange={(e) => setForm({ ...form, taille: e.target.value })} placeholder="Ex: 50-200 employés" /></div>
            <div><label className="text-sm text-gray-400">Adresse</label><input className={inputClass} value={form.adresse || ''} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse" /></div>
            <div><label className="text-sm text-gray-400">Site web</label><input className={inputClass} value={form.siteWeb || ''} onChange={(e) => setForm({ ...form, siteWeb: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2"><label className="text-sm text-gray-400">Notes</label><textarea className={`${inputClass} min-h-[80px]`} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes personnelles..." /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={resetForm} className="btn-secondary text-sm">Annuler</button>
            <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-2"><Save className="w-4 h-4" />Enregistrer</button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Rechercher une entreprise..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full glass-input pl-10 py-2 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune entreprise</h3>
          <p className="text-gray-400">Ajoutez des entreprises pour suivre vos contacts</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company) => {
            const appCount = getAppCount(company);
            return (
              <div key={company.id} className="glass-card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-theme-gradient-subtle flex items-center justify-center text-lg font-bold text-theme">
                      {company.logo ? <img src={company.logo} alt="" className="w-8 h-8 rounded-lg object-cover" /> : company.nom.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text)]">{company.nom}</h3>
                      {company.secteur && <p className="text-xs text-gray-400">{company.secteur}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(company)} className="btn-ghost p-1.5"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteCompany(company.id); }} className="btn-ghost p-1.5 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-400">
                  {company.taille && <p className="flex items-center gap-1.5"><Users className="w-3 h-3" />{company.taille}</p>}
                  {company.adresse && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{company.adresse}</p>}
                  {company.siteWeb && (
                    <a href={company.siteWeb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-theme hover:underline">
                      <Globe className="w-3 h-3" />Site web
                    </a>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{appCount} candidature{appCount !== 1 ? 's' : ''}</span>
                  <button onClick={() => navigate(`/applications?search=${encodeURIComponent(company.nom)}`)} className="text-xs text-theme hover:underline">
                    Voir les candidatures
                  </button>
                </div>

                {company.notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-400 line-clamp-2">{company.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
