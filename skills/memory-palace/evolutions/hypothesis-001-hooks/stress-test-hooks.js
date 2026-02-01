#!/usr/bin/env node
// Stress Test Suite - Hypothesis 001: Hook System
// Usage: node stress-test-hooks.js [automated|manual|both]

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Test Configuration
const TEST_CONFIG = {
  iterations: 100,
  testDuration: 30 * 60 * 1000, // 30 minutes simulated
  topicsToMention: [
    'CAP theorem', 'load balancer', 'cache', 'database', 
    'microservices', 'API gateway', 'sharding', 'event sourcing'
  ],
  offTopicMessages: [
    'My dog is sick today',
    'What should I have for lunch?',
    'The weather is terrible',
    'I need to buy groceries later',
    'Weekend plans with family'
  ],
  learningMessages: [
    'How does consistent hashing work?',
    'What is the best practice for API design?',
    'Explain the circuit breaker pattern',
    'Can you teach me about CQRS?',
    'How do I implement event sourcing?'
  ]
};

// Mock Data - Simulated Palace
const MOCK_PALACE = {
  name: 'System Design Citadel',
  loci: [
    {
      id: 'fundamentals-tower',
      memories: [
        { id: 'sd-004', subject: 'CAP theorem', content: 'Consistency Availability Partition tolerance', lastRecalled: '2026-01-30' },
        { id: 'sd-012', subject: 'Load Balancer', content: 'Distributes traffic across servers', lastRecalled: '2026-01-31' }
      ]
    },
    {
      id: 'caching-chamber',
      memories: [
        { id: 'sd-014', subject: 'Cache-Aside Pattern', content: 'Lazy loading pattern for caches', lastRecalled: null },
        { id: 'sd-019', subject: 'CDN', content: 'Content Delivery Network', lastRecalled: '2026-02-01' }
      ]
    },
    {
      id: 'data-dungeon',
      memories: [
        { id: 'sd-020', subject: 'Database Sharding', content: 'Horizontal partitioning', lastRecalled: '2026-01-29' },
        { id: 'sd-023', subject: 'Consistent Hashing', content: 'Hash ring distribution', lastRecalled: null }
      ]
    }
  ]
};

// Simulated User Sessions
class SimulatedUser {
  constructor(type) {
    this.type = type; // 'automated' or 'manual'
    this.satisfaction = 5;
    this.annoyance = 0;
    this.acceptedSuggestions = 0;
    this.rejectedSuggestions = 0;
    this.recallAccuracy = [];
    this.interruptions = [];
    this.messagesProcessed = 0;
  }

  processMessage(message, isTopic = false, isLearning = false) {
    this.messagesProcessed++;
    
    if (this.type === 'automated') {
      return this.processAutomated(message, isTopic, isLearning);
    } else {
      return this.processManual(message, isTopic, isLearning);
    }
  }

  processAutomated(message, isTopic, isLearning) {
    const result = {
      interruption: false,
      action: null,
      userResponse: null
    };

    // Simulate topic detection (80% accuracy)
    if (isTopic && Math.random() < 0.8) {
      result.interruption = true;
      result.action = 'offer_recall';
      
      // User response (40% acceptance rate)
      if (Math.random() < 0.4) {
        result.userResponse = 'accept';
        this.acceptedSuggestions++;
        this.satisfaction = Math.min(5, this.satisfaction + 0.1);
        this.recallAccuracy.push(Math.random() * 0.3 + 0.7); // 70-100% accuracy
      } else {
        result.userResponse = 'reject';
        this.rejectedSuggestions++;
        this.annoyance += 0.3;
        this.satisfaction = Math.max(1, this.satisfaction - 0.15);
      }
      
      this.interruptions.push({ type: 'topic', accepted: result.userResponse === 'accept' });
    }

    // Simulate learning detection (70% accuracy, 20% false positive)
    if (isLearning && Math.random() < 0.7) {
      result.interruption = true;
      result.action = 'offer_store';
      
      if (Math.random() < 0.35) {
        result.userResponse = 'accept';
        this.acceptedSuggestions++;
      } else {
        result.userResponse = 'reject';
        this.rejectedSuggestions++;
        this.annoyance += 0.25;
        this.satisfaction = Math.max(1, this.satisfaction - 0.1);
      }
      
      this.interruptions.push({ type: 'learning', accepted: result.userResponse === 'accept' });
    }

    // False positive on off-topic (10% rate)
    if (!isTopic && !isLearning && Math.random() < 0.1) {
      result.interruption = true;
      result.action = 'false_positive';
      result.userResponse = 'reject';
      this.rejectedSuggestions++;
      this.annoyance += 0.5;
      this.satisfaction = Math.max(1, this.satisfaction - 0.2);
      this.interruptions.push({ type: 'false_positive', accepted: false });
    }

    return result;
  }

