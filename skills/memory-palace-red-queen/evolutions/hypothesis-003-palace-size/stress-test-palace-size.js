#!/usr/bin/env node
// Palace Size Optimization Test - Hypothesis 003
// Usage: node stress-test-palace-size.js [iterations]

const { performance } = require('perf_hooks');

// Test Configuration
const CONFIG = {
  iterations: parseInt(process.argv[2]) || 100,
  memoriesPerLocus: 5,
  testQueries: 50 // Number of recall attempts per palace
};

// Palace Structures
const PALACE_TYPES = {
  small: {
    name: 'Small (5 loci)',
    lociCount: 5,
    structure: 'linear',
    description: 'Single path, no branching',
    workingMemorySlots: 5
  },
  medium: {
    name: 'Medium (9 loci) - Miller Optimal',
    lociCount: 9,
    structure: 'linear_with_branches',
    description: 'Natural 9-room layout, minimal branching',
    workingMemorySlots: 9
  },
  large: {
    name: 'Large (15 loci) - Flat',
    lociCount: 15,
    structure: 'flat_linear',
    description: '15 rooms in single path, no hierarchy',
    workingMemorySlots: 15
  },
  hierarchical: {
    name: 'Hierarchical (12+3 wings)',
    lociCount: 12,
    extensionWings: 3,
    structure: 'hierarchical',
    description: '12 main + 3 extension wings (chunked)',
    workingMemorySlots: 4 // 4 chunks (main + 3 wings)
  }
};

// Generate Palace
function generatePalace(type) {
  const config = PALACE_TYPES[type];
  const loci = [];
  
  // Generate loci based on structure
  if (type === 'small') {
    const names = ['Entrance', 'Hallway', 'Kitchen', 'Living Room', 'Bedroom'];
    names.forEach((name, i) => {
      loci.push({
        id: `locus-${i}`,
        name,
        position: i,
        memories: generateMemories(CONFIG.memoriesPerLocus, name)
      });
    });
  } else if (type === 'medium') {
    const names = ['Entrance', 'Foyer-Left', 'Foyer-Right', 'Main Hall', 
                   'Kitchen', 'Dining', 'Living Room', 'Study', 'Bedroom'];
    names.forEach((name, i) => {
      loci.push({
        id: `locus-${i}`,
        name,
        position: i,
        parent: name.includes('Foyer') ? 'Entrance' : null,
        memories: generateMemories(CONFIG.memoriesPerLocus, name)
      });
    });
  } else if (type === 'large') {
    for (let i = 0; i < config.lociCount; i++) {
      loci.push({
        id: `locus-${i}`,
        name: `Room ${i + 1}`,
        position: i,
        memories: generateMemories(CONFIG.memoriesPerLocus, `Room ${i + 1}`)
      });
    }
  } else if (type === 'hierarchical') {
    // Main wing (12 loci)
    for (let i = 0; i < 12; i++) {
      loci.push({
        id: `main-${i}`,
        name: `Main ${i + 1}`,
        wing: 'main',
        position: i,
        memories: generateMemories(CONFIG.memoriesPerLocus, `Main ${i + 1}`)
      });
    }
    // Extension wings (3 wings, 3 loci each = 9 more, but we use 3 loci total)
    const wingNames = ['East', 'West', 'North'];
    wingNames.forEach((wing, w) => {
      for (let i = 0; i < 1; i++) { // 1 locus per wing for simplicity
        loci.push({
          id: `${wing.toLowerCase()}-${i}`,
          name: `${wing} Wing`,
          wing: wing.toLowerCase(),
          position: 12 + w,
          memories: generateMemories(CONFIG.memoriesPerLocus, `${wing} Wing`)
        });
      }
    });
  }
  
  return {
    type,
    config,
    loci,
    totalMemories: loci.length * CONFIG.memoriesPerLocus
  };
}

function generateMemories(count, locusName) {
  const memories = [];
  for (let i = 0; i < count; i++) {
    memories.push({
      id: `mem-${locusName}-${i}`,
      subject: `Topic ${locusName}-${i}`,
      content: `Content for ${locusName} memory ${i}`,
      difficulty: Math.random()
    });
  }
  return memories;
}

