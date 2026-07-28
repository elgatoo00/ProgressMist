import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import KanbanView from '@/pages/KanbanView';
import TableView from '@/pages/TableView';
import CalendarView from '@/pages/CalendarView';
import Analytics from '@/pages/Analytics';
import Companies from '@/pages/Companies';
import SettingsPage from '@/pages/SettingsPage';
import ApplicationDetail from '@/pages/ApplicationDetail';
import NewApplication from '@/pages/NewApplication';
import AssistantMode from '@/pages/AssistantMode';
import NegotiationPage from '@/pages/NegotiationPage';
import NotificationsPanel from '@/components/layout/NotificationsPanel';

export default function App() {
  const settings = useAppStore((s) => s.settings);
  const checkRelances = useAppStore((s) => s.checkRelances);
  const addNotification = useAppStore((s) => s.addNotification);
  const applications = useAppStore((s) => s.applications);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notifsOpen, setNotifsOpen] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Set CSS variables for theme color
  useEffect(() => {
    const color = settings.themeColor;
    document.documentElement.style.setProperty('--color-primary', color);

    // Compute RGB from hex
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);

    // Compute lighter variant (~30% toward white)
    const lr = Math.min(255, r + Math.round((255 - r) * 0.3)).toString(16).padStart(2, '0');
    const lg = Math.min(255, g + Math.round((255 - g) * 0.3)).toString(16).padStart(2, '0');
    const lb = Math.min(255, b + Math.round((255 - b) * 0.3)).toString(16).padStart(2, '0');
    document.documentElement.style.setProperty('--color-primary-light', `#${lr}${lg}${lb}`);
  }, [settings.themeColor]);

  // Check for relances and inactivité periodically
  useEffect(() => {
    const check = () => {
      const notifs = checkRelances();
      notifs.forEach((n) => addNotification(n));

      // Check inactivity: no application in the last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentApps = applications.filter(
        (a) => new Date(a.dateCandidature).getTime() > sevenDaysAgo || new Date(a.updatedAt).getTime() > sevenDaysAgo
      );
      if (applications.length > 0 && recentApps.length === 0) {
        addNotification({
          type: 'inactivite',
          message: `Aucune candidature depuis plus de 7 jours — continuez vos efforts !`,
        });
      }
    };

    check(); // Check on mount
    const interval = setInterval(check, 60000); // Every minute
    return () => clearInterval(interval);
  }, [checkRelances, addNotification, applications]);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <Sidebar onClose={() => setMobileSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            onNotifsClick={() => setNotifsOpen(!notifsOpen)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto animate-fade-in">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/applications/:id" element={<ApplicationDetail />} />
                <Route path="/applications/new" element={<NewApplication />} />
                <Route path="/applications/new/assistant" element={<AssistantMode />} />
                <Route path="/kanban" element={<KanbanView />} />
                <Route path="/table" element={<TableView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/negociation" element={<NegotiationPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>

          {/* Footer */}
          <footer className="py-3 px-6 border-t border-white/10 text-center shrink-0">
            <p className="text-xs text-gray-500 mb-1 italic">
              Never lose track of your job applications
            </p>
            <p className="text-xs text-gray-500">
              ProgressMist · Créé par{' '}
              <a
                href="https://www.linkedin.com/in/meriem-m-a87393387"
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme hover:text-theme-light underline underline-offset-2 transition-colors"
              >
                Meriem M
              </a>
            </p>
          </footer>
        </div>

        {/* Notifications panel */}
        <NotificationsPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} />
      </div>
    </BrowserRouter>
  );
}
