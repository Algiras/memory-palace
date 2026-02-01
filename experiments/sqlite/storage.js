/**
 * Memory Palace SQLite Storage Module
 * 
 * Production-ready storage backend with:
 * - ACID transactions
 * - Full-text search via FTS5
 * - Performance benchmarks vs JSON
 * - Comprehensive error handling
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class MemoryPalaceStorage {
    constructor(dbPath = 'memory_palace.db', options = {}) {
        this.dbPath = dbPath;
        this.options = {
            verbose: options.verbose || null,
            timeout: options.timeout || 5000,
            ...options
        };
        this.db = null;
    }

    /**
     * Initialize the database with schema
     */
    initialize() {
        try {
            this.db = new Database(this.dbPath, {
                verbose: this.options.verbose,
                timeout: this.options.timeout
            });

            // Enable WAL mode for better concurrent performance
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('synchronous = NORMAL');

            // Load and execute schema
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Split schema into individual statements and execute
            const statements = schema.split(';').filter(s => s.trim());
            for (const statement of statements) {
                try {
                    this.db.exec(statement + ';');
                } catch (err) {
                    // Ignore "already exists" errors
                    if (!err.message.includes('already exists')) {
                        throw err;
                    }
                }
            }

            console.log('✓ Database initialized successfully');
            return this;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    // ============================================
    // PALACE OPERATIONS
    // ============================================

    createPalace({ name, theme = null, metadata = {} }) {
        const id = randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO palaces (id, name, theme, metadata)
            VALUES (?, ?, ?, ?)
        `);
        
        const info = stmt.run(id, name, theme, JSON.stringify(metadata));
        return this.getPalace(id);
    }

    getPalace(id) {
        return this.db.prepare('SELECT * FROM palaces WHERE id = ?').get(id);
    }

    listPalaces(activeOnly = true) {
        let query = 'SELECT * FROM palaces';
        if (activeOnly) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY created_at DESC';
        return this.db.prepare(query).all();
    }

    updatePalace(id, updates) {
        const allowed = ['name', 'theme', 'metadata', 'is_active'];
        const fields = Object.keys(updates).filter(k => allowed.includes(k));
        
        if (fields.length === 0) return null;
        
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => {
            if (f === 'metadata') return JSON.stringify(updates[f]);
            return updates[f];
        });
        values.push(id);
        
        const stmt = this.db.prepare(`
            UPDATE palaces SET ${setClause} WHERE id = ?
        `);
        
        stmt.run(...values);
        return this.getPalace(id);
    }

    deletePalace(id) {
        const stmt = this.db.prepare('DELETE FROM palaces WHERE id = ?');
        const info = stmt.run(id);
        return { deleted: info.changes > 0, id };
    }

    // ============================================
    // LOCI OPERATIONS
    // ============================================

    createLocus({ palaceId, name, anchor = null, position = {}, sequenceOrder = 0, metadata = {} }) {
        const id = randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO loci (id, palace_id, name, anchor, position_x, position_y, position_z, sequence_order, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            id, palaceId, name, anchor,
            position.x || 0, position.y || 0, position.z || 0,
            sequenceOrder,
            JSON.stringify(metadata)
        );
        
        return this.getLocus(id);
    }

    getLocus(id) {
        return this.db.prepare('SELECT * FROM loci WHERE id = ?').get(id);
    }

    listLoci(palaceId) {
        return this.db.prepare(`
            SELECT * FROM loci 
            WHERE palace_id = ? 
            ORDER BY sequence_order, name
        `).all(palaceId);
    }

    updateLocus(id, updates) {
        const allowed = ['name', 'anchor', 'position_x', 'position_y', 'position_z', 'sequence_order', 'metadata'];
        const fields = Object.keys(updates).filter(k => allowed.includes(k) || k.startsWith('position.'));
        
        if (fields.length === 0) return null;
        
        const setValues = [];
        const values = [];
        
        fields.forEach(f => {
            if (f === 'metadata') {
                setValues.push('metadata = ?');
                values.push(JSON.stringify(updates[f]));
            } else if (f.startsWith('position.')) {
                const coord = f.split('.')[1];
                setValues.push(`position_${coord} = ?`);
                values.push(updates[f]);
            } else {
                setValues.push(`${f} = ?`);
                values.push(updates[f]);
            }
        });
        
        values.push(id);
        
        const stmt = this.db.prepare(`
            UPDATE loci SET ${setValues.join(', ')} WHERE id = ?
        `);
        
        stmt.run(...values);
        return this.getLocus(id);
    }

    deleteLocus(id) {
        const stmt = this.db.prepare('DELETE FROM loci WHERE id = ?');
        const info = stmt.run(id);
        return { deleted: info.changes > 0, id };
    }

    // ============================================
    // MEMORY OPERATIONS
    // ============================================

    createMemory({ locusId, subject, content, image = null, importance = 5, metadata = {} }) {
        const id = randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO memories (id, locus_id, subject, content, image, importance, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(id, locusId, subject, content, image, importance, JSON.stringify(metadata));
        return this.getMemory(id);
    }

    getMemory(id) {
        return this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    }

    getMemoryWithContext(id) {
        return this.db.prepare(`
            SELECT m.*, l.name as locus_name, l.anchor, p.name as palace_name, p.theme
            FROM memories m
            JOIN loci l ON m.locus_id = l.id
            JOIN palaces p ON l.palace_id = p.id
            WHERE m.id = ?
        `).get(id);
    }

    listMemories(locusId = null, filters = {}) {
        let query = `
            SELECT m.*, l.name as locus_name, p.name as palace_name
            FROM memories m
            JOIN loci l ON m.locus_id = l.id
            JOIN palaces p ON l.palace_id = p.id
            WHERE m.is_archived = 0
        `;
        const params = [];
        
        if (locusId) {
            query += ' AND m.locus_id = ?';
            params.push(locusId);
        }
        
        if (filters.subject) {
            query += ' AND m.subject = ?';
            params.push(filters.subject);
        }
        
        if (filters.minConfidence !== undefined) {
            query += ' AND m.confidence >= ?';
            params.push(filters.minConfidence);
        }
        
        query += ' ORDER BY m.created_at DESC';
        
        return this.db.prepare(query).all(...params);
    }

    searchMemories(searchTerm) {
        // FTS5 full-text search
        const stmt = this.db.prepare(`
            SELECT 
                m.*,
                l.name as locus_name,
                p.name as palace_name,
                rank
            FROM memories_fts fts
            JOIN memories m ON m.rowid = fts.rowid
            JOIN loci l ON m.locus_id = l.id
            JOIN palaces p ON l.palace_id = p.id
            WHERE memories_fts MATCH ?
            ORDER BY rank
            LIMIT 50
        `);
        
        return stmt.all(searchTerm);
    }

    updateMemory(id, updates) {
        const allowed = ['subject', 'content', 'image', 'confidence', 'is_archived', 'importance', 'metadata'];
        const fields = Object.keys(updates).filter(k => allowed.includes(k));
        
        if (fields.length === 0) return null;
        
        const setValues = [];
        const values = [];
        
        fields.forEach(f => {
            setValues.push(`${f} = ?`);
            if (f === 'metadata') {
                values.push(JSON.stringify(updates[f]));
            } else {
                values.push(updates[f]);
            }
        });
        
        values.push(id);
        
        const stmt = this.db.prepare(`
            UPDATE memories SET ${setValues.join(', ')} WHERE id = ?
        `);
        
        stmt.run(...values);
        return this.getMemory(id);
    }

    deleteMemory(id) {
        const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
        const info = stmt.run(id);
        return { deleted: info.changes > 0, id };
    }

    // ============================================
    // REVIEW OPERATIONS
    // ============================================

    createReview({ memoryId, success, confidenceBefore, confidenceAfter, timeSpentSeconds = null, notes = null }) {
        const id = randomUUID();
        
        // Calculate next review using simple spaced repetition
        const nextReviewDate = this._calculateNextReview(confidenceAfter, success);
        
        const stmt = this.db.prepare(`
            INSERT INTO reviews 
            (id, memory_id, next_review_date, success, confidence_before, confidence_after, time_spent_seconds, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(id, memoryId, nextReviewDate, success ? 1 : 0, 
                 confidenceBefore, confidenceAfter, timeSpentSeconds, notes);
        
        // Update memory stats
        this.db.prepare(`
            UPDATE memories 
            SET recall_count = recall_count + 1,
                last_recalled_at = CURRENT_TIMESTAMP,
                confidence = ?
            WHERE id = ?
        `).run(confidenceAfter, memoryId);
        
        return this.getReview(id);
    }

    getReview(id) {
        return this.db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    }

    listReviews(memoryId, limit = 100) {
        return this.db.prepare(`
            SELECT * FROM reviews 
            WHERE memory_id = ? 
            ORDER BY review_date DESC
            LIMIT ?
        `).all(memoryId, limit);
    }

    getDueReviews(limit = 50) {
        return this.db.prepare(`
            SELECT * FROM v_due_reviews
            LIMIT ?
        `).all(limit);
    }

    getReviewStats(memoryId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_reviews,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_reviews,
                AVG(confidence_after) as avg_confidence,
                MAX(review_date) as last_reviewed
            FROM reviews 
            WHERE memory_id = ?
        `).get(memoryId);
    }

    _calculateNextReview(confidence, success) {
        const now = new Date();
        let days = 1;
        
        if (success) {
            if (confidence >= 0.9) days = 30;
            else if (confidence >= 0.7) days = 7;
            else if (confidence >= 0.5) days = 3;
            else days = 1;
        } else {
            days = 1;
        }
        
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + days);
        return nextDate.toISOString();
    }

    // ============================================
    // QUERY OPERATIONS
    // ============================================

    getMemoriesBySubject(subject, limit = 100) {
        return this.db.prepare(`
            SELECT m.*, l.name as locus_name, p.name as palace_name
            FROM memories m
            JOIN loci l ON m.locus_id = l.id
            JOIN palaces p ON l.palace_id = p.id
            WHERE m.subject = ? AND m.is_archived = 0
            ORDER BY m.confidence ASC, m.last_recalled_at ASC
            LIMIT ?
        `).all(subject, limit);
    }

    getPalaceMap(palaceId) {
        return this.db.prepare(`
            SELECT * FROM v_palace_map WHERE palace_id = ?
        `).all(palaceId);
    }

    getStats(palaceId = null) {
        let query = `
            SELECT 
                COUNT(DISTINCT p.id) as total_palaces,
                COUNT(DISTINCT l.id) as total_loci,
                COUNT(DISTINCT m.id) as total_memories,
                COUNT(DISTINCT r.id) as total_reviews,
                AVG(m.confidence) as avg_confidence,
                AVG(m.recall_count) as avg_recall_count
            FROM palaces p
            LEFT JOIN loci l ON p.id = l.palace_id
            LEFT JOIN memories m ON l.id = m.locus_id AND m.is_archived = 0
            LEFT JOIN reviews r ON m.id = r.memory_id
        `;
        
        if (palaceId) {
            query += ' WHERE p.id = ?';
            return this.db.prepare(query).get(palaceId);
        }
        
        return this.db.prepare(query).get();
    }

    // ============================================
    // TRANSACTION SUPPORT
    // ============================================

    transaction(callback) {
        const transaction = this.db.transaction(callback);
        return transaction();
    }

    // ============================================
    // BENCHMARKING
    // ============================================

    async benchmark() {
        console.log('\n🏃 Running performance benchmarks...\n');
        
        const results = {
            sqlite: {},
            json: {},
            comparison: {}
        };

        // Setup test data
        const testData = this._generateTestData(1000);
        const jsonPath = path.join(__dirname, 'benchmark_data.json');

        // Benchmark: Create operations
        results.sqlite.create = await this._benchmarkSQLiteCreate(testData);
        results.json.create = await this._benchmarkJSONCreate(testData, jsonPath);
        
        // Benchmark: Read operations
        results.sqlite.read = await this._benchmarkSQLiteRead(100);
        results.json.read = await this._benchmarkJSONRead(jsonPath, 100);
        
        // Benchmark: Search operations
        results.sqlite.search = await this._benchmarkSQLiteSearch(100);
        results.json.search = await this._benchmarkJSONSearch(jsonPath, 100);
        
        // Storage size
        results.sqlite.size = this._getDatabaseSize();
        results.json.size = this._getFileSize(jsonPath);
        
        // Calculate improvements
        results.comparison = {
            createSpeedup: (results.json.create.avg / results.sqlite.create.avg).toFixed(2) + 'x',
            readSpeedup: (results.json.read.avg / results.sqlite.read.avg).toFixed(2) + 'x',
            searchSpeedup: (results.json.search.avg / results.sqlite.search.avg).toFixed(2) + 'x',
            storageReduction: ((1 - results.sqlite.size / results.json.size) * 100).toFixed(1) + '%'
        };

        // Cleanup
        fs.unlinkSync(jsonPath);

        this._printBenchmarkResults(results);
        return results;
    }

    _generateTestData(count) {
        const data = [];
        const subjects = ['History', 'Science', 'Literature', 'Art', 'Geography', 'Math', 'Language'];
        
        for (let i = 0; i < count; i++) {
            data.push({
                id: randomUUID(),
                subject: subjects[Math.floor(Math.random() * subjects.length)],
                content: `Memory content for item ${i}: ${'word '.repeat(20)}`,
                importance: Math.floor(Math.random() * 10) + 1,
                confidence: Math.random()
            });
        }
        return data;
    }

    _benchmarkSQLiteCreate(data) {
        const times = [];
        const iterations = 5;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Clean up from previous iteration
            this.db.exec('DELETE FROM memories WHERE id LIKE \'bench-%\'');
            
            const start = performance.now();
            
            const insert = this.db.prepare(`
                INSERT INTO memories (id, locus_id, subject, content, importance, confidence)
                VALUES (?, 'bench-locus', ?, ?, ?, ?)
            `);
            
            const insertMany = this.db.transaction((items) => {
                for (const item of items) {
                    insert.run('bench-' + item.id, item.subject, item.content, item.importance, item.confidence);
                }
            });
            
            insertMany(data);
            
            const end = performance.now();
            times.push(end - start);
        }
        
        return this._calculateStats(times);
    }

    _benchmarkJSONCreate(data, jsonPath) {
        const times = [];
        const iterations = 5;
        
        for (let iter = 0; iter < iterations; iter++) {
            const start = performance.now();
            
            // Read existing data
            let existing = [];
            if (fs.existsSync(jsonPath)) {
                existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            }
            
            // Append new data
            existing.push(...data);
            
            // Write back
            fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2));
            
            const end = performance.now();
            times.push(end - start);
            
            // Clean up
            fs.unlinkSync(jsonPath);
        }
        
        return this._calculateStats(times);
    }

    _benchmarkSQLiteRead(count) {
        const times = [];
        const iterations = 10;
        
        for (let iter = 0; iter < iterations; iter++) {
            const start = performance.now();
            
            const memories = this.db.prepare(`
                SELECT * FROM memories LIMIT ?
            `).all(count);
            
            const end = performance.now();
            times.push(end - start);
        }
        
        return this._calculateStats(times);
    }

    _benchmarkJSONRead(jsonPath, count) {
        // First create the file
        const data = this._generateTestData(count * 10);
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        
        const times = [];
        const iterations = 10;
        
        for (let iter = 0; iter < iterations; iter++) {
            const start = performance.now();
            
            const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const memories = content.slice(0, count);
            
            const end = performance.now();
            times.push(end - start);
        }
        
        return this._calculateStats(times);
    }

    _benchmarkSQLiteSearch(count) {
        const times = [];
        const iterations = 10;
        
        for (let iter = 0; iter < iterations; iter++) {
            const start = performance.now();
            
            const results = this.db.prepare(`
                SELECT * FROM memories 
                WHERE content LIKE ?
                LIMIT ?
            `).all('%word%', count);
            
            const end = performance.now();
            times.push(end - start);
        }
        
        return this._calculateStats(times);
    }

    _benchmarkJSONSearch(jsonPath, count) {
        // Create file with test data
        const data = this._generateTestData(count * 10);
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        
        const times = [];
        const iterations = 10;
        
        for (let iter = 0; iter < iterations; iter++) {
            const start = performance.now();
            
            const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const results = content.filter(item => item.content.includes('word'));
            
            const end = performance.now();
            times.push(end - start);
        }
        
        return this._calculateStats(times);
    }

    _calculateStats(times) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2), samples: times };
    }

    _getDatabaseSize() {
        const stats = fs.statSync(this.dbPath);
        return stats.size;
    }

    _getFileSize(filePath) {
        const stats = fs.statSync(filePath);
        return stats.size;
    }

    _printBenchmarkResults(results) {
        console.log('═══════════════════════════════════════════════════');
        console.log('📊 SQLite vs JSON Performance Comparison');
        console.log('═══════════════════════════════════════════════════\n');
        
        console.log('SQLite Performance:');
        console.log(`  Create 1000 items: ${results.sqlite.create.avg}ms avg`);
        console.log(`  Read 100 items:    ${results.sqlite.read.avg}ms avg`);
        console.log(`  Search 100 items:  ${results.sqlite.search.avg}ms avg`);
        console.log(`  Storage size:      ${(results.sqlite.size / 1024).toFixed(2)} KB\n`);
        
        console.log('JSON Performance:');
        console.log(`  Create 1000 items: ${results.json.create.avg}ms avg`);
        console.log(`  Read 100 items:    ${results.json.read.avg}ms avg`);
        console.log(`  Search 100 items:  ${results.json.search.avg}ms avg`);
        console.log(`  Storage size:      ${(results.json.size / 1024).toFixed(2)} KB\n`);
        
        console.log('🚀 Performance Improvements:');
        console.log(`  Create speedup:   ${results.comparison.createSpeedup}`);
        console.log(`  Read speedup:     ${results.comparison.readSpeedup}`);
        console.log(`  Search speedup:   ${results.comparison.searchSpeedup}`);
        console.log(`  Storage savings:  ${results.comparison.storageReduction}`);
        
        console.log('\n═══════════════════════════════════════════════════');
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    close() {
        if (this.db) {
            this.db.close();
            console.log('✓ Database connection closed');
        }
    }

    backup(backupPath) {
        this.db.backup(backupPath)
            .then(() => console.log(`✓ Database backed up to ${backupPath}`))
            .catch(err => console.error('Backup failed:', err));
    }

    optimize() {
        this.db.exec('VACUUM');
        this.db.exec('ANALYZE');
        console.log('✓ Database optimized');
    }
}

// ============================================
// MIGRATION UTILITIES
// ============================================

class MigrationHelper {
    static fromJSON(storage, jsonData) {
        console.log('🔄 Migrating data from JSON...');
        
        const results = {
            palaces: 0,
            loci: 0,
            memories: 0,
            errors: []
        };

        try {
            storage.transaction(() => {
                // Migrate palaces
                if (jsonData.palaces) {
                    for (const palace of jsonData.palaces) {
                        try {
                            storage.createPalace({
                                name: palace.name,
                                theme: palace.theme,
                                metadata: palace.metadata || {}
                            });
                            results.palaces++;
                        } catch (err) {
                            results.errors.push(`Palace "${palace.name}": ${err.message}`);
                        }
                    }
                }

                // Migrate loci
                if (jsonData.loci) {
                    for (const locus of jsonData.loci) {
                        try {
                            storage.createLocus({
                                palaceId: locus.palaceId || locus.palace_id,
                                name: locus.name,
                                anchor: locus.anchor,
                                position: locus.position || {},
                                sequenceOrder: locus.sequenceOrder || locus.sequence_order || 0
                            });
                            results.loci++;
                        } catch (err) {
                            results.errors.push(`Locus "${locus.name}": ${err.message}`);
                        }
                    }
                }

                // Migrate memories
                if (jsonData.memories) {
                    for (const memory of jsonData.memories) {
                        try {
                            storage.createMemory({
                                locusId: memory.locusId || memory.locus_id,
                                subject: memory.subject,
                                content: memory.content,
                                image: memory.image,
                                importance: memory.importance || 5,
                                metadata: memory.metadata || {}
                            });
                            results.memories++;
                        } catch (err) {
                            results.errors.push(`Memory "${memory.subject}": ${err.message}`);
                        }
                    }
                }
            })();

            console.log(`✓ Migration complete: ${results.palaces} palaces, ${results.loci} loci, ${results.memories} memories`);
            if (results.errors.length > 0) {
                console.warn(`⚠ ${results.errors.length} errors during migration`);
            }

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }

        return results;
    }
}

module.exports = { MemoryPalaceStorage, MigrationHelper };

// CLI usage
if (require.main === module) {
    const storage = new MemoryPalaceStorage('memory_palace.db', { verbose: console.log });
    storage.initialize();
    
    // Run benchmarks if --benchmark flag is provided
    if (process.argv.includes('--benchmark')) {
        storage.benchmark().then(() => {
            storage.close();
            process.exit(0);
        });
    } else {
        console.log('\nUsage:');
        console.log('  node storage.js --benchmark    Run performance benchmarks');
        console.log('  node storage.js                Start interactive mode (not implemented)');
        storage.close();
    }
}
