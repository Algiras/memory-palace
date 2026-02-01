# Hypothesis 002: Spaced Repetition Algorithm

## The Question

**Which interval pattern produces better long-term retention for technical knowledge?**

- **Fibonacci**: 1, 2, 3, 5, 8, 13, 21, 34 days
- **Exponential**: 1, 3, 7, 14, 30, 60 days

---

## Background

Spaced repetition exploits the psychological spacing effect: information is more easily recalled if exposure is repeated over spaced intervals rather than massed together.

### The Ebbinghaus Forgetting Curve

```
Retention %
100% ┤███████ Day 0 (learning)
 80% ┤    ███████ Day 1
 60% ┤         ███████ Day 3
 40% ┤              ███████ Day 7
 20% ┤                   ███████ Day 14
  0% ┼────┬────┬────┬────┬────┬────┬────┬────
      0    1    3    7   14   30   60   90 days
```

Each review "resets" the curve with better retention.

---

## Theory Comparison

### Fibonacci Intervals

**Pattern**: Each interval is the sum of the two preceding ones

```
F(1) = 1
F(2) = 2  
F(3) = 3 (1+2)
F(4) = 5 (2+3)
F(5) = 8 (3+5)
F(6) = 13 (5+8)
F(7) = 21 (8+13)
F(8) = 34 (13+21)
```

**Philosophy**:
- Gradual acceleration mirrors natural learning
- Early reviews frequent (consolidation phase)
- Later reviews spaced further apart (maintenance phase)
- Never exceeds biological capacity

**Pros**:
- Smoother transition from learning to maintenance
- More reviews in first month (better early retention)
- Natural, organic progression

**Cons**:
- More total reviews in 90 days
- May review too early when confidence is high
- Complex to explain to users

---

### Exponential Intervals

**Pattern**: Roughly doubling each time

```
E(1) = 1
E(2) = 3  
E(3) = 7
E(4) = 14
E(5) = 30
E(6) = 60
```

**Philosophy**:
- Rapidly reducing review frequency
- Matches Ebbinghaus decay rate
- Standard in most SRS apps (Anki, SuperMemo)

**Pros**:
- Industry standard, well-tested
- Fewer total reviews
- Simple to understand
- Proven effective for language learning

**Cons**:
- Gap from 14→30 days is large
- May lose momentum
- Less frequent early reinforcement

---

## Predictions

### Hypothesis A: Fibonacci Wins
**Claim**: More frequent early reviews lead to stronger memory consolidation, resulting in 20% better retention at 90 days.

**Why**: Technical knowledge requires deep conceptual understanding. More early reviews cement the "memory palace" imagery before it fades.

### Hypothesis B: Exponential Wins
**Claim**: Industry standard intervals are optimal. 90-day retention will be equal, but exponential requires 25% fewer review sessions.

**Why**: The forgetting curve research supports exponential decay. Extra early reviews are wasteful if confidence is already high.

---

## Test Design

### Methodology

**Duration**: 90 days simulated  
**Sample Size**: 50 memories per group  
**Groups**:
- Group A: Fibonacci intervals (1, 2, 3, 5, 8, 13, 21, 34 days)
- Group B: Exponential intervals (1, 3, 7, 14, 30, 60 days)

### Simulation Model

```javascript
// Memory decay model based on Ebbinghaus
function retentionProbability(daysSinceReview, reviewCount) {
  // Base decay: starts at 100%, drops over time
  const baseDecay = Math.exp(-daysSinceReview / (2 + reviewCount));
  
  // Strengthening effect: each review improves base retention
  const strengthBonus = reviewCount * 0.1;
  
  // Random variance (simulates real-world factors)
  const variance = (Math.random() - 0.5) * 0.2;
  
  return Math.min(0.95, Math.max(0.1, baseDecay + strengthBonus + variance));
}

// Test recall
function testRecall(memory, daysElapsed) {
  const probability = retentionProbability(daysElapsed, memory.reviewCount);
  return Math.random() < probability;
}
```

### Metrics

**Primary**: 
- Retention rate at 30, 60, 90 days
- Statistical significance (p < 0.05)

**Secondary**:
- Total review sessions required
- Time investment
- User fatigue (simulated)

**Efficiency**:
- Retention per review session
- Memory strength trajectory over time

---

## Expected Outcomes

### Best Case (Fibonacci Wins by 20%+)
**Decision**: Replace exponential with Fibonacci as default
**Implementation**: Update all palace review schedules
**Migration**: Gradual, respects existing intervals

### Moderate Case (Fibonacci Wins by 5-15%)
**Decision**: Offer Fibonacci as optional "intensive mode"
**Implementation**: User setting: `review_mode: "standard" | "intensive"`
**Default**: Keep exponential for most users

### Null Case (No significant difference)
**Decision**: Keep exponential (simpler, fewer reviews)
**Implementation**: No changes
**Note**: Document that Fibonacci tested equal

### Reverse Case (Exponential Wins)
**Decision**: Confirm exponential as optimal
**Implementation**: No changes, update documentation
**Validation**: Industry standard proven correct

