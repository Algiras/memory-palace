#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'memory-palace-red-queen';
const CLAUDE_SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills', SKILL_NAME);
const MEMORY_DIR = path.join(os.homedir(), 'memory');
const GLOBAL_MEMORY_DIR = path.join(MEMORY_DIR, 'global');
const PROJECT_MEMORY_DIR = path.join(MEMORY_DIR, 'project');

const args = process.argv.slice(2);
const command = args[0] || 'install';
const silent = args.includes('--silent') || args.includes('-s');

function log(msg) {
  if (!silent) console.log(msg);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function install() {
  log('');
  log('🏛️  Memory Palace + Red Queen');
  log('   Installing Claude Code skill...');
  log('');

  // Find skill source directory
  const skillSrc = path.join(__dirname, '..', 'skills', SKILL_NAME);

  if (!fs.existsSync(skillSrc)) {
    console.error('❌ Skill source not found. Please reinstall the package.');
    process.exit(1);
  }

  // Create directories
  fs.mkdirSync(CLAUDE_SKILLS_DIR, { recursive: true });
  fs.mkdirSync(GLOBAL_MEMORY_DIR, { recursive: true });
  fs.mkdirSync(PROJECT_MEMORY_DIR, { recursive: true });

  // Copy skill files
  copyRecursive(skillSrc, CLAUDE_SKILLS_DIR);

  log(`   ✓ Skill installed to: ~/.claude/skills/${SKILL_NAME}/`);
  log(`   ✓ Storage created at: ~/memory/`);
  log('');
  log('   🎉 Installation complete!');
  log('');
  log('   Get started:');
  log('   /memory-palace create "My Palace" "Ancient Library"');
  log('   /memory-palace store "topic"');
  log('   /memory-palace recall');
  log('   /memory-palace red-queen');
  log('');
  log('   📖 Docs: https://algiras.github.io/memory-palace/');
  log('');
}

function uninstall() {
  log('');
  log('🏛️  Memory Palace + Red Queen');
  log('   Uninstalling...');
  log('');

  if (fs.existsSync(CLAUDE_SKILLS_DIR)) {
    fs.rmSync(CLAUDE_SKILLS_DIR, { recursive: true });
    log(`   ✓ Removed: ~/.claude/skills/${SKILL_NAME}/`);
  } else {
    log('   ⚠ Skill not found (already uninstalled?)');
  }

  log('');
  log('   Note: Your memories at ~/memory/ were NOT deleted.');
  log('   Delete manually if needed: rm -rf ~/memory/');
  log('');
}

function status() {
  log('');
  log('🏛️  Memory Palace + Red Queen - Status');
  log('');

  const skillInstalled = fs.existsSync(CLAUDE_SKILLS_DIR);
  const memoryExists = fs.existsSync(MEMORY_DIR);

  log(`   Skill: ${skillInstalled ? '✓ Installed' : '✗ Not installed'}`);
  log(`   Path:  ~/.claude/skills/${SKILL_NAME}/`);
  log('');
  log(`   Storage: ${memoryExists ? '✓ Exists' : '✗ Not found'}`);
  log(`   Path:    ~/memory/`);

  if (memoryExists) {
    const globalPalaces = fs.existsSync(GLOBAL_MEMORY_DIR)
      ? fs.readdirSync(GLOBAL_MEMORY_DIR).filter(f => f.endsWith('.json') && f !== 'palace-registry.json').length
      : 0;
    log(`   Palaces: ${globalPalaces} global`);
  }

  log('');
}

function help() {
  console.log(`
🏛️  Memory Palace + Red Queen

Usage: memory-palace-red-queen <command>

Commands:
  install     Install the Claude Code skill (default)
  uninstall   Remove the skill (keeps memories)
  status      Check installation status
  help        Show this help message

Examples:
  npx memory-palace-red-queen install
  npx memory-palace-red-queen status

After installation, use in Claude Code:
  /memory-palace create "My Palace"
  /memory-palace store "topic"
  /memory-palace recall
  /memory-palace red-queen

Documentation: https://algiras.github.io/memory-palace/
GitHub: https://github.com/Algiras/memory-palace
`);
}

// Run command
switch (command) {
  case 'install':
    install();
    break;
  case 'uninstall':
  case 'remove':
    uninstall();
    break;
  case 'status':
    status();
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    help();
    process.exit(1);
}
