# ProgressMist

> **Never lose track of your job applications**  
> Application web moderne de suivi de candidatures — stage, alternance, CDI, CDD.

---

## 🚀 Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | **React** (SPA) | 18.3 |
| Langage | **TypeScript** strict | 5.5 |
| Bundler | **Vite** | 5.3 |
| Routing | **react-router-dom** v6 | 6.26 |
| State | **Zustand** + persist (localStorage) | 4.5 |
| Styling | **Tailwind CSS** v3 + CSS custom properties | 3.4 |
| Drag & Drop | **@hello-pangea/dnd** | 16.6 |
| Charts | **Recharts** | 2.12 |
| Dates | **date-fns** (locale FR) | 3.6 |
| Icônes | **lucide-react** | 0.400 |

---

## 📁 Arborescence

```
ProgressMist/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── main.tsx                          # Point d'entrée React
    ├── App.tsx                           # Router, layout, thème, notifications
    ├── index.css                         # Tailwind + CSS custom properties + thème
    ├── vite-env.d.ts
    ├── types/
    │   └── index.ts                      # Tous les types TS, constantes, labels
    ├── store/
    │   └── useAppStore.ts                # Store Zustand (persist localStorage)
    ├── utils/
    │   └── helpers.ts                    # formatDate, getStats, parseSalary, etc.
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx               # Navigation + sélecteur de catégorie
    │   │   ├── Header.tsx                # Barre du haut + thème + notifs
    │   │   └── NotificationsPanel.tsx    # Panneau latéral notifications
    │   └── ui/
    │       └── CelebrationOverlay.tsx    # Overlay animation (🎉 acceptée / 💪 refusée)
    └── pages/
        ├── Dashboard.tsx                 # Tableau de bord principal
        ├── Applications.tsx              # Liste des candidatures (grille)
        ├── ApplicationDetail.tsx         # Fiche détail + édition + pièces jointes
        ├── NewApplication.tsx            # Formulaire de création
        ├── AssistantMode.tsx             # Assistant pas-à-pas
        ├── KanbanView.tsx                # Vue Kanban (drag & drop)
        ├── TableView.tsx                 # Vue tableau (tri, filtre, statut inline)
        ├── CalendarView.tsx              # Calendrier (mois, semaine, jour)
        ├── Analytics.tsx                 # Graphiques & statistiques
        ├── NegotiationPage.tsx           # Comparaison d'offres acceptées
        ├── Companies.tsx                 # Suivi des entreprises
        └── SettingsPage.tsx              # Paramètres (thème, import/export, reset)
```

---

## 🧠 Architecture

### Data model

#### Application (candidature)
```typescript
interface Application {
  id: string;
  category: ContractCategory;          // 'stage' | 'alternance' | 'cdi' | 'cdd'
  entreprise: string;
  entrepriseLogo: string;
  poste: string;
  lieu: string;
  teletravail: boolean;
  remunere: boolean;                    // Offre rémunérée ?
  salaire: string;                      // Ex: "40-45k€" ou "1200€/mois"
  lienOffre: string;
  lienLinkedIn: string;
  siteEntreprise: string;
  datePublication: string;
  dateCandidature: string;
  dateDebut?: string;                   // Date début stage/alternance
  moyenCandidature: ApplicationMethod;  // LinkedIn, Indeed, WTTJ, etc.
  contact: Contact;                     // { name, role, email, phone, linkedin }
  cvEnvoye: boolean;
  lettreEnvoyee: boolean;
  portfolioEnvoye: boolean;
  githubEnvoye: boolean;
  notes: string;
  status: ApplicationStatus;           // 7 statuts (voir ci-dessous)
  relanceDelay: RelanceDelay;          // 3|5|7|10|14|'custom'
  customRelanceDays?: number;
  maxRelances: MaxRelances;            // 1|2|3|'unlimited'
  relancesEffectuees: number;
  prochaineRelance: string | null;
  dernierContact: string | null;
  entrevueDates: string[];
  piecesJointes: AttachedFile[];
  historique: HistoryEntry[];
  technologies: string[];
  createdAt: string;
  updatedAt: string;
}
```

#### Statuts des candidatures
| Statut | Label | Couleur |
|--------|-------|---------|
| `a_preparer` | À préparer | 🔵 Bleu |
| `en_attente` | En attente | 🟡 Jaune |
| `relance_prevue` | Relance prévue | 🟣 Violet |
| `entretien` | Entretien | 🟠 Orange |
| `acceptee` | Acceptée | 🟢 Vert |
| `refusee` | Refusée | 🔴 Rouge |
| `abandonnee` | Abandonnée | ⚫ Gris |

### State management (Zustand)