---

## Implementation A: Fibonacci Algorithm

```javascript
function getFibonacciIntervals() {
  return [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]; // days
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
    date: nextReview,
    daysFromNow: days,
    intervalIndex: level,
    totalReviews: reviewCount + 1
  };
}
```

**Schedule Example**:
```
Day 0: Initial learning
Day 1: Review #1
Day 3: Review #2
Day 6: Review #3
Day 11: Review #4
Day 19: Review #5
Day 32: Review #6
Day 53: Review #7
Day 87: Review #8
```

---

## Implementation B: Exponential Algorithm

```javascript
function getExponentialIntervals() {
  return [1, 3, 7, 14, 30, 60, 120, 240]; // days
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
    date: nextReview,
    daysFromNow: days,
    intervalIndex: level,
    totalReviews: reviewCount + 1
  };
}
```

**Schedule Example**:
```
Day 0: Initial learning
Day 1: Review #1
Day 4: Review #2
Day 11: Review #3
Day 25: Review #4
Day 55: Review #5
Day 115: Review #6 (outside test window)
```

---

## Regression Tests

All tests must pass for both implementations:

```javascript
describe('Spaced Repetition Regression', () => {
  test('intervals increase monotonically', () => {
    const fib = getFibonacciIntervals();
    const exp = getExponentialIntervals();
    
    for (let i = 1; i < fib.length; i++) {
      expect(fib[i]).toBeGreaterThan(fib[i-1]);
    }
    for (let i = 1; i < exp.length; i++) {
      expect(exp[i]).toBeGreaterThan(exp[i-1]);
    }
  });
  
  test('first interval is 1 day', () => {
    expect(getFibonacciIntervals()[0]).toBe(1);
    expect(getExponentialIntervals()[0]).toBe(1);
  });
  
  test('next review date is in the future', () => {
    const memory = { created: new Date().toISOString(), reviewCount: 0 };
    const fib = calculateNextReviewFibonacci(memory);
    const exp = calculateNextReviewExponential(memory);
    
    expect(fib.date).toBeAfter(new Date());
    expect(exp.date).toBeAfter(new Date());
  });
  
  test('subsequent reviews extend further', () => {
    const memory = { created: new Date().toISOString(), reviewCount: 3 };
    const fib = calculateNextReviewFibonacci(memory);
    const exp = calculateNextReviewExponential(memory);
    
    expect(fib.daysFromNow).toBeGreaterThan(5); // F(3) = 5
    expect(exp.daysFromNow).toBeGreaterThan(7); // E(3) = 14
  });
  
  test('handles edge cases', () => {
    // Memory with many reviews
    const oldMemory = { 
      created: '2025-01-01', 
      lastRecalled: '2025-12-01',
      reviewCount: 10 
    };
    
    const fib = calculateNextReviewFibonacci(oldMemory);
    const exp = calculateNextReviewExponential(oldMemory);
    
    // Should cap at max interval
    expect(fib.intervalIndex).toBeLessThan(10);
    expect(exp.intervalIndex).toBeLessThan(10);
  });
});
```

---

## Selection Criteria

### Keep Fibonacci If:
1. **30-day retention**: > 85% (vs exponential < 80%)
2. **90-day retention**: > 75% (vs exponential < 70%)
3. **Statistical significance**: p < 0.05
4. **Efficiency**: Retention per review >= exponential

### Keep Exponential If:
1. **Retention equal** within ±5% at all checkpoints
2. **Fewer reviews**: 25%+ less total review time
3. **Or**: Exponential retention > Fibonacci

### Partial Accept (Both):
1. **Fibonacci better for complex topics** (low initial confidence)
2. **Exponential better for simple topics** (high initial confidence)
3. **Implement**: Adaptive algorithm that chooses based on confidence

---

## Stress Test Scenarios

### Scenario 1: Consistent Learner
- Reviews on schedule 100% of the time
- Tests recall accuracy at 30/60/90 days
- Measures: Perfect retention curve

### Scenario 2: Delayed Learner
- Reviews 1-3 days late each time
- Tests robustness to schedule drift
- Measures: Graceful degradation

### Scenario 3: Burst Learner
- Cramming: reviews multiple times per day
- Tests over-reviewing behavior
- Measures: Diminishing returns detection

### Scenario 4: Forgetful Learner
- Misses 50% of reviews
- Tests recovery from gaps
- Measures: Catch-up effectiveness

### Scenario 5: Mixed Difficulty
- 50% easy memories (high confidence)
- 50% hard memories (low confidence)
- Tests algorithm adaptability
- Measures: Differentiated performance

---

## Implementation Status

- [ ] Fibonacci algorithm implementation
- [ ] Exponential algorithm implementation
- [ ] Memory decay simulation model
- [ ] 90-day stress test runner
- [ ] Statistical analysis module
- [ ] Regression test suite
- [ ] Results documentation

---

*Hypothesis 002 Status: DEFINED, READY FOR TESTING*
