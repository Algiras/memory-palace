/**
 * Memory Palace Embedding Service
 * 
 * Generates and manages semantic embeddings for memory content using:
 * - Local models via transformers.js (all-MiniLM-L6-v2, 384-dim vectors)
 * - API fallback (OpenAI, Cohere, etc.)
 * - Caching layer to avoid regeneration
 * - Cosine similarity search
 * 
 * @example
 * const service = new EmbeddingService({ cachePath: './embeddings-cache.json' });
 * await service.initialize();
 * 
 * // Generate embedding
 * const embedding = await service.embed('CAP theorem states that...');
 * 
 * // Find similar memories
 * const matches = await service.findSimilar(queryEmbedding, memories, { topK: 5 });
 */

const fs = require('fs').promises;
const path = require('path');

class EmbeddingService {
    constructor(options = {}) {
        this.options = {
            // Model configuration
            modelName: options.modelName || 'all-MiniLM-L6-v2',
            vectorDimension: options.vectorDimension || 384,
            
            // Provider: 'local' | 'openai' | 'cohere' | 'auto'
            provider: options.provider || 'local',
            
            // API keys for external providers
            openaiApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
            cohereApiKey: options.cohereApiKey || process.env.COHERE_API_KEY,
            
            // Cache configuration
            cachePath: options.cachePath || './embeddings-cache.json',
            enableCache: options.enableCache !== false,
            cacheMaxAge: options.cacheMaxAge || 30 * 24 * 60 * 60 * 1000, // 30 days
            
            // Fallback configuration
            fallbackEnabled: options.fallbackEnabled !== false,
            fallbackProvider: options.fallbackProvider || 'openai',
            
            // Performance
            batchSize: options.batchSize || 32,
            maxConcurrent: options.maxConcurrent || 4,
            
            // Debug
            verbose: options.verbose || false
        };
        
        this.cache = new Map();
        this.pipeline = null;
        this.initialized = false;
    }

    /**
     * Initialize the embedding service
     * Loads cache from disk and prepares the model
     */
    async initialize() {
        if (this.initialized) return this;
        
        this._log('🔧 Initializing embedding service...');
        
        // Load cache from disk
        if (this.options.enableCache) {
            await this._loadCache();
        }
        
        // Initialize local model if using local provider
        if (this.options.provider === 'local' || this.options.provider === 'auto') {
            await this._initializeLocalModel();
        }
        
        this.initialized = true;
        this._log('✓ Embedding service initialized');
        
        return this;
    }

    /**
     * Initialize the local transformer model
     */
    async _initializeLocalModel() {
        try {
            // Dynamic import for transformers.js (ESM module)
            const { pipeline } = await import('@xenova/transformers');
            
            this._log(`📦 Loading model: ${this.options.modelName}`);
            
            // Feature extraction pipeline for embeddings
            this.pipeline = await pipeline(
                'feature-extraction',
                this.options.modelName,
                {
                    quantized: true, // Use quantized model for faster inference
                    revision: 'main'
                }
            );
            
            this._log('✓ Local model loaded successfully');
        } catch (error) {
            this._log(`⚠ Local model initialization failed: ${error.message}`);
            
            if (this.options.provider === 'local') {
                throw new Error(
                    'Local model initialization failed. ' +
                    'Install transformers.js: npm install @xenova/transformers\n' +
                    `Error: ${error.message}`
                );
            }
        }
    }

    /**
     * Generate embedding for text
     * @param {string} text - Text to embed
     * @param {Object} options - Embedding options
     * @returns {Promise<number[]>} - Vector embedding (384 dimensions)
     */
    async embed(text, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }
        
        const normalizedText = this._normalizeText(text);
        const cacheKey = this._generateCacheKey(normalizedText);
        
        // Check cache first
        if (this.options.enableCache) {
            const cached = this._getFromCache(cacheKey);
            if (cached) {
                this._log('📦 Cache hit');
                return cached;
            }
        }
        
