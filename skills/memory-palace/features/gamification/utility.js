// Pure Utility System - Implementation B
// Clean metrics without gamification

class UtilityTracker {
  constructor(userId, storage = null) {
    this.userId = userId;
    this.storage = storage || new Map();
  }

  /**
   * Get or initialize user stats
   */
  async getStats() {
    const key = `utility:${this.userId}`;
    let stats = await this.storage.get(key);
    
    if (!stats) {
      stats = {
        // Core metrics
        totalReviews: 0,
        totalMemories: 0,
        totalPalaces: 0,
        
        // Time tracking
        totalReviewTime: 0, // seconds
        averageReviewTime: 0,
        sessionCount: 0,
        
        // Performance metrics
        retentionRate: 0,
        memoriesPerMinute: 0,
        weakMemoriesCount: 0,
        strongMemoriesCount: 0,
        
        // Consistency metrics
        reviewsByDay: {}, // { "2026-01-01": 5, ... }
        activeDays: [],
        longestActiveStreak: 0,
        
        // Goals (user-defined)
        goals: [],
        
        // History (last 30 days)
        history: [],
        
        // Started date
        startedAt: new Date().toISOString()
      };
      await this.storage.set(key, stats);
    }
    
    return stats;
  }

  /**
   * Log a review event
   */
  async logReview(metadata = {}) {
    const stats = await this.getStats();
    const now = new Date();
    
    // Update counts
    stats.totalReviews++;
    
    // Track by day
    const dayKey = now.toISOString().split('T')[0];
    stats.reviewsByDay[dayKey] = (stats.reviewsByDay[dayKey] || 0) + 1;
    
    // Track active days
    if (!stats.activeDays.includes(dayKey)) {
      stats.activeDays.push(dayKey);
      stats.activeDays.sort();
      
      // Calculate streak
      stats.longestActiveStreak = this.calculateStreak(stats.activeDays);
    }
    
    // Calculate review time
    if (metadata.duration) {
      stats.totalReviewTime += metadata.duration;
      stats.averageReviewTime = stats.totalReviewTime / stats.totalReviews;
    }
    
    // Update retention rate if provided
    if (metadata.retentionRate !== undefined) {
      // Moving average
      const alpha = 0.1; // Weight for new data
      stats.retentionRate = (stats.retentionRate * (1 - alpha)) + (metadata.retentionRate * alpha);
    }
    
    // Log history
    stats.history.push({
      date: now.toISOString(),
      type: 'review',
      metadata
    });
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.history = stats.history.filter(h => new Date(h.date) > thirtyDaysAgo);
    
    await this.saveStats(stats);
    
    return {
      totalReviews: stats.totalReviews,
      reviewsToday: stats.reviewsByDay[dayKey],
      averageTime: stats.averageReviewTime,
      retentionRate: stats.retentionRate
    };
  }

