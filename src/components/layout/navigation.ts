import {
  LayoutDashboard,
  FileText,
  Columns3,
  Table2,
  Calendar,
  BarChart3,
  Building2,
  Scale,
  Settings,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface NavItem {
  to: string;
  icon: ElementType;
  label: string;
  /** Touche utilisée après « g » pour la navigation clavier */
  key: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Suivi',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', key: 'd' },
      { to: '/applications', icon: FileText, label: 'Candidatures', key: 'c' },
      { to: '/kanban', icon: Columns3, label: 'Kanban', key: 'k' },
      { to: '/table', icon: Table2, label: 'Tableau', key: 't' },
      { to: '/calendar', icon: Calendar, label: 'Calendrier', key: 'a' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics', key: 's' },
      { to: '/negociation', icon: Scale, label: 'Négociation', key: 'n' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/companies', icon: Building2, label: 'Entreprises', key: 'e' },
      { to: '/settings', icon: Settings, label: 'Paramètres', key: 'p' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function getPageTitle(pathname: string): string {
  if (pathname === '/applications/new') return 'Nouvelle candidature';
  if (pathname === '/applications/new/assistant') return 'Assistant';
  if (/^\/applications\/[^/]+$/.test(pathname)) return 'Candidature';
  return NAV_ITEMS.find((i) => pathname.startsWith(i.to))?.label ?? 'ProgressMist';
}