// Navigation Simulator
class PalaceNavigator {
  constructor(palace) {
    this.palace = palace;
    this.workingMemory = []; // Simulates human working memory
    this.workingMemoryLimit = palace.config.workingMemorySlots;
    this.navigationPath = [];
    this.wrongTurns = 0;
    this.backtracking = 0;
  }

  // Simulate navigating to find a memory
  navigateToMemory(targetMemoryId) {
    const startTime = performance.now();
    this.workingMemory = [];
    this.navigationPath = [];
    this.wrongTurns = 0;
    this.backtracking = 0;
    
    // Find which locus contains the target
    const targetLocus = this.palace.loci.find(l => 
      l.memories.some(m => m.id === targetMemoryId)
    );
    
    if (!targetLocus) {
      return { found: false, time: 0, path: [] };
    }
    
    // Simulate navigation based on palace structure
    let currentLocus = this.palace.loci[0];
    let steps = 0;
    const maxSteps = this.palace.loci.length * 2; // Prevent infinite loops
    
    while (currentLocus.id !== targetLocus.id && steps < maxSteps) {
      steps++;
      
      // Add current locus to working memory (if space)
      if (this.workingMemory.length < this.workingMemoryLimit) {
        this.workingMemory.push(currentLocus.id);
      } else {
        // Working memory full - must drop something (simulate forgetting path)
        this.workingMemory.shift();
        this.workingMemory.push(currentLocus.id);
      }
      
      this.navigationPath.push(currentLocus.name);
      
      // Decide next move
      const nextLocus = this.decideNextMove(currentLocus, targetLocus);
      
      if (nextLocus.id === currentLocus.id) {
        // Stuck or backtracking needed
        this.backtracking++;
        // Jump to entrance and start over (simulating getting lost)
        currentLocus = this.palace.loci[0];
      } else {
        if (!isMovingTowardTarget(currentLocus, nextLocus, targetLocus, this.palace)) {
          this.wrongTurns++;
        }
        currentLocus = nextLocus;
      }
    }
    
    const endTime = performance.now();
    
    return {
      found: currentLocus.id === targetLocus.id,
      time: endTime - startTime,
      path: this.navigationPath,
      steps: steps,
      wrongTurns: this.wrongTurns,
      backtracking: this.backtracking,
      workingMemoryFull: this.workingMemory.length >= this.workingMemoryLimit
    };
  }

  decideNextMove(current, target) {
    const currentIndex = this.palace.loci.findIndex(l => l.id === current.id);
    const targetIndex = this.palace.loci.findIndex(l => l.id === target.id);
    
    // Simple navigation: move toward target index
    if (currentIndex < targetIndex) {
      return this.palace.loci[Math.min(currentIndex + 1, this.palace.loci.length - 1)];
    } else if (currentIndex > targetIndex) {
      return this.palace.loci[Math.max(currentIndex - 1, 0)];
    }
    
    return current;
  }
}

function isMovingTowardTarget(current, next, target, palace) {
  const currentIdx = palace.loci.findIndex(l => l.id === current.id);
  const nextIdx = palace.loci.findIndex(l => l.id === next.id);
  const targetIdx = palace.loci.findIndex(l => l.id === target.id);
  
  return Math.abs(nextIdx - targetIdx) < Math.abs(currentIdx - targetIdx);
}

// Test Runner
function runPalaceTest(palaceType) {
  const palace = generatePalace(palaceType);
  const navigator = new PalaceNavigator(palace);
  
  const results = {
    palaceType,
    palaceConfig: palace.config,
    totalMemories: palace.totalMemories,
    queries: [],
    summary: {}
  };
  
  // Generate random query targets
  const allMemories = palace.loci.flatMap(l => l.memories);
  const targets = [];
  for (let i = 0; i < CONFIG.testQueries; i++) {
    targets.push(allMemories[Math.floor(Math.random() * allMemories.length)].id);
  }
  
  // Run navigation tests
  targets.forEach(targetId => {
    const result = navigator.navigateToMemory(targetId);
    results.queries.push(result);
  });
  
  // Calculate summary statistics
  const successful = results.queries.filter(q => q.found);
  const times = successful.map(q => q.time);
  const steps = successful.map(q => q.steps);
  const wrongTurns = results.queries.map(q => q.wrongTurns);
  const backtracks = results.queries.map(q => q.backtracking);
  
  results.summary = {
    successRate: (successful.length / CONFIG.testQueries * 100).toFixed(1),
    avgTime: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2) : 0,
    avgSteps: steps.length > 0 ? (steps.reduce((a, b) => a + b, 0) / steps.length).toFixed(1) : 0,
    avgWrongTurns: (wrongTurns.reduce((a, b) => a + b, 0) / CONFIG.testQueries).toFixed(2),
    avgBacktracks: (backtracks.reduce((a, b) => a + b, 0) / CONFIG.testQueries).toFixed(2),
    maxSteps: steps.length > 0 ? Math.max(...steps) : 0,
    workingMemoryPressure: results.queries.filter(q => q.workingMemoryFull).length
  };
  
  return results;
}

