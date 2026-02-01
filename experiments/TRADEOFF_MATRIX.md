# Memory Palace Trade-Off Matrix

## The Three Dimensions

| Dimension | Metric | Current Value | Unit |
|-----------|--------|---------------|------|
| **Speed** | Recall latency | ~5 sec | seconds to first answer |
| **Accuracy** | Correctness rate | 82% | % of details correct |
| **Corpus** | Total memories | 93 | memory count |

## Trade-Off Configurations

### Config A: SPEED-OPTIMIZED (Interview Mode)
```
Speed:    ★★★★★ (sub-second)
Accuracy: ★★☆☆☆ (60-70%)
Corpus:   ★★★☆☆ (can handle 100+)

HOW: Quick-recall index, one-sentence definitions
COST: Lose nuance, edge cases, relationships
USE WHEN: Interview rapid-fire, time pressure
```

### Config B: ACCURACY-OPTIMIZED (Deep Recall)
```
Speed:    ★★☆☆☆ (30+ seconds)
Accuracy: ★★★★★ (95%+)
Corpus:   ★★☆☆☆ (limited by context)

HOW: Full palace walk, SMASHIN SCOPE images, elaboration
COST: Slow, can't scale, context-heavy
USE WHEN: Teaching, explaining, writing
```

### Config C: CORPUS-OPTIMIZED (Breadth Mode)
```
Speed:    ★★★☆☆ (moderate)
Accuracy: ★★★☆☆ (75-80%)
Corpus:   ★★★★★ (1000+ memories)

HOW: Compressed anchors, graph-based retrieval, lazy loading
COST: Shallow recall, miss connections
USE WHEN: Reference lookup, "do I know this?"
```

## Regression Risks

| Optimization | Regression Risk | Mitigation |
|--------------|-----------------|------------|
| Speed ↑ | Accuracy ↓ | Keep full images as backup |
| Accuracy ↑ | Speed ↓ | Index for fast lookup |
| Corpus ↑ | Both ↓ | Hierarchical organization |

## Cost Model

### Storage Costs
| Component | Size per Memory | 93 Memories | 1000 Memories |
|-----------|-----------------|-------------|---------------|
| Full JSON | ~2 KB | 186 KB | 2 MB |
| Quick-recall | ~100 bytes | 9 KB | 100 KB |
| Graph edges | ~50 bytes | 5 KB | 50 KB |
| Embeddings | ~1.5 KB | 140 KB | 1.5 MB |

### Retrieval Costs
| Method | Time Complexity | 93 Memories | 1000 Memories |
|--------|-----------------|-------------|---------------|
| Full scan | O(n) | 93 ops | 1000 ops |
| Topic index | O(1) | 1 op | 1 op |
| Graph traversal | O(e) | ~20 ops | ~200 ops |
| Semantic search | O(n) + embedding | 93 + 50ms | 1000 + 50ms |

## Test Plan

### Test Suite 1: Speed Under Load
- Measure: Time to first correct answer
- Variables: Corpus size (50, 100, 500, 1000)
- Expected: Linear degradation without indexing

### Test Suite 2: Accuracy vs Compression
- Measure: % correct details recalled
- Variables: Image length (full, medium, minimal)
- Expected: Non-linear drop below threshold

### Test Suite 3: Corpus Scaling
- Measure: When does system break?
- Variables: Total memories, graph density
- Expected: Context limits at ~200 full images

## Pareto Frontier

The optimal configurations form a frontier:

```
Accuracy
100% │    ★ Deep Recall
    │   ╱
 90% │  ╱
    │ ╱  ★ Balanced
 80% │╱
    │    ★ Quick Index
 70% │         ╲
    │          ★ Compressed
 60% │───────────────────
    0   1   2   3   4   5
         Speed (seconds)
```

## Recommended Profiles

| Profile | Speed | Accuracy | Corpus | Use Case |
|---------|-------|----------|--------|----------|
| Interview | 1s | 70% | 200 | Rapid-fire Q&A |
| Study | 10s | 90% | 100 | Learning new concepts |
| Reference | 2s | 80% | 500 | Quick lookup |
| Teaching | 30s | 95% | 50 | Deep explanation |
