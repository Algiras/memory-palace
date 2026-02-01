-- Memory Palace SQLite Schema
-- Optimized for performance, ACID compliance, and full-text search
-- Version: 1.0.0

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================
-- PALACES TABLE
-- ============================================
-- A memory palace is a virtual space where memories are anchored
CREATE TABLE IF NOT EXISTS palaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT CHECK(json_valid(metadata)),  -- JSON metadata for extensibility
    is_active BOOLEAN DEFAULT 1,
    memory_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_palaces_created ON palaces(created_at);
CREATE INDEX IF NOT EXISTS idx_palaces_active ON palaces(is_active);

-- Trigger to update timestamp on modification
CREATE TRIGGER IF NOT EXISTS tr_palaces_updated
    AFTER UPDATE ON palaces
    FOR EACH ROW
BEGIN
    UPDATE palaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- LOCI TABLE
-- ============================================
-- Loci (locations) are specific spots within a palace where memories are stored
CREATE TABLE IF NOT EXISTS loci (
    id TEXT PRIMARY KEY,
    palace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    anchor TEXT,  -- e.g., "door", "staircase", "bookshelf"
    position_x REAL,
    position_y REAL,
    position_z REAL,
    sequence_order INTEGER,
    metadata TEXT CHECK(json_valid(metadata)),
    FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loci_palace ON loci(palace_id);
CREATE INDEX IF NOT EXISTS idx_loci_sequence ON loci(palace_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_loci_anchor ON loci(anchor);

-- ============================================
-- MEMORIES TABLE
-- ============================================
-- Individual memories stored at specific loci
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    locus_id TEXT NOT NULL,
    subject TEXT NOT NULL,  -- Topic/category for fast filtering
    content TEXT NOT NULL,  -- The actual memory content
    image TEXT,  -- Path or URL to associated image
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence REAL DEFAULT 1.0 CHECK(confidence >= 0 AND confidence <= 1),
    last_recalled_at DATETIME,
    recall_count INTEGER DEFAULT 0,
    importance INTEGER DEFAULT 5 CHECK(importance >= 1 AND importance <= 10),
    is_archived BOOLEAN DEFAULT 0,
    metadata TEXT CHECK(json_valid(metadata)),
    FOREIGN KEY (locus_id) REFERENCES loci(id) ON DELETE CASCADE
);

-- Primary performance indexes
CREATE INDEX IF NOT EXISTS idx_memories_locus ON memories(locus_id);
CREATE INDEX IF NOT EXISTS idx_memories_subject ON memories(subject);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories(confidence);
CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(is_archived);
CREATE INDEX IF NOT EXISTS idx_memories_last_recalled ON memories(last_recalled_at);

-- Compound index for review queries
CREATE INDEX IF NOT EXISTS idx_memories_review_sched 
    ON memories(subject, confidence, last_recalled_at) 
    WHERE is_archived = 0;

-- Trigger to update timestamp on modification
CREATE TRIGGER IF NOT EXISTS tr_memories_updated
    AFTER UPDATE ON memories
    FOR EACH ROW
BEGIN
    UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- EMBEDDINGS TABLE
-- ============================================
-- Vector embeddings for semantic search (future capability)
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    model_name TEXT NOT NULL,  -- e.g., 'openai-ada-002', 'local-sbert'
    vector_blob BLOB NOT NULL,  -- Serialized vector (e.g., Protocol Buffers or MessagePack)
    vector_dim INTEGER NOT NULL,  -- Dimensionality (e.g., 1536 for OpenAI)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embeddings_memory ON embeddings(memory_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model_name, memory_id);

-- ============================================
-- REVIEWS TABLE
-- ============================================
-- Spaced repetition review sessions
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_review_date DATETIME NOT NULL,  -- When this memory should be reviewed next
    success BOOLEAN NOT NULL,  -- Whether recall was successful
    confidence_before REAL,  -- Confidence before review
    confidence_after REAL,   -- Confidence after review
    time_spent_seconds INTEGER,  -- How long the review took
    notes TEXT,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Critical index for review scheduling
CREATE INDEX IF NOT EXISTS idx_reviews_next_date ON reviews(next_review_date, success);
CREATE INDEX IF NOT EXISTS idx_reviews_memory ON reviews(memory_id, review_date);

-- Partial index for pending reviews
CREATE INDEX IF NOT EXISTS idx_reviews_pending 
    ON reviews(next_review_date) 
    WHERE next_review_date <= CURRENT_TIMESTAMP;

-- ============================================
-- MEMORY PALACE MAP VIEW
-- ============================================
-- Denormalized view for quick palace visualization
CREATE VIEW IF NOT EXISTS v_palace_map AS
SELECT 
    p.id as palace_id,
    p.name as palace_name,
    p.theme,
    l.id as locus_id,
    l.name as locus_name,
    l.anchor,
    l.position_x,
    l.position_y,
    l.position_z,
    l.sequence_order,
    COUNT(m.id) as memory_count,
    AVG(m.confidence) as avg_confidence,
    MAX(m.last_recalled_at) as last_activity
FROM palaces p
LEFT JOIN loci l ON p.id = l.palace_id
LEFT JOIN memories m ON l.id = m.locus_id AND m.is_archived = 0
GROUP BY p.id, l.id
ORDER BY p.id, l.sequence_order;

-- ============================================
-- DUE REVIEWS VIEW
-- ============================================
-- View showing all memories due for review today
CREATE VIEW IF NOT EXISTS v_due_reviews AS
SELECT 
    m.id as memory_id,
    m.subject,
    m.content,
    m.confidence as current_confidence,
    m.recall_count,
    m.last_recalled_at,
    l.name as locus_name,
    l.anchor,
    p.name as palace_name,
    COALESCE(
        (SELECT next_review_date 
         FROM reviews 
         WHERE memory_id = m.id 
         ORDER BY review_date DESC 
         LIMIT 1),
        m.created_at
    ) as next_review_date
FROM memories m
JOIN loci l ON m.locus_id = l.id
JOIN palaces p ON l.palace_id = p.id
WHERE m.is_archived = 0
  AND m.confidence < 0.95  -- Only show if not fully memorized
  AND COALESCE(
        (SELECT next_review_date 
         FROM reviews 
         WHERE memory_id = m.id 
         ORDER BY review_date DESC 
         LIMIT 1),
        m.created_at
    ) <= datetime('now', '+1 day')
ORDER BY 
    confidence ASC,  -- Least confident first
    recall_count ASC,  -- Then least reviewed
    next_review_date ASC;  -- Then oldest review date

-- ============================================
-- FTS5 VIRTUAL TABLE (Full-Text Search)
-- ============================================
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    content = memories,  -- Content from memories table
    content_rowid = rowid,  -- Map to memories rowid
    subject,  -- Indexed columns
    content,
    -- Tokenize with unicode support, stemming, and accent removal
    tokenize = 'unicode61 remove_diacritics'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS tr_memories_fts_insert
    AFTER INSERT ON memories
BEGIN
    INSERT INTO memories_fts(rowid, subject, content)
    VALUES (NEW.rowid, NEW.subject, NEW.content);
    
    -- Update palace memory count
    UPDATE palaces 
    SET memory_count = memory_count + 1 
    WHERE id = (SELECT palace_id FROM loci WHERE id = NEW.locus_id);
END;

CREATE TRIGGER IF NOT EXISTS tr_memories_fts_delete
    AFTER DELETE ON memories
BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, subject, content)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.content);
    
    -- Update palace memory count
    UPDATE palaces 
    SET memory_count = memory_count - 1 
    WHERE id = (SELECT palace_id FROM loci WHERE id = OLD.locus_id);
END;

CREATE TRIGGER IF NOT EXISTS tr_memories_fts_update
    AFTER UPDATE ON memories
BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, subject, content)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.content);
    INSERT INTO memories_fts(rowid, subject, content)
    VALUES (NEW.rowid, NEW.subject, NEW.content);
END;

-- ============================================
-- STATISTICS TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE DEFAULT CURRENT_DATE,
    palace_id TEXT,
    memories_created INTEGER DEFAULT 0,
    memories_reviewed INTEGER DEFAULT 0,
    avg_confidence REAL,
    total_reviews INTEGER DEFAULT 0,
    successful_reviews INTEGER DEFAULT 0,
    FOREIGN KEY (palace_id) REFERENCES palaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stats_date ON stats(date);
CREATE INDEX IF NOT EXISTS idx_stats_palace ON stats(palace_id, date);

UNIQUE INDEX IF NOT EXISTS idx_stats_daily ON stats(date, palace_id);

-- ============================================
-- SCHEMA MIGRATION VERSION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES (1, 'Initial schema with palaces, loci, memories, reviews, embeddings, and FTS5');