// Main Test Suite
function runFullTest() {
  console.log('🏛️ Memory Palace - Hypothesis 003: Palace Size Optimization');
  console.log('=' .repeat(70));
  console.log(`Iterations: ${CONFIG.iterations} runs per palace type`);
  console.log(`Test queries: ${CONFIG.testQueries} recall attempts`);
  console.log(`Memories per locus: ${CONFIG.memoriesPerLocus}`);
  console.log();

  const palaceTypes = ['small', 'medium', 'large', 'hierarchical'];
  const allResults = {};
  
  // Run tests for each palace type
  palaceTypes.forEach(type => {
    console.log(`\n🔍 Testing ${PALACE_TYPES[type].name}`);
    console.log('-' .repeat(70));
    
    const typeResults = [];
    for (let i = 0; i < CONFIG.iterations; i++) {
      typeResults.push(runPalaceTest(type));
    }
    
    // Aggregate results
    const aggregated = aggregateResults(typeResults);
    allResults[type] = aggregated;
    
    // Display results
    console.log(`  Loci: ${PALACE_TYPES[type].lociCount}`);
    console.log(`  Total memories: ${aggregated.totalMemories}`);
    console.log(`  Success rate: ${aggregated.summary.avgSuccessRate}%`);
    console.log(`  Avg time: ${aggregated.summary.avgTime}ms`);
    console.log(`  Avg steps: ${aggregated.summary.avgSteps}`);
    console.log(`  Wrong turns: ${aggregated.summary.avgWrongTurns}`);
    console.log(`  Backtracks: ${aggregated.summary.avgBacktracks}`);
    console.log(`  Working memory pressure: ${aggregated.summary.avgMemoryPressure}%`);
  });
  
  return allResults;
}

function aggregateResults(results) {
  const summary = {
    avgSuccessRate: (results.map(r => parseFloat(r.summary.successRate)).reduce((a, b) => a + b, 0) / results.length).toFixed(1),
    avgTime: (results.map(r => parseFloat(r.summary.avgTime)).reduce((a, b) => a + b, 0) / results.length).toFixed(2),
    avgSteps: (results.map(r => parseFloat(r.summary.avgSteps)).reduce((a, b) => a + b, 0) / results.length).toFixed(1),
    avgWrongTurns: (results.map(r => parseFloat(r.summary.avgWrongTurns)).reduce((a, b) => a + b, 0) / results.length).toFixed(2),
    avgBacktracks: (results.map(r => parseFloat(r.summary.avgBacktracks)).reduce((a, b) => a + b, 0) / results.length).toFixed(2),
    avgMemoryPressure: (results.map(r => r.summary.workingMemoryPressure).reduce((a, b) => a + b, 0) / results.length / CONFIG.testQueries * 100).toFixed(1)
  };
  
  return {
    palaceType: results[0].palaceType,
    totalMemories: results[0].totalMemories,
    summary
  };
}

