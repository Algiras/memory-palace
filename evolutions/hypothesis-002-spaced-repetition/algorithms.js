// Spaced Repetition Algorithms - Hypothesis 002
// File: algorithms/spaced-repetition.js

/**
 * Implementation A: Fibonacci Intervals
 * Pattern: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 days
 */
function getFibonacciIntervals() {
  // Pre-computed Fibonacci sequence for intervals
  return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]; // days
}

function calculateNextReviewFibonacci(memory) {
  const intervals = getFibonacciIntervals();
  const reviewCount = memory.reviewCount || 0;
  const level = Math.min(reviewCount, intervals.length - 1);
  const days = intervals[level];
  
  const lastReviewed = memory.lastRecalled 
    ? new Date(memory.lastRecalled) 
    : new Date(memory.created);
  
  const nextReview = new Date(lastReviewed);
  nextReview.setDate(nextReview.getDate() + days);
  
  return {
    algorithm: 'fibonacci',
    date: nextReview,
    daysFromNow: days,
    intervalIndex: level,
    totalReviews: reviewCount + 1,
    scheduledDays: intervals.slice(0, level + 1).reduce((a, b) => a + b, 0)
  };
}

/**
 * Implementation B: Exponential Intervals
 * Pattern: 1, 3, 7, 14, 30, 60, 120, 240 days
 */
function getExponentialIntervals() {
  // Roughly doubling intervals (industry standard)
  return [1, 3, 7, 14, 30, 60, 120, 240, 480]; // days
}

function calculateNextReviewExponential(memory) {
  const intervals = getExponentialIntervals();
  const reviewCount = memory.reviewCount || 0;
  const level = Math.min(reviewCount, intervals.length - 1);
  const days = intervals[level];
  
  const lastReviewed = memory.lastRecalled 
    ? new Date(memory.lastRecalled) 
    : new Date(memory.created);
  
  const nextReview = new Date(lastReviewed);
  nextReview.setDate(nextReview.getDate() + days);
  
  return {
    algorithm: 'exponential',
    date: nextReview,
    daysFromNow: days,
    intervalIndex: level,
    totalReviews: reviewCount + 1,
    scheduledDays: intervals.slice(0, level + 1).reduce((a, b) => a + b, 0)
  };
}

/**
 * Memory Retention Model
 * Based on Ebbinghaus forgetting curve with modifications
 */
class RetentionModel {
  constructor(algorithm) {
    this.algorithm = algorithm;
    this.intervals = algorithm === 'fibonacci' 
      ? getFibonacciIntervals() 
      : getExponentialIntervals();
  }

  /**
   * Calculate probability of recalling a memory
   * @param {number} daysSinceReview - Days since last review
   * @param {number} reviewCount - Number of times reviewed
   * @param {number} baseStrength - 0-1, initial memory strength
   * @returns {number} Probability 0-1
   */
  calculateRetention(daysSinceReview, reviewCount, baseStrength = 0.5) {
    // Ebbinghaus decay: R = e^(-t/S)
    // where t = time, S = memory strength
    
    // Strength improves with reviews (diminishing returns)
    const strengthMultiplier = 1 + (reviewCount * 0.15);
    const strength = baseStrength * strengthMultiplier;
    
    // Base decay curve
    const decay = Math.exp(-daysSinceReview / (strength * 10));
    
    // Minimum retention floor (you never completely forget)
    const floor = 0.1 + (reviewCount * 0.02);
    
    // Random variance (simulates real-world factors)
    const variance = (Math.random() - 0.5) * 0.15;
    
    return Math.min(0.98, Math.max(floor, decay + variance));
  }

  /**
   * Simulate a recall attempt
   * @param {Object} memory - Memory object
   * @param {number} currentDay - Day number in simulation
   * @returns {Object} Recall result
   */
  attemptRecall(memory, currentDay) {
    const daysSinceReview = currentDay - (memory.lastReviewDay || 0);
    const probability = this.calculateRetention(
      daysSinceReview, 
      memory.reviewCount || 0,
      memory.baseStrength || 0.5
    );
    
    const recalled = Math.random() < probability;
    
    return {
      recalled,
      confidence: probability,
      daysSinceReview,
      strength: memory.reviewCount || 0
    };
  }

  /**
   * Update memory after review
   * @param {Object} memory - Memory to update
   * @param {boolean} success - Whether recall was successful
   * @param {number} currentDay - Current day in simulation
   * @returns {Object} Updated memory
   */
  review(memory, success, currentDay) {
    const updated = { ...memory };
    updated.reviewCount = (updated.reviewCount || 0) + 1;
    updated.lastReviewDay = currentDay;
    
    // Success strengthens memory more than failure
    const strengthGain = success ? 0.1 : 0.03;
    updated.baseStrength = Math.min(0.95, (updated.baseStrength || 0.5) + strengthGain);
    
    // Track history
    if (!updated.reviewHistory) updated.reviewHistory = [];
    updated.reviewHistory.push({
      day: currentDay,
      success,
      confidence: success ? 0.7 + (Math.random() * 0.3) : Math.random() * 0.4
    });
    
    // Calculate next review
    const nextReview = this.algorithm === 'fibonacci'
      ? calculateNextReviewFibonacci(updated)
      : calculateNextReviewExponential(updated);
    
    updated.nextReviewDay = currentDay + nextReview.daysFromNow;
    
    return updated;
  }

