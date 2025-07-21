// Game migrations system to manage game additions without data loss
interface GameMigration {
  id: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

interface GameDefinition {
  name: string;
  slug: string;
  category_id: number;
  rules: string;
  is_implemented: boolean;
  score_type: string;
  team_based: boolean;
  min_players: number;
  max_players: number;
  score_direction: string;
}

import { db } from './database';

// Migration tracking table
export async function initializeMigrationSystem() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Check if migration was already applied
async function isMigrationApplied(migrationId: string): Promise<boolean> {
  const result = await db.prepare('SELECT id FROM game_migrations WHERE id = ?').get(migrationId);
  return !!result;
}

// Mark migration as applied
async function markMigrationApplied(migrationId: string): Promise<void> {
  await db.prepare('INSERT INTO game_migrations (id) VALUES (?)').run(migrationId);
}

// Add a game if it doesn't exist
async function addGameIfNotExists(game: GameDefinition): Promise<void> {
  const existing = await db.prepare('SELECT id FROM games WHERE slug = ?').get(game.slug);
  
  if (!existing) {
    await db.execute({ sql: `
      INSERT INTO games (name, slug, category_id, rules, is_implemented, score_type, team_based, min_players, max_players, score_direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [
      game.name,
      game.slug,
      game.category_id,
      game.rules,
      game.is_implemented ? 1 : 0,
      game.score_type,
      game.team_based ? 1 : 0,
      game.min_players,
      game.max_players,
      game.score_direction
    ] });
    console.log(`✅ Game added: ${game.name}`);
  } else {
    console.log(`ℹ️ Game already exists: ${game.name}`);
  }
}

// Game definitions
const GAME_DEFINITIONS: Record<string, GameDefinition> = {
  yams: {
    name: 'Yams (Yahtzee)',
    slug: 'yams',
    category_id: 2,
    rules: `**OBJECTIF :** Obtenir le maximum de points en réalisant des combinaisons avec 5 dés en 13 catégories.

**MATÉRIEL :** 5 dés, feuille de score. Se joue à 1+ joueurs.

**DÉROULEMENT :**
1. Lancer les 5 dés
2. Garder les dés souhaités, relancer les autres (max 3 lancers)
3. Inscrire le résultat dans une catégorie au choix (une seule fois par catégorie)

**CATÉGORIES :**
- **Section supérieure :** Somme des 1, 2, 3, 4, 5, 6 (bonus +35 si total ≥63)
- **Section inférieure :** Brelan (somme des dés), Carré (somme), Full (25 pts), Petite suite (30 pts), Grande suite (40 pts), Yams (50 pts), Chance (somme)

**FIN DE PARTIE :** Après 13 tours (toutes les catégories remplies). Le plus haut score gagne.`,
    is_implemented: true,
    score_type: 'categories',
    team_based: false,
    min_players: 1,
    max_players: 8,
    score_direction: 'higher'
  },
  belote: {
    name: 'Belote',
    slug: 'belote',
    category_id: 1,
    rules: `**OBJECTIF :** Être la première équipe à atteindre 501 points.

**MATÉRIEL :** Jeu de 32 cartes (7, 8, 9, 10, Valet, Dame, Roi, As). Se joue à 4 joueurs en 2 équipes.

**DÉROULEMENT :**
1. Distribution de 5 cartes par joueur, puis 3 cartes
2. Enchères pour déterminer l'atout
3. L'équipe preneuse doit faire au moins la moitié des points
4. Comptage des points : 162 points par donne + 20 pour Belote/Rebelote

**POINTS DES CARTES :**
- **Atout :** Valet (20), 9 (14), As (11), 10 (10), Roi (4), Dame (3), 8 (0), 7 (0)
- **Non-atout :** As (11), 10 (10), Roi (4), Dame (3), Valet (2), 9 (0), 8 (0), 7 (0)

**FIN DE PARTIE :** Première équipe à 501 points gagne.`,
    is_implemented: true,
    score_type: 'rounds',
    team_based: true,
    min_players: 4,
    max_players: 4,
    score_direction: 'higher'
  }
};

// Migration definitions
const MIGRATIONS: GameMigration[] = [
  {
    id: '001_add_yams_game',
    name: 'Add Yams game',
    description: 'Adds the Yams (Yahtzee) game to the database',
    up: async () => {
      await addGameIfNotExists(GAME_DEFINITIONS.yams);
    }
  },
  {
    id: '002_add_belote_game',
    name: 'Add Belote game',
    description: 'Adds the Belote game to the database',
    up: async () => {
      await addGameIfNotExists(GAME_DEFINITIONS.belote);
    }
  }
];

// Run all pending migrations
export async function runGameMigrations(): Promise<void> {
  console.log('🔄 Running game migrations...');
  
  await initializeMigrationSystem();
  
  for (const migration of MIGRATIONS) {
    if (!(await isMigrationApplied(migration.id))) {
      console.log(`📦 Applying migration: ${migration.name}`);
      try {
        await migration.up();
        await markMigrationApplied(migration.id);
        console.log(`✅ Migration completed: ${migration.id}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.id}`, error);
        throw error;
      }
    } else {
      console.log(`⏭️ Migration already applied: ${migration.name}`);
    }
  }
  
  console.log('✅ All game migrations completed');
}

// Helper function to add new games (for future use)
export async function addNewGame(gameDefinition: GameDefinition): Promise<void> {
  await addGameIfNotExists(gameDefinition);
}

export { GAME_DEFINITIONS };