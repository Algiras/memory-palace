// Analytics & Usage Tracking System
// Tracks user interactions, retention metrics, and generates insights

const fs = require('fs').promises;
const path = require('path');

class AnalyticsTracker {
  constructor(config = {}) {
    this.config = {
      dataPath: config.dataPath || './analytics-data.json',
      enabled: config.enabled !== false,
      ...config
    };
    this.session = {
      startTime: Date.now(),
      events: [],
      palaceViews: new Map(),
      memoriesReviewed: [],
      commandsUsed: new Map()
    };
  }

  /**
   * Track an event
   */
  track(eventType, data = {}) {
    if (!this.config.enabled) return;
    
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: data,
      session: this.getSessionId()
    };
    
    this.session.events.push(event);
    
    // Update counters
    if (eventType === 'palace_view') {
      const count = this.session.palaceViews.get(data.palace) || 0;
      this.session.palaceViews.set(data.palace, count + 1);
    }
    
    if (eventType === 'memory_review') {
      this.session.memoriesReviewed.push(data.memoryId);
    }
    
    if (eventType === 'command') {
      const count = this.session.commandsUsed.get(data.command) || 0;
      this.session.commandsUsed.set(data.command, count + 1);
    }
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    if (!this._sessionId) {
      this._sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._sessionId;
  }

  /**
   * Generate usage report
   */
  generateReport(timeRange = '7d') {
    const now = Date.now();
    const range = this.parseTimeRange(timeRange);
    const cutoff = now - range;
    
    const events = this.session.events.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );
    
    return {
      timeRange,
      totalEvents: events.length,
      uniqueSessions: new Set(events.map(e => e.session)).size,
      commands: this.summarizeMap(this.session.commandsUsed),
      palaces: this.summarizeMap(this.session.palaceViews),
      memoriesReviewed: this.session.memoriesReviewed.length,
      sessionDuration: ((now - this.session.startTime) / 1000 / 60).toFixed(1) + ' minutes',
      
      // Derived metrics
      avgReviewsPerMinute: (this.session.memoriesReviewed.length / ((now - this.session.startTime) / 1000 / 60)).toFixed(2),
      mostUsedCommand: this.getTopItem(this.session.commandsUsed),
      mostViewedPalace: this.getTopItem(this.session.palaceViews)
    };
  }

  /**
   * Summarize a Map for reporting
   */
  summarizeMap(map) {
    const entries = Array.from(map.entries());
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        name: key,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }));
  }

  /**
   * Get top item from Map
   */
  getTopItem(map) {
    if (map.size === 0) return 'none';
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Parse time range string
   */
  parseTimeRange(range) {
    const units = {
      'd': 24 * 60 * 60 * 1000,
      'h': 60 * 60 * 1000,
      'm': 60 * 1000
    };
    
    const match = range.match(/^(\d+)([dhm])$/);
    if (match) {
      return parseInt(match[1]) * units[match[2]];
    }
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }

  /**
   * Generate retention analysis
   */
  generateRetentionAnalysis(palace) {
    const stats = {
      total: 0,
      reviewed: 0,
      strong: 0,
      weak: 0,
      neverReviewed: 0
    };
    
    palace.loci.forEach(locus => {
      (locus.memories || []).forEach(memory => {
        stats.total++;
        
        if (memory.lastRecalled) {
          stats.reviewed++;
          
          const daysSince = (Date.now() - new Date(memory.lastRecalled)) / (1000 * 60 * 60 * 24);
          
          if (memory.confidence >= 4 && daysSince < 14) {
            stats.strong++;
          } else if (memory.confidence <= 2 || daysSince > 30) {
            stats.weak++;
          }
        } else {
          stats.neverReviewed++;
        }
      });
    });
    
    return {
      ...stats,
      retention: ((stats.reviewed / stats.total) * 100).toFixed(1) + '%',
      strengthDistribution: {
        strong: ((stats.strong / stats.total) * 100).toFixed(1) + '%',
        weak: ((stats.weak / stats.total) * 100).toFixed(1) + '%',
        neverReviewed: ((stats.neverReviewed / stats.total) * 100).toFixed(1) + '%'
      },
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Generate personalized recommendations
   */
  generateRecommendations(stats) {
    const recs = [];
    
    if (stats.neverReviewed > stats.total * 0.3) {
      recs.push(`🔴 High priority: ${stats.neverReviewed} memories never reviewed. Start with: /memory-palace red-queen weak-spots`);
    }
    
    if (stats.weak > stats.total * 0.2) {
      recs.push(`🟡 ${stats.weak} weak memories identified. Consider reviewing this week.`);
    }
    
    if (stats.strong < stats.total * 0.3) {
      recs.push(`💪 Only ${stats.strong} strong memories. Keep reviewing to build mastery!`);
    }
    
    if (recs.length === 0) {
      recs.push(`✅ Palace is in good shape! ${stats.strong} strong memories. Keep up the good work!`);
    }
    
    return recs;
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport() {
    const report = this.generateReport('7d');
    
    console.log('\n📊 Weekly Usage Report');
    console.log('=' .repeat(60));
    console.log(`Period: ${report.timeRange}`);
    console.log(`Session Duration: ${report.sessionDuration}`);
    console.log(`\n🎯 Activity Summary`);
    console.log(`  Total Events: ${report.totalEvents}`);
    console.log(`  Memories Reviewed: ${report.memoriesReviewed}`);
    console.log(`  Avg Reviews/Min: ${report.avgReviewsPerMinute}`);
    console.log(`\n🔝 Most Used`);
    console.log(`  Command: ${report.mostUsedCommand}`);
    console.log(`  Palace: ${report.mostViewedPalace}`);
    
    if (report.commands.length > 0) {
      console.log(`\n📋 Commands Used`);
      report.commands.slice(0, 5).forEach(cmd => {
        console.log(`  ${cmd.name}: ${cmd.count} (${cmd.percentage}%)`);
      });
    }
    
    return report;
  }

  /**
   * Save analytics data
   */
  async save() {
    if (!this.config.enabled) return;
    
    const data = {
      timestamp: new Date().toISOString(),
      session: this.session,
      summary: this.generateReport('all')
    };
    
    await fs.writeFile(this.config.dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load historical analytics
   */
  async load() {
    try {
      const data = await fs.readFile(this.config.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
}

// Demo
async function demo() {
  const tracker = new AnalyticsTracker({ enabled: true });
  
  // Simulate user activity
  tracker.track('command', { command: 'list' });
  tracker.track('palace_view', { palace: 'System Design Citadel' });
  tracker.track('memory_review', { memoryId: 'sd-001', result: 'success' });
  tracker.track('memory_review', { memoryId: 'sd-002', result: 'partial' });
  tracker.track('command', { command: 'recall' });
  tracker.track('palace_view', { palace: 'System Design Citadel' });
  tracker.track('memory_review', { memoryId: 'sd-003', result: 'success' });
  tracker.track('command', { command: 'status' });
  
  // Generate reports
  tracker.generateWeeklyReport();
  
  // Save data
  await tracker.save();
  console.log('\n💾 Analytics saved');
}

if (require.main === module) {
  demo();
}

module.exports = { AnalyticsTracker };
