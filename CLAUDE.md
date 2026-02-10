# CLAUDE.md - Guide du projet RPG Tactique Frontend

## Vue d'ensemble

Frontend React pour un jeu RPG tactique au tour par tour. Interface d'administration (CRUD) et interface de jeu (exploration, combat sur grille). Communique avec le backend Express via proxy Vite.

## Stack technique

- **Framework**: React 19
- **Bundler**: Vite 7
- **Langage**: TypeScript 5.9
- **Routing**: react-router-dom 7 (`createBrowserRouter` + `RouterProvider`)
- **HTTP**: Axios (baseURL: `/api`, proxy vers `localhost:3000`)
- **Style**: CSS pur (dark theme, CSS custom properties)

## Commandes

```bash
npm run dev       # Serveur dev Vite (port 5173, proxy /api → :3000)
npm run build     # tsc + vite build
npm run preview   # Prévisualiser le build
npm run lint      # ESLint
```

## Structure du projet

```
frontend/src/
├── main.tsx                        # Point d'entrée (StrictMode + App)
├── App.tsx                         # Router (createBrowserRouter + RouterProvider)
├── types/index.ts                  # Types TS (miroir des modèles backend)
├── api/
│   ├── client.ts                   # Instance Axios (baseURL: /api)
│   ├── players.ts                  # CRUD joueurs
│   ├── characters.ts               # CRUD personnages + sorts + stats
│   ├── groups.ts                   # CRUD groupes + navigation
│   ├── combat.ts                   # Combat (action, move, endTurn, flee)
│   ├── maps.ts                     # Régions, maps, monstres
│   ├── static.ts                   # Races, sorts, équipements, effets, zones
│   └── donjons.ts                  # Donjons + grilles de combat
├── hooks/
│   ├── usePolling.ts               # Polling générique (interval + enabled)
│   └── useCrud.ts                  # Hook CRUD réutilisable (items, refresh, create, update, remove)
├── components/
│   ├── Layout.tsx                  # Sidebar nav (Jeu / Admin) + Outlet
│   ├── DataTable.tsx               # Table CRUD générique (colonnes configurables)
│   ├── FormModal.tsx               # Modal formulaire dynamique (create/edit)
│   └── ConfirmDialog.tsx           # Dialog de confirmation suppression
├── pages/
│   ├── admin/                      # 10 pages CRUD
│   │   ├── ZonesPage.tsx
│   │   ├── EffetsPage.tsx
│   │   ├── RacesPage.tsx
│   │   ├── EquipementsPage.tsx
│   │   ├── SortsPage.tsx           # Charge races + zones pour dropdowns
│   │   ├── RegionsPage.tsx
│   │   ├── MapsPage.tsx            # Charge régions pour dropdown
│   │   ├── MonstresPage.tsx
│   │   ├── GrillesPage.tsx         # Charge maps pour dropdown
│   │   └── DonjonsPage.tsx         # Charge régions + maps + monstres
│   └── game/                       # 5 pages de jeu
│       ├── PlayersPage.tsx         # Liste joueurs, création
│       ├── CharactersPage.tsx      # Personnages, allocation stats
│       ├── GroupsPage.tsx          # Gestion groupes, navigation map
│       ├── MapPage.tsx             # Exploration, engagement ennemis
│       └── CombatPage.tsx          # Interface combat complète
└── styles/
    ├── index.css                   # Theme dark, layout, formulaires, cards
    ├── combat.css                  # Grille combat, panels, barre sorts
    └── admin.css                   # Editeur grille, gestion relations
```

## Architecture

### Routing (react-router-dom v7)

**IMPORTANT** : Utilise l'API data router (`createBrowserRouter` + `RouterProvider`), PAS `BrowserRouter` + `<Routes>`. C'est requis pour react-router-dom v7 avec React 19.

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/game/players" replace /> },
      { path: 'admin/races', element: <RacesPage /> },
      // ...
      { path: 'game/combat/:id', element: <CombatPage /> },
    ],
  },
])

function App() { return <RouterProvider router={router} /> }
```

### Routes disponibles

| Section | Route | Page |
|---------|-------|------|
| Admin | `/admin/races` | Races CRUD |
| Admin | `/admin/sorts` | Sorts CRUD |
| Admin | `/admin/equipements` | Equipements CRUD |
| Admin | `/admin/effets` | Effets CRUD |
| Admin | `/admin/zones` | Zones CRUD |
| Admin | `/admin/regions` | Régions CRUD |
| Admin | `/admin/maps` | Maps CRUD |
| Admin | `/admin/monstres` | Monstres CRUD |
| Admin | `/admin/grilles` | Grilles de combat CRUD |
| Admin | `/admin/donjons` | Donjons CRUD |
| Jeu | `/game/players` | Gestion joueurs |
| Jeu | `/game/characters` | Personnages + stats |
| Jeu | `/game/groups` | Groupes + navigation |
| Jeu | `/game/map` | Exploration carte |
| Jeu | `/game/combat` | Liste combats |
| Jeu | `/game/combat/:id` | Interface combat |

### API Client

Instance Axios centralisée dans `api/client.ts` avec `baseURL: '/api'`. Le proxy Vite redirige `/api` vers `http://localhost:3000`.

