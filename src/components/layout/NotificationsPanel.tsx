import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { X, Bell, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatRelativeDate } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const iconMap = {
  relance: RefreshCw,
  entretien: Calendar,
  reponse: Bell,
  oublie: AlertTriangle,
  inactivite: AlertTriangle,
};

const colorMap = {
  relance: 'text-purple-400',
  entretien: 'text-orange-400',
  reponse: 'text-green-400',
  oublie: 'text-red-400',
  inactivite: 'text-yellow-400',
};

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const navigate = useNavigate();

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-80 lg:w-96 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="h-full glass border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-theme" />
            <h2 className="font-semibold text-[var(--color-text)]">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Tout effacer
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Bell className="w-10 h-10" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.applicationId) {
                        navigate(`/applications/${n.applicationId}`);
                        onClose();
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200
                      ${n.read
                        ? 'opacity-60 hover:opacity-80'
                        : 'bg-theme-subtle hover:bg-theme-subtle-15'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${colorMap[n.type]}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--color-text)] line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.date)}</p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-theme-light mt-1.5 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
