export type ContractCategory = 'stage' | 'alternance' | 'cdi' | 'cdd';

export type ApplicationStatus =
  | 'a_preparer'
  | 'en_attente'
  | 'relance_prevue'
  | 'entretien'
  | 'acceptee'
  | 'refusee'
  | 'abandonnee';

export type ApplicationMethod =
  | 'linkedin'
  | 'indeed'
  | 'wttj'
  | 'france_travail'
  | 'spontanee'
  | 'email'
  | 'autre';

export type RelanceDelay = 3 | 5 | 7 | 10 | 14 | 'custom';
export type MaxRelances = 1 | 2 | 3 | 'unlimited';

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
  linkedin: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  type: 'cv' | 'lettre' | 'portfolio' | 'certificat' | 'autre';
  url: string;
  uploadedAt: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  detail: string;
}

export interface Application {
  id: string;
  category: ContractCategory;
  entreprise: string;
  entrepriseLogo: string;
  poste: string;
  lieu: string;
  teletravail: boolean;
  remunere: boolean;
  salaire: string;
  lienOffre: string;
  lienLinkedIn: string;
  siteEntreprise: string;
  datePublication: string;
  dateCandidature: string;
  moyenCandidature: ApplicationMethod;
  contact: Contact;
  cvEnvoye: boolean;
  lettreEnvoyee: boolean;
  portfolioEnvoye: boolean;
  githubEnvoye: boolean;
  notes: string;
  dateDebut?: string;
  status: ApplicationStatus;
  relanceDelay: RelanceDelay;
  customRelanceDays?: number;
  maxRelances: MaxRelances;
  relancesEffectuees: number;
  prochaineRelance: string | null;
  dernierContact: string | null;
  entrevueDates: string[];
  piecesJointes: AttachedFile[];
  historique: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
  technologies: string[];
}

export interface Company {
  id: string;
  nom: string;
  logo: string;
  secteur: string;
  taille: string;
  adresse: string;
  siteWeb: string;
  contactsRH: Contact[];
  recruteurs: Contact[];
  notes: string;
  candidatureIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'relance' | 'entretien' | 'reponse' | 'oublie' | 'inactivite';
  message: string;
  applicationId?: string;
  date: string;
  read: boolean;
}

export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';

export interface AppSettings {
  themeColor: string;
  darkMode: boolean;
  defaultRelanceDelay: RelanceDelay;
  defaultMaxRelances: MaxRelances;
  dateFormat: DateFormat;
  notifications: boolean;
  autoSave: boolean;
}

export interface AppState {
  applications: Application[];
  companies: Company[];
  notifications: Notification[];
  settings: AppSettings;
  activeCategory: ContractCategory;
  selectedApplicationId: string | null;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  a_preparer: 'À préparer',
  en_attente: 'En attente',
  relance_prevue: 'Relance prévue',
  entretien: 'Entretien',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  abandonnee: 'Abandonnée',
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  a_preparer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  en_attente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  relance_prevue: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  entretien: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  acceptee: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700',
  refusee: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
  abandonnee: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-400 dark:border-gray-600',
};

export const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  a_preparer: 'bg-blue-500',
  en_attente: 'bg-yellow-500',
  relance_prevue: 'bg-purple-500',
  entretien: 'bg-orange-500',
  acceptee: 'bg-green-500',
  refusee: 'bg-red-500',
  abandonnee: 'bg-gray-500',
};

export const METHOD_LABELS: Record<ApplicationMethod, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  wttj: 'Welcome To The Jungle',
  france_travail: 'France Travail',
  spontanee: 'Candidature spontanée',
  email: 'Email',
  autre: 'Autre',
};

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  stage: 'Stage',
  alternance: 'Alternance',
  cdi: 'CDI',
  cdd: 'CDD',
};

export const CATEGORY_ICONS: Record<ContractCategory, string> = {
  stage: '🎓',
  alternance: '🔄',
  cdi: '💼',
  cdd: '📋',
};

export const RELANCE_LABELS: Record<RelanceDelay, string> = {
  3: '3 jours',
  5: '5 jours',
  7: '7 jours',
  10: '10 jours',
  14: '14 jours',
  custom: 'Personnalisé',
};
