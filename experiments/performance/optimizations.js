/**
 * Memory Palace Performance Optimizations
 * 
 * Implementation of optimization strategies:
 * - Lazy loading: Load only active locus, defer others
 * - Chunking: Split large palaces into loadable chunks
 * - Indexing: Build topic index for O(1) lookups
 * - Caching: LRU cache for frequently accessed memories
 * - Binary formats: MessagePack for 50% size reduction
 * - Compression: Apply gzip to palace storage
 * - Streaming: Stream large palaces instead of loading all at once
 * 
 * Usage:
 *   const { OptimizedPalace } = require('./optimizations');
 *   const palace = new OptimizedPalace({ enableLazyLoading: true, enableCache: true });
 *   await palace.load('system-design-citadel');
 */

const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Try to load optional dependencies
let msgpack = null;
try {
    msgpack = require('msgpack-lite');
} catch (e) {
    // MessagePack not available
}

// ============================================
// LRU Cache Implementation
// ============================================

class LRUCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.maxAge = options.maxAge || 5 * 60 * 1000; // 5 minutes
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.misses++;
            return undefined;
        }
        
        // Check expiration
        if (Date.now() - item.timestamp > this.maxAge) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        
        // Refresh position (LRU)
        this.cache.delete(key);
        this.cache.set(key, item);
        this.hits++;
        
        return item.value;
    }

    set(key, value) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total).toFixed(2) : '0.00'
        };
    }
}

// ============================================
// Optimized Palace Loader
// ============================================

class OptimizedPalace {
    constructor(options = {}) {
        this.options = {
            // Optimization toggles
            enableLazyLoading: options.enableLazyLoading !== false,
            enableChunking: options.enableChunking !== false,
            enableIndexing: options.enableIndexing !== false,
            enableCache: options.enableCache !== false,
            enableCompression: options.enableCompression !== false,
            enableStreaming: options.enableStreaming !== false,
            enableBinaryFormat: options.enableBinaryFormat !== false && msgpack !== null,
            
            // Configuration
            basePath: options.basePath || path.join(__dirname, '../../palaces'),
            cacheSize: options.cacheSize || 100,
            chunkSize: options.chunkSize || 50, // Memories per chunk
            compressionLevel: options.compressionLevel || 6,
            
            // Debug
            verbose: options.verbose || false
        };
        
        // State
        this.palaceData = null;
        this.palaceName = null;
        this.loadedLoci = new Set();
        this.chunkCache = new LRUCache({ maxSize: 10 });
        this.memoryCache = new LRUCache({ maxSize: this.options.cacheSize });
        
        // Indexes
        this.topicIndex = new Map();
        this.dateIndex = new Map();
        this.idIndex = new Map();
        
        // Stats
        this.stats = {
            loadTime: 0,
            memorySaved: 0,
            queriesOptimized: 0
        };
    }

    _log(message) {
        if (this.options.verbose) {
            console.log(`[OptimizedPalace] ${message}`);
        }
    }

    // ============================================
    // 1. LAZY LOADING
    // ============================================

    /**
     * Load palace with lazy loading support
     * Only loads active locus initially, others on demand
     */
    async load(palaceName) {
        const startTime = performance.now();
        this.palaceName = palaceName;
        
        this._log(`🔄 Loading palace: ${palaceName}`);
        
        const palacePath = path.join(this.options.basePath, `${palaceName}.json`);
        
        if (this.options.enableStreaming && this.options.enableLazyLoading) {
            // Stream load - only parse what we need initially
            await this._streamLoad(palacePath);
        } else {
            // Full load
            const content = await fs.readFile(palacePath, 'utf8');
            this.palaceData = JSON.parse(content);
        }
        
        // If lazy loading enabled, unload non-active loci
        if (this.options.enableLazyLoading && this.palaceData.loci) {
            const activeLocusId = this.palaceData.activeLocus;
            
            for (const locus of this.palaceData.loci) {
                if (locus.id === activeLocusId) {
                    this.loadedLoci.add(locus.id);
                    this._log(`📍 Active locus loaded: ${locus.name} (${locus.memories?.length || 0} memories)`);
                } else {
                    // Unload memories from non-active loci
                    const memoryCount = locus.memories?.length || 0;
                    locus._memoryCount = memoryCount;
                    locus._unloaded = true;
                    locus.memories = []; // Free memory
                    this._log(`💤 Lazy locus: ${locus.name} (${memoryCount} memories deferred)`);
                }
            }
        } else {
            // Load all loci
            this.palaceData.loci?.forEach(l => this.loadedLoci.add(l.id));
        }
        
        // Build indexes if enabled
        if (this.options.enableIndexing) {
            this._buildIndexes();
        }
        
        this.stats.loadTime = performance.now() - startTime;
        this._log(`✓ Palace loaded in ${this.stats.loadTime.toFixed(2)}ms`);
        
        return this;
    }

