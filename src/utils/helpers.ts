import { format, startOfWeek, addWeeks, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  Application,
  ApplicationMethod,
  ApplicationStatus,
  Company,
  ContractCategory,
  MaxRelances,
  RelanceDelay,
} from '@/types';
import { ALL_STATUSES, CLOSED_STATUSES, METHOD_LABELS } from '@/types';
import { safeFileUrl, safeImageSrc, safeText, safeWebUrl } from '@/utils/security';

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Parse une date stockée dans l'application.
 * Les dates "YYYY-MM-DD" sont interprétées en heure locale (et non en UTC,
 * ce qui décalerait le jour dans certains fuseaux horaires).
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return isValid(d) ? d : null;
}

/** Clé "YYYY-MM-DD" en heure locale. */
export function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function hasTime(value: string): boolean {
  return /T\d{2}:\d{2}/.test(value) && !/T00:00(:00(\.000)?)?Z?$/.test(value);
}

export function formatDate(date: string | null | undefined, fmt: string = 'dd/MM/yyyy'): string {
  const d = parseLocalDate(date);
  if (!d) return '-';
  return format(d, fmt, { locale: fr });
}

export function formatDateTime(date: string | null | undefined): string {
  const d = parseLocalDate(date);
  if (!d || !date) return '-';
  return hasTime(date) ? format(d, "dd/MM/yyyy 'à' HH:mm", { locale: fr }) : format(d, 'dd/MM/yyyy', { locale: fr });
}

/** Nombre de jours calendaires entre aujourd'hui et la date (négatif = passé). */
export function daysFromToday(date: string | Date | null | undefined): number | null {
  const d = typeof date === 'string' || date == null ? parseLocalDate(date as string | null) : date;
  if (!d) return null;
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / DAY_MS);
}

export function formatRelativeDate(date: string): string {
  const days = daysFromToday(date);
  if (days === null) return '';
  if (days === 0) return "Aujourd'hui";
  if (days === -1) return 'Hier';
  if (days === 1) return 'Demain';
  if (days < 0) {
    const n = -days;
    if (n < 7) return `Il y a ${n} jours`;
    if (n < 30) {
      const w = Math.floor(n / 7);
      return `Il y a ${w} semaine${w > 1 ? 's' : ''}`;
    }
    return formatDate(date);
  }
  if (days < 7) return `Dans ${days} jours`;
  return formatDate(date);
}

