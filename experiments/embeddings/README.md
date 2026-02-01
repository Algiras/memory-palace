# Semantic Search with Embeddings

A powerful semantic search system for Memory Palace that uses vector embeddings to find memories by meaning, not just keywords.

## Overview

This experiment implements embeddings-based semantic search that can:
- **Understand meaning**: Find "CAP theorem" when searching for "distributed consistency"
- **Cross-palace linking**: Automatically discover connections between related memories across different palaces
- **Auto-suggest connections**: Identify semantically related memories without manual tagging
- **Topic clustering**: Group memories by semantic topic automatically

## Why Embeddings?

### Traditional Keyword Search
```
Search: "CAP theorem"
→ Finds: "CAP theorem states that..." ✓
→ Misses: "Distributed consistency trade-offs" ✗
```

### Semantic Search (Embeddings)
```
Search: "CAP theorem"
→ Finds: "CAP theorem states that..." ✓
→ Finds: "Distributed consistency trade-offs" ✓
→ Finds: "Eventual consistency in NoSQL" ✓
```

**Key advantage**: Embeddings capture semantic meaning, not just word overlap. Two texts can be similar in meaning even without sharing keywords.

## Architecture

### Components

1. **Embedding Service** (`embedding-service.js`)
   - Generates 384-dimensional vectors from text
   - Local model: `all-MiniLM-L6-v2` via transformers.js
   - API fallback: OpenAI, Cohere
   - Persistent caching to avoid regeneration

2. **Semantic Search** (`search.js`)
   - In-memory vector storage (FAISS-like)
   - Cosine similarity for nearest neighbor search
   - Cross-palace semantic linking
   - Auto-connection discovery
   - K-means clustering

### Vector Dimensions

- **Model**: all-MiniLM-L6-v2 (384 dimensions)
- **Size**: ~1.5KB per embedding (JSON)
- **Performance**: Sub-millisecond similarity search (in-memory)
- **Quality**: Near state-of-the-art for sentence embeddings

## Installation

```bash
# Install transformers.js for local embeddings
npm install @xenova/transformers

# Optional: For API fallback
npm install openai
```

## Quick Start

### 1. Basic Embedding

```javascript
const { EmbeddingService } = require('./embedding-service');

const service = new EmbeddingService({
    provider: 'local',  // or 'openai', 'cohere', 'auto'
    verbose: true
});

await service.initialize();

// Generate embedding
const embedding = await service.embed('CAP theorem states that...');
// → Array of 384 numbers (e.g., [0.023, -0.156, 0.089, ...])
```

### 2. Semantic Search

```javascript
const { SemanticSearch } = require('./search');

const search = new SemanticSearch({
    verbose: true
});

await search.initialize();

// Index memories
const memories = [
    {
        id: 'mem-1',
        content: 'CAP theorem guarantees consistency and partition tolerance',
        subject: 'CAP Theorem',
        palaceId: 'system-design'
    },
    {
        id: 'mem-2',
        content: 'Strong consistency requires all nodes to agree',
        subject: 'Consistency',
        palaceId: 'system-design'
    },
    {
        id: 'mem-3',
        content: 'Caching reduces database load with fast lookups',
        subject: 'Caching',
        palaceId: 'performance'
    }
];

await search.indexMemories(memories);

// Search by meaning (not keywords!)
const results = await search.findByMeaning('distributed consistency trade-offs');

// Results (sorted by similarity):
// 1. CAP theorem (sim: 0.89)
// 2. Consistency (sim: 0.82)
// 3. Caching (sim: 0.31)
```

### 3. Find Related Memories

```javascript
// Find memories similar to a specific memory
const related = await search.findRelated('mem-1', { topK: 5 });

// Returns memories with similarity scores
// Useful for "Find more like this" functionality
```

### 4. Auto-Discover Connections

```javascript
// Automatically find semantically related memories
const connections = await search.suggestConnections({
    threshold: 0.75,           // Minimum similarity
    maxPerMemory: 3,           // Max connections per memory
    crossPalaceOnly: false     // Include same-palace connections
});

// Returns:
// [
//   {
//     sourceId: 'mem-1',
//     targetId: 'mem-2',
//     similarity: 0.82,
//     type: 'semantic',
//     reason: 'Both relate to distributed consistency'
//   }
// ]
```

### 5. Topic Clustering

```javascript
// Cluster memories by semantic topic
const clusters = await search.clusterByTopic({ k: 5 });

// Returns clusters with:
// - centroid (average vector)
// - memories (cluster members)
// - suggestedTopic (auto-generated label)
// - size (number of memories)
```

## Advanced Usage

### Cross-Palace Semantic Linking

```javascript
// Find connections across different palaces
const crossPalaceLinks = await search.findCrossPalaceConnections('mem-1');

// This discovers relationships like:
// - System Design Palace → Architecture Palace
// - Database concepts → Performance concepts
// - Security patterns → Distributed patterns
```

### Batch Embedding

```javascript
// Efficiently embed multiple memories at once
const texts = memories.map(m => m.content);
const embeddings = await service.embedBatch(texts, { batchSize: 32 });
```

### Custom Filtering

```javascript
// Search with custom filters
const results = await search.findByMeaning('scaling', {
    filter: (metadata) => metadata.palaceId === 'performance',
    minSimilarity: 0.6,
    topK: 10
});
```