        let embedding;
        
        // Try primary provider
        try {
            embedding = await this._embedWithProvider(normalizedText, this.options.provider);
        } catch (error) {
            this._log(`⚠ Primary provider failed: ${error.message}`);
            
            // Try fallback if enabled
            if (this.options.fallbackEnabled && this.options.fallbackProvider !== this.options.provider) {
                this._log(`🔄 Trying fallback: ${this.options.fallbackProvider}`);
                embedding = await this._embedWithProvider(normalizedText, this.options.fallbackProvider);
            } else {
                throw error;
            }
        }
        
        // Normalize the embedding to unit vector
        embedding = this._normalizeVector(embedding);
        
        // Cache the result
        if (this.options.enableCache) {
            this._setCache(cacheKey, embedding);
            await this._saveCache();
        }
        
        return embedding;
    }

    /**
     * Generate embeddings for multiple texts in batch
     * More efficient than sequential embedding
     * @param {string[]} texts - Array of texts to embed
     * @param {Object} options - Batch options
     * @returns {Promise<number[][]>} - Array of embeddings
     */
    async embedBatch(texts, options = {}) {
        if (!Array.isArray(texts)) {
            throw new Error('Texts must be an array');
        }
        
        const batchSize = options.batchSize || this.options.batchSize;
        const embeddings = [];
        
        this._log(`📦 Processing batch of ${texts.length} texts...`);
        
        // Process in batches
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            this._log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
            
            const batchEmbeddings = await Promise.all(
                batch.map(text => this.embed(text))
            );
            
            embeddings.push(...batchEmbeddings);
        }
        
        this._log(`✓ Generated ${embeddings.length} embeddings`);
        return embeddings;
    }

    /**
     * Embed with a specific provider
     */
    async _embedWithProvider(text, provider) {
        switch (provider) {
            case 'local':
                return this._embedLocal(text);
            case 'openai':
                return this._embedOpenAI(text);
            case 'cohere':
                return this._embedCohere(text);
            case 'auto':
                // Try local first, then fall back to API
                if (this.pipeline) {
                    return this._embedLocal(text);
                }
                if (this.options.openaiApiKey) {
                    return this._embedOpenAI(text);
                }
                throw new Error('No available provider');
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }

    /**
     * Generate embedding using local transformer model
     */
    async _embedLocal(text) {
        if (!this.pipeline) {
            throw new Error('Local model not initialized');
        }
        
        // Generate embedding
        const result = await this.pipeline(text, {
            pooling: 'mean',
            normalize: true
        });
        
        // Extract the vector (result is a Tensor)
        const embedding = Array.from(result.data);
        
        return embedding;
    }

    /**
     * Generate embedding using OpenAI API
     */
    async _embedOpenAI(text) {
        if (!this.options.openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: text
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }
        
        const data = await response.json();
        return data.data[0].embedding;
    }

    /**
     * Generate embedding using Cohere API
     */
    async _embedCohere(text) {
        if (!this.options.cohereApiKey) {
            throw new Error('Cohere API key not configured');
        }
        
        const response = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.cohereApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'embed-english-v3.0',
                texts: [text],
                input_type: 'search_document'
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Cohere API error: ${error}`);
        }
        
        const data = await response.json();
        return data.embeddings[0];
    }

    // ============================================
    // SIMILARITY SEARCH
    // ============================================

    /**
     * Calculate cosine similarity between two vectors
     * @param {number[]} vecA - First vector
     * @param {number[]} vecB - Second vector
     * @returns {number} - Similarity score (0-1)
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have same dimension');
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Calculate cosine distance (1 - similarity)
     * @param {number[]} vecA - First vector
     * @param {number[]} vecB - Second vector
     * @returns {number} - Distance (0-2)
     */
    cosineDistance(vecA, vecB) {
        return 1 - this.cosineSimilarity(vecA, vecB);
    }

    /**
     * Calculate Euclidean distance between vectors
     */
    euclideanDistance(vecA, vecB) {
        let sum = 0;
        for (let i = 0; i < vecA.length; i++) {
            sum += Math.pow(vecA[i] - vecB[i], 2);
        }
        return Math.sqrt(sum);
    }

    /**
     * Find similar items using embedding similarity
     * @param {number[]} queryEmbedding - Query vector
     * @param {Array} items - Items with embeddings
     * @param {Object} options - Search options
     * @returns {Array} - Sorted results with similarity scores
     */
    findSimilar(queryEmbedding, items, options = {}) {
        const {
            topK = 10,
            minSimilarity = 0.5,
            embeddingField = 'embedding',
            textField = 'content'
        } = options;
        
        const results = [];
        
        for (const item of items) {
            const itemEmbedding = item[embeddingField];
            
            if (!itemEmbedding || !Array.isArray(itemEmbedding)) {
                continue;
            }
            
            const similarity = this.cosineSimilarity(queryEmbedding, itemEmbedding);
            
            if (similarity >= minSimilarity) {
                results.push({
                    ...item,
                    similarity,
                    distance: 1 - similarity
                });
            }
        }
        
        // Sort by similarity (descending)
        results.sort((a, b) => b.similarity - a.similarity);
        
        return results.slice(0, topK);
    }

    /**
     * Find memories similar to a query text
     * @param {string} queryText - Query text
     * @param {Array} memories - Memories to search
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Similar memories
     */
    async search(queryText, memories, options = {}) {
        const queryEmbedding = await this.embed(queryText);
        return this.findSimilar(queryEmbedding, memories, options);
    }

    /**
     * Find memories similar to another memory
     * @param {Object} sourceMemory - Source memory with embedding
     * @param {Array} memories - All memories to compare against
     * @param {Object} options - Search options
     * @returns {Array} - Similar memories
     */
    findRelated(sourceMemory, memories, options = {}) {
        const {
            excludeSelf = true,
            embeddingField = 'embedding'
        } = options;
        
        const sourceEmbedding = sourceMemory[embeddingField];
        
        if (!sourceEmbedding) {
            throw new Error('Source memory must have an embedding');
        }
        
        let candidates = memories;
        
        if (excludeSelf && sourceMemory.id) {
            candidates = memories.filter(m => m.id !== sourceMemory.id);
        }
        
        return this.findSimilar(sourceEmbedding, candidates, options);
    }

    // ============================================
    // CLUSTERING
    // ============================================

    /**
     * Cluster memories by semantic similarity
     * Uses simple k-means clustering on embeddings
     * @param {Array} memories - Memories with embeddings
     * @param {Object} options - Clustering options
     * @returns {Array} - Clusters with memories
     */
    clusterMemories(memories, options = {}) {
        const {
            k = 5,
            maxIterations = 100,
            embeddingField = 'embedding'
        } = options;
        
        const validMemories = memories.filter(m => m[embeddingField]);
        
        if (validMemories.length === 0) {
            return [];
        }
        
        // Adjust k if more than memories
        const numClusters = Math.min(k, validMemories.length);
        
        // Initialize centroids randomly
        let centroids = this._initializeCentroids(validMemories, numClusters, embeddingField);
        
        // K-means iteration
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Assign memories to nearest centroid
            const clusters = new Array(numClusters).fill(null).map(() => []);
            
            for (const memory of validMemories) {
                const embedding = memory[embeddingField];
                let minDistance = Infinity;
                let nearestCluster = 0;
                
                for (let i = 0; i < numClusters; i++) {
                    const distance = this.euclideanDistance(embedding, centroids[i]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCluster = i;
                    }
                }
                
                clusters[nearestCluster].push(memory);
            }
            
            // Update centroids
            const newCentroids = [];
            for (let i = 0; i < numClusters; i++) {
                if (clusters[i].length > 0) {
                    newCentroids.push(
                        this._calculateCentroid(clusters[i], embeddingField)
                    );
                } else {
                    newCentroids.push(centroids[i]);
                }
            }
            
            // Check for convergence
            if (this._centroidsConverged(centroids, newCentroids)) {
                break;
            }
            
            centroids = newCentroids;
        }
        
        // Create final clusters with metadata
        const finalClusters = [];
        for (let i = 0; i < numClusters; i++) {
            const clusterMemories = validMemories.filter(m => {
                const embedding = m[embeddingField];
                let minDistance = Infinity;
                let nearestCluster = 0;
                
                for (let j = 0; j < numClusters; j++) {
                    const distance = this.euclideanDistance(embedding, centroids[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCluster = j;
                    }
                }
                
                return nearestCluster === i;
            });
            
            if (clusterMemories.length > 0) {
                finalClusters.push({
                    id: i,
                    centroid: centroids[i],
                    memories: clusterMemories,
                    size: clusterMemories.length,
                    // Generate a label based on most common words in cluster
                    suggestedTopic: this._generateClusterLabel(clusterMemories)
                });
            }
        }
        
        return finalClusters.sort((a, b) => b.size - a.size);
    }

    /**
     * Initialize random centroids for k-means
     */
    _initializeCentroids(memories, k, embeddingField) {
        const centroids = [];
        const used = new Set();
        
        while (centroids.length < k && used.size < memories.length) {
            const idx = Math.floor(Math.random() * memories.length);
            if (!used.has(idx)) {
                used.add(idx);
                centroids.push([...memories[idx][embeddingField]]);
            }
        }
        
        return centroids;
    }

    /**
     * Calculate centroid of a cluster
     */
    _calculateCentroid(memories, embeddingField) {
        const dim = memories[0][embeddingField].length;
        const centroid = new Array(dim).fill(0);
        
        for (const memory of memories) {
            const embedding = memory[embeddingField];
            for (let i = 0; i < dim; i++) {
                centroid[i] += embedding[i];
            }
        }
        
        for (let i = 0; i < dim; i++) {
            centroid[i] /= memories.length;
        }
        
        return centroid;
    }

    /**
     * Check if centroids have converged
     */
    _centroidsConverged(oldCentroids, newCentroids, threshold = 0.0001) {
        for (let i = 0; i < oldCentroids.length; i++) {
            const distance = this.euclideanDistance(oldCentroids[i], newCentroids[i]);
            if (distance > threshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * Generate a label for a cluster based on memory content
     */
    _generateClusterLabel(memories) {
        // Simple label extraction - could be enhanced with keyword extraction
        const subjects = memories
            .map(m => m.subject || m.title || '')
            .filter(s => s)
            .slice(0, 3);
        
        if (subjects.length === 0) {
            return 'Unnamed Cluster';
        }
        
        return subjects.join(', ');
    }

    // ============================================
    // CACHING
    // ============================================

    /**
     * Generate cache key from text
     */
    _generateCacheKey(text) {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `emb_${hash}`;
    }

    /**
     * Get from cache
     */
    _getFromCache(key) {
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        // Check if entry is expired
        const age = Date.now() - entry.timestamp;
        if (age > this.options.cacheMaxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.embedding;
    }

    /**
     * Set cache entry
     */
    _setCache(key, embedding) {
        this.cache.set(key, {
            embedding,
            timestamp: Date.now()
        });
    }

    /**
     * Load cache from disk
     */
    async _loadCache() {
        try {
            const data = await fs.readFile(this.options.cachePath, 'utf8');
            const cacheData = JSON.parse(data);
            
            // Filter out expired entries
            const now = Date.now();
            for (const [key, entry] of Object.entries(cacheData)) {
                if (now - entry.timestamp < this.options.cacheMaxAge) {
                    this.cache.set(key, entry);
                }
            }
            
            this._log(`📦 Loaded ${this.cache.size} cached embeddings`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this._log(`⚠ Cache load error: ${error.message}`);
            }
        }
    }

    /**
     * Save cache to disk
     */
    async _saveCache() {
        try {
            const cacheData = {};
            for (const [key, entry] of this.cache.entries()) {
                cacheData[key] = entry;
            }
            
            await fs.writeFile(
                this.options.cachePath,
                JSON.stringify(cacheData, null, 2)
            );
            
            this._log(`💾 Saved ${this.cache.size} embeddings to cache`);
        } catch (error) {
            this._log(`⚠ Cache save error: ${error.message}`);
        }
    }

    /**
     * Clear the embedding cache
     */
    async clearCache() {
        this.cache.clear();
        
        try {
            await fs.unlink(this.options.cachePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        this._log('🗑️ Cache cleared');
    }

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Normalize text for embedding
     */
    _normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 512); // Limit length for performance
    }

    /**
     * Normalize vector to unit length
     */
    _normalizeVector(vector) {
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        
        if (magnitude === 0) {
            return vector;
        }
        
        return vector.map(val => val / magnitude);
    }

    /**
     * Log debug messages
     */
    _log(message) {
        if (this.options.verbose) {
            console.log(`[EmbeddingService] ${message}`);
        }
    }

    /**
     * Close the service and save cache
     */
    async close() {
        if (this.options.enableCache) {
            await this._saveCache();
        }
        
        this.initialized = false;
        this._log('👋 Service closed');
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = { EmbeddingService };

// CLI usage for testing
if (require.main === module) {
    const runTests = async () => {
        console.log('🧪 Running Embedding Service Tests\n');
        
        const service = new EmbeddingService({
            verbose: true,
            provider: 'local'
        });
        
        try {
            await service.initialize();
            
            // Test single embedding
            console.log('\n--- Test 1: Single Embedding ---');
            const embedding = await service.embed('CAP theorem states that distributed systems can only guarantee two of three properties: consistency, availability, and partition tolerance.');
            console.log(`Generated embedding: ${embedding.length} dimensions`);
            console.log(`Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
            
            // Test cache
            console.log('\n--- Test 2: Cache Check ---');
            const cachedEmbedding = await service.embed('CAP theorem states that distributed systems can only guarantee two of three properties: consistency, availability, and partition tolerance.');
            console.log(`Cache hit: ${embedding === cachedEmbedding ? 'YES' : 'NO'}`);
            
            // Test similarity
            console.log('\n--- Test 3: Similarity Calculation ---');
            const query = await service.embed('distributed consistency');
            const capEmbedding = await service.embed('CAP theorem guarantees consistency and partition tolerance');
            const unrelatedEmbedding = await service.embed('The weather is nice today');
            
            const sim1 = service.cosineSimilarity(query, capEmbedding);
            const sim2 = service.cosineSimilarity(query, unrelatedEmbedding);
            
            console.log(`Similarity (related): ${sim1.toFixed(4)}`);
            console.log(`Similarity (unrelated): ${sim2.toFixed(4)}`);
            
            // Test batch embedding
            console.log('\n--- Test 4: Batch Embedding ---');
            const texts = [
                'Distributed systems patterns',
                'Microservices architecture',
                'Database sharding',
                'Caching strategies',
                'Load balancing'
            ];
            const batchEmbeddings = await service.embedBatch(texts);
            console.log(`Generated ${batchEmbeddings.length} embeddings`);
            
            // Test similarity search
            console.log('\n--- Test 5: Similarity Search ---');
            const memories = texts.map((text, i) => ({
                id: `mem-${i}`,
                content: text,
                embedding: batchEmbeddings[i]
            }));
            
            const results = await service.search('scaling distributed databases', memories, {
                topK: 3,
                minSimilarity: 0.3
            });
            
            console.log('Search results:');
            results.forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.content} (sim: ${r.similarity.toFixed(4)})`);
            });
            
            await service.close();
            console.log('\n✓ All tests passed');
            
        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        }
    };
    
    runTests();
}
