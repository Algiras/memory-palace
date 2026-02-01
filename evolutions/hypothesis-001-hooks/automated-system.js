// Hook System Implementation - Automated
// File: hooks/automated-system.js

class HookOrchestrator {
  constructor(config) {
    this.config = config;
    this.budget = new InterruptionBudget();
    this.palace = null;
    this.context = null;
    this.sessionStartTime = new Date();
  }

  async initialize() {
    this.context = await detectContext();
    this.palace = await loadActivePalace(this.context);
    this.budget.reset();
    
    // Fire session start hook
    this.onSessionStart();
  }

  async processMessage(message, metadata = {}) {
    const results = {
      hookTriggered: false,
      action: null,
      confidence: 0
    };

    if (!this.budget.canInterrupt()) {
      return results;
    }

    // Test hook: on_topic_mentioned
    const topicMentioned = this.detectTopicMentioned(message);
    if (topicMentioned.length > 0 && topicMentioned[0].confidence > 0.7) {
      results.hookTriggered = true;
      results.action = 'offer_recall';
      results.confidence = topicMentioned[0].confidence;
      results.topic = topicMentioned[0].memory.subject;
      
      this.offerRecall(topicMentioned[0].memory);
      this.budget.recordInterruption();
      return results;
    }

    // Test hook: on_learning_detected
    if (metadata.isLearningMode || this.detectLearningIntent(message)) {
      const extractedTopic = this.extractTopic(message);
      if (extractedTopic && !this.recentlyStored(extractedTopic)) {
        results.hookTriggered = true;
        results.action = 'offer_store';
        results.topic = extractedTopic;
        
        this.offerStore(extractedTopic);
        this.budget.recordInterruption();
        return results;
      }
    }

    return results;
  }

  detectTopicMentioned(text) {
    if (!this.palace || !this.palace.loci) return [];
    
    const allMemories = this.palace.loci.flatMap(l => l.memories || []);
    const matches = [];

    allMemories.forEach(memory => {
      const subject = memory.subject.toLowerCase();
      const keywords = subject.split(/\s+/).filter(w => w.length > 3);
      const contentWords = (memory.content || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
      
      let matchScore = 0;
      let matchedWords = 0;
      
      // Check subject keywords
      keywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          matchScore += 0.3;
          matchedWords++;
        }
      });
      
      // Check content keywords (weighted less)
      contentWords.slice(0, 5).forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          matchScore += 0.1;
        }
      });
      
      // Boost if multiple keywords match
      if (matchedWords >= 2) matchScore += 0.2;
      
      // Reduce score if recently recalled
      if (memory.lastRecalled) {
        const daysSince = (new Date() - new Date(memory.lastRecalled)) / (1000 * 60 * 60 * 24);
        if (daysSince < 1) matchScore *= 0.3;
        else if (daysSince < 3) matchScore *= 0.7;
      }
      
      if (matchScore > 0.5) {
        matches.push({ memory, confidence: Math.min(matchScore, 1.0) });
      }
    });

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  detectLearningIntent(text) {
    const learningPatterns = [
      /\b(how\s+(do|does|can|to))\b/i,
      /\b(what\s+is)\b/i,
      /\b(explain|describe|clarify)\b/i,
      /\b(learn\s+about|study|understand)\b/i,
      /\b(teach\s+me|show\s+me)\b/i,
      /\b(documentation|tutorial|guide|reference)\b/i,
      /\b(best\s+practice|how\s+to|pattern|approach)\b/i,
      /\b(what's\s+the|how\s+does.*work)\b/i
    ];
    
    const isQuestion = text.includes('?');
    const matchesPattern = learningPatterns.some(p => p.test(text));
    const hasTechnicalTerms = /\b(api|function|class|method|database|cache|server|client|async|algorithm|data\s+structure)\b/i.test(text);
    const isDetailed = text.length > 100;
    
    // Learning intent if: question + pattern, OR pattern + technical, OR detailed + pattern
    return (isQuestion && matchesPattern) || 
           (matchesPattern && hasTechnicalTerms) ||
           (isDetailed && matchesPattern && text.split(' ').length > 15);
  }

  extractTopic(text) {
    // Extract potential topic from learning text
    // Look for quoted strings, capitalized phrases, or technical terms
    const quoted = text.match(/"([^"]+)"/);
    if (quoted) return quoted[1];
    
    const capitalizedPhrase = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/);
    if (capitalizedPhrase && capitalizedPhrase[1].length > 3) {
      return capitalizedPhrase[1];
    }
    
    const techTerms = text.match(/\b([a-z]+(?:-[a-z]+)?)\s+(?:pattern|system|architecture|design|algorithm)\b/i);
    if (techTerms) return techTerms[0];
    
    // Fallback: first 3 significant words after "how to" or "what is"
    const howToMatch = text.match(/how\s+(?:to|do|does)\s+(\w+(?:\s+\w+){0,2})/i);
    if (howToMatch) return howToMatch[1];
    
    const whatIsMatch = text.match(/what\s+(?:is|are)\s+(\w+(?:\s+\w+){0,2})/i);
    if (whatIsMatch) return whatIsMatch[1];
    
    return null;
  }

  onSessionStart() {
    const journal = loadLearningJournal(this.context);
    const dueMemories = journal.filter(m => {
      const nextReview = calculateNextReview(m);
      return nextReview <= new Date();
    });
    
    if (dueMemories.length > 0 && this.budget.canInterrupt()) {
      this.suggestReview(dueMemories);
      this.budget.recordInterruption();
    }
  }

  offerRecall(memory) {
    return {
      type: 'suggestion',
      title: `💡 Topic: "${memory.subject}"`,
      message: `You mentioned a topic you have memories about.`,
      actions: [
        { label: '🧠 Recall now', command: `/memory-palace recall "${memory.subject}"` },
        { label: '✓ Got it', command: null },
        { label: '⊘ Don\'t ask again', command: `ignore:${memory.id}` }
      ],
      autoDismiss: 30000
    };
  }

  offerStore(topic) {
    return {
      type: 'suggestion',
      title: '📝 Learning detected',
      message: `Store "${topic}" in your memory palace?`,
      actions: [
        { label: '💾 Store now', command: `/memory-palace store "${topic}"` },
        { label: '✓ Already stored', command: null },
        { label: '⊘ Not now', command: null }
      ],
      autoDismiss: 20000
    };
  }

  suggestReview(memories) {
    const weak = memories.filter(m => (m.confidence || 3) < 3);
    const regular = memories.filter(m => (m.confidence || 3) >= 3);
    
    return {
      type: 'reminder',
      title: '⏰ Review Due',
      message: `${memories.length} memories ready for review${weak.length > 0 ? ` (${weak.length} weak spots)` : ''}`,
      actions: [
        { label: '🔴 Review weak spots', command: '/memory-palace red-queen weak-spots' },
        { label: '📚 Quick review', command: '/memory-palace recall' },
        { label: '⏰ Snooze 1h', command: 'snooze:3600' },
        { label: '✓ Dismiss', command: null }
      ],
      autoDismiss: 60000
    };
  }

  recentlyStored(topic) {
    // Check if we recently offered to store this topic
    const recent = this.config.recentOffers || [];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return recent.some(r => 
      r.topic === topic && 
      new Date(r.timestamp) > fiveMinutesAgo
    );
  }
}

