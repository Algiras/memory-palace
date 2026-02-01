# Hypothesis 011: Memory Compression

## The Question

**How do we reduce memory storage by 80% without losing meaning?**

Current storage overhead:
- Plain text: ~2KB per memory (content + metadata)
- 1000 memories = 2MB storage
- Network sync: Slow, expensive
- Mobile storage: Constrained

Three approaches to test:
- **Approach A**: Plain text (baseline)
- **Approach B**: Semantic embeddings (dense vectors)
- **Approach C**: Binary encoding (serialized structures)

Target: 80% reduction (400 bytes per memory vs 2000 bytes)

---

## Background

### Storage Cost Analysis

```
Current Memory Structure (JSON):
{
  "id": "uuid-1234",           // 36 bytes
  "content": "QuickSort is...", // ~1000 bytes (avg)
  "metadata": {
    "palace": "algorithms",     // 20 bytes
    "locus": 5,                 // 8 bytes
    "tags": ["sorting", "divide-conquer"], // 40 bytes
    "created": "2026-01-15",    // 20 bytes
    "lastRecalled": "2026-01-20", // 20 bytes
    "strength": 0.85            // 16 bytes
  }
}
Total: ~2160 bytes per memory

At Scale:
- 100 memories: 216 KB
- 1000 memories: 2.16 MB
- 10000 memories: 21.6 MB
```

**Storage Bottlenecks**:
1. **Text overhead**: Full content stored verbatim
2. **JSON overhead**: Key names, brackets, quotes
3. **UUIDs**: 36 bytes per ID
4. **Timestamps**: ISO strings vs binary
5. **Redundancy**: Palace names repeated

---

## Theory Comparison

### Approach A: Plain Text (Baseline)

**Format**: JSON with full text content

```json
{
  "id": "mem-abc123",
  "content": "The QuickSort algorithm works by selecting a 'pivot' element from the array and partitioning the other elements into two sub-arrays according to whether they are less than or greater than the pivot. The sub-arrays are then sorted recursively.",
  "metadata": {
    "palace": "algorithms",
    "locus": 3,
    "tags": ["sorting", "divide-conquer", "recursive"],
    "created": "2026-01-15T10:30:00Z",
    "strength": 0.85
  }
}
```

**Size**: ~500-2000 bytes per memory (varies by content length)

**Pros**:
- Human readable
- Easy to debug
- Universal compatibility
- No encoding/decoding cost

**Cons**:
- High storage overhead
- Slow to parse (text processing)
- Large network payload
- Redundant palace/tag storage

**Compression Potential**: 0% (baseline)

---

### Approach B: Semantic Embeddings

**Concept**: Store dense vector representations instead of text

```
Traditional: "QuickSort uses divide and conquer"
→ 40 characters = 40 bytes

Embedding: [0.234, -0.891, 0.445, 0.123, ..., -0.567]
→ 384 dimensions × 4 bytes = 1536 bytes (float32)
→ OR: 384 dimensions × 2 bytes = 768 bytes (float16)

Wait - that's larger! But we don't store text at all.

Hybrid approach:
- Store embedding: 768 bytes
- Store compressed summary: 50 bytes
- Total: 818 bytes vs 2000 bytes = 59% reduction
```

**Structure**:
```javascript
{
  id: 4 bytes,          // Integer ID, not UUID
  embedding: 768 bytes, // float16[384] - semantic meaning
  summary: 50 bytes,    // Compressed text summary
  palace_id: 2 bytes,   // Reference to palace table
  locus: 1 byte,        // 0-255
  tags: 10 bytes,       // Bitmask or tag IDs
  created: 4 bytes,     // Unix timestamp
  strength: 1 byte,     // 0-255 mapped to 0.0-1.0
}
Total: ~840 bytes vs 2000 bytes = 58% reduction
```

**Vector Database Benefits**:
- Semantic search built-in
- Similarity queries without text
- Fixed-size storage
- Fast nearest-neighbor search

**Pros**:
- Fixed size (predictable storage)
- Enables semantic operations
- Good compression ratio
- Fast similarity search

