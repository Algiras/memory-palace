#!/usr/bin/env node
// Enhanced Palace Size Test - Hypothesis 003
// Realistic simulation with working memory limits and cognitive load

const { performance } = require('perf_hooks');

const CONFIG = {
  iterations: 100,
  memoriesPerLocus: 5,
  testQueries: 100,
  humanErrorRate: 0.15, // 15% chance of wrong turn
  memoryDecayRate: 0.1, // 10% memory fade per navigation
  timePressure: true // Adds realistic delays
};

// Working Memory Model (Miller's Law: 7±2)
class WorkingMemory {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = [];
    this.load = 0;
  }

  add(item) {
    if (this.items.length >= this.capacity) {
      // Forget oldest item (FIFO)
      this.items.shift();
      this.load++;
    }
    this.items.push(item);
  }

  has(item) {
    return this.items.includes(item);
  }

  clear() {
    this.items = [];
    this.load = 0;
  }

  getUtilization() {
    return this.items.length / this.capacity;
  }

  getForgottenCount() {
    return this.load;
  }
}

// Palace Architectures
const PALACES = {
  small: {
    name: 'Small (5 loci)',
    loci: 5,
    workingMemoryCapacity: 5, // Easy to hold entire palace
    structure: 'linear',
    complexity: 1,
    generate() {
      return Array.from({ length: 5 }, (_, i) => ({
        id: i,
        name: ['Entrance', 'Hallway', 'Kitchen', 'Living Room', 'Bedroom'][i],
        connections: i < 4 ? [i + 1] : [],
        memories: generateMemories(5, i)
      }));
    }
  },

  medium: {
    name: 'Medium (9 loci) - Miller Optimal',
    loci: 9,
    workingMemoryCapacity: 7, // Miller's 7±2
    structure: 'branched',
    complexity: 2,
    generate() {
      // 7±2 structure: Central hub with branches
      return [
        { id: 0, name: 'Entrance', connections: [1, 2], memories: generateMemories(5, 0) },
        { id: 1, name: 'Left Wing', connections: [0, 3, 4], memories: generateMemories(5, 1) },
        { id: 2, name: 'Right Wing', connections: [0, 5, 6], memories: generateMemories(5, 2) },
        { id: 3, name: 'Kitchen', connections: [1], memories: generateMemories(5, 3) },
        { id: 4, name: 'Dining', connections: [1], memories: generateMemories(5, 4) },
        { id: 5, name: 'Study', connections: [2], memories: generateMemories(5, 5) },
        { id: 6, name: 'Living Room', connections: [2, 7], memories: generateMemories(5, 6) },
        { id: 7, name: 'Bedroom', connections: [6, 8], memories: generateMemories(5, 7) },
        { id: 8, name: 'Bathroom', connections: [7], memories: generateMemories(5, 8) }
      ];
    }
  },

  large: {
    name: 'Large (15 loci) - Flat',
    loci: 15,
    workingMemoryCapacity: 7, // Miller's limit, palace exceeds it
    structure: 'linear_long',
    complexity: 3,
    generate() {
      // Long linear path - exceeds working memory
      return Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Room ${i + 1}`,
        connections: [
          ...(i > 0 ? [i - 1] : []),
          ...(i < 14 ? [i + 1] : [])
        ],
        memories: generateMemories(5, i)
      }));
    }
  },

  hierarchical: {
    name: 'Hierarchical (12+3 wings)',
    loci: 15, // 12 main + 3 wing entrances
    workingMemoryCapacity: 4, // 4 chunks: main + 3 wings
    structure: 'hierarchical',
    complexity: 2,
    generate() {
      // Chunked structure: Main wing (4) + 3 sub-wings (3 each) = 13 loci
      const loci = [];
      
      // Main wing (4 loci)
      for (let i = 0; i < 4; i++) {
        loci.push({
          id: i,
          name: `Main ${i + 1}`,
          wing: 'main',
          connections: [i + 1, 4, 7, 10].filter(c => c > i),
          memories: generateMemories(5, i)
        });
      }
      
      // 3 sub-wings (3 loci each)
      const wingNames = ['East', 'West', 'North'];
      wingNames.forEach((wing, w) => {
        const base = 4 + w * 3;
        for (let i = 0; i < 3; i++) {
          loci.push({
            id: base + i,
            name: `${wing} ${i + 1}`,
            wing: wing.toLowerCase(),
            connections: i < 2 ? [base + i + 1] : [],
            memories: generateMemories(5, base + i)
          });
        }
      });
      
      return loci;
    }
  }
};

function generateMemories(count, locusId) {
  return Array.from({ length: count }, (_, i) => ({
    id: `mem-${locusId}-${i}`,
    subject: `Topic ${locusId}-${i}`,
    strength: 0.5 + Math.random() * 0.5
  }));
}

// Human-like Navigator
class HumanNavigator {
  constructor(palace, palaceType) {
    this.palace = palace;
    this.type = palaceType;
    this.workingMemory = new WorkingMemory(PALACES[palaceType].workingMemoryCapacity);
    this.visits = new Set();
    this.wrongTurns = 0;
    this.backtracks = 0;
    this.decisionTime = 0;
  }

  navigateTo(targetLocusId) {
    const startTime = performance.now();
    this.workingMemory.clear();
    this.visits.clear();
    this.wrongTurns = 0;
    this.backtracks = 0;
    
    let current = this.palace[0]; // Start at entrance
    let steps = 0;
    const maxSteps = this.palace.length * 3;
    
    while (current.id !== targetLocusId && steps < maxSteps) {
      steps++;
      this.visits.add(current.id);
      this.workingMemory.add(current.id);
      
      // Decide next move (with human error)
      const next = this.decideNextMove(current, targetLocusId);
      
      if (!next) {
        // Lost! Need to backtrack
        this.backtracks++;
        // Return to last known good position or restart
        current = this.palace[0];
        this.workingMemory.clear();
      } else {
        if (this.visits.has(next.id)) {
          // Going in circles
          this.wrongTurns++;
        }
        current = next;
      }
    }
    
    const endTime = performance.now();
    this.decisionTime = endTime - startTime;
    
    return {
      found: current.id === targetLocusId,
      steps,
      wrongTurns: this.wrongTurns,
      backtracks: this.backtracks,
      time: this.decisionTime,
      workingMemoryUtilization: this.workingMemory.getUtilization(),
      memoryPressure: this.workingMemory.getForgottenCount(),
      visits: this.visits.size
    };
  }

  decideNextMove(current, targetId) {
    // Get valid connections
    const connections = current.connections
      .map(id => this.palace.find(l => l.id === id))
      .filter(Boolean);
    
    if (connections.length === 0) return null;
    
    // Calculate distance to target for each option
    const scored = connections.map(locus => ({
      locus,
      score: this.scoreMove(locus, targetId),
      isBacktrack: this.visits.has(locus.id)
    }));
    
    // Sort by score (higher = better)
    scored.sort((a, b) => b.score - a.score);
    
    // Human error: 15% chance to pick wrong direction
    if (Math.random() < CONFIG.humanErrorRate) {
      // Pick suboptimal choice
      if (scored.length > 1) {
        return scored[Math.floor(Math.random() * scored.length)].locus;
      }
    }
    
    // Miller's Law overflow: if working memory full, may forget path
    if (this.workingMemory.getUtilization() > 0.9 && Math.random() < 0.3) {
      // Random move due to cognitive overload
      return scored[Math.floor(Math.random() * scored.length)].locus;
    }
    
    return scored[0].locus;
  }

  scoreMove(locus, targetId) {
    let score = 100;
    
    // Prefer moving toward target (simplified: lower ID = closer to entrance)
    const distance = Math.abs(locus.id - targetId);
    score -= distance * 10;
    
    // Penalize backtracking
    if (this.visits.has(locus.id)) {
      score -= 50;
    }
    
    // Prefer unexplored areas
    if (!this.visits.has(locus.id)) {
      score += 20;
    }
    
    // Hierarchical bonus: prefer same wing
    if (this.type === 'hierarchical') {
      const target = this.palace.find(l => l.id === targetId);
      if (target && locus.wing === target.wing) {
        score += 30;
      }
    }
    
    return Math.max(0, score);
  }
}

// Test Runner
function testPalace(type) {
  const config = PALACES[type];
  const results = [];
  
  for (let iter = 0; iter < CONFIG.iterations; iter++) {
    const palace = config.generate();
    const navigator = new HumanNavigator(palace, type);
    const iterationResults = [];
    
    // Test random memory retrievals
    for (let q = 0; q < CONFIG.testQueries; q++) {
      const targetLocus = Math.floor(Math.random() * palace.length);
      const result = navigator.navigateTo(targetLocus);
      iterationResults.push(result);
    }
    
    results.push(iterationResults);
  }
  
  return analyzeResults(results, type);
}

function analyzeResults(allIterations, type) {
  const flat = allIterations.flat();
  
  const successful = flat.filter(r => r.found);
  const successRate = (successful.length / flat.length * 100).toFixed(1);
  
  const avgSteps = (successful.reduce((a, r) => a + r.steps, 0) / successful.length).toFixed(1);
  const avgWrongTurns = (flat.reduce((a, r) => a + r.wrongTurns, 0) / flat.length).toFixed(2);
  const avgBacktracks = (flat.reduce((a, r) => a + r.backtracks, 0) / flat.length).toFixed(2);
  const avgTime = (successful.reduce((a, r) => a + r.time, 0) / successful.length).toFixed(2);
  const avgMemoryUtil = (flat.reduce((a, r) => a + r.workingMemoryUtilization, 0) / flat.length * 100).toFixed(1);
  const avgMemoryPressure = (flat.reduce((a, r) => a + r.memoryPressure, 0) / flat.length).toFixed(1);
  const avgVisits = (successful.reduce((a, r) => a + r.visits, 0) / successful.length).toFixed(1);
  
  return {
    type,
    name: PALACES[type].name,
    loci: PALACES[type].loci,
    successRate,
    avgSteps,
    avgWrongTurns,
    avgBacktracks,
    avgTime,
    avgMemoryUtil,
    avgMemoryPressure,
    avgVisits,
    totalQueries: flat.length
  };
}

// Display
function displayResults(results) {
  console.log('\n🏛️ Palace Size Optimization - Enhanced Results');
  console.log('=' .repeat(80));
  console.log(`Iterations: ${CONFIG.iterations}, Queries: ${CONFIG.testQueries}`);
  console.log(`Human error rate: ${CONFIG.humanErrorRate * 100}%, Memory decay: ${CONFIG.memoryDecayRate * 100}%`);
  console.log();
  
  // Table header
  console.log('Palace              | Success | Steps | Wrong | Back  | Time  | WM%   | Press');
  console.log('-'.repeat(80));
  
  results.forEach(r => {
    console.log(
      `${r.name.padEnd(19)} | ${r.successRate.padStart(6)}% | ${r.avgSteps.padStart(5)} | ${r.avgWrongTurns.padStart(5)} | ${r.avgBacktracks.padStart(5)} | ${r.avgTime.padStart(5)}ms | ${r.avgMemoryUtil.padStart(5)}% | ${r.avgMemoryPressure.padStart(5)}`
    );
  });
  
  // Winner determination
  console.log('\n' + '='.repeat(80));
  console.log('🏆 ANALYSIS');
  console.log('-'.repeat(80));
  
  // Score each palace (higher = better)
  const scores = results.map(r => {
    const success = parseFloat(r.successRate);
    const efficiency = 100 - parseFloat(r.avgSteps) * 2; // Fewer steps = better
    const accuracy = 100 - (parseFloat(r.avgWrongTurns) + parseFloat(r.avgBacktracks)) * 10;
    const cognitive = 100 - parseFloat(r.avgMemoryUtil);
    
    return {
      ...r,
      score: success * 0.4 + efficiency * 0.25 + accuracy * 0.2 + cognitive * 0.15
    };
  });
  
  scores.sort((a, b) => b.score - a.score);
  
  scores.forEach((s, i) => {
    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${rank} ${s.name}: ${s.score.toFixed(1)} points`);
  });
  
  const winner = scores[0];
  const margin = scores[0].score - scores[1].score;
  
  console.log('\n📋 VERDICT:');
  if (margin > 20) {
    console.log(`✅ ${winner.name} WINS by ${margin.toFixed(0)} points`);
    if (winner.type === 'medium') {
      console.log('   🧪 Miller\'s Law (7±2) confirmed as optimal!');
    } else if (winner.type === 'hierarchical') {
      console.log('   🧠 Chunking overcomes working memory limits!');
    } else if (winner.type === 'small') {
      console.log('   📦 Small palaces most reliable but limited capacity');
    }
  } else {
    console.log('➡️  No clear winner - all viable depending on use case');
  }
  
  return scores;
}

// Main
function main() {
  console.log('🧬 Memory Palace - Hypothesis 003: Palace Size Optimization');
  console.log('Testing Miller\'s Law vs Chunking with realistic cognitive constraints\n');
  
  const types = ['small', 'medium', 'large', 'hierarchical'];
  const results = types.map(type => testPalace(type));
  
  const scores = displayResults(results);
  
  // Save
  const fs = require('fs');
  fs.writeFileSync(
    'stress-test-results-enhanced.json',
    JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      config: CONFIG, 
      results: scores 
    }, null, 2)
  );
  
  console.log('\n💾 Saved to stress-test-results-enhanced.json');
  console.log('✅ Evolution 003 Complete');
}

main();
