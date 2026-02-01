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

7. **Display Status Dashboard**

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
   
   🏰 ACTIVE PALACE: System Design Citadel
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Theme: Floating Citadel
   Created: 2026-02-01
   Memories: 50 across 12 loci
   
   💪 Memory Strength
   ━━━━━━━━━━━━━━━━━━
   Strong (4-5★): 38 memories (76%)
   Moderate (3★): 8 memories (16%)
   Weak (1-2★): 4 memories (8%)
   Never tested: 12 memories
   
   ⏰ SPACED REPETITION
   ━━━━━━━━━━━━━━━━━━━
   Due today: 3 memories
   Due this week: 7 memories
   On track: 38 memories
   
   🔴 WEAK SPOTS (Needs Review)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Write-Behind Cache (confidence: 2)
   • Two-Phase Commit (confidence: 2)
   • Vector Clocks (confidence: 1)
   
   📈 ACTIVITY
   ━━━━━━━━━━
   Last session: Today
   Most active palace: System Design Citadel (12 sessions)
   Favorite strategy: weak-spots
   
   💡 RECOMMENDATIONS
   ━━━━━━━━━━━━━━━━━━
   • Run: /memory-palace red-queen weak-spots
   • Review: 3 overdue memories
   • Create: New palace for project-specific knowledge
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