export function getDaysRemaining(dateStr: string | undefined): number | null {
  return daysFromToday(dateStr);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function relanceDelayDays(app: Pick<Application, 'relanceDelay' | 'customRelanceDays'>): number {
  if (app.relanceDelay === 'custom') return app.customRelanceDays || 7;
  const n = Number(app.relanceDelay);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

export function isClosed(app: Pick<Application, 'status'>): boolean {
  return CLOSED_STATUSES.includes(app.status);
}

/** Une candidature est considérée comme envoyée dès qu'elle n'est plus "à préparer". */
export function isSent(app: Pick<Application, 'status'>): boolean {
  return app.status !== 'a_preparer';
}

// ---------------------------------------------------------------------------
// Normalisation (migration du stockage, import JSON, création)
// ---------------------------------------------------------------------------

const VALID_DELAYS: RelanceDelay[] = [3, 5, 7, 10, 14, 'custom'];

export function normalizeRelanceDelay(v: unknown): RelanceDelay {
  if (v === 'custom') return 'custom';
  const n = Number(v);
  return (VALID_DELAYS.includes(n as RelanceDelay) ? n : 7) as RelanceDelay;
}

export function normalizeMaxRelances(v: unknown): MaxRelances {
  if (v === 'unlimited') return 'unlimited';
  const n = Number(v);
  return (n === 1 || n === 2 || n === 3 ? n : 2) as MaxRelances;
}

type Loose<T> = { [K in keyof T]?: unknown };

const MAX_ITEMS = 2000;
const EXCHANGE_TYPES = ['email', 'appel', 'entretien', 'message', 'autre'];
const FILE_KINDS = ['cv', 'lettre', 'portfolio', 'certificat', 'autre'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Garantit qu'une candidature possède tous les champs attendus ET qu'ils sont sûrs
 * (données anciennes, importées depuis un fichier JSON ou modifiées à la main dans le navigateur).
 * Toutes les URL passent par safeWebUrl : un lien « javascript: » est supprimé.
 */
export function normalizeApplication(raw: Loose<Application>): Application {
  const now = new Date().toISOString();
  const str = (v: unknown, max = 500) => safeText(v, max);
  const contact = isObj(raw.contact) ? raw.contact : {};
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, MAX_ITEMS) : []);

  return {
    id: str(raw.id, 100) || generateId(),
    category: (['stage', 'alternance', 'cdi', 'cdd'].includes(str(raw.category)) ? raw.category : 'stage') as ContractCategory,
    entreprise: str(raw.entreprise, 200),
    entrepriseLogo: safeImageSrc(raw.entrepriseLogo),
    poste: str(raw.poste, 200),
    lieu: str(raw.lieu, 200),
    teletravail: !!raw.teletravail,
    remunere: !!raw.remunere,
    salaire: str(raw.salaire, 100),
    lienOffre: safeWebUrl(raw.lienOffre),
    lienLinkedIn: safeWebUrl(raw.lienLinkedIn),
    siteEntreprise: safeWebUrl(raw.siteEntreprise),
    datePublication: str(raw.datePublication, 40),
    dateCandidature: str(raw.dateCandidature, 40) || now.split('T')[0],
    moyenCandidature: (str(raw.moyenCandidature) in METHOD_LABELS ? raw.moyenCandidature : 'autre') as ApplicationMethod,
    contact: {
      name: str(contact.name, 200),
      role: str(contact.role, 200),
      email: str(contact.email, 200),
      phone: str(contact.phone, 50),
      linkedin: safeWebUrl(contact.linkedin),
    },
    cvEnvoye: !!raw.cvEnvoye,
    lettreEnvoyee: !!raw.lettreEnvoyee,
    portfolioEnvoye: !!raw.portfolioEnvoye,
    githubEnvoye: !!raw.githubEnvoye,
    notes: str(raw.notes, 20000),
    dateDebut: str(raw.dateDebut, 40) || undefined,
    status: (ALL_STATUSES.includes(str(raw.status) as ApplicationStatus) ? raw.status : 'a_preparer') as ApplicationStatus,
    relanceDelay: normalizeRelanceDelay(raw.relanceDelay),
    customRelanceDays: raw.customRelanceDays ? Math.min(365, Math.max(1, Number(raw.customRelanceDays) || 7)) : undefined,
    maxRelances: normalizeMaxRelances(raw.maxRelances),
    relancesEffectuees: Math.max(0, Number(raw.relancesEffectuees) || 0),
    prochaineRelance: str(raw.prochaineRelance, 40) || null,
    dernierContact: str(raw.dernierContact, 40) || null,
    entrevueDates: list(raw.entrevueDates)
      .filter((d): d is string => typeof d === 'string' && !!d)
      .map((d) => d.slice(0, 40)),
    piecesJointes: list(raw.piecesJointes).flatMap((f) => {
      if (!isObj(f)) return [];
      const url = safeFileUrl(f.url);
      if (!url) return [];
      return [
        {
          id: str(f.id, 100) || generateId(),
          name: str(f.name, 255).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_') || 'fichier',
          type: (FILE_KINDS.includes(str(f.type)) ? f.type : 'autre') as Application['piecesJointes'][number]['type'],
          url,
          uploadedAt: str(f.uploadedAt, 40) || now,
        },
      ];
    }),
    historique: list(raw.historique).flatMap((h) =>
      isObj(h)
        ? [{ id: str(h.id, 100) || generateId(), date: str(h.date, 40) || now, action: str(h.action, 200), detail: str(h.detail, 1000) }]
        : []
    ),
    echanges: list(raw.echanges).flatMap((e) =>
      isObj(e)
        ? [
            {
              id: str(e.id, 100) || generateId(),
              date: str(e.date, 40) || now.split('T')[0],
              type: (EXCHANGE_TYPES.includes(str(e.type)) ? e.type : 'autre') as Application['echanges'][number]['type'],
              direction: (e.direction === 'entrant' ? 'entrant' : 'sortant') as 'entrant' | 'sortant',
              resume: str(e.resume, 2000),
            },
          ]
        : []
    ),
    createdAt: str(raw.createdAt, 40) || now,
    updatedAt: str(raw.updatedAt, 40) || now,
    technologies: list(raw.technologies)
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.slice(0, 60))
      .slice(0, 100),
  };
}

