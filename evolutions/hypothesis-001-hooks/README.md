# Hypothesis 001: Hook System vs Manual Triggers

## The Question

**Does automated contextual triggering improve memory retention by 40% compared to manual triggers?**

---

## Implementation A: Automated Hooks

### Hook System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOOK ORCHESTRATOR                         │
│              (monitors conversation stream)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TOPIC_DETECT │ │ LEARN_DETECT │ │ SESSION_START│
│   -keyword   │ │  -pattern    │ │   -timer     │
│   matching   │ │  recognition │ │   -schedule  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    TRIGGER DECISION                      │
│              (should we interrupt user?)                 │
│  Rules:                                                  │
│  - Don't interrupt if user is focused                    │
│  - Don't suggest if already reviewed today               │
│  - Priority: weak-spots > new-topic > review            │
│  - Max 3 interruptions per session                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    ACTION EXECUTION                      │
│  • offer_recall(topic)                                   │
│  • offer_store(topic)                                    │
│  • suggest_review(memories)                              │
└─────────────────────────────────────────────────────────┘
```

### Hook: on_topic_mentioned

**Trigger Condition**:
```javascript
function detectTopicMentioned(text, palace) {
  const memories = palace.getAllMemories();
  const keywords = memories.map(m => m.subject.toLowerCase().split(' '));
  
  const mentioned = memories.filter(memory => {
    const subjectWords = memory.subject.toLowerCase().split(' ');
    return subjectWords.some(word => 
      text.toLowerCase().includes(word) && word.length > 3
    );
  });
  
  return mentioned.filter(m => 
    !m.lastRecalled || 
    daysSince(m.lastRecalled) > 1
  );
}
```

**Action**:
```javascript
function offerRecall(topic, confidence) {
  if (confidence > 0.7 && interruptionBudget > 0) {
    showNotification({
      type: 'suggestion',
      message: `💡 You mentioned "${topic}". You have memories stored about this.`,
      actions: [
        { label: 'Recall now', command: `/memory-palace recall "${topic}"` },
        { label: 'Dismiss', command: null }
      ],
      autoDismiss: 30000 // 30 seconds
    });
    interruptionBudget--;
  }
}
```

### Hook: on_learning_detected

**Trigger Condition**:
```javascript
function detectLearningIntent(text) {
  const learningPatterns = [
    /how (do|does|can|to)/i,
    /what is/i,
    /explain/i,
    /learn about/i,
    /teach me/i,
    /understand/i,
    /documentation/i,
    /tutorial/i,
    /guide/i,
    /best practice/i
  ];
  
  const isQuestion = text.includes('?');
  const matchesPattern = learningPatterns.some(p => p.test(text));
  const isLongExplanation = text.length > 200;
  
  return (isQuestion && matchesPattern) || 
         (matchesPattern && isLongExplanation);
}
```

**Action**:
```javascript
function offerStore(context) {
  if (interruptionBudget > 0 && !context.recentlyStored) {
    showNotification({
      type: 'suggestion',
      message: `📝 Learning something new? Store this in your memory palace for later.`,
      actions: [
        { label: 'Store memory', command: `/memory-palace store "${extractTopic(context)}"` },
        { label: 'Not now', command: null }
      ]
    });
  }
}
```

### Hook: on_session_start

**Trigger Condition**:
```javascript
function checkSpacedRepetition(config) {
  const journal = loadLearningJournal();
  const dueMemories = journal.memories.filter(m => {
    const nextReview = calculateNextReview(m);
    return nextReview <= new Date();
  });
  
  return dueMemories.length > 0 ? dueMemories : null;
}
```

**Action**:
```javascript
function suggestReview(memories) {
  const priority = memories.filter(m => m.confidence < 3);
  const regular = memories.filter(m => m.confidence >= 3);
  
  showNotification({
    type: 'reminder',
    message: `⏰ ${memories.length} memories due for review (${priority.length} high priority)`,
    actions: [
      { label: 'Review weak spots', command: `/memory-palace red-queen weak-spots` },
      { label: 'Quick review', command: `/memory-palace recall` },
      { label: 'Later', command: 'snooze:1hour' }
    ]
  });
}
```

### Interruption Budget System

```javascript
class InterruptionBudget {
  constructor() {
    this.maxPerSession = 3;
    this.used = 0;
    this.cooldownMinutes = 15;
    this.lastInterruption = null;
  }
  
  canInterrupt() {
    if (this.used >= this.maxPerSession) return false;
    if (this.lastInterruption && 
        minutesSince(this.lastInterruption) < this.cooldownMinutes) {
      return false;
    }
    return true;
  }
  
  recordInterruption() {
    this.used++;
    this.lastInterruption = new Date();
  }
  
  reset() {
    this.used = 0;
    this.lastInterruption = null;
  }
}
```

---

## Implementation B: Manual Triggers Only

### Philosophy

No automation. All interactions are explicit user requests.

### Available Commands

```
/memory-palace recall [topic]     - User explicitly requests recall
/memory-palace store <topic>      - User explicitly stores memory
/memory-palace red-queen [strat]  - User explicitly tests recall
/memory-palace status             - User checks review schedule
/memory-palace list               - User views all palaces
```

### No Background Processing

- No conversation monitoring
- No keyword detection
- No automatic notifications
- No interruption logic

### Review Schedule (Passive)

```javascript
function getReviewSchedule() {
  // Only calculated when user explicitly asks
  const journal = loadLearningJournal();
  const now = new Date();
  
  return {
    dueToday: journal.filter(m => isDueToday(m)),
    dueThisWeek: journal.filter(m => isDueThisWeek(m)),
    totalPending: journal.filter(m => isOverdue(m)).length
  };
}

