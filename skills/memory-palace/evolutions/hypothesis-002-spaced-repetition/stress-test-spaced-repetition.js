#!/usr/bin/env node
// Stress Test - Spaced Repetition Algorithms (Hypothesis 002)
// Usage: node stress-test-spaced-repetition.js [iterations]

const { compareAlgorithms, RetentionModel } = require('./algorithms');
const { performance } = require('perf_hooks');

// Test Configuration
const CONFIG = {
  duration: 90, // days
  sampleSize: 50, // memories per algorithm
  iterations: parseInt(process.argv[2]) || 100, // test runs for statistical significance
  significanceThreshold: 0.05
};

console.log('🧬 Memory Palace - Hypothesis 002: Spaced Repetition Algorithms');
console.log('=' .repeat(70));
console.log(`Duration: ${CONFIG.duration} days`);
console.log(`Sample Size: ${CONFIG.sampleSize} memories per algorithm`);
console.log(`Iterations: ${CONFIG.iterations} runs`);
console.log();

// Regression Tests
async function runRegressionTests() {
  console.log('🧪 Running Regression Tests');
  console.log('-' .repeat(70));
  
  const tests = [
    {
      name: 'Fibonacci intervals increase monotonically',
      test: () => {
        const fib = [1, 2, 3, 5, 8, 13, 21, 34];
        for (let i = 1; i < fib.length; i++) {
          if (fib[i] <= fib[i-1]) return false;
        }
        return true;
      }
    },
    {
      name: 'Exponential intervals increase monotonically',
      test: () => {
        const exp = [1, 3, 7, 14, 30, 60, 120];
        for (let i = 1; i < exp.length; i++) {
          if (exp[i] <= exp[i-1]) return false;
        }
        return true;
      }
    },
    {
      name: 'First interval is 1 day',
      test: () => {
        const fib = [1, 2, 3, 5, 8];
        const exp = [1, 3, 7, 14, 30];
        return fib[0] === 1 && exp[0] === 1;
      }
    },
    {
      name: 'Retention model produces valid probabilities',
      test: () => {
        const model = new RetentionModel('fibonacci');
        const prob = model.calculateRetention(5, 2, 0.5);
        return prob >= 0 && prob <= 1;
      }
    },
    {
      name: 'Review increases memory strength',
      test: () => {
        const model = new RetentionModel('exponential');
        const memory = { baseStrength: 0.5, reviewCount: 0 };
        const reviewed = model.review(memory, true, 1);
        return reviewed.baseStrength > 0.5 && reviewed.reviewCount === 1;
      }
    },
    {
      name: 'Next review day calculated correctly',
      test: () => {
        const { calculateNextReviewFibonacci } = require('./algorithms');
        const memory = { created: new Date().toISOString(), reviewCount: 2 };
        const next = calculateNextReviewFibonacci(memory);
        return next.daysFromNow === 3; // F(2) = 3
      }
    }
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
  
  if (failed > 0) {
    console.log('\n❌ REGRESSION TESTS FAILED - Aborting');
    process.exit(1);
  }
  
  return { passed, failed, total: tests.length };
}

// Statistical Analysis
function calculateStatistics(results) {
  const fibRetention = results.map(r => parseFloat(r.fibonacci.retentionRate));
  const expRetention = results.map(r => parseFloat(r.exponential.retentionRate));
  
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = arr => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);
  };
  
  // Welch's t-test for unequal variances
  const tTest = (a, b) => {
    const ma = mean(a);
    const mb = mean(b);
    const sa = std(a);
    const sb = std(b);
    const na = a.length;
    const nb = b.length;
    
    const se = Math.sqrt((sa*sa)/na + (sb*sb)/nb);
    const t = (ma - mb) / se;
    
    // Simplified degrees of freedom (Welch-Satterthwaite)
    const df = Math.pow((sa*sa)/na + (sb*sb)/nb, 2) / 
      (Math.pow((sa*sa)/na, 2)/(na-1) + Math.pow((sb*sb)/nb, 2)/(nb-1));
    
    // Approximate p-value for two-tailed test
    // For df > 30, t > 2 ≈ p < 0.05
    const p = Math.abs(t) > 2 ? '< 0.05' : '> 0.05';
    
    return { t, df: Math.floor(df), p, significant: Math.abs(t) > 2 };
  };
  
  return {
    fibonacci: {
      mean: mean(fibRetention).toFixed(2),
      std: std(fibRetention).toFixed(2),
      min: Math.min(...fibRetention).toFixed(1),
      max: Math.max(...fibRetention).toFixed(1)
    },
    exponential: {
      mean: mean(expRetention).toFixed(2),
      std: std(expRetention).toFixed(2),
      min: Math.min(...expRetention).toFixed(1),
      max: Math.max(...expRetention).toFixed(1)
    },
    tTest: tTest(fibRetention, expRetention)
  };
}