  /**
   * Calculate longest streak from active days
   */
  calculateStreak(activeDays) {
    if (activeDays.length === 0) return 0;
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < activeDays.length; i++) {
      const prev = new Date(activeDays[i - 1]);
      const curr = new Date(activeDays[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24); // days
      
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  /**
   * Set a personal goal
   */
  async setGoal(goal) {
    const stats = await this.getStats();
    
    const newGoal = {
      id: `goal-${Date.now()}`,
      type: goal.type, // 'daily_reviews', 'weekly_memories', 'retention_rate'
      target: goal.target,
      deadline: goal.deadline,
      created: new Date().toISOString(),
      progress: 0,
      completed: false
    };
    
    stats.goals.push(newGoal);
    await this.saveStats(stats);
    
    return newGoal;
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId, progress) {
    const stats = await this.getStats();
    const goal = stats.goals.find(g => g.id === goalId);
    
    if (goal) {
      goal.progress = progress;
      goal.completed = progress >= goal.target;
      await this.saveStats(stats);
    }
    
    return goal;
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics() {
    const stats = await this.getStats();
    const now = new Date();
    const started = new Date(stats.startedAt);
    const daysActive = Math.max(1, (now - started) / (1000 * 60 * 60 * 24));
    
    return {
      // Speed metrics
      memoriesPerMinute: stats.totalReviews > 0 
        ? (stats.totalReviews / (stats.totalReviewTime / 60)).toFixed(2)
        : 0,
      averageReviewTime: stats.averageReviewTime.toFixed(1),
      
      // Consistency metrics
      reviewsPerDay: (stats.totalReviews / daysActive).toFixed(1),
      activeDaysPercent: ((stats.activeDays.length / daysActive) * 100).toFixed(1),
      longestStreak: stats.longestActiveStreak,
      
      // Quality metrics
      retentionRate: (stats.retentionRate * 100).toFixed(1),
      
      // Volume metrics
      totalReviews: stats.totalReviews,
      totalDaysActive: stats.activeDays.length
    };
  }

  /**
   * Check cognitive load
   */
  async checkCognitiveLoad(pendingReviews) {
    const stats = await this.getStats();
    const metrics = await this.getEfficiencyMetrics();
    
    const warnings = [];
    
    // Warning thresholds
    if (pendingReviews > 50) {
      warnings.push(`⚠️  High load: ${pendingReviews} reviews pending. Consider splitting into smaller sessions.`);
    }
    
    if (metrics.reviewsPerDay > 20) {
      warnings.push(`⚠️  Pace warning: ${metrics.reviewsPerDay} reviews/day average. Risk of burnout.`);
    }
    
    if (stats.retentionRate < 0.6 && stats.totalReviews > 20) {
      warnings.push(`⚠️  Retention low: ${(stats.retentionRate * 100).toFixed(0)}%. Consider reviewing weak memories more frequently.`);
    }
    
    return {
      load: pendingReviews,
      warnings,
      healthy: warnings.length === 0
    };
  }

  /**
   * Generate status report
   */
  async generateStatus() {
    const stats = await this.getStats();
    const metrics = await this.getEfficiencyMetrics();
    
    let display = `\n📊 UTILITY DASHBOARD\n`;
    display += `═`.repeat(50) + `\n\n`;
    
    // Core stats
    display += `📈 Performance Metrics\n`;
    display += `  Total Reviews: ${stats.totalReviews.toLocaleString()}\n`;
    display += `  Retention Rate: ${metrics.retentionRate}%\n`;
    display += `  Memories/Minute: ${metrics.memoriesPerMinute}\n`;
    display += `  Avg Review Time: ${metrics.averageReviewTime}s\n\n`;
    
    // Consistency
    display += `📅 Consistency\n`;
    display += `  Active Days: ${metrics.totalDaysActive}\n`;
    display += `  Reviews/Day: ${metrics.reviewsPerDay}\n`;
    display += `  Longest Streak: ${metrics.longestStreak} days\n`;
    display += `  Consistency: ${metrics.activeDaysPercent}%\n\n`;
    
    // Recent activity
    const last7Days = this.getLastNDays(stats, 7);
    const last30Days = this.getLastNDays(stats, 30);
    
    display += `📊 Recent Activity\n`;
    display += `  Last 7 days: ${last7Days} reviews\n`;
    display += `  Last 30 days: ${last30Days} reviews\n\n`;
    
    // Goals
    if (stats.goals.length > 0) {
      display += `🎯 Active Goals\n`;
      stats.goals.filter(g => !g.completed).forEach(goal => {
        const pct = (goal.progress / goal.target * 100).toFixed(0);
        display += `  ${goal.type}: ${goal.progress}/${goal.target} (${pct}%)\n`;
      });
      display += `\n`;
    }
    
    // Efficiency assessment
    display += `⚡ Efficiency Assessment\n`;
    if (metrics.memoriesPerMinute > 5) {
      display += `  ✅ High speed: ${metrics.memoriesPerMinute} mem/min\n`;
    } else if (metrics.memoriesPerMinute > 2) {
      display += `  ⚠️  Moderate speed: ${metrics.memoriesPerMinute} mem/min\n`;
    } else {
      display += `  🔴 Low speed: ${metrics.memoriesPerMinute} mem/min\n`;
    }
    
    if (stats.retentionRate > 0.8) {
      display += `  ✅ Excellent retention\n`;
    } else if (stats.retentionRate > 0.6) {
      display += `  ⚠️  Good retention, room for improvement\n`;
    } else {
      display += `  🔴 Retention needs work\n`;
    }
    
    return display;
  }

  /**
   * Get reviews from last N days
   */
  getLastNDays(stats, n) {
    const dates = Object.keys(stats.reviewsByDay);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - n);
    
    return dates
      .filter(d => new Date(d) > cutoff)
      .reduce((sum, d) => sum + stats.reviewsByDay[d], 0);
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport() {
    const stats = await this.getStats();
    const metrics = await this.getEfficiencyMetrics();
    
    const weekReviews = this.getLastNDays(stats, 7);
    const prevWeekReviews = this.getLastNDays(stats, 14) - weekReviews;
    const weekChange = prevWeekReviews > 0 
      ? ((weekReviews - prevWeekReviews) / prevWeekReviews * 100).toFixed(0)
      : 0;
    
    return {
      period: 'Last 7 days',
      reviews: weekReviews,
      change: weekChange,
      dailyAverage: (weekReviews / 7).toFixed(1),
      retention: metrics.retentionRate,
      speed: metrics.memoriesPerMinute,
      consistency: metrics.activeDaysPercent,
      recommendations: this.generateRecommendations(stats, metrics)
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(stats, metrics) {
    const recs = [];
    
    if (metrics.reviewsPerDay < 3) {
      recs.push(`💡 Low activity detected. Try reviewing at least 5 memories daily to build consistency.`);
    }
    
    if (stats.retentionRate < 0.6) {
      recs.push(`🎯 Focus on weak memories. Run: /memory-palace red-queen weak-spots`);
    }
    
    if (metrics.memoriesPerMinute < 3) {
      recs.push(`⚡ Speed up reviews. Consider using /memory-palace recall for rapid testing.`);
    }
    
    if (stats.totalReviews > 100 && stats.retentionRate > 0.8) {
      recs.push(`🏆 Excellent performance! You're ready for advanced techniques.`);
    }
    
    return recs;
  }

  /**
   * Save stats
   */
  async saveStats(stats) {
    const key = `utility:${this.userId}`;
    await this.storage.set(key, stats);
  }
}

// Demo
async function demo() {
  console.log('📊 Pure Utility System Demo\n');
  
  const tracker = new UtilityTracker('demo-user');
  
  // Simulate user activity
  console.log('Simulating user activity...\n');
  
  // Log reviews
  await tracker.logReview({ duration: 5, retentionRate: 0.8 });
  console.log(`✅ Review logged (5s, 80% retention)`);
  
  await tracker.logReview({ duration: 3, retentionRate: 0.9 });
  console.log(`✅ Review logged (3s, 90% retention)`);
  
  await tracker.logReview({ duration: 7, retentionRate: 0.6 });
  console.log(`✅ Review logged (7s, 60% retention)`);
  
  // Set a goal
  const goal = await tracker.setGoal({
    type: 'daily_reviews',
    target: 10,
    deadline: '2026-02-28'
  });
  console.log(`\n🎯 Set goal: ${goal.target} daily reviews`);
  
  // Update goal progress
  await tracker.updateGoalProgress(goal.id, 3);
  console.log(`   Progress: 3/${goal.target}`);
  
  // Check efficiency
  const efficiency = await tracker.getEfficiencyMetrics();
  console.log(`\n⚡ Efficiency Metrics:`);
  console.log(`   Memories/Minute: ${efficiency.memoriesPerMinute}`);
  console.log(`   Retention Rate: ${efficiency.retentionRate}%`);
  console.log(`   Reviews/Day: ${efficiency.reviewsPerDay}`);
  
  // Check cognitive load
  const load = await tracker.checkCognitiveLoad(12);
  console.log(`\n🧠 Cognitive Load Check:`);
  console.log(`   Pending: ${load.load} reviews`);
  console.log(`   Healthy: ${load.healthy ? '✅' : '⚠️'}`);
  
  // Show status
  console.log('\n' + await tracker.generateStatus());
  
  // Weekly report
  const weekly = await tracker.generateWeeklyReport();
  console.log(`\n📅 Weekly Report`);
  console.log(`   Reviews: ${weekly.reviews} (${weekly.change > 0 ? '+' : ''}${weekly.change}%)`);
  console.log(`   Daily Avg: ${weekly.dailyAverage}`);
  if (weekly.recommendations.length > 0) {
    console.log(`   💡 ${weekly.recommendations[0]}`);
  }
}

if (require.main === module) {
  demo();
}

module.exports = { UtilityTracker };
