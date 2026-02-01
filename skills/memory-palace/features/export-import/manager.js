// Export/Import System
// Supports multiple formats: JSON, Markdown, Anki, CSV

const fs = require('fs').promises;
const path = require('path');

class PalaceExporter {
  /**
   * Export palace to JSON (native format)
   */
  static async exportJSON(palace, outputPath) {
    const data = JSON.stringify(palace, null, 2);
    await fs.writeFile(outputPath, data);
    return { format: 'json', path: outputPath, size: data.length };
  }

  /**
   * Export palace to Markdown (human-readable)
   */
  static async exportMarkdown(palace, outputPath) {
    let md = `# ${palace.name}\n\n`;
    md += `**Theme:** ${palace.theme || 'None'}\n\n`;
    md += `**Created:** ${palace.created || 'Unknown'}\n\n`;
    md += `---\n\n`;
    
    palace.loci.forEach(locus => {
      md += `## ${locus.name}\n\n`;
      md += `**Anchor:** ${locus.anchor || 'None'}\n\n`;
      
      if (locus.memories && locus.memories.length > 0) {
        md += `### Memories\n\n`;
        locus.memories.forEach(memory => {
          md += `#### ${memory.subject}\n\n`;
          md += `**Image:** ${memory.image || 'None'}\n\n`;
          md += `${memory.content || ''}\n\n`;
          
          if (memory.confidence) {
            md += `*Confidence: ${memory.confidence}/5*\n\n`;
          }
          
          md += `---\n\n`;
        });
      }
      
      md += '\n';
    });
    
    await fs.writeFile(outputPath, md);
    return { format: 'markdown', path: outputPath, size: md.length };
  }

  /**
   * Export to Anki deck format (CSV for import)
   */
  static async exportAnki(palace, outputPath) {
    // Anki expects: Front,Back,Tags
    let csv = 'Front,Back,Tags\n';
    
    palace.loci.forEach(locus => {
      (locus.memories || []).forEach(memory => {
        const front = this.escapeCSV(memory.subject);
        const back = this.escapeCSV(`${memory.image || ''}\n\n${memory.content || ''}`);
        const tags = this.escapeCSV(`memory-palace::${palace.name.replace(/\s+/g, '_')}`);
        
        csv += `${front},${back},${tags}\n`;
      });
    });
    
    await fs.writeFile(outputPath, csv);
    return { format: 'anki', path: outputPath, size: csv.length };
  }

  /**
   * Export to plain text (simple list)
   */
  static async exportText(palace, outputPath) {
    let text = `${palace.name}\n`;
    text += '=' .repeat(palace.name.length) + '\n\n';
    
    palace.loci.forEach(locus => {
      text += `\n${locus.name}\n`;
      text += '-'.repeat(locus.name.length) + '\n';
      
      (locus.memories || []).forEach((memory, i) => {
        text += `\n${i + 1}. ${memory.subject}\n`;
        text += `   ${memory.content?.substring(0, 100) || 'No content'}...\n`;
      });
    });
    
    await fs.writeFile(outputPath, text);
    return { format: 'text', path: outputPath, size: text.length };
  }

  /**
   * Escape CSV field
   */
  static escapeCSV(field) {
    if (!field) return '';
    // Escape quotes and wrap in quotes if contains comma
    let escaped = field.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      escaped = `"${escaped}"`;
    }
    return escaped;
  }
}

class PalaceImporter {
  /**
   * Import from JSON
   */
  static async importJSON(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Import from Anki CSV export
   */
  static async importAnki(filePath, palaceName = 'Imported Anki Deck') {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split('\n').slice(1); // Skip header
    
    const palace = {
      name: palaceName,
      theme: 'Imported Deck',
      created: new Date().toISOString(),
      loci: [{
        id: 'imported',
        name: 'Imported Cards',
        memories: []
      }]
    };
    
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      
      // Parse CSV (simple)
      const parts = line.split(',');
      if (parts.length >= 2) {
        palace.loci[0].memories.push({
          id: `imported-${i}`,
          subject: parts[0].replace(/"/g, ''),
          content: parts[1].replace(/"/g, ''),
          created: new Date().toISOString(),
          confidence: 3
        });
      }
    });
    
    return palace;
  }

  /**
   * Import from Markdown (simplified)
   */
  static async importMarkdown(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split('\n');
    
    const palace = {
      name: 'Imported Palace',
      loci: []
    };
    
    let currentLocus = null;
    let currentMemory = null;
    
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        palace.name = line.substring(2);
      } else if (line.startsWith('## ')) {
        if (currentLocus) palace.loci.push(currentLocus);
        currentLocus = {
          id: `locus-${palace.loci.length}`,
          name: line.substring(3),
          memories: []
        };
      } else if (line.startsWith('#### ')) {
        if (currentMemory && currentLocus) {
          currentLocus.memories.push(currentMemory);
        }
        currentMemory = {
          id: `mem-${currentLocus?.memories.length || 0}`,
          subject: line.substring(5),
          created: new Date().toISOString(),
          confidence: 3
        };
      } else if (currentMemory && line.startsWith('**Image:**')) {
        currentMemory.image = line.substring(10).trim();
      } else if (currentMemory && !line.startsWith('**') && !line.startsWith('---')) {
        currentMemory.content = (currentMemory.content || '') + line + '\n';
      }
    });
    
    if (currentMemory && currentLocus) currentLocus.memories.push(currentMemory);
    if (currentLocus) palace.loci.push(currentLocus);
    
    return palace;
  }
}