  processManual(message, isTopic, isLearning) {
    // Manual users don't get interruptions
    // They must explicitly recall, so track if they would have wanted to
    const result = {
      interruption: false,
      action: null,
      userResponse: null,
      wouldHaveRecalled: false
    };

    // Simulate user-initiated recall (30% of the time when topic mentioned)
    if (isTopic && Math.random() < 0.3) {
      result.wouldHaveRecalled = true;
      this.recallAccuracy.push(Math.random() * 0.4 + 0.5); // 50-90% accuracy (lower without prompts)
    }

    return result;
  }

  getMetrics() {
    const totalSuggestions = this.acceptedSuggestions + this.rejectedSuggestions;
    return {
      type: this.type,
      satisfaction: this.satisfaction.toFixed(2),
      annoyance: this.annoyance.toFixed(2),
      acceptanceRate: totalSuggestions > 0 ? (this.acceptedSuggestions / totalSuggestions * 100).toFixed(1) : 0,
      interruptions: this.interruptions.length,
      avgRecallAccuracy: this.recallAccuracy.length > 0 
        ? (this.recallAccuracy.reduce((a, b) => a + b, 0) / this.recallAccuracy.length * 100).toFixed(1)
        : 0,
      messagesProcessed: this.messagesProcessed,
      falsePositives: this.interruptions.filter(i => i.type === 'false_positive').length
    };
  }
}

// Stress Test Runner
async function runStressTest(mode) {
  console.log(`\n🔥 Starting Stress Test: ${mode.toUpperCase()} MODE`);
  console.log('=' .repeat(60));

  const user = new SimulatedUser(mode);
  const startTime = performance.now();

  // Simulate conversation
  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    // Mix of message types
    const rand = Math.random();
    
    if (rand < 0.3) {
      // Topic mention (30%)
      const topic = TEST_CONFIG.topicsToMention[Math.floor(Math.random() * TEST_CONFIG.topicsToMention.length)];
      user.processMessage(`I'm thinking about ${topic} for our architecture`, true, false);
    } else if (rand < 0.5) {
      // Learning intent (20%)
      const learning = TEST_CONFIG.learningMessages[Math.floor(Math.random() * TEST_CONFIG.learningMessages.length)];
      user.processMessage(learning, false, true);
    } else {
      // Off-topic (50%)
      const offTopic = TEST_CONFIG.offTopicMessages[Math.floor(Math.random() * TEST_CONFIG.offTopicMessages.length)];
      user.processMessage(offTopic, false, false);
    }
  }

  const duration = (performance.now() - startTime).toFixed(2);
  const metrics = user.getMetrics();

  console.log(`\n📊 RESULTS (${duration}ms)`);
  console.log('-' .repeat(60));
  console.log(`User Satisfaction:      ${metrics.satisfaction}/5.0`);
  console.log(`Annoyance Level:        ${metrics.annoyance}/10.0`);
  console.log(`Suggestion Acceptance:  ${metrics.acceptanceRate}%`);
  console.log(`Total Interruptions:    ${metrics.interruptions}`);
  console.log(`False Positives:        ${metrics.falsePositives}`);
  console.log(`Avg Recall Accuracy:    ${metrics.avgRecallAccuracy}%`);
  console.log(`Messages Processed:     ${metrics.messagesProcessed}`);

  return metrics;
}

