# Claude.md - Instructions pour l'assistant

## Commandes de test systématiques

Avant de terminer toute modification de code, toujours exécuter :

```bash
npm run lint
```

Cette commande permet de détecter les erreurs ESLint et TypeScript qui doivent être corrigées.

## Notes sur le projet

- Base de données : Turso en production, SQLite en développement
- Jeu principal : Yams (slug: 'yams')
- Architecture : Next.js 15 avec TypeScript
- Styles : Tailwind CSS