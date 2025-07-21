# Liste des fichiers à copier pour le projet Multiplayer

## 📋 Checklist complète

### 🎯 Documentation (À copier en premier)
- [ ] `MULTIPLAYER_BLUEPRINT.md` → Documentation technique complète
- [ ] `CLAUDE.md` → Guide de développement (adapter pour multiplayer)

### 🏗️ Configuration projet
- [ ] `package.json` → Dependencies à récupérer
- [ ] `tailwind.config.ts` → Configuration Tailwind
- [ ] `eslint.config.mjs` → Configuration ESLint moderne
- [ ] `tsconfig.json` → Configuration TypeScript
- [ ] `next.config.mjs` → Configuration Next.js
- [ ] `jest.config.js` → Configuration tests

### 🎮 Composants ScoreSheets (À adapter pour multiplayer)
- [ ] `src/components/scoresheets/YamsScoreSheet.tsx`
- [ ] `src/components/scoresheets/TarotScoreSheet.tsx` 
- [ ] `src/components/scoresheets/BridgeScoreSheet.tsx`
- [ ] `src/components/scoresheets/BeloteScoreSheet.tsx`
- [ ] `src/components/scoresheets/MilleBornesScoreSheet.tsx`
- [ ] `src/components/scoresheets/GenericScoreSheet.tsx`

### 🎨 Composants Layout (Réutilisables)
- [ ] `src/components/layout/GameLayout.tsx` → Adapter pour StatusBar multiplayer
- [ ] `src/components/layout/GameCard.tsx` → Réutiliser tel quel
- [ ] `src/components/layout/RankingSidebar.tsx` → Adapter pour participants
- [ ] `src/components/GameSessionForm.tsx` → Réutiliser comme base

### 🛠️ Composants UI (Réutilisables tel quel)
- [ ] `src/components/ui/ScoreInput.tsx`
- [ ] `src/components/ui/LoadingSpinner.tsx`
- [ ] `src/components/AuthGuard.tsx`

### 📚 Librairies core
- [ ] `src/lib/database.ts` → Adapter avec tables multiplayer
- [ ] `src/lib/auth.ts` → Réutiliser tel quel
- [ ] `src/lib/authClient.ts` → Réutiliser tel quel
- [ ] `src/lib/gameComponentLoader.tsx` → Adapter pour vues multiplayer
- [ ] `src/lib/constants.ts` → Réutiliser et enrichir

### 🎣 Hooks
- [ ] `src/hooks/useGameSessionCreator.ts` → Base pour hook multiplayer
- [ ] `src/contexts/AuthContext.tsx` → Réutiliser tel quel

### 🎨 Styles
- [ ] `src/app/globals.css` → Styles globaux Tailwind

### 🧪 Tests (Comme référence)
- [ ] `src/__tests__/` → Structure de tests à reproduire

## 🚀 Ordre recommandé de copie

### Étape 1: Setup de base
1. Créer nouveau projet Next.js 15
2. Copier `package.json` dependencies
3. Copier configurations (tailwind, eslint, etc.)
4. Copier `MULTIPLAYER_BLUEPRINT.md` et `CLAUDE.md`

### Étape 2: Infrastructure  
1. Copier `src/lib/` (adapter database.ts)
2. Copier `src/components/ui/`
3. Copier `src/contexts/`
4. Copier `src/app/globals.css`

### Étape 3: Composants de base
1. Copier `src/components/layout/` (adapter)
2. Copier `src/components/AuthGuard.tsx`
3. Copier `src/hooks/`

### Étape 4: Jeux (1 par 1 pour tester)
1. Commencer par Yams (le plus simple)
2. Adapter le composant pour vue individuelle
3. Tester avec 2 joueurs
4. Puis ajouter les autres jeux

## 💡 Adaptations nécessaires

### Components ScoreSheets
```typescript
// Au lieu de voir tous les joueurs:
{session.players.map(player => ...)}

// Vue individuelle pour le joueur connecté:
const currentPlayer = getCurrentPlayer();
<MyScoreGrid player={currentPlayer} />
```

### Database
```typescript
// Nouvelles tables à ajouter dans database.ts:
// - shared_sessions
// - session_participants  
// - participant_scores
```

### API Routes
```typescript
// Nouvelles routes multiplayer:
// - /api/multiplayer/sessions
// - /api/multiplayer/join
// - /api/multiplayer/[sessionId]
```

## ✅ Une fois copié dans le nouveau projet

Tu pourras me dire : "J'ai créé le nouveau projet et copié tous les fichiers de la COPY_LIST.md avec le MULTIPLAYER_BLUEPRINT.md" 

Et j'aurai toute la connaissance nécessaire pour démarrer le développement multiplayer ! 🚀