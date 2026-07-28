import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ApplicationStatus, AttachedFile } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, METHOD_LABELS, RELANCE_LABELS, CATEGORY_LABELS } from '@/types';
import { formatDate, formatRelativeDate, parseSalary, getDaysRemaining } from '@/utils/helpers';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  RefreshCw,
  MapPin,
  Calendar,
  Globe,
  Linkedin,
  Link2,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  X,
  Upload,
  Download,
  Paperclip,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const app = useAppStore((s) => s.applications.find((a) => a.id === id));
  const updateApplication = useAppStore((s) => s.updateApplication);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const performRelance = useAppStore((s) => s.performRelance);
  const addHistory = useAppStore((s) => s.addHistory);

  const applications = useAppStore((s) => s.applications);

  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [editForm, setEditForm] = useState<Partial<Application>>({});
  const [newNote, setNewNote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'acceptee' | 'refusee'>('acceptee');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileUpload = (fileType: AttachedFile['type']) => {
    const input = fileInputRefs.current[fileType];
    input?.click();
  };

  const processFile = (e: React.ChangeEvent<HTMLInputElement>, fileType: AttachedFile['type']) => {
    const file = e.target.files?.[0];
    if (!file || !app) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newFile: AttachedFile = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        name: file.name,
        type: fileType,
        url: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      const updated = [...app.piecesJointes, newFile];
      updateApplication(app.id, { piecesJointes: updated });
      addHistory(app.id, 'Fichier', `${fileTypeLabel(fileType)} ajouté : ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deleteFile = (fileId: string) => {
    if (!app) return;
    const file = app.piecesJointes.find((f) => f.id === fileId);
    const updated = app.piecesJointes.filter((f) => f.id !== fileId);
    updateApplication(app.id, { piecesJointes: updated });
    if (file) addHistory(app.id, 'Fichier', `${fileTypeLabel(file.type)} supprimé : ${file.name}`);
  };

  if (!app) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Candidature introuvable</p>
        <button onClick={() => navigate('/applications')} className="btn-primary mt-4">Retour</button>
      </div>
    );
  }

  const startEditing = () => {
    setEditForm({ ...app });
    setEditing(true);
  };

  const saveEditing = () => {
    updateApplication(app.id, editForm);
    setEditing(false);
    addHistory(app.id, 'Modification', 'Informations mises à jour');
  };

  const handleStatusChange = (status: ApplicationStatus) => {
    updateApplication(app.id, { status });
    const statusLabels: Record<string, string> = {
      acceptee: 'Acceptation',
      refusee: 'Refus',
      abandonnee: 'Abandon',
      entretien: 'Entretien programmé',
    };
    addHistory(app.id, statusLabels[status] || 'Statut modifié', `Statut changé en "${STATUS_LABELS[status]}"`);
    if (status === 'acceptee' || status === 'refusee') {
      setCelebrationType(status);
      setShowCelebration(true);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const updatedNotes = app.notes ? `${app.notes}\n${newNote}` : newNote;
    updateApplication(app.id, { notes: updatedNotes });
    addHistory(app.id, 'Note', 'Note ajoutée');
    setNewNote('');
  };

  const inputClass = "glass-input w-full text-sm py-2";

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setEditing(false)} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="section-title">Modifier la candidature</h1>
          <button onClick={saveEditing} className="btn-primary ml-auto flex items-center gap-2"><Save className="w-4 h-4" />Enregistrer</button>
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-400">Entreprise</label><input className={inputClass} value={editForm.entreprise || ''} onChange={(e) => setEditForm({ ...editForm, entreprise: e.target.value })} /></div>
            <div><label className="text-sm text-gray-400">Poste</label><input className={inputClass} value={editForm.poste || ''} onChange={(e) => setEditForm({ ...editForm, poste: e.target.value })} /></div>
            <div><label className="text-sm text-gray-400">Lieu</label><input className={inputClass} value={editForm.lieu || ''} onChange={(e) => setEditForm({ ...editForm, lieu: e.target.value })} /></div>
            <div>
              <label className="text-sm text-gray-400">Statut</label>
              <select className={inputClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ApplicationStatus })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-remunere" checked={editForm.remunere || false} onChange={(e) => setEditForm({ ...editForm, remunere: e.target.checked })} className="rounded border-gray-500" />
              <label htmlFor="edit-remunere" className="text-sm text-gray-400">💰 Rémunéré</label>
            </div>
            {editForm.remunere && (
              <div className="sm:col-span-2 animate-slide-down"><label className="text-sm text-gray-400">Salaire</label><input className={inputClass} value={editForm.salaire || ''} onChange={(e) => setEditForm({ ...editForm, salaire: e.target.value })} placeholder="Ex: 40-45k€" /></div>
            )}
            <div><label className="text-sm text-gray-400">Contact</label><input className={inputClass} value={editForm.contact?.name || ''} onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact!, name: e.target.value } })} /></div>
            <div><label className="text-sm text-gray-400">Email contact</label><input className={inputClass} value={editForm.contact?.email || ''} onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact!, email: e.target.value } })} /></div>
            <div><label className="text-sm text-gray-400">Téléphone contact</label><input className={inputClass} value={editForm.contact?.phone || ''} onChange={(e) => setEditForm({ ...editForm, contact: { ...editForm.contact!, phone: e.target.value } })} /></div>
            <div className="sm:col-span-2"><label className="text-sm text-gray-400">Notes</label><textarea className={inputClass} rows={4} value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/applications')} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="section-title">{app.poste}</h1>
            <span className={`badge ${STATUS_COLORS[app.status]}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[app.status]}`} />
              {STATUS_LABELS[app.status]}
            </span>
          </div>
          <p className="text-gray-400">{app.entreprise} · {CATEGORY_LABELS[app.category]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={startEditing} className="btn-secondary flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4" />Modifier</button>
          <button onClick={() => { if (confirm('Supprimer ?')) { deleteApplication(app.id); navigate('/applications'); } }} className="btn-ghost p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {app.lieu && <InfoCard icon={MapPin} label="Lieu" value={app.lieu} />}
            <InfoCard icon={Calendar} label="Candidature" value={formatDate(app.dateCandidature)} />
            <InfoCard icon={Globe} label="Méthode" value={METHOD_LABELS[app.moyenCandidature]} />
            {app.salaire && <InfoCard icon={FileText} label="Salaire" value={app.salaire} />}
            {app.dateDebut && (app.category === 'stage' || app.category === 'alternance') && (() => {
              const days = getDaysRemaining(app.dateDebut);
              const isToday = days === 0;
              return (
                <InfoCard
                  icon={Calendar}
                  label={`Début ${CATEGORY_LABELS[app.category]}`}
                  value={isToday ? "Aujourd'hui ! 🎉" : days !== null && days > 0 ? `J-${days}` : formatDate(app.dateDebut!, 'dd/MM')}
                />
              );
            })()}
          </div>

          {/* Links */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Liens</h3>
            <div className="space-y-2">
              {app.lienOffre && <LinkRow icon={Link2} label="Offre" href={app.lienOffre} />}
              {app.lienLinkedIn && <LinkRow icon={Linkedin} label="LinkedIn" href={app.lienLinkedIn} />}
              {app.siteEntreprise && <LinkRow icon={Globe} label="Site entreprise" href={app.siteEntreprise} />}
            </div>
          </div>

          {/* Contact */}
          {(app.contact.name || app.contact.email) && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-3">Contact</h3>
              <div className="space-y-2">
                {app.contact.name && <p className="text-sm flex items-center gap-2"><span className="text-gray-400">👤</span> {app.contact.name}{app.contact.role ? ` - ${app.contact.role}` : ''}</p>}
                {app.contact.email && <p className="text-sm flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /><a href={`mailto:${app.contact.email}`} className="text-theme hover:underline">{app.contact.email}</a></p>}
                {app.contact.phone && <p className="text-sm flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /><a href={`tel:${app.contact.phone}`} className="text-theme hover:underline">{app.contact.phone}</a></p>}
              </div>
            </div>
          )}

          {/* Technologies */}
          {app.technologies.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-3">Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {app.technologies.map((t) => (
                  <span key={t} className="badge bg-theme-subtle text-theme border-theme-subtle">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Documents envoyés */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Documents envoyés</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <DocCheck label="CV" sent={app.cvEnvoye} />
              <DocCheck label="Lettre de motivation" sent={app.lettreEnvoyee} />
              <DocCheck label="Portfolio" sent={app.portfolioEnvoye} />
              <DocCheck label="GitHub" sent={app.githubEnvoye} />
            </div>

            {/* File uploads */}
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-theme" />
                Pièces jointes ({app.piecesJointes.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['cv', 'lettre', 'portfolio', 'certificat', 'autre'] as AttachedFile['type'][]).map((ft) => {
                  const existing = app.piecesJointes.filter((f) => f.type === ft);
                  return (
                    <div key={ft} className="flex flex-col gap-1">
                      <button
                        onClick={() => handleFileUpload(ft)}
                        className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-theme-subtle-40 hover:bg-theme-subtle-05 transition-all text-xs text-gray-400 hover:text-theme"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {fileTypeLabel(ft)}
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
                          <a href={f.url} download={f.name} className="text-theme hover:underline truncate flex-1 min-w-0" title={f.name}>
                            {f.name.length > 18 ? f.name.slice(0, 16) + '...' : f.name}
                          </a>
                          <button onClick={() => deleteFile(f.id)} className="text-gray-400 hover:text-red-400 shrink-0">
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

          {/* Salary negotiation - Compare offers */}
          {app.status === 'acceptee' && (() => {
            const allAccepted = applications.filter(
              (a) => a.status === 'acceptee' && a.category === app.category
            );
            if (allAccepted.length < 2) return null;

            const allWithSalary = allAccepted.filter((a) => a.salaire && parseSalary(a.salaire) > 0);
            const maxSal = allWithSalary.length > 0 ? Math.max(...allWithSalary.map((a) => parseSalary(a.salaire))) : 1;

            return (
              <div className="glass-card p-6 border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Session de négociation</h3>
                    <p className="text-xs text-gray-400">{allAccepted.length} offres acceptées en {CATEGORY_LABELS[app.category]}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mt-3 mb-5">
                  Comparez vos offres pour choisir la meilleure opportunité. Les salaires sont affichés avec leur écart par rapport au plus élevé.
                </p>

                <div className="space-y-3">
                  {[...allAccepted]
                    .sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire))
                    .map((offer, index) => {
                      const isCurrent = offer.id === app.id;
                      const sal = parseSalary(offer.salaire);
                      const salStr = offer.salaire || 'Non renseigné';
                      const pct = maxSal > 0 ? (sal / maxSal) * 100 : 0;
                      const isBest = index === 0 && sal > 0;
                      const diff = maxSal - sal;
                      const diffPct = maxSal > 0 ? Math.round((diff / maxSal) * 100) : 0;

                      return (
                        <div
                          key={offer.id}
                          className={`relative p-4 rounded-2xl border transition-all duration-300 hover:border-white/20
                            ${isCurrent ? 'bg-theme-subtle border-theme-subtle-30' : 'bg-white/5 border-white/10'}
                            ${isBest && sal > 0 ? 'ring-1 ring-green-500/30' : ''}`}
                        >
                          {isBest && sal > 0 && (
                            <div className="absolute -top-2.5 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold shadow-lg">
                              🏆 Meilleure offre
                            </div>
                          )}

                          <div className="flex flex-wrap items-start justify-between gap-4">
                            {/* Left: Company info */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-theme-gradient-subtle flex items-center justify-center text-lg font-bold text-theme shrink-0">
                                {offer.entreprise.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-[var(--color-text)]">{offer.poste}</h4>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-theme-subtle-30 text-theme-light">
                                      offre consultée
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{offer.entreprise}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  {offer.lieu && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{offer.lieu}</span>}
                                  <span>{CATEGORY_LABELS[offer.category]}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Salary comparison */}
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-2 justify-end">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                <span className={`text-xl font-bold font-display ${isBest ? 'text-green-400' : 'text-[var(--color-text)]'}`}>
                                  {salStr}
                                </span>
                              </div>
                              {sal > 0 && (
                                <>
                                  <div className="flex items-center gap-2 justify-end mt-1">
                                    <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${isBest ? 'bg-green-500' : 'bg-theme-solid'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-500">{Math.round(pct)}%</span>
                                  </div>
                                  {!isBest && diff > 0 && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      {diffPct > 0 ? `${diffPct}% de moins` : ''} que la meilleure offre
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tags row */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                            {offer.teletravail && (
                              <span className="badge bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">🏠 Télétravail</span>
                            )}
                            {offer.technologies.slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400">{t}</span>
                            ))}
                            {offer.technologies.length > 3 && (
                              <span className="text-[10px] text-gray-500">+{offer.technologies.length - 3}</span>
                            )}
                            <div className="flex-1" />
                            <button
                              onClick={() => {
                                navigate(`/applications/${offer.id}`);
                              }}
                              className="text-[10px] text-theme hover:text-theme-light underline"
                            >
                              Voir l&apos;offre →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Summary footer */}
                <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="grid sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Offres comparées</p>
                      <p className="text-2xl font-bold text-[var(--color-text)]">{allAccepted.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Meilleur salaire</p>
                      <p className="text-lg font-bold text-green-400">
                        {allWithSalary.length > 0
                          ? allWithSalary.sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire))[0].salaire
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Écart salarial</p>
                      <p className="text-lg font-bold text-orange-400">
                        {allWithSalary.length >= 2
                          ? (() => {
                              const sorted = allWithSalary.sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire));
                              const high = parseSalary(sorted[0].salaire);
                              const low = parseSalary(sorted[sorted.length - 1].salaire);
                              if (high === 0) return 'N/A';
                              return `${Math.round(((high - low) / high) * 100)}%`;
                            })()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Date début countdown */}
          {app.dateDebut && (app.category === 'stage' || app.category === 'alternance') && (() => {
            const days = getDaysRemaining(app.dateDebut);
            if (days === null || days < 0) return null;
            const isToday = days === 0;
            const isSoon = days <= 14;
            return (
              <div className={`glass-card p-5 border-2 ${isToday ? 'border-green-500/30 bg-green-500/5' : isSoon ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold font-display
                    ${isToday ? 'bg-green-500/20 text-green-400' : isSoon ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-300'}`}>
                    {isToday ? '🎉' : days}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">
                      {isToday
                        ? "C'est le grand jour !"
                        : days === 1
                          ? 'Demain !'
                          : `${days} jours avant le début`}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Début du {CATEGORY_LABELS[app.category].toLowerCase()} : {formatDate(app.dateDebut!, 'dd MMMM yyyy')}
                    </p>
                    {isSoon && !isToday && (
                      <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[var(--color-primary)]"
                          style={{ width: `${Math.max(0, 100 - (days / 90) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Notes</h3>
            {app.notes ? (
              <p className="text-sm text-gray-400 whitespace-pre-wrap">{app.notes}</p>
            ) : (
              <p className="text-sm text-gray-500">Aucune note</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                placeholder="Ajouter une note..."
                className="glass-input flex-1 text-sm py-2"
              />
              <button onClick={addNote} className="btn-primary p-2"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status actions */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-3">Changer le statut</h3>
            <div className="space-y-1.5">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key as ApplicationStatus)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2
                    ${app.status === key
                      ? 'bg-theme-subtle-15 text-theme font-medium'
                      : 'hover:bg-white/5 text-gray-400'
                    }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[key as ApplicationStatus]}`} />
                  {label}
                  {app.status === key && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Relances */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              Relances
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Relances effectuées : <span className="text-[var(--color-text)] font-medium">{app.relancesEffectuees}</span></p>
              <p>Max : <span className="text-[var(--color-text)] font-medium">{app.maxRelances === 'unlimited' ? 'Illimité' : app.maxRelances}</span></p>
              <p>Délai : <span className="text-[var(--color-text)] font-medium">{app.relanceDelay === 'custom' ? `${app.customRelanceDays || '?'} jours` : RELANCE_LABELS[app.relanceDelay] || app.relanceDelay}</span></p>
              {app.prochaineRelance && (
                <p>Prochaine : <span className="text-theme font-medium">{formatDate(app.prochaineRelance)}</span></p>
              )}
            </div>
            <button
              onClick={() => performRelance(app.id)}
              className="btn-primary w-full mt-3 flex items-center justify-center gap-2 text-sm py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Relance effectuée
            </button>
          </div>

          {/* Historique */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Historique
            </h3>
            {app.historique.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun historique</p>
            ) : (
              <div className="space-y-3">
                {[...app.historique].reverse().map((h) => (
                  <div key={h.id} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-light mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[var(--color-text)] font-medium">{h.action}</p>
                      <p className="text-xs text-gray-400">{h.detail}</p>
                      <p className="text-xs text-gray-500">{formatRelativeDate(h.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Celebration Overlay */}
      <CelebrationOverlay show={showCelebration} type={celebrationType} onComplete={() => setShowCelebration(false)} />
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="font-medium text-sm text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function LinkRow({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-theme hover:underline p-2 rounded-lg hover:bg-theme-subtle-05 transition-colors">
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}

function DocCheck({ label, sent }: { label: string; sent: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${sent ? 'text-green-400' : 'text-gray-500'}`}>
      {sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      {label}
    </div>
  );
}

function fileTypeLabel(type: AttachedFile['type']): string {
  const labels: Record<string, string> = {
    cv: 'CV',
    lettre: 'Lettre',
    portfolio: 'Portfolio',
    certificat: 'Certificat',
    autre: 'Autre',
  };
  return labels[type] || type;
}