// Called only during /memory-palace status
```

---

## Stress Test Design

### Test 1: Interruption Frequency

**Scenario**: User discusses 10 topics that exist in palace over 30 minutes

**Automated Hooks**:
- Expected interruptions: 3-7 (based on budget)
- Measure: User annoyance level (1-5 scale)
- Measure: Acceptance rate (% of suggestions taken)

**Manual**:
- Expected interruptions: 0
- Baseline for comparison

### Test 2: Memory Retention

**Scenario**: Store 20 memories, test recall at 7 days

**Group A (Automated)**:
- Hooks suggest review when topics mentioned
- Passive reinforcement through interruptions
- Measure: Recall accuracy at 7 days

**Group B (Manual)**:
- No automated review prompts
- User must explicitly run `/memory-palace recall`
- Measure: Recall accuracy at 7 days

### Test 3: Context Switch Overhead

**Scenario**: Switch between 3 projects rapidly

**Automated**:
- Hook system must detect context each time
- Potential for false positives during switches
- Measure: Detection accuracy, false positive rate

**Manual**:
- User explicitly switches: `/memory-palace context project`
- Measure: User action count, accuracy

### Test 4: Edge Cases

**Case 1**: User mentions topic 10 times in 5 minutes
- Automated: Should only interrupt once (budget/cooldown)
- Manual: No issue

**Case 2**: User is in flow state, focused coding
- Automated: Risk of interruption at wrong time
- Manual: No issue

**Case 3**: Off-topic conversation (personal, non-technical)
- Automated: Risk of false positive
- Manual: No issue

**Case 4**: Multiple users in shared conversation
- Automated: Must identify who has which palace
- Manual: No issue

---

## Regression Test Suite

```javascript
describe('Hook System Regression', () => {
  test('core commands still work', () => {
    expect(createPalace('test')).toSucceed();
    expect(storeMemory('topic', 'content')).toSucceed();
    expect(recallMemory('topic')).toReturnCorrectData();
    expect(listPalaces()).toShowAll();
    expect(getStatus()).toBeAccurate();
  });
  
  test('storage paths unchanged', () => {
    expect(getStoragePath()).toBe('~/memory/');
    expect(getGlobalPath()).toBe('~/memory/global/');
    expect(getProjectPath()).toMatch(/~\/memory\/project\/.+/);
  });
  
  test('context detection works', () => {
    expect(detectContext()).toReturn('global' or 'project');
    expect(switchContext('project')).toSucceed();
    expect(switchContext('global')).toSucceed();
  });
  
  test('SMASHIN SCOPE transformation works', () => {
    const memory = storeWithSmashinScope('test', 'data');
    expect(memory.image).toBeVivid();
    expect(memory.confidence).toBeSet();
  });
  
  test('Red Queen protocol works', () => {
    const result = runRedQueen('weak-spots');
    expect(result.questions).toBeGenerated();
    expect(result.scores).toBeCalculated();
    expect(result.weakSpots).toBeIdentified();
  });
});

// Additional hook-specific tests
describe('Hook-specific Tests', () => {
  test('interruption budget respected', () => {
    const budget = new InterruptionBudget();
    expect(budget.canInterrupt()).toBe(true);
    budget.recordInterruption();
    budget.recordInterruption();
    budget.recordInterruption();
    expect(budget.canInterrupt()).toBe(false); // Max 3
  });
  
  test('topic detection accuracy > 80%', () => {
    const tests = loadTestConversations();
    const accuracy = testTopicDetection(tests);
    expect(accuracy).toBeGreaterThan(0.8);
  });
  
  test('no false positives on off-topic', () => {
    const personalChat = "My dog is sick, feeling sad today";
    const result = detectTopicMentioned(personalChat, palace);
    expect(result).toHaveLength(0);
  });
});
```

---

## Evaluation Criteria

### Primary Metric: Memory Retention
- **Accept**: 30%+ improvement in 7-day recall accuracy
- **Reject**: < 15% improvement
- **Partial**: 15-30% improvement (make optional)

### Secondary Metrics
- **User Satisfaction**: > 4/5 rating
- **Interruption Acceptance**: > 40% of suggestions accepted
- **Annoyance Level**: < 2/5 rating
- **False Positive Rate**: < 10%
- **Performance Overhead**: < 50ms per message processed

### Regression Check
- **Must Pass**: All 10 core tests
- **Must Pass**: All hook-specific tests
- **Must Not Degrade**: Command response times > 10%

---

## Expected Outcomes

### Best Case (Automated Wins)
- 40% retention improvement
- High user satisfaction (4.2/5)
- 60% suggestion acceptance
- Low annoyance (1.8/5)
- **Decision**: Deploy as default, manual as fallback

### Moderate Case (Partial Win)
- 25% retention improvement
- Mixed satisfaction (3.5/5)
- 35% acceptance
- Moderate annoyance (2.5/5)
- **Decision**: Deploy as optional feature, disabled by default

### Worst Case (Manual Wins)
- 10% retention improvement
- Low satisfaction (2.8/5)
- 20% acceptance
- High annoyance (3.8/5)
- **Decision**: Abandon automated hooks, document why

---

## Implementation Status

- [ ] Hook orchestrator
- [ ] Topic detection algorithm
- [ ] Learning intent detection
- [ ] Interruption budget system
- [ ] Notification UI
- [ ] User preference settings
- [ ] A/B test framework
- [ ] Metrics collection
- [ ] Regression test suite

---

*Hypothesis 001 Status: DEFINED, READY FOR TESTING*
