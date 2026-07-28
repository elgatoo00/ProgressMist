import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DateFormat, RelanceDelay, MaxRelances } from '@/types';
import { RELANCE_LABELS } from '@/types';
import {
  Settings, Palette, Moon, Sun, Bell, Clock, Calendar, Download, Upload, Database, Trash2, Check, BookOpen,
} from 'lucide-react';

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const applications = useAppStore((s) => s.applications);
  const companies = useAppStore((s) => s.companies);
  const importData = useAppStore((s) => s.importData);
  const exportData = useAppStore((s) => s.exportData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState(false);

  const handleExport = (format: 'csv' | 'json') => {
    const data = exportData();
    let content: string;
    let filename: string;
    let mime: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = 'progressmist-export.json';
      mime = 'application/json';
    } else {
      // CSV
      const headers = ['entreprise','poste','lieu','status','dateCandidature','moyenCandidature','contact','notes'];
      const rows = data.applications.map((a) =>
        [a.entreprise, a.poste, a.lieu, a.status, a.dateCandidature, a.moyenCandidature, a.contact.name, a.notes]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      filename = 'progressmist-export.csv';
      mime = 'text/csv';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (data.applications && data.companies) {
          importData(data);
          alert('Import réussi !');
        } else if (Array.isArray(data)) {
          importData({ applications: data, companies: [] });
          alert('Import réussi !');
        } else {
          alert('Format JSON non reconnu. Le fichier doit contenir des candidatures exportées depuis ProgressMist.');
        }
      } catch {
        alert('Fichier invalide. Utilisez un fichier JSON exporté depuis ProgressMist.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('ATTENTION : Cela supprimera TOUTES vos données. Êtes-vous sûr ?')) {
      localStorage.removeItem('progressmist-storage');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="section-title">Paramètres</h1>

      {/* Appearance */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-theme" />Apparence
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Mode sombre</p>
              <p className="text-xs text-gray-400">Basculer entre le mode clair et sombre</p>
            </div>
            <button onClick={toggleDarkMode} className={`relative w-12 h-7 rounded-full transition-colors ${settings.darkMode ? 'bg-theme-solid' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform flex items-center justify-center ${settings.darkMode ? 'translate-x-5' : 'translate-x-0.5'}`}>
                {settings.darkMode ? <Moon className="w-3.5 h-3.5 text-[var(--color-primary)]" /> : <Sun className="w-3.5 h-3.5 text-yellow-500" />}
              </span>
            </button>
          </div>

          <div>
            <p className="font-medium text-sm mb-2">Couleur du thème</p>
            <div className="flex items-center gap-2">
              {['#7c3aed', '#2563eb', '#db2777', '#16a34a', '#ea580c', '#0891b2'].map((color) => (
                <button key={color} onClick={() => updateSettings({ themeColor: color })}
                  className={`w-8 h-8 rounded-full transition-all ${settings.themeColor === color ? 'ring-2 ring-offset-2 ring-offset-[var(--color-bg)] ring-white scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relance defaults */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-theme" />Relances par défaut
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Délai avant relance</label>
            <select value={settings.defaultRelanceDelay} onChange={(e) => updateSettings({ defaultRelanceDelay: e.target.value as RelanceDelay })}
              className="glass-input w-full text-sm py-2">
              {Object.entries(RELANCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Nombre maximum de relances</label>
            <select value={settings.defaultMaxRelances} onChange={(e) => updateSettings({ defaultMaxRelances: e.target.value as MaxRelances })}
              className="glass-input w-full text-sm py-2">
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value="unlimited">Illimité</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dates & Notifications */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-theme" />Dates & Notifications
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Format des dates</label>
            <select value={settings.dateFormat} onChange={(e) => updateSettings({ dateFormat: e.target.value as DateFormat })}
              className="glass-input w-full text-sm py-2 max-w-xs">
              <option value="dd/MM/yyyy">JJ/MM/AAAA</option>
              <option value="MM/dd/yyyy">MM/JJ/AAAA</option>
              <option value="yyyy-MM-dd">AAAA-MM-JJ</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notifications</p>
              <p className="text-xs text-gray-400">Activer les notifications dans l'application</p>
            </div>
            <button onClick={() => updateSettings({ notifications: !settings.notifications })}
              className={`relative w-12 h-7 rounded-full transition-colors ${settings.notifications ? 'bg-theme-solid' : 'bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sauvegarde automatique</p>
              <p className="text-xs text-gray-400">Sauvegarder automatiquement dans le navigateur</p>
            </div>
            <button onClick={() => updateSettings({ autoSave: !settings.autoSave })}
              className={`relative w-12 h-7 rounded-full transition-colors ${settings.autoSave ? 'bg-theme-solid' : 'bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Import / Export */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-theme" />Import / Export
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleExport('json')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />Exporter JSON
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />Exporter CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" />Importer JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Guide d'utilisation */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-theme" />Guide d'utilisation
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Consultez le guide complet pour apprendre à utiliser toutes les fonctionnalités de ProgressMist.
        </p>
        <a
          href="/guide-utilisateur.html"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <BookOpen className="w-4 h-4" />
          Ouvrir le guide d'utilisation
        </a>
      </div>

      {/* Danger zone */}
      <div className="glass-card p-6 border-red-500/20">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
          <Trash2 className="w-5 h-5" />Zone dangereuse
        </h2>
        <p className="text-sm text-gray-400 mb-4">Supprimer toutes les données de l'application. Cette action est irréversible.</p>
        <button onClick={handleReset} className="btn-secondary text-red-400 border-red-500/20 hover:bg-red-500/10 flex items-center gap-2 text-sm">
          <Trash2 className="w-4 h-4" />Réinitialiser toutes les données
        </button>
      </div>
    </div>
  );
}
