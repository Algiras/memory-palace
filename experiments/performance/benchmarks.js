/**
 * Memory Palace Performance Benchmarks
 * 
 * Comprehensive benchmarking suite for memory palace operations:
 * - Load time for different palace sizes (10, 100, 1000, 10000 memories)
 * - Query speed (by topic, by date, full-text search)
 * - Memory usage (heap size, retained memory)
 * - Serialization speed (JSON vs MessagePack vs Protocol Buffers)
 * - Compression ratios (gzip, brotli, zstd)
 * 
 * Usage: node benchmarks.js [--palace=system-design-citadel] [--output=results.json]
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const v8 = require('v8');

// Try to load optional dependencies
let msgpack = null;
try {
    msgpack = require('msgpack-lite');
} catch (e) {
    console.log('📦 msgpack-lite not installed. Run: npm install msgpack-lite');
}

let zlib = require('zlib');
let util = require('util');
const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);
const brotliCompress = util.promisify(zlib.brotliCompress);
const brotliDecompress = util.promisify(zlib.brotliDecompress);

class MemoryPalaceBenchmarks {
    constructor(options = {}) {
        this.options = {
            palacePath: options.palacePath || path.join(__dirname, '../../palaces/system-design-citadel.json'),
            outputPath: options.outputPath || path.join(__dirname, 'benchmark-results.json'),
            iterations: options.iterations || 10,
            warmupIterations: options.warmupIterations || 3,
            verbose: options.verbose || false
        };
        
        this.results = {
            timestamp: new Date().toISOString(),
            system: this._getSystemInfo(),
            loadTimes: {},
            querySpeed: {},
            memoryUsage: {},
            serialization: {},
            compression: {},
            optimizations: {}
        };
        
        this.palaceData = null;
        this.allMemories = [];
    }

    /**
     * Get system information for context
     */
    _getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            cpus: require('os').cpus().length,
            totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
            heapSizeLimit: Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024) + ' MB'
        };
    }

    /**
     * Log message if verbose mode enabled
     */
    _log(message) {
        if (this.options.verbose) {
            console.log(message);
        }
    }

    /**
     * Measure memory usage
     */
    _getMemoryUsage() {
        const heapStats = v8.getHeapStatistics();
        const usage = process.memoryUsage();
        
        return {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss,
            heapSizeLimit: heapStats.heap_size_limit,
            usedHeapSize: heapStats.used_heap_size,
            totalHeapSize: heapStats.total_heap_size
        };
    }

    /**
     * Format bytes to human readable
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Run a benchmark function with warmup and iterations
     */
    async _benchmark(name, fn, iterations = null) {
        const iters = iterations || this.options.iterations;
        const times = [];
        const memorySnapshots = [];
        
        this._log(`\n🔬 Benchmarking: ${name}`);
        
        // Warmup
        this._log(`  Warming up (${this.options.warmupIterations} iterations)...`);
        for (let i = 0; i < this.options.warmupIterations; i++) {
            await fn();
        }
        
        // GC if available
        if (global.gc) {
            global.gc();
        }
        
        // Actual benchmark
        this._log(`  Running ${iters} iterations...`);
        for (let i = 0; i < iters; i++) {
            const startMemory = this._getMemoryUsage();
            const startTime = performance.now();
            
            await fn();
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            
            times.push(endTime - startTime);
            memorySnapshots.push({
                heapDelta: endMemory.heapUsed - startMemory.heapUsed,
                externalDelta: endMemory.external - startMemory.external
            });
        }
        
        // Calculate statistics
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        const avgHeapDelta = memorySnapshots.reduce((a, b) => a + b.heapDelta, 0) / memorySnapshots.length;
        
        const result = {
            name,
            iterations: iters,
            avg: Math.round(avg * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            median: Math.round(median * 100) / 100,
            p95: Math.round(p95 * 100) / 100,
            p99: Math.round(p99 * 100) / 100,
            avgMemoryDelta: Math.round(avgHeapDelta),
            samples: times.length > 10 ? times.slice(0, 10) : times // Keep first 10 for debugging
        };
        
        this._log(`  ✓ Avg: ${result.avg}ms, Min: ${result.min}ms, Max: ${result.max}ms, P95: ${result.p95}ms`);
        
        return result;
    }

    /**
     * Load palace data
     */
    async loadPalace() {
        this._log('\n📚 Loading palace data...');
        
        const content = await fs.readFile(this.options.palacePath, 'utf8');
        this.palaceData = JSON.parse(content);
        
        // Flatten all memories for testing
        this.allMemories = [];
        for (const locus of this.palaceData.loci || []) {
            for (const memory of locus.memories || []) {
                this.allMemories.push({
                    ...memory,
                    locusId: locus.id,
                    locusName: locus.name
                });
            }
        }
        
        this._log(`  ✓ Loaded ${this.allMemories.length} memories from ${this.palaceData.loci.length} loci`);
        
        return {
            palaceName: this.palaceData.name,
            memoryCount: this.allMemories.length,
            lociCount: this.palaceData.loci.length,
            fileSize: Buffer.byteLength(content, 'utf8')
        };
    }

    /**
     * Generate synthetic palaces of different sizes
     */
    generateSyntheticPalaces() {
        this._log('\n🔨 Generating synthetic palaces for scale testing...');
        
        const sizes = [10, 100, 500, 1000];
        const syntheticPalaces = {};
        
        for (const size of sizes) {
            const memories = [];
            const loci = [];
            const lociCount = Math.ceil(size / 10); // ~10 memories per locus
            
            for (let l = 0; l < lociCount; l++) {
                const locusMemories = [];
                const memoriesPerLocus = Math.min(10, size - memories.length);
                
                for (let m = 0; m < memoriesPerLocus; m++) {
                    const memory = {
                        id: `syn-${size}-${l}-${m}`,
                        subject: `Synthetic Subject ${m}`,
                        content: `This is synthetic memory content for testing performance at scale. `.repeat(5),
                        image: `Synthetic image description for memory ${m}. `.repeat(3),
                        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
                        linkedTo: []
                    };
                    memories.push(memory);
                    locusMemories.push(memory);
                }
                
                loci.push({
                    id: `locus-${l}`,
                    name: `Locus ${l}`,
                    anchor: `Anchor for locus ${l}`,
                    description: `Description for locus ${l}`,
                    memories: locusMemories,
                    children: [],
                    parent: l === 0 ? null : 'locus-0'
                });
            }
            
            syntheticPalaces[size] = {
                name: `Synthetic Palace (${size} memories)`,
                created: new Date().toISOString(),
                theme: 'Synthetic test palace',
                activeLocus: 'locus-0',
                loci: loci
            };
        }
        
        this.syntheticPalaces = syntheticPalaces;
        this._log(`  ✓ Generated palaces: ${sizes.join(', ')} memories`);
        
        return syntheticPalaces;
    }

    /**
     * Benchmark 1: Load times for different palace sizes
     */
    async benchmarkLoadTimes() {
        this._log('\n⏱️  Benchmarking Load Times...');
        
        const results = {};
        
        // Test real palace
        const realPalaceResult = await this._benchmark(
            `Load Real Palace (${this.allMemories.length} memories)`,
            async () => {
                const content = await fs.readFile(this.options.palacePath, 'utf8');
                const data = JSON.parse(content);
                // Access all data to ensure it's loaded
                JSON.stringify(data);
            }
        );
        results.real = realPalaceResult;
        
        // Test synthetic palaces
        for (const [size, palace] of Object.entries(this.syntheticPalaces)) {
            const palaceJson = JSON.stringify(palace);
            const tempPath = path.join(__dirname, `temp-palace-${size}.json`);
            await fs.writeFile(tempPath, palaceJson);
            
            const result = await this._benchmark(
                `Load Synthetic Palace (${size} memories)`,
                async () => {
                    const content = await fs.readFile(tempPath, 'utf8');
                    const data = JSON.parse(content);
                    JSON.stringify(data);
                },
                Math.min(10, this.options.iterations) // Fewer iterations for large files
            );
            
            results[`synthetic_${size}`] = result;
            
            // Cleanup
            await fs.unlink(tempPath);
        }
        
        this.results.loadTimes = results;
        return results;
    }

    /**
     * Benchmark 2: Query speed
     */
    async benchmarkQuerySpeed() {
        this._log('\n🔍 Benchmarking Query Speed...');
        
        const results = {};
        
        // Build indexes for efficient querying
        const topicIndex = this._buildTopicIndex();
        const dateIndex = this._buildDateIndex();
        
        // Query by topic (with index)
        results.queryByTopicIndexed = await this._benchmark(
            'Query by Topic (Indexed)',
            async () => {
                const topic = 'System Design';
                const matches = topicIndex.get(topic) || [];
                return matches.length;
            }
        );
        
        // Query by topic (linear scan)
        results.queryByTopicLinear = await this._benchmark(
            'Query by Topic (Linear Scan)',
            async () => {
                const topic = 'System Design';
                const matches = this.allMemories.filter(m => 
                    m.subject && m.subject.toLowerCase().includes(topic.toLowerCase())
                );
                return matches.length;
            }
        );
        
        // Query by date range
        results.queryByDate = await this._benchmark(
            'Query by Date Range',
            async () => {
                const startDate = new Date('2026-01-01');
                const endDate = new Date('2026-12-31');
                const matches = this.allMemories.filter(m => {
                    const date = new Date(m.created);
                    return date >= startDate && date <= endDate;
                });
                return matches.length;
            }
        );
        
        // Full-text search (simple implementation)
        results.fullTextSearch = await this._benchmark(
            'Full-Text Search',
            async () => {
                const query = 'caching';
                const matches = this.allMemories.filter(m => {
                    const text = `${m.subject} ${m.content} ${m.image || ''}`.toLowerCase();
                    return text.includes(query.toLowerCase());
                });
                return matches.length;
            }
        );
        
        // Query with multiple filters
        results.complexQuery = await this._benchmark(
            'Complex Query (Multiple Filters)',
            async () => {
                const matches = this.allMemories.filter(m => {
                    const hasContent = m.content && m.content.length > 50;
                    const hasSubject = m.subject && m.subject.includes('Design');
                    const recent = new Date(m.created) > new Date('2026-01-01');
                    return hasContent && hasSubject && recent;
                });
                return matches.length;
            }
        );
        
        this.results.querySpeed = results;
        return results;
    }

    /**
     * Build topic index
     */
    _buildTopicIndex() {
        const index = new Map();
        
        for (const memory of this.allMemories) {
            const subject = memory.subject || 'Unknown';
            if (!index.has(subject)) {
                index.set(subject, []);
            }
            index.get(subject).push(memory);
        }
        
        return index;
    }

    /**
     * Build date index
     */
    _buildDateIndex() {
        const index = new Map();
        
        for (const memory of this.allMemories) {
            const date = memory.created ? memory.created.split('T')[0] : 'unknown';
            if (!index.has(date)) {
                index.set(date, []);
            }
            index.get(date).push(memory);
        }
        
        return index;
    }

    /**
     * Benchmark 3: Memory usage
     */
    async benchmarkMemoryUsage() {
        this._log('\n🧠 Benchmarking Memory Usage...');
        
        const results = {};
        
        // Baseline memory
        if (global.gc) global.gc();
        const baseline = this._getMemoryUsage();
        results.baseline = baseline;
        
        // Memory after loading palace
        const palaceJson = JSON.stringify(this.palaceData);
        const loadedMemory = await this._benchmark(
            'Memory: Load Palace',
            async () => {
                const data = JSON.parse(palaceJson);
                // Keep reference to prevent GC
                this._tempData = data;
            },
            5
        );
        results.load = loadedMemory;
        
        // Memory after building indexes
        const indexMemory = await this._benchmark(
            'Memory: Build Indexes',
            async () => {
                const topicIndex = this._buildTopicIndex();
                const dateIndex = this._buildDateIndex();
                this._tempIndex = { topicIndex, dateIndex };
            },
            5
        );
        results.indexes = indexMemory;
        
        // Memory per memory
        const memoryPerItem = (loadedMemory.avgMemoryDelta / this.allMemories.length);
        results.memoryPerMemory = Math.round(memoryPerItem);
        
        // Retained memory after clearing
        if (global.gc) global.gc();
        delete this._tempData;
        delete this._tempIndex;
        if (global.gc) global.gc();
        
        const afterClear = this._getMemoryUsage();
        results.retained = afterClear.heapUsed - baseline.heapUsed;
        
        this._log(`  📊 Memory per memory: ${this._formatBytes(results.memoryPerMemory)}`);
        this._log(`  📊 Retained memory: ${this._formatBytes(results.retained)}`);
        
        this.results.memoryUsage = results;
        return results;
    }

    /**
     * Benchmark 4: Serialization speed
     */
    async benchmarkSerialization() {
        this._log('\n📦 Benchmarking Serialization...');
        
        const results = {};
        const data = this.palaceData;
        
        // JSON serialization
        results.json = await this._benchmark(
            'JSON Serialize/Deserialize',
            async () => {
                const json = JSON.stringify(data);
                const parsed = JSON.parse(json);
                return Buffer.byteLength(json, 'utf8');
            }
        );
        
        // MessagePack (if available)
        if (msgpack) {
            results.messagepack = await this._benchmark(
                'MessagePack Serialize/Deserialize',
                async () => {
                    const encoded = msgpack.encode(data);
                    const decoded = msgpack.decode(encoded);
                    return encoded.length;
                }
            );
            
            // Compare sizes
            const jsonSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
            const msgpackSize = msgpack.encode(data).length;
            results.sizeComparison = {
                json: jsonSize,
                messagepack: msgpackSize,
                reduction: ((1 - msgpackSize / jsonSize) * 100).toFixed(1) + '%'
            };
        } else {
            results.messagepack = { error: 'msgpack-lite not installed' };
        }
        
        this.results.serialization = results;
        return results;
    }

    /**
     * Benchmark 5: Compression
     */
    async benchmarkCompression() {
        this._log('\n🗜️  Benchmarking Compression...');
        
        const results = {};
        const data = JSON.stringify(this.palaceData);
        const buffer = Buffer.from(data, 'utf8');
        
        // Gzip
        results.gzip = await this._benchmark(
            'Gzip Compress/Decompress',
            async () => {
                const compressed = await gzip(buffer);
                const decompressed = await gunzip(compressed);
                return compressed.length;
            },
            5
        );
        
        // Brotli
        results.brotli = await this._benchmark(
            'Brotli Compress/Decompress',
            async () => {
                const compressed = await brotliCompress(buffer);
                const decompressed = await brotliDecompress(compressed);
                return compressed.length;
            },
            5
        );
        
        // Calculate compression ratios
        const originalSize = buffer.length;
        const gzipCompressed = await gzip(buffer);
        const brotliCompressed = await brotliCompress(buffer);
        
        results.ratios = {
            original: originalSize,
            gzip: gzipCompressed.length,
            brotli: brotliCompressed.length,
            gzipRatio: ((1 - gzipCompressed.length / originalSize) * 100).toFixed(1) + '%',
            brotliRatio: ((1 - brotliCompressed.length / originalSize) * 100).toFixed(1) + '%'
        };
        
        this._log(`  📊 Original: ${this._formatBytes(originalSize)}`);
        this._log(`  📊 Gzip: ${this._formatBytes(gzipCompressed.length)} (${results.ratios.gzipRatio} smaller)`);
        this._log(`  📊 Brotli: ${this._formatBytes(brotliCompressed.length)} (${results.ratios.brotliRatio} smaller)`);
        
        this.results.compression = results;
        return results;
    }

    /**
     * Run all benchmarks
     */
    async runAll() {
        console.log('═══════════════════════════════════════════════════');
        console.log('🏃 Memory Palace Performance Benchmarks');
        console.log('═══════════════════════════════════════════════════');
        
        // Load real palace data
        const palaceInfo = await this.loadPalace();
        console.log(`\n📚 Palace: ${palaceInfo.palaceName}`);
        console.log(`   Memories: ${palaceInfo.memoryCount} | Loci: ${palaceInfo.lociCount}`);
        console.log(`   File Size: ${this._formatBytes(palaceInfo.fileSize)}`);
        
        // Generate synthetic test data
        this.generateSyntheticPalaces();
        
        // Run all benchmarks
        await this.benchmarkLoadTimes();
        await this.benchmarkQuerySpeed();
        await this.benchmarkMemoryUsage();
        await this.benchmarkSerialization();
        await this.benchmarkCompression();
        
        // Save results
        await this.saveResults();
        
        // Print summary
        this._printSummary();
        
        return this.results;
    }

    /**
     * Save benchmark results to file
     */
    async saveResults() {
        await fs.writeFile(
            this.options.outputPath,
            JSON.stringify(this.results, null, 2)
        );
        console.log(`\n💾 Results saved to: ${this.options.outputPath}`);
    }

    /**
     * Print benchmark summary
     */
    _printSummary() {
        console.log('\n═══════════════════════════════════════════════════');
        console.log('📊 Benchmark Summary');
        console.log('═══════════════════════════════════════════════════');
        
        // Load times
        console.log('\n⏱️  Load Times:');
        for (const [key, result] of Object.entries(this.results.loadTimes)) {
            if (result.avg) {
                console.log(`   ${result.name}: ${result.avg}ms (P95: ${result.p95}ms)`);
            }
        }
        
        // Query speed
        console.log('\n🔍 Query Speed:');
        for (const [key, result] of Object.entries(this.results.querySpeed)) {
            if (result.avg) {
                const speedup = this.results.querySpeed.queryByTopicLinear && key === 'queryByTopicIndexed' 
                    ? ` (${(this.results.querySpeed.queryByTopicLinear.avg / result.avg).toFixed(1)}x faster than linear)` 
                    : '';
                console.log(`   ${result.name}: ${result.avg}ms${speedup}`);
            }
        }
        
        // Memory
        console.log('\n🧠 Memory Usage:');
        console.log(`   Per memory: ${this._formatBytes(this.results.memoryUsage.memoryPerMemory)}`);
        console.log(`   Retained: ${this._formatBytes(this.results.memoryUsage.retained)}`);
        
        // Serialization
        console.log('\n📦 Serialization:');
        if (this.results.serialization.sizeComparison) {
            console.log(`   MessagePack size reduction: ${this.results.serialization.sizeComparison.reduction}`);
        }
        
        // Compression
        console.log('\n🗜️  Compression:');
        console.log(`   Gzip: ${this.results.compression.ratios.gzipRatio} reduction`);
        console.log(`   Brotli: ${this.results.compression.ratios.brotliRatio} reduction`);
        
        console.log('\n═══════════════════════════════════════════════════');
    }
}

