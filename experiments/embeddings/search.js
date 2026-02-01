/**
 * Memory Palace Semantic Search Module
 * 
 * Implements vector-based semantic search for memory palaces:
 * - In-memory vector storage with FAISS-like functionality
 * - Semantic similarity search (meaning-based, not keyword)
 * - Cross-palace semantic linking
 * - Auto-suggested connections
 * - Topic clustering
 * 
 * @example
 * const search = new SemanticSearch({ embeddingService });
 * await search.indexMemories(memories);
 * 
 * // Find by meaning
 * const results = await search.findByMeaning('consistency in distributed systems');
 * 
 * // Find similar to a memory
 * const related = await search.findRelated(memoryId);
 * 
 * // Auto-discover connections
 * const connections = await search.suggestConnections();
 */

const { EmbeddingService } = require('./embedding-service');
const fs = require('fs').promises;
const path = require('path');

class SemanticSearch {
    constructor(options = {}) {
        this.options = {
            // Embedding service (required)
            embeddingService: options.embeddingService || null,
            
            // Storage configuration
            storagePath: options.storagePath || './vector-store.json',
            enablePersistence: options.enablePersistence !== false,
            
            // Search configuration
            defaultTopK: options.defaultTopK || 10,
            minSimilarity: options.minSimilarity || 0.5,
            
            // Cross-palace linking
            enableCrossPalace: options.enableCrossPalace !== false,
            crossPalaceThreshold: options.crossPalaceThreshold || 0.7,
            
            // Auto-connection discovery
            connectionThreshold: options.connectionThreshold || 0.75,
            maxConnectionsPerMemory: options.maxConnectionsPerMemory || 5,
            
            // Debug
            verbose: options.verbose || false
        };
        
        // Vector store: Map<memoryId, {embedding, metadata}>
        this.vectors = new Map();
        
        // Metadata index for quick lookups
        this.metadata = new Map();
        
        // Auto-discovered connections
        this.connections = new Map();
        
        this.initialized = false;
    }

    /**
     * Initialize the search module
     */
    async initialize() {
        if (this.initialized) return this;
        
        this._log('🔍 Initializing semantic search...');
        
        // Initialize embedding service if not provided
        if (!this.options.embeddingService) {
            this.options.embeddingService = new EmbeddingService({
                verbose: this.options.verbose
            });
            await this.options.embeddingService.initialize();
        }
        
        // Load persisted vectors if enabled
        if (this.options.enablePersistence) {
            await this._loadStorage();
        }
        
        this.initialized = true;
        this._log('✓ Semantic search initialized');
        
        return this;
    }

    // ============================================
    // INDEXING
    // ============================================

    /**
     * Index a single memory
     * @param {Object} memory - Memory object
     * @param {string} memory.id - Unique identifier
     * @param {string} memory.content - Text content to embed
     * @param {Object} memory.metadata - Additional metadata
     * @returns {Promise<Object>} - Indexed memory
     */
    async indexMemory(memory) {
        if (!this.initialized) await this.initialize();
        
        const { id, content, ...metadata } = memory;
        
        if (!id || !content) {
            throw new Error('Memory must have id and content');
        }
        
        this._log(`📌 Indexing memory: ${id}`);
        
        // Generate embedding
        const embedding = await this.options.embeddingService.embed(content);
        
        // Store vector and metadata
        this.vectors.set(id, embedding);
        this.metadata.set(id, {
            id,
            content,
            ...metadata,
            indexedAt: new Date().toISOString()
        });
        
        // Persist if enabled
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        return {
            id,
            content,
            embedding,
            ...metadata
        };
    }

