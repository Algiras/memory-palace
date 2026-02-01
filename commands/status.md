# Status Command Handler

## Command
`/memory-palace status`

## Execution Flow

1. **Load Configuration**
   - Read `~/memory/config.json`
   - Get settings: context, active palace, preferences

2. **Detect Current Context**
   - Global: `~/memory/global/`
   - Project: `~/memory/project/{projectId}/`
   - Show context switch info

3. **Load Active Palace**
   - Get palace name from config
   - Load palace JSON
   - Calculate statistics

4. **Calculate Global Statistics**
   ```javascript
   stats = {
     totalPalaces: registry.palaces.length,
     totalMemories: sum(palace.memoryCount for all palaces),
     totalLoci: sum(palace.lociCount for all palaces),
     activePalace: config.activePalace,
     context: config.context,
     lastSession: config.lastSession,
     sessionCount: config.sessionCount
   }
   ```

5. **Calculate Palace-Specific Stats**
   ```javascript
   palaceStats = {
     name: palace.name,
     memoryCount: count(memories),
     lociCount: count(loci),
     created: palace.created,
     lastAccessed: palace.lastAccessed || "Never",
     accessCount: palace.accessCount || 0,
     weakSpots: count(memories with confidence < 3),
     strongMemories: count(memories with confidence >= 4),
     avgConfidence: average(confidence ratings),
     neverRecalled: count(memories with recallCount = 0)
   }
   ```

6. **Check Spaced Repetition**
   - Load learning journal
   - Find memories due for review (based on lastRecalled + interval)
   - Intervals: 1 day, 3 days, 7 days, 14 days, 30 days
   - Count overdue items

7. **Display Status Dashboard with Decay Predictions**

   ```
   🏛️ MEMORY PALACE STATUS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📊 GLOBAL STATISTICS
   ━━━━━━━━━━━━━━━━━━━
   Context: global (/Users/algimantask/Personal/memory-palace)
   Total Palaces: 5
   Total Memories: 93
   Total Loci: 24
   Sessions Completed: 12
   Retention Rate: 82%

   🏰 ACTIVE PALACE: System Design Citadel
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Theme: Floating Citadel
   Created: 2026-02-01
   Memories: 50 across 12 loci

   💪 Memory Strength by Status
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Mastered (95%+): ████████░░ 1 memory
   Strong (85-94%): ████████░░ 1 memory
   Familiar (75-84%): ████████░░ 2 memories
   Weak (65-74%): ████░░░░░░ 2 memories ⚠️
   Critical (<65%): ░░░░░░░░░░ 0 memories

   📉 CONFIDENCE DECAY FORECAST
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ┌─────────────────────┬───────┬────────┬────────┬────────┐
   │ Concept             │ Now   │ +3 days│ +7 days│ Status │
   ├─────────────────────┼───────┼────────┼────────┼────────┤
   │ Write-Behind Cache  │  68%  │  43%   │  24%   │ 🔴 WEAK│
   │ Two-Phase Commit    │  71%  │  45%   │  25%   │ 🔴 WEAK│
   │ Saga Pattern        │  82%  │  61%   │  41%   │ 🟡 OK  │
   │ Consistent Hashing  │  85%  │  63%   │  42%   │ 🟡 OK  │
   │ Circuit Breaker     │  88%  │  76%   │  62%   │ 🟢 GOOD│
   │ CAP Theorem         │  92%  │  79%   │  65%   │ 🟢 GOOD│
   └─────────────────────┴───────┴────────┴────────┴────────┘

   ⏰ SPACED REPETITION QUEUE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Due today: 0 memories
   Due in 3 days: 2 memories (high priority)
   Due this week: 4 memories
   Predicted retention in 7 days: 68%

   🔴 AUTO-DETECTED WEAK SPOTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Priority #1: Write-Behind Cache
   ├── Confidence: 68% → 43% in 3 days
   ├── Decay rate: 15%/week (high)
   └── Gap: Crash scenario not visceral enough

   Priority #2: Two-Phase Commit
   ├── Confidence: 71% → 45% in 3 days
   ├── Decay rate: 15%/week (high)
   └── Gap: Blocking horror missing

   📈 ACTIVITY
   ━━━━━━━━━━
   Last session: Today
   Most active palace: System Design Citadel (12 sessions)
   Favorite strategy: weak-spots

   💡 RECOMMENDATIONS (Priority Order)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. /memory-palace red-queen weak-spots  ← 2 weak memories need strengthening
   2. /memory-palace interview 5m          ← Test recall under pressure
   3. /memory-palace define <concept>      ← Quick lookup any concept
   ```

8. **Progress Visualization**
   
   Optional ASCII chart:
   ```
   Mastery Progress
   ████████████████████░░░░░ 76% Strong
   ████░░░░░░░░░░░░░░░░░░░░░ 16% Moderate  
   ██░░░░░░░░░░░░░░░░░░░░░░░  8% Weak
   ```

## Spaced Repetition Algorithm

```javascript
function calculateNextReview(memory) {
  const intervals = [1, 3, 7, 14, 30]; // days
  const level = Math.min(memory.recallCount, intervals.length - 1);
  const days = intervals[level];
  
  const nextReview = new Date(memory.lastRecalled);
  nextReview.setDate(nextReview.getDate() + days);
  
  return nextReview;
}
```

## Error Handling

- **No config**: Create default config.json
- **Corrupted data**: Show partial stats with warnings
- **Missing palaces**: Guide to create first palace
- **Context error**: Re-detect and fix

## Quick Actions Footer

```
💡 Next Actions:
• /memory-palace red-queen weak-spots  - Target weak memories
• /memory-palace recall                - Full palace tour
• /memory-palace list                  - View all palaces
• /memory-palace create <name>         - Start new palace
```
