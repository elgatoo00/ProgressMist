import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  AppState,
  Application,
  ApplicationStatus,
  Company,
  Exchange,
  Notification,
  AppSettings,
  ContractCategory,
  HistoryEntry,
} from '@/types';
import { STATUS_LABELS } from '@/types';
import {
  addDays,
  generateId,
  isClosed,
  normalizeApplication,
  normalizeCompany,
  normalizeMaxRelances,
  normalizeRelanceDelay,
  parseLocalDate,
  relanceDelayDays,
  startOfToday,
  toDateKey,
  getRelancesDue,
} from '@/utils/helpers';

export const STORAGE_KEY = 'progressmist-storage';
/** Événement émis quand le navigateur refuse d'enregistrer (quota dépassé). */
export const STORAGE_ERROR_EVENT = 'progressmist:storage-error';

const defaultSettings: AppSettings = {
  themeColor: '#7c3aed',
  darkMode: true,
  defaultRelanceDelay: 7,
  defaultMaxRelances: 2,
  dateFormat: 'dd/MM/yyyy',
  notifications: true,
  autoSave: true,
};

/** Libellé d'historique associé à chaque changement de statut (utilisé pour le calcul du délai de réponse). */
const STATUS_HISTORY_ACTIONS: Partial<Record<ApplicationStatus, string>> = {
  acceptee: 'Acceptation',
  refusee: 'Refus',
  abandonnee: 'Abandon',
  entretien: 'Entretien programmé',
};

type NewApplication = Omit<Application, 'echanges'> & { echanges?: Exchange[] };

