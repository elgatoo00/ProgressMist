import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  Building2, Send, UserRound, Wallet, BellRing, Paperclip, StickyNote, Plus, X, Upload, Save, AlertCircle, Check, CalendarPlus, Wand2,
} from 'lucide-react';
import type { Application, ApplicationMethod, ApplicationStatus, AttachedFile, ContractCategory, MaxRelances, RelanceDelay } from '@/types';
import { ALL_STATUSES, METHOD_LABELS, RELANCE_LABELS, STATUS_LABELS } from '@/types';
import { addDays, formatDate, normalizeUrl, parseLocalDate, relanceDelayDays, startOfToday, toDateKey } from '@/utils/helpers';
import { validateApplication, type FormErrors } from '@/utils/validation';
import { ACCEPTED_FILES, FILE_TYPES, FILE_TYPE_LABELS, readAttachment } from '@/utils/files';
import { CategoryTabs, Kbd } from '@/components/ui/primitives';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

export type ApplicationFormValues = Omit<Application, 'id' | 'historique' | 'echanges' | 'createdAt' | 'updatedAt' | 'relancesEffectuees' | 'dernierContact'>;

interface ApplicationFormProps {
  initial: Partial<Application>;
  mode: 'create' | 'edit';
  onSubmit: (values: ApplicationFormValues) => void;
  onCancel: () => void;
  /** Contenu supplémentaire affiché à droite de l'en-tête de formulaire */
  headerExtra?: ReactNode;
}

