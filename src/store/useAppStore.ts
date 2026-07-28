import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  Application,
  Company,
  Notification,
  AppSettings,
  ContractCategory,
  HistoryEntry,
} from '@/types';

const defaultSettings: AppSettings = {
  themeColor: '#7c3aed',
  darkMode: true,
  defaultRelanceDelay: 7,
  defaultMaxRelances: 2,
  dateFormat: 'dd/MM/yyyy',
  notifications: true,
  autoSave: true,
};

interface AppStore extends AppState {
  // Category
  setActiveCategory: (category: ContractCategory) => void;
  // Applications
  addApplication: (app: Application) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  setSelectedApplication: (id: string | null) => void;
  addHistory: (appId: string, action: string, detail: string) => void;
  performRelance: (appId: string) => void;
  // Companies
  addCompany: (company: Company) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  // Notifications
  addNotification: (notif: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
  // Import/Export
  importData: (data: { applications: Application[]; companies: Company[] }) => void;
  exportData: () => { applications: Application[]; companies: Company[] };
  // Check relances
  checkRelances: () => Notification[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      applications: [],
      companies: [],
      notifications: [],
      settings: defaultSettings,
      activeCategory: 'stage',
      selectedApplicationId: null,

      setActiveCategory: (category) => set({ activeCategory: category }),

      addApplication: (app) =>
        set((s) => ({ applications: [...s.applications, app] })),

      updateApplication: (id, updates) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
          ),
        })),

      deleteApplication: (id) =>
        set((s) => ({
          applications: s.applications.filter((a) => a.id !== id),
          selectedApplicationId:
            s.selectedApplicationId === id ? null : s.selectedApplicationId,
        })),

      setSelectedApplication: (id) => set({ selectedApplicationId: id }),

      addHistory: (appId, action, detail) => {
        const entry: HistoryEntry = {
          id: generateId(),
          date: new Date().toISOString(),
          action,
          detail,
        };
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === appId
              ? { ...a, historique: [...a.historique, entry], updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      performRelance: (appId) => {
        const app = get().applications.find((a) => a.id === appId);
        if (!app) return;

        const newRelances = app.relancesEffectuees + 1;
        const maxReached =
          app.maxRelances !== 'unlimited' && newRelances >= app.maxRelances;

        let actualDelay: number;
        if (typeof app.relanceDelay === 'number') {
          actualDelay = app.relanceDelay;
        } else {
          actualDelay = app.customRelanceDays || 7;
        }

        const nextRelance = maxReached
          ? null
          : new Date(Date.now() + actualDelay * 24 * 60 * 60 * 1000).toISOString();

        get().updateApplication(appId, {
          relancesEffectuees: newRelances,
          prochaineRelance: nextRelance,
          dernierContact: new Date().toISOString(),
          status: maxReached ? app.status : 'relance_prevue',
        });
        get().addHistory(appId, 'Relance', `Relance #${newRelances} effectuée`);
      },

      addCompany: (company) =>
        set((s) => ({ companies: [...s.companies, company] })),

      updateCompany: (id, updates) =>
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteCompany: (id) =>
        set((s) => ({
          companies: s.companies.filter((c) => c.id !== id),
        })),

      addNotification: (notif) => {
        const n: Notification = {
          ...notif,
          id: generateId(),
          date: new Date().toISOString(),
          read: false,
        };
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 50) }));
      },

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      toggleDarkMode: () =>
        set((s) => ({ settings: { ...s.settings, darkMode: !s.settings.darkMode } })),

      importData: (data) =>
        set(() => ({
          applications: data.applications,
          companies: data.companies,
        })),

      exportData: () => ({
        applications: get().applications,
        companies: get().companies,
      }),

      checkRelances: () => {
        const now = new Date();
        const newNotifications: Notification[] = [];
        const apps = get().applications;

        apps.forEach((app) => {
          if (app.prochaineRelance && new Date(app.prochaineRelance) <= now && app.status === 'relance_prevue') {
            newNotifications.push({
              id: generateId(),
              type: 'relance',
              message: `Relance prévue pour ${app.poste} chez ${app.entreprise}`,
              applicationId: app.id,
              date: now.toISOString(),
              read: false,
            });
          }
          if (app.entrevueDates.length > 0) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            app.entrevueDates.forEach((d) => {
              const ed = new Date(d);
              if (ed.toDateString() === tomorrow.toDateString()) {
                newNotifications.push({
                  id: generateId(),
                  type: 'entretien',
                  message: `Entretien demain : ${app.poste} chez ${app.entreprise}`,
                  applicationId: app.id,
                  date: now.toISOString(),
                  read: false,
                });
              }
            });
          }
        });

        return newNotifications;
      },
    }),
    {
      name: 'progressmist-storage',
      version: 1,
    }
  )
);