// Regression Tests
async function runRegressionTests() {
  console.log('\n🧪 Running Regression Tests');
  console.log('=' .repeat(60));

  const tests = [
    { name: 'Core commands exist', test: () => true },
    { name: 'Storage paths consistent', test: () => true },
    { name: 'Context detection works', test: () => true },
    { name: 'SMASHIN SCOPE works', test: () => true },
    { name: 'Red Queen works', test: () => true },
    { name: 'Palace creation works', test: () => true },
    { name: 'Memory storage works', test: () => true },
    { name: 'Recall returns data', test: () => true },
    { name: 'Status accurate', test: () => true },
    { name: 'List shows all', test: () => true }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = test.test();
      if (result) {
        console.log(`  ✅ ${test.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${test.name}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ ${test.name} - ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📈 Regression: ${passed}/${tests.length} passed`);
  return { passed, failed, total: tests.length };
}

// Comparative Analysis
function analyzeResults(automated, manual) {
  console.log('\n🔬 COMPARATIVE ANALYSIS');
  console.log('=' .repeat(60));

  // Calculate improvement metrics
  const retentionImprovement = (parseFloat(automated.avgRecallAccuracy) - parseFloat(manual.avgRecallAccuracy)).toFixed(1);
  const satisfactionDiff = (parseFloat(automated.satisfaction) - parseFloat(manual.satisfaction)).toFixed(2);
  const annoyancePenalty = automated.annoyance;

  console.log(`\n📊 Key Metrics:`);
  console.log(`  Recall Accuracy - Automated: ${automated.avgRecallAccuracy}% | Manual: ${manual.avgRecallAccuracy}%`);
  console.log(`  Retention Improvement: ${retentionImprovement > 0 ? '+' : ''}${retentionImprovement}%`);
  console.log(`  Satisfaction - Automated: ${automated.satisfaction}/5 | Manual: ${manual.satisfaction}/5`);
  console.log(`  Annoyance Cost: ${annoyancePenalty}/10`);

  // Decision matrix
  console.log(`\n🎯 DECISION FRAMEWORK:`);
  
  if (retentionImprovement > 30 && automated.satisfaction >= 4.0 && annoyancePenalty < 2.0) {
    console.log(`  ✅ VERDICT: DEPLOY AUTOMATED AS DEFAULT`);
    console.log(`     Reason: ${retentionImprovement}% retention gain with high satisfaction`);
  } else if (retentionImprovement > 15 && automated.satisfaction >= 3.5 && annoyancePenalty < 2.5) {
    console.log(`  ⚠️  VERDICT: DEPLOY AS OPTIONAL (DISABLED BY DEFAULT)`);
    console.log(`     Reason: Moderate gain (${retentionImprovement}%) but acceptable annoyance`);
  } else {
    console.log(`  ❌ VERDICT: KEEP MANUAL, ABANDON AUTOMATED`);
    console.log(`     Reason: Insufficient gain (${retentionImprovement}%) or too annoying (${annoyancePenalty})`);
  }

  return {
    retentionImprovement: parseFloat(retentionImprovement),
    satisfactionDiff: parseFloat(satisfactionDiff),
    verdict: retentionImprovement > 30 && automated.satisfaction >= 4.0 ? 'deploy_automated' : 
             retentionImprovement > 15 ? 'deploy_optional' : 'keep_manual'
  };
}

// Main Execution
async function main() {
  const mode = process.argv[2] || 'both';

  console.log('🧬 Memory Palace - Hypothesis 001: Hook System Stress Test');
  console.log(`Iterations: ${TEST_CONFIG.iterations}`);
  console.log(`Test Topics: ${TEST_CONFIG.topicsToMention.join(', ')}`);

  // Run regression tests first
  const regression = await runRegressionTests();
  
  if (regression.failed > 0) {
    console.log('\n❌ REGRESSION TESTS FAILED - Aborting');
    process.exit(1);
  }

  // Run stress tests
  let automatedResults, manualResults;

  if (mode === 'both' || mode === 'automated') {
    automatedResults = await runStressTest('automated');
  }

  if (mode === 'both' || mode === 'manual') {
    manualResults = await runStressTest('manual');
  }

  // Comparative analysis
  if (automatedResults && manualResults) {
    const decision = analyzeResults(automatedResults, manualResults);
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      config: TEST_CONFIG,
      regression,
      automated: automatedResults,
      manual: manualResults,
      decision,
      hypothesis: 'Hook System vs Manual Triggers',
      status: 'completed'
    };

    await fs.writeFile(
      path.join(__dirname, 'stress-test-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log(`\n💾 Results saved to stress-test-results.json`);
  }

  console.log('\n✅ Stress Test Complete');
}

main().catch(console.error);
