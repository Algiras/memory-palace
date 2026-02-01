// Gamification System - Implementation A
// Points, streaks, achievements, levels

class GamificationEngine {
  constructor(userId, storage = null) {
    this.userId = userId;
    this.storage = storage || new Map();
    this.xpValues = {
      review: 10,
      perfectRecall: 20,
      newPalace: 50,
      newMemory: 15,
      dailyLogin: 5,
      streak7: 100,
      streak30: 500,
      sharePalace: 25
    };
    this.levelThresholds = [0, 100, 250, 500, 1000, 2000, 5000, 10000];
  }

  /**
   * Get or initialize user stats
   */
  async getStats() {
    const key = `gamification:${this.userId}`;
    let stats = await this.storage.get(key);
    
    if (!stats) {
      stats = {
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        lastReviewDate: null,
        totalReviews: 0,
        perfectRecalls: 0,
        achievements: [],
        history: []
      };
      await this.storage.set(key, stats);
    }
    
    return stats;
  }

  /**
   * Award XP for an action
   */
  async awardXP(action, metadata = {}) {
    const stats = await this.getStats();
    const baseXP = this.xpValues[action] || 0;
    let bonusXP = 0;
    
    // Streak bonus
    if (action === 'review' && stats.streak > 0) {
      bonusXP += Math.min(stats.streak * 2, 20); // +2 per streak day, max 20
    }
    
    // Perfect recall bonus already included in xpValues
    const totalXP = baseXP + bonusXP;
    
    // Update stats
    stats.xp += totalXP;
    stats.totalReviews++;
    
    if (action === 'perfectRecall') {
      stats.perfectRecalls++;
    }
    
    // Check for level up
    const newLevel = this.calculateLevel(stats.xp);
    const leveledUp = newLevel > stats.level;
    stats.level = newLevel;
    
    // Check streak
    const today = new Date().toDateString();
    const lastDate = stats.lastReviewDate ? new Date(stats.lastReviewDate).toDateString() : null;
    
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate === yesterday.toDateString()) {
        // Continuing streak
        stats.streak++;
        
        // Streak achievements
        if (stats.streak === 7) {
          await this.unlockAchievement(stats, 'week_streak');
          stats.xp += this.xpValues.streak7;
        } else if (stats.streak === 30) {
          await this.unlockAchievement(stats, 'month_streak');
          stats.xp += this.xpValues.streak30;
        }
      } else {
        // Streak broken
        if (stats.streak > stats.longestStreak) {
          stats.longestStreak = stats.streak;
        }
        stats.streak = 1;
      }
      