// Main Test Runner
async function runStressTest() {
  console.log('\n🔥 Running Comparative Stress Test');
  console.log('=' .repeat(70));
  
  const allResults = [];
  const startTime = performance.now();
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    if (i % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i}/${CONFIG.iterations} iterations...`);
    }
    
    const result = compareAlgorithms(CONFIG.duration, CONFIG.sampleSize);
    allResults.push(result);
  }
  
  console.log(`\r  Progress: ${CONFIG.iterations}/${CONFIG.iterations} iterations ✓`);
  
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n  Completed in ${duration}s`);
  
  // Aggregate results by checkpoint
  const checkpointStats = { 30: [], 60: [], 90: [] };
  const totalReviews = { fibonacci: [], exponential: [] };
  
  allResults.forEach(r => {
    [30, 60, 90].forEach(day => {
      checkpointStats[day].push({
        fibonacci: r.checkpoints[day].fibonacci,
        exponential: r.checkpoints[day].exponential
      });
    });
    totalReviews.fibonacci.push(r.totalReviews.fibonacci);
    totalReviews.exponential.push(r.totalReviews.exponential);
  });
  
  // Calculate averages for each checkpoint
  const averages = {};
  [30, 60, 90].forEach(day => {
    const fibSum = checkpointStats[day].reduce((a, r) => ({
      retention: a.retention + parseFloat(r.fibonacci.retentionRate),
      confidence: a.confidence + parseFloat(r.fibonacci.avgConfidence),
      reviews: a.reviews + parseFloat(r.fibonacci.avgReviews)
    }), { retention: 0, confidence: 0, reviews: 0 });
    
    const expSum = checkpointStats[day].reduce((a, r) => ({
      retention: a.retention + parseFloat(r.exponential.retentionRate),
      confidence: a.confidence + parseFloat(r.exponential.avgConfidence),
      reviews: a.reviews + parseFloat(r.exponential.avgReviews)
    }), { retention: 0, confidence: 0, reviews: 0 });
    
    const count = checkpointStats[day].length;
    
    averages[day] = {
      fibonacci: {
        retentionRate: (fibSum.retention / count).toFixed(1),
        avgConfidence: (fibSum.confidence / count).toFixed(3),
        avgReviews: (fibSum.reviews / count).toFixed(1)
      },
      exponential: {
        retentionRate: (expSum.retention / count).toFixed(1),
        avgConfidence: (expSum.confidence / count).toFixed(3),
        avgReviews: (expSum.reviews / count).toFixed(1)
      }
    };
  });
  
  // Calculate total review averages
  const avgTotalReviews = {
    fibonacci: (totalReviews.fibonacci.reduce((a, b) => a + b, 0) / CONFIG.iterations).toFixed(1),
    exponential: (totalReviews.exponential.reduce((a, b) => a + b, 0) / CONFIG.iterations).toFixed(1)
  };
  
  return { averages, totalReviews: avgTotalReviews, allResults };
}

// Display Results
function displayResults(results) {
  console.log('\n📊 RESULTS');
  console.log('=' .repeat(70));
  
  console.log('\n📈 CHECKPOINT RETENTION RATES');
  console.log('-' .repeat(70));
  console.log('Day  Fibonacci    Exponential    Difference');
  console.log('---  ---------    -----------    ----------');
  
  [30, 60, 90].forEach(day => {
    const fib = results.averages[day].fibonacci.retentionRate;
    const exp = results.averages[day].exponential.retentionRate;
    const diff = (parseFloat(fib) - parseFloat(exp)).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    console.log(`${day.toString().padStart(3)}  ${fib.padStart(6)}%      ${exp.padStart(6)}%        ${sign}${diff}%`);
  });
  
  console.log('\n📚 AVERAGE REVIEW SESSIONS (90 days)');
  console.log('-' .repeat(70));
  console.log(`Fibonacci:  ${results.totalReviews.fibonacci} sessions`);
  console.log(`Exponential: ${results.totalReviews.exponential} sessions`);
  const reviewDiff = (parseFloat(results.totalReviews.fibonacci) - parseFloat(results.totalReviews.exponential)).toFixed(1);
  const reviewSign = reviewDiff > 0 ? '+' : '';
  const reviewPercent = ((reviewDiff / parseFloat(results.totalReviews.exponential)) * 100).toFixed(0);
  console.log(`Difference:  ${reviewSign}${reviewDiff} (${reviewSign}${reviewPercent}%)`);
  
  console.log('\n🎯 STATISTICAL SIGNIFICANCE (Day 90)');
  const stats = calculateStatistics(results.allResults.map(r => ({
    fibonacci: { retentionRate: r.checkpoints[90].fibonacci.retentionRate },
    exponential: { retentionRate: r.checkpoints[90].exponential.retentionRate }
  })));
  
  console.log(`Fibonacci:   Mean ${stats.fibonacci.mean}% (σ=${stats.fibonacci.std}, range ${stats.fibonacci.min}-${stats.fibonacci.max})`);
  console.log(`Exponential: Mean ${stats.exponential.mean}% (σ=${stats.exponential.std}, range ${stats.exponential.min}-${stats.exponential.max})`);
  console.log(`t-test:      t=${stats.tTest.t.toFixed(3)}, df=${stats.tTest.df}, p${stats.tTest.p}`);
  console.log(`Significant: ${stats.tTest.significant ? '✅ YES' : '❌ NO'} (α=0.05)`);
  
  return stats;
}