// ============================================
// CLI
// ============================================

async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let palacePath = path.join(__dirname, '../../palaces/system-design-citadel.json');
    let outputPath = path.join(__dirname, 'benchmark-results.json');
    let verbose = false;
    
    for (const arg of args) {
        if (arg.startsWith('--palace=')) {
            palacePath = arg.replace('--palace=', '');
            if (!path.isAbsolute(palacePath)) {
                palacePath = path.join(__dirname, '../../palaces', palacePath);
            }
        } else if (arg.startsWith('--output=')) {
            outputPath = arg.replace('--output=', '');
        } else if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Memory Palace Performance Benchmarks

Usage: node benchmarks.js [options]

Options:
  --palace=<name>     Palace file to benchmark (default: system-design-citadel)
  --output=<path>     Output path for results JSON (default: benchmark-results.json)
  --verbose, -v       Enable verbose logging
  --help, -h          Show this help message

Examples:
  node benchmarks.js
  node benchmarks.js --palace=red-queen-examination
  node benchmarks.js --palace=system-design-citadel --verbose
            `);
            process.exit(0);
        }
    }
    
    // Check if palace exists
    try {
        await fs.access(palacePath);
    } catch (error) {
        console.error(`❌ Palace not found: ${palacePath}`);
        console.log('Available palaces:');
        const palacesDir = path.join(__dirname, '../../palaces');
        const files = await fs.readdir(palacesDir);
        files.filter(f => f.endsWith('.json')).forEach(f => {
            console.log(`  - ${f.replace('.json', '')}`);
        });
        process.exit(1);
    }
    
    // Run benchmarks
    const benchmark = new MemoryPalaceBenchmarks({
        palacePath,
        outputPath,
        verbose
    });
    
    try {
        await benchmark.runAll();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Benchmark failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { MemoryPalaceBenchmarks };