      stats.lastReviewDate = new Date().toISOString();
    }
    
    // Log history
    stats.history.push({
      date: new Date().toISOString(),
      action,
      xp: totalXP,
      metadata
    });
    
    // Trim history to last 100 entries
    if (stats.history.length > 100) {
      stats.history = stats.history.slice(-100);
    }
    
    // Check for new achievements
    const newAchievements = await this.checkAchievements(stats);
    
    await this.saveStats(stats);
    
    return {
      xpGained: totalXP,
      totalXP: stats.xp,
      level: stats.level,
      leveledUp,
      streak: stats.streak,
      newAchievements,
      progress: this.getProgress(stats)
    };
  }

  /**
   * Calculate level from XP
   */
  calculateLevel(xp) {
    for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= this.levelThresholds[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get progress to next level
   */
  getProgress(stats) {
    const currentLevel = stats.level;
    const nextThreshold = this.levelThresholds[currentLevel] || this.levelThresholds[this.levelThresholds.length - 1] * 2;
    const currentThreshold = this.levelThresholds[currentLevel - 1] || 0;
    const xpInLevel = stats.xp - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;
    const percentage = Math.min(100, (xpInLevel / xpNeeded) * 100);
    
    return {
      current: xpInLevel,
      needed: xpNeeded,
      percentage: Math.round(percentage),
      nextLevel: currentLevel + 1
    };
  }

  /**
   * Check and unlock achievements
   */
  async checkAchievements(stats) {
    const newAchievements = [];
    const achievements = this.getAchievementDefinitions();
    
    for (const achievement of achievements) {
      if (stats.achievements.includes(achievement.id)) continue;
      
      const unlocked = await achievement.check(stats);
      if (unlocked) {
        await this.unlockAchievement(stats, achievement.id);
        newAchievements.push(achievement);
      }
    }
    
    return newAchievements;
  }

  /**
   * Unlock an achievement
   */
  async unlockAchievement(stats, achievementId) {
    if (!stats.achievements.includes(achievementId)) {
      stats.achievements.push(achievementId);
      
      // Bonus XP for achievement
      stats.xp += 50;
      
      // Log it
      stats.history.push({
        date: new Date().toISOString(),
        action: 'achievement_unlocked',
        achievementId,
        xp: 50
      });
    }
  }

  /**
   * Achievement definitions
   */
  getAchievementDefinitions() {
    return [
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Review your first memory',
        icon: '🎯',
        check: (stats) => stats.totalReviews >= 1
      },
      {
        id: 'getting_warmer',
        name: 'Getting Warmer',
        description: 'Complete a 3-day streak',
        icon: '🔥',
        check: (stats) => stats.streak >= 3 || stats.longestStreak >= 3
      },
      {
        id: 'week_streak',
        name: 'On Fire',
        description: 'Complete a 7-day streak',
        icon: '🔥🔥',
        check: (stats) => stats.streak >= 7 || stats.longestStreak >= 7
      },
      {
        id: 'month_streak',
        name: 'Unstoppable',
        description: 'Complete a 30-day streak',
        icon: '🔥🔥🔥',
        check: (stats) => stats.streak >= 30 || stats.longestStreak >= 30
      },
      {
        id: 'perfect_memory',
        name: 'Perfect Memory',
        description: 'Achieve 10 perfect recalls',
        icon: '⭐',
        check: (stats) => stats.perfectRecalls >= 10
      },
      {
        id: 'novice',
        name: 'Novice',
        description: 'Reach level 2',
        icon: '🥉',
        check: (stats) => stats.level >= 2
      },
      {
        id: 'adept',
        name: 'Adept',
        description: 'Reach level 5',
        icon: '🥈',
        check: (stats) => stats.level >= 5
      },
      {
        id: 'master',
        name: 'Master',
        description: 'Reach level 10',
        icon: '🥇',
        check: (stats) => stats.level >= 10
      },
      {
        id: 'grandmaster',
        name: 'Grandmaster',
        description: 'Earn 10,000 XP',
        icon: '👑',
        check: (stats) => stats.xp >= 10000
      }
    ];
  }

  /**
   * Get leaderboard (mock implementation)
   */
  async getLeaderboard(limit = 10) {
    // In real implementation, fetch from database
    return [
      { rank: 1, name: 'Alice', xp: 12500, level: 12, streak: 45 },
      { rank: 2, name: 'Bob', xp: 9800, level: 10, streak: 12 },
      { rank: 3, name: 'Charlie', xp: 8200, level: 9, streak: 8 },
      // ...
    ].slice(0, limit);
  }

  /**
   * Generate status display
   */
  async generateStatus() {
    const stats = await this.getStats();
    const progress = this.getProgress(stats);
    
    const levelEmojis = ['🌱', '🌿', '🌳', '🏔️', '⭐', '🌟', '💫', '✨', '🔥', '👑'];
    const levelEmoji = levelEmojis[Math.min(stats.level - 1, levelEmojis.length - 1)];
    
    let display = `\n🎮 GAMIFICATION STATUS\n`;
    display += `═`.repeat(50) + `\n\n`;
    display += `${levelEmoji} Level ${stats.level}  `;
    display += `⭐ ${stats.xp.toLocaleString()} XP  `;
    display += `🔥 ${stats.streak} day streak\n\n`;
    
    // Progress bar
    const filled = Math.round(progress.percentage / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    display += `Progress to Level ${progress.nextLevel}:\n`;
    display += `${bar} ${progress.percentage}%\n`;
    display += `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP\n\n`;
    
    // Stats
    display += `📊 Stats:\n`;
    display += `  Total Reviews: ${stats.totalReviews}\n`;
    display += `  Perfect Recalls: ${stats.perfectRecalls}\n`;
    display += `  Longest Streak: ${stats.longestStreak} days\n`;
    display += `  Achievements: ${stats.achievements.length}/${this.getAchievementDefinitions().length}\n\n`;
    
    // Recent achievements
    if (stats.achievements.length > 0) {
      display += `🏆 Achievements:\n`;
      const achievements = this.getAchievementDefinitions();
      stats.achievements.slice(-5).forEach(id => {
        const ach = achievements.find(a => a.id === id);
        if (ach) {
          display += `  ${ach.icon} ${ach.name}\n`;
        }
      });
    }
    
    // Next achievement hint
    const nextAch = this.getNextAchievement(stats);
    if (nextAch) {
      display += `\n🎯 Next Achievement: ${nextAch.name}\n`;
      display += `   ${nextAch.description}\n`;
    }
    
    return display;
  }

  /**
   * Get next achievable achievement
   */
  getNextAchievement(stats) {
    const achievements = this.getAchievementDefinitions();
    return achievements.find(a => !stats.achievements.includes(a.id));
  }

  /**
   * Save stats
   */
  async saveStats(stats) {
    const key = `gamification:${this.userId}`;
    await this.storage.set(key, stats);
  }
}

// Demo
async function demo() {
  console.log('🎮 Gamification System Demo\n');
  
  const engine = new GamificationEngine('demo-user');
  
  // Simulate user activity
  console.log('Simulating user activity...\n');
  
  let result = await engine.awardXP('review', { memoryId: 'mem-1' });
  console.log(`✅ Reviewed memory: +${result.xpGained} XP`);
  console.log(`   Total: ${result.totalXP} XP | Level ${result.level} | Streak: ${result.streak}`);
  
  result = await engine.awardXP('perfectRecall', { memoryId: 'mem-2' });
  console.log(`\n⭐ Perfect recall: +${result.xpGained} XP`);
  if (result.newAchievements.length > 0) {
    result.newAchievements.forEach(ach => {
      console.log(`   🏆 Unlocked: ${ach.icon} ${ach.name}`);
    });
  }
  
  result = await engine.awardXP('newMemory', { palaceId: 'pal-1' });
  console.log(`\n💾 Added memory: +${result.xpGained} XP`);
  
  result = await engine.awardXP('newPalace');
  console.log(`\n🏛️ Created palace: +${result.xpGained} XP`);
  if (result.leveledUp) {
    console.log(`   🎉 LEVEL UP! Now Level ${result.level}`);
  }
  
  // Show final status
  console.log('\n' + await engine.generateStatus());
}

if (require.main === module) {
  demo();
}

module.exports = { GamificationEngine };