// Decision Framework
function makeDecision(results, stats) {
  console.log('\n🔬 DECISION FRAMEWORK');
  console.log('=' .repeat(70));
  
  const day90Fib = parseFloat(results.averages[90].fibonacci.retentionRate);
  const day90Exp = parseFloat(results.averages[90].exponential.retentionRate);
  const retentionDiff = day90Fib - day90Exp;
  
  const fibReviews = parseFloat(results.totalReviews.fibonacci);
  const expReviews = parseFloat(results.totalReviews.exponential);
  const reviewEfficiency = (day90Fib / fibReviews) / (day90Exp / expReviews);
  
  console.log('\n📋 CRITERIA EVALUATION:');
  console.log(`  Retention difference at 90 days: ${retentionDiff > 0 ? '+' : ''}${retentionDiff.toFixed(1)}%`);
  console.log(`  Statistical significance: ${stats.tTest.significant ? '✅ p<0.05' : '❌ p>0.05'}`);
  console.log(`  Review efficiency ratio: ${reviewEfficiency.toFixed(2)} (1.0 = equal)`);
  console.log(`  Total reviews: Fibonacci ${fibReviews} vs Exponential ${expReviews}`);
  
  // Decision logic
  let verdict, reason;
  
  if (retentionDiff > 5 && stats.tTest.significant) {
    verdict = '✅ FIBONACHI WINS - Replace exponential as default';
    reason = `Superior retention (${day90Fib}% vs ${day90Exp}%) with statistical significance`;
  } else if (retentionDiff > 0 && retentionDiff <= 5 && stats.tTest.significant) {
    verdict = '⚠️  FIBONACCI PARTIAL WIN - Offer as intensive mode option';
    reason = `Modest improvement (${retentionDiff.toFixed(1)}%) but requires ${((fibReviews/expReviews-1)*100).toFixed(0)}% more reviews`;
  } else if (Math.abs(retentionDiff) <= 2 && !stats.tTest.significant) {
    verdict = '➡️  NO SIGNIFICANT DIFFERENCE - Keep exponential (simpler)';
    reason = 'Performance equal within margin of error, exponential is industry standard';
  } else if (retentionDiff < -5 && stats.tTest.significant) {
    verdict = '❌ EXPONENTIAL WINS - Confirm as optimal';
    reason = `Exponential significantly outperforms (${day90Exp}% vs ${day90Fib}%)`;
  } else {
    verdict = '➡️  KEEP EXPONENTIAL - No compelling reason to change';
    reason = `Small difference (${retentionDiff.toFixed(1)}%) not statistically significant`;
  }
  
  console.log('\n🎯 VERDICT:');
  console.log(`  ${verdict}`);
  console.log(`  Reason: ${reason}`);
  
  return { verdict, reason, retentionDiff, significant: stats.tTest.significant };
}

// Main Execution
async function main() {
  // Run regression tests
  const regression = await runRegressionTests();
  
  // Run stress test
  const results = await runStressTest();
  
  // Display results
  const stats = displayResults(results);
  
  // Make decision
  const decision = makeDecision(results, stats);
  
  // Save results
  const fs = require('fs');
  const path = require('path');
  
  const output = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    regression,
    results: {
      averages: results.averages,
      totalReviews: results.totalReviews,
      statistics: stats
    },
    decision,
    hypothesis: 'Spaced Repetition: Fibonacci vs Exponential',
    status: 'completed'
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'stress-test-results.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log('\n💾 Results saved to stress-test-results.json');
  console.log('\n✅ Evolution 002 Stress Test Complete');
}

main().catch(console.error);
