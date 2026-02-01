# Hypothesis 010: Recall Speed Optimization

## The Question

**How do we achieve <100ms recall for any memory regardless of palace size?**

Current performance:
- Small palace (10 memories): ~50ms
- Medium palace (50 memories): ~300ms  
- Large palace (100 memories): ~800ms
- Query degrades linearly with size

Three approaches to test:
- **Approach A**: Indexed lookups (database-style indexing)
- **Approach B**: Pre-cached active sets (working memory)
- **Approach C**: Predictive loading (ML-based pre-fetch)

---

## Background

### The Latency Problem

```
Query Response Time vs Palace Size
   0ms ┤
 200ms ┤████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10 memories (current)
 400ms ┤████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25 memories
 600ms ┤████████████░░░░░░░░░░░░░░░░░░░░░░░░ 50 memories
 800ms ┤████████████████░░░░░░░░░░░░░░░░░░░░ 100 memories (unacceptable)
1000ms ┤████████████████████░░░░░░░░░░░░░░░░ 150 memories
       └────┬────┬────┬────┬────┬────┬────┬────
            10   25   50  100  150  200  500
```

**Target**: Sub-100ms recall at any scale (up to 1000 memories)

### Why Speed Matters

- **Flow state**: Delays >200ms break cognitive flow
- **Working memory**: Long delays risk losing mental context
- **User experience**: Fast = magic, slow = frustrating
- **Competitive**: Human memory recalls in <100ms

---

## Theory Comparison

### Approach A: Indexed Lookups

**Concept**: Database-style indexes on memory attributes

```
Memory Schema:
- id (primary key)
- content (full-text indexed)
- tags (inverted index)
- palace (B-tree index)
- locus (spatial index)
- lastAccessed (timestamp index)
- strength (numeric index)

Index Structures:
├── Primary: HashMap<id, Memory>
├── Content: InvertedIndex<word, Memory[]>
├── Tags: InvertedIndex<tag, Memory[]>
├── Palace: BTree<palaceName, Memory[]>
├── Locus: SpatialIndex<coordinates, Memory>
└── Time: BTree<timestamp, Memory[]>
```

**Query Optimization**:
- Simple ID lookup: O(1) via hash
- Content search: O(log n) via B-tree
- Tag filter: O(k) where k = matching memories
- Composite queries: Index intersection

**Pros**:
- Predictable O(log n) performance
- Standard database techniques
- Works at any scale
- Multiple query types supported

**Cons**:
- Index storage overhead (+50-100%)
- Write amplification (update indexes)
- Complex index maintenance
- Cold start penalty (load indexes)

**Expected Performance**: 
- ID lookup: 1-5ms
- Content search: 10-50ms
- Any query: <100ms up to 10K memories

---

### Approach B: Pre-cached Active Sets

**Concept**: Keep "working set" of memories in fast-access cache

```
Memory Hierarchy:
┌─────────────────────────────────────────┐
│  L1 Cache (Hot) - RAM                   │
│  - Last 20 accessed memories            │
│  - Current session context              │
│  - <1ms access                          │
├─────────────────────────────────────────┤
│  L2 Cache (Warm) - Indexed              │
│  - Last 100 accessed memories           │
│  - Full-text + tag indexes              │
│  - 10-50ms access                       │
├─────────────────────────────────────────┤
│  L3 Storage (Cold) - Disk               │
│  - All memories                         │
│  - 100-500ms access                     │
└─────────────────────────────────────────┘
```

**Cache Strategy**:
- **LRU (Least Recently Used)**: Evict oldest unused
- **LFU (Least Frequently Used)**: Evict least accessed
- **Predictive**: Pre-load based on context

**Active Set Management**:
```javascript
const activeSet = {
  hot: new Map(),     // 20 items, Map for O(1)
  warm: new Map(),    // 100 items
  context: new Set(), // Session context memories
  
  get(id) {
    // Check hot first
    if (this.hot.has(id)) return this.hot.get(id);
    
    // Promote from warm
    if (this.warm.has(id)) {
      const mem = this.warm.get(id);
      this.promoteToHot(mem);
      return mem;
    }
    
    return null; // Not in cache
  }
};
```

