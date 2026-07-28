import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { Application, ContractCategory, ApplicationMethod, ApplicationStatus, RelanceDelay, MaxRelances } from '@/types';
import { CATEGORY_LABELS, METHOD_LABELS, RELANCE_LABELS, STATUS_LABELS } from '@/types';
import { generateId } from '@/utils/helpers';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';

interface Step {
  id: string;
  question: string;
  field: string;
  type: 'text' | 'date' | 'select' | 'textarea' | 'number' | 'url';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const steps: Step[] = [
  { id: 'categorie', question: 'Quel type de contrat recherchez-vous ?', field: 'category', type: 'select', options: [
    { value: 'stage', label: 'Stage' },
    { value: 'alternance', label: 'Alternance' },
    { value: 'cdi', label: 'CDI' },
    { value: 'cdd', label: 'CDD' },
  ]},
  { id: 'entreprise', question: 'Quel est le nom de l\'entreprise ?', field: 'entreprise', type: 'text', placeholder: 'Ex: OpenClassrooms' },
  { id: 'poste', question: 'Quel est l\'intitulé du poste ?', field: 'poste', type: 'text', placeholder: 'Ex: Développeur Full-Stack' },
  { id: 'lieu', question: 'Où se situe le poste ?', field: 'lieu', type: 'text', placeholder: 'Ex: Paris (laisser vide si inconnu)' },
  { id: 'dateCandidature', question: 'Quand avez-vous postulé ?', field: 'dateCandidature', type: 'date' },
  { id: 'moyen', question: 'Comment avez-vous postulé ?', field: 'moyenCandidature', type: 'select', options: [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'indeed', label: 'Indeed' },
    { value: 'wttj', label: 'Welcome To The Jungle' },
    { value: 'france_travail', label: 'France Travail' },
    { value: 'spontanee', label: 'Candidature spontanée' },
    { value: 'email', label: 'Email' },
    { value: 'autre', label: 'Autre' },
  ]},
  { id: 'lien', question: 'Avez-vous le lien de l\'offre ?', field: 'lienOffre', type: 'url', placeholder: 'https://... (laisser vide si aucun)' },
  { id: 'contactName', question: 'Connaissez-vous le nom d\'une personne à contacter ?', field: 'contactName', type: 'text', placeholder: 'Ex: Marie Dupont (laisser vide si aucun)' },
  { id: 'contactEmail', question: 'Avez-vous son email ?', field: 'contactEmail', type: 'text', placeholder: 'Ex: marie@entreprise.com' },
  { id: 'contactPhone', question: 'Avez-vous son téléphone ?', field: 'contactPhone', type: 'text', placeholder: 'Ex: 06 12 34 56 78' },
  { id: 'cv', question: 'Avez-vous envoyé votre CV ?', field: 'cvEnvoye', type: 'select', options: [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' },
  ]},
  { id: 'lettre', question: 'Avez-vous envoyé une lettre de motivation ?', field: 'lettreEnvoyee', type: 'select', options: [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' },
  ]},
  { id: 'remunere', question: 'Le poste est-il rémunéré ? 💰', field: 'remunere', type: 'select', options: [
    { value: 'true', label: 'Oui, c\'est rémunéré' },
    { value: 'false', label: 'Non, pas de salaire' },
  ]},
  { id: 'salaire', question: 'Quel est le montant de la rémunération ?', field: 'salaire', type: 'text', placeholder: 'Ex: 40-45k€ ou 1200€/mois' },
  { id: 'relance', question: 'Souhaitez-vous programmer une relance automatique ?', field: 'relanceDelay', type: 'select', options: [
    { value: 'false', label: 'Non merci' },
    { value: '3', label: 'Oui, dans 3 jours' },
    { value: '5', label: 'Oui, dans 5 jours' },
    { value: '7', label: 'Oui, dans 7 jours' },
    { value: '10', label: 'Oui, dans 10 jours' },
    { value: '14', label: 'Oui, dans 14 jours' },
    { value: 'custom', label: 'Oui, délai personnalisé' },
  ]},
  { id: 'customRelanceDays', question: 'Dans combien de jours voulez-vous relancer ?', field: 'customRelanceDays', type: 'number', placeholder: 'Ex: 21' },
  { id: 'maxRelances', question: 'Combien de relances maximum ?', field: 'maxRelances', type: 'select', options: [
    { value: '1', label: '1 seule' },
    { value: '2', label: '2 relances' },
    { value: '3', label: '3 relances' },
    { value: 'unlimited', label: 'Illimité' },
  ]},
  { id: 'notes', question: 'Une note personnelle à ajouter ?', field: 'notes', type: 'textarea', placeholder: 'Vos remarques, contexte... (optionnel)' },
];