Le store unique (`useAppStore`) est persisté dans `localStorage` sous la clé `progressmist-storage`.

**Actions principales :**
- `addApplication` / `updateApplication` / `deleteApplication`
- `performRelance(appId)` — incrémente le compteur + reprogramme la prochaine relance
- `addHistory(appId, action, detail)` — ajoute une entrée d'historique
- `addCompany` / `updateCompany` / `deleteCompany`
- `addNotification` / `markNotificationRead` / `clearNotifications`
- `updateSettings` / `toggleDarkMode`
- `importData` / `exportData` — JSON
- `checkRelances()` — vérifie les relances du jour et entretiens du lendemain

---

## 🎨 Design system

### Thème dynamique

Le thème repose sur 3 **CSS custom properties** calculées dynamiquement via `App.tsx` :

```css
--color-primary           /* Couleur principale (hex) */
--color-primary-light     /* Variante plus claire (+30% vers blanc) */
--color-primary-rgb       /* Version RGB pour rgba() */
```

Ces variables sont injectées dans tout le CSS via les classes utilitaires :

| Classe | Effet |
|--------|-------|
| `text-theme` | `color: var(--color-primary)` |
| `text-theme-light` | `color: var(--color-primary-light)` |
| `bg-theme-solid` | `background: var(--color-primary)` |
| `bg-theme-gradient` | `linear-gradient(135deg, var(--color-primary), var(--color-primary-light))` |
| `bg-theme-gradient-br` | `linear-gradient(to bottom right, ...)` |
| `bg-theme-gradient-subtle` | Dégradé subtil (20% → 5% opacity) |
| `bg-theme-subtle` | `rgba(--color-primary-rgb, 0.10)` |
| `bg-theme-subtle-05` | `rgba(..., 0.05)` |
| `bg-theme-subtle-15` | `rgba(..., 0.15)` |
| `bg-theme-subtle-20` | `rgba(..., 0.20)` |
| `bg-theme-subtle-30` | `rgba(..., 0.30)` |
| `border-theme-subtle` | `border-color: rgba(..., 0.20)` |
| `border-theme-subtle-30` | `border-color: rgba(..., 0.30)` |
| `border-theme-subtle-40` | `border-color: rgba(..., 0.40)` |
| `shadow-theme` | `box-shadow` avec couleur primaire |
| `shadow-theme-lg` | Idem, plus large |
| `ring-theme` | `--tw-ring-color: var(--color-primary)` |
| `btn-primary` | Bouton avec dégradé + ombre dynamiques |
| `btn-ghost` | Bouton fantôme avec couleur dynamique |
| `glass-input` | Input avec focus ring dynamique |

**Tous** les éléments UI (boutons, badges, bordures, ombres, dégradés, icônes, liens, toggles, scrollbar, sélection) réagissent au changement de couleur dans Paramètres → Apparence.

### Mode sombre / clair

Géré via la classe `.dark` sur `<html>`. Les variables `--color-bg`, `--color-surface`, `--color-text` changent automatiquement.

---

## 📄 Pages & Fonctionnalités

### Dashboard (`/dashboard`)
- KPI cards : total, en attente, entretiens, acceptées, refusées
- KPIs secondaires : taux réponse, taux acceptation, délai moyen, relances
- Graphique AreaChart (candidatures/semaine)
- Graphique PieChart (répartition par statut)
- Section **Objectifs à venir** (compte à rebours J-X pour stage/alternance)
- Section **Comparaison des offres** (si 2+ offres acceptées dans la catégorie)
- Relances du jour, entretiens à venir, activité récente

### Candidatures (`/applications`)
- Grille responsive (1/2/3 colonnes)
- Recherche instantanée (entreprise, poste, lieu, contact, technos, notes)
- Filtres par statut (chips cliquables)
- Menu contextuel (voir, modifier, relance, supprimer)
- Cartes avec glassmorphism + effet hover

### Fiche détail (`/applications/:id`)
- Infos rapides (lieu, date, méthode, salaire, compte à rebours)
- Liens (offre, LinkedIn, site entreprise)
- Contact (nom, rôle, email, téléphone)
- Technologies (badges)
- Documents envoyés (CV, lettre, portfolio, GitHub)
- **Pièces jointes** (upload fichiers : CV, lettre, portfolio, certificat, autre)
- **Session de négociation** (comparaison offres acceptées si 2+)
- Compte à rebours date de début (stage/alternance)
- Notes + historique
- Sidebar : changement de statut + relances