**Pros**:
- Lightning fast for hot memories (<1ms)
- No index overhead for cold data
- Naturally adapts to usage patterns
- Works well with temporal locality

**Cons**:
- Cache misses are expensive (full search)
- Cache warming required
- Memory usage scales with cache size
- Cold start problem

**Expected Performance**:
- Cache hit: <5ms
- Cache miss: 100-500ms (fallback to indexes)
- Hit rate: 80-90% with good prediction

---

### Approach C: Predictive Loading

**Concept**: ML-based prediction of which memories will be needed

```
Prediction Model:
├── Context Features
│   - Current palace
│   - Recent queries
│   - Time of day
│   - Day of week
│   └── Session duration
├── User Behavior Patterns
│   - Study schedule
│   - Topic progression
│   - Difficulty preferences
│   └── Review history
└── Content Relationships
    - Semantic similarity
    - Prerequisite chains
    - Review dependencies
    └── Spaced repetition schedule

Prediction Score:
P(access) = f(context, behavior, content_relationship)
Pre-load if P(access) > threshold (e.g., 0.3)
```

**Pre-loading Strategy**:
```javascript
class PredictiveLoader {
  constructor() {
    this.model = new MarkovChain(); // Simple transition model
    this.context = new ContextEncoder();
  }
  
  predictNextMemories(currentMemory, n = 10) {
    // Based on:
    // 1. Markov transitions (what usually follows X)
    // 2. Semantic similarity (related concepts)
    // 3. Review schedule (due for review)
    // 4. Context match (current topic)
    
    const candidates = [];
    
    // Transition probabilities
    const transitions = this.model.getTransitions(currentMemory.id);
    candidates.push(...transitions.slice(0, 5));
    
    // Semantic neighbors
    const neighbors = this.findSemanticNeighbors(currentMemory);
    candidates.push(...neighbors.slice(0, 3));
    
    // Due for review
    const due = this.getDueMemories().slice(0, 2);
    candidates.push(...due);
    
    return candidates.slice(0, n);
  }
  
  async preloadPredicted(context) {
    const predictions = this.predictNextMemories(context);
    await Promise.all(predictions.map(m => this.cache.load(m)));
  }
}
```

**Pros**:
- Proactive loading eliminates wait time
- Learns user patterns
- Anticipates needs before query
- Can pre-warm cache

**Cons**:
- Prediction accuracy varies
- Overhead of model training
- False positives waste resources
- Complex to implement

**Expected Performance**:
- Prediction accuracy: 60-80%
- Pre-loaded hit: 0ms (instant)
- Prediction miss: Normal query time
- Overall: 60-80% of queries <10ms

---

## Predictions

### Hypothesis A Wins (Indexing)

**Claim**: Indexed lookups achieve consistent <100ms performance regardless of palace size because O(log n) scaling dominates.

**Why**: Database indexing is mature, proven technology. Logarithmic scaling handles 10K+ memories easily.

### Hypothesis B Wins (Caching)

**Claim**: Active set caching achieves <10ms for 90% of queries because of temporal locality in memory access patterns.

**Why**: Users access memories in clusters (studying a topic). LRU cache captures this locality.

### Hypothesis C Wins (Prediction)

**Claim**: Predictive loading eliminates perceived latency by pre-loading memories before they're requested.

**Why**: Study patterns are predictable. If user reviews "QuickSort", they likely need "MergeSort" next.

### Combined Approach Wins

**Claim**: Hybrid system (indexes + cache + prediction) achieves <50ms for 95% of queries.

**Why**: Indexes handle the long tail, cache handles hot data, prediction pre-warms cache.

---

## Test Design

### Methodology

**Phase 1: Baseline Performance Measurement**