interface AppStore extends AppState {
  setActiveCategory: (category: ContractCategory) => void;
  // Applications
  addApplication: (app: NewApplication) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  restoreApplication: (app: Application, index?: number) => void;
  setSelectedApplication: (id: string | null) => void;
  setStatus: (id: string, status: ApplicationStatus, source?: string) => void;
  addHistory: (appId: string, action: string, detail: string) => void;
  performRelance: (appId: string) => void;
  addExchange: (appId: string, exchange: Omit<Exchange, 'id'>) => void;
  deleteExchange: (appId: string, exchangeId: string) => void;
  addInterviewDate: (appId: string, date: string) => void;
  removeInterviewDate: (appId: string, date: string) => void;
  // Companies
  addCompany: (company: Company) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  // Notifications
  addNotification: (notif: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  runNotificationChecks: () => number;
  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
  // Import/Export
  importData: (data: { applications: unknown[]; companies?: Company[] }) => number;
  exportData: () => { applications: Application[]; companies: Company[] };
  /** @deprecated remplacé par runNotificationChecks (conservé pour compatibilité) */
  checkRelances: () => Notification[];
}

/** Stockage localStorage qui signale les erreurs de quota au lieu d'échouer silencieusement. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: err }));
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

function historyEntry(action: string, detail: string): HistoryEntry {
  return { id: generateId(), date: new Date().toISOString(), action, detail };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const patchApp = (id: string, fn: (a: Application) => Application) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...fn(a), updatedAt: new Date().toISOString() } : a
          ),
        }));

      return {
        applications: [],
        companies: [],
        notifications: [],
        settings: defaultSettings,
        activeCategory: 'stage',
        selectedApplicationId: null,

        setActiveCategory: (category) => set({ activeCategory: category }),

        addApplication: (app) =>
          set((s) => ({ applications: [...s.applications, normalizeApplication(app)] })),

        updateApplication: (id, updates) => patchApp(id, (a) => ({ ...a, ...updates })),

        deleteApplication: (id) =>
          set((s) => ({
            applications: s.applications.filter((a) => a.id !== id),
            notifications: s.notifications.filter((n) => n.applicationId !== id),
            selectedApplicationId: s.selectedApplicationId === id ? null : s.selectedApplicationId,
          })),

        restoreApplication: (app, index) =>
          set((s) => {
            if (s.applications.some((a) => a.id === app.id)) return s;
            const list = [...s.applications];
            list.splice(index ?? list.length, 0, app);
            return { applications: list };
          }),

        setSelectedApplication: (id) => set({ selectedApplicationId: id }),

        setStatus: (id, status, source) => {
          const app = get().applications.find((a) => a.id === id);
          if (!app || app.status === status) return;
          const extra: Partial<Application> = {};
          const entries: HistoryEntry[] = [
            historyEntry(
              STATUS_HISTORY_ACTIONS[status] || 'Statut modifié',
              `Statut changé en "${STATUS_LABELS[status]}"${source ? ` (${source})` : ''}`
            ),
          ];
          // Une candidature envoyée sans relance programmée reçoit automatiquement une date de relance.
          if ((status === 'en_attente' || status === 'relance_prevue') && !app.prochaineRelance) {
            const sent = parseLocalDate(app.dateCandidature) ?? new Date();
            let next = addDays(sent, relanceDelayDays(app));
            if (next < startOfToday()) next = addDays(startOfToday(), status === 'relance_prevue' ? 0 : relanceDelayDays(app));
            extra.prochaineRelance = toDateKey(next);
            entries.push(historyEntry('Relance programmée', `Relance prévue le ${next.toLocaleDateString('fr-FR')}`));
          }
          patchApp(id, (a) => ({ ...a, ...extra, status, historique: [...a.historique, ...entries] }));
        },

        addHistory: (appId, action, detail) =>
          patchApp(appId, (a) => ({ ...a, historique: [...a.historique, historyEntry(action, detail)] })),

        performRelance: (appId) => {
          const app = get().applications.find((a) => a.id === appId);
          if (!app) return;
          const newRelances = app.relancesEffectuees + 1;
          const maxReached = app.maxRelances !== 'unlimited' && newRelances >= app.maxRelances;
          const nextRelance = maxReached ? null : toDateKey(addDays(new Date(), relanceDelayDays(app)));
          const nowIso = new Date().toISOString();
          patchApp(appId, (a) => ({
            ...a,
            relancesEffectuees: newRelances,
            prochaineRelance: nextRelance,
            dernierContact: nowIso,
            status: maxReached || isClosed(a) || a.status === 'entretien' ? a.status : 'relance_prevue',
            echanges: [
              ...a.echanges,
              { id: generateId(), date: toDateKey(new Date()), type: 'email', direction: 'sortant', resume: `Relance n°${newRelances}` },
            ],
            historique: [
              ...a.historique,
              historyEntry(
                'Relance',
                `Relance #${newRelances} effectuée${nextRelance ? ` · prochaine le ${parseLocalDate(nextRelance)!.toLocaleDateString('fr-FR')}` : ' · nombre maximum de relances atteint'}`
              ),
            ],
          }));
          // La notification de relance correspondante n'a plus lieu d'être.
          set((s) => ({
            notifications: s.notifications.map((n) =>
              n.applicationId === appId && n.type === 'relance' ? { ...n, read: true } : n
            ),
          }));
        },

        addExchange: (appId, exchange) =>
          patchApp(appId, (a) => ({
            ...a,
            dernierContact: new Date().toISOString(),
            echanges: [...a.echanges, { ...exchange, id: generateId() }],
            historique: [
              ...a.historique,
              historyEntry(
                exchange.direction === 'entrant' ? 'Réponse' : 'Échange',
                `${exchange.direction === 'entrant' ? 'Reçu' : 'Envoyé'} : ${exchange.resume.slice(0, 80)}`
              ),
            ],
          })),

        deleteExchange: (appId, exchangeId) =>
          patchApp(appId, (a) => ({ ...a, echanges: a.echanges.filter((e) => e.id !== exchangeId) })),

        addInterviewDate: (appId, date) =>
          patchApp(appId, (a) => ({
            ...a,
            entrevueDates: [...a.entrevueDates, date].sort(),
            historique: [...a.historique, historyEntry('Entretien programmé', `Entretien ajouté le ${new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: date.includes('T') ? 'short' : undefined })}`)],
          })),

        removeInterviewDate: (appId, date) =>
          patchApp(appId, (a) => ({ ...a, entrevueDates: a.entrevueDates.filter((d) => d !== date) })),

        addCompany: (company) => set((s) => ({ companies: [...s.companies, company] })),

        updateCompany: (id, updates) =>
          set((s) => ({
            companies: s.companies.map((c) =>
              c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
            ),
          })),

        deleteCompany: (id) => set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),

        addNotification: (notif) => {
          const n: Notification = { ...notif, id: generateId(), date: new Date().toISOString(), read: false };
          set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) }));
        },

        markNotificationRead: (id) =>
          set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

        markAllNotificationsRead: () =>
          set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        clearNotifications: () => set({ notifications: [] }),

        /**
         * Génère les notifications du jour (relances dues, entretiens du lendemain, inactivité).
         * Chaque notification n'est créée qu'une fois par jour et par candidature.
         * Retourne le nombre de nouvelles notifications.
         */
        runNotificationChecks: () => {
          const { settings, applications, notifications } = get();
          if (!settings.notifications) return 0;
          const today = toDateKey(new Date());
          const exists = (type: Notification['type'], appId?: string) =>
            notifications.some(
              (n) => n.type === type && n.applicationId === appId && toDateKey(new Date(n.date)) === today
            );
          const fresh = get().checkRelances().filter((n) => !exists(n.type, n.applicationId));

          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const active = applications.some(
            (a) => (parseLocalDate(a.dateCandidature)?.getTime() ?? 0) > sevenDaysAgo || new Date(a.updatedAt).getTime() > sevenDaysAgo
          );
          if (applications.length > 0 && !active && !exists('inactivite')) {
            fresh.push({
              id: generateId(),
              type: 'inactivite',
              message: 'Aucune candidature depuis plus de 7 jours — continuez vos efforts !',
              date: new Date().toISOString(),
              read: false,
            });
          }
          if (fresh.length > 0) {
            set((s) => ({ notifications: [...fresh, ...s.notifications].slice(0, 50) }));
          }
          return fresh.length;
        },

