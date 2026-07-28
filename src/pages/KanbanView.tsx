import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ApplicationStatus } from '@/types';
import { STATUS_LABELS, STATUS_DOT_COLORS, CATEGORY_LABELS } from '@/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, MapPin, Calendar, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';

const KANBAN_COLS: { id: ApplicationStatus | 'envoyee'; label: string; color: string }[] = [
  { id: 'a_preparer', label: 'À préparer', color: 'bg-blue-500' },
  { id: 'envoyee', label: 'Envoyée', color: 'bg-yellow-500' },
  { id: 'relance_prevue', label: 'Relance', color: 'bg-purple-500' },
  { id: 'entretien', label: 'Entretien', color: 'bg-orange-500' },
  { id: 'acceptee', label: 'Acceptée', color: 'bg-green-500' },
  { id: 'refusee', label: 'Refusée', color: 'bg-red-500' },
  { id: 'abandonnee', label: 'Abandonnée', color: 'bg-gray-500' },
];

// Map kanban columns to actual app statuses
const COL_TO_STATUS: Record<string, ApplicationStatus> = {
  envoyee: 'en_attente',
  a_preparer: 'a_preparer',
  relance_prevue: 'relance_prevue',
  entretien: 'entretien',
  acceptee: 'acceptee',
  refusee: 'refusee',
  abandonnee: 'abandonnee',
};

export default function KanbanView() {
  const applications = useAppStore((s) => s.applications);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const updateApplication = useAppStore((s) => s.updateApplication);
  const addHistory = useAppStore((s) => s.addHistory);
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'acceptee' | 'refusee'>('acceptee');

  const categoryApps = applications.filter((a) => a.category === activeCategory);

  const getAppsForCol = (colId: string) => {
    const status = COL_TO_STATUS[colId] || colId;
    return categoryApps.filter((a) => a.status === status);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.droppableId === result.source.droppableId) return;
    const appId = result.draggableId;
    const newColId = result.destination.droppableId;
    const newStatus = (COL_TO_STATUS[newColId] || newColId) as ApplicationStatus;
    updateApplication(appId, { status: newStatus });
    addHistory(appId, 'Statut modifié', `Statut changé en "${STATUS_LABELS[newStatus]}" (Kanban)`);
    if (newStatus === 'acceptee' || newStatus === 'refusee') {
      setCelebrationType(newStatus);
      setShowCelebration(true);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Vue Kanban</h1>
          <p className="text-sm text-gray-400">{CATEGORY_LABELS[activeCategory]} · Glissez-déposez pour changer de colonne</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 250px)' }}>
          {KANBAN_COLS.map((col) => {
            const apps = getAppsForCol(col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-72">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-2">
                  <span className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">{col.label}</h3>
                  <span className="ml-auto text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">{apps.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] rounded-xl transition-colors p-1
                        ${snapshot.isDraggingOver ? 'bg-theme-subtle' : ''}`}
                    >
                      {apps.map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`glass-card p-4 cursor-pointer transition-all
                                ${snapshot.isDragging ? 'shadow-glow rotate-1' : ''}`}
                              onClick={() => navigate(`/applications/${app.id}`)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium text-sm text-[var(--color-text)] truncate">{app.poste}</h4>
                                  <p className="text-xs text-gray-400 truncate">{app.entreprise}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                {app.lieu && (
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.lieu}</span>
                                )}
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(app.dateCandidature, 'dd/MM')}</span>
                              </div>
                              {app.relancesEffectuees > 0 && (
                                <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
                                  <RefreshCw className="w-3 h-3" />{app.relancesEffectuees}
                                </span>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {apps.length === 0 && (
                        <div className="text-center py-8 text-xs text-gray-500">
                          Glissez une carte ici
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Celebration Overlay */}
      <CelebrationOverlay show={showCelebration} type={celebrationType} onComplete={() => setShowCelebration(false)} />
    </div>
  );
}