```javascript
const performanceTests = [
  { palaceSize: 10, queries: 100 },
  { palaceSize: 50, queries: 100 },
  { palaceSize: 100, queries: 100 },
  { palaceSize: 500, queries: 100 },
  { palaceSize: 1000, queries: 100 }
];

// Query types to test
const queryTypes = [
  'id_lookup',           // Find by memory ID
  'content_search',      // Full-text search
  'tag_filter',          // Filter by tags
  'locus_lookup',        // Find by palace + locus
  'semantic_search',     // Vector similarity
  'composite'            // Multiple criteria
];
```

**Phase 2: Stress Test Patterns**

1. **Random Access**: Query memories uniformly at random
2. **Sequential Scan**: Access memories in order
3. **Hotspot**: 80% of queries hit 20% of memories (Pareto)
4. **Burst**: Rapid-fire queries (simulate intensive study)
5. **Cold Start**: Measure from system boot

**Phase 3: Real-world Simulation**

```javascript
const userSession = {
  duration: 30, // minutes
  pattern: 'study', // or 'review', 'browse'
  palace: 'system-design',
  memoriesAccessed: [],
  queryLog: []
};

// Simulate realistic access patterns
for (let minute = 0; minute < 30; minute++) {
  // 5-10 queries per minute
  const queriesThisMinute = 5 + Math.random() * 5;
  
  for (let q = 0; q < queriesThisMinute; q++) {
    // 70% chance of related memory (locality)
    if (Math.random() < 0.7 && lastAccessed) {
      query = findRelated(lastAccessed);
    } else {
      query = randomMemory();
    }
    
    const start = performance.now();
    const result = system.findMemory(query);
    const latency = performance.now() - start;
    
    logQuery(query, latency, result);
  }
}
```

### Metrics

**Primary Metrics**:
1. **P50 Latency**: Median query time
2. **P95 Latency**: 95th percentile (worst case)
3. **P99 Latency**: 99th percentile (outliers)
4. **Queries/Second**: Throughput

**Secondary Metrics**:
1. **Cache Hit Rate**: % served from cache
2. **Index Efficiency**: Index lookup vs full scan
3. **Prediction Accuracy**: % of predictions accessed
4. **Memory Overhead**: RAM used for optimization

**Efficiency Metrics**:
1. **Storage Overhead**: Index size vs data size
2. **Write Amplification**: Cost of maintaining indexes
3. **CPU Usage**: Processing overhead
4. **Cold Start Time**: Time to become operational

---

## Implementation A: Indexed Lookups

```javascript
class IndexedMemorySystem {
  constructor() {
    this.memories = new Map(); // id -> memory
    
    // Indexes
    this.contentIndex = new InvertedIndex();
    this.tagIndex = new InvertedIndex();
    this.palaceIndex = new BTree();
    this.locusIndex = new SpatialIndex();
    this.timeIndex = new BTree();
  }
  
  addMemory(memory) {
    // Store
    this.memories.set(memory.id, memory);
    
    // Update indexes
    this.contentIndex.add(memory.content, memory.id);
    memory.tags.forEach(tag => this.tagIndex.add(tag, memory.id));
    this.palaceIndex.add(memory.palace, memory.id);
    this.locusIndex.add(memory.locus, memory.id);
    this.timeIndex.add(memory.lastAccessed, memory.id);
  }
  
  findById(id) {
    return this.memories.get(id); // O(1)
  }
  
  findByContent(query) {
    // Tokenize query
    const tokens = this.tokenize(query);
    
    // Get candidate IDs from index
    const candidateSets = tokens.map(t => this.contentIndex.get(t));
    
    // Intersection (AND) or union (OR)
    const candidates = this.intersect(candidateSets);
    
    // Fetch full memories
    return candidates.map(id => this.memories.get(id));
  }
  
  findByTags(tags) {
    const sets = tags.map(t => this.tagIndex.get(t));
    return this.intersect(sets).map(id => this.memories.get(id));
  }
  
  findByPalace(palaceName) {
    return this.palaceIndex
      .get(palaceName)
      .map(id => this.memories.get(id));
  }
  
  // Composite query
  query(criteria) {
    let results = null;
    
    if (criteria.id) {
      return [this.findById(criteria.id)];
    }
    
    if (criteria.tags) {
      results = this.findByTags(criteria.tags);
    }
    
    if (criteria.palace) {
      const palaceMems = this.findByPalace(criteria.palace);
      results = results ? this.intersect([results, palaceMems]) : palaceMems;
    }
    
    if (criteria.content) {
      const contentMems = this.findByContent(criteria.content);
      results = results ? this.intersect([results, contentMems]) : contentMems;
    }
    
    return results || [];
  }
}

// Inverted index for text search
class InvertedIndex {
  constructor() {
    this.index = new Map(); // term -> Set(ids)
  }
  
  add(text, id) {
    const tokens = this.tokenize(text);
    tokens.forEach(token => {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token).add(id);
    });
  }
  
  get(term) {
    return Array.from(this.index.get(term) || []);
  }
}

// B-Tree for ordered data
class BTree {
  constructor(order = 4) {
    this.root = new BTreeNode(order);
  }
  
  add(key, value) {
    // B-tree insertion logic
    this.root.insert(key, value);
  }
  
  get(key) {
    return this.root.search(key);
  }
  
  range(min, max) {
    return this.root.rangeSearch(min, max);
  }
}
```