const SECTIONS = [
  { id: 'poste', label: 'Poste & entreprise', icon: Building2 },
  { id: 'candidature', label: 'Candidature', icon: Send },
  { id: 'contact', label: 'Contact RH', icon: UserRound },
  { id: 'remuneration', label: 'Rémunération & contrat', icon: Wallet },
  { id: 'suivi', label: 'Relances & entretiens', icon: BellRing },
  { id: 'documents', label: 'Documents', icon: Paperclip },
  { id: 'notes', label: 'Notes & compétences', icon: StickyNote },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SECTION_FIELDS: Record<SectionId, string[]> = {
  poste: ['entreprise', 'poste'],
  candidature: ['dateCandidature', 'datePublication', 'lienOffre', 'lienLinkedIn', 'siteEntreprise'],
  contact: ['contact.email', 'contact.phone', 'contact.linkedin'],
  remuneration: [],
  suivi: ['prochaineRelance', 'customRelanceDays'],
  documents: [],
  notes: [],
};

/** Convertit une date stockée vers la valeur attendue par <input type="datetime-local"> */
function toDateTimeInput(v: string): string {
  const d = parseLocalDate(v);
  if (!d) return v;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T09:00` : format(d, "yyyy-MM-dd'T'HH:mm");
}

function toDateInput(v: string | null | undefined): string {
  const d = parseLocalDate(v);
  return d ? toDateKey(d) : '';
}

function Field({
  label, htmlFor, error, hint, required, children, className = '',
}: {
  label: string; htmlFor?: string; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={htmlFor ? `${htmlFor}-error` : undefined}>
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="label-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 cursor-pointer select-none py-1">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-theme-solid' : 'bg-[var(--color-border-strong)]'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

function Section({ id, title, description, icon: Icon, children }: { id: string; title: string; description?: string; icon: typeof Building2; children: ReactNode }) {
  return (
    <section id={`section-${id}`} className="card scroll-mt-24">
      <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
        <span className="w-8 h-8 rounded-lg bg-theme-subtle text-theme flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </section>
  );
}

export default function ApplicationForm({ initial, mode, onSubmit, onCancel, headerExtra }: ApplicationFormProps) {
  const [form, setForm] = useState<Partial<Application>>(() => ({
    ...initial,
    prochaineRelance: toDateInput(initial.prochaineRelance) || null,
    entrevueDates: (initial.entrevueDates || []).map(toDateTimeInput),
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [dirty, setDirty] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const errors: FormErrors = useMemo(() => validateApplication(form), [form]);
  const showError = (key: string) => (submitted || touched[key] ? errors[key] : undefined);
  const invalid = (key: string) => (showError(key) ? 'input-invalid' : '');

  const set = <K extends keyof Application>(field: K, value: Application[K] | undefined) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const setContact = (field: keyof Application['contact'], value: string) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, contact: { ...(prev.contact || { name: '', role: '', email: '', phone: '', linkedin: '' }), [field]: value } }));
  };
  const touch = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  const suggestedRelance = useMemo(() => {
    const sent = parseLocalDate(form.dateCandidature) ?? new Date();
    let d = addDays(sent, relanceDelayDays({ relanceDelay: form.relanceDelay ?? 7, customRelanceDays: form.customRelanceDays }));
    if (d < startOfToday()) d = startOfToday();
    return toDateKey(d);
  }, [form.dateCandidature, form.relanceDelay, form.customRelanceDays]);

  const addTechnology = () => {
    const values = techInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (values.length === 0) return;
    const current = form.technologies || [];
    set('technologies', [...current, ...values.filter((v) => !current.some((c) => c.toLowerCase() === v.toLowerCase()))]);
    setTechInput('');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: AttachedFile['type']) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const attached = await readAttachment(file, type);
      set('piecesJointes', [...(form.piecesJointes || []), attached]);
      toast.success('Fichier ajouté', { description: file.name });
    } catch (err) {
      toast.error('Fichier refusé', { description: (err as Error).message });
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      toast.error(keys.length === 1 ? 'Un champ est à corriger' : `${keys.length} champs sont à corriger`, {
        description: errors[keys[0]],
      });
      // Fait défiler jusqu'au premier champ en erreur
      window.setTimeout(() => {
        const el = formRef.current?.querySelector<HTMLElement>('.input-invalid');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      }, 0);
      return;
    }

    const status = (form.status || 'a_preparer') as ApplicationStatus;
    let prochaineRelance = form.prochaineRelance || null;
    // Une candidature envoyée sans date de relance reçoit la date suggérée
    if (!prochaineRelance && mode === 'create' && (status === 'en_attente' || status === 'relance_prevue')) {
      prochaineRelance = suggestedRelance;
    }

    const contact = form.contact || { name: '', role: '', email: '', phone: '', linkedin: '' };
    onSubmit({
      category: (form.category || 'stage') as ContractCategory,
      entreprise: (form.entreprise || '').trim(),
      entrepriseLogo: form.entrepriseLogo || '',
      poste: (form.poste || '').trim(),
      lieu: (form.lieu || '').trim(),
      teletravail: !!form.teletravail,
      remunere: !!form.remunere,
      salaire: form.remunere ? (form.salaire || '').trim() : '',
      lienOffre: normalizeUrl(form.lienOffre || ''),
      lienLinkedIn: normalizeUrl(form.lienLinkedIn || ''),
      siteEntreprise: normalizeUrl(form.siteEntreprise || ''),
      datePublication: form.datePublication || '',
      dateCandidature: form.dateCandidature || toDateKey(new Date()),
      moyenCandidature: (form.moyenCandidature || 'email') as ApplicationMethod,
      contact: {
        name: contact.name.trim(),
        role: contact.role.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        linkedin: normalizeUrl(contact.linkedin),
      },
      cvEnvoye: !!form.cvEnvoye,
      lettreEnvoyee: !!form.lettreEnvoyee,
      portfolioEnvoye: !!form.portfolioEnvoye,
      githubEnvoye: !!form.githubEnvoye,
      notes: form.notes || '',
      dateDebut: form.dateDebut || undefined,
      status,
      relanceDelay: (form.relanceDelay ?? 7) as RelanceDelay,
      customRelanceDays: form.relanceDelay === 'custom' ? Number(form.customRelanceDays) : undefined,
      maxRelances: (form.maxRelances ?? 2) as MaxRelances,
      prochaineRelance,
      entrevueDates: (form.entrevueDates || []).filter(Boolean).sort(),
      piecesJointes: form.piecesJointes || [],
      technologies: form.technologies || [],
    });
    setDirty(false);
  };

  const cancel = async () => {
    if (dirty) {
      const ok = await confirmAction({
        title: 'Abandonner les modifications ?',
        message: 'Les informations saisies ne seront pas enregistrées.',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la saisie',
      });
      if (!ok) return;
    }
    onCancel();
  };

  // Ctrl/⌘ + S pour enregistrer
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submitRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Avertit avant de quitter l'onglet avec des modifications non enregistrées
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const sectionHasError = (id: SectionId) =>
    SECTION_FIELDS[id].some((k) => showError(k)) || (id === 'suivi' && Object.keys(errors).some((k) => k.startsWith('entrevueDates') && showError(k)));
  const sectionDone = (id: SectionId): boolean => {
    switch (id) {
      case 'poste': return !!(form.entreprise && form.poste);
      case 'candidature': return !!form.dateCandidature;
      case 'contact': return !!(form.contact?.name || form.contact?.email);
      case 'remuneration': return !!(form.salaire || form.dateDebut);
      case 'suivi': return !!(form.prochaineRelance || (form.entrevueDates || []).length);
      case 'documents': return !!(form.cvEnvoye || form.lettreEnvoyee || (form.piecesJointes || []).length);
      case 'notes': return !!(form.notes || (form.technologies || []).length);
    }
  };

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  const inputCls = 'glass-input w-full text-sm py-2.5';

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_220px] gap-6 items-start">
      <div className="space-y-4 min-w-0">
        {headerExtra}

        {/* Poste & entreprise */}
        <Section id="poste" title="Poste & entreprise" icon={Building2} description="Les informations essentielles de l’offre.">
          <div className="space-y-4">
            <Field label="Type de contrat">
              <CategoryTabs value={(form.category || 'stage') as ContractCategory} onChange={(c) => set('category', c)} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Entreprise" htmlFor="f-entreprise" required error={showError('entreprise')}>
                <input
                  id="f-entreprise" className={`${inputCls} ${invalid('entreprise')}`} value={form.entreprise || ''}
                  onChange={(e) => set('entreprise', e.target.value)} onBlur={touch('entreprise')}
                  placeholder="Ex : OpenClassrooms" autoComplete="organization" aria-invalid={!!showError('entreprise')}
                  autoFocus={mode === 'create'}
                />
              </Field>
              <Field label="Intitulé du poste" htmlFor="f-poste" required error={showError('poste')}>
                <input
                  id="f-poste" className={`${inputCls} ${invalid('poste')}`} value={form.poste || ''}
                  onChange={(e) => set('poste', e.target.value)} onBlur={touch('poste')}
                  placeholder="Ex : Développeur Full-Stack" aria-invalid={!!showError('poste')}
                />
              </Field>
              <Field label="Localisation" htmlFor="f-lieu">
                <input id="f-lieu" className={inputCls} value={form.lieu || ''} onChange={(e) => set('lieu', e.target.value)} placeholder="Ex : Paris, Lyon, Remote…" />
              </Field>
              <div className="flex items-end">
                <div className="w-full rounded-xl border border-[var(--color-border)] px-3 py-1.5">
                  <Switch id="f-teletravail" label="Télétravail possible" checked={!!form.teletravail} onChange={(v) => set('teletravail', v)} />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Candidature */}
        <Section id="candidature" title="Candidature" icon={Send} description="Où en est la candidature et comment l’avez-vous envoyée ?">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Statut" htmlFor="f-status">
              <select id="f-status" className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as ApplicationStatus)}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Date d’envoi" htmlFor="f-date" required error={showError('dateCandidature')}>
              <input
                id="f-date" type="date" className={`${inputCls} ${invalid('dateCandidature')}`} value={form.dateCandidature || ''}
                onChange={(e) => set('dateCandidature', e.target.value)} onBlur={touch('dateCandidature')}
              />
            </Field>
            <Field label="Moyen de candidature" htmlFor="f-method">
              <select id="f-method" className={inputCls} value={form.moyenCandidature} onChange={(e) => set('moyenCandidature', e.target.value as ApplicationMethod)}>
                {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Date de publication de l’offre" htmlFor="f-pub" error={showError('datePublication')}>
              <input id="f-pub" type="date" className={`${inputCls} ${invalid('datePublication')}`} value={form.datePublication || ''} onChange={(e) => set('datePublication', e.target.value)} onBlur={touch('datePublication')} />
            </Field>
            <Field label="Lien vers l’offre" htmlFor="f-offre" error={showError('lienOffre')} className="sm:col-span-2">
              <input id="f-offre" type="url" inputMode="url" className={`${inputCls} ${invalid('lienOffre')}`} value={form.lienOffre || ''} onChange={(e) => set('lienOffre', e.target.value)} onBlur={touch('lienOffre')} placeholder="https://…" />
            </Field>
            <Field label="Page LinkedIn de l’offre" htmlFor="f-li" error={showError('lienLinkedIn')}>
              <input id="f-li" type="url" inputMode="url" className={`${inputCls} ${invalid('lienLinkedIn')}`} value={form.lienLinkedIn || ''} onChange={(e) => set('lienLinkedIn', e.target.value)} onBlur={touch('lienLinkedIn')} placeholder="https://linkedin.com/jobs/…" />
            </Field>
            <Field label="Site de l’entreprise" htmlFor="f-site" error={showError('siteEntreprise')}>
              <input id="f-site" type="url" inputMode="url" className={`${inputCls} ${invalid('siteEntreprise')}`} value={form.siteEntreprise || ''} onChange={(e) => set('siteEntreprise', e.target.value)} onBlur={touch('siteEntreprise')} placeholder="https://…" />
            </Field>
          </div>
        </Section>

        {/* Contact */}
        <Section id="contact" title="Contact RH" icon={UserRound} description="La personne à qui vous avez envoyé votre candidature.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom" htmlFor="f-cname">
              <input id="f-cname" className={inputCls} value={form.contact?.name || ''} onChange={(e) => setContact('name', e.target.value)} placeholder="Ex : Marie Dupont" autoComplete="off" />
            </Field>
            <Field label="Fonction" htmlFor="f-crole">
              <input id="f-crole" className={inputCls} value={form.contact?.role || ''} onChange={(e) => setContact('role', e.target.value)} placeholder="Ex : Chargée de recrutement" />
            </Field>
            <Field label="Adresse e-mail" htmlFor="f-cemail" error={showError('contact.email')}>
              <input id="f-cemail" type="email" inputMode="email" className={`${inputCls} ${invalid('contact.email')}`} value={form.contact?.email || ''} onChange={(e) => setContact('email', e.target.value)} onBlur={touch('contact.email')} placeholder="prenom.nom@entreprise.fr" autoComplete="off" />
            </Field>
            <Field label="Téléphone" htmlFor="f-cphone" error={showError('contact.phone')}>
              <input id="f-cphone" type="tel" inputMode="tel" className={`${inputCls} ${invalid('contact.phone')}`} value={form.contact?.phone || ''} onChange={(e) => setContact('phone', e.target.value)} onBlur={touch('contact.phone')} placeholder="06 12 34 56 78" />
            </Field>
            <Field label="Profil LinkedIn du recruteur" htmlFor="f-clinkedin" error={showError('contact.linkedin')} className="sm:col-span-2">
              <input id="f-clinkedin" type="url" inputMode="url" className={`${inputCls} ${invalid('contact.linkedin')}`} value={form.contact?.linkedin || ''} onChange={(e) => setContact('linkedin', e.target.value)} onBlur={touch('contact.linkedin')} placeholder="https://linkedin.com/in/…" />
            </Field>
          </div>
        </Section>

        {/* Rémunération */}
        <Section id="remuneration" title="Rémunération & contrat" icon={Wallet}>
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] px-3 py-1.5">
              <Switch id="f-remunere" label="Poste rémunéré" checked={!!form.remunere} onChange={(v) => set('remunere', v)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {form.remunere && (
                <Field label="Salaire proposé" htmlFor="f-salaire" hint="Facultatif — utilisé pour comparer vos offres dans Négociation.">
                  <input id="f-salaire" className={inputCls} value={form.salaire || ''} onChange={(e) => set('salaire', e.target.value)} placeholder="Ex : 42k€ brut/an ou 1 200 €/mois" />
                </Field>
              )}
              {(form.category === 'stage' || form.category === 'alternance') && (
                <Field
                  label={`Date de début ${form.category === 'stage' ? 'du stage' : 'de l’alternance'}`}
                  htmlFor="f-debut"
                  hint="Active le compte à rebours dans l’en-tête."
                >
                  <input id="f-debut" type="date" className={inputCls} value={form.dateDebut || ''} onChange={(e) => set('dateDebut', e.target.value)} />
                </Field>
              )}
            </div>
          </div>
        </Section>

        {/* Suivi */}
        <Section id="suivi" title="Relances & entretiens" icon={BellRing} description="Programmez vos relances et notez vos entretiens : ils apparaîtront dans le calendrier et le dashboard.">
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field
                label="Date de relance"
                htmlFor="f-relance"
                error={showError('prochaineRelance')}
                hint={
                  form.prochaineRelance ? undefined : (
                    <button type="button" className="inline-flex items-center gap-1 text-theme hover:underline" onClick={() => set('prochaineRelance', suggestedRelance)}>
                      <Wand2 className="w-3 h-3" /> Suggérer : {formatDate(suggestedRelance)}
                    </button>
                  )
                }
              >
                <input id="f-relance" type="date" className={`${inputCls} ${invalid('prochaineRelance')}`} value={form.prochaineRelance || ''} onChange={(e) => set('prochaineRelance', e.target.value || null)} onBlur={touch('prochaineRelance')} />
              </Field>
              <Field label="Relancer tous les" htmlFor="f-delay">
                <select
                  id="f-delay" className={inputCls} value={String(form.relanceDelay ?? 7)}
                  onChange={(e) => set('relanceDelay', (e.target.value === 'custom' ? 'custom' : Number(e.target.value)) as RelanceDelay)}
                >
                  {Object.entries(RELANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Relances maximum" htmlFor="f-max">
                <select
                  id="f-max" className={inputCls} value={String(form.maxRelances ?? 2)}
                  onChange={(e) => set('maxRelances', (e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value)) as MaxRelances)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="unlimited">Illimité</option>
                </select>
              </Field>
              {form.relanceDelay === 'custom' && (
                <Field label="Nombre de jours" htmlFor="f-custom" error={showError('customRelanceDays')} className="sm:col-start-2">
                  <input id="f-custom" type="number" min={1} max={90} className={`${inputCls} ${invalid('customRelanceDays')}`} value={form.customRelanceDays ?? ''} onChange={(e) => set('customRelanceDays', e.target.value ? Number(e.target.value) : undefined)} onBlur={touch('customRelanceDays')} placeholder="Ex : 21" />
                </Field>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label !mb-0">Dates d’entretien</p>
                <button
                  type="button"
                  className="text-xs font-medium text-theme inline-flex items-center gap-1 hover:underline"
                  onClick={() => set('entrevueDates', [...(form.entrevueDates || []), ''])}
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Ajouter un entretien
                </button>
              </div>
              {(form.entrevueDates || []).length === 0 ? (
                <p className="text-xs text-muted">Aucun entretien programmé.</p>
              ) : (
                <ul className="space-y-2">
                  {(form.entrevueDates || []).map((d, i) => (
                    <li key={i}>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          aria-label={`Entretien ${i + 1}`}
                          className={`${inputCls} ${invalid(`entrevueDates.${i}`)}`}
                          value={d}
                          onChange={(e) => {
                            const next = [...(form.entrevueDates || [])];
                            next[i] = e.target.value;
                            set('entrevueDates', next);
                          }}
                        />
                        <button type="button" className="icon-btn hover:!text-red-500" aria-label="Supprimer cet entretien" onClick={() => set('entrevueDates', (form.entrevueDates || []).filter((_, j) => j !== i))}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {showError(`entrevueDates.${i}`) && <p className="field-error"><AlertCircle className="w-3 h-3" />{showError(`entrevueDates.${i}`)}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        {/* Documents */}
        <Section id="documents" title="Documents" icon={Paperclip} description="Ce que vous avez envoyé, et les fichiers à garder sous la main (1,5 Mo max par fichier).">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {([
                ['cvEnvoye', 'CV'],
                ['lettreEnvoyee', 'Lettre de motivation'],
                ['portfolioEnvoye', 'Portfolio'],
                ['githubEnvoye', 'GitHub'],
              ] as const).map(([key, label]) => {
                const on = !!form[key];
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => set(key, !on)} className={`chip !py-2 !px-3 !text-sm ${on ? 'chip-active' : ''}`}>
                    {on ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FILE_TYPES.map((ft) => (
                <div key={ft} className="flex flex-col gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[ft]?.click()}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-[var(--color-border-strong)] text-xs text-muted hover:text-theme hover:border-theme-subtle-40 hover:bg-theme-subtle-05 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> {FILE_TYPE_LABELS[ft]}
                  </button>
                  <input ref={(el) => { fileInputRefs.current[ft] = el; }} type="file" className="hidden" accept={ACCEPTED_FILES} onChange={(e) => handleFile(e, ft)} />
                  {(form.piecesJointes || []).filter((f) => f.type === ft).map((f) => (
                    <div key={f.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-surface-2)] text-xs min-w-0">
                      <span className="truncate flex-1 text-[var(--color-text)]" title={f.name}>{f.name}</span>
                      <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => set('piecesJointes', (form.piecesJointes || []).filter((x) => x.id !== f.id))} className="text-muted hover:text-red-500 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Notes */}
        <Section id="notes" title="Notes & compétences" icon={StickyNote}>
          <div className="space-y-4">
            <Field label="Technologies / compétences demandées" htmlFor="f-tech" hint="Appuyez sur Entrée ou séparez par des virgules.">
              <div className="flex gap-2">
                <input
                  id="f-tech" className={inputCls} value={techInput} onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTechnology(); } }}
                  placeholder="Ex : React, TypeScript"
                />
                <button type="button" onClick={addTechnology} className="btn-secondary btn-sm shrink-0" aria-label="Ajouter la technologie">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </Field>
            {(form.technologies || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 -mt-1">
                {(form.technologies || []).map((t) => (
                  <span key={t} className="badge bg-theme-subtle text-theme border-theme-subtle">
                    {t}
                    <button type="button" aria-label={`Retirer ${t}`} onClick={() => set('technologies', (form.technologies || []).filter((x) => x !== t))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Field label="Notes personnelles" htmlFor="f-notes">
              <textarea id="f-notes" className={`${inputCls} min-h-[120px] resize-y`} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Impressions, points à préparer, questions à poser…" />
            </Field>
          </div>
        </Section>

        {/* Barre d'actions */}
        <div className="sticky bottom-0 z-10 -mx-4 md:mx-0 px-4 md:px-5 py-3 md:rounded-2xl surface-raised flex items-center gap-3">
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-muted flex-1">
            {submitted && Object.keys(errors).length > 0 ? (
              <span className="text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{Object.keys(errors).length} champ(s) à corriger</span>
            ) : (
              <>
                <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>S</Kbd> pour enregistrer
              </>
            )}
          </p>
          <button type="button" onClick={cancel} className="btn-secondary btn-sm flex-1 sm:flex-none">
            Annuler
          </button>
          <button type="submit" className="btn-primary btn-sm flex-1 sm:flex-none">
            <Save className="w-4 h-4" />
            {mode === 'create' ? 'Enregistrer la candidature' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {/* Sommaire */}
      <aside className="hidden lg:block sticky top-6">
        <p className="eyebrow mb-2 px-2">Sections</p>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => {
            const error = sectionHasError(s.id);
            const done = sectionDone(s.id);
            return (
              <a
                key={s.id}
                href={`#section-${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-muted hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    error ? 'border-red-500 bg-red-500/15' : done ? 'border-transparent bg-theme-solid' : 'border-[var(--color-border-strong)]'
                  }`}
                >
                  {error ? <span className="w-1 h-1 rounded-full bg-red-500" /> : done ? <Check className="w-2.5 h-2.5 text-white" /> : null}
                </span>
                {s.label}
              </a>
            );
          })}
        </nav>
        <p className="text-[11px] text-muted mt-4 px-2 leading-relaxed">
          Seuls l’entreprise, le poste et la date d’envoi sont obligatoires.
        </p>
      </aside>
    </form>
  );
}
