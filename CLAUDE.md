# Claude.md - Guide de développement Scoresheets

## Architecture technique

- **Framework :** Next.js 15 avec TypeScript
- **Base de données :** Turso (cloud SQLite) en production, SQLite local en développement  
- **Déploiement :** Vercel (auto-deploy depuis main)
- **Styles :** Tailwind CSS avec système de thèmes dark/light
- **Tests :** Jest + React Testing Library

## Commandes essentielles

```bash
# Validation obligatoire avant commit
npm run lint:strict  # ESLint strict + TypeScript
npm test            # Tests unitaires + intégration

# Développement
npm run dev         # Serveur de développement
npm run quality     # lint:strict + tests en une commande

# Versions
npm run version:patch   # Bug fixes
npm run version:minor   # Nouvelles fonctionnalités
npm run version:major   # Breaking changes
```

## Structure des jeux

### Jeu existant : Yams (slug: 'yams')
- **Type :** Jeu de dés, scoring par catégories
- **Composant :** `src/components/scoresheets/YamsScoreSheet.tsx`
- **Route API :** `/api/games/yams/sessions/[sessionId]/scores`

### Ajout d'un nouveau jeu

**⚠️ IMPORTANT :** Utiliser le système harmonisé de création de jeux !

1. **Base de données :** Ajouter dans `src/lib/database.ts` → `seedInitialData()`
   ```sql
   INSERT INTO games (name, slug, category_id, is_implemented, score_type, team_based, min_players, max_players, score_direction)
   VALUES ('Nouveau Jeu', 'nouveau-jeu', 1, 1, 'rounds', 0, 2, 6, 'higher');
   ```

2. **Page de création :** La page `src/app/games/[slug]/new/page.tsx` est déjà générique !
   - ✅ **Utilise automatiquement** `useGameSessionCreator` hook
   - ✅ **Utilise automatiquement** `GameSessionForm` component  
   - ✅ **Interface harmonisée** avec tous les autres jeux
   - 🔧 **Pas besoin de coder** - le système s'adapte au `slug` et aux propriétés du jeu

3. **Composant scoresheet :** `src/components/scoresheets/NouveauJeuScoreSheet.tsx`

4. **Route API scores :** `/api/games/[slug]/sessions/[sessionId]/scores/route.ts`

5. **Tests :** Créer dans `src/__tests__/api/games/` et `src/__tests__/components/`

### Système de création harmonisé

**Composants réutilisables (NE PAS dupliquer) :**
- `useGameSessionCreator` hook : Logique commune de création
- `GameSessionForm` component : Formulaire unifié
- `PlayerInput` component : Saisie joueurs avec autocomplétion
- `GameSetupCard` component : Cards de configuration

**Architecture automatique :**
- Gestion équipes vs joueurs individuels selon `team_based`
- Validation automatique selon `min_players` / `max_players`  
- Interface adaptative selon le type de jeu
- Spinners et états de chargement intégrés

### Types de scoring
- `'categories'` : Scoring par catégories comme Yams
- `'rounds'` : Scoring par manches comme Belote
- `score_direction` : `'higher'` (plus haut gagne) ou `'lower'` (plus bas gagne)

## Base de données (Turso SQLite)

### Tables principales
- `games` : Liste des jeux disponibles
- `game_sessions` : Parties créées par les utilisateurs
- `players` : Joueurs d'une partie
- `scores` : Scores enregistrés par joueur/manche/catégorie
- `users` : Comptes utilisateurs (auth JWT)

### Variables d'environnement
```bash
# Production (Vercel)
TURSO_DATABASE_URL=libsql://[base].turso.io
TURSO_AUTH_TOKEN=eyJ...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword
JWT_SECRET=long-random-string

# Développement (.env.local)
TURSO_DATABASE_URL=file:./data/scoresheets.db
# TURSO_AUTH_TOKEN pas nécessaire en local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword  
JWT_SECRET=long-random-string
```

## Authentification et droits

- **Auth :** JWT tokens, gestion dans `src/lib/auth.ts`
- **Admin :** Flag `is_admin` dans la table users
- **Pages protégées :** Middleware dans `src/contexts/AuthContext.tsx`

## APIs admin (production)

```bash
# Corriger structure DB + droits admin
curl -X POST https://[VERCEL_URL]/api/admin/check-db

# Déployer un nouveau jeu
curl -X POST https://[VERCEL_URL]/api/admin/deploy-[game-slug]
```

## Composants UI importants

- `ThemeProvider` : Gestion dark/light theme
- `VersionFooter` : Affichage version depuis package.json  
- `ThemeToggle` : Bouton de changement de thème
- `GameList` : Liste des jeux sur dashboard
- `[Game]ScoreSheet` : Interfaces de scoring par jeu

## Tests critiques

Ces tests doivent passer à chaque modification :
- API Games (`/api/games`) 
- API Sessions (`/api/games/[slug]/sessions`)
- ThemeProvider (sans erreurs d'hydratation)
- Authentification JWT
- CRUD base de données

**Note :** Utiliser `@ts-expect-error` pour les warnings PhpStorm SQL dans les tests