**Complexity**:
- Build index: O(n log n)
- Query: O(log n) for exact match, O(k log n) for k results
- Insert: O(log n)
- Space: O(n) overhead

---

## Implementation B: Pre-cached Active Sets

```javascript
class CachedMemorySystem {
  constructor(options = {}) {
    this.storage = new Map(); // All memories
    this.hotCache = new LRUCache({ max: 20 }); // L1
    this.warmCache = new LRUCache({ max: 100 }); // L2
    this.context = new Set(); // Session context
    this.stats = { hits: 0, misses: 0 };
  }
  
  get(id) {
    // Try L1 cache first
    if (this.hotCache.has(id)) {
      this.stats.hits++;
      return this.hotCache.get(id);
    }
    
    // Try L2 cache
    if (this.warmCache.has(id)) {
      this.stats.hits++;
      const mem = this.warmCache.get(id);
      this.promoteToHot(mem);
      return mem;
    }
    
    // Cache miss - load from storage
    this.stats.misses++;
    const mem = this.storage.get(id);
    if (mem) {
      this.warmCache.set(id, mem);
      this.promoteToHot(mem);
    }
    return mem;
  }
  
  promoteToHot(memory) {
    // Move to hot cache (evicts LRU from hot if full)
    this.hotCache.set(memory.id, memory);
  }
  
  preloadContext(contextMemories) {
    // Pre-load memories into warm cache
    contextMemories.forEach(id => {
      if (!this.warmCache.has(id)) {
        const mem = this.storage.get(id);
        if (mem) this.warmCache.set(id, mem);
      }
    });
  }
  
  invalidateCache(id) {
    this.hotCache.delete(id);
    this.warmCache.delete(id);
  }
  
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }
}

// LRU Cache implementation
class LRUCache {
  constructor(options) {
    this.max = options.max;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  delete(key) {
    this.cache.delete(key);
  }
}
```

**Hit Rate Targets**:
- Hot cache: 60% of queries
- Warm cache: 25% of queries
- Storage: 15% of queries

---

## Implementation C: Predictive Loading

