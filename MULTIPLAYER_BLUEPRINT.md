# ScoreSheets Multiplayer - Blueprint technique

## 🎯 Vision du projet multiplayer

Ce document contient toute la connaissance du projet ScoreSheets v1 pour créer la version multiplayer.

## 🏗️ Architecture actuelle à réutiliser

### Base de données (Turso SQLite)
```sql
-- Structure tables principales
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INTEGER,
  rules TEXT,
  is_implemented BOOLEAN DEFAULT FALSE,
  score_type TEXT DEFAULT 'rounds', -- 'rounds' ou 'categories'
  team_based BOOLEAN DEFAULT FALSE,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 6,
  score_direction TEXT DEFAULT 'higher'
);

CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT NOT NULL,
  game_id INTEGER,
  user_id INTEGER NOT NULL,
  has_score_target BOOLEAN DEFAULT FALSE,
  score_target INTEGER DEFAULT 0,
  date_played DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  round_number INTEGER,
  score_type TEXT DEFAULT 'round', -- ou category_id pour Yams
  score_value INTEGER DEFAULT 0,
  details TEXT -- JSON pour infos supplémentaires
);
```

### Structure des jeux implémentés

#### 1. Yams (score_type: 'categories')
- **Composant**: `YamsScoreSheet.tsx`
- **API**: `/api/games/yams/sessions/[sessionId]/scores` (POST individual scores)
- **Particularité**: Scoring par catégories, validation des valeurs autorisées
- **Calculs**: Bonus 35 pts si section haute >= 63

#### 2. Tarot (score_type: 'rounds')  
- **Composant**: `TarotScoreSheet.tsx`
- **API**: `/api/games/tarot/sessions/[sessionId]/rounds` (POST round scores)
- **Particularité**: Calculs complexes selon contrats, bouts, primes
- **Format**: Scores par manche, avec détails JSON

#### 3. Bridge (score_type: 'rounds', team_based: true)
- **Composant**: `BridgeScoreSheet.tsx` 
- **API**: `/api/games/bridge/sessions/[sessionId]/rounds`
- **Particularité**: Scoring par équipes (4 joueurs fixes), vulnérabilité
- **Format**: Scores opposés pour les équipes

#### 4. Belote (score_type: 'rounds', team_based: true)
- **Composant**: `BeloteScoreSheet.tsx`
- **Particularité**: Équipes de 2, calculs par manche avec coinche

#### 5. Mille Bornes (score_type: 'rounds')
- **Composant**: `MilleBornesScoreSheet.tsx` 
- **Particularité**: Distances + primes + bottes, 2-6 joueurs

### Système harmonisé

#### Routes API génériques
```
POST /api/games/[slug]/sessions          → Créer session
GET  /api/games/[slug]/sessions/[id]     → Récupérer session + scores  
POST /api/games/[slug]/sessions/[id]/rounds  → Ajouter manche
POST /api/games/[slug]/sessions/[id]/scores  → Modifier score individuel
```

#### Composants réutilisables
```
src/components/layout/
├── GameLayout.tsx          → Layout principal avec sidebar
├── GameCard.tsx            → Card wrapper pour sections
├── RankingSidebar.tsx      → Classement temps réel
├── GameSessionForm.tsx     → Formulaire création partie

src/components/ui/
├── ScoreInput.tsx          → Input optimisé pour scores
├── LoadingSpinner.tsx      → Spinners uniformes

src/hooks/
├── useGameSessionCreator.ts → Logique création de parties
```

#### Loader de composants
```typescript
// src/lib/gameComponentLoader.tsx
const specificComponents = {
  'yams': dynamic(() => import('@/components/scoresheets/YamsScoreSheet')),
  'tarot': dynamic(() => import('@/components/scoresheets/TarotScoreSheet')),
  'bridge': dynamic(() => import('@/components/scoresheets/BridgeScoreSheet')),
  'belote': dynamic(() => import('@/components/scoresheets/BeloteScoreSheet')), 
  'mille-bornes': dynamic(() => import('@/components/scoresheets/MilleBornesScoreSheet')),
};
```

## 🔄 Architecture multiplayer cible

### Nouvelles tables nécessaires
```sql
-- Sessions partagées
CREATE TABLE shared_sessions (
  id TEXT PRIMARY KEY, -- UUID
  code TEXT UNIQUE NOT NULL, -- Code 6 chiffres
  game_id INTEGER NOT NULL,
  organizer_id INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  current_round INTEGER DEFAULT 1,
  max_rounds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Participants de la session
CREATE TABLE session_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shared_session_id TEXT NOT NULL,
  user_id INTEGER, -- NULL si anonyme
  player_name TEXT NOT NULL,
  position INTEGER,
  is_ready BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT TRUE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shared_session_id) REFERENCES shared_sessions(id)
);

-- Scores individuels par participant
CREATE TABLE participant_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shared_session_id TEXT NOT NULL,
  participant_id INTEGER NOT NULL,
  round_number INTEGER,
  score_type TEXT DEFAULT 'round',
  score_value INTEGER DEFAULT 0,
  details TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES session_participants(id)
);
```

### APIs multiplayer
```
POST /api/multiplayer/sessions           → Créer session partagée
POST /api/multiplayer/join              → Rejoindre avec code
GET  /api/multiplayer/[sessionId]       → État session temps réel
POST /api/multiplayer/[sessionId]/scores → Soumettre ses scores
POST /api/multiplayer/[sessionId]/ready → Marquer comme prêt
```

