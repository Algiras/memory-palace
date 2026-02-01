// A/B Testing Framework for Gamification vs Utility
// Red Queen Protocol: Test both, measure objectively, keep winner

const { GamificationEngine } = require('./gamified');
const { UtilityTracker } = require('./utility');

class ABTestFramework {
  constructor(config = {}) {
    this.config = {
      testDuration: config.testDuration || 30, // days
      sampleSize: config.sampleSize || 200,
      significanceLevel: config.significanceLevel || 0.05,
      ...config
    };
    this.results = {
      gamified: [],
      utility: []
    };
  }

  /**
   * Randomly assign user to group
   */
  assignGroup(userId) {
    // Deterministic assignment based on userId hash
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return hash % 2 === 0 ? 'gamified' : 'utility';
  }

  /**
   * Create user simulation
   */
  createUser(userId, group) {
    const storage = new Map();
    
    if (group === 'gamified') {
      return {
        id: userId,
        group: 'gamified',
        engine: new GamificationEngine(userId, storage),
        type: this.getUserType(),
        activity: []
      };
    } else {
      return {
        id: userId,
        group: 'utility',
        engine: new UtilityTracker(userId, storage),
        type: this.getUserType(),
        activity: []
      };
    }
  }

  /**
   * Get random user type (affects engagement)
   */
  getUserType() {
    const types = ['casual', 'regular', 'power'];
    const weights = [0.5, 0.35, 0.15]; // 50% casual, 35% regular, 15% power
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) return types[i];
    }
    
    return 'casual';
  }

  /**
   * Simulate user activity over test period
   */
  async simulateUser(user) {
    const days = this.config.testDuration;
    let totalReviews = 0;
    let dailyReviews = 0;
    let streak = 0;
    let maxStreak = 0;
    let lastActiveDay = -1;
    let satisfaction = 3; // Base satisfaction 1-5
    
    for (let day = 0; day < days; day++) {
      // Determine activity based on user type
      const activity = this.simulateDayActivity(user.type, day, streak);
      
      if (activity.reviews > 0) {
        dailyReviews = activity.reviews;
        totalReviews += activity.reviews;
        
        // Track streak
        if (day === lastActiveDay + 1) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 1;
        }
        lastActiveDay = day;
        
        // Perform reviews
        for (let i = 0; i < activity.reviews; i++) {
          if (user.group === 'gamified') {
            const result = await user.engine.awardXP(activity.perfect ? 'perfectRecall' : 'review');
            // Gamification satisfaction boost
            if (result.newAchievements.length > 0) satisfaction += 0.3;
            if (result.leveledUp) satisfaction += 0.5;
          } else {
            await user.engine.logReview({
              duration: activity.duration,
              retentionRate: activity.retention
            });
            // Utility satisfaction from efficiency
            if (activity.retention > 0.8) satisfaction += 0.2;
          }
        }
      } else {
        streak = 0;
        // Small satisfaction penalty for missing day
        satisfaction -= 0.1;
      }
      
      // Clamp satisfaction
      satisfaction = Math.max(1, Math.min(5, satisfaction));
    }
    
    // Calculate final metrics
    const activeDays = user.group === 'gamified' 
      ? (await user.engine.getStats()).totalReviews > 0 ? Math.min(days, lastActiveDay + 1) : 0
      : (await user.engine.getStats()).activeDays.length;
    
    return {
      userId: user.id,
      group: user.group,
      userType: user.type,
      totalReviews,
      activeDays,
      maxStreak,
      avgDailyReviews: totalReviews / days,
      retention: activeDays / days, // % of days they used the app
      satisfaction: Math.round(satisfaction * 10) / 10,
      completion: totalReviews > 0 ? 100 : 0 // % who did at least one review
    };
  }

  /**
   * Simulate a single day's activity
   */
  simulateDayActivity(userType, day, currentStreak) {
    const baseProb = {
      'casual': 0.3,    // 30% chance to use app
      'regular': 0.7,   // 70% chance
      'power': 0.95     // 95% chance
    }[userType];
    
    // Streak bonus increases probability
    const streakBonus = Math.min(currentStreak * 0.05, 0.2);
    const useApp = Math.random() < (baseProb + streakBonus);
    
    if (!useApp) {
      return { reviews: 0 };
    }
    
    // Number of reviews based on user type
    const reviews = {
      'casual': Math.floor(Math.random() * 3) + 1,      // 1-3
      'regular': Math.floor(Math.random() * 8) + 3,     // 3-10
      'power': Math.floor(Math.random() * 15) + 10     // 10-25
    }[userType];
    
    return {
      reviews,
      duration: Math.random() * 10 + 2,    // 2-12 seconds per review
      retention: Math.random() * 0.4 + 0.5, // 50-90% retention
      perfect: Math.random() > 0.7           // 30% perfect recalls
    };
  }

  /**
   * Run full A/B test
   */
  async runTest() {
    console.log('🔴 RED QUEEN: Gamification vs Utility A/B Test');
    console.log('=' .repeat(70));
    console.log(`Sample Size: ${this.config.sampleSize} users`);
    console.log(`Test Duration: ${this.config.testDuration} days`);
    console.log(`Significance Level: ${this.config.significanceLevel}`);
    console.log();
    
    // Generate and simulate users
    for (let i = 0; i < this.config.sampleSize; i++) {
      const userId = `user-${i}`;
      const group = this.assignGroup(userId);
      const user = this.createUser(userId, group);
      
      const result = await this.simulateUser(user);
      this.results[group].push(result);
      
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${this.config.sampleSize} users simulated...`);
      }
    }
    
    console.log('\n✅ Simulation complete\n');
    
    // Analyze results
    return this.analyzeResults();
  }

  /**
   * Analyze and compare results
   */
  analyzeResults() {
    const gamified = this.results.gamified;
    const utility = this.results.utility;
    
    // Calculate metrics
    const metrics = {
      gamified: this.calculateMetrics(gamified),
      utility: this.calculateMetrics(utility)
    };
    
    // Compare
    const comparison = this.compareMetrics(metrics);
    
    // Display results
    this.displayResults(metrics, comparison);
    
    // Statistical significance
    const significant = this.checkSignificance(gamified, utility);
    
    // Verdict
    const verdict = this.generateVerdict(comparison, significant);
    
    return {
      metrics,
      comparison,
      significant,
      verdict,
      recommendation: verdict.recommendation
    };
  }

  /**
   * Calculate aggregate metrics
   */
  calculateMetrics(users) {
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    return {
      totalReviews: avg(users.map(u => u.totalReviews)),
      activeDays: avg(users.map(u => u.activeDays)),
      retention: avg(users.map(u => u.retention)) * 100,
      satisfaction: avg(users.map(u => u.satisfaction)),
      completion: (users.filter(u => u.completion === 100).length / users.length) * 100,
      maxStreak: avg(users.map(u => u.maxStreak))
    };
  }

  /**
   * Compare metrics between groups
   */
  compareMetrics(metrics) {
    const diff = (a, b) => ((a - b) / b * 100).toFixed(1);
    
    return {
      totalReviews: {
        gamified: metrics.gamified.totalReviews.toFixed(1),
        utility: metrics.utility.totalReviews.toFixed(1),
        difference: diff(metrics.gamified.totalReviews, metrics.utility.totalReviews)
      },
      retention: {
        gamified: metrics.gamified.retention.toFixed(1),
        utility: metrics.utility.retention.toFixed(1),
        difference: diff(metrics.gamified.retention, metrics.utility.retention)
      },
      satisfaction: {
        gamified: metrics.gamified.satisfaction.toFixed(2),
        utility: metrics.utility.satisfaction.toFixed(2),
        difference: diff(metrics.gamified.satisfaction, metrics.utility.satisfaction)
      },
      completion: {
        gamified: metrics.gamified.completion.toFixed(1),
        utility: metrics.utility.completion.toFixed(1),
        difference: diff(metrics.gamified.completion, metrics.utility.completion)
      }
    };
  }

  /**
   * Display comparison table
   */
  displayResults(metrics, comparison) {
    console.log('📊 RESULTS COMPARISON');
    console.log('=' .repeat(70));
    console.log('Metric              Gamified    Utility     Difference');
    console.log('─'.repeat(70));
    console.log(`Total Reviews       ${comparison.totalReviews.gamified.padStart(8)}  ${comparison.totalReviews.utility.padStart(8)}  ${comparison.totalReviews.difference.padStart(8)}%`);
    console.log(`Retention Rate      ${comparison.retention.gamified.padStart(8)}% ${comparison.retention.utility.padStart(8)}% ${comparison.retention.difference.padStart(8)}%`);
    console.log(`Satisfaction        ${comparison.satisfaction.gamified.padStart(8)}   ${comparison.satisfaction.utility.padStart(8)}   ${comparison.satisfaction.difference.padStart(8)}%`);
    console.log(`Completion Rate     ${comparison.completion.gamified.padStart(8)}% ${comparison.completion.utility.padStart(8)}% ${comparison.completion.difference.padStart(8)}%`);
    console.log();
  }

  /**
   * Check statistical significance
   */
  checkSignificance(gamified, utility) {
    // Simplified t-test check
    const gReviews = gamified.map(u => u.totalReviews);
    const uReviews = utility.map(u => u.totalReviews);
    
    const gMean = gReviews.reduce((a, b) => a + b, 0) / gReviews.length;
    const uMean = uReviews.reduce((a, b) => a + b, 0) / uReviews.length;
    
    const gStd = Math.sqrt(gReviews.reduce((sq, n) => sq + Math.pow(n - gMean, 2), 0) / gReviews.length);
    const uStd = Math.sqrt(uReviews.reduce((sq, n) => sq + Math.pow(n - uMean, 2), 0) / uReviews.length);
    
    // Simplified: if means differ by more than 2x combined std dev, it's significant
    const pooledStd = Math.sqrt((gStd * gStd + uStd * uStd) / 2);
    const difference = Math.abs(gMean - uMean);
    
    return difference > (2 * pooledStd);
  }

  /**
   * Generate verdict
   */
  generateVerdict(comparison, significant) {
    const reviewDiff = parseFloat(comparison.totalReviews.difference);
    const satDiff = parseFloat(comparison.satisfaction.difference);
    
    let verdict, recommendation;
    
    if (significant && reviewDiff > 20 && satDiff > -5) {
      verdict = '✅ GAMIFICATION WINS';
      recommendation = 'Deploy gamification as default. 20%+ engagement increase with acceptable satisfaction.';
    } else if (significant && satDiff > 10) {
      verdict = '✅ UTILITY WINS';
      recommendation = 'Deploy utility as default. Superior satisfaction outweighs engagement difference.';
    } else if (Math.abs(reviewDiff) < 10 && Math.abs(satDiff) < 5) {
      verdict = '➡️  NO SIGNIFICANT DIFFERENCE';
      recommendation = 'User preference varies. Implement toggle: gamification default, utility option.';
    } else {
      verdict = '⚠️  HYBRID RECOMMENDED';
      recommendation = 'Gamification for beginners (< 1 month), utility for advanced users. Auto-switch at 30 days.';
    }
    
    console.log(`🏆 VERDICT: ${verdict}`);
    console.log(`💡 Recommendation: ${recommendation}`);
    console.log();
    
    return { verdict, recommendation };
  }
}

// Run the test
async function runRedQueenTest() {
  const test = new ABTestFramework({
    sampleSize: 200,
    testDuration: 30
  });
  
  const results = await test.runTest();
  
  // Save results
  const fs = require('fs').promises;
  await fs.writeFile(
    'ab-test-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('💾 Results saved to ab-test-results.json');
  console.log('\n✅ Red Queen Protocol: Evolution 008 Test Complete');
}

if (require.main === module) {
  runRedQueenTest();
}

module.exports = { ABTestFramework };
