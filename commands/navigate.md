# Navigate Command Handler

## Command
`/memory-palace navigate [destination]`

## Purpose
Cross-palace navigation with visual memory strength indicators. Discover connections between palaces and find related memories across your entire knowledge base.

## Quick Start
```
/memory-palace navigate                    # Show navigation hub
/memory-palace navigate caching            # Jump to caching memories
/memory-palace navigate --weak             # Navigate to weak spots
/memory-palace navigate --related cap      # Find concepts related to CAP
```

## Navigation Modes

### 1. Hub View (Default)
```
> /memory-palace navigate

🗺️ MEMORY PALACE NAVIGATION HUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PALACE OVERVIEW
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   🏰 System Design Citadel (50 memories)                    │
│   ├── 🟢🟢🟢🟢🟡🟡🔴🔴 Fundamentals Tower                   │
│   ├── 🟢🟢🟢🟡🟡 Scaling Chamber                            │
│   ├── 🟢🟢🟢🟢 Caching Alcove                               │
│   └── 🟡🟡🔴 Transactions Vault                             │
│                                                              │
│   🏛️ Distributed Patterns Wing (18 memories)                │
│   ├── 🟢🟢🟢 Consensus Hall                                 │
│   └── 🟡🟡 Durability Chamber                               │
│                                                              │
│   🏚️ Failure Modes Annex (8 memories)                       │
│   ├── 🟡🟡🟡 Cascade Corner                                 │
│   └── 🟡🟡 Stampede Stable                                  │
│                                                              │
│   🔒 Cloud & Security Wing (17 memories)                    │
│   ├── 🟢🟢🟢 AWS Pillars                                    │
│   └── 🟢🟢 Zero Trust Zone                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Legend: 🟢 Strong (85%+) 🟡 Moderate (65-84%) 🔴 Weak (<65%)

💡 Commands:
   [1] Visit palace    [2] Find weak spots
   [3] Related search  [4] Full tour
```

### 2. Weak Spots Navigation
```
> /memory-palace navigate --weak

🔴 WEAK SPOT NAVIGATOR
━━━━━━━━━━━━━━━━━━━━━━

Priority Order (by decay prediction):

#1 ⚠️ Write-Behind Cache
   📍 System Design Citadel → Caching Alcove
   📉 68% → 43% in 3 days
   🔗 Related: WAL (contrast), Write-Through (alternative)
   💡 Jump: /memory-palace recall "write-behind cache"

#2 ⚠️ Two-Phase Commit
   📍 System Design Citadel → Transactions Vault
   📉 71% → 45% in 3 days
   🔗 Related: Saga Pattern (alternative), Consensus (requires)
   💡 Jump: /memory-palace recall "two-phase commit"

#3 🟡 WAL (Write-Ahead Log)
   📍 Distributed Patterns Wing → Durability Chamber
   📉 75% → 52% in 7 days
   🔗 Related: Write-Behind (contrast)
   💡 Jump: /memory-palace recall "wal"

[r] Review all  [1-3] Jump to specific  [i] Interview mode
```

### 3. Related Concepts View
```
> /memory-palace navigate --related caching

🔗 RELATED CONCEPTS: Caching
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 8 related memories across 3 palaces:

Direct Relationships:
├── Cache-Aside (85%) → alternative → Write-Through
├── Write-Through (80%) → alternative → Write-Behind ⚠️
├── Write-Behind (68%) → contrast → WAL
└── Cache Eviction (82%) → enables → Cache-Aside

Semantic Connections (via embeddings):
├── Thundering Herd (78%) - cache stampede problem
├── CDN (85%) - distributed caching
└── Redis patterns (80%) - cache implementation

Cross-Palace Links:
├── Performance patterns → Scaling strategies
└── Failure modes → Thundering herd scenario

[1-8] Jump to memory  [c] Compare all  [i] Interview these
```

### 4. Cross-Palace Map
```
> /memory-palace navigate --map

🌐 CROSS-PALACE CONNECTION MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System Design Citadel
        │
        ├──enables──► Distributed Patterns Wing
        │               │
        │               └──tested_by──► Cloud & Security Wing
        │
        └──causes────► Failure Modes Annex
                        │
                        └──prevented_by──► (back to Citadel)

Strong Connections (>0.8):
• CAP Theorem → Consistent Hashing (0.85)
• Circuit Breaker → Cascade Failure (0.90)
• 2PC → Saga Pattern (0.95)

Discovery Opportunities:
• Thundering Herd has only 2 connections (isolated)
• Leader Election has only 1 connection (needs linking)
```

## Heat Map Visualization