class InterruptionBudget {
  constructor(maxPerSession = 3, cooldownMinutes = 15) {
    this.maxPerSession = maxPerSession;
    this.cooldownMinutes = cooldownMinutes;
    this.used = 0;
    this.lastInterruption = null;
    this.sessionStart = new Date();
  }

  reset() {
    this.used = 0;
    this.lastInterruption = null;
    this.sessionStart = new Date();
  }

  canInterrupt() {
    // Check session timeout (reset after 2 hours)
    const sessionHours = (new Date() - this.sessionStart) / (1000 * 60 * 60);
    if (sessionHours > 2) {
      this.reset();
    }
    
    if (this.used >= this.maxPerSession) return false;
    
    if (this.lastInterruption) {
      const minutesSince = (new Date() - this.lastInterruption) / (1000 * 60);
      if (minutesSince < this.cooldownMinutes) return false;
    }
    
    return true;
  }

  recordInterruption() {
    this.used++;
    this.lastInterruption = new Date();
  }

  getStatus() {
    return {
      remaining: this.maxPerSession - this.used,
      used: this.used,
      max: this.maxPerSession,
      lastInterruption: this.lastInterruption,
      canInterrupt: this.canInterrupt()
    };
  }
}

// Helper functions
async function detectContext() {
  // Implementation from commands/context.md
  const { execSync } = require('child_process');
  try {
    const gitRemote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' });
    if (gitRemote) {
      return { type: 'project', id: hashString(gitRemote.trim()) };
    }
  } catch (e) {
    // Not in git repo
  }
  return { type: 'global' };
}

function hashString(str) {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(str)
    .digest('base64')
    .substring(0, 8);
}

async function loadActivePalace(context) {
  const fs = require('fs').promises;
  const path = context.type === 'project' 
    ? `~/memory/project/${context.id}/`
    : `~/memory/global/`;
  
  const configPath = `${path}config.json`;
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const activePalace = config.activePalace;
  
  if (!activePalace) return null;
  
  const palacePath = `${path}${activePalace}.json`;
  return JSON.parse(await fs.readFile(palacePath, 'utf8'));
}

function loadLearningJournal(context) {
  // Implementation from storage system
  const path = context.type === 'project'
    ? `~/memory/project/${context.id}/learning-journal.json`
    : `~/memory/global/learning-journal.json`;
  
  try {
    return require(path).memories || [];
  } catch (e) {
    return [];
  }
}

function calculateNextReview(memory) {
  const intervals = [1, 3, 7, 14, 30, 60]; // days
  const recallCount = memory.recallCount || 0;
  const level = Math.min(recallCount, intervals.length - 1);
  const days = intervals[level];
  
  const lastRecalled = memory.lastRecalled ? new Date(memory.lastRecalled) : new Date(memory.created);
  const nextReview = new Date(lastRecalled);
  nextReview.setDate(nextReview.getDate() + days);
  
  return nextReview;
}

module.exports = {
  HookOrchestrator,
  InterruptionBudget
};