**Cons**:
- Lossy compression (can't reconstruct exact text)
- Requires embedding model
- Cannot edit content directly
- Cold start (generate embeddings)

**Use Cases**:
- Archive/old memories
- Semantic search index
- Cross-palace similarity
- Mobile/offline storage

---

### Approach C: Binary Encoding

**Concept**: Custom binary protocol instead of JSON

```
Memory Binary Format v1:
┌─────────────────────────────────────────────────────┐
│ Header (16 bytes)                                   │
│ ├── Magic: "MPAL" (4 bytes)                        │
│ ├── Version: 1 (1 byte)                            │
│ ├── Flags: compression, encryption (1 byte)        │
│ └── Reserved: 10 bytes                             │
├─────────────────────────────────────────────────────┤
│ ID (4 bytes) - uint32                               │
├─────────────────────────────────────────────────────┤
│ Palace Reference (2 bytes) - uint16                 │
├─────────────────────────────────────────────────────┤
│ Locus (1 byte) - uint8                              │
├─────────────────────────────────────────────────────┤
│ Strength (1 byte) - uint8 (0-255)                   │
├─────────────────────────────────────────────────────┤
│ Created (4 bytes) - uint32 timestamp                │
├─────────────────────────────────────────────────────┤
│ Last Recalled (4 bytes) - uint32 timestamp          │
├─────────────────────────────────────────────────────┤
│ Tags (variable)                                     │
│ ├── Count: 1 byte                                   │
│ └── Tag IDs: 2 bytes each                           │
├─────────────────────────────────────────────────────┤
│ Content (variable)                                  │
│ ├── Length: 2 bytes (uint16)                        │
│ └── Text: UTF-8 bytes                               │
└─────────────────────────────────────────────────────┘

Example Memory:
- Header: 16 bytes
- ID: 4 bytes
- Palace: 2 bytes
- Locus: 1 byte
- Strength: 1 byte
- Timestamps: 8 bytes
- Tags (3): 1 + 6 = 7 bytes
- Content (200 chars): 2 + 200 = 202 bytes
Total: 241 bytes vs 2000 bytes = 88% reduction!
```

**Compression Layers**:
1. **Binary encoding**: Remove JSON overhead
2. **Integer IDs**: Replace UUIDs (36→4 bytes)
3. **Reference tables**: Palace names stored once
4. **Bitmasks**: Tags as bits instead of strings
5. **Delta encoding**: Timestamps relative to base
6. **Snappy/Zstd**: Optional compression on content

**Pros**:
- Maximum compression (80-90%)
- Fast parsing (no text processing)
- Binary-searchable
- Network efficient

**Cons**:
- Not human readable
- Schema versioning complexity
- Debugging harder
- Custom tooling required

---

## Predictions

### Hypothesis B Wins (Embeddings)

**Claim**: Semantic embeddings achieve 60% compression while enabling new capabilities (similarity search, clustering).

**Why**: Modern embedding models capture meaning efficiently. Fixed-size vectors eliminate variable text overhead.

### Hypothesis C Wins (Binary)

**Claim**: Binary encoding achieves 85% compression with zero information loss and faster parsing.

**Why**: JSON is extremely inefficient. Binary removes all overhead while preserving exact content.

### Hybrid Wins (Binary + Selective Embeddings)

**Claim**: Store recent memories in binary (editable), archive old memories as embeddings (searchable). Achieve 75% overall compression.

**Why**: Best of both worlds - editability for active learning, compression for storage.

---

## Test Design

### Methodology

**Phase 1: Storage Size Comparison**

```javascript
const testMemories = [
  { size: 'small', content: 'QuickSort uses pivot.' },
  { size: 'medium', content: 'QuickSort algorithm selects pivot, partitions array...' },
  { size: 'large', content: 'QuickSort detailed explanation with examples and code...' }
];

const approaches = ['json', 'binary', 'embedding'];

// Measure storage for each
approaches.forEach(approach => {
  testMemories.forEach(memory => {
    const serialized = serialize(memory, approach);
    console.log(`${approach} ${memory.size}: ${serialized.length} bytes`);
  });
});
```

**Phase 2: Fidelity Testing**

Critical question: Can we recover the original meaning?

```javascript
// For embeddings - reconstruct text
function testEmbeddingFidelity(memory) {
  const embedding = generateEmbedding(memory.content);
  const reconstructed = reconstructFromEmbedding(embedding);
  
  const similarity = semanticSimilarity(memory.content, reconstructed);
  return similarity; // Should be >0.85
}

// For binary - exact match
function testBinaryFidelity(memory) {
  const binary = encodeBinary(memory);
  const decoded = decodeBinary(binary);
  
  return deepEqual(memory, decoded); // Must be true
}
```

**Phase 3: Performance Testing**

```javascript
// Parse speed
const jsonTime = measure(() => JSON.parse(jsonData));
const binaryTime = measure(() => decodeBinary(binaryData));

// Network transmission
const jsonPayload = JSON.stringify(memories).length;
const binaryPayload = encodeBinaryBatch(memories).length;
```

### Metrics

**Primary Metrics**:
1. **Compression Ratio**: (original - compressed) / original
2. **Fidelity Score**: Semantic similarity for embeddings, exact match for binary
3. **Parse Speed**: Time to deserialize

**Secondary Metrics**:
1. **Search Performance**: Query time on compressed data
2. **Edit Cost**: Cost of modifying compressed memory
3. **Network Savings**: Payload size reduction
4. **Storage Savings**: Disk space reduction

**Efficiency Metrics**:
1. **Encoding Overhead**: CPU cost to compress
2. **Memory Overhead**: RAM used during operations
3. **Index Size**: Additional structures needed
4. **Maintenance Cost**: Schema migration complexity

---

## Implementation A: Plain Text (Baseline)

```javascript
class PlainTextStorage {
  serialize(memory) {
    return JSON.stringify(memory);
  }
  
  deserialize(data) {
    return JSON.parse(data);
  }
  
  getSize(memory) {
    return this.serialize(memory).length;
  }
}
```

**Compression**: 0%
**Fidelity**: 100%
**Overhead**: Minimal

---

## Implementation B: Semantic Embeddings

```javascript
class EmbeddingStorage {
  constructor() {
    this.embeddingModel = new EmbeddingModel('all-MiniLM-L6-v2');
    this.embeddings = new Map(); // id -> vector
    this.summaries = new Map(); // id -> compressed summary
  }
  
  async compress(memory) {
    // Generate embedding
    const embedding = await this.embeddingModel.encode(memory.content);
    
    // Create summary (for reconstruction)
    const summary = this.createSummary(memory.content);
    
    return {
      id: this.compressId(memory.id),
      embedding: this.quantize(embedding), // float32 -> float16
      summary: summary,
      palace_id: this.getPalaceId(memory.metadata.palace),
      locus: memory.metadata.locus,
      tags: this.compressTags(memory.metadata.tags),
      created: this.compressTimestamp(memory.metadata.created),
      strength: Math.floor(memory.metadata.strength * 255)
    };
  }
  
  quantize(embedding) {
    // Convert float32 to float16 for 50% size reduction
    return embedding.map(v => {
      // Simple quantization (in practice use proper float16)
      return Math.max(-32768, Math.min(32767, v * 1000));
    });
  }
  
  createSummary(content) {
    // Extract key phrases (50 char limit)
    const sentences = content.split('.');
    return sentences[0].slice(0, 50);
  }
  
  decompress(compressed) {
    return {
      id: this.decompressId(compressed.id),
      embedding: compressed.embedding,
      summary: compressed.summary,
      palace: this.getPalaceName(compressed.palace_id),
      locus: compressed.locus,
      tags: this.decompressTags(compressed.tags),
      created: this.decompressTimestamp(compressed.created),
      strength: compressed.strength / 255
    };
  }
  
  // Semantic search on compressed data
  search(query, topK = 5) {
    const queryEmbedding = this.embeddingModel.encode(query);
    
    const similarities = [];
    for (let [id, embedding] of this.embeddings) {
      const sim = cosineSimilarity(queryEmbedding, embedding);
      similarities.push({ id, similarity: sim });
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

// Embedding model wrapper
class EmbeddingModel {
  constructor(modelName) {
    this.model = null; // Load ONNX/TensorFlow model
  }
  
  async encode(text) {
    // Tokenize
    const tokens = this.tokenize(text);
    
    // Run inference
    const embedding = await this.model.predict(tokens);
    
    // Normalize
    return this.normalize(embedding);
  }
  
  tokenize(text) {
    // WordPiece/BPE tokenization
    return text.toLowerCase().split(/\s+/);
  }
  
  normalize(embedding) {
    const magnitude = Math.sqrt(embedding.reduce((a, b) => a + b*b, 0));
    return embedding.map(v => v / magnitude);
  }
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

**Storage Breakdown**:
- Embedding (float16): 384 × 2 = 768 bytes
- Summary: 50 bytes
- Metadata: 12 bytes
- Total: ~830 bytes vs 2000 bytes = **58% reduction**

---

## Implementation C: Binary Encoding

```javascript
class BinaryStorage {
  constructor() {
    this.palaceTable = new Map(); // name -> id
    this.tagTable = new Map(); // tag -> id
    this.nextPalaceId = 1;
    this.nextTagId = 1;
  }
  
  encode(memory) {
    const buffer = new ArrayBuffer(1024); // Max size
    const view = new DataView(buffer);
    let offset = 0;
    
    // Header
    this.writeHeader(view, offset);
    offset += 16;
    
    // ID (4 bytes - uint32 instead of UUID)
    const id = this.hashId(memory.id);
    view.setUint32(offset, id);
    offset += 4;
    
    // Palace ID (2 bytes)
    const palaceId = this.getOrCreatePalaceId(memory.metadata.palace);
    view.setUint16(offset, palaceId);
    offset += 2;
    
    // Locus (1 byte)
    view.setUint8(offset, memory.metadata.locus);
    offset += 1;
    
    // Strength (1 byte - 0-255)
    view.setUint8(offset, Math.floor(memory.metadata.strength * 255));
    offset += 1;
    
    // Timestamps (4 bytes each)
    view.setUint32(offset, this.dateToTimestamp(memory.metadata.created));
    offset += 4;
    view.setUint32(offset, this.dateToTimestamp(memory.metadata.lastRecalled));
    offset += 4;
    
    // Tags (variable)
    const tagIds = memory.metadata.tags.map(t => this.getOrCreateTagId(t));
    view.setUint8(offset, tagIds.length);
    offset += 1;
    tagIds.forEach(tagId => {
      view.setUint16(offset, tagId);
      offset += 2;
    });
    
    // Content (variable)
    const contentBytes = new TextEncoder().encode(memory.content);
    view.setUint16(offset, contentBytes.length);
    offset += 2;
    
    // Copy content bytes
    const contentView = new Uint8Array(buffer, offset, contentBytes.length);
    contentView.set(contentBytes);
    offset += contentBytes.length;
    
    // Return trimmed buffer
    return buffer.slice(0, offset);
  }
  
  decode(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    
    // Skip header
    offset += 16;
    
    // ID
    const id = view.getUint32(offset);
    offset += 4;
    
    // Palace
    const palaceId = view.getUint16(offset);
    offset += 2;
    
    // Locus
    const locus = view.getUint8(offset);
    offset += 1;
    
    // Strength
    const strength = view.getUint8(offset) / 255;
    offset += 1;
    
    // Timestamps
    const created = this.timestampToDate(view.getUint32(offset));
    offset += 4;
    const lastRecalled = this.timestampToDate(view.getUint32(offset));
    offset += 4;
    
    // Tags
    const tagCount = view.getUint8(offset);
    offset += 1;
    const tags = [];
    for (let i = 0; i < tagCount; i++) {
      const tagId = view.getUint16(offset);
      tags.push(this.getTagName(tagId));
      offset += 2;
    }
    
    // Content
    const contentLength = view.getUint16(offset);
    offset += 2;
    const contentBytes = new Uint8Array(buffer, offset, contentLength);
    const content = new TextDecoder().decode(contentBytes);
    
    return {
      id: this.unhashId(id),
      content,
      metadata: {
        palace: this.getPalaceName(palaceId),
        locus,
        tags,
        created,
        lastRecalled,
        strength
      }
    };
  }
  
  writeHeader(view, offset) {
    // Magic: "MPAL"
    view.setUint8(offset, 0x4D); // 'M'
    view.setUint8(offset + 1, 0x50); // 'P'
    view.setUint8(offset + 2, 0x41); // 'A'
    view.setUint8(offset + 3, 0x4C); // 'L'
    
    // Version
    view.setUint8(offset + 4, 1);
    
    // Flags
    view.setUint8(offset + 5, 0);
    
    // Reserved
    for (let i = 6; i < 16; i++) {
      view.setUint8(offset + i, 0);
    }
  }
  
  hashId(uuid) {
    // Simple hash for demo (use proper hash in production)
    return uuid.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 0xFFFFFFFF;
  }
  
  dateToTimestamp(date) {
    return Math.floor(new Date(date).getTime() / 1000);
  }
  
  timestampToDate(timestamp) {
    return new Date(timestamp * 1000).toISOString();
  }
}
```

**Storage Breakdown** (average memory):
- Header: 16 bytes
- ID: 4 bytes
- Palace: 2 bytes
- Locus: 1 byte
- Strength: 1 byte
- Timestamps: 8 bytes
- Tags (3): 7 bytes
- Content (150 chars): 152 bytes
- **Total: 191 bytes vs 2000 bytes = 90% reduction!**

---

## Success Metrics

### Compression Targets

| Approach | Size per Memory | Compression | Fidelity | Speed |
|----------|----------------|-------------|----------|-------|
| Plain Text | 2000 bytes | 0% | 100% | Baseline |
| Embeddings | 840 bytes | 58% | ~85%* | Fast |
| Binary | 240 bytes | 88% | 100% | Very Fast |
| **Target** | **400 bytes** | **80%** | **>90%** | **<10ms** |

*Fidelity = semantic similarity to original

### Statistical Validation

**Binary Encoding WINS if**:
1. Compression >80% (≤400 bytes/memory)
2. Fidelity = 100% (exact reconstruction)
3. Parse speed >5× faster than JSON
4. Schema migration feasible

**Embeddings WINS if**:
1. Compression >50% (≤1000 bytes/memory)
2. Fidelity >85% (semantic similarity)
3. Enables semantic search without text
4. Fixed size (predictable storage)

**Combined Approach WINS if**:
1. Active memories: Binary (editable)
2. Archive memories: Embeddings (searchable)
3. Overall compression >75%
4. No fidelity loss for active memories

---

## Expected Outcomes

### Best Case: Binary for Everything

**Decision**: Replace JSON with binary encoding
**Compression**: 88% (240 bytes/memory)
**Benefits**:
- Mobile storage: 21MB → 2.4MB (10K memories)
- Sync time: 5s → 0.5s
- Parse speed: 10× faster

### Moderate Case: Hybrid Strategy

**Decision**: Binary for active, embeddings for archive
- Active (<30 days): Binary encoding
- Archive (>30 days): Embeddings

**Compression**: 75% overall
**Trade-off**: Some archive memories lose exact text

### Null Case: Compression Not Worth Complexity

**Decision**: Optimize JSON only (minification, gzip)
**Compression**: 40% with gzip
**Reason**: Simplicity > storage savings

### Worst Case: Fidelity Loss Unacceptable

**Decision**: Abandon embeddings
**Reason**: Cannot reconstruct exact content
**Alternative**: Focus on binary optimization only

---

## Regression Tests

```javascript
describe('Memory Compression', () => {
  test('binary achieves target compression', () => {
    const storage = new BinaryStorage();
    const memory = createTestMemory('medium');
    
    const json = JSON.stringify(memory);
    const binary = storage.encode(memory);
    
    const compression = (json.length - binary.byteLength) / json.length;
    expect(compression).toBeGreaterThan(0.80); // >80%
  });
  
  test('binary encoding is lossless', () => {
    const storage = new BinaryStorage();
    const original = createTestMemory('large');
    
    const binary = storage.encode(original);
    const decoded = storage.decode(binary);
    
    expect(decoded.content).toBe(original.content);
    expect(decoded.metadata.palace).toBe(original.metadata.palace);
    expect(decoded.metadata.locus).toBe(original.metadata.locus);
  });
  
  test('embeddings achieve 50%+ compression', async () => {
    const storage = new EmbeddingStorage();
    const memory = createTestMemory('medium');
    
    const json = JSON.stringify(memory);
    const compressed = await storage.compress(memory);
    const compressedSize = JSON.stringify(compressed).length;
    
    const compression = (json.length - compressedSize) / json.length;
    expect(compression).toBeGreaterThan(0.50); // >50%
  });
  
  test('embedding fidelity >85%', async () => {
    const storage = new EmbeddingStorage();
    const memory = createTestMemory('medium');
    
    const embedding = await storage.embeddingModel.encode(memory.content);
    // Fidelity test would require reconstruction model
    // For now, verify embedding is generated
    expect(embedding).toHaveLength(384); // Standard embedding size
    expect(embedding.every(v => !isNaN(v))).toBe(true);
  });
  
  test('binary parses faster than JSON', () => {
    const storage = new BinaryStorage();
    const memories = Array(100).fill(null).map(() => createTestMemory('medium'));
    
    const jsonData = JSON.stringify(memories);
    const binaryData = memories.map(m => storage.encode(m));
    
    // Time JSON parsing
    const jsonStart = performance.now();
    JSON.parse(jsonData);
    const jsonTime = performance.now() - jsonStart;
    
    // Time binary decoding
    const binaryStart = performance.now();
    binaryData.forEach(b => storage.decode(b));
    const binaryTime = performance.now() - binaryStart;
    
    expect(binaryTime).toBeLessThan(jsonTime * 0.5); // 2× faster
  });
  
  test('compressed data supports search', async () => {
    const binaryStorage = new BinaryStorage();
    const embeddingStorage = new EmbeddingStorage();
    
    const memories = [
      { id: 1, content: 'QuickSort algorithm', metadata: { palace: 'algorithms', locus: 1, tags: ['sorting'], strength: 0.8 } },
      { id: 2, content: 'MergeSort algorithm', metadata: { palace: 'algorithms', locus: 2, tags: ['sorting'], strength: 0.7 } },
      { id: 3, content: 'Binary search tree', metadata: { palace: 'datastructures', locus: 1, tags: ['trees'], strength: 0.9 } }
    ];
    
    // Binary search by metadata
    const binaryEncoded = memories.map(m => binaryStorage.encode(m));
    const binaryResults = binaryEncoded
      .map(b => binaryStorage.decode(b))
      .filter(m => m.metadata.tags.includes('sorting'));
    expect(binaryResults).toHaveLength(2);
    
    // Embedding semantic search
    for (let m of memories) {
      const compressed = await embeddingStorage.compress(m);
      embeddingStorage.embeddings.set(m.id, compressed.embedding);
    }
    
    const searchResults = embeddingStorage.search('sorting algorithm', 2);
    expect(searchResults).toHaveLength(2);
  });
});
```

---

## Implementation Status

- [ ] Plain text baseline measurement
- [ ] Binary encoder/decoder implementation
- [ ] Binary schema definition
- [ ] Embedding model integration
- [ ] Float16 quantization
- [ ] Compression ratio benchmarks
- [ ] Fidelity testing suite
- [ ] Parse speed benchmarks
- [ ] Network payload comparison
- [ ] Mobile storage impact test
- [ ] Schema migration strategy
- [ ] Regression test suite
- [ ] Results documentation

---

**Hypothesis 011 Status: DEFINED, READY FOR TESTING**

**Expected Duration**: 2 weeks
**Priority**: HIGH (enables mobile/offline usage)
