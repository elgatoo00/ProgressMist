import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_DOT_COLORS, STATUS_LABELS, CATEGORY_LABELS } from '@/types';
import { formatDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

type CalendarView = 'day' | 'week' | 'month';

export default function CalendarView() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const navigate = useNavigate();

  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const categoryApps = useMemo(
    () => applications.filter((a) => a.category === activeCategory),
    [applications, activeCategory]
  );

  // Get events for calendar
  const events = useMemo(() => {
    const evts: { date: string; app: typeof categoryApps[0]; type: 'candidature' | 'relance' | 'entretien' }[] = [];
    categoryApps.forEach((app) => {
      if (app.dateCandidature) evts.push({ date: app.dateCandidature, app, type: 'candidature' as const });
      if (app.prochaineRelance) evts.push({ date: app.prochaineRelance, app, type: 'relance' as const });
      app.entrevueDates.forEach((d) => evts.push({ date: d, app, type: 'entretien' as const }));
    });
    return evts;
  }, [categoryApps]);

  const typeColors = {
    candidature: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    relance: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    entretien: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const typeLabels = {
    candidature: '📨',
    relance: '🔄',
    entretien: '🎯',
  };

  // Month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() || 7) - 1; // Start on Monday
  const totalDays = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalDays / 7);
  const days = Array.from({ length: rows * 7 }, (_, i) => {
    const dayNum = i - startOffset + 1;
    return dayNum > 0 && dayNum <= lastDay.getDate() ? dayNum : null;
  });

  const today = new Date();

  const navigateMonth = (dir: number) => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date.startsWith(dateStr));
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">Calendrier</h1>
          <p className="text-sm text-gray-400">{CATEGORY_LABELS[activeCategory]}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="glass-card p-1 flex items-center">
            {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                  ${view === v ? 'bg-theme-solid text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/applications/new')} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />Nouvelle
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateMonth(-1)} className="btn-ghost p-2"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold font-display text-[var(--color-text)]">
          {new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => navigateMonth(1)} className="btn-ghost p-2"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Month grid */}
      <div className="glass-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isToday = day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayEvents = day ? getEventsForDay(day) : [];
            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r border-white/5 transition-colors
                  ${day ? 'hover:bg-white/5' : 'bg-white/[0.02]'}
                  ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {day && (
                  <>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                      ${isToday ? 'bg-theme-solid text-white font-bold' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt, j) => (
                        <button
                          key={j}
                          onClick={() => navigate(`/applications/${evt.app.id}`)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] border truncate ${typeColors[evt.type]}`}
                          title={`${evt.app.poste} - ${evt.app.entreprise}`}
                        >
                          {typeLabels[evt.type]} {evt.app.entreprise}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-gray-500 pl-1">+{dayEvents.length - 3} autres</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {Object.entries(typeColors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded border ${color}`} />
            <span className="text-xs text-gray-400 capitalize">{key === 'candidature' ? 'Candidature' : key === 'relance' ? 'Relance' : 'Entretien'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
