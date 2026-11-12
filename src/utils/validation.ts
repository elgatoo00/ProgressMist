import type { Application } from '@/types';
import { parseLocalDate } from '@/utils/helpers';

export type FormErrors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function isValidUrl(v: string): boolean {
  const t = v.trim();
  if (!t) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Valide le formulaire d'une candidature.
 * Les clés retournées correspondent aux noms des champs (contact.email, entrevueDates.0…).
 */
export function validateApplication(form: Partial<Application>): FormErrors {
  const e: FormErrors = {};
  const entreprise = (form.entreprise || '').trim();
  const poste = (form.poste || '').trim();

  if (!entreprise) e.entreprise = "Le nom de l'entreprise est obligatoire.";
  else if (entreprise.length < 2) e.entreprise = "Le nom de l'entreprise doit contenir au moins 2 caractères.";

  if (!poste) e.poste = "L'intitulé du poste est obligatoire.";
  else if (poste.length < 2) e.poste = "L'intitulé du poste doit contenir au moins 2 caractères.";

  const sent = parseLocalDate(form.dateCandidature);
  if (!form.dateCandidature) e.dateCandidature = "Indiquez la date d'envoi de la candidature.";
  else if (!sent) e.dateCandidature = 'Date invalide.';

  const email = (form.contact?.email || '').trim();
  if (email && !isValidEmail(email)) e['contact.email'] = 'Adresse e-mail invalide (exemple : prenom.nom@entreprise.fr).';

  const phone = (form.contact?.phone || '').trim();
  if (phone && !/^[+()\d\s.-]{6,20}$/.test(phone)) e['contact.phone'] = 'Numéro de téléphone invalide.';

  (['lienOffre', 'lienLinkedIn', 'siteEntreprise'] as const).forEach((k) => {
    const v = (form[k] as string) || '';
    if (v && !isValidUrl(v)) e[k] = 'Lien invalide (exemple : https://www.exemple.com/offre).';
  });
  const recruiterLinkedin = form.contact?.linkedin || '';
  if (recruiterLinkedin && !isValidUrl(recruiterLinkedin)) e['contact.linkedin'] = 'Lien invalide.';

  if (form.prochaineRelance) {
    const r = parseLocalDate(form.prochaineRelance);
    if (!r) e.prochaineRelance = 'Date invalide.';
    else if (sent && r < sent) e.prochaineRelance = "La relance ne peut pas être antérieure à la date d'envoi.";
  }

  (form.entrevueDates || []).forEach((d, i) => {
    if (!d) e[`entrevueDates.${i}`] = "Indiquez la date de l'entretien ou supprimez la ligne.";
    else if (!parseLocalDate(d)) e[`entrevueDates.${i}`] = 'Date invalide.';
  });

  if (form.relanceDelay === 'custom') {
    const n = Number(form.customRelanceDays);
    if (!n || n < 1 || n > 90) e.customRelanceDays = 'Indiquez un nombre de jours entre 1 et 90.';
  }

  if (form.datePublication && sent) {
    const p = parseLocalDate(form.datePublication);
    if (p && p > sent) e.datePublication = "La date de publication est postérieure à la date d'envoi.";
  }

  return e;
}
