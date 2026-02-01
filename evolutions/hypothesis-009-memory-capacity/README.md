# Hypothesis 009: Memory Capacity Expansion

## The Question

**How do we scale beyond 100 memories per palace without cognitive overload?**

Current limitation: ~100 memories per palace before recall degradation (Miller's Law + cognitive load)

Three approaches to test:
- **Approach A**: Current single-palace design (baseline)
- **Approach B**: Chunked mega-palaces (sub-palaces within master)
- **Approach C**: Linked palace networks (distributed with cross-references)

---

## Background

### The Cognitive Ceiling Problem

```
Memory Count vs Recall Accuracy
100% ┤██████████████████████████████████████ 5 memories
 95% ┤███████████████████████████████████░░ 10 memories
 90% ┤████████████████████████████████░░░░░ 20 memories
 85% ┤█████████████████████████████░░░░░░░░ 50 memories
 75% ┤███████████████████████░░░░░░░░░░░░░░ 100 memories (current)
 60% ┤████████████████░░░░░░░░░░░░░░░░░░░░░ 200 memories (problem!)
 40% ┤██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ 500 memories
     └────┬────┬────┬────┬────┬────┬────┬────
         5   10   20   50  100  200  500  1000
```

**Miller's Law**: Humans can hold 7±2 items in working memory. Beyond this, chunking required.

### Why Scale Matters

- **Knowledge domains**: Programming languages, medical studies, law require 500+ memories
- **Long-term learning**: 2-year curriculum = ~2000 discrete memories
- **Professional expertise**: Experts have 10,000+ organized memories

---

## Theory Comparison

### Approach A: Single Palace (Baseline)

**Structure**: One palace with 100 loci, flat organization

```
Palace: "Programming Languages"
├── Locus 1: Python Basics
├── Locus 2: Python Functions
├── ... (100 loci)
└── Locus 100: Advanced Topics
```

**Pros**:
- Simple mental model
- No switching cost
- Familiar territory

**Cons**:
- Hard to navigate 100+ loci
- No categorical grouping
- Retrieval time increases exponentially

**Expected Capacity**: 100 memories maximum

---

### Approach B: Chunked Mega-Palaces

**Structure**: Master palace containing themed sub-palaces (chunks)

```
Mega-Palace: "Programming Languages"
├── Sub-Palace A: "Python" (7 loci)
│   ├── Locus 1: Syntax Basics
│   ├── Locus 2: Data Types
│   └── ... (5 more)
├── Sub-Palace B: "JavaScript" (7 loci)
│   ├── Locus 1: ES6+ Features
│   ├── Locus 2: Async Patterns
│   └── ... (5 more)
├── Sub-Palace C: "Rust" (7 loci)
└── ... (N sub-palaces, each 7±2 loci)
```

**Chunking Principle**:
- Each sub-palace respects Miller's Law (7±2 loci)
- Master palace holds sub-palace entry points (also 7±2)
- Total capacity = chunks × chunk_size = 10 × 7 = 70 memories per mega-palace level
- Multi-level: 70 × 70 = 4900 memories with 2 levels

**Pros**:
- Hierarchical mental model (natural)
- Categorical organization
- Scales exponentially with depth
- Maintains 7±2 at each level

**Cons**:
- Navigation requires two-step recall (sub-palace → locus)
- Higher cognitive load for switching
- Requires upfront categorization

**Expected Capacity**: 500-5000 memories (2-3 levels)

---

### Approach C: Linked Palace Networks

**Structure**: Multiple independent palaces with semantic cross-references

```
Palace Network: "Computer Science"
├── Palace 1: "Algorithms" (9 loci)
│   └── Locus 5: "QuickSort" → links to [Palace 3, Locus 2]
├── Palace 2: "Data Structures" (9 loci)
│   └── Locus 3: "Binary Trees" → links to [Palace 4, Locus 7]
├── Palace 3: "Complexity Theory" (9 loci)
└── Palace 4: "Databases" (9 loci)
```

**Link Types**:
- **Conceptual**: "QuickSort uses Divide & Conquer → See Algorithms.DivideConquer"
- **Prerequisite**: "Requires understanding of Recursion → See Basics.Recursion"
- **Related**: "Similar to MergeSort → See Algorithms.MergeSort"
- **Application**: "Used in Database indexing → See Databases.BTrees"

**Pros**:
- Each palace remains manageable (7±2 loci)
- Cross-domain connections emerge naturally
- Semantic relationships enhance recall
- Flexible, non-hierarchical

**Cons**:
- Links must be maintained
- Risk of broken references
- Navigation can be unpredictable
- Higher storage overhead

**Expected Capacity**: Unlimited (limited only by link maintenance)

---

## Predictions

### Hypothesis B Wins (Chunking)

**Claim**: Chunked mega-palaces enable 5× capacity (500 memories) with only 15% recall degradation vs 50% for flat palaces.

**Why**: Hierarchical chunking respects cognitive limits at each level while enabling exponential scaling.

### Hypothesis C Wins (Network)

**Claim**: Linked palace networks achieve better recall than mega-palaces because semantic associations strengthen memory traces.

**Why**: The "memory palace" technique relies on spatial + associative memory. Networks enhance the associative component.

### Combined Approach Wins

**Claim**: Hybrid approach (chunked mega-palaces + selective linking) achieves 10× capacity with 90% recall accuracy.

**Why**: Best of both worlds - hierarchical organization + semantic connections.

---

## Test Design

### Methodology

**Phase 1: Controlled Memory Load Test**

```javascript
const testScenarios = [
  { memories: 50, approach: 'single' },
  { memories: 50, approach: 'chunked' },
  { memories: 50, approach: 'linked' },
  { memories: 100, approach: 'single' },
  { memories: 100, approach: 'chunked' },
  { memories: 100, approach: 'linked' },
  { memories: 200, approach: 'chunked' },
  { memories: 200, approach: 'linked' },
  { memories: 500, approach: 'chunked' },
  { memories: 500, approach: 'linked' }
];
```

**Phase 2: Longitudinal Retention Test**
- Learn 100 memories with each approach
- Test recall at: Day 0, Day 1, Day 3, Day 7, Day 14, Day 30
- Measure retention curves

**Phase 3: Stress Test**
- Rapid insertion: 100 memories in 1 hour
- Random access: Query 50 random memories
- Measure time-to-recall and accuracy

### Metrics

**Primary Metrics**:
1. **Recall Accuracy**: % of memories correctly recalled
2. **Time to Recall**: ms to locate specific memory
3. **Navigation Efficiency**: Steps required to find memory

**Secondary Metrics**:
1. **Cognitive Load**: Self-reported difficulty (1-10 scale)
2. **Learning Speed**: Memories learned per hour
3. **Retention Decay**: Accuracy loss over 30 days

**Efficiency Metrics**:
1. **Storage Overhead**: Bytes per memory (including structure)
2. **Query Complexity**: Average query time across different access patterns
3. **Maintenance Burden**: Time to reorganize/add memories

---

## Implementation A: Single Palace (Baseline)

```javascript
class SinglePalace {
  constructor(name, maxLoci = 100) {
    this.name = name;
    this.loci = []; // Array of 100 loci max
    this.memories = new Map(); // locusIndex -> memory[]
  }
  
  addMemory(memory, locusIndex) {
    if (this.loci.length >= 100) {
      throw new Error('Palace capacity exceeded (100 loci)');
    }
    this.memories.set(locusIndex, memory);
  }
  
  findMemory(query) {
    // Linear search through all memories
    for (let [locus, memory] of this.memories) {
      if (memory.matches(query)) return { locus, memory };
    }
    return null;
  }
}
```

**Capacity**: Hard limit at 100 memories
**Query**: O(n) linear search

---

## Implementation B: Chunked Mega-Palace

```javascript
class MegaPalace {
  constructor(name) {
    this.name = name;
    this.subPalaces = new Map(); // category -> SubPalace
    this.chunkSize = 7; // Miller's Law
  }
  
  addSubPalace(category) {
    if (this.subPalaces.size >= this.chunkSize) {
      throw new Error('Master palace full (7 sub-palaces)');
    }
    this.subPalaces.set(category, new SubPalace(category));
  }
  
  addMemory(memory, category, locusIndex) {
    const subPalace = this.subPalaces.get(category);
    if (!subPalace) {
      this.addSubPalace(category);
    }
    subPalace.addMemory(memory, locusIndex % this.chunkSize);
  }
  
  findMemory(query) {
    // Two-level search: category -> locus
    for (let [category, subPalace] of this.subPalaces) {
      const result = subPalace.findMemory(query);
      if (result) return { category, ...result };
    }
    return null;
  }
}

class SubPalace {
  constructor(name) {
    this.name = name;
    this.loci = new Array(7);
  }
  
  addMemory(memory, locusIndex) {
    this.loci[locusIndex] = memory;
  }
  
  findMemory(query) {
    for (let i = 0; i < this.loci.length; i++) {
      if (this.loci[i]?.matches(query)) {
        return { locus: i, memory: this.loci[i] };
      }
    }
    return null;
  }
}
```

**Capacity**: 7 chunks × 7 loci = 49 memories per level
**With Nesting**: 49 × 49 = 2401 memories (2 levels)
**Query**: O(chunks + chunk_size) = O(14)

---

## Implementation C: Linked Palace Network

```javascript
class PalaceNetwork {
  constructor() {
    this.palaces = new Map(); // name -> Palace
    this.links = new Graph(); // palaceA/locusA -> palaceB/locusB
  }
  
  addPalace(palace) {
    this.palaces.set(palace.name, palace);
  }
  
  createLink(from, to, linkType) {
    // from/to format: "palaceName:locusIndex"
    this.links.addEdge(from, to, { type: linkType });
  }
  
  addMemory(memory, palaceName, locusIndex) {
    const palace = this.palaces.get(palaceName);
    palace.addMemory(memory, locusIndex);
  }
  
  findMemory(query, strategy = 'depth-first') {
    // Graph traversal with memoization
    const visited = new Set();
    const queue = [...this.palaces.values()];
    
    for (let palace of queue) {
      const result = palace.findMemory(query);
      if (result) return { palace: palace.name, ...result };
      
      // Follow links to connected palaces
      for (let link of this.links.getEdges(palace.name)) {
        if (!visited.has(link.target)) {
          visited.add(link.target);
          queue.push(this.palaces.get(link.target));
        }
      }
    }
    return null;
  }
  
  // Semantic discovery: find related memories
  findRelated(palaceName, locusIndex) {
    const key = `${palaceName}:${locusIndex}`;
    return this.links.getEdges(key);
  }
}
```

**Capacity**: Unlimited (scales with palace count)
**Query**: O(palaces + links) - depends on graph structure
**Storage Overhead**: +30% for link structure

---

## Success Metrics

### Primary Success Criteria

| Metric | Single (Baseline) | Chunked | Linked | Winner |
|--------|------------------|---------|--------|--------|
| Max Memories | 100 | 500+ | Unlimited | Chunked/Linked |
| Recall @ 50 memories | 90% | 90% | 92% | Linked |
| Recall @ 100 memories | 75% | 85% | 80% | Chunked |
| Recall @ 200 memories | 60% | 78% | 70% | Chunked |
| Time to Recall | 500ms | 800ms | 1200ms | Single |
| Cognitive Load | 7/10 | 5/10 | 6/10 | Chunked |

### Statistical Targets

**Chunked Mega-Palaces WIN if**:
1. 200-memory recall > 75% (vs 60% baseline)
2. 500-memory recall > 65% (vs <40% baseline)
3. Query time < 1s for 500 memories
4. Cognitive load ≤ 6/10

**Linked Networks WIN if**:
1. Semantic associations improve recall by >10%
2. Cross-palace discovery rate > 30%
3. User-reported "understanding" score > 8/10
4. No significant query time regression

---

## Expected Outcomes

### Best Case: Hybrid Chunked+Linked

**Decision**: Implement both approaches, allow user choice
**Capacity**: 1000+ memories per topic
**Recall**: 85% at 500 memories
**Trade-off**: 20% slower queries, 40% higher storage

### Moderate Case: Chunked Wins

**Decision**: Replace single-palace with chunked as default
**Capacity**: 500 memories (5× improvement)
**Recall**: 80% at 200 memories
**Migration**: Auto-convert large palaces to chunked

### Null Case: No Clear Winner

**Decision**: Keep single-palace, document capacity limits
**Workaround**: Recommend multiple palaces for large domains
**Note**: 100 memories sufficient for most use cases

### Worst Case: Complexity Not Worth It

**Decision**: Abandon scaling research
**Reason**: Cognitive overhead negates capacity benefits
**Alternative**: Focus on memory quality over quantity

---

## Regression Tests

```javascript
describe('Memory Capacity Expansion', () => {
  test('single palace respects 100-memory limit', () => {
    const palace = new SinglePalace('Test');
    for (let i = 0; i < 100; i++) {
      palace.addMemory({ id: i }, i);
    }
    expect(() => palace.addMemory({ id: 101 }, 100)).toThrow();
  });
  
  test('chunked palace scales to 500 memories', () => {
    const mega = new MegaPalace('Test');
    for (let i = 0; i < 500; i++) {
      const category = `Category${Math.floor(i / 7)}`;
      mega.addMemory({ id: i }, category, i % 7);
    }
    expect(mega.subPalaces.size).toBe(72); // 500/7 ≈ 72 sub-palaces
  });
  
  test('linked network supports cross-palace queries', () => {
    const network = new PalaceNetwork();
    const p1 = new SinglePalace('Palace1');
    const p2 = new SinglePalace('Palace2');
    network.addPalace(p1);
    network.addPalace(p2);
    network.createLink('Palace1:0', 'Palace2:3', 'related');
    
    const related = network.findRelated('Palace1', 0);
    expect(related).toHaveLength(1);
    expect(related[0].target).toBe('Palace2:3');
  });
  
  test('recall accuracy degrades gracefully', () => {
    const palace = new MegaPalace('StressTest');
    // Add 200 memories
    for (let i = 0; i < 200; i++) {
      palace.addMemory({ id: i, query: `memory-${i}` }, `Cat${i % 10}`, i % 7);
    }
    
    // Test recall of 50 random memories
    let correct = 0;
    for (let i = 0; i < 50; i++) {
      const target = Math.floor(Math.random() * 200);
      const result = palace.findMemory(`memory-${target}`);
      if (result) correct++;
    }
    expect(correct / 50).toBeGreaterThan(0.75); // >75% recall
  });
});
```

---

## Implementation Status

- [ ] Single palace baseline implementation
- [ ] Chunked mega-palace implementation
- [ ] Linked palace network implementation
- [ ] 50/100/200/500 memory stress tests
- [ ] Longitudinal retention study (30 days)
- [ ] Query performance benchmarks
- [ ] Cognitive load user study
- [ ] Statistical analysis module
- [ ] Regression test suite
- [ ] Results documentation

---

**Hypothesis 009 Status: DEFINED, READY FOR TESTING**

**Expected Duration**: 2 weeks
**Priority**: HIGH (blocks large-scale adoption)