  /**
   * Get all scheduled reviews up to a day
   * @param {Array} memories - All memories
   * @param {number} upToDay - Day to check until
   * @returns {Array} Scheduled reviews
   */
  getScheduledReviews(memories, upToDay) {
    return memories.filter(m => {
      const nextReview = m.nextReviewDay || 1; // First review day 1
      return nextReview <= upToDay;
    }).map(m => ({
      memory: m,
      day: m.nextReviewDay || 1
    })).sort((a, b) => a.day - b.day);
  }
}

/**
 * Compare two algorithms over time
 */
function compareAlgorithms(duration = 90, sampleSize = 50) {
  const fibonacciModel = new RetentionModel('fibonacci');
  const exponentialModel = new RetentionModel('exponential');
  
  // Create identical memory sets for both algorithms
  const fibonacciMemories = [];
  const exponentialMemories = [];
  
  for (let i = 0; i < sampleSize; i++) {
    const baseMemory = {
      id: `mem-${i}`,
      created: new Date().toISOString(),
      baseStrength: 0.4 + (Math.random() * 0.4), // 0.4-0.8
      reviewCount: 0,
      reviewHistory: [],
      difficulty: Math.random() // 0-1, affects retention
    };
    
    fibonacciMemories.push({ ...baseMemory, algorithm: 'fibonacci' });
    exponentialMemories.push({ ...baseMemory, algorithm: 'exponential' });
  }
  
  // Simulate days
  const checkpoints = [30, 60, 90];
  const fibResults = { 30: [], 60: [], 90: [] };
  const expResults = { 30: [], 60: [], 90: [] };
  
  let fibReviews = 0;
  let expReviews = 0;
  
  for (let day = 1; day <= duration; day++) {
    // Fibonacci reviews
    const fibScheduled = fibonacciModel.getScheduledReviews(fibonacciMemories, day);
    fibReviews += fibScheduled.length;
    
    fibScheduled.forEach(({ memory: mem }) => {
      const result = fibonacciModel.attemptRecall(mem, day);
      const idx = fibonacciMemories.findIndex(m => m.id === mem.id);
      fibonacciMemories[idx] = fibonacciModel.review(mem, result.recalled, day);
    });
    
    // Exponential reviews
    const expScheduled = exponentialModel.getScheduledReviews(exponentialMemories, day);
    expReviews += expScheduled.length;
    
    expScheduled.forEach(({ memory: mem }) => {
      const result = exponentialModel.attemptRecall(mem, day);
      const idx = exponentialMemories.findIndex(m => m.id === mem.id);
      exponentialMemories[idx] = exponentialModel.review(mem, result.recalled, day);
    });
    
    // Record checkpoints
    if (checkpoints.includes(day)) {
      // Test all memories at checkpoint
      fibonacciMemories.forEach(mem => {
        const result = fibonacciModel.attemptRecall(mem, day);
        fibResults[day].push({
          id: mem.id,
          recalled: result.recalled,
          confidence: result.confidence,
          reviews: mem.reviewCount
        });
      });
      
      exponentialMemories.forEach(mem => {
        const result = exponentialModel.attemptRecall(mem, day);
        expResults[day].push({
          id: mem.id,
          recalled: result.recalled,
          confidence: result.confidence,
          reviews: mem.reviewCount
        });
      });
    }
  }
  
  // Calculate statistics
  const calculateStats = (results) => {
    const recalled = results.filter(r => r.recalled).length;
    const avgConfidence = results.reduce((a, r) => a + r.confidence, 0) / results.length;
    const avgReviews = results.reduce((a, r) => a + r.reviews, 0) / results.length;
    
    return {
      retentionRate: (recalled / results.length * 100).toFixed(1),
      avgConfidence: avgConfidence.toFixed(3),
      avgReviews: avgReviews.toFixed(1),
      sampleSize: results.length
    };
  };
  
  return {
    duration,
    sampleSize,
    totalReviews: { fibonacci: fibReviews, exponential: expReviews },
    checkpoints: {
      30: {
        fibonacci: calculateStats(fibResults[30]),
        exponential: calculateStats(expResults[30])
      },
      60: {
        fibonacci: calculateStats(fibResults[60]),
        exponential: calculateStats(expResults[60])
      },
      90: {
        fibonacci: calculateStats(fibResults[90]),
        exponential: calculateStats(expResults[90])
      }
    },
    raw: {
      fibonacci: fibResults,
      exponential: expResults
    }
  };
}

// Export for testing
module.exports = {
  getFibonacciIntervals,
  getExponentialIntervals,
  calculateNextReviewFibonacci,
  calculateNextReviewExponential,
  RetentionModel,
  compareAlgorithms
};
