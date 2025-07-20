# Claude.md - Instructions pour l'assistant

## Commandes de test systématiques

Avant de terminer toute modification de code, toujours exécuter :

```bash
npm run lint
```

Cette commande permet de détecter les erreurs ESLint et TypeScript qui doivent être corrigées.

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

### Processus recommandé
1. Faire les modifications de code
2. Tester avec `npm run lint`
3. Incrémenter la version appropriée
4. Commiter les changements
5. Déployer

## Notes sur le projet

- Base de données : Turso en production, SQLite en développement
- Jeu principal : Yams (slug: 'yams')
- Architecture : Next.js 15 avec TypeScript
- Styles : Tailwind CSS
- Version actuelle : Affichée automatiquement en bas des pages