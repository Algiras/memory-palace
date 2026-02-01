# Evolution 010: Recall Speed Optimization

## 🎯 Question

**How do we achieve sub-100ms recall time for any memory, regardless of palace size?**

Current linear search becomes slow at 100+ memories. Users need instant access to any memory.

---

## 🧪 Hypothesis A: Inverted Index

**Claim**: Build inverted index (keyword → memory) for O(1) lookup by topic.

**Implementation**:
- Index all memory subjects and content
- Tokenize and stem words
- Map each keyword to memory IDs
- Search: union/intersection of keyword sets

**Expected**: <10ms search for any keyword

---

## 🧪 Hypothesis B: Semantic Cache

**Claim**: Keep "working set" of 50 most-likely-to-be-needed memories in memory.

**Implementation**:
- LRU cache of active memories
- Predictive loading based on:
  - Time of day patterns
  - Current topic context
  - Spaced repetition schedule
  - Recent access patterns
- Preload next 10 likely memories

**Expected**: 95% cache hit rate = 95% of recalls <10ms

---

## 🧪 Hypothesis C: Embedding Index (FAISS)

**Claim**: Use vector similarity search with FAISS for semantic lookups.

**Implementation**:
- Convert all memories to 384-dim embeddings
- Build FAISS index (IVF or HNSW)
- Search by vector similarity
- Supports fuzzy/semantic matching

**Expected**: <50ms for semantic search across 1000 memories

---

## 🧪 Hypothesis D: Predictive Preload

**Claim**: Use ML to predict which memories user will need next.

**Implementation**:
- Train model on user access patterns
- Features: time, recent topics, schedule, streak
- Predict top 20 memories for next session
- Preload into cache before user asks

**Expected**: 80% prediction accuracy = 80% instant recalls

---

## 📊 Test Methodology

### Performance Benchmarks

**Test 1: Cold Start Search**
- Search for random memory by subject
- Measure: Time to first result
- Target: <100ms

**Test 2: Cached Search**
- Search for recently-accessed memory
- Measure: Cache hit time
- Target: <10ms

**Test 3: Semantic Search**
- Search by concept (not exact keyword)
- Measure: Time to find semantically similar
- Target: <50ms

**Test 4: Scale Test**
- Test with 100, 500, 1000, 5000 memories
- Measure: Time vs memory count curve
- Target: O(1) or O(log n)

### A/B Test Protocol

**Group A**: Inverted Index (Elasticsearch-style)
**Group B**: LRU Semantic Cache
**Group C**: FAISS Vector Index
**Group D**: ML Predictive Preload
**Group E**: Baseline (linear scan)

**Test**: 1000 searches per approach
**Measure**: P50, P95, P99 latency
**Success**: P95 <100ms, P50 <10ms

---

## 📈 Expected Results

| Approach | P50 Latency | P95 Latency | P99 Latency | Space Overhead |
|----------|-------------|-------------|-------------|----------------|
| Baseline | 250ms | 500ms | 1000ms | 1x |
| Inverted Index | 5ms | 15ms | 30ms | 2x |
| LRU Cache | 2ms | 10ms | 100ms | 1.5x |
| FAISS Index | 20ms | 50ms | 100ms | 3x |
| Predictive | 1ms | 5ms | 50ms | 2x |

---

## 🔬 Implementation

```javascript
// Inverted Index
class InvertedIndex {
  index = new Map(); // word -> Set(memoryIds)
  
  add(memory) {
    const words = tokenize(memory.subject + ' ' + memory.content);
    words.forEach(word => {
      if (!this.index.has(word)) this.index.set(word, new Set());
      this.index.get(word).add(memory.id);
    });
  }
  
  search(query) {
    const words = tokenize(query);
    const results = words.map(w => this.index.get(w) || new Set());
    return intersection(...results);
  }
}

// LRU Cache
class MemoryCache {
  cache = new LRU({ max: 50 });
  
  get(id) {
    return this.cache.get(id); // O(1)
  }
  
  async preload(predictedIds) {
    const memories = await batchFetch(predictedIds);
    memories.forEach(m => this.cache.set(m.id, m));
  }
}

// FAISS Integration
class VectorSearch {
  index = null;
  
  async buildIndex(memories) {
    const embeddings = await embed(memories.map(m => m.content));
    this.index = new faiss.IndexIVFFlat(embeddings[0].length, 100);
    this.index.add(embeddings);
  }
  
  async search(query, k = 10) {
    const queryVec = await embed([query]);
    const { distances, indices } = this.index.search(queryVec, k);
    return indices.map(i => memories[i]);
  }
}

// Predictive Preload
class PredictiveEngine {
  model = null;
  
  async predict(userContext) {
    // Features: [hour, dayOfWeek, recentTopics, streak, pendingReviews]
    const features = extractFeatures(userContext);
    const probabilities = await this.model.predict(features);
    return topK(probabilities, 20);
  }
}
```

---

## 🎯 Success Criteria

- **P50 Latency**: <10ms
- **P95 Latency**: <50ms
- **P99 Latency**: <100ms
- **Cache Hit Rate**: >90%
- **Prediction Accuracy**: >70%
- **Scale**: Linear performance up to 10,000 memories

---

## 🏆 Selection Logic

### Inverted Index Wins If:
- Keyword search is primary use case
- Exact match is important
- Low memory overhead required

### LRU Cache Wins If:
- Users access recent memories repeatedly
- Simple implementation preferred
- Memory limited

### FAISS Wins If:
- Semantic search is critical
- Fuzzy matching needed
- GPU available for acceleration

### Predictive Wins If:
- User patterns are predictable
- Willing to train ML model
- Maximum speed required

### Hybrid Approach:
- Combine: Inverted Index + LRU Cache
- 90% of queries from cache (2ms)
- 10% from index (5ms)
- Average: 2.3ms

---

*Evolution 010: Instant recall for infinite knowledge*