```javascript
class PredictiveMemorySystem {
  constructor() {
    this.cache = new CachedMemorySystem();
    this.markovModel = new MarkovChain();
    this.semanticIndex = new SemanticIndex();
    this.accessHistory = [];
    this.preloadQueue = new Set();
  }
  
  get(id) {
    const memory = this.cache.get(id);
    
    if (memory) {
      // Record access for pattern learning
      this.recordAccess(memory);
      
      // Trigger predictive preload
      this.predictAndPreload(memory);
    }
    
    return memory;
  }
  
  recordAccess(memory) {
    this.accessHistory.push({
      id: memory.id,
      timestamp: Date.now(),
      palace: memory.palace,
      tags: memory.tags
    });
    
    // Update Markov model
    if (this.accessHistory.length > 1) {
      const prev = this.accessHistory[this.accessHistory.length - 2];
      this.markovModel.addTransition(prev.id, memory.id);
    }
  }
  
  predictAndPreload(currentMemory) {
    const predictions = [];
    
    // 1. Markov transitions (what usually follows)
    const transitions = this.markovModel.getTopTransitions(currentMemory.id, 3);
    predictions.push(...transitions);
    
    // 2. Semantic neighbors
    const neighbors = this.semanticIndex.findSimilar(currentMemory, 3);
    predictions.push(...neighbors.map(n => n.id));
    
    // 3. Due for review (SRS)
    const due = this.getDueMemories(currentMemory.palace, 2);
    predictions.push(...due);
    
    // 4. Same palace, nearby loci
    const nearby = this.getNearbyLoci(currentMemory, 2);
    predictions.push(...nearby);
    
    // Deduplicate and preload
    const uniquePredictions = [...new Set(predictions)].slice(0, 10);
    
    uniquePredictions.forEach(id => {
      if (!this.preloadQueue.has(id)) {
        this.preloadQueue.add(id);
        this.asyncPreload(id);
      }
    });
  }
  
  async asyncPreload(id) {
    // Non-blocking preload
    setTimeout(() => {
      const mem = this.cache.storage.get(id);
      if (mem) {
        this.cache.warmCache.set(id, mem);
      }
      this.preloadQueue.delete(id);
    }, 0);
  }
  
  getPredictionAccuracy() {
    // Compare predictions to actual accesses
    const lookahead = 5; // next 5 accesses
    let correct = 0;
    let total = 0;
    
    for (let i = 0; i < this.accessHistory.length - lookahead; i++) {
      const current = this.accessHistory[i];
      const future = this.accessHistory.slice(i + 1, i + 1 + lookahead);
      const futureIds = future.map(a => a.id);
      
      // Get predictions for current
      const predictions = this.predictNextMemories(current.id, lookahead);
      
      // Check overlap
      const hits = predictions.filter(p => futureIds.includes(p));
      correct += hits.length;
      total += lookahead;
    }
    
    return total > 0 ? correct / total : 0;
  }
}

// Markov chain for transition probabilities
class MarkovChain {
  constructor() {
    this.transitions = new Map(); // from -> Map(to, count)
    this.totals = new Map(); // from -> total transitions
  }
  
  addTransition(from, to) {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
    }
    const fromMap = this.transitions.get(from);
    fromMap.set(to, (fromMap.get(to) || 0) + 1);
    
    this.totals.set(from, (this.totals.get(from) || 0) + 1);
  }
  
  getTopTransitions(from, n = 5) {
    const fromMap = this.transitions.get(from);
    if (!fromMap) return [];
    
    const total = this.totals.get(from);
    const probabilities = [];
    
    fromMap.forEach((count, to) => {
      probabilities.push({ to, prob: count / total });
    });
    
    return probabilities
      .sort((a, b) => b.prob - a.prob)
      .slice(0, n)
      .map(p => p.to);
  }
}
```

**Prediction Accuracy Targets**:
- Next memory: 40% accuracy
- Next 3 memories: 60% contains at least 1
- Next 10 memories: 80% contains at least 2

---

## Success Metrics

### Performance Targets

| Metric | Current (Baseline) | Indexed | Cached | Predictive | Target |
|--------|-------------------|---------|--------|-----------|--------|
| P50 Latency (100 mems) | 300ms | 20ms | 15ms | 10ms | <50ms ✅ |
| P95 Latency (100 mems) | 800ms | 50ms | 80ms | 100ms | <100ms ✅ |
| P99 Latency (500 mems) | 2000ms | 100ms | 200ms | 150ms | <200ms ✅ |
| Cache Hit Rate | N/A | N/A | 85% | N/A | >80% |
| Prediction Accuracy | N/A | N/A | N/A | 70% | >60% |
| Queries/Second | 10 | 500 | 800 | 600 | >500 |

### Statistical Validation

**Indexing WINS if**:
1. P95 latency <100ms for 1000 memories
2. Query time O(log n) verified
3. Index overhead <100% storage
4. No query type >200ms