### Using External APIs

```javascript
// OpenAI fallback
const service = new EmbeddingService({
    provider: 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY
});

// Auto mode (local first, API fallback)
const service = new EmbeddingService({
    provider: 'auto',
    openaiApiKey: process.env.OPENAI_API_KEY,
    fallbackEnabled: true
});
```

## Integration with Existing Storage

### JSON-based Palaces

```javascript
const fs = require('fs');

// Load existing palace
const palace = JSON.parse(fs.readFileSync('./palaces/system-design.json'));

// Extract memories from all loci
const memories = [];
for (const locus of palace.loci) {
    for (const memory of locus.memories) {
        memories.push({
            id: memory.id,
            content: `${memory.subject}: ${memory.content}`,
            subject: memory.subject,
            palaceId: palace.name,
            locusId: locus.id,
            original: memory
        });
    }
}

// Index for semantic search
await search.indexMemories(memories);
```

### SQLite Integration

```javascript
const { MemoryPalaceStorage } = require('../sqlite/storage');

// Load from SQLite
const storage = new MemoryPalaceStorage('memory_palace.db');
storage.initialize();

const dbMemories = storage.listMemories();

// Format for semantic search
const memories = dbMemories.map(m => ({
    id: m.id,
    content: `${m.subject}: ${m.content}`,
    subject: m.subject,
    palaceId: m.palace_name,
    locusId: m.locus_id
}));

await search.indexMemories(memories);
```

## Performance

### Benchmarks (all-MiniLM-L6-v2)

| Operation | Time | Notes |
|-----------|------|-------|
| Single embedding | ~100-500ms | First call (model load) |
| Cached embedding | <1ms | Subsequent calls |
| Batch embedding (32) | ~2-3s | Amortized |
| Similarity search | <10ms | In-memory, 1000 vectors |
| K-means clustering | ~100ms | 100 vectors, k=5 |

### Storage Requirements

| Data | Size |
|------|------|
| Single embedding | ~1.5KB (JSON) |
| 1000 embeddings | ~1.5MB |
| 10000 embeddings | ~15MB |

### Optimization Tips

1. **Use caching**: Enable persistent cache to avoid regenerating embeddings
2. **Batch operations**: Use `embedBatch()` for multiple memories
3. **Quantization**: Consider 8-bit quantization for storage (50% reduction)
4. **Incremental updates**: Only re-embed changed memories

## Trade-offs

### Benefits
- **Semantic understanding**: Finds related concepts without keyword matching
- **Cross-domain linking**: Connects memories across different palaces
- **Auto-organization**: Discovers topic clusters automatically
- **No manual tagging**: Semantic similarity replaces manual categorization

### Costs
- **Compute**: ~100-500ms per embedding (local model)
- **Storage**: ~1.5KB per memory embedding
- **API costs**: If using OpenAI/Cohere (~$0.10 per 1000 embeddings)
- **Cold start**: First embedding loads model (~2-5s)

### When to Use

✅ **Use embeddings when**:
- You have >50 memories to search
- Keywords don't capture relationships
- You need cross-palace connections
- Auto-discovery of relationships is valuable

❌ **Skip embeddings when**:
- <50 memories (keyword search is faster)
- Exact keyword matching is sufficient
- Storage space is severely constrained
- Offline-only and can't download models

## Examples

### Example 1: CAP Theorem Discovery

```javascript
// Search: "distributed consistency trade-offs"
// Results include:
// 1. CAP Theorem (sim: 0.89) - even though "CAP" not in query
// 2. Strong Consistency (sim: 0.82)
// 3. Eventual Consistency (sim: 0.78)
// 4. Database Sharding (sim: 0.45)

// The search finds related concepts without keyword overlap!
```

### Example 2: Auto-Connections

```javascript
// Without manual linking, the system discovers:
// "Microservices" (System Design Palace) 
//   → linked to →
// "Service Mesh" (Architecture Palace)
// 
// Similarity: 0.87
// Reason: Both relate to distributed service architecture
```

### Example 3: Topic Clusters

```javascript
// Automatic clustering groups:
// Cluster 1: Consistency & CAP (12 memories)
//   - CAP Theorem, Strong Consistency, Eventual Consistency, etc.
//
// Cluster 2: Scaling & Performance (8 memories)
//   - Horizontal Scaling, Caching, Load Balancing, etc.
//
// Cluster 3: Database Patterns (6 memories)
//   - Sharding, Replication, NoSQL, etc.
```

## Testing

```bash
# Run embedding service tests
node embedding-service.js

# Run semantic search tests
node search.js
```

## Future Enhancements

- **FAISS integration**: For millions of vectors
- **Hybrid search**: Combine keyword + semantic
- **Multi-modal**: Image embeddings for visual memories
- **Temporal analysis**: Track topic evolution over time
- **Query expansion**: Automatically broaden searches

## References

- [Sentence Transformers](https://www.sbert.net/)
- [all-MiniLM-L6-v2 Model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [transformers.js](https://github.com/xenova/transformers.js)
- [Vector Similarity Search](https://www.pinecone.io/learn/vector-similarity/)

## License

MIT - See root project for details.
