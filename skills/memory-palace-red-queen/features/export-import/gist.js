// GitHub Gist Integration for Memory Palace
// Export/Import palaces via GitHub Gists for easy sharing

const fs = require('fs').promises;
const https = require('https');

class GistIntegration {
  constructor(token = null) {
    this.token = token || process.env.GITHUB_TOKEN;
    this.baseUrl = 'api.github.com';
  }

  /**
   * Export palace to a new GitHub Gist
   */
  async exportToGist(palace, options = {}) {
    if (!this.token) {
      throw new Error('GitHub token required. Set GITHUB_TOKEN env variable or pass token.');
    }

    const { public: isPublic = false, description } = options;
    
    // Prepare gist content
    const files = {
      [`${palace.name}.json`]: {
        content: JSON.stringify(palace, null, 2)
      }
    };

    // Add Markdown version for readability
    files[`${palace.name}.md`] = {
      content: this.convertToMarkdown(palace)
    };

    // Add metadata file
    files['palace-info.json'] = {
      content: JSON.stringify({
        name: palace.name,
        theme: palace.theme,
        lociCount: palace.loci?.length || 0,
        memoryCount: this.countMemories(palace),
        exportedAt: new Date().toISOString(),
        format: 'memory-palace-v1'
      }, null, 2)
    };

    const payload = {
      description: description || `Memory Palace: ${palace.name}`,
      public: isPublic,
      files
    };

    const response = await this.makeRequest('/gists', 'POST', payload);
    
    return {
      success: true,
      gistId: response.id,
      gistUrl: response.html_url,
      rawUrl: response.files[`${palace.name}.json`].raw_url,
      isPublic,
      files: Object.keys(files)
    };
  }

  /**
   * Import palace from a GitHub Gist
   */
  async importFromGist(gistIdOrUrl) {
    const gistId = this.extractGistId(gistIdOrUrl);
    
    const response = await this.makeRequest(`/gists/${gistId}`, 'GET');
    
    // Find palace JSON file
    let palaceFile = null;
    let metadataFile = null;
    
    for (const [filename, file] of Object.entries(response.files)) {
      if (filename.endsWith('.json') && filename !== 'palace-info.json') {
        palaceFile = file;
      } else if (filename === 'palace-info.json') {
        metadataFile = file;
      }
    }

    if (!palaceFile) {
      throw new Error('No palace JSON file found in gist');
    }

    // Fetch raw content
    const palaceContent = await this.fetchRawContent(palaceFile.raw_url);
    const palace = JSON.parse(palaceContent);

    let metadata = null;
    if (metadataFile) {
      const metadataContent = await this.fetchRawContent(metadataFile.raw_url);
      metadata = JSON.parse(metadataContent);
    }

    return {
      success: true,
      palace,
      metadata,
      gistId,
      gistUrl: response.html_url,
      owner: response.owner?.login || 'anonymous',
      createdAt: response.created_at
    };
  }

  /**
   * Update existing gist with new palace version
   */
  async updateGist(gistId, palace) {
    if (!this.token) {
      throw new Error('GitHub token required');
    }

    const files = {
      [`${palace.name}.json`]: {
        content: JSON.stringify(palace, null, 2)
      },
      [`${palace.name}.md`]: {
        content: this.convertToMarkdown(palace)
      }
    };

    const payload = { files };
    const response = await this.makeRequest(`/gists/${gistId}`, 'PATCH', payload);

    return {
      success: true,
      gistId: response.id,
      gistUrl: response.html_url,
      updatedAt: response.updated_at
    };
  }

  /**
   * List all gists containing memory palaces
   */
  async listPalaceGists(username = null) {
    const endpoint = username ? `/users/${username}/gists` : '/gists';
    const response = await this.makeRequest(endpoint, 'GET');

    // Filter gists that contain palace files
    const palaceGists = response.filter(gist => {
      return Object.keys(gist.files).some(filename => 
        filename.endsWith('.json') || filename === 'palace-info.json'
      );
    });

    return palaceGists.map(gist => ({
      id: gist.id,
      description: gist.description,
      url: gist.html_url,
      files: Object.keys(gist.files),
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      public: gist.public
    }));
  }

  /**
   * Delete a gist
   */
  async deleteGist(gistId) {
    if (!this.token) {
      throw new Error('GitHub token required');
    }

    await this.makeRequest(`/gists/${gistId}`, 'DELETE');
    return { success: true, gistId };
  }

  /**
   * Convert palace to Markdown for gist
   */
  convertToMarkdown(palace) {
    let md = `# 🏛️ ${palace.name}\n\n`;
    md += `**Theme:** ${palace.theme || 'None'}  \n`;
    md += `**Created:** ${palace.created || 'Unknown'}  \n`;
    md += `**Loci:** ${palace.loci?.length || 0}  \n`;
    md += `**Memories:** ${this.countMemories(palace)}  \n\n`;
    md += `---\n\n`;
    md += `*Exported from Memory Palace Skill*\n\n`;
    
    palace.loci?.forEach((locus, i) => {
      md += `## ${i + 1}. ${locus.name}\n\n`;
      md += `**Anchor:** ${locus.anchor || 'None'}  \n\n`;
      
      if (locus.memories?.length > 0) {
        md += `### Memories\n\n`;
        locus.memories.forEach((memory, j) => {
          md += `**${j + 1}. ${memory.subject}**\n\n`;
          
          if (memory.image) {
            md += `*Image:* ${memory.image}\n\n`;
          }
          
          if (memory.content) {
            md += `${memory.content}\n\n`;
          }
          
          if (memory.confidence) {
            const stars = '⭐'.repeat(memory.confidence);
            md += `Confidence: ${stars}\n\n`;
          }
          
          md += `---\n\n`;
        });
      }
      
      md += '\n';
    });

    md += `---\n\n`;
    md += `*This palace was shared via [Memory Palace](https://github.com/memory-palace)*\n`;
    
    return md;
  }