export default function AssistantMode() {
  const navigate = useNavigate();
  const addApplication = useAppStore((s) => s.addApplication);
  const settings = useAppStore((s) => s.settings);
  const activeCategory = useAppStore((s) => s.activeCategory);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const currentValue = answers[step.field] || '';

  // Filter steps based on conditions
  const visibleSteps = steps.filter((s) => {
    if (s.id === 'customRelanceDays') {
      return answers['relanceDelay'] === 'custom';
    }
    if (s.id === 'maxRelances') {
      return answers['relanceDelay'] && answers['relanceDelay'] !== 'false';
    }
    if (s.id === 'salaire') {
      return answers['remunere'] === 'true';
    }
    return true;
  });

  const goNext = () => {
    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      const nextVisible = visibleSteps.indexOf(steps[currentStep]) + 1;
      if (nextVisible < visibleSteps.length) {
        const nextStep = steps.indexOf(visibleSteps[nextVisible]);
        setCurrentStep(nextStep);
      } else {
        handleFinish();
      }
      setAnimating(false);
    }, 300);
  };

  const goBack = () => {
    if (currentStep === 0) {
      navigate(-1);
      return;
    }
    setDirection('backward');
    setAnimating(true);
    setTimeout(() => {
      const prevVisible = visibleSteps.indexOf(steps[currentStep]) - 1;
      if (prevVisible >= 0) {
        setCurrentStep(steps.indexOf(visibleSteps[prevVisible]));
      }
      setAnimating(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step.type !== 'textarea') {
      e.preventDefault();
      if (currentValue || step.type === 'date') goNext();
    }
  };

  const handleFinish = () => {
    const now = new Date().toISOString();
    const relanceDelayVal = answers['relanceDelay'];
    const wantsRelance = relanceDelayVal && relanceDelayVal !== 'false';

    const app: Application = {
      id: generateId(),
      category: (answers['category'] || activeCategory) as ContractCategory,
      entreprise: answers['entreprise'] || '',
      entrepriseLogo: '',
      poste: answers['poste'] || '',
      lieu: answers['lieu'] || '',
      teletravail: false,
      remunere: answers['remunere'] === 'true',
      salaire: answers['salaire'] || '',
      lienOffre: answers['lienOffre'] || '',
      lienLinkedIn: '',
      siteEntreprise: '',
      datePublication: '',
      dateCandidature: answers['dateCandidature'] || now.split('T')[0],
      moyenCandidature: (answers['moyenCandidature'] || 'email') as ApplicationMethod,
      contact: {
        name: answers['contactName'] || '',
        role: '',
        email: answers['contactEmail'] || '',
        phone: answers['contactPhone'] || '',
        linkedin: '',
      },
      cvEnvoye: answers['cvEnvoye'] === 'true',
      lettreEnvoyee: answers['lettreEnvoyee'] === 'true',
      portfolioEnvoye: false,
      githubEnvoye: false,
      notes: answers['notes'] || '',
      status: 'en_attente' as ApplicationStatus,
      relanceDelay: wantsRelance ? (relanceDelayVal === 'custom' ? 'custom' : Number(relanceDelayVal) as RelanceDelay) : settings.defaultRelanceDelay,
      customRelanceDays: answers['customRelanceDays'] ? Number(answers['customRelanceDays']) : undefined,
      maxRelances: wantsRelance ? ((answers['maxRelances'] || '2') as MaxRelances) : settings.defaultMaxRelances,
      relancesEffectuees: 0,
      prochaineRelance: wantsRelance
        ? new Date(Date.now() + (relanceDelayVal === 'custom' ? Number(answers['customRelanceDays'] || 7) : Number(relanceDelayVal)) * 24 * 60 * 60 * 1000).toISOString()
        : null,
      dernierContact: null,
      entrevueDates: [],
      piecesJointes: [],
      historique: [{
        id: generateId(),
        date: now,
        action: 'Création',
        detail: 'Candidature créée via l\'assistant',
      }],
      technologies: [],
      createdAt: now,
      updatedAt: now,
    };

    addApplication(app);
    navigate(`/applications/${app.id}`);
  };

  // Start with active category
  useEffect(() => {
    setAnswers((prev) => ({ ...prev, category: activeCategory }));
  }, [activeCategory]);

  const progressPercent = Math.round(((visibleSteps.indexOf(steps[currentStep]) + 1) / visibleSteps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-theme" />
            <h1 className="section-title">Assistant de candidature</h1>
          </div>
          <p className="text-sm text-gray-400">Répondez aux questions une par une</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>Étape {visibleSteps.indexOf(steps[currentStep]) + 1} sur {visibleSteps.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step card */}
      <div
        className={`glass-card p-8 md:p-12 transition-all duration-300 ${
          animating
            ? direction === 'forward'
              ? 'opacity-0 -translate-x-8'
              : 'opacity-0 translate-x-8'
            : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-theme-subtle text-theme text-xs font-medium mb-4">
            {step.id}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-[var(--color-text)]">
            {step.question}
          </h2>
        </div>

        <div className="max-w-md mx-auto">
          {step.type === 'select' && step.options ? (
            <div className="space-y-2">
              {step.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, [step.field]: opt.value }));
                    setTimeout(goNext, 150);
                  }}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200
                    ${currentValue === opt.value
                      ? 'bg-theme-subtle border-theme-subtle-40 text-theme'
                      : 'border-white/10 hover:border-white/20 text-[var(--color-text)] hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{opt.label}</span>
                    {currentValue === opt.value && <Check className="w-5 h-5" />}
                  </div>
                </button>
              ))}
            </div>
          ) : step.type === 'textarea' ? (
            <div className="space-y-4">
              <textarea
                value={currentValue}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [step.field]: e.target.value }))}
                className="glass-input w-full min-h-[120px] resize-y text-base"
                placeholder={step.placeholder}
                autoFocus
              />
              <button
                onClick={goNext}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type={step.type}
                value={currentValue}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [step.field]: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="glass-input w-full text-lg text-center"
                placeholder={step.placeholder}
                autoFocus
              />
              <button
                onClick={goNext}
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={!currentValue && step.type !== 'url'}
              >
                {isLast ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Générer la fiche
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {currentStep > 0 && (
        <div className="text-center mt-4">
          <button onClick={goBack} className="btn-ghost text-sm">
            ← Revenir à la question précédente
          </button>
        </div>
      )}
    </div>
  );
}