// Display comparative analysis
function displayAnalysis(results) {
  console.log('\n\n📊 COMPARATIVE ANALYSIS');
  console.log('=' .repeat(70));
  
  const types = Object.keys(results);
  
  // Success Rate
  console.log('\n✅ SUCCESS RATE (higher is better)');
  console.log('-' .repeat(70));
  types.forEach(type => {
    const rate = results[type].summary.avgSuccessRate;
    const bar = '█'.repeat(Math.round(rate / 5)) + '░'.repeat(20 - Math.round(rate / 5));
    console.log(`${type.padEnd(15)} ${bar} ${rate}%`);
  });
  
  // Navigation Speed
  console.log('\n⚡ NAVIGATION SPEED (lower is better)');
  console.log('-' .repeat(70));
  types.forEach(type => {
    const time = parseFloat(results[type].summary.avgTime);
    const max = Math.max(...types.map(t => parseFloat(results[t].summary.avgTime)));
    const bar = '█'.repeat(Math.round((1 - time / max) * 20)) + '░'.repeat(Math.round(time / max * 20));
    console.log(`${type.padEnd(15)} ${bar} ${time}ms`);
  });
  
  // Wrong Turns
  console.log('\n🔄 WRONG TURNS (lower is better)');
  console.log('-' .repeat(70));
  types.forEach(type => {
    const wrong = parseFloat(results[type].summary.avgWrongTurns);
    const bar = '█'.repeat(Math.round(wrong * 5)) + '░'.repeat(Math.max(0, 20 - Math.round(wrong * 5)));
    console.log(`${type.padEnd(15)} ${bar} ${wrong}`);
  });
  
  // Working Memory Pressure
  console.log('\n🧠 WORKING MEMORY PRESSURE (lower is better)');
  console.log('-' .repeat(70));
  types.forEach(type => {
    const pressure = parseFloat(results[type].summary.avgMemoryPressure);
    const bar = '█'.repeat(Math.round(pressure / 5)) + '░'.repeat(20 - Math.round(pressure / 5));
    console.log(`${type.padEnd(15)} ${bar} ${pressure}%`);
  });
  
  return results;
}

// Decision Framework
function makeDecision(results) {
  console.log('\n\n🎯 DECISION FRAMEWORK');
  console.log('=' .repeat(70));
  
  // Calculate scores (weighted)
  const scores = {};
  Object.keys(results).forEach(type => {
    const r = results[type].summary;
    // Weight: Success (40%), Speed (25%), Wrong turns (20%), Memory pressure (15%)
    const score = (
      parseFloat(r.avgSuccessRate) * 0.4 +
      (100 - parseFloat(r.avgTime) / 10) * 0.25 + // Normalize time
      (10 - parseFloat(r.avgWrongTurns)) * 10 * 0.2 + // Normalize wrong turns
      (100 - parseFloat(r.avgMemoryPressure)) * 0.15
    );
    scores[type] = score;
  });
  
  // Rank
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  console.log('\n📋 OVERALL SCORES (weighted composite)');
  console.log('-' .repeat(70));
  ranked.forEach(([type, score], i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${type.padEnd(15)} ${score.toFixed(1)} points`);
  });
  
  const winner = ranked[0][0];
  const winnerScore = ranked[0][1];
  const secondScore = ranked[1][1];
  const margin = winnerScore - secondScore;
  
  console.log('\n🏆 VERDICT:');
  if (margin > 50) {
    console.log(`  ✅ ${winner.toUpperCase()} WINS DECISIVELY (${margin.toFixed(0)} point margin)`);
    console.log(`  Recommendation: Use ${winner} as default palace structure`);
  } else if (margin > 20) {
    console.log(`  ⚠️  ${winner.toUpperCase()} WINS MODERATELY (${margin.toFixed(0)} point margin)`);
    console.log(`  Recommendation: ${winner} preferred, but other sizes acceptable`);
  } else {
    console.log(`  ➡️  TIE / MARGINAL DIFFERENCE (${margin.toFixed(0)} points)`);
    console.log(`  Recommendation: Size doesn't matter - organization and familiarity matter more`);
  }
  
  // Miller's Law check
  if (winner === 'medium') {
    console.log('\n  🧪 MILLER\'S LAW CONFIRMED: 7±2 loci (9) is optimal!');
  } else if (winner === 'hierarchical') {
    console.log('\n  🧠 CHUNKING WINS: Hierarchy overcomes Miller\'s limit!');
  }
  
  return { winner, scores, margin };
}

// Main Execution
function main() {
  const results = runFullTest();
  const analysis = displayAnalysis(results);
  const decision = makeDecision(results);
  
  // Save results
  const fs = require('fs');
  const output = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results,
    decision,
    hypothesis: 'Palace Size: Miller\'s Law vs Chunking',
    status: 'completed'
  };
  
  fs.writeFileSync('stress-test-results.json', JSON.stringify(output, null, 2));
  console.log('\n💾 Results saved to stress-test-results.json');
  console.log('\n✅ Evolution 003 Stress Test Complete');
}

main();
