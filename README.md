<p align="center">
  <img src="https://raw.githubusercontent.com/elgatoo00/ProgressMist/master/public/vite.svg" width="80" alt="ProgressMist" />
</p>

<h1 align="center">ProgressMist</h1>

<p align="center">
  <em>Never lose track of your job applications</em>
</p>

<p align="center">
  <a href="https://github.com/elgatoo00/ProgressMist/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="Licence MIT" />
  </a>
  <a href="https://elgatoo00.github.io/ProgressMist/">
    <img src="https://img.shields.io/badge/démo-en%20ligne-7c3aed?style=flat&logo=github" alt="Démo en ligne" />
  </a>
  <img src="https://img.shields.io/badge/react-18-61dafb?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/typescript-5-3178c6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/tailwind-3-06b6d4?logo=tailwindcss" alt="Tailwind 3" />
</p>

---

## ✨ À propos

**ProgressMist** est une application web qui vous aide à organiser votre recherche d'emploi, de stage, d'alternance, de CDI ou de CDD. Fini les dizaines d'onglets ouverts et les post-it éparpillés : tout est centralisé au même endroit.

Design premium inspiré d'OpenClassrooms — tons violets, glassmorphism, mode sombre/clair, animations fluides.

### 🎯 Fonctionnalités

- 📝 **Suivi des candidatures** — entreprise, poste, statut, contacts, documents
- 🤖 **Assistant pas-à-pas** — créez une candidature en répondant à des questions, une par une
- 📊 **Dashboard** — KPIs, graphiques, relances du jour, entretiens à venir
- 📋 **Vue Kanban** — glissez-déposez vos cartes entre les colonnes (façon Trello)
- 📄 **Vue Tableau** — triez, filtrez, recherchez parmi toutes vos candidatures
- 📅 **Calendrier** — visualisez vos candidatures, relances et entretiens
- 🔔 **Relances automatiques** — programmez des relances et recevez des notifications
- ⚖️ **Comparaison d'offres** — comparez vos offres acceptées (salaire, avantages, technologies)
- 📈 **Analytics** — graphiques, taux de réponse, délai moyen, répartition par plateforme
- ⏱️ **Compte à rebours** — jours restants avant le début de votre stage ou alternance
- 🏢 **Suivi des entreprises** — fiche par entreprise avec contacts et historique
- 🎨 **6 couleurs de thème** — violet, bleu, rose, vert, orange, cyan — changez en un clic
- 🌓 **Mode sombre / clair**
- 💾 **Import / Export** — JSON, CSV
- 📱 **Responsive** — fonctionne sur mobile, tablette et desktop

---

## 🚀 Démo en ligne

**[👉 elgatoo00.github.io/ProgressMist](https://elgatoo00.github.io/ProgressMist/)**

---

## 🖥️ Lancer en local

```bash
# Cloner le projet
git clone https://github.com/elgatoo00/ProgressMist.git
cd ProgressMist

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvrez **http://localhost:5173** dans votre navigateur.

---

## 🛠️ Stack technique

| Technologie | Usage |
|---|---|
| [React 18](https://react.dev/) | Interface utilisateur |
| [TypeScript](https://www.typescriptlang.org/) | Typage |
| [Vite](https://vitejs.dev/) | Build & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Styles |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [React Router](https://reactrouter.com/) | Navigation |
| [Recharts](https://recharts.org/) | Graphiques |
| [hello-pangea/dnd](https://github.com/hello-pangea/dnd) | Drag & drop (Kanban) |
| [date-fns](https://date-fns.org/) | Gestion des dates |
| [Lucide React](https://lucide.dev/) | Icônes |

---

## 📂 Structure du projet

```
src/
├── components/     # Composants réutilisables (Header, Sidebar, KanbanCard...)
│   └── layout/     # Header, Sidebar, NotificationsPanel
├── pages/          # Pages de l'application
│   ├── Dashboard.tsx
│   ├── Applications.tsx
│   ├── ApplicationDetail.tsx
│   ├── NewApplication.tsx
│   ├── AssistantMode.tsx      # Assistant pas-à-pas
│   ├── KanbanView.tsx
│   ├── TableView.tsx
│   ├── CalendarView.tsx
│   ├── Analytics.tsx
│   ├── Companies.tsx
│   ├── NegotiationPage.tsx    # Comparaison d'offres
│   └── SettingsPage.tsx
├── store/          # Zustand store (données, paramètres, historique)
├── types/          # Types TypeScript
├── utils/          # Fonctions utilitaires (dates, helpers)
└── App.tsx         # Point d'entrée
```

---

## 📄 Licence

MIT © [Meriem M](https://www.linkedin.com/in/meriem-m-a87393387)

---

<p align="center">
  <sub>Made with 💜 by Meriem M</sub>
</p>