**Caching WINS if**:
1. Hit rate >80% under realistic patterns
2. Hot cache latency <10ms
3. Graceful degradation on miss
4. Memory overhead <20MB

**Prediction WINS if**:
1. Accuracy >60% for next 5 accesses
2. False positive rate <30%
3. Preload doesn't block queries
4. Improves cache hit rate by >15%

---

## Expected Outcomes

### Best Case: Hybrid System Dominates

**Decision**: Implement all three approaches in layers
- Layer 1: Predictive preloader
- Layer 2: LRU cache (hot/warm)
- Layer 3: Indexed storage

**Performance**:
- 90% of queries: <20ms
- 99% of queries: <100ms
- Any scale (10K+ memories): <200ms

### Moderate Case: Indexing Sufficient

**Decision**: Implement indexed lookups only
**Trade-off**: Simpler, 95% performance at 50% complexity
**Performance**: <100ms for all queries up to 10K memories

### Null Case: Baseline Adequate

**Decision**: No changes required
**Reason**: Current users don't need large palaces
**Alternative**: Focus on other optimizations

### Worst Case: Overhead Too High

**Decision**: Optimize baseline linear search
**Approach**: Better data structures (Map vs Array)
**Result**: 50% improvement without complexity

---

## Regression Tests

```javascript
describe('Recall Speed Optimization', () => {
  test('indexed query scales logarithmically', () => {
    const system = new IndexedMemorySystem();
    
    // Add 1000 memories
    for (let i = 0; i < 1000; i++) {
      system.addMemory({ id: i, content: `memory ${i}` });
    }
    
    // Measure query times
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      system.findById(i);
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    expect(avgTime).toBeLessThan(10); // <10ms
  });
  
  test('cache hit is faster than miss', () => {
    const system = new CachedMemorySystem();
    
    // Add memory
    system.storage.set(1, { id: 1, content: 'test' });
    
    // First access (miss)
    const missStart = performance.now();
    system.get(1);
    const missTime = performance.now() - missStart;
    
    // Second access (hit)
    const hitStart = performance.now();
    system.get(1);
    const hitTime = performance.now() - hitStart;
    
    expect(hitTime).toBeLessThan(missTime / 2);
  });
  
  test('prediction accuracy meets threshold', () => {
    const system = new PredictiveMemorySystem();
    
    // Simulate study session
    const session = ['mem1', 'mem2', 'mem3', 'mem4', 'mem5'];
    session.forEach(id => {
      system.get(id);
    });
    
    // Get predictions for mem1
    const predictions = system.predictNextMemories('mem1', 3);
    
    // Should include at least one of the next 3
    const nextThree = session.slice(1, 4);
    const hits = predictions.filter(p => nextThree.includes(p));
    
    expect(hits.length).toBeGreaterThan(0);
  });
  
  test('all approaches maintain correctness', () => {
    const indexed = new IndexedMemorySystem();
    const cached = new CachedMemorySystem();
    const predictive = new PredictiveMemorySystem();
    
    const memory = { id: 1, content: 'test memory', tags: ['test'] };
    
    indexed.addMemory(memory);
    cached.storage.set(1, memory);
    predictive.cache.storage.set(1, memory);
    
    expect(indexed.findById(1)).toEqual(memory);
    expect(cached.get(1)).toEqual(memory);
    expect(predictive.get(1)).toEqual(memory);
  });
});
```

---

## Implementation Status

- [ ] Baseline performance measurement
- [ ] Inverted index implementation
- [ ] B-tree index implementation
- [ ] LRU cache implementation
- [ ] Two-tier cache system
- [ ] Markov chain predictor
- [ ] Semantic similarity predictor
- [ ] Hybrid system integration
- [ ] Performance benchmark suite
- [ ] Real-world simulation tests
- [ ] Regression test suite
- [ ] Results documentation

---

**Hypothesis 010 Status: DEFINED, READY FOR TESTING**

**Expected Duration**: 2 weeks
**Priority**: CRITICAL (blocks large-scale performance)
