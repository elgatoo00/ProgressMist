import { useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Trash2, RefreshCw, MapPin, Calendar, Globe, Linkedin, Link2, Mail, Phone, CheckCircle2, Clock, Plus,
  X, Upload, Paperclip, TrendingUp, Wallet, Send, MessageSquare, ArrowDownLeft, ArrowUpRight, CalendarCheck, UserRound,
  StickyNote, Flag, Home, Code2, History, SearchX, Copy,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ApplicationStatus, AttachedFile, Exchange, ExchangeType } from '@/types';
import { ALL_STATUSES, CATEGORY_LABELS, EXCHANGE_LABELS, METHOD_LABELS, RELANCE_LABELS, STATUS_DOT_COLORS, STATUS_LABELS } from '@/types';
import {
  daysFromToday, formatDate, formatDateTime, formatRelativeDate, getDaysRemaining, parseLocalDate, parseSalary, toDateKey,
} from '@/utils/helpers';
import { safeFileUrl, safeMailto, safeTel, safeWebUrl } from '@/utils/security';
import { ACCEPTED_FILES, FILE_TYPES, FILE_TYPE_LABELS, readAttachment } from '@/utils/files';
import ApplicationForm, { type ApplicationFormValues } from '@/components/application/ApplicationForm';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { Card, CompanyAvatar, EmptyState, ProgressBar, StatusBadge } from '@/components/ui/primitives';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

const FIELD_LABELS: Partial<Record<keyof Application, string>> = {
  entreprise: 'entreprise', poste: 'poste', lieu: 'localisation', category: 'type de contrat', salaire: 'salaire',
  dateCandidature: "date d'envoi", contact: 'contact', lienOffre: "lien de l'offre", prochaineRelance: 'date de relance',
  entrevueDates: 'entretiens', notes: 'notes', technologies: 'technologies', dateDebut: 'date de début', moyenCandidature: 'moyen de candidature',
  piecesJointes: 'pièces jointes', teletravail: 'télétravail', remunere: 'rémunération',
};

