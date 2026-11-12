import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Application } from '@/types';
import { generateId, toDateKey } from '@/utils/helpers';
import ApplicationForm, { type ApplicationFormValues } from '@/components/application/ApplicationForm';
import { PageHeader } from '@/components/ui/primitives';
import { toast } from '@/components/ui/Toast';

export default function NewApplication() {
  const navigate = useNavigate();
  const addApplication = useAppStore((s) => s.addApplication);
  const settings = useAppStore((s) => s.settings);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);

  const initial: Partial<Application> = {
    category: activeCategory,
    status: 'a_preparer',
    moyenCandidature: 'email',
    dateCandidature: toDateKey(new Date()),
    relanceDelay: settings.defaultRelanceDelay,
    maxRelances: settings.defaultMaxRelances,
    teletravail: false,
    remunere: false,
    cvEnvoye: false,
    lettreEnvoyee: false,
    portfolioEnvoye: false,
    githubEnvoye: false,
    contact: { name: '', role: '', email: '', phone: '', linkedin: '' },
    technologies: [],
    piecesJointes: [],
    entrevueDates: [],
    prochaineRelance: null,
  };

  const handleSubmit = (values: ApplicationFormValues) => {
    const now = new Date().toISOString();
    const app: Application = {
      ...values,
      id: generateId(),
      relancesEffectuees: 0,
      dernierContact: null,
      historique: [{ id: generateId(), date: now, action: 'Création', detail: 'Candidature créée' }],
      echanges: [],
      createdAt: now,
      updatedAt: now,
    };
    addApplication(app);
    setActiveCategory(app.category);
    toast.success('Candidature enregistrée', { description: `${app.poste} — ${app.entreprise}` });
    navigate(`/applications/${app.id}`, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="icon-btn mt-0.5" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Nouvelle candidature"
            description="Renseignez l’essentiel maintenant, vous pourrez compléter plus tard."
            actions={
              <button onClick={() => navigate('/applications/new/assistant')} className="btn-secondary btn-sm">
                <Bot className="w-4 h-4" /> Mode assistant
              </button>
            }
          />
        </div>
      </div>
      <ApplicationForm mode="create" initial={initial} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </div>
  );
}
