import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types';
import type { ContractCategory } from '@/types';
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
  ChevronLeft,
  Sparkles,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const applications = useAppStore((s) => s.applications);

  const categories: ContractCategory[] = ['stage', 'alternance', 'cdi', 'cdd'];

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/applications', icon: FileText, label: 'Candidatures' },
    { to: '/kanban', icon: Columns3, label: 'Kanban' },
    { to: '/table', icon: Table2, label: 'Tableau' },
    { to: '/calendar', icon: Calendar, label: 'Calendrier' },
    { to: '/negociation', icon: Scale, label: 'Négociation' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/companies', icon: Building2, label: 'Entreprises' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="h-full glass border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-gradient-br flex items-center justify-center shadow-lg shadow-theme">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-gradient">ProgressMist</h1>
              <p className="text-xs text-gray-400">Suivi de candidatures</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden btn-ghost p-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category selectors */}
      <div className="px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
          Catégories
        </p>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => {
            const count = applications.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
                  ${activeCategory === cat
                    ? 'bg-theme-subtle-15 text-theme border border-theme-subtle-30 shadow-sm'
                    : 'hover:bg-white/5 text-gray-400 border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{CATEGORY_LABELS[cat]}</span>
                </div>
                <span className={`absolute top-1.5 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${activeCategory === cat
                    ? 'bg-theme-solid text-white'
                    : 'bg-white/10 text-gray-400'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Navigation
        </p>
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-theme-subtle-15 text-theme'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`
                }
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* New application button */}
      <div className="p-4 border-t border-white/10">
        <NavLink
          to="/applications/new"
          onClick={onClose}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle candidature
        </NavLink>
      </div>
    </div>
  );
}