const EXCHANGE_ICONS: Record<ExchangeType, ElementType> = {
  email: Mail, appel: Phone, entretien: CalendarCheck, message: MessageSquare, autre: MessageSquare,
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const applications = useAppStore((s) => s.applications);
  const app = applications.find((a) => a.id === id);
  const {
    updateApplication, deleteApplication, restoreApplication, performRelance, addHistory, setStatus,
    addExchange, deleteExchange, addInterviewDate, removeInterviewDate,
  } = useAppStore.getState();

  const editing = searchParams.get('edit') === 'true';
  const setEditing = (v: boolean) => setSearchParams(v ? { edit: 'true' } : {}, { replace: true });
  const [newNote, setNewNote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'acceptee' | 'refusee'>('acceptee');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!app) {
    return (
      <div className="card max-w-xl mx-auto">
        <EmptyState
          icon={SearchX}
          title="Candidature introuvable"
          description="Elle a peut-être été supprimée."
          action={<button onClick={() => navigate('/applications')} className="btn-primary btn-sm">Retour aux candidatures</button>}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Mode édition
  // ---------------------------------------------------------------------------
  if (editing) {
    const handleSave = (values: ApplicationFormValues) => {
      const { status, ...rest } = values;
      const changed = (Object.keys(rest) as (keyof typeof rest)[]).filter(
        (k) => JSON.stringify(rest[k] ?? '') !== JSON.stringify(app[k] ?? '')
      );
      updateApplication(app.id, rest);
      if (changed.length > 0) {
        const labels = Array.from(new Set(changed.map((k) => FIELD_LABELS[k] || k)));
        addHistory(app.id, 'Modification', `Champs modifiés : ${labels.slice(0, 5).join(', ')}${labels.length > 5 ? '…' : ''}`);
      }
      if (status !== app.status) handleStatusChange(status, 'Modification');
      toast.success('Modifications enregistrées');
      setEditing(false);
    };
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(false)} className="icon-btn" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="section-title truncate">Modifier la candidature</h1>
            <p className="text-sm text-muted truncate">{app.poste} — {app.entreprise}</p>
          </div>
        </div>
        <ApplicationForm mode="edit" initial={app} onSubmit={handleSave} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function handleStatusChange(status: ApplicationStatus, source?: string) {
    if (!app || status === app.status) return;
    setStatus(app.id, status, source);
    if (status === 'acceptee' || status === 'refusee') {
      setCelebrationType(status);
      setShowCelebration(true);
    } else {
      toast.success(`Statut : ${STATUS_LABELS[status]}`);
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: 'Supprimer cette candidature ?',
      message: `« ${app.poste} — ${app.entreprise} » sera supprimée, ainsi que ses échanges et pièces jointes.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    const snapshot = app;
    const index = applications.findIndex((a) => a.id === app.id);
    deleteApplication(app.id);
    navigate('/applications');
    toast.success('Candidature supprimée', {
      action: { label: 'Annuler', onClick: () => restoreApplication(snapshot, index) },
      duration: 7000,
    });
  };

  const handleRelance = () => {
    performRelance(app.id);
    toast.success('Relance enregistrée', { description: 'Un échange a été ajouté à l’historique.' });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: AttachedFile['type']) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const attached = await readAttachment(file, type);
      updateApplication(app.id, { piecesJointes: [...app.piecesJointes, attached] });
      addHistory(app.id, 'Fichier', `${FILE_TYPE_LABELS[type]} ajouté : ${file.name}`);
      toast.success('Fichier ajouté', { description: file.name });
    } catch (err) {
      toast.error('Fichier refusé', { description: (err as Error).message });
    }
  };

  const deleteFile = async (file: AttachedFile) => {
    const ok = await confirmAction({ title: 'Supprimer ce fichier ?', message: file.name, confirmLabel: 'Supprimer' });
    if (!ok) return;
    updateApplication(app.id, { piecesJointes: app.piecesJointes.filter((f) => f.id !== file.id) });
    addHistory(app.id, 'Fichier', `${FILE_TYPE_LABELS[file.type]} supprimé : ${file.name}`);
    toast.success('Fichier supprimé');
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const stamp = formatDate(new Date().toISOString(), 'dd/MM/yyyy');
    updateApplication(app.id, { notes: app.notes ? `${app.notes}\n[${stamp}] ${newNote.trim()}` : `[${stamp}] ${newNote.trim()}` });
    addHistory(app.id, 'Note', 'Note ajoutée');
    setNewNote('');
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copié`),
      () => toast.error('Copie impossible')
    );
  };

  const startDays = app.dateDebut ? getDaysRemaining(app.dateDebut) : null;
  const relanceDays = daysFromToday(app.prochaineRelance);
  const maxRel = app.maxRelances === 'unlimited' ? null : app.maxRelances;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button onClick={() => navigate(-1)} className="icon-btn mt-2 -ml-2" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <CompanyAvatar name={app.entreprise} logo={app.entrepriseLogo} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="section-title">{app.poste}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-sm text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-[var(--color-text)]">{app.entreprise}</span>
              <span>{CATEGORY_LABELS[app.category]}</span>
              {app.lieu && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{app.lieu}</span>}
              {app.teletravail && <span className="inline-flex items-center gap-1"><Home className="w-3.5 h-3.5" />Télétravail</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:pt-1">
          {safeWebUrl(app.lienOffre) && (
            <a href={safeWebUrl(app.lienOffre)} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              <Link2 className="w-4 h-4" /> <span className="hidden sm:inline">Voir l’offre</span>
            </a>
          )}
          <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
            <Edit3 className="w-4 h-4" /> Modifier
          </button>
          <button onClick={handleDelete} className="icon-btn hover:!text-red-500 hover:!bg-red-500/10" aria-label="Supprimer la candidature" title="Supprimer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Fact icon={Send} label="Envoyée le" value={formatDate(app.dateCandidature)} sub={formatRelativeDate(app.dateCandidature)} />
        <Fact icon={Globe} label="Via" value={METHOD_LABELS[app.moyenCandidature]} />
        <Fact
          icon={RefreshCw}
          label="Prochaine relance"
          value={app.prochaineRelance ? formatDate(app.prochaineRelance) : '—'}
          sub={app.prochaineRelance ? (relanceDays !== null && relanceDays < 0 ? `En retard de ${-relanceDays} j` : formatRelativeDate(app.prochaineRelance)) : 'Non programmée'}
          tone={relanceDays !== null && relanceDays <= 0 ? 'warn' : undefined}
        />
        {app.dateDebut && startDays !== null && startDays >= 0 ? (
          <Fact icon={Flag} label={`Début ${CATEGORY_LABELS[app.category].toLowerCase()}`} value={startDays === 0 ? "Aujourd'hui" : `J-${startDays}`} sub={formatDate(app.dateDebut, 'dd MMMM yyyy')} />
        ) : (
          <Fact icon={Wallet} label="Salaire" value={app.salaire || (app.remunere ? 'Non renseigné' : 'Non rémunéré')} />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <ExchangesCard app={app} onAdd={(e) => { addExchange(app.id, e); toast.success('Échange ajouté'); }} onDelete={async (ex) => {
            const ok = await confirmAction({ title: 'Supprimer cet échange ?', message: ex.resume, confirmLabel: 'Supprimer' });
            if (ok) { deleteExchange(app.id, ex.id); toast.success('Échange supprimé'); }
          }} />

          <InterviewsCard
            dates={app.entrevueDates}
            onAdd={(d) => {
              addInterviewDate(app.id, d);
              if (app.status !== 'entretien' && app.status !== 'acceptee' && app.status !== 'refusee') {
                setStatus(app.id, 'entretien', 'Entretien ajouté');
              }
              toast.success('Entretien programmé', { description: formatDateTime(d) });
            }}
            onRemove={async (d) => {
              const ok = await confirmAction({ title: 'Retirer cet entretien ?', message: formatDateTime(d), confirmLabel: 'Retirer' });
              if (ok) removeInterviewDate(app.id, d);
            }}
          />

          {/* Contact & liens */}
          <Card title="Contact & liens" icon={UserRound}>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                {app.contact.name || app.contact.email || app.contact.phone ? (
                  <>
                    {app.contact.name && (
                      <p className="text-sm">
                        <span className="font-medium">{app.contact.name}</span>
                        {app.contact.role && <span className="text-muted"> · {app.contact.role}</span>}
                      </p>
                    )}
                    {safeMailto(app.contact.email) && (
                      <ContactRow icon={Mail} href={safeMailto(app.contact.email)} label={app.contact.email} onCopy={() => copy(app.contact.email, 'E-mail')} />
                    )}
                    {safeTel(app.contact.phone) && (
                      <ContactRow icon={Phone} href={safeTel(app.contact.phone)} label={app.contact.phone} onCopy={() => copy(app.contact.phone, 'Numéro')} />
                    )}
                    {safeWebUrl(app.contact.linkedin) && <ContactRow icon={Linkedin} href={safeWebUrl(app.contact.linkedin)} label="Profil LinkedIn" external />}
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Aucun contact renseigné.{' '}
                    <button onClick={() => setEditing(true)} className="text-theme hover:underline">Ajouter</button>
                  </p>
                )}
              </div>
              <div className="space-y-2.5 sm:border-l sm:border-[var(--color-border)] sm:pl-5">
                {app.lienOffre || app.lienLinkedIn || app.siteEntreprise ? (
                  <>
                    {safeWebUrl(app.lienOffre) && <ContactRow icon={Link2} href={safeWebUrl(app.lienOffre)} label="Offre d’emploi" external />}
                    {safeWebUrl(app.lienLinkedIn) && <ContactRow icon={Linkedin} href={safeWebUrl(app.lienLinkedIn)} label="Offre sur LinkedIn" external />}
                    {safeWebUrl(app.siteEntreprise) && <ContactRow icon={Globe} href={safeWebUrl(app.siteEntreprise)} label="Site de l’entreprise" external />}
                  </>
                ) : (
                  <p className="text-sm text-muted">Aucun lien enregistré.</p>
                )}
                {app.datePublication && <p className="text-xs text-muted pt-1">Offre publiée le {formatDate(app.datePublication)}</p>}
              </div>
            </div>
          </Card>

          {/* Documents */}
          <Card title="Documents" icon={Paperclip} description={`${app.piecesJointes.length} pièce${app.piecesJointes.length > 1 ? 's' : ''} jointe${app.piecesJointes.length > 1 ? 's' : ''}`}>
            <div className="flex flex-wrap gap-2 mb-4">
              <DocCheck label="CV" sent={app.cvEnvoye} onToggle={() => updateApplication(app.id, { cvEnvoye: !app.cvEnvoye })} />
              <DocCheck label="Lettre de motivation" sent={app.lettreEnvoyee} onToggle={() => updateApplication(app.id, { lettreEnvoyee: !app.lettreEnvoyee })} />
              <DocCheck label="Portfolio" sent={app.portfolioEnvoye} onToggle={() => updateApplication(app.id, { portfolioEnvoye: !app.portfolioEnvoye })} />
              <DocCheck label="GitHub" sent={app.githubEnvoye} onToggle={() => updateApplication(app.id, { githubEnvoye: !app.githubEnvoye })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FILE_TYPES.map((ft) => (
                <div key={ft} className="flex flex-col gap-1.5 min-w-0">
                  <button
                    onClick={() => fileInputRefs.current[ft]?.click()}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-[var(--color-border-strong)] text-xs text-muted hover:text-theme hover:border-theme-subtle-40 hover:bg-theme-subtle-05 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> {FILE_TYPE_LABELS[ft]}
                  </button>
                  <input ref={(el) => { fileInputRefs.current[ft] = el; }} type="file" className="hidden" accept={ACCEPTED_FILES} onChange={(e) => handleFile(e, ft)} />
                  {app.piecesJointes.filter((f) => f.type === ft).map((f) => (
                    <div key={f.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-surface-2)] text-xs min-w-0">
                      <a href={safeFileUrl(f.url)} download={f.name} className="text-theme hover:underline truncate flex-1" title={`Télécharger ${f.name}`}>{f.name}</a>
                      <button onClick={() => deleteFile(f)} className="text-muted hover:text-red-500 shrink-0" aria-label={`Supprimer ${f.name}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {app.technologies.length > 0 && (
            <Card title="Technologies & compétences" icon={Code2}>
              <div className="flex flex-wrap gap-1.5">
                {app.technologies.map((t) => (
                  <span key={t} className="badge bg-theme-subtle text-theme border-theme-subtle">{t}</span>
                ))}
              </div>
            </Card>
          )}

          <NegotiationBlock app={app} applications={applications} onOpen={(oid) => navigate(`/applications/${oid}`)} />

          {/* Notes */}
          <Card title="Notes personnelles" icon={StickyNote}>
            {app.notes ? (
              <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{app.notes}</p>
            ) : (
              <p className="text-sm text-muted">Aucune note pour l’instant.</p>
            )}
            <div className="flex items-center gap-2 mt-4">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                placeholder="Ajouter une note rapide…"
                className="glass-input flex-1 text-sm py-2"
                aria-label="Nouvelle note"
              />
              <button onClick={addNote} disabled={!newNote.trim()} className="btn-primary btn-sm !px-3" aria-label="Ajouter la note">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4 lg:sticky lg:top-6 min-w-0">
          <Card title="Statut" icon={CheckCircle2} bodyClassName="!px-2">
            <div className="space-y-0.5">
              {ALL_STATUSES.map((key) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  aria-pressed={app.status === key}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5
                    ${app.status === key ? 'bg-theme-subtle text-theme font-medium' : 'text-muted hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[key]}`} />
                  {STATUS_LABELS[key]}
                  {app.status === key && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Relances" icon={RefreshCw}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-semibold font-display tabular-nums">
                {app.relancesEffectuees}
                <span className="text-sm text-muted font-normal"> / {maxRel ?? '∞'}</span>
              </span>
              <span className="text-xs text-muted">
                tous les {app.relanceDelay === 'custom' ? `${app.customRelanceDays || '?'} jours` : RELANCE_LABELS[app.relanceDelay]}
              </span>
            </div>
            {maxRel && <ProgressBar value={(app.relancesEffectuees / maxRel) * 100} />}
            <p className="text-xs text-muted mt-3">
              {app.prochaineRelance ? (
                <>Prochaine relance : <span className={`font-medium ${relanceDays !== null && relanceDays <= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text)]'}`}>{formatDate(app.prochaineRelance)}</span></>
              ) : maxRel && app.relancesEffectuees >= maxRel ? (
                'Nombre maximum de relances atteint.'
              ) : (
                'Aucune relance programmée.'
              )}
            </p>
            <button onClick={handleRelance} className="btn-primary btn-sm w-full mt-4">
              <RefreshCw className="w-3.5 h-3.5" /> J’ai relancé
            </button>
          </Card>

          <Card title="Historique" icon={History}>
            {app.historique.length === 0 ? (
              <p className="text-sm text-muted">Aucun historique</p>
            ) : (
              <ol className="relative border-l border-[var(--color-border)] ml-1 space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {[...app.historique].reverse().map((h) => (
                  <li key={h.id} className="pl-4 relative">
                    <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-theme-solid ring-4 ring-[var(--color-surface)]" />
                    <p className="text-sm font-medium text-[var(--color-text)]">{h.action}</p>
                    <p className="text-xs text-muted">{h.detail}</p>
                    <p className="text-[11px] text-muted mt-0.5" title={new Date(h.date).toLocaleString('fr-FR')}>{formatRelativeDate(h.date)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} type={celebrationType} onComplete={() => setShowCelebration(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function Fact({ icon: Icon, label, value, sub, tone }: { icon: ElementType; label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' }) {
  return (
    <div className={`card p-4 min-w-0 ${tone === 'warn' ? '!border-amber-500/40' : ''}`}>
      <p className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm font-semibold text-[var(--color-text)] truncate">{value}</p>
      {sub && <p className={`text-xs mt-0.5 truncate ${tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>{sub}</p>}
    </div>
  );
}

function ContactRow({ icon: Icon, href, label, external, onCopy }: { icon: ElementType; href: string; label: string; external?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm group min-w-0">
      <Icon className="w-4 h-4 text-muted shrink-0" />
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-theme hover:underline truncate">
        {label}
      </a>
      {external && <ArrowUpRight className="w-3 h-3 text-muted shrink-0" />}
      {onCopy && (
        <button onClick={onCopy} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted hover:text-[var(--color-text)] transition-opacity" aria-label={`Copier ${label}`}>
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function DocCheck({ label, sent, onToggle }: { label: string; sent: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={sent} className={`chip ${sent ? '!text-green-600 dark:!text-green-400 !border-green-500/30 !bg-green-500/10' : ''}`} title={sent ? 'Marquer comme non envoyé' : 'Marquer comme envoyé'}>
      {sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function ExchangesCard({ app, onAdd, onDelete }: { app: Application; onAdd: (e: Omit<Exchange, 'id'>) => void; onDelete: (e: Exchange) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Exchange, 'id'>>({ date: toDateKey(new Date()), type: 'email', direction: 'sortant', resume: '' });
  const [error, setError] = useState('');
  const sorted = useMemo(
    () => [...app.echanges].sort((a, b) => (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0)),
    [app.echanges]
  );

  const submit = () => {
    if (!draft.resume.trim()) {
      setError('Décrivez brièvement l’échange.');
      return;
    }
    if (!parseLocalDate(draft.date)) {
      setError('Date invalide.');
      return;
    }
    onAdd({ ...draft, resume: draft.resume.trim() });
    setDraft({ date: toDateKey(new Date()), type: 'email', direction: 'sortant', resume: '' });
    setError('');
    setOpen(false);
  };

  return (
    <Card
      title="Historique des échanges"
      icon={MessageSquare}
      description="E-mails, appels et messages échangés avec l’entreprise"
      actions={
        !open && (
          <button onClick={() => setOpen(true)} className="btn-secondary btn-sm !py-1.5 !px-2.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )
      }
    >
      {open && (
        <div className="rounded-xl border border-[var(--color-border-strong)] p-4 mb-4 space-y-3 animate-slide-down bg-[var(--color-surface-2)]">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="ex-date">Date</label>
              <input id="ex-date" type="date" className="glass-input w-full text-sm py-2" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ex-type">Type</label>
              <select id="ex-type" className="glass-input w-full text-sm py-2" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ExchangeType })}>
                {Object.entries(EXCHANGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Sens</span>
              <div className="segmented w-full">
                {(['sortant', 'entrant'] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDraft({ ...draft, direction: d })} className={`segmented-item flex-1 justify-center !py-1 ${draft.direction === d ? 'segmented-item-active' : ''}`}>
                    {d === 'sortant' ? 'Envoyé' : 'Reçu'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ex-resume">Résumé</label>
            <textarea
              id="ex-resume"
              autoFocus
              rows={2}
              className={`glass-input w-full text-sm py-2 resize-y ${error ? 'input-invalid' : ''}`}
              value={draft.resume}
              onChange={(e) => { setDraft({ ...draft, resume: e.target.value }); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
              placeholder={draft.direction === 'entrant' ? 'Ex : Réponse de la RH, proposition d’entretien mardi' : 'Ex : Envoi du portfolio demandé'}
            />
            {error && <p className="field-error">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setOpen(false); setError(''); }} className="btn-secondary btn-sm">Annuler</button>
            <button onClick={submit} className="btn-primary btn-sm">Ajouter l’échange</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        !open && <EmptyState compact icon={MessageSquare} title="Aucun échange enregistré" description="Gardez une trace de chaque e-mail, appel ou réponse reçue." />
      ) : (
        <ol className="space-y-1">
          {sorted.map((ex) => {
            const Icon = EXCHANGE_ICONS[ex.type];
            const incoming = ex.direction === 'entrant';
            return (
              <li key={ex.id} className="group flex gap-3 p-2.5 -mx-2.5 rounded-lg row-hover">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${incoming ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-theme-subtle text-theme'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    {incoming ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {incoming ? 'Reçu' : 'Envoyé'} · {EXCHANGE_LABELS[ex.type]} · {formatDate(ex.date)}
                  </p>
                  <p className="text-sm text-[var(--color-text)] mt-0.5 whitespace-pre-wrap">{ex.resume}</p>
                </div>
                <button onClick={() => onDelete(ex)} className="icon-btn w-7 h-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:!text-red-500" aria-label="Supprimer l’échange">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function InterviewsCard({ dates, onAdd, onRemove }: { dates: string[]; onAdd: (d: string) => void; onRemove: (d: string) => void }) {
  const [value, setValue] = useState('');
  const sorted = [...dates].sort((a, b) => (parseLocalDate(a)?.getTime() ?? 0) - (parseLocalDate(b)?.getTime() ?? 0));
  return (
    <Card title="Entretiens" icon={CalendarCheck}>
      {sorted.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {sorted.map((d) => {
            const days = daysFromToday(d);
            const past = days !== null && days < 0;
            return (
              <li key={d} className={`group flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--color-border)] ${past ? 'opacity-60' : ''}`}>
                <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm flex-1">{formatDateTime(d)}</span>
                <span className="text-xs text-muted">{past ? 'Passé' : days === 0 ? "Aujourd'hui" : days === 1 ? 'Demain' : `Dans ${days} j`}</span>
                <button onClick={() => onRemove(d)} className="icon-btn w-7 h-7 hover:!text-red-500" aria-label="Retirer cet entretien">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="glass-input flex-1 text-sm py-2" aria-label="Date et heure de l’entretien" />
        <button
          onClick={() => {
            if (!value) {
              toast.error('Choisissez une date et une heure');
              return;
            }
            onAdd(value);
            setValue('');
          }}
          className="btn-secondary btn-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Programmer
        </button>
      </div>
      {sorted.length === 0 && <p className="text-xs text-muted mt-2">Aucun entretien. Ajouter une date passe la candidature au statut « Entretien ».</p>}
    </Card>
  );
}

/** Comparaison des offres acceptées de la même catégorie (affichée sur une offre acceptée). */
function NegotiationBlock({ app, applications, onOpen }: { app: Application; applications: Application[]; onOpen: (id: string) => void }) {
  if (app.status !== 'acceptee') return null;
  const allAccepted = applications.filter((a) => a.status === 'acceptee' && a.category === app.category);
  if (allAccepted.length < 2) return null;
  const sorted = [...allAccepted].sort((a, b) => parseSalary(b.salaire) - parseSalary(a.salaire));
  const maxSal = Math.max(1, ...sorted.map((a) => parseSalary(a.salaire)));
  const withSal = sorted.filter((a) => parseSalary(a.salaire) > 0);
  const spread = withSal.length >= 2 ? Math.round(((parseSalary(withSal[0].salaire) - parseSalary(withSal[withSal.length - 1].salaire)) / parseSalary(withSal[0].salaire)) * 100) : null;

  return (
    <Card title="Session de négociation" icon={TrendingUp} description={`${allAccepted.length} offres acceptées en ${CATEGORY_LABELS[app.category]}${spread !== null ? ` · écart salarial de ${spread} %` : ''}`}>
      <ul className="space-y-2">
        {sorted.map((offer, index) => {
          const sal = parseSalary(offer.salaire);
          const isBest = index === 0 && sal > 0;
          const isCurrent = offer.id === app.id;
          return (
            <li key={offer.id}>
              <button
                onClick={() => onOpen(offer.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  isCurrent ? 'border-theme-subtle-40 bg-theme-subtle-05' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <CompanyAvatar name={offer.entreprise} logo={offer.entrepriseLogo} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {offer.poste}
                    {isCurrent && <span className="ml-2 text-[10px] font-medium text-theme">(cette offre)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{offer.entreprise}{offer.lieu && ` · ${offer.lieu}`}</p>
                </div>
                <div className="w-28 shrink-0 text-right">
                  <p className={`text-sm font-semibold tabular-nums ${isBest ? 'text-green-600 dark:text-green-400' : ''}`}>{offer.salaire || '—'}</p>
                  {sal > 0 && <div className="mt-1"><ProgressBar value={(sal / maxSal) * 100} tone={isBest ? 'green' : 'theme'} /></div>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