    /**
     * Index multiple memories in batch
     * @param {Array} memories - Array of memory objects
     * @returns {Promise<Array>} - Indexed memories
     */
    async indexMemories(memories) {
        if (!this.initialized) await this.initialize();
        
        this._log(`📌 Indexing ${memories.length} memories...`);
        
        const results = [];
        const contents = memories.map(m => m.content);
        
        // Generate embeddings in batch for efficiency
        const embeddings = await this.options.embeddingService.embedBatch(contents);
        
        // Store each memory with its embedding
        for (let i = 0; i < memories.length; i++) {
            const memory = memories[i];
            const embedding = embeddings[i];
            
            this.vectors.set(memory.id, embedding);
            this.metadata.set(memory.id, {
                id: memory.id,
                content: memory.content,
                ...memory,
                indexedAt: new Date().toISOString()
            });
            
            results.push({
                ...memory,
                embedding
            });
        }
        
        // Persist if enabled
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        this._log(`✓ Indexed ${results.length} memories`);
        return results;
    }

    /**
     * Remove a memory from the index
     * @param {string} memoryId - Memory ID to remove
     */
    async removeMemory(memoryId) {
        this.vectors.delete(memoryId);
        this.metadata.delete(memoryId);
        
        // Remove any connections involving this memory
        this.connections.delete(memoryId);
        for (const [sourceId, targets] of this.connections.entries()) {
            const filtered = targets.filter(t => t.targetId !== memoryId);
            this.connections.set(sourceId, filtered);
        }
        
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        this._log(`🗑️ Removed memory: ${memoryId}`);
    }

