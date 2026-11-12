import { lazy, Suspense, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore, STORAGE_ERROR_EVENT } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import NotificationsPanel from '@/components/layout/NotificationsPanel';
import CommandPalette from '@/components/layout/CommandPalette';
import ShortcutsHelp from '@/components/layout/ShortcutsHelp';
import { Toaster, toast } from '@/components/ui/Toast';
import { ConfirmDialogHost } from '@/components/ui/ConfirmDialog';
import { PageSkeleton } from '@/components/ui/primitives';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getRelancesDue } from '@/utils/helpers';

// Pages chargées à la demande : le bundle initial reste léger (Recharts, DnD…)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Applications = lazy(() => import('@/pages/Applications'));
const KanbanView = lazy(() => import('@/pages/KanbanView'));
const TableView = lazy(() => import('@/pages/TableView'));
const CalendarView = lazy(() => import('@/pages/CalendarView'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Companies = lazy(() => import('@/pages/Companies'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ApplicationDetail = lazy(() => import('@/pages/ApplicationDetail'));
const NewApplication = lazy(() => import('@/pages/NewApplication'));
const AssistantMode = lazy(() => import('@/pages/AssistantMode'));
const NegotiationPage = lazy(() => import('@/pages/NegotiationPage'));

function hexToRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function useThemeSync() {
  const darkMode = useAppStore((s) => s.settings.darkMode);
  const themeColor = useAppStore((s) => s.settings.themeColor);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    const [r, g, b] = hexToRgb(themeColor);
    const root = document.documentElement.style;
    root.setProperty('--color-primary', themeColor);
    root.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
    const light = [r, g, b].map((c) => Math.min(255, c + Math.round((255 - c) * 0.3)).toString(16).padStart(2, '0'));
    root.setProperty('--color-primary-light', `#${light.join('')}`);
  }, [themeColor]);
}

function useNotificationChecks() {
  const runNotificationChecks = useAppStore((s) => s.runNotificationChecks);
  const applications = useAppStore((s) => s.applications);
  const notificationsEnabled = useAppStore((s) => s.settings.notifications);
  const greeted = useRef(false);

  useEffect(() => {
    runNotificationChecks();
    const interval = setInterval(runNotificationChecks, 60000);
    return () => clearInterval(interval);
  }, [runNotificationChecks, applications]);

  // Rappel unique à l'ouverture si des relances sont dues
  useEffect(() => {
    if (greeted.current || !notificationsEnabled) return;
    greeted.current = true;
    // Un seul rappel par session de navigation (pas à chaque rechargement)
    try {
      if (sessionStorage.getItem('progressmist:greeted')) return;
      sessionStorage.setItem('progressmist:greeted', '1');
    } catch {
      /* stockage indisponible : on affiche le rappel */
    }
    const due = getRelancesDue(applications).length;
    if (due > 0) {
      toast.warning(`${due} relance${due > 1 ? 's' : ''} à effectuer`, {
        description: 'Toutes catégories confondues. Retrouvez-les dans « Actions à effectuer » sur le dashboard.',
        duration: 6000,
      });
    }
  }, [applications, notificationsEnabled]);

  useEffect(() => {
    const onError = () =>
      toast.error('Enregistrement impossible', {
        description: 'Le stockage du navigateur est plein. Supprimez des pièces jointes volumineuses ou exportez vos données.',
        duration: 8000,
      });
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);
}

function AppShell() {
  const location = useLocation();
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const mainRef = useRef<HTMLElement>(null);

  useKeyboardShortcuts();
  useNotificationChecks();

  // Remonte en haut de page et ferme le menu mobile à chaque navigation
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileNavOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--color-bg)]">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${
          mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[264px] shrink-0 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <Sidebar onClose={() => setMobileNavOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1440px] mx-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <div key={location.pathname} className="animate-page-in">
              <Suspense fallback={<PageSkeleton />}>
                <Routes location={location}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/new" element={<NewApplication />} />
                  <Route path="/applications/new/assistant" element={<AssistantMode />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/kanban" element={<KanbanView />} />
                  <Route path="/table" element={<TableView />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/negociation" element={<NegotiationPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </div>
          </div>

          <footer className="py-5 px-6 border-t border-[var(--color-border)] text-center mt-6">
            <p className="text-xs text-muted">
              <span className="italic">Never lose track of your job applications</span> · ProgressMist · Créé par{' '}
              <a
                href="https://www.linkedin.com/in/meriem-m-a87393387"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme hover:underline underline-offset-2"
              >
                Meriem M
              </a>
            </p>
          </footer>
        </main>
      </div>

      <NotificationsPanel />
      <CommandPalette />
      <ShortcutsHelp />
      <ConfirmDialogHost />
      <Toaster />
    </div>
  );
}

export default function App() {
  useThemeSync();
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
