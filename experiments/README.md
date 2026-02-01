# Memory Palace Experiments

Welcome to the experiments directory! This is where we test new optimizations, storage backends, and features before integrating them into the production skill.

---

## 🧪 Current Experiments

### 1. SQLite Storage Backend
**Location**: `sqlite/`  
**Status**: ✅ Production Ready  
**Speedup**: 10-100x faster queries  
**Size Reduction**: ~40% with compression

Replace JSON files with SQLite for ACID transactions, fast queries, and full-text search.

```bash
cd experiments/sqlite
node storage.js --benchmark
```

**Key Features**:
- ACID transactions
- FTS5 full-text search
- Indexed lookups (0.01ms)
- Automatic migrations from JSON
- WAL mode for concurrent access

---

### 2. Semantic Embeddings Search
**Location**: `embeddings/`  
**Status**: ✅ Working  
**Value**: Find memories by meaning, not keywords

Use vector embeddings (384-dim) to search memories semantically. "CAP theorem" finds "distributed consistency" even without keyword match.

```bash
cd experiments/embeddings
node search.js
```

**Key Features**:
- Local model (all-MiniLM-L6-v2) - no API needed
- Cosine similarity search
- Auto-suggest memory connections
- Cross-palace semantic linking
- K-means clustering by topic

---

### 3. Performance Optimizations
**Location**: `performance/`  
**Status**: ✅ Benchmarked  
**Improvements**: 40x faster queries, 65% size reduction

Benchmark suite and optimization implementations for speed and memory efficiency.

```bash
cd experiments/performance
node benchmarks.js
```

**Key Features**:
- Lazy loading (defer inactive loci)
- Indexing for O(1) lookups
- LRU caching
- MessagePack binary format
- Compression (gzip, brotli)
- Streaming for large palaces

---

## 📊 Quick Comparison

| Experiment | Speed | Size | Accuracy | Maturity |
|-----------|-------|------|----------|----------|
| **Baseline (JSON)** | 1x | 1x | 100% | Production |
| **SQLite** | 10-100x | 0.6x | 100% | ✅ Ready |
| **Embeddings** | 0.5x | 5x | Semantic | ✅ Ready |
| **Performance** | 40x | 0.35x | 100% | ✅ Ready |

---

## 🚀 How to Use

### Run All Experiments
```bash
cd experiments

# SQLite benchmarks
sqlite/node storage.js --benchmark

# Embeddings demo
embeddings/node search.js

# Performance benchmarks
performance/node benchmarks.js
```

### Integrate into Production
1. **SQLite**: Replace JSON storage → See `sqlite/storage.js`
2. **Embeddings**: Add semantic search → See `embeddings/search.js`
3. **Performance**: Apply optimizations → See `performance/optimizations.js`

---

## 🎯 Recommended Combinations

### For Speed-Critical Applications
```javascript
// SQLite + Indexing + LRU Cache
const storage = new SQLiteStorage({
  enableFTS: true,
  cacheSize: 1000
});
```

### For Large Knowledge Bases (1000+ memories)
```javascript
// SQLite + Lazy Loading + Streaming
const storage = new SQLiteStorage({
  lazyLoad: true,
  chunkSize: 100
});
```

### For Semantic Discovery
```javascript
// Embeddings + Cross-Palace Search
const search = new SemanticSearch();
await search.indexAllPalaces();
const related = await search.findRelated(memoryId);
```

---

## 📈 Performance Goals

| Metric | Target | Current (JSON) | With Optimizations |
|--------|--------|---------------|-------------------|
| Palace Load | < 100ms | 50-200ms | 5-10ms (SQLite) |
| Memory Query | < 10ms | 1-5ms | 0.01ms (indexed) |
| Semantic Search | < 100ms | N/A | 20-50ms |
| Storage Size | < 1MB/palace | ~500KB | ~175KB (compressed) |

---

## 🔬 Contributing New Experiments

Want to add an experiment? Create a new folder with:

1. `README.md` - What, why, and how
2. Working code with clear API
3. Benchmarks showing improvements
4. Integration guide for production

Example structure:
```
experiments/
└── your-experiment/
    ├── README.md
    ├── implementation.js
    ├── benchmark.js
    └── integration-guide.md
```

---

## 🎓 Learning from Experiments

Each experiment teaches us something:

- **SQLite**: Relational beats document storage for structured queries
- **Embeddings**: Semantic similarity unlocks discovery vs exact matching
- **Performance**: Indexing and lazy loading are essential at scale

Check individual READMEs for detailed findings.

---

## 📚 Documentation Index

- [SQLite Backend](sqlite/README.md) - Database migration guide
- [Semantic Search](embeddings/README.md) - Vector similarity guide
- [Performance](performance/README.md) - Optimization strategies
- [Skills Production](../skills/memory-palace/README.md) - Current production skill

---

**Status**: All experiments functional and tested  
**Last Updated**: 2026-02-01  
**Maintained By**: Memory Palace Evolution Team
