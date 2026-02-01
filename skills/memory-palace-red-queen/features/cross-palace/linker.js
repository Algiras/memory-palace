// Cross-Palace Linking System
// Automatically discovers and maintains links between related memories across palaces

const fs = require('fs').promises;
const path = require('path');

class CrossPalaceLinker {
  constructor(config = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.6,
      maxLinksPerMemory: config.maxLinksPerMemory || 5,
      palacesPath: config.palacesPath || './palaces',
      ...config
    };
    this.linkGraph = new Map();
    this.palaceIndex = new Map();
  }

  /**
   * Load all palaces and build cross-link index
   */
  async initialize() {
    console.log('🔗 Initializing Cross-Palace Linker...');
    
    // Load all palaces
    const palaceFiles = await this.discoverPalaces();
    
    for (const file of palaceFiles) {
      const palace = await this.loadPalace(file);
      this.indexPalace(palace);
    }
    
    // Build semantic links
    await this.buildLinks();
    
    console.log(`✅ Indexed ${this.palaceIndex.size} palaces`);
    console.log(`✅ Created ${this.linkGraph.size} cross-links`);
  }

  /**
   * Discover all palace files
   */
  async discoverPalaces() {
    try {
      const files = await fs.readdir(this.config.palacesPath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(this.config.palacesPath, f));
    } catch (e) {
      console.warn('Could not discover palaces:', e.message);
      return [];
    }
  }

  /**
   * Load a palace from file
   */
  async loadPalace(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Index all memories from a palace
   */
  indexPalace(palace) {
    if (!palace.loci) return;
    
    palace.loci.forEach(locus => {
      if (!locus.memories) return;
      
      locus.memories.forEach(memory => {
        const key = `${palace.name}::${memory.id}`;
        this.palaceIndex.set(key, {
          palace: palace.name,
          locus: locus.name,
          memory: memory,
          vector: this.extractKeywords(memory)
        });
      });
    });
  }

  /**
   * Extract searchable keywords from memory
   */
  extractKeywords(memory) {
    const text = `${memory.subject} ${memory.content || ''}`.toLowerCase();
    
    // Extract technical terms, concepts, patterns
    const keywords = [
      // From subject
      ...memory.subject.toLowerCase().split(/\s+/),
      // From content (technical terms)
      ...(memory.content || '').match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [],
      // Common technical patterns
      ...(text.match(/\b(cache|database|api|server|client|async|algorithm|pattern|architecture|design)\b/g) || [])
    ];
    
    // Remove duplicates and short words
    return [...new Set(keywords)].filter(k => k.length > 3);
  }

  /**
   * Calculate similarity between two memories
   */
  calculateSimilarity(memoryA, memoryB) {
    const keywordsA = this.extractKeywords(memoryA);
    const keywordsB = this.extractKeywords(memoryB);
    
    // Jaccard similarity
    const intersection = keywordsA.filter(k => keywordsB.includes(k));
    const union = [...new Set([...keywordsA, ...keywordsB])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Build cross-palace links based on similarity
   */
  async buildLinks() {
    const memories = Array.from(this.palaceIndex.entries());
    
    for (let i = 0; i < memories.length; i++) {
      const [keyA, dataA] = memories[i];
      const links = [];
      
      for (let j = 0; j < memories.length; j++) {
        if (i === j) continue;
        
        const [keyB, dataB] = memories[j];
        
        // Don't link within same palace
        if (dataA.palace === dataB.palace) continue;
        
        const similarity = this.calculateSimilarity(dataA.memory, dataB.memory);
        
        if (similarity >= this.config.similarityThreshold) {
          links.push({
            target: keyB,
            palace: dataB.palace,
            locus: dataB.locus,
            subject: dataB.memory.subject,
            similarity: similarity
          });
        }
      }
      
      // Sort by similarity and keep top N
      links.sort((a, b) => b.similarity - a.similarity);
      this.linkGraph.set(keyA, links.slice(0, this.config.maxLinksPerMemory));
    }
  }

  /**
   * Get related memories from other palaces
   */
  getRelatedMemories(palaceName, memoryId, limit = 5) {
    const key = `${palaceName}::${memoryId}`;
    const links = this.linkGraph.get(key) || [];
    return links.slice(0, limit);
  }

  /**
   * Suggest cross-palace navigation path
   */
  suggestNavigation(fromPalace, toTopic) {
    const suggestions = [];
    
    for (const [key, data] of this.palaceIndex) {
      if (data.palace === fromPalace) continue;
      
      const relevance = this.calculateTopicRelevance(data, toTopic);
      
      if (relevance > 0.3) {
        suggestions.push({
          palace: data.palace,
          locus: data.locus,
          memory: data.memory,
          relevance: relevance
        });
      }
    }
    
    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Calculate relevance of memory to topic
   */
  calculateTopicRelevance(data, topic) {
    const keywords = this.extractKeywords({ subject: topic, content: '' });
    const memoryKeywords = data.vector;
    
    const matches = keywords.filter(k => memoryKeywords.includes(k));
    return matches.length / Math.max(keywords.length, memoryKeywords.length);
  }

  /**
   * Export link graph for visualization
   */
  exportGraph() {
    const nodes = [];
    const edges = [];
    
    for (const [key, data] of this.palaceIndex) {
      nodes.push({
        id: key,
        palace: data.palace,
        locus: data.locus,
        label: data.memory.subject
      });
    }
    
    for (const [source, links] of this.linkGraph) {
      links.forEach(link => {
        edges.push({
          source: source,
          target: link.target,
          weight: link.similarity
        });
      });
    }
    
    return { nodes, edges };
  }

  /**
   * Find path between two concepts across palaces
   */
  findPath(fromMemory, toTopic, maxHops = 3) {
    // BFS to find shortest path
    const visited = new Set();
    const queue = [[fromMemory]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (path.length > maxHops) continue;
      
      const links = this.linkGraph.get(current) || [];
      
      for (const link of links) {
        if (visited.has(link.target)) continue;
        
        const newPath = [...path, link.target];
        
        // Check if this leads to target topic
        const targetData = this.palaceIndex.get(link.target);
        if (targetData && this.calculateTopicRelevance(targetData, toTopic) > 0.7) {
          return newPath.map(key => {
            const data = this.palaceIndex.get(key);
            return {
              palace: data.palace,
              locus: data.locus,
              subject: data.memory.subject
            };
          });
        }
        
        visited.add(link.target);
        queue.push(newPath);
      }
    }
    
    return null;
  }
}

// Demo
async function demo() {
  const linker = new CrossPalaceLinker({
    palacesPath: './skills/memory-palace/palaces'
  });
  
  await linker.initialize();
  
  // Example: Find related memories
  console.log('\n🔍 Cross-Palace Discovery Demo');
  console.log('=' .repeat(60));
  
  const related = linker.getRelatedMemories('System Design Citadel', 'sd-014', 3);
  console.log('\nMemories related to "Cache-Aside Pattern":');
  related.forEach(r => {
    console.log(`  → ${r.palace} > ${r.locus}: ${r.subject} (${(r.similarity * 100).toFixed(0)}% match)`);
  });
  
  // Suggest navigation
  const suggestions = linker.suggestNavigation('System Design Citadel', 'security');
  console.log('\n🧭 Navigation suggestions for "security":');
  suggestions.forEach(s => {
    console.log(`  → ${s.palace} > ${s.locus}: ${s.memory.subject}`);
  });
  
  // Export graph
  const graph = linker.exportGraph();
  console.log(`\n📊 Link Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  
  await fs.writeFile('cross-palace-graph.json', JSON.stringify(graph, null, 2));
  console.log('💾 Graph exported to cross-palace-graph.json');
}

if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { CrossPalaceLinker };