    /**
     * Update an existing memory
     * @param {string} memoryId - Memory ID
     * @param {Object} updates - Fields to update
     */
    async updateMemory(memoryId, updates) {
        const metadata = this.metadata.get(memoryId);
        if (!metadata) {
            throw new Error(`Memory not found: ${memoryId}`);
        }
        
        // Update metadata
        const updatedMetadata = {
            ...metadata,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // If content changed, regenerate embedding
        if (updates.content && updates.content !== metadata.content) {
            const embedding = await this.options.embeddingService.embed(updates.content);
            this.vectors.set(memoryId, embedding);
        }
        
        this.metadata.set(memoryId, updatedMetadata);
        
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        this._log(`📝 Updated memory: ${memoryId}`);
        return updatedMetadata;
    }

    // ============================================
    // SEMANTIC SEARCH
    // ============================================

    /**
     * Find memories by semantic meaning
     * Searches by meaning, not keywords
     * Example: "CAP theorem" finds "distributed consistency" even without keyword match
     * 
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Matching memories with similarity scores
     */
    async findByMeaning(query, options = {}) {
        if (!this.initialized) await this.initialize();
        
        const topK = options.topK || this.options.defaultTopK;
        const minSimilarity = options.minSimilarity || this.options.minSimilarity;
        const filter = options.filter || null;
        
        this._log(`🔍 Searching by meaning: "${query}"`);
        
        // Generate query embedding
        const queryEmbedding = await this.options.embeddingService.embed(query);
        
        // Search all vectors
        return this._searchVectors(queryEmbedding, { topK, minSimilarity, filter });
    }

    /**
     * Find memories similar to a source memory
     * "Find memories like this one" functionality
     * 
     * @param {string} memoryId - Source memory ID
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Similar memories
     */
    async findRelated(memoryId, options = {}) {
        if (!this.initialized) await this.initialize();
        
        const sourceEmbedding = this.vectors.get(memoryId);
        if (!sourceEmbedding) {
            throw new Error(`Memory not found: ${memoryId}`);
        }
        
        const sourceMetadata = this.metadata.get(memoryId);
        this._log(`🔍 Finding memories related to: ${sourceMetadata?.subject || memoryId}`);
        
        const topK = options.topK || this.options.defaultTopK;
        const minSimilarity = options.minSimilarity || this.options.minSimilarity;
        
        // Search all other vectors
        const results = this._searchVectors(sourceEmbedding, {
            topK: topK + 1, // +1 to account for the source memory itself
            minSimilarity,
            excludeId: memoryId
        });
        
        return results.slice(0, topK);
    }

    /**
     * Search using an existing embedding
     */
    async findByEmbedding(embedding, options = {}) {
        if (!this.initialized) await this.initialize();
        
        const topK = options.topK || this.options.defaultTopK;
        const minSimilarity = options.minSimilarity || this.options.minSimilarity;
        
        return this._searchVectors(embedding, { topK, minSimilarity });
    }

    /**
     * Internal vector search
     */
    _searchVectors(queryEmbedding, options = {}) {
        const { topK, minSimilarity, excludeId, filter } = options;
        
        const results = [];
        
        for (const [id, embedding] of this.vectors.entries()) {
            // Skip excluded ID
            if (excludeId && id === excludeId) continue;
            
            // Apply filter if provided
            if (filter) {
                const metadata = this.metadata.get(id);
                if (!filter(metadata)) continue;
            }
            
            // Calculate similarity
            const similarity = this.options.embeddingService.cosineSimilarity(
                queryEmbedding, embedding
            );
            
            if (similarity >= minSimilarity) {
                const metadata = this.metadata.get(id);
                results.push({
                    ...metadata,
                    similarity,
                    distance: 1 - similarity
                });
            }
        }
        
        // Sort by similarity (descending)
        results.sort((a, b) => b.similarity - a.similarity);
        
        return results.slice(0, topK);
    }

    // ============================================
    // CROSS-PALACE SEMANTIC LINKING
    // ============================================

    /**
     * Discover semantic connections between memories
     * Cross-palace semantic linking
     * 
     * @param {Object} options - Discovery options
     * @returns {Promise<Array>} - Discovered connections
     */
    async suggestConnections(options = {}) {
        if (!this.initialized) await this.initialize();
        
        const threshold = options.threshold || this.options.connectionThreshold;
        const maxPerMemory = options.maxPerMemory || this.options.maxConnectionsPerMemory;
        const crossPalaceOnly = options.crossPalaceOnly || false;
        
        this._log('🔗 Discovering semantic connections...');
        
        const connections = [];
        const memoryIds = Array.from(this.vectors.keys());
        
        for (let i = 0; i < memoryIds.length; i++) {
            const sourceId = memoryIds[i];
            const sourceMetadata = this.metadata.get(sourceId);
            const sourceEmbedding = this.vectors.get(sourceId);
            
            const sourceConnections = [];
            
            for (let j = i + 1; j < memoryIds.length; j++) {
                const targetId = memoryIds[j];
                const targetMetadata = this.metadata.get(targetId);
                
                // Skip if same palace and cross-palace only
                if (crossPalaceOnly && 
                    sourceMetadata.palaceId === targetMetadata.palaceId) {
                    continue;
                }
                
                const targetEmbedding = this.vectors.get(targetId);
                
                // Calculate similarity
                const similarity = this.options.embeddingService.cosineSimilarity(
                    sourceEmbedding, targetEmbedding
                );
                
                if (similarity >= threshold) {
                    sourceConnections.push({
                        targetId,
                        similarity,
                        type: this._determineConnectionType(sourceMetadata, targetMetadata),
                        reason: this._generateConnectionReason(sourceMetadata, targetMetadata, similarity)
                    });
                }
            }
            
            // Sort by similarity and limit
            sourceConnections.sort((a, b) => b.similarity - a.similarity);
            const topConnections = sourceConnections.slice(0, maxPerMemory);
            
            if (topConnections.length > 0) {
                this.connections.set(sourceId, topConnections);
                
                for (const conn of topConnections) {
                    connections.push({
                        sourceId,
                        sourceSubject: sourceMetadata.subject,
                        sourcePalace: sourceMetadata.palaceId,
                        targetId: conn.targetId,
                        targetSubject: this.metadata.get(conn.targetId).subject,
                        targetPalace: this.metadata.get(conn.targetId).palaceId,
                        similarity: conn.similarity,
                        type: conn.type,
                        reason: conn.reason
                    });
                }
            }
        }
        
        this._log(`✓ Discovered ${connections.length} connections`);
        
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        return connections;
    }

    /**
     * Find cross-palace connections for a specific memory
     * @param {string} memoryId - Memory ID
     * @returns {Promise<Array>} - Cross-palace connections
     */
    async findCrossPalaceConnections(memoryId) {
        if (!this.initialized) await this.initialize();
        
        const sourceMetadata = this.metadata.get(memoryId);
        const sourceEmbedding = this.vectors.get(memoryId);
        
        if (!sourceEmbedding) {
            throw new Error(`Memory not found: ${memoryId}`);
        }
        
        this._log(`🌐 Finding cross-palace connections for: ${sourceMetadata?.subject || memoryId}`);
        
        const results = [];
        
        for (const [id, embedding] of this.vectors.entries()) {
            if (id === memoryId) continue;
            
            const metadata = this.metadata.get(id);
            
            // Only cross-palace
            if (metadata.palaceId === sourceMetadata.palaceId) continue;
            
            const similarity = this.options.embeddingService.cosineSimilarity(
                sourceEmbedding, embedding
            );
            
            if (similarity >= this.options.crossPalaceThreshold) {
                results.push({
                    ...metadata,
                    similarity,
                    distance: 1 - similarity
                });
            }
        }
        
        results.sort((a, b) => b.similarity - a.similarity);
        
        return results;
    }

    /**
     * Determine the type of connection between two memories
     */
    _determineConnectionType(source, target) {
        // Check if same subject area
        if (source.subject && target.subject) {
            const sourceSubject = source.subject.toLowerCase();
            const targetSubject = target.subject.toLowerCase();
            
            if (sourceSubject === targetSubject) {
                return 'same-topic';
            }
        }
        
        // Check palace relationship
        if (source.palaceId && target.palaceId) {
            if (source.palaceId === target.palaceId) {
                return 'same-palace';
            } else {
                return 'cross-palace';
            }
        }
        
        return 'semantic';
    }

    /**
     * Generate a human-readable reason for a connection
     */
    _generateConnectionReason(source, target, similarity) {
        const reasons = [];
        
        if (similarity > 0.9) {
            reasons.push('Very high semantic similarity');
        } else if (similarity > 0.8) {
            reasons.push('High semantic similarity');
        } else {
            reasons.push('Related concepts');
        }
        
        if (source.subject && target.subject) {
            reasons.push(`Both relate to "${source.subject}" and "${target.subject}"`);
        }
        
        return reasons.join('. ');
    }

    // ============================================
    // TOPIC CLUSTERING
    // ============================================

    /**
     * Cluster memories by semantic topic
     * Automatically groups related memories
     * 
     * @param {Object} options - Clustering options
     * @returns {Promise<Array>} - Clusters of memories
     */
    async clusterByTopic(options = {}) {
        if (!this.initialized) await this.initialize();
        
        const k = options.k || 5;
        const palaceId = options.palaceId || null;
        
        this._log(`🎯 Clustering memories into ${k} topics...`);
        
        // Get memories to cluster
        let memories = Array.from(this.metadata.values());
        
        if (palaceId) {
            memories = memories.filter(m => m.palaceId === palaceId);
        }
        
        // Add embeddings to memories for clustering
        const memoriesWithEmbeddings = memories.map(m => ({
            ...m,
            embedding: this.vectors.get(m.id)
        }));
        
        // Perform clustering
        const clusters = this.options.embeddingService.clusterMemories(
            memoriesWithEmbeddings,
            { k }
        );
        
        this._log(`✓ Created ${clusters.length} clusters`);
        
        return clusters;
    }

    /**
     * Find the dominant topics in a palace
     * @param {string} palaceId - Palace ID
     * @returns {Promise<Array>} - Top topics
     */
    async findTopics(palaceId, options = {}) {
        const topK = options.topK || 10;
        
        const memories = Array.from(this.metadata.values())
            .filter(m => m.palaceId === palaceId);
        
        if (memories.length === 0) {
            return [];
        }
        
        // Extract subjects
        const subjectCounts = {};
        for (const memory of memories) {
            const subject = memory.subject || 'Unknown';
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
        }
        
        // Sort by frequency
        const topics = Object.entries(subjectCounts)
            .map(([subject, count]) => ({ subject, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topK);
        
        return topics;
    }

    // ============================================
    // STORAGE
    // ============================================

    /**
     * Save vector store to disk
     */
    async _saveStorage() {
        try {
            const data = {
                vectors: Array.from(this.vectors.entries()),
                metadata: Array.from(this.metadata.entries()),
                connections: Array.from(this.connections.entries()),
                savedAt: new Date().toISOString()
            };
            
            await fs.writeFile(
                this.options.storagePath,
                JSON.stringify(data, null, 2)
            );
            
            this._log(`💾 Saved vector store: ${this.vectors.size} vectors`);
        } catch (error) {
            this._log(`⚠ Storage save error: ${error.message}`);
        }
    }

    /**
     * Load vector store from disk
     */
    async _loadStorage() {
        try {
            const data = await fs.readFile(this.options.storagePath, 'utf8');
            const parsed = JSON.parse(data);
            
            if (parsed.vectors) {
                this.vectors = new Map(parsed.vectors);
            }
            
            if (parsed.metadata) {
                this.metadata = new Map(parsed.metadata);
            }
            
            if (parsed.connections) {
                this.connections = new Map(parsed.connections);
            }
            
            this._log(`📦 Loaded vector store: ${this.vectors.size} vectors`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this._log(`⚠ Storage load error: ${error.message}`);
            }
        }
    }

    /**
     * Clear all indexed data
     */
    async clear() {
        this.vectors.clear();
        this.metadata.clear();
        this.connections.clear();
        
        if (this.options.enablePersistence) {
            try {
                await fs.unlink(this.options.storagePath);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }
        
        this._log('🗑️ Vector store cleared');
    }

    /**
     * Export index to JSON
     */
    async export() {
        return {
            vectors: Array.from(this.vectors.entries()),
            metadata: Array.from(this.metadata.entries()),
            connections: Array.from(this.connections.entries()),
            exportedAt: new Date().toISOString(),
            stats: this.getStats()
        };
    }

    /**
     * Import index from JSON
     */
    async import(data) {
        if (data.vectors) {
            this.vectors = new Map(data.vectors);
        }
        
        if (data.metadata) {
            this.metadata = new Map(data.metadata);
        }
        
        if (data.connections) {
            this.connections = new Map(data.connections);
        }
        
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        this._log(`📥 Imported ${this.vectors.size} vectors`);
    }

    // ============================================
    // STATS & INFO
    // ============================================

    /**
     * Get statistics about the index
     */
    getStats() {
        const palaces = new Set();
        const subjects = new Set();
        
        for (const metadata of this.metadata.values()) {
            if (metadata.palaceId) palaces.add(metadata.palaceId);
            if (metadata.subject) subjects.add(metadata.subject);
        }
        
        return {
            totalMemories: this.vectors.size,
            totalPalaces: palaces.size,
            totalSubjects: subjects.size,
            totalConnections: Array.from(this.connections.values())
                .reduce((sum, conns) => sum + conns.length, 0),
            storagePath: this.options.storagePath
        };
    }

    /**
     * List all indexed memories
     */
    listMemories() {
        return Array.from(this.metadata.values());
    }

    /**
     * Get memory by ID
     */
    getMemory(memoryId) {
        return this.metadata.get(memoryId) || null;
    }

    /**
     * Check if memory exists
     */
    hasMemory(memoryId) {
        return this.vectors.has(memoryId);
    }

    // ============================================
    // UTILITIES
    // ============================================

    _log(message) {
        if (this.options.verbose) {
            console.log(`[SemanticSearch] ${message}`);
        }
    }

    /**
     * Close the search module
     */
    async close() {
        if (this.options.enablePersistence) {
            await this._saveStorage();
        }
        
        if (this.options.embeddingService) {
            await this.options.embeddingService.close();
        }
        
        this.initialized = false;
        this._log('👋 Search module closed');
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = { SemanticSearch };

// CLI usage for testing
if (require.main === module) {
    const runTests = async () => {
        console.log('🧪 Running Semantic Search Tests\n');
        
        const search = new SemanticSearch({
            verbose: true,
            provider: 'local'
        });
        
        try {
            await search.initialize();
            
            // Create test memories
            console.log('\n--- Test 1: Indexing Memories ---');
            const memories = [
                {
                    id: 'mem-1',
                    content: 'CAP theorem states that distributed systems can only guarantee two of three properties: consistency, availability, and partition tolerance.',
                    subject: 'CAP Theorem',
                    palaceId: 'system-design',
                    locusId: 'fundamentals'
                },
                {
                    id: 'mem-2',
                    content: 'Strong consistency requires that all nodes see the same data at the same time. When a write occurs, all subsequent reads must return the updated value.',
                    subject: 'Consistency',
                    palaceId: 'system-design',
                    locusId: 'consistency'
                },
                {
                    id: 'mem-3',
                    content: 'Eventual consistency means that given enough time without new updates, all replicas will converge to the same value.',
                    subject: 'Eventual Consistency',
                    palaceId: 'system-design',
                    locusId: 'consistency'
                },
                {
                    id: 'mem-4',
                    content: 'Caching reduces database load by storing frequently accessed data in fast-access memory locations.',
                    subject: 'Caching',
                    palaceId: 'performance',
                    locusId: 'caching'
                },
                {
                    id: 'mem-5',
                    content: 'Horizontal scaling means adding more machines to distribute load, while vertical scaling means making existing machines more powerful.',
                    subject: 'Scaling',
                    palaceId: 'performance',
                    locusId: 'scaling'
                }
            ];
            
            await search.indexMemories(memories);
            console.log(`Indexed ${memories.length} memories`);
            
            // Test semantic search
            console.log('\n--- Test 2: Semantic Search ---');
            const results1 = await search.findByMeaning('distributed consistency models', {
                topK: 3
            });
            console.log('Search: "distributed consistency models"');
            results1.forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.subject} (sim: ${r.similarity.toFixed(4)})`);
            });
            
            // Test search without keyword match
            console.log('\n--- Test 3: No-Keyword Match Search ---');
            const results2 = await search.findByMeaning('keeping data synchronized across servers', {
                topK: 3
            });
            console.log('Search: "keeping data synchronized across servers"');
            console.log('Note: Should find consistency-related memories without using those exact words');
            results2.forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.subject} (sim: ${r.similarity.toFixed(4)})`);
            });
            
            // Test find related
            console.log('\n--- Test 4: Find Related Memories ---');
            const related = await search.findRelated('mem-1', { topK: 3 });
            console.log('Finding memories related to CAP Theorem:');
            related.forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.subject} (sim: ${r.similarity.toFixed(4)})`);
            });
            
            // Test cross-palace connections
            console.log('\n--- Test 5: Cross-Palace Connections ---');
            const connections = await search.suggestConnections({
                threshold: 0.5,
                maxPerMemory: 2
            });
            console.log(`Discovered ${connections.length} connections:`);
            connections.forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.sourceSubject} (${c.sourcePalace}) ↔ ${c.targetSubject} (${c.targetPalace}) - ${c.similarity.toFixed(4)}`);
            });
            
            // Test clustering
            console.log('\n--- Test 6: Topic Clustering ---');
            const clusters = await search.clusterByTopic({ k: 3 });
            console.log(`Created ${clusters.length} clusters:`);
            clusters.forEach((c, i) => {
                console.log(`  Cluster ${i + 1}: ${c.size} memories`);
                console.log(`    Suggested topic: ${c.suggestedTopic}`);
            });
            
            // Test stats
            console.log('\n--- Test 7: Statistics ---');
            const stats = search.getStats();
            console.log('Index statistics:');
            console.log(`  Total memories: ${stats.totalMemories}`);
            console.log(`  Total palaces: ${stats.totalPalaces}`);
            console.log(`  Total connections: ${stats.totalConnections}`);
            
            await search.close();
            console.log('\n✓ All tests passed');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    };
    
    runTests();
}