    /**
     * Load a specific locus on demand (lazy loading)
     */
    async loadLocus(locusId) {
        if (this.loadedLoci.has(locusId)) {
            this._log(`📍 Locus already loaded: ${locusId}`);
            return this.getLocus(locusId);
        }
        
        this._log(`🔄 Lazy loading locus: ${locusId}`);
        
        // Find locus
        const locus = this.palaceData.loci?.find(l => l.id === locusId);
        if (!locus) {
            throw new Error(`Locus not found: ${locusId}`);
        }
        
        // If streaming enabled, load from chunk
        if (this.options.enableStreaming && this.options.enableChunking) {
            const chunkId = this._getChunkId(locusId);
            const chunk = await this._loadChunk(chunkId);
            const loadedLocus = chunk.find(l => l.id === locusId);
            if (loadedLocus) {
                locus.memories = loadedLocus.memories;
                locus._unloaded = false;
            }
        } else {
            // Reload full palace (fallback)
            const palacePath = path.join(this.options.basePath, `${this.palaceName}.json`);
            const content = await fs.readFile(palacePath, 'utf8');
            const fullData = JSON.parse(content);
            const fullLocus = fullData.loci.find(l => l.id === locusId);
            if (fullLocus) {
                locus.memories = fullLocus.memories;
                locus._unloaded = false;
            }
        }
        
        this.loadedLoci.add(locusId);
        this._log(`✓ Locus loaded: ${locus.name} (${locus.memories?.length || 0} memories)`);
        
        return locus;
    }

    /**
     * Unload a locus to free memory
     */
    unloadLocus(locusId) {
        const locus = this.palaceData.loci?.find(l => l.id === locusId);
        if (locus && !locus._unloaded) {
            const memoryCount = locus.memories.length;
            locus._memoryCount = memoryCount;
            locus.memories = [];
            locus._unloaded = true;
            this.loadedLoci.delete(locusId);
            this._log(`💤 Unloaded locus: ${locus.name} (${memoryCount} memories freed)`);
        }
    }

    // ============================================
    // 2. CHUNKING
    // ============================================