Chaque module API exporte un objet avec : `getAll()`, `getById()`, `create()`, `update()`, `remove()` + méthodes spécifiques.

### Hook useCrud

Hook générique pour les pages CRUD :
```typescript
const { items, loading, refresh, create, update, remove } = useCrud(apiObject);
```
Gère le chargement initial, le rafraîchissement, et les opérations CRUD.

### Hook usePolling

Hook pour le polling du combat :
```typescript
const data = usePolling(fetchFn, 500, enabled);
```

## Patterns des pages

### Pages Admin (CRUD)

Toutes suivent le même pattern :
1. `useCrud(api)` pour les données
2. `DataTable` avec colonnes configurables
3. Bouton "Créer" ouvrant un `FormModal`
4. Boutons Edit/Delete par ligne
5. `ConfirmDialog` avant suppression

Les pages complexes (Sorts, Donjons) chargent des données liées pour peupler les dropdowns.

### FormModal - Définition des champs

```typescript
const fields: FieldDef[] = [
  { name: 'nom', label: 'Nom', type: 'text', required: true },
  { name: 'niveau', label: 'Niveau', type: 'number' },
  { name: 'raceId', label: 'Race', type: 'select', options: races.map(r => ({ value: r.id, label: r.nom })) },
  { name: 'estSoin', label: 'Soin?', type: 'checkbox' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'porteeMax', label: 'Portée Max', type: 'number', showIf: (vals) => !vals.estInvocation },
];
```

Supporte : `text`, `number`, `select`, `checkbox`, `textarea`, et `showIf` pour champs conditionnels.

### Pages Jeu

- **PlayersPage** : Cards avec création inline
- **CharactersPage** : Détails stats, allocation de points via `POST /characters/:id/allocate-stats`
- **GroupsPage** : Gestion membres (max 6), navigation directionnelle (N/S/E/O), connexions
- **MapPage** : Info map courante, groupes ennemis visibles, engagement combat
- **CombatPage** : Interface complète (voir section Combat)

## Interface Combat

### Layout
```
+--------------------------------------------------+
| Combat #id | Tour N | Entité active | STATUS      |
+--------------------------------------------------+
| Ordre des tours (barre horizontale)               |
+--------------------------------------------------+
| Panel entité  |     Grille CSS 15x10             |
| - PV/PA/PM   |     (40px par case)              |
| - Stats       |     Bleu=joueur, Rouge=ennemi    |
| - Effets      |     Gris=obstacle, Jaune=actif   |
|               |                                   |
| Actions       |                                   |
| [Sorts][Arme] |                                   |
| [Move][Fin]   |                                   |
+--------------------------------------------------+
| Journal de combat (scroll auto)                   |
+--------------------------------------------------+
```

### Flow
1. **Polling** : GET `/combats/:id` toutes les 500ms
2. **Tour joueur** : `entiteActuelle.equipe === 0 && !invocateurId` → contrôles activés
3. **Sélection sort** → mode ciblage → clic case → POST `/combats/:id/action`
4. **Déplacement** → mode move → clic case → POST `/combats/:id/move`
5. **Arme** → mode arme → clic case → POST `/combats/:id/action { useArme: true }`
6. **Fin tour** → POST `/combats/:id/end-turn` → backend joue IA automatiquement
7. **Fin combat** → écran victoire/défaite

### Grille CSS
- CSS Grid : `grid-template-columns: repeat(largeur, 40px)`
- Classes : `.player-cell`, `.enemy-cell`, `.invocation-cell`, `.obstacle`, `.current-turn`, `.dead`
- Mini barre de vie sur chaque entité
- Mode ciblage : `.target-mode` ajoute curseur crosshair

## Styles / Thème

Thème sombre avec CSS custom properties :
```css
--bg-primary: #1a1a2e
--bg-secondary: #16213e
--bg-card: #1e2a4a
--text-primary: #e0e0e0
--accent: #4fc3f7
--accent-hover: #29b6f6
--danger: #ef5350
--success: #66bb6a
--warning: #ffa726
```

## Configuration Vite

Le proxy `/api` redirige vers le backend :
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```

**Pré-requis** : Le backend doit tourner sur `localhost:3000` avant de lancer le frontend.

## Points d'attention

- **react-router-dom v7** : Toujours utiliser `createBrowserRouter`, jamais `BrowserRouter`
- **Proxy Vite** : Les appels API passent par `/api` (pas d'URL absolue vers :3000)
- **Types** : Miroir des modèles backend dans `types/index.ts`, à maintenir synchronisé
- **Polling combat** : 500ms, pas de WebSocket (MVP)
- **Pas d'authentification** : MVP, tous les joueurs sont accessibles