        updateSettings: (updates) =>
          set((s) => {
            const next = { ...s.settings, ...updates };
            next.defaultRelanceDelay = normalizeRelanceDelay(next.defaultRelanceDelay);
            next.defaultMaxRelances = normalizeMaxRelances(next.defaultMaxRelances);
            return { settings: next };
          }),

        toggleDarkMode: () => set((s) => ({ settings: { ...s.settings, darkMode: !s.settings.darkMode } })),

        importData: (data) => {
          const applications = (data.applications || []).slice(0, 5000).map((a) => normalizeApplication(a as Partial<Application>));
          const companies = (Array.isArray(data.companies) ? data.companies.slice(0, 2000) : [])
            .map(normalizeCompany)
            .filter((c): c is Company => !!c);
          set(() => ({ applications, companies }));
          return applications.length;
        },

        exportData: () => ({ applications: get().applications, companies: get().companies }),

        checkRelances: () => {
          const now = new Date();
          const out: Notification[] = [];
          const apps = get().applications;
          getRelancesDue(apps, now).forEach((app) => {
            out.push({
              id: generateId(),
              type: 'relance',
              message: `Relance à effectuer : ${app.poste} chez ${app.entreprise}`,
              applicationId: app.id,
              date: now.toISOString(),
              read: false,
            });
          });
          const tomorrow = toDateKey(addDays(now, 1));
          apps.forEach((app) => {
            if (app.entrevueDates.some((d) => { const p = parseLocalDate(d); return !!p && toDateKey(p) === tomorrow; })) {
              out.push({
                id: generateId(),
                type: 'entretien',
                message: `Entretien demain : ${app.poste} chez ${app.entreprise}`,
                applicationId: app.id,
                date: now.toISOString(),
                read: false,
              });
            }
          });
          return out;
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({
        applications: s.applications,
        companies: s.companies,
        notifications: s.notifications,
        settings: s.settings,
        activeCategory: s.activeCategory,
      }),
      migrate: (persisted) => {
        const s = (persisted || {}) as Partial<AppState>;
        return {
          ...s,
          applications: (s.applications || []).map((a) => normalizeApplication(a)),
          companies: (s.companies || []).map(normalizeCompany).filter((c): c is Company => !!c),
          settings: {
            ...defaultSettings,
            ...(s.settings || {}),
            defaultRelanceDelay: normalizeRelanceDelay(s.settings?.defaultRelanceDelay),
            defaultMaxRelances: normalizeMaxRelances(s.settings?.defaultMaxRelances),
          },
        } as AppStore;
      },
    }
  )
);