/** Nettoie une fiche entreprise (import ou stockage) : mêmes règles que pour les candidatures. */
export function normalizeCompany(raw: unknown): Company | null {
  if (!isObj(raw)) return null;
  const now = new Date().toISOString();
  const s = (v: unknown, max = 500) => safeText(v, max);
  const contacts = (v: unknown) =>
    (Array.isArray(v) ? v.slice(0, 200) : []).flatMap((c) =>
      isObj(c)
        ? [{ name: s(c.name, 200), role: s(c.role, 200), email: s(c.email, 200), phone: s(c.phone, 50), linkedin: safeWebUrl(c.linkedin) }]
        : []
    );
  const nom = s(raw.nom, 200);
  if (!nom) return null;
  return {
    id: s(raw.id, 100) || generateId(),
    nom,
    logo: safeImageSrc(raw.logo),
    secteur: s(raw.secteur, 200),
    taille: s(raw.taille, 100),
    adresse: s(raw.adresse, 300),
    siteWeb: safeWebUrl(raw.siteWeb),
    contactsRH: contacts(raw.contactsRH),
    recruteurs: contacts(raw.recruteurs),
    notes: s(raw.notes, 20000),
    candidatureIds: (Array.isArray(raw.candidatureIds) ? raw.candidatureIds : [])
      .filter((i): i is string => typeof i === 'string')
      .slice(0, MAX_ITEMS),
    createdAt: s(raw.createdAt, 40) || now,
    updatedAt: s(raw.updatedAt, 40) || now,
  };
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

const RESPONSE_ACTIONS = ['Réponse', 'Acceptation', 'Refus', 'Entretien programmé'];
const RESPONSE_STATUSES: ApplicationStatus[] = ['entretien', 'acceptee', 'refusee'];

/** Date de la première réponse de l'entreprise (entretien, acceptation ou refus), si connue. */
export function getResponseDate(app: Application): Date | null {
  const fromHistory = app.historique.find(
    (h) =>
      RESPONSE_ACTIONS.includes(h.action) ||
      /"(Entretien|Acceptée|Refusée)"/.test(h.detail)
  );
  if (fromHistory) return new Date(fromHistory.date);
  const incoming = app.echanges
    .filter((e) => e.direction === 'entrant')
    .map((e) => parseLocalDate(e.date))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (incoming) return incoming;
  if (RESPONSE_STATUSES.includes(app.status)) return new Date(app.updatedAt);
  return null;
}

export function filterByCategory(apps: Application[], category: ContractCategory | 'all') {
  return category === 'all' ? apps : apps.filter((a) => a.category === category);
}

export function getStats(apps: Application[], category: ContractCategory | 'all' = 'all') {
  const filtered = filterByCategory(apps, category);
  const total = filtered.length;
  const sent = filtered.filter(isSent);
  const enAttente = filtered.filter((a) => a.status === 'en_attente' || a.status === 'relance_prevue').length;
  const aPreparer = filtered.filter((a) => a.status === 'a_preparer').length;
  const entretiens = filtered.filter((a) => a.status === 'entretien').length;
  const acceptees = filtered.filter((a) => a.status === 'acceptee').length;
  const refusees = filtered.filter((a) => a.status === 'refusee').length;
  const relances = filtered.reduce((s, a) => s + a.relancesEffectuees, 0);
  const now = new Date();
  const entretiensProgrammes = filtered.reduce(
    (s, a) => s + a.entrevueDates.filter((d) => (parseLocalDate(d) ?? new Date(0)) >= startOfToday()).length,
    0
  );

  const responded = sent.filter((a) => RESPONSE_STATUSES.includes(a.status));
  const tauxReponse = sent.length > 0 ? Math.round((responded.length / sent.length) * 100) : 0;
  const tauxAcceptation = sent.length > 0 ? Math.round((acceptees / sent.length) * 100) : 0;

  const delays: number[] = [];
  responded.forEach((a) => {
    const sentAt = parseLocalDate(a.dateCandidature);
    const reply = getResponseDate(a);
    if (sentAt && reply) {
      delays.push(Math.max(0, Math.round((reply.getTime() - sentAt.getTime()) / DAY_MS)));
    }
  });
  const avgTime = delays.length > 0 ? Math.round(delays.reduce((s, v) => s + v, 0) / delays.length) : 0;

  const relancesDues = getRelancesDue(filtered, now).length;

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = addWeeks(weekStart, -1);
  const thisWeek = filtered.filter((a) => (parseLocalDate(a.dateCandidature) ?? new Date(0)) >= weekStart).length;
  const lastWeek = filtered.filter((a) => {
    const d = parseLocalDate(a.dateCandidature);
    return !!d && d >= lastWeekStart && d < weekStart;
  }).length;

  return {
    total,
    envoyees: sent.length,
    aPreparer,
    enAttente,
    entretiens,
    entretiensProgrammes,
    acceptees,
    refusees,
    relances,
    relancesDues,
    tauxReponse,
    tauxAcceptation,
    avgTime,
    hasAvgTime: delays.length > 0,
    thisWeek,
    lastWeek,
  };
}

export type Stats = ReturnType<typeof getStats>;

/** Candidatures dont la prochaine relance est aujourd'hui ou en retard. */
export function getRelancesDue(apps: Application[], ref: Date = new Date()): Application[] {
  const end = new Date(ref);
  end.setHours(23, 59, 59, 999);
  return apps
    .filter((a) => {
      if (!a.prochaineRelance || isClosed(a)) return false;
      const d = parseLocalDate(a.prochaineRelance);
      return !!d && d <= end;
    })
    .sort((a, b) => (parseLocalDate(a.prochaineRelance)!.getTime() - parseLocalDate(b.prochaineRelance)!.getTime()));
}

/** @deprecated conservé pour compatibilité : utilisez getRelancesDue */
export function getRelancesToday(apps: Application[]): Application[] {
  return getRelancesDue(apps);
}

export function getUpcomingInterviews(apps: Application[]): Application[] {
  const today = startOfToday();
  return apps.filter((a) => a.entrevueDates.some((d) => (parseLocalDate(d) ?? new Date(0)) >= today));
}

export type DeadlineType = 'entretien' | 'relance' | 'debut';

export interface Deadline {
  id: string;
  type: DeadlineType;
  date: string;
  app: Application;
}

/** Prochaines échéances (entretiens, relances, débuts de contrat) triées par date. */
export function getUpcomingDeadlines(apps: Application[], horizonDays = 60): Deadline[] {
  const today = startOfToday();
  const limit = addDays(today, horizonDays);
  const out: Deadline[] = [];
  const inRange = (v: string | null | undefined) => {
    const d = parseLocalDate(v);
    return !!d && d >= today && d <= limit;
  };
  apps.forEach((app) => {
    app.entrevueDates.forEach((d, i) => {
      if (inRange(d)) out.push({ id: `${app.id}-e${i}`, type: 'entretien', date: d, app });
    });
    if (!isClosed(app) && inRange(app.prochaineRelance)) {
      out.push({ id: `${app.id}-r`, type: 'relance', date: app.prochaineRelance!, app });
    }
    if (app.dateDebut && inRange(app.dateDebut)) {
      out.push({ id: `${app.id}-d`, type: 'debut', date: app.dateDebut, app });
    }
  });
  return out.sort((a, b) => parseLocalDate(a.date)!.getTime() - parseLocalDate(b.date)!.getTime());
}

export interface ActionItem {
  id: string;
  kind: 'relance_retard' | 'relance_jour' | 'sans_reponse' | 'a_preparer' | 'entretien_proche';
  app: Application;
  label: string;
  detail: string;
}

/** Liste des actions à effectuer, par ordre de priorité. */
export function getActionItems(apps: Application[]): ActionItem[] {
  const items: ActionItem[] = [];
  const today = startOfToday();

  apps.forEach((app) => {
    if (isClosed(app)) return;
    const relanceDays = daysFromToday(app.prochaineRelance);
    if (relanceDays !== null && relanceDays < 0) {
      items.push({
        id: `${app.id}-rr`, kind: 'relance_retard', app,
        label: 'Relance en retard',
        detail: `Prévue ${formatRelativeDate(app.prochaineRelance!).toLowerCase()}`,
      });
    } else if (relanceDays === 0) {
      items.push({ id: `${app.id}-rj`, kind: 'relance_jour', app, label: "Relance aujourd'hui", detail: 'À faire aujourd’hui' });
    } else if (!app.prochaineRelance && (app.status === 'en_attente' || app.status === 'relance_prevue')) {
      const sentDays = daysFromToday(app.dateCandidature);
      const delay = relanceDelayDays(app);
      const max = app.maxRelances === 'unlimited' ? Infinity : app.maxRelances;
      if (sentDays !== null && -sentDays >= delay && app.relancesEffectuees < max) {
        items.push({
          id: `${app.id}-sr`, kind: 'sans_reponse', app,
          label: 'Sans réponse',
          detail: `Envoyée il y a ${-sentDays} jours, aucune relance programmée`,
        });
      }
    }
    if (app.status === 'a_preparer') {
      const created = daysFromToday(app.createdAt);
      if (created !== null && created <= -3) {
        items.push({ id: `${app.id}-ap`, kind: 'a_preparer', app, label: 'À finaliser', detail: `Créée il y a ${-created} jours, pas encore envoyée` });
      }
    }
    app.entrevueDates.forEach((d, i) => {
      const pd = parseLocalDate(d);
      if (pd && pd >= today && pd <= addDays(today, 2)) {
        items.push({ id: `${app.id}-ep${i}`, kind: 'entretien_proche', app, label: 'Entretien imminent', detail: formatDateTime(d) });
      }
    });
  });

  const order: ActionItem['kind'][] = ['relance_retard', 'entretien_proche', 'relance_jour', 'sans_reponse', 'a_preparer'];
  return items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export function getRecentActivity(apps: Application[], limit: number = 10) {
  const activities: { app: Application; history: { id: string; date: string; action: string; detail: string } }[] = [];
  apps.forEach((app) => {
    app.historique.forEach((h) => {
      activities.push({ app, history: h });
    });
  });
  return activities
    .sort((a, b) => new Date(b.history.date).getTime() - new Date(a.history.date).getTime())
    .slice(0, limit);
}

/** Nombre de candidatures envoyées par semaine (semaines commençant le lundi). */
export function getWeeklyApplications(apps: Application[], weeks: number = 12) {
  const current = startOfWeek(new Date(), { weekStartsOn: 1 });
  const result: { week: string; label: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addWeeks(current, -i);
    const end = addWeeks(start, 1);
    const count = apps.filter((a) => {
      const d = parseLocalDate(a.dateCandidature);
      return !!d && d >= start && d < end;
    }).length;
    result.push({
      week: format(start, 'dd/MM'),
      label: `Semaine du ${format(start, 'd MMMM', { locale: fr })}`,
      count,
    });
  }
  return result;
}

/**
 * Extrait un montant comparable d'un salaire saisi librement.
 * « 42k€ » → 42000, « 40-45k€ » → 40000 (borne basse), « 1 200 €/mois » → 1200, « 38 » → 38000.
 */
export function parseSalary(s: string): number {
  if (!s) return 0;
  const m = s.replace(/ | /g, ' ').match(/(\d+(?:[ .]\d{3})*(?:,\d+)?)\s*(k)?/i);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/[ .]/g, '').replace(',', '.'));
  if (!Number.isFinite(num)) return 0;
  if (m[2]) return Math.round(num * 1000);
  return num < 150 ? Math.round(num * 1000) : Math.round(num);
}

export function getPlatformDistribution(apps: Application[]) {
  const dist: Partial<Record<ApplicationMethod, number>> = {};
  apps.forEach((a) => {
    dist[a.moyenCandidature] = (dist[a.moyenCandidature] || 0) + 1;
  });
  return (Object.entries(dist) as [ApplicationMethod, number][])
    .map(([key, value]) => ({ key, name: METHOD_LABELS[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
}

export function initials(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/** Ajoute https:// si l'utilisateur a saisi une URL sans protocole. */
export function normalizeUrl(v: string): string {
  return safeWebUrl(v);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n > 1 ? plural : singular}`;
}