// Export/Import Manager
class PalaceMigration {
  constructor(sourcePath, outputDir) {
    this.sourcePath = sourcePath;
    this.outputDir = outputDir;
  }

  /**
   * Export palace to all formats
   */
  async exportAll(palaceName) {
    const palacePath = path.join(this.sourcePath, `${palaceName}.json`);
    const palace = await PalaceImporter.importJSON(palacePath);
    
    const results = [];
    
    // Export to all formats
    results.push(await PalaceExporter.exportJSON(
      palace, 
      path.join(this.outputDir, `${palaceName}-export.json`)
    ));
    
    results.push(await PalaceExporter.exportMarkdown(
      palace,
      path.join(this.outputDir, `${palaceName}.md`)
    ));
    
    results.push(await PalaceExporter.exportAnki(
      palace,
      path.join(this.outputDir, `${palaceName}-anki.csv`)
    ));
    
    results.push(await PalaceExporter.exportText(
      palace,
      path.join(this.outputDir, `${palaceName}.txt`)
    ));
    
    return results;
  }

  /**
   * Create backup of all palaces
   */
  async backupAll() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.outputDir, `backup-${timestamp}`);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    const files = await fs.readdir(this.sourcePath);
    const palaceFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of palaceFiles) {
      const src = path.join(this.sourcePath, file);
      const dest = path.join(backupDir, file);
      await fs.copyFile(src, dest);
    }
    
    return {
      backupDir,
      files: palaceFiles.length,
      timestamp
    };
  }
}

// Demo
async function demo() {
  console.log('📦 Export/Import Demo');
  console.log('=' .repeat(60));
  
  // Create sample palace
  const samplePalace = {
    name: 'Sample Palace',
    theme: 'Test',
    created: new Date().toISOString(),
    loci: [{
      id: 'locus-1',
      name: 'Test Locus',
      anchor: 'A test anchor',
      memories: [{
        id: 'mem-1',
        subject: 'Test Memory',
        content: 'This is test content for the export demo.',
        image: 'A test image description',
        confidence: 4,
        created: new Date().toISOString()
      }]
    }]
  };
  
  const outputDir = './exports';
  await fs.mkdir(outputDir, { recursive: true });
  
  // Export to all formats
  console.log('\n📝 Exporting to all formats...');
  
  const json = await PalaceExporter.exportJSON(samplePalace, path.join(outputDir, 'sample.json'));
  console.log(`  JSON: ${json.size} bytes`);
  
  const md = await PalaceExporter.exportMarkdown(samplePalace, path.join(outputDir, 'sample.md'));
  console.log(`  Markdown: ${md.size} bytes`);
  
  const anki = await PalaceExporter.exportAnki(samplePalace, path.join(outputDir, 'sample-anki.csv'));
  console.log(`  Anki CSV: ${anki.size} bytes`);
  
  const text = await PalaceExporter.exportText(samplePalace, path.join(outputDir, 'sample.txt'));
  console.log(`  Text: ${text.size} bytes`);
  
  // Re-import JSON
  console.log('\n📥 Re-importing JSON...');
  const imported = await PalaceImporter.importJSON(path.join(outputDir, 'sample.json'));
  console.log(`  Imported: ${imported.name} with ${imported.loci.length} loci`);
  
  console.log('\n✅ Export/Import demo complete');
  console.log(`   Files saved to: ${outputDir}/`);
}

if (require.main === module) {
  demo().catch(console.error);
}

// Include Gist integration
const { GistIntegration } = require('./gist');

module.exports = {
  PalaceExporter,
  PalaceImporter,
  PalaceMigration,
  GistIntegration
};