### Confidence Heat Map
```
> /memory-palace navigate --heatmap

🌡️ CONFIDENCE HEAT MAP - All Palaces
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                        Confidence Distribution

95%+ ██████████████████████████████ 15 (16%)
85%+ ████████████████████████████████████ 20 (22%)
75%+ ██████████████████████████████████████████ 25 (27%)
65%+ ████████████████████████ 18 (19%)
<65% ██████████████ 15 (16%)

Total: 93 memories | Average: 78% | Target: 85%

By Topic:
┌────────────────────┬──────┬───────────────────────────┐
│ Topic              │ Avg  │ Distribution              │
├────────────────────┼──────┼───────────────────────────┤
│ Fundamentals       │ 88%  │ 🟢🟢🟢🟢🟢🟢🟢🟢🟡🟡      │
│ Scaling            │ 82%  │ 🟢🟢🟢🟢🟢🟡🟡🟡          │
│ Caching            │ 78%  │ 🟢🟢🟢🟡🟡🔴              │
│ Transactions       │ 71%  │ 🟢🟡🟡🔴🔴                │
│ Failure Modes      │ 79%  │ 🟢🟢🟢🟡🟡🟡🟡🟡          │
│ Security           │ 81%  │ 🟢🟢🟢🟢🟡🟡              │
└────────────────────┴──────┴───────────────────────────┘

🔴 Focus Areas: Transactions (71%), Caching weak spots
```

## Execution Flow

```
1. LOAD NAVIGATION DATA
   ├── Load all palaces (lazy)
   ├── Load memory-graph.json for connections
   ├── Load spaced-repetition.json for confidence
   ├── Calculate cross-palace links
   └── Build navigation index

2. RENDER VIEW
   ├── Determine view type (hub/weak/related/map/heatmap)
   ├── Calculate visual indicators
   ├── Format ASCII visualization
   └── Show action options

3. HANDLE NAVIGATION
   ├── Parse user selection
   ├── Jump to target (palace/locus/memory)
   ├── Update navigation history
   └── Show destination context

4. TRACK NAVIGATION
   ├── Log navigation patterns
   ├── Identify frequently visited areas
   └── Suggest unexplored regions
```

## Implementation

```python
async def navigate(destination=None, options={}):
    # Load navigation data
    storage = StorageAdapter()
    await storage.initialize()

    palaces = await storage.getAllPalaces()
    graph = load_memory_graph()
    sr = load_spaced_repetition()

    if options.get('weak'):
        return render_weak_spots_view(storage, sr)

    if options.get('related'):
        return render_related_view(destination, graph, storage)

    if options.get('map'):
        return render_cross_palace_map(graph, palaces)

    if options.get('heatmap'):
        return render_heatmap(palaces, sr)

    if destination:
        # Jump to specific location
        return jump_to_destination(destination, storage)

    # Default: show hub view
    return render_hub_view(palaces, sr)
```

## Visual Indicators

### Confidence Indicators
| Range | Icon | Color | Meaning |
|-------|------|-------|---------|
| 95%+ | 🟢 | Green | Mastered |
| 85-94% | 🟢 | Green | Strong |
| 75-84% | 🟡 | Yellow | Moderate |
| 65-74% | 🟡 | Yellow | Needs review |
| <65% | 🔴 | Red | Weak spot |

### Relationship Types
| Type | Symbol | Meaning |
|------|--------|---------|
| enables | →→ | Source enables target |
| prevents | ⊗→ | Source prevents target |
| alternative | ↔ | Mutual alternatives |
| requires | ⇒ | Prerequisite |
| contrast | ⇌ | Worth comparing |

### Progress Bars
```
████████████████████░░░░░ 76% (Strong)
████████████░░░░░░░░░░░░░ 45% (Weak)
░░░░░░░░░░░░░░░░░░░░░░░░░  0% (New)
```

## Integration with Other Commands

### Chain to Recall
```
/memory-palace navigate caching
→ Shows caching memories
→ User selects "write-behind"
→ Auto-runs: /memory-palace recall "write-behind cache"
```

### Chain to Red Queen
```
/memory-palace navigate --weak
→ Shows 5 weak spots
→ User selects "Review all"
→ Auto-runs: /memory-palace red-queen weak-spots
```

### Chain to Interview
```
/memory-palace navigate --related transactions
→ Shows transaction-related memories
→ User selects "Interview these"
→ Auto-runs: /memory-palace interview transactions 5m
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `h` | Return to hub |
| `w` | Show weak spots |
| `m` | Show cross-palace map |
| `t` | Show heat map |
| `1-9` | Jump to numbered item |
| `r` | Recall current selection |
| `i` | Interview mode |
| `q` | Quit navigation |

## Error Handling

| Scenario | Action |
|----------|--------|
| Empty palace | Guide to `/memory-palace store` |
| No connections | Suggest creating links via graph |
| Navigation history empty | Show default hub |
| Invalid destination | Fuzzy search suggestions |
