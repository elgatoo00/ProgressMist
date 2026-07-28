import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Application, ContractCategory } from '@/types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(date: string | null, fmt: string = 'dd/MM/yyyy'): string {
  if (!date) return '-';
  try {
    return format(parseISO(date), fmt, { locale: fr });
  } catch {
    return date;
  }
}

export function formatRelativeDate(date: string): string {
  if (!date) return '';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  return formatDate(date);
}

export function getStats(apps: Application[], category: ContractCategory) {
  const filtered = apps.filter((a) => a.category === category);
  const total = filtered.length;
  const enAttente = filtered.filter((a) => a.status === 'en_attente').length;
  const entretiens = filtered.filter((a) => a.status === 'entretien').length;
  const acceptees = filtered.filter((a) => a.status === 'acceptee').length;
  const refusees = filtered.filter((a) => a.status === 'refusee').length;
  const relances = filtered.reduce((s, a) => s + a.relancesEffectuees, 0);

  const withResponse = acceptees + refusees;
  const tauxReponse = total > 0 ? Math.round((withResponse / total) * 100) : 0;
  const tauxAcceptation = total > 0 ? Math.round((acceptees / total) * 100) : 0;

  // Average response time
  const replied = filtered.filter(
    (a) => a.status === 'acceptee' || a.status === 'refusee'
  );
  let avgTime = 0;
  if (replied.length > 0) {
    avgTime = Math.round(
      replied.reduce((s, a) => {
        const sent = new Date(a.dateCandidature).getTime();
        const reply = a.historique.find(
          (h) => h.action === 'Réponse' || h.action === 'Acceptation' || h.action === 'Refus'
        );
        const replyTime = reply ? new Date(reply.date).getTime() : new Date(a.updatedAt).getTime();
        return s + (replyTime - sent) / (1000 * 60 * 60 * 24);
      }, 0) / replied.length
    );
  }

  return {
    total,
    enAttente,
    entretiens,
    acceptees,
    refusees,
    relances,
    tauxReponse,
    tauxAcceptation,
    avgTime,
  };
}

export function getRelancesToday(apps: Application[]): Application[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return apps.filter((a) => {
    if (!a.prochaineRelance || a.status !== 'relance_prevue') return false;
    const relanceDate = new Date(a.prochaineRelance);
    return relanceDate >= today && relanceDate < tomorrow;
  });
}

export function getUpcomingInterviews(apps: Application[]): Application[] {
  const now = new Date();
  return apps.filter((a) => {
    if (a.status !== 'entretien') return false;
    return a.entrevueDates.some((d) => new Date(d) >= now);
  });
}

export function getRecentActivity(apps: Application[], limit: number = 10) {
  const activities: { app: Application; history: { date: string; action: string; detail: string } }[] = [];
  apps.forEach((app) => {
    app.historique.forEach((h) => {
      activities.push({ app, history: { date: h.date, action: h.action, detail: h.detail } });
    });
  });
  return activities
    .sort((a, b) => new Date(b.history.date).getTime() - new Date(a.history.date).getTime())
    .slice(0, limit);
}

export function getWeeklyApplications(apps: Application[], weeks: number = 12) {
  const now = new Date();
  const result: { week: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7 - start.getDay() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = apps.filter((a) => {
      const d = new Date(a.dateCandidature);
      return d >= start && d < end;
    }).length;
    result.push({ week: format(start, 'dd/MM'), count });
  }
  return result;
}

export function getDaysRemaining(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function parseSalary(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const num = parseInt(cleaned);
  return num < 150 ? num * 1000 : num;
}

export function getPlatformDistribution(apps: Application[]) {
  const dist: Record<string, number> = {};
  apps.forEach((a) => {
    dist[a.moyenCandidature] = (dist[a.moyenCandidature] || 0) + 1;
  });
  return Object.entries(dist).map(([key, value]) => ({ name: key, value }));
}
