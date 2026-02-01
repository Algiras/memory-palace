// Memory Strength Visualization Dashboard
// Provides heat maps, progress tracking, and palace health metrics

const fs = require('fs').promises;

class MemoryVisualization {
  constructor(palaceData) {
    this.palace = palaceData;
    this.colors = {
      strong: '\x1b[32m',    // Green
      moderate: '\x1b[33m',  // Yellow  
      weak: '\x1b[31m',      // Red
      reset: '\x1b[0m'
    };
  }

  /**
   * Calculate memory strength score (0-100)
   */
  calculateStrength(memory) {
    let score = 50; // Base
    
    // Confidence boost
    if (memory.confidence) {
      score += (memory.confidence - 3) * 10;
    }
    
    // Recall history boost
    if (memory.recallCount) {
      score += Math.min(memory.recallCount * 5, 25);
    }
    
    // Recency penalty/boost
    if (memory.lastRecalled) {
      const daysSince = (Date.now() - new Date(memory.lastRecalled)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 10;
      else if (daysSince > 30) score -= 20;
    } else {
      // Never recalled = weak
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get strength category
   */
  getCategory(score) {
    if (score >= 70) return 'strong';
    if (score >= 40) return 'moderate';
    return 'weak';
  }

  /**
   * Generate heat map visualization
   */
  generateHeatMap() {
    console.log(`\n🗺️  ${this.palace.name} - Memory Heat Map`);
    console.log('=' .repeat(70));
    
    let totalMemories = 0;
    let strongCount = 0;
    let moderateCount = 0;
    let weakCount = 0;
    
    this.palace.loci.forEach(locus => {
      console.log(`\n📍 ${locus.name}`);
      console.log('─'.repeat(70));
      
      if (!locus.memories || locus.memories.length === 0) {
        console.log('  (empty)');
        return;
      }
      
      locus.memories.forEach(memory => {
        const strength = this.calculateStrength(memory);
        const category = this.getCategory(strength);
        const color = this.colors[category];
        const reset = this.colors.reset;
        
        // Visual indicator
        const barLength = Math.round(strength / 5);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        
        console.log(`${color}  ${bar} ${strength.toString().padStart(3)}% ${reset} ${memory.subject.substring(0, 40)}`);
        
        totalMemories++;
        if (category === 'strong') strongCount++;
        else if (category === 'moderate') moderateCount++;
        else weakCount++;
      });
    });
    
    // Summary
    console.log('\n📊 Summary');
    console.log('─'.repeat(70));
    const strongPct = (strongCount / totalMemories * 100).toFixed(1);
    const moderatePct = (moderateCount / totalMemories * 100).toFixed(1);
    const weakPct = (weakCount / totalMemories * 100).toFixed(1);
    
    console.log(`  ${this.colors.strong}█ Strong${this.colors.reset}    : ${strongCount.toString().padStart(3)} (${strongPct}%)`);
    console.log(`  ${this.colors.moderate}█ Moderate${this.colors.reset}  : ${moderateCount.toString().padStart(3)} (${moderatePct}%)`);
    console.log(`  ${this.colors.weak}█ Weak${this.colors.reset}      : ${weakCount.toString().padStart(3)} (${weakPct}%)`);
    console.log(`  Total: ${totalMemories} memories`);
    
    return {
      total: totalMemories,
      strong: strongCount,
      moderate: moderateCount,
      weak: weakCount,
      health: (strongCount / totalMemories * 100).toFixed(1)
    };
  }

  /**
   * Generate ASCII palace map
   */
  generatePalaceMap() {
    console.log(`\n🏛️  ${this.palace.name} - Palace Map`);
    console.log('=' .repeat(70));
    
    this.palace.loci.forEach((locus, i) => {
      // Calculate locus health
      const memories = locus.memories || [];
      if (memories.length === 0) {
        console.log(`[${i + 1}] ${locus.name.padEnd(20)} ⚪ Empty`);
        return;
      }
      
      const avgStrength = memories.reduce((sum, m) => sum + this.calculateStrength(m), 0) / memories.length;
      const category = this.getCategory(avgStrength);
      
      const icons = {
        strong: '🟢',
        moderate: '🟡',
        weak: '🔴'
      };
      
      console.log(`${icons[category]} [${i + 1}] ${locus.name.padEnd(20)} ${avgStrength.toFixed(0)}% (${memories.length} memories)`);
      
      // Show connections
      if (locus.children && locus.children.length > 0) {
        console.log(`    └──→ ${locus.children.join(', ')}`);
      }
    });
  }

  /**
   * Generate progress dashboard
   */
  generateDashboard() {
    console.log(`\n📈 ${this.palace.name} - Progress Dashboard`);
    console.log('=' .repeat(70));
    
    const stats = {
      totalMemories: 0,
      reviewed: 0,
      due: 0,
      neverReviewed: 0,
      avgConfidence: 0
    };
    
    this.palace.loci.forEach(locus => {
      (locus.memories || []).forEach(memory => {
        stats.totalMemories++;
        
        if (memory.lastRecalled) {
          stats.reviewed++;
          
          const daysSince = (Date.now() - new Date(memory.lastRecalled)) / (1000 * 60 * 60 * 24);
          // Due if > 7 days (simplified Fibonacci)
          if (daysSince > 7) stats.due++;
        } else {
          stats.neverReviewed++;
        }
        
        if (memory.confidence) {
          stats.avgConfidence += memory.confidence;
        }
      });
    });
    
    stats.avgConfidence = stats.avgConfidence / stats.totalMemories;
    
    // Progress bars
    const drawBar = (label, value, max, color) => {
      const pct = Math.min(100, (value / max) * 100);
      const filled = Math.round(pct / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      console.log(`${label.padEnd(15)} ${bar} ${value}/${max} (${pct.toFixed(0)}%)`);
    };
    
    console.log('\n📚 Memory Statistics');
    drawBar('Reviewed', stats.reviewed, stats.totalMemories, 'green');
    drawBar('Due for Review', stats.due, stats.totalMemories, 'yellow');
    drawBar('Never Reviewed', stats.neverReviewed, stats.totalMemories, 'red');
    
    console.log(`\n💪 Average Confidence: ${stats.avgConfidence.toFixed(1)}/5.0`);
    
    // Mastery estimate
    const mastery = (stats.reviewed / stats.totalMemories * stats.avgConfidence / 5 * 100).toFixed(0);
    console.log(`🏆 Estimated Mastery: ${mastery}%`);
    
    return stats;
  }

  /**
   * Generate review priority list
   */
  generateReviewList(limit = 10) {
    console.log(`\n🔴 Priority Reviews - Top ${limit}`);
    console.log('=' .repeat(70));
    
    const allMemories = [];
    
    this.palace.loci.forEach(locus => {
      (locus.memories || []).forEach(memory => {
        const strength = this.calculateStrength(memory);
        allMemories.push({
          locus: locus.name,
          memory: memory,
          strength: strength,
          priority: 100 - strength
        });
      });
    });
    
    // Sort by priority (lowest strength first)
    allMemories.sort((a, b) => b.priority - a.priority);
    
    allMemories.slice(0, limit).forEach((item, i) => {
      const color = item.strength < 40 ? '\x1b[31m' : item.strength < 70 ? '\x1b[33m' : '\x1b[32m';
      console.log(`${color}${(i + 1).toString().padStart(2)}. ${item.strength.toFixed(0)}% ${item.locus.padEnd(15)} ${item.memory.subject.substring(0, 35)}\x1b[0m`);
    });
  }
}

// Demo with actual palace data
async function demo() {
  try {
    const data = await fs.readFile('./skills/memory-palace/palaces/system-design-citadel.json', 'utf8');
    const palace = JSON.parse(data);
    
    const viz = new MemoryVisualization(palace);
    
    viz.generateHeatMap();
    viz.generatePalaceMap();
    viz.generateDashboard();
    viz.generateReviewList(10);
    
  } catch (e) {
    console.error('Error:', e.message);
    
    // Demo with mock data
    console.log('\n🎭 Running with demo data...\n');
    const mockPalace = {
      name: 'Demo Palace',
      loci: [
        {
          name: 'Entrance',
          memories: [
            { subject: 'Memory 1', confidence: 5, recallCount: 5, lastRecalled: new Date().toISOString() },
            { subject: 'Memory 2', confidence: 3, recallCount: 2, lastRecalled: '2026-01-15' },
            { subject: 'Memory 3', confidence: 1, recallCount: 0 },
            { subject: 'Memory 4', confidence: 4, recallCount: 3, lastRecalled: '2026-01-20' },
            { subject: 'Memory 5', confidence: 2, recallCount: 1, lastRecalled: '2026-01-10' }
          ]
        },
        {
          name: 'Hallway',
          memories: [
            { subject: 'Memory 6', confidence: 5, recallCount: 4, lastRecalled: new Date().toISOString() },
            { subject: 'Memory 7', confidence: 3, recallCount: 2 },
            { subject: 'Memory 8', confidence: 4, recallCount: 3, lastRecalled: '2026-01-25' }
          ]
        }
      ]
    };
    
    const viz = new MemoryVisualization(mockPalace);
    viz.generateHeatMap();
    viz.generateDashboard();
  }
}

if (require.main === module) {
  demo();
}

module.exports = { MemoryVisualization };