### Nouvelle candidature (`/applications/new`)
- Formulaire complet en sections :
  - Informations générales (catégorie, statut)
  - Entreprise & poste (nom, intitulé, lieu, télétravail)
  - **💰 Rémunéré** (toggle → champ salaire conditionnel)
  - Liens (offre, LinkedIn, site)
  - Dates & méthode (publication, candidature, date début stage/alternance)
  - Contact (nom, fonction, email, tel, LinkedIn)
  - Documents envoyés (checkboxes CV/Lettre/Portfolio/GitHub)
  - Pièces jointes (upload fichiers)
  - Relances (délai, max, personnalisé)
  - Technologies (tags)
  - Notes

### Assistant (`/applications/new/assistant`)
- Questionnaire pas-à-pas (~17 étapes)
- Barre de progression
- Étapes conditionnelles (salaire si rémunéré, relance si activée)
- Animation slide entre les questions
- Génération automatique de la fiche à la fin

### Kanban (`/kanban`)
- 7 colonnes : À préparer → Envoyée → Relance → Entretien → Acceptée → Refusée → Abandonnée
- **Drag & drop** (@hello-pangea/dnd)
- Animation célébration (🎉 acceptée / 💪 refusée)
- Historique loggé automatiquement

### Tableau (`/table`)
- Vue tableau avec tri par colonnes (entreprise, poste, date, statut)
- Filtres dropdown (statut, méthode)
- **Badge statut cliquable** → dropdown pour changer le statut inline
- Célébration déclenchée depuis le dropdown
- Recherche instantanée

### Calendrier (`/calendar`)
- Vue mois (navigable)
- Événements : candidatures (📨), relances (🔄), entretiens (🎯)
- Switch jour/semaine/mois
- Légende des types d'événements

### Analytics (`/analytics`)
- KPIs : taux réponse, taux acceptation, délai moyen, entretiens
- BarChart : candidatures par semaine
- PieChart : répartition des statuts
- PieChart : répartition par plateforme
- BarChart : comparaison inter-catégories
- Tableau récapitulatif par catégorie

### Négociation (`/negociation`) ⚖️
- Page dédiée accessible depuis la sidebar
- 3 états : vide (0 offre), single (1 offre, félicitations), comparaison (2+ offres)
- Sélecteur de catégorie (Stage/Alternance/CDI/CDD)
- **Insights cards** : meilleur salaire, salaire moyen, écart salarial, nombre d'offres
- **Grille de comparaison** : cartes par offre avec :
  - Badge 🏆 "Meilleure offre"
  - Barre de progression salaire (%)
  - Écart en % vs le top
  - Technologies, lieu, télétravail, contact
  - Lien vers le détail
- Section **Conseils de négociation** (3 tips)

### Entreprises (`/companies`)
- CRUD entreprises (nom, secteur, taille, adresse, site, notes)
- Compteur de candidatures par entreprise
- Lien vers les candidatures filtrées

### Paramètres (`/settings`)
- **Apparence** : mode sombre/clair, couleur du thème (6 presets)
- **Relances** : délai et max par défaut
- **Dates & Notifications** : format date, toggle notifs, toggle auto-save
- **Import/Export** : JSON, CSV
- **Zone dangereuse** : reset complet (localStorage)

---

## 🔔 Notifications

5 types de notifications automatiques :
- **Relance** : quand `prochaineRelance` ≤ maintenant
- **Entretien** : entretien le lendemain
- **Réponse** : changement de statut (acceptée/refusée)
- **Oubliée** : candidature sans activité
- **Inactivité** : aucune candidature depuis 7 jours

Vérification toutes les 60 secondes via `setInterval` dans `App.tsx`.

---

## 🎉 Animations

| Animation | Déclencheur |
|-----------|-------------|
| **CelebrationOverlay** (papillons/flammes) | Statut → Acceptée ou Refusée (détail, Kanban, Tableau) |
| **Slide-down** | Apparition de champs conditionnels (relance custom, salaire) |
| **Slide-left/right** | Navigation assistant pas-à-pas |
| **Scale-in** | Menus contextuels, dropdowns |
| **Fade-in** | Transitions de page |
| **Hover translate** | Cartes glassmorphism |

---

## 📦 Scripts

```bash
npm run dev        # Développement (Vite HMR)
npm run build      # Build production (tsc + vite build)
npm run preview    # Preview build production
```

---

## 🔧 Installation

```bash
cd C:\Users\merim\ProgressMist
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

---

## 💾 Stockage

Toutes les données sont stockées dans le **localStorage** du navigateur sous la clé `progressmist-storage`.

- **Aucun backend** requis
- **Aucune base de données**
- Persistance automatique via le middleware `persist` de Zustand
- Export JSON/CSV pour sauvegarde externe
- Import JSON pour restauration

---

## 🔗 Contact

Créé par **[Meriem M](https://www.linkedin.com/in/meriem-m-a87393387)**
