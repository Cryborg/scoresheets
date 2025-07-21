# Claude.md - Instructions pour l'assistant

## Commandes de test systématiques

Avant de terminer toute modification de code, toujours exécuter dans cet ordre :

```bash
# 1. Vérification ESLint stricte et TypeScript
npm run lint:strict

# 2. Tests unitaires et d'intégration
npm test
```

**Important :** Utiliser `npm run lint:strict` au lieu de `npm run lint` car il détecte beaucoup plus d'erreurs (types `any`, imports non optimisés, variables inutilisées, etc.)

### Tests disponibles

```bash
# Lancer tous les tests une fois
npm test

# Lancer les tests en mode watch (recommandé pendant le développement)
npm run test:watch

# Lancer les tests avec rapport de couverture
npm run test:coverage

# ESLint strict (obligatoire avant chaque modification)
npm run lint:strict

# ESLint standard
npm run lint

# ESLint avec auto-fix
npm run lint:fix

# Vérification TypeScript
npm run typecheck

# Commande complète qualité (lint strict + typecheck + tests)
npm run quality
```

### Structure des tests

- **Tests d'API** : `src/__tests__/api/` - Testent les routes API critiques
- **Tests de composants** : `src/__tests__/components/` - Testent les composants React
- **Tests d'intégration** : `src/__tests__/integration/` - Testent la base de données
- **Tests utilitaires** : `src/__tests__/lib/` - Testent les fonctions utilitaires

## Gestion des versions

### Montée de version
Pour incrémenter la version de l'application :

```bash
# Version patch (0.1.0 → 0.1.1) - corrections de bugs
npm run version:patch

# Version minor (0.1.0 → 0.2.0) - nouvelles fonctionnalités
npm run version:minor  

# Version major (0.1.0 → 1.0.0) - changements breaking
npm run version:major
```

### Affichage de la version
- La version est automatiquement affichée en bas à gauche de toutes les pages
- Elle est récupérée depuis le `package.json`
- Le composant `VersionFooter` gère l'affichage

### Tests critiques à vérifier

Ces tests doivent TOUJOURS passer après chaque modification :

1. **API Games** (`/api/games`) - Récupération des jeux
2. **API Sessions** (`/api/games/[slug]/sessions`) - Création de parties
3. **ThemeProvider** - Gestion des thèmes sans erreur d'hydratation  
4. **Authentification** - Validation des tokens JWT
5. **Base de données** - CRUD des sessions, joueurs et scores

### Processus recommandé
1. Faire les modifications de code
2. **Obligatoire :** Lancer ESLint strict : `npm run lint:strict`
3. **Obligatoire :** Lancer les tests : `npm test`
4. Incrémenter la version appropriée
5. Commiter les changements
6. Déployer

**Note :** `npm run quality` combine les étapes 2 et 3 en une seule commande

## Déploiement et correction en production

### URL de production
- **URL actuelle** : [Variable VERCEL_URL ou voir dashboard Vercel]
- **Dashboard Vercel** : https://vercel.com/dashboard

### Endpoints de maintenance en production

```bash
# Vérifier la structure de la base de données
curl https://[YOUR_VERCEL_URL]/api/admin/check-db

# Corriger la structure DB et droits admin (POST)
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/check-db

# Accorder droits admin à l'utilisateur configuré
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/grant-admin

# Déployer Belote en production
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/deploy-belote
```

### Problèmes courants en production

#### 1. Colonne manquante (ex: is_admin)
**Erreur :** `no such column: is_admin`
**Solution :** 
```bash
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/check-db
```

#### 2. Utilisateur sans droits admin
**Symptôme :** Pas d'accès à la page admin
**Solution :**
```bash
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/grant-admin
```
Puis se déconnecter/reconnecter

#### 3. Jeu manquant en production
**Symptôme :** Belote/nouveau jeu non visible
**Solution :**
```bash
curl -X POST https://[YOUR_VERCEL_URL]/api/admin/deploy-belote
```

#### 4. URL de déploiement inconnue
**Script de vérification :**
```bash
node scripts/check-deployment.js
```

### Comptes administrateurs
- **Email :** [Voir variables d'environnement]
- **Mot de passe :** [Voir variables d'environnement]
- **Droits :** Accès admin (is_admin = 1)

### Architecture base de données
- **Production :** Turso (cloud SQLite)
- **Développement :** SQLite local (file:./data/scoresheets.db)
- **Migration automatique :** Voir `src/lib/database.ts` → `seedInitialData()`

### Variables d'environnement requises

#### Production (Vercel)
```
TURSO_DATABASE_URL=libsql://[votre-base].turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=votre-email@example.com
ADMIN_PASSWORD=VotreMotDePasseSecurise
JWT_SECRET=votre-jwt-secret-long-et-complexe
```

#### Développement (.env.local)
```
# Base de données Turso
TURSO_DATABASE_URL=file:./data/scoresheets.db
# TURSO_AUTH_TOKEN non requis en local

# Compte administrateur
ADMIN_EMAIL=votre-email@example.com  
ADMIN_PASSWORD=VotreMotDePasseSecurise

# JWT pour l'authentification
JWT_SECRET=votre-jwt-secret-long-et-complexe
```

## Notes sur le projet

- Base de données : Turso en production, SQLite en développement
- Jeu principal : Yams (slug: 'yams')
- Architecture : Next.js 15 avec TypeScript
- Styles : Tailwind CSS
- Version actuelle : Affichée automatiquement en bas des pages