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

## Notes sur le projet

- Base de données : Turso en production, SQLite en développement
- Jeu principal : Yams (slug: 'yams')
- Architecture : Next.js 15 avec TypeScript
- Styles : Tailwind CSS
- Version actuelle : Affichée automatiquement en bas des pages