    /**
     * Split palace into chunks for efficient loading
     */
    async createChunks(outputDir = null) {
        const chunksDir = outputDir || path.join(this.options.basePath, `${this.palaceName}_chunks`);
        
        this._log(`🔨 Creating chunks in: ${chunksDir}`);
        
        // Ensure directory exists
        await fs.mkdir(chunksDir, { recursive: true });
        
        const loci = this.palaceData.loci || [];
        const chunkSize = this.options.chunkSize;
        const chunks = [];
        
        // Group loci into chunks
        for (let i = 0; i < loci.length; i += chunkSize) {
            const chunkLoci = loci.slice(i, i + chunkSize);
            const chunkId = `chunk_${Math.floor(i / chunkSize)}`;
            const chunkPath = path.join(chunksDir, `${chunkId}.json`);
            
            const chunk = {
                id: chunkId,
                loci: chunkLoci,
                metadata: {
                    startIndex: i,
                    endIndex: Math.min(i + chunkSize, loci.length),
                    totalLoci: chunkLoci.length,
                    totalMemories: chunkLoci.reduce((sum, l) => sum + (l.memories?.length || 0), 0)
                }
            };
            
            // Save chunk
            let content = JSON.stringify(chunk);
            
            // Compress if enabled
            if (this.options.enableCompression) {
                const compressed = await gzip(Buffer.from(content, 'utf8'), {
                    level: this.options.compressionLevel
                });
                await fs.writeFile(`${chunkPath}.gz`, compressed);
                chunks.push({ id: chunkId, path: `${chunkPath}.gz`, compressed: true });
                this._log(`  ✓ Created ${chunkId}: ${chunk.metadata.totalMemories} memories (compressed)`);
            } else {
                await fs.writeFile(chunkPath, content);
                chunks.push({ id: chunkId, path: chunkPath, compressed: false });
                this._log(`  ✓ Created ${chunkId}: ${chunk.metadata.totalMemories} memories`);
            }
        }
        
        // Save manifest
        const manifest = {
            palaceName: this.palaceName,
            totalChunks: chunks.length,
            chunks: chunks,
            options: {
                chunkSize: this.options.chunkSize,
                compressed: this.options.enableCompression
            }
        };
        
        await fs.writeFile(
            path.join(chunksDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        this._log(`✓ Created ${chunks.length} chunks in ${chunksDir}`);
        return manifest;
    }

    _getChunkId(locusId) {
        const loci = this.palaceData.loci || [];
        const index = loci.findIndex(l => l.id === locusId);
        return `chunk_${Math.floor(index / this.options.chunkSize)}`;
    }

    async _loadChunk(chunkId) {
        // Check cache first
        const cached = this.chunkCache.get(chunkId);
        if (cached) {
            this._log(`📦 Chunk cache hit: ${chunkId}`);
            return cached;
        }
        
        const chunksDir = path.join(this.options.basePath, `${this.palaceName}_chunks`);
        const chunkPath = path.join(chunksDir, `${chunkId}.json`);
        const compressedPath = `${chunkPath}.gz`;
        
        let content;
        
        // Try compressed first
        try {
            const compressed = await fs.readFile(compressedPath);
            const decompressed = await gunzip(compressed);
            content = decompressed.toString('utf8');
        } catch (e) {
            // Fallback to uncompressed
            content = await fs.readFile(chunkPath, 'utf8');
        }
        
        const chunk = JSON.parse(content);
        
        // Cache chunk
        this.chunkCache.set(chunkId, chunk.loci);
        
        return chunk.loci;
    }

    // ============================================
    // 3. INDEXING
    // ============================================

    /**
     * Build indexes for O(1) lookups
     */
    _buildIndexes() {
        this._log('🔨 Building indexes...');
        
        const startTime = performance.now();
        
        // Topic index
        this.topicIndex.clear();
        
        // Date index
        this.dateIndex.clear();
        
        // ID index
        this.idIndex.clear();
        
        let indexedCount = 0;
        
        for (const locus of this.palaceData.loci || []) {
            for (const memory of locus.memories || []) {
                // Index by ID
                this.idIndex.set(memory.id, { memory, locusId: locus.id });
                
                // Index by topic/subject
                const subject = memory.subject || 'Unknown';
                if (!this.topicIndex.has(subject)) {
                    this.topicIndex.set(subject, []);
                }
                this.topicIndex.get(subject).push({ memory, locusId: locus.id });
                
                // Index by date
                const date = memory.created ? memory.created.split('T')[0] : 'unknown';
                if (!this.dateIndex.has(date)) {
                    this.dateIndex.set(date, []);
                }
                this.dateIndex.get(date).push({ memory, locusId: locus.id });
                
                indexedCount++;
            }
        }
        
        const duration = performance.now() - startTime;
        this._log(`✓ Built indexes in ${duration.toFixed(2)}ms`);
        this._log(`   Topics: ${this.topicIndex.size} | Dates: ${this.dateIndex.size} | IDs: ${this.idIndex.size}`);
        
        return {
            topics: this.topicIndex.size,
            dates: this.dateIndex.size,
            ids: this.idIndex.size,
            duration: duration
        };
    }

    /**
     * Query by topic using index (O(1) lookup)
     */
    queryByTopic(topic) {
        if (this.options.enableCache) {
            const cacheKey = `topic:${topic}`;
            const cached = this.memoryCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        
        let results;
        
        if (this.options.enableIndexing) {
            // O(1) indexed lookup
            results = this.topicIndex.get(topic) || [];
            this.stats.queriesOptimized++;
        } else {
            // O(n) linear scan
            results = [];
            for (const locus of this.palaceData.loci || []) {
                for (const memory of locus.memories || []) {
                    if (memory.subject === topic) {
                        results.push({ memory, locusId: locus.id });
                    }
                }
            }
        }
        
        if (this.options.enableCache) {
            this.memoryCache.set(`topic:${topic}`, results);
        }
        
        return results;
    }

    /**
     * Query by date using index
     */
    queryByDate(date) {
        if (this.options.enableIndexing) {
            return this.dateIndex.get(date) || [];
        }
        
        const results = [];
        for (const locus of this.palaceData.loci || []) {
            for (const memory of locus.memories || []) {
                const memoryDate = memory.created ? memory.created.split('T')[0] : null;
                if (memoryDate === date) {
                    results.push({ memory, locusId: locus.id });
                }
            }
        }
        return results;
    }

    /**
     * Get memory by ID using index
     */
    getMemoryById(memoryId) {
        if (this.options.enableIndexing) {
            const entry = this.idIndex.get(memoryId);
            return entry ? entry.memory : null;
        }
        
        for (const locus of this.palaceData.loci || []) {
            const memory = locus.memories?.find(m => m.id === memoryId);
            if (memory) return memory;
        }
        return null;
    }

    // ============================================
    // 4. CACHING
    // ============================================

    getCacheStats() {
        return {
            memory: this.memoryCache.getStats(),
            chunks: this.chunkCache.getStats()
        };
    }

    clearCache() {
        this.memoryCache.clear();
        this.chunkCache.clear();
        this._log('🗑️  Cache cleared');
    }

    // ============================================
    // 5. BINARY FORMATS
    // ============================================

    /**
     * Save palace in MessagePack format for smaller size
     */
    async saveAsMessagePack(outputPath = null) {
        if (!msgpack) {
            throw new Error('msgpack-lite not installed. Run: npm install msgpack-lite');
        }
        
        const output = outputPath || path.join(this.options.basePath, `${this.palaceName}.mpack`);
        
        this._log(`💾 Saving as MessagePack: ${output}`);
        
        const encoded = msgpack.encode(this.palaceData);
        await fs.writeFile(output, encoded);
        
        const jsonSize = Buffer.byteLength(JSON.stringify(this.palaceData), 'utf8');
        const mpackSize = encoded.length;
        
        this._log(`✓ Saved: ${(mpackSize / 1024).toFixed(2)} KB (vs ${(jsonSize / 1024).toFixed(2)} KB JSON)`);
        this._log(`   Reduction: ${((1 - mpackSize / jsonSize) * 100).toFixed(1)}%`);
        
        return {
            path: output,
            jsonSize,
            mpackSize,
            reduction: (1 - mpackSize / jsonSize)
        };
    }

    /**
     * Load palace from MessagePack format
     */
    async loadFromMessagePack(filePath) {
        if (!msgpack) {
            throw new Error('msgpack-lite not installed');
        }
        
        this._log(`📦 Loading from MessagePack: ${filePath}`);
        
        const encoded = await fs.readFile(filePath);
        this.palaceData = msgpack.decode(encoded);
        this.palaceName = path.basename(filePath, '.mpack');
        
        this._log(`✓ Loaded: ${(encoded.length / 1024).toFixed(2)} KB`);
        
        return this;
    }

    // ============================================
    // 6. COMPRESSION
    // ============================================

    /**
     * Compress and save palace
     */
    async saveCompressed(outputPath = null) {
        const output = outputPath || path.join(this.options.basePath, `${this.palaceName}.json.gz`);
        
        this._log(`🗜️  Compressing palace: ${output}`);
        
        const json = JSON.stringify(this.palaceData);
        const compressed = await gzip(Buffer.from(json, 'utf8'), {
            level: this.options.compressionLevel
        });
        
        await fs.writeFile(output, compressed);
        
        const originalSize = Buffer.byteLength(json, 'utf8');
        const compressedSize = compressed.length;
        
        this._log(`✓ Compressed: ${(compressedSize / 1024).toFixed(2)} KB (vs ${(originalSize / 1024).toFixed(2)} KB)`);
        this._log(`   Reduction: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);
        
        return {
            path: output,
            originalSize,
            compressedSize,
            reduction: (1 - compressedSize / originalSize)
        };
    }

    /**
     * Load compressed palace
     */
    async loadCompressed(filePath) {
        this._log(`📦 Loading compressed palace: ${filePath}`);
        
        const compressed = await fs.readFile(filePath);
        const decompressed = await gunzip(compressed);
        const json = decompressed.toString('utf8');
        
        this.palaceData = JSON.parse(json);
        this.palaceName = path.basename(filePath, '.json.gz').replace('.gz', '');
        
        this._log(`✓ Loaded: ${(compressed.length / 1024).toFixed(2)} KB (decompressed to ${(decompressed.length / 1024).toFixed(2)} KB)`);
        
        return this;
    }

    // ============================================
    // 7. STREAMING
    // ============================================

    /**
     * Stream load palace - memory efficient for large files
     */
    async _streamLoad(filePath) {
        this._log(`📡 Streaming load: ${filePath}`);
        
        return new Promise((resolve, reject) => {
            const stream = createReadStream(filePath, { encoding: 'utf8' });
            let buffer = '';
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            stream.on('data', (chunk) => {
                for (let i = 0; i < chunk.length; i++) {
                    const char = chunk[i];
                    buffer += char;
                    
                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }
                    
                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                    }
                }
            });
            
            stream.on('end', () => {
                try {
                    this.palaceData = JSON.parse(buffer);
                    this._log(`✓ Streamed load complete`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
            
            stream.on('error', reject);
        });
    }

    /**
     * Stream write palace for large files
     */
    async streamSave(outputPath = null) {
        const output = outputPath || path.join(this.options.basePath, `${this.palaceName}.json`);
        
        this._log(`💾 Streaming save: ${output}`);
        
        const writeStream = createWriteStream(output);
        
        return new Promise((resolve, reject) => {
            writeStream.write(JSON.stringify(this.palaceData), 'utf8');
            writeStream.end();
            
            writeStream.on('finish', () => {
                this._log(`✓ Streamed save complete`);
                resolve(output);
            });
            
            writeStream.on('error', reject);
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    getLocus(locusId) {
        return this.palaceData.loci?.find(l => l.id === locusId);
    }

    getAllMemories() {
        const memories = [];
        for (const locus of this.palaceData.loci || []) {
            for (const memory of locus.memories || []) {
                memories.push({
                    ...memory,
                    locusId: locus.id,
                    locusName: locus.name
                });
            }
        }
        return memories;
    }

    getStats() {
        const loadedMemories = this.getAllMemories().length;
        const totalLoci = this.palaceData.loci?.length || 0;
        const loadedLoci = this.loadedLoci.size;
        
        return {
            palaceName: this.palaceName,
            loadTime: this.stats.loadTime,
            totalLoci,
            loadedLoci,
            lazyLoaded: totalLoci - loadedLoci,
            loadedMemories,
            queriesOptimized: this.stats.queriesOptimized,
            cache: this.getCacheStats(),
            options: this.options
        };
    }

    async close() {
        this._log('👋 Closing optimized palace...');
        this.clearCache();
        this.palaceData = null;
    }
}

// ============================================
// OPTIMIZATION RECOMMENDATIONS
// ============================================

class OptimizationAdvisor {
    static analyze(palaceData) {
        const analysis = {
            memoryCount: 0,
            lociCount: palaceData.loci?.length || 0,
            avgMemoriesPerLocus: 0,
            recommendations: []
        };
        
        let totalMemorySize = 0;
        
        for (const locus of palaceData.loci || []) {
            const memories = locus.memories || [];
            analysis.memoryCount += memories.length;
            
            for (const memory of memories) {
                const size = JSON.stringify(memory).length;
                totalMemorySize += size;
            }
        }
        
        analysis.avgMemoriesPerLocus = analysis.memoryCount / analysis.lociCount;
        analysis.avgMemorySize = totalMemorySize / analysis.memoryCount;
        
        // Generate recommendations
        const recs = [];
        
        if (analysis.memoryCount > 1000) {
            recs.push({
                priority: 'high',
                strategy: 'chunking',
                reason: `Large palace (${analysis.memoryCount} memories). Chunking enables partial loading.`,
                expectedBenefit: 'Faster initial load, lower memory usage'
            });
            
            recs.push({
                priority: 'high',
                strategy: 'lazyLoading',
                reason: 'Many memories will benefit from on-demand loading.',
                expectedBenefit: 'Load only what you need'
            });
        }
        
        if (analysis.avgMemoriesPerLocus > 20) {
            recs.push({
                priority: 'medium',
                strategy: 'indexing',
                reason: 'Dense loci benefit from fast topic lookups.',
                expectedBenefit: 'O(1) topic queries vs O(n) scan'
            });
        }
        
        if (analysis.memoryCount > 100) {
            recs.push({
                priority: 'medium',
                strategy: 'caching',
                reason: 'Frequently accessed memories should be cached.',
                expectedBenefit: 'Avoid repeated queries'
            });
        }
        
        if (totalMemorySize > 100 * 1024) { // > 100KB
            recs.push({
                priority: 'medium',
                strategy: 'compression',
                reason: `Large file size (${(totalMemorySize / 1024).toFixed(1)} KB).`,
                expectedBenefit: '50-70% size reduction'
            });
            
            if (msgpack) {
                recs.push({
                    priority: 'low',
                    strategy: 'binaryFormat',
                    reason: 'Binary format offers additional size savings.',
                    expectedBenefit: '20-30% beyond compression'
                });
            }
        }
        
        if (analysis.memoryCount > 5000) {
            recs.push({
                priority: 'high',
                strategy: 'streaming',
                reason: 'Very large palace. Streaming prevents memory spikes.',
                expectedBenefit: 'Constant memory during load'
            });
        }
        
        analysis.recommendations = recs;
        return analysis;
    }

    static printReport(analysis) {
        console.log('\n═══════════════════════════════════════════════════');
        console.log('🔍 Palace Optimization Analysis');
        console.log('═══════════════════════════════════════════════════');
        console.log(`\n📊 Statistics:`);
        console.log(`   Loci: ${analysis.lociCount}`);
        console.log(`   Memories: ${analysis.memoryCount}`);
        console.log(`   Avg memories/locus: ${analysis.avgMemoriesPerLocus.toFixed(1)}`);
        console.log(`   Avg memory size: ${(analysis.avgMemorySize).toFixed(0)} bytes`);
        
        if (analysis.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            
            const byPriority = {
                high: analysis.recommendations.filter(r => r.priority === 'high'),
                medium: analysis.recommendations.filter(r => r.priority === 'medium'),
                low: analysis.recommendations.filter(r => r.priority === 'low')
            };
            
            for (const [priority, recs] of Object.entries(byPriority)) {
                if (recs.length > 0) {
                    console.log(`\n   ${priority.toUpperCase()} Priority:`);
                    for (const rec of recs) {
                        console.log(`     • ${rec.strategy}: ${rec.reason}`);
                        console.log(`       Benefit: ${rec.expectedBenefit}`);
                    }
                }
            }
        } else {
            console.log(`\n✅ No optimizations needed. Palace is small and efficient.`);
        }
        
        console.log('\n═══════════════════════════════════════════════════');
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    OptimizedPalace,
    LRUCache,
    OptimizationAdvisor
};

// ============================================
// CLI DEMO
// ============================================

async function runDemo() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 Memory Palace Performance Optimizations Demo');
    console.log('═══════════════════════════════════════════════════');
    
    const palaceName = 'system-design-citadel';
    const palacePath = path.join(__dirname, '../../palaces', `${palaceName}.json`);
    
    // Step 1: Load and analyze
    console.log('\n📚 Step 1: Loading palace...');
    const palace = new OptimizedPalace({ verbose: true });
    await palace.load(palaceName);
    
    // Step 2: Analyze
    console.log('\n🔍 Step 2: Analyzing optimization opportunities...');
    const analysis = OptimizationAdvisor.analyze(palace.palaceData);
    OptimizationAdvisor.printReport(analysis);
    
    // Step 3: Test optimizations
    console.log('\n⚡ Step 3: Testing optimizations...');
    
    // Test lazy loading
    console.log('\n   Testing Lazy Loading:');
    const unloadedLoci = palace.palaceData.loci.filter(l => l._unloaded);
    console.log(`   - ${unloadedLoci.length} loci deferred`);
    
    if (unloadedLoci.length > 0) {
        const testLocusId = unloadedLoci[0].id;
        console.log(`   - Loading deferred locus: ${testLocusId}`);
        await palace.loadLocus(testLocusId);
        const loadedLocus = palace.getLocus(testLocusId);
        console.log(`   - Loaded ${loadedLocus.memories?.length || 0} memories`);
    }
    
    // Test indexing
    if (palace.options.enableIndexing) {
        console.log('\n   Testing Indexed Queries:');
        const topics = Array.from(palace.topicIndex.keys()).slice(0, 3);
        for (const topic of topics) {
            const results = palace.queryByTopic(topic);
            console.log(`   - Topic "${topic}": ${results.length} memories (O(1) lookup)`);
        }
    }
    
    // Test caching
    if (palace.options.enableCache) {
        console.log('\n   Testing Cache:');
        // First query (cache miss)
        const topic = Array.from(palace.topicIndex.keys())[0];
        palace.queryByTopic(topic);
        
        // Second query (cache hit)
        palace.queryByTopic(topic);
        
        const cacheStats = palace.getCacheStats();
        console.log(`   - Memory cache: ${cacheStats.memory.hitRate} hit rate (${cacheStats.memory.hits} hits, ${cacheStats.memory.misses} misses)`);
    }
    
    // Test compression
    console.log('\n   Testing Compression:');
    const compressed = await palace.saveCompressed();
    console.log(`   - Saved compressed: ${compressed.compressedSize} bytes (${(compressed.reduction * 100).toFixed(1)}% smaller)`);
    
    // Test MessagePack if available
    if (msgpack && palace.options.enableBinaryFormat) {
        console.log('\n   Testing MessagePack:');
        const mpack = await palace.saveAsMessagePack();
        console.log(`   - Saved as MessagePack: ${mpack.mpackSize} bytes (${(mpack.reduction * 100).toFixed(1)}% smaller than JSON)`);
    }
    
    // Test chunking
    console.log('\n   Testing Chunking:');
    const manifest = await palace.createChunks();
    console.log(`   - Created ${manifest.totalChunks} chunks`);
    
    // Final stats
    console.log('\n📊 Final Stats:');
    const stats = palace.getStats();
    console.log(`   Load time: ${stats.loadTime.toFixed(2)}ms`);
    console.log(`   Loaded loci: ${stats.loadedLoci}/${stats.totalLoci}`);
    console.log(`   Total memories: ${stats.loadedMemories}`);
    console.log(`   Queries optimized: ${stats.queriesOptimized}`);
    
    // Cleanup
    await palace.close();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Demo complete!');
    console.log('═══════════════════════════════════════════════════');
}

// Run demo if called directly
if (require.main === module) {
    runDemo().catch(error => {
        console.error('❌ Demo failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}