  /**
   * Count total memories in palace
   */
  countMemories(palace) {
    return palace.loci?.reduce((count, locus) => 
      count + (locus.memories?.length || 0), 0
    ) || 0;
  }

  /**
   * Extract gist ID from URL or return as-is
   */
  extractGistId(input) {
    // Handle full URL: https://gist.github.com/username/abc123
    const urlMatch = input.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/);
    if (urlMatch) return urlMatch[1];
    
    // Handle just the ID
    if (/^[a-f0-9]+$/.test(input)) return input;
    
    throw new Error('Invalid Gist ID or URL');
  }

  /**
   * Make GitHub API request
   */
  makeRequest(endpoint, method, payload = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: endpoint,
        method,
        headers: {
          'User-Agent': 'memory-palace-skill',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      if (this.token) {
        options.headers['Authorization'] = `token ${this.token}`;
      }

      if (payload) {
        options.headers['Content-Type'] = 'application/json';
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : {});
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (payload) {
        req.write(JSON.stringify(payload));
      }

      req.end();
    });
  }

  /**
   * Fetch raw content from URL
   */
  fetchRawContent(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
}

// CLI Interface
async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const gist = new GistIntegration();

  switch (command) {
    case 'export': {
      const palacePath = args[1];
      const palaceData = await fs.readFile(palacePath, 'utf8');
      const palace = JSON.parse(palaceData);
      
      console.log(`📤 Exporting "${palace.name}" to Gist...`);
      const result = await gist.exportToGist(palace, { public: args.includes('--public') });
      
      console.log('✅ Export successful!');
      console.log(`   Gist ID: ${result.gistId}`);
      console.log(`   URL: ${result.gistUrl}`);
      console.log(`   Files: ${result.files.join(', ')}`);
      break;
    }

    case 'import': {
      const gistId = args[1];
      console.log(`📥 Importing from Gist ${gistId}...`);
      
      const result = await gist.importFromGist(gistId);
      
      console.log('✅ Import successful!');
      console.log(`   Palace: ${result.palace.name}`);
      console.log(`   Loci: ${result.palace.loci?.length || 0}`);
      console.log(`   Memories: ${gist.countMemories(result.palace)}`);
      console.log(`   URL: ${result.gistUrl}`);
      
      // Save to file
      const outputPath = `${result.palace.name}.json`;
      await fs.writeFile(outputPath, JSON.stringify(result.palace, null, 2));
      console.log(`   Saved to: ${outputPath}`);
      break;
    }

    case 'list': {
      const username = args[1];
      console.log(`📋 Listing Memory Palace Gists${username ? ` for ${username}` : ''}...`);
      
      const gists = await gist.listPalaceGists(username);
      
      console.log(`\nFound ${gists.length} palace gists:\n`);
      gists.forEach((g, i) => {
        console.log(`${i + 1}. ${g.description || 'Untitled'}`);
        console.log(`   ID: ${g.id}`);
        console.log(`   URL: ${g.url}`);
        console.log(`   Files: ${g.files.join(', ')}`);
        console.log(`   ${g.public ? '🌐 Public' : '🔒 Private'} | Updated: ${new Date(g.updatedAt).toLocaleDateString()}`);
        console.log();
      });
      break;
    }

    default:
      console.log('Memory Palace - GitHub Gist Integration\n');
      console.log('Usage:');
      console.log('  node gist.js export <palace.json> [--public]');
      console.log('  node gist.js import <gist-id-or-url>');
      console.log('  node gist.js list [username]');
      console.log('\nEnvironment:');
      console.log('  GITHUB_TOKEN - Required for export/private gists');
  }
}

// Demo
async function demo() {
  console.log('🔗 GitHub Gist Integration Demo');
  console.log('=' .repeat(60));
  
  const samplePalace = {
    name: 'Demo-Sharable-Palace',
    theme: 'Gist Demo',
    created: new Date().toISOString(),
    loci: [{
      id: 'locus-1',
      name: 'Demo Locus',
      anchor: 'A visual anchor',
      memories: [{
        id: 'mem-1',
        subject: 'Demo Memory',
        content: 'This is a demo palace for Gist sharing.',
        image: 'A vivid demo image',
        confidence: 4,
        created: new Date().toISOString()
      }]
    }]
  };

  const gist = new GistIntegration();
  
  // Show Markdown conversion
  console.log('\n📝 Markdown Conversion Preview:');
  console.log('-'.repeat(60));
  const md = gist.convertToMarkdown(samplePalace);
  console.log(md.substring(0, 500) + '...');
  
  // Count memories
  console.log('\n📊 Palace Stats:');
  console.log(`  Loci: ${samplePalace.loci.length}`);
  console.log(`  Memories: ${gist.countMemories(samplePalace)}`);
  
  console.log('\n✅ Gist integration ready!');
  console.log('   Set GITHUB_TOKEN to enable export/import');
}

if (require.main === module) {
  if (process.argv.length > 2) {
    runCLI().catch(console.error);
  } else {
    demo();
  }
}

module.exports = { GistIntegration };