### Composants multiplayer
```
src/components/multiplayer/
├── CreateSharedSession.tsx    → Création avec code
├── JoinSession.tsx           → Rejoindre par code  
├── LobbyView.tsx             → Salle d'attente
├── PlayerView.tsx            → Vue joueur individuel
├── OrganizerView.tsx         → Vue organisateur
├── StatusBar.tsx             → Qui est prêt, qui attend
├── GameResultsMulti.tsx      → Résultats finaux partagés
```

## 📱 Flux utilisateur multiplayer

### 1. Création de partie
1. Organisateur choisit le jeu  
2. Crée la session → génère code (ex: 123456)
3. Partage le code aux autres joueurs

### 2. Rejoindre la partie  
1. Joueur saisit le code
2. Choisit son nom
3. Arrive dans le lobby

### 3. Lobby
1. Vue de tous les participants connectés
2. L'organisateur peut démarrer quand tous sont prêts
3. Bouton "Commencer la partie"

### 4. Jeu collaboratif
1. Chaque joueur a SA grille sur SON téléphone
2. Polling toutes les 3 secondes pour sync
3. StatusBar montre qui a fini sa saisie  
4. Manche suivante quand tous ont validé

### 5. Fin de partie
1. Résultats finaux visibles par tous
2. Historique complet accessible
3. Option "Nouvelle partie" avec les mêmes joueurs

## 🛠️ Technologies à réutiliser

- **Framework**: Next.js 15 + TypeScript  
- **DB**: Turso (SQLite cloud) - parfait pour le multi !
- **Styles**: Tailwind CSS + système dark/light
- **Déploiement**: Vercel (compatible polling)
- **Auth**: JWT optionnel (sessions anonymes possibles)

## 📋 Architecture de référence

### Code source disponible dans .backup/
Tout le code source du projet v1 est disponible dans le dossier `.backup/` pour référence et réutilisation.

### Fichiers clés à adapter/réutiliser :
```
.backup/src/components/scoresheets/
├── YamsScoreSheet.tsx       → Réutiliser comme base
├── TarotScoreSheet.tsx      → Adapter pour vue individuelle  
├── BridgeScoreSheet.tsx     → Adapter pour équipes multiplayer
├── BeloteScoreSheet.tsx     → Adapter si nécessaire
├── MilleBornesScoreSheet.tsx → Adapter pour vue individuelle

.backup/src/components/layout/
├── GameLayout.tsx           → Adapter pour StatusBar multiplayer
├── GameCard.tsx             → Réutiliser tel quel
├── RankingSidebar.tsx       → Adapter pour participants temps réel

.backup/src/components/ui/   → Composants réutilisables tel quel
.backup/src/lib/
├── database.ts              → Base + nouvelles tables multiplayer
├── auth.ts                  → Système éprouvé à réutiliser 
├── gameComponentLoader.tsx  → Adapter pour vues multiplayer
├── constants.ts             → Messages et constantes
```

## 🎯 Plan de développement recommandé

### Phase 1: Fondations (1 semaine)
1. Setup nouveau projet avec base copiée
2. Nouvelles tables shared_sessions  
3. APIs create/join basiques
4. Lobby simple avec codes

### Phase 2: Sync temps réel (1 semaine) 
1. Polling toutes les 3 secondes
2. États partagés (qui est connecté, prêt)
3. StatusBar participant
4. Tests avec 2 joueurs

### Phase 3: Adaptation jeux (1 semaine)
1. Vue joueur individuelle Yams
2. Vue joueur individuelle Tarot
3. Logique de soumission/validation
4. Tests multi-joueurs

### Phase 4: Polish (1 semaine)
1. Gestion déconnexions
2. Interface mobile optimisée  
3. Résultats finaux
4. Tests avec 6 joueurs max

## 🔧 Commandes importantes à retenir
```bash
npm run lint:strict  # Validation code
npm test            # Tests 
npm run dev         # Dev server
npm run quality     # lint + tests
```

## 📝 Patterns de code à respecter

### Interfaces standards
```typescript
interface Player {
  id: number;
  name: string;
  position: number;
}

interface GameSession {
  id: number;
  session_name: string;
  has_score_target: number;
  score_target?: number;
  players: Player[];
  scores: { [roundNumber: string]: { [playerId: number]: number } };
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
  }>;
}
```

### Format API responses
```typescript
// GET session
{ session: GameSession }

// POST rounds
{ scores: Array<{ playerId: number; score: number }> }

// POST individual score  
{ categoryId: string; playerId: number; score: number }
```

## 🎮 Détails par jeu pour adaptation multiplayer

### Yams
- **Difficulté**: Moyenne
- **Adaptation**: Chaque joueur sa grille, scoring par catégories
- **Sync**: Après chaque catégorie validée

### Tarot  
- **Difficulté**: Complexe  
- **Adaptation**: Un seul "preneur" par manche, autres saisissent leurs scores
- **Sync**: Après validation de la manche complète

### Bridge
- **Difficulté**: Complexe
- **Adaptation**: 4 joueurs fixes, positions Nord/Sud/Est/Ouest
- **Sync**: Un seul déclarant par donne

### Mille Bornes
- **Difficulté**: Simple
- **Adaptation**: Chacun saisit km + primes + bottes
- **Sync**: Après validation manche

## 💡 Notes importantes

- **Polling vs WebSockets**: Vercel = pas de WebSockets, utiliser polling intelligent
- **Gestion des déconnexions**: Garder les données, permettre reconnexion
- **Sessions anonymes**: Possibles avec juste un nom, auth optionnelle
- **Mobile-first**: Interface tactile optimisée pour smartphones
- **Performance**: Turso SQLite excellent pour lectures fréquentes

## 🚀 Ready for takeoff !

Cette documentation contient tout ce dont tu as besoin pour créer la version multiplayer !