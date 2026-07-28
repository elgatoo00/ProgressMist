import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ContractCategory, ApplicationMethod, ApplicationStatus, RelanceDelay, MaxRelances, AttachedFile } from '@/types';
import { CATEGORY_LABELS, METHOD_LABELS, STATUS_LABELS, RELANCE_LABELS } from '@/types';
import { generateId } from '@/utils/helpers';
import {
  ArrowLeft,
  Save,
  Bot,
  Plus,
  X,
  Upload,
  Paperclip,
} from 'lucide-react';

export default function NewApplication() {
  const navigate = useNavigate();
  const addApplication = useAppStore((s) => s.addApplication);
  const settings = useAppStore((s) => s.settings);
  const activeCategory = useAppStore((s) => s.activeCategory);

  const [form, setForm] = useState<Partial<Application>>({
    category: activeCategory,
    status: 'a_preparer',
    moyenCandidature: 'email',
    relanceDelay: settings.defaultRelanceDelay,
    customRelanceDays: undefined,
    maxRelances: settings.defaultMaxRelances,
    teletravail: false,
    remunere: false,
    cvEnvoye: false,
    lettreEnvoyee: false,
    portfolioEnvoye: false,
    githubEnvoye: false,
    contact: { name: '', role: '', email: '', phone: '', linkedin: '' },
    technologies: [],
    piecesJointes: [],
    historique: [],
    relancesEffectuees: 0,
    salaire: '',
    lienOffre: '',
    lienLinkedIn: '',
    siteEntreprise: '',
    datePublication: '',
    dateDebut: '',
    notes: '',
    entrevueDates: [],
    prochaineRelance: null,
    dernierContact: null,
    entrepriseLogo: '',
  });
  const [techInput, setTechInput] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const processFile = (e: React.ChangeEvent<HTMLInputElement>, fileType: AttachedFile['type']) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newFile: AttachedFile = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        name: file.name,
        type: fileType,
        url: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      setForm((prev) => ({
        ...prev,
        piecesJointes: [...(prev.piecesJointes || []), newFile],
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      contact: { ...prev.contact!, [field]: value },
    }));
  };

  const addTechnology = () => {
    if (techInput.trim() && !form.technologies?.includes(techInput.trim())) {
      setForm((prev) => ({
        ...prev,
        technologies: [...(prev.technologies || []), techInput.trim()],
      }));
      setTechInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entreprise || !form.poste) return;

    const now = new Date().toISOString();
    const app: Application = {
      id: generateId(),
      category: (form.category || activeCategory) as ContractCategory,
      entreprise: form.entreprise || '',
      entrepriseLogo: form.entrepriseLogo || '',
      poste: form.poste || '',
      lieu: form.lieu || '',
      teletravail: form.teletravail || false,
      remunere: form.remunere || false,
      salaire: form.salaire || '',
      lienOffre: form.lienOffre || '',
      lienLinkedIn: form.lienLinkedIn || '',
      siteEntreprise: form.siteEntreprise || '',
      datePublication: form.datePublication || '',
      dateDebut: form.dateDebut || undefined,
      dateCandidature: form.dateCandidature || now.split('T')[0],
      moyenCandidature: (form.moyenCandidature || 'email') as ApplicationMethod,
      contact: form.contact || { name: '', role: '', email: '', phone: '', linkedin: '' },
      cvEnvoye: form.cvEnvoye || false,
      lettreEnvoyee: form.lettreEnvoyee || false,
      portfolioEnvoye: form.portfolioEnvoye || false,
      githubEnvoye: form.githubEnvoye || false,
      notes: form.notes || '',
      status: (form.status || 'a_preparer') as ApplicationStatus,
      relanceDelay: (form.relanceDelay || settings.defaultRelanceDelay) as RelanceDelay,
      customRelanceDays: form.customRelanceDays,
      maxRelances: (form.maxRelances || settings.defaultMaxRelances) as MaxRelances,
      relancesEffectuees: 0,
      prochaineRelance: form.prochaineRelance || null,
      dernierContact: null,
      entrevueDates: form.entrevueDates || [],
      piecesJointes: form.piecesJointes || [],
      historique: [{
        id: generateId(),
        date: now,
        action: 'Création',
        detail: 'Candidature créée',
      }],
      technologies: form.technologies || [],
      createdAt: now,
      updatedAt: now,
    } as Application;

    addApplication(app);
    navigate(`/applications/${app.id}`);
  };

  const inputClass = "glass-input w-full text-sm";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="section-title">Nouvelle candidature</h1>
          <p className="text-sm text-gray-400">Formulaire complet</p>
        </div>
        <button
          onClick={() => navigate('/applications/new/assistant')}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Bot className="w-4 h-4" />
          Mode assistant
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Catégorie & Statut */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations générales</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Catégorie *</label>
              <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className={inputClass}>
                {(['stage', 'alternance', 'cdi', 'cdd'] as ContractCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Statut initial</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Entreprise & Poste */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Entreprise & Poste</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nom de l'entreprise *</label>
              <input type="text" value={form.entreprise || ''} onChange={(e) => handleChange('entreprise', e.target.value)} className={inputClass} placeholder="Ex: OpenClassrooms" required />
            </div>
            <div>
              <label className={labelClass}>Intitulé du poste *</label>
              <input type="text" value={form.poste || ''} onChange={(e) => handleChange('poste', e.target.value)} className={inputClass} placeholder="Ex: Développeur Full-Stack" required />
            </div>
            <div>
              <label className={labelClass}>Lieu</label>
              <input type="text" value={form.lieu || ''} onChange={(e) => handleChange('lieu', e.target.value)} className={inputClass} placeholder="Ex: Paris" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="teletravail" checked={form.teletravail} onChange={(e) => handleChange('teletravail', e.target.checked)} className="rounded border-gray-500" />
              <label htmlFor="teletravail" className="text-sm text-gray-300">Télétravail</label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="remunere" checked={form.remunere} onChange={(e) => handleChange('remunere', e.target.checked)} className="rounded border-gray-500" />
              <label htmlFor="remunere" className="text-sm text-gray-300 flex items-center gap-1.5">
                💰 Rémunéré
              </label>
            </div>
            {form.remunere && (
              <div className="sm:col-span-2 animate-slide-down">
                <label className={labelClass}>Salaire</label>
                <input type="text" value={form.salaire || ''} onChange={(e) => handleChange('salaire', e.target.value)} className={inputClass} placeholder="Ex: 40-45k€ ou 1200€/mois" />
                <p className="text-xs text-gray-500 mt-1">Indiquez le montant pour pouvoir comparer vos offres dans la page Négociation</p>
              </div>
            )}
          </div>
        </div>

        {/* Liens */}
        <div className="glass-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Lien de l'offre</label>
              <input type="url" value={form.lienOffre || ''} onChange={(e) => handleChange('lienOffre', e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
            <div>
              <label className={labelClass}>Lien LinkedIn</label>
              <input type="url" value={form.lienLinkedIn || ''} onChange={(e) => handleChange('lienLinkedIn', e.target.value)} className={inputClass} placeholder="https://linkedin.com/..." />
            </div>
            <div>
              <label className={labelClass}>Site de l'entreprise</label>
              <input type="url" value={form.siteEntreprise || ''} onChange={(e) => handleChange('siteEntreprise', e.target.value)} className={inputClass} placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Dates & Méthode */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Dates & Candidature</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date de publication</label>
              <input type="date" value={form.datePublication || ''} onChange={(e) => handleChange('datePublication', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date de candidature</label>
              <input type="date" value={form.dateCandidature || ''} onChange={(e) => handleChange('dateCandidature', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Moyen de candidature</label>
              <select value={form.moyenCandidature} onChange={(e) => handleChange('moyenCandidature', e.target.value)} className={inputClass}>
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(form.category === 'stage' || form.category === 'alternance') && (
              <div className="sm:col-span-3">
                <label className={labelClass}>
                  Date de début du {form.category === 'stage' ? 'stage' : "l'alternance"}
                </label>
                <input
                  type="date"
                  value={form.dateDebut || ''}
                  onChange={(e) => handleChange('dateDebut', e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Définissez une date pour suivre le compte à rebours jusqu'au début de votre {form.category === 'stage' ? 'stage' : 'alternance'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Personne contactée</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nom</label>
              <input type="text" value={form.contact?.name || ''} onChange={(e) => handleContactChange('name', e.target.value)} className={inputClass} placeholder="Ex: Marie Dupont" />
            </div>
            <div>
              <label className={labelClass}>Fonction</label>
              <input type="text" value={form.contact?.role || ''} onChange={(e) => handleContactChange('role', e.target.value)} className={inputClass} placeholder="Ex: RH" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.contact?.email || ''} onChange={(e) => handleContactChange('email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={form.contact?.phone || ''} onChange={(e) => handleContactChange('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>LinkedIn du recruteur</label>
              <input type="url" value={form.contact?.linkedin || ''} onChange={(e) => handleContactChange('linkedin', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Documents envoyés */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Documents envoyés</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'cvEnvoye', label: 'CV' },
              { key: 'lettreEnvoyee', label: 'Lettre de motivation' },
              { key: 'portfolioEnvoye', label: 'Portfolio' },
              { key: 'githubEnvoye', label: 'GitHub' },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border
                ${(form as Record<string, unknown>)[key]
                  ? 'bg-theme-subtle border-theme-subtle-30 text-theme'
                  : 'border-white/10 hover:border-white/20 text-gray-400'}`}>
                <input
                  type="checkbox"
                  checked={!!(form as Record<string, unknown>)[key]}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          {/* File uploads */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-theme" />
              Joindre des fichiers (optionnel)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['cv', 'lettre', 'portfolio', 'certificat', 'autre'] as AttachedFile['type'][]).map((ft) => {
                const existing = (form.piecesJointes || []).filter((f) => f.type === ft);
                return (
                  <div key={ft} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[ft]?.click()}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-theme-subtle-40 hover:bg-theme-subtle-05 transition-all text-xs text-gray-400 hover:text-theme"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {fileTypeLabel2(ft)}
                    </button>
                    <input
                      ref={(el) => { fileInputRefs.current[ft] = el; }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.pptx,.xlsx"
                      onChange={(e) => processFile(e, ft)}
                    />
                    {existing.map((f) => (
                      <div key={f.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs">
                        <span className="text-theme truncate flex-1 min-w-0" title={f.name}>
                          {f.name.length > 18 ? f.name.slice(0, 16) + '...' : f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, piecesJointes: (p.piecesJointes || []).filter((ff) => ff.id !== f.id) }))}
                          className="text-gray-400 hover:text-red-400 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Relances */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Paramètres de relance</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Relancer après</label>
              <select value={form.relanceDelay} onChange={(e) => handleChange('relanceDelay', e.target.value === 'custom' ? 'custom' : Number(e.target.value))} className={inputClass}>
                {Object.entries(RELANCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {form.relanceDelay === 'custom' && (
                <div className="mt-3 animate-slide-down">
                  <label className={labelClass}>Nombre de jours personnalisé</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.customRelanceDays || ''}
                    onChange={(e) => handleChange('customRelanceDays', e.target.value ? Number(e.target.value) : undefined)}
                    className={inputClass}
                    placeholder="Ex: 21"
                  />
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Nombre maximum de relances</label>
              <select value={form.maxRelances} onChange={(e) => handleChange('maxRelances', e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value))} className={inputClass}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value="unlimited">Illimité</option>
              </select>
            </div>
          </div>
        </div>

        {/* Technologies */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Technologies</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTechnology(); } }}
              className={inputClass}
              placeholder="Ajouter une technologie..."
            />
            <button type="button" onClick={addTechnology} className="btn-primary p-2.5">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.technologies && form.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.technologies.map((t) => (
                <span key={t} className="badge bg-theme-subtle text-theme border-theme-subtle">
                  {t}
                  <button type="button" onClick={() => setForm((p) => ({ ...p, technologies: p.technologies?.filter((x) => x !== t) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notes personnelles</h2>
          <textarea
            value={form.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
            placeholder="Vos notes, remarques, suivi..."
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Enregistrer la candidature
          </button>
        </div>
      </form>
    </div>
  );
}

function fileTypeLabel2(type: AttachedFile['type']): string {
  const labels: Record<string, string> = {
    cv: 'CV',
    lettre: 'Lettre',
    portfolio: 'Portfolio',
    certificat: 'Certificat',
    autre: 'Autre',
  };
  return labels[type] || type;
}
