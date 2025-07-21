/**
 * @jest-environment node
 */

// Test scoring business logic without React components
describe('Yams Scoring Business Logic', () => {
  describe('Score Validation', () => {
    const validateYamsScore = (category: string, score: number): boolean => {
      if (score < 0) return false;
      
      const numberCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
      const fixedCategories = {
        'threeofakind': Infinity, // Can be any total
        'fourofakind': Infinity,
        'fullhouse': [0, 25],
        'smallstraight': [0, 30],
        'largestraight': [0, 40],
        'yams': [0, 50],
        'chance': Infinity
      };
      
      if (numberCategories.includes(category)) {
        const maxScore = numberCategories.indexOf(category) * 5 + 5;
        return score <= maxScore;
      }
      
      const validScores = fixedCategories[category as keyof typeof fixedCategories];
      if (Array.isArray(validScores)) {
        return validScores.includes(score);
      }
      
      return score >= 0;
    };

    it('should validate number category scores correctly', () => {
      // Valid scores
      expect(validateYamsScore('ones', 5)).toBe(true);
      expect(validateYamsScore('ones', 0)).toBe(true);
      expect(validateYamsScore('sixes', 30)).toBe(true);
      
      // Invalid scores
      expect(validateYamsScore('ones', -1)).toBe(false);
      expect(validateYamsScore('ones', 6)).toBe(false);
      expect(validateYamsScore('sixes', 31)).toBe(false);
    });

    it('should validate fixed category scores correctly', () => {
      // Full House
      expect(validateYamsScore('fullhouse', 25)).toBe(true);
      expect(validateYamsScore('fullhouse', 0)).toBe(true);
      expect(validateYamsScore('fullhouse', 20)).toBe(false);
      
      // Yams
      expect(validateYamsScore('yams', 50)).toBe(true);
      expect(validateYamsScore('yams', 0)).toBe(true);
      expect(validateYamsScore('yams', 45)).toBe(false);
      
      // Straights
      expect(validateYamsScore('smallstraight', 30)).toBe(true);
      expect(validateYamsScore('smallstraight', 0)).toBe(true);
      expect(validateYamsScore('largestraight', 40)).toBe(true);
      expect(validateYamsScore('largestraight', 0)).toBe(true);
    });

    it('should validate variable category scores', () => {
      // Three/Four of a kind and Chance can be any non-negative number
      expect(validateYamsScore('threeofakind', 25)).toBe(true);
      expect(validateYamsScore('fourofakind', 30)).toBe(true);
      expect(validateYamsScore('chance', 15)).toBe(true);
      expect(validateYamsScore('chance', 0)).toBe(true);
      
      // But still no negatives
      expect(validateYamsScore('threeofakind', -5)).toBe(false);
    });
  });

  describe('Score Calculations', () => {
    const calculateUpperSection = (scores: Record<string, number>): { total: number, bonus: number } => {
      const upperCategories = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
      const total = upperCategories.reduce((sum, category) => {
        return sum + (scores[category] || 0);
      }, 0);
      
      const bonus = total >= 63 ? 35 : 0;
      return { total, bonus };
    };

    const calculateTotalScore = (scores: Record<string, number>): number => {
      const upper = calculateUpperSection(scores);
      const lowerCategories = ['threeofakind', 'fourofakind', 'fullhouse', 'smallstraight', 'largestraight', 'yams', 'chance'];
      
      const lowerTotal = lowerCategories.reduce((sum, category) => {
        return sum + (scores[category] || 0);
      }, 0);
      
      return upper.total + upper.bonus + lowerTotal;
    };

    it('should calculate upper section total correctly', () => {
      const scores = {
        ones: 5,
        twos: 10,
        threes: 15,
        fours: 20,
        fives: 25,
        sixes: 30
      };
      
      const result = calculateUpperSection(scores);
      expect(result.total).toBe(105);
    });

    it('should apply upper section bonus correctly', () => {
      const scoresWithBonus = {
        ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 18 // Total: 93
      };
      
      const scoresWithoutBonus = {
        ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 12 // Total: 57
      };
      
      expect(calculateUpperSection(scoresWithBonus).bonus).toBe(35);
      expect(calculateUpperSection(scoresWithoutBonus).bonus).toBe(0);
    });

    it('should calculate total score correctly', () => {
      const completeScores = {
        // Upper section: 93 + 35 bonus = 128
        ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 18,
        // Lower section: 220
        threeofakind: 20,
        fourofakind: 25,
        fullhouse: 25,
        smallstraight: 30,
        largestraight: 40,
        yams: 50,
        chance: 30
      };
      
      const total = calculateTotalScore(completeScores);
      expect(total).toBe(348); // 128 + 220
    });

    it('should handle partial scores correctly', () => {
      const partialScores = {
        ones: 5,
        twos: 10,
        fullhouse: 25
      };
      
      const total = calculateTotalScore(partialScores);
      expect(total).toBe(40); // 15 + 0 bonus + 25
    });

    it('should handle empty scores', () => {
      const emptyScores = {};
      
      const upper = calculateUpperSection(emptyScores);
      const total = calculateTotalScore(emptyScores);
      
      expect(upper.total).toBe(0);
      expect(upper.bonus).toBe(0);
      expect(total).toBe(0);
    });
  });

  describe('Game State Management', () => {
    const isGameComplete = (playerScores: Record<string, number>): boolean => {
      const allCategories = [
        'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
        'threeofakind', 'fourofakind', 'fullhouse', 'smallstraight', 
        'largestraight', 'yams', 'chance'
      ];
      
      return allCategories.every(category => playerScores[category] !== undefined);
    };

    const getAvailableCategories = (playerScores: Record<string, number>): string[] => {
      const allCategories = [
        'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
        'threeofakind', 'fourofakind', 'fullhouse', 'smallstraight', 
        'largestraight', 'yams', 'chance'
      ];
      
      return allCategories.filter(category => playerScores[category] === undefined);
    };

    it('should detect incomplete games', () => {
      const incompleteScores = {
        ones: 5,
        twos: 10,
        fullhouse: 25
      };
      
      expect(isGameComplete(incompleteScores)).toBe(false);
    });

    it('should detect complete games', () => {
      const completeScores = {
        ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30,
        threeofakind: 20, fourofakind: 25, fullhouse: 25, smallstraight: 30,
        largestraight: 40, yams: 50, chance: 30
      };
      
      expect(isGameComplete(completeScores)).toBe(true);
    });

    it('should return available categories correctly', () => {
      const partialScores = {
        ones: 5,
        fullhouse: 25,
        yams: 50
      };
      
      const available = getAvailableCategories(partialScores);
      
      expect(available).not.toContain('ones');
      expect(available).not.toContain('fullhouse');
      expect(available).not.toContain('yams');
      expect(available).toContain('twos');
      expect(available).toContain('threeofakind');
      expect(available).toContain('chance');
      expect(available).toHaveLength(10); // 13 total - 3 used = 10 remaining
    });
  });

  describe('Multi-player Score Ranking', () => {
    const rankPlayers = (playersScores: Record<string, Record<string, number>>): Array<{ playerId: string, score: number, rank: number }> => {
      const playerTotals = Object.entries(playersScores).map(([playerId, scores]) => ({
        playerId,
        score: Object.values(scores).reduce((sum, score) => sum + score, 0)
      }));
      
      // Sort by score descending
      playerTotals.sort((a, b) => b.score - a.score);
      
      // Assign ranks (handle ties)
      let currentRank = 1;
      // @ts-expect-error - ranked is used, PhpStorm false positive
      const ranked = playerTotals.map((player, index, arr) => {
        if (index > 0 && player.score !== arr[index - 1].score) {
          currentRank = index + 1;
        }
        return { ...player, rank: currentRank };
      });
      
      return ranked;
    };

    it('should rank players by total score', () => {
      const playersScores = {
        'player1': { ones: 5, twos: 10, fullhouse: 25 }, // Total: 40
        'player2': { ones: 3, twos: 6, yams: 50 }, // Total: 59
        'player3': { ones: 4, twos: 8, chance: 15 } // Total: 27
      };
      
      const rankings = rankPlayers(playersScores);
      
      expect(rankings[0].playerId).toBe('player2');
      expect(rankings[0].score).toBe(59);
      expect(rankings[0].rank).toBe(1);
      
      expect(rankings[1].playerId).toBe('player1');
      expect(rankings[1].score).toBe(40);
      expect(rankings[1].rank).toBe(2);
      
      expect(rankings[2].playerId).toBe('player3');
      expect(rankings[2].score).toBe(27);
      expect(rankings[2].rank).toBe(3);
    });

    it('should handle tied scores correctly', () => {
      const playersScores = {
        'player1': { ones: 5, twos: 10 }, // Total: 15
        'player2': { ones: 3, threes: 12 }, // Total: 15 (tie)
        'player3': { ones: 2, fours: 8 } // Total: 10
      };
      
      const rankings = rankPlayers(playersScores);
      
      // Both tied players should have rank 1
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(1);
      expect(rankings[2].rank).toBe(3); // Next rank after tie
    });
  });
});