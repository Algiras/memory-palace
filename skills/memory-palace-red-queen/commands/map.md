# Map Command Handler

## Command
`/memory-palace map [format]`

## Formats
- `ascii` (default) - Full ASCII visualization
- `compact` - Compressed tree view
- `graph` - Relationship graph only
- `weak` - Weak spots only

## Output

### ASCII Format (default)
Generates full visual map including:
- Palace hierarchy with memory counts
- Extension wings
- Relationship graph with confidence
- Weak spots with progress bars
- Spaced repetition schedule
- Quick stats

### Compact Format
```
System Design Citadel (50)
├── Fundamentals Tower (5)
│   └── Consistency Corner (3)
├── Scalability Spire (4)
│   └── Caching Chamber (6)
├── Data Dungeon (4)
│   └── NoSQL Nook (4)
├── Distributed Dome (5)
│   ├── Clocks Corner (3)
│   └── Message Maze (4)
├── Patterns Pavilion (6)
└── Reliability Rampart (5)
    └── Failure Modes Annex (8)

Extensions:
├── Distributed Patterns Wing (18)
└── Cloud & Security Wing (17)

Total: 93 memories
```

### Graph Format
Shows only concept relationships:
```
CAP ──enables──► Consistent Hashing
CAP ──constrains──► 2PC
2PC ◄──alternative──► Saga
Circuit Breaker ──prevents──► Cascade
```

### Weak Format
Shows only items needing review:
```
⚠️ WEAK SPOTS (confidence < 75%)

1. Write-Behind Cache    68% ████░░░
2. Two-Phase Commit      71% ████░░░
3. Write-Ahead Log       75% █████░░
```

## Implementation

```python
def generate_map(format="ascii"):
    if format == "ascii":
        return read_file("~/memory/global/memory-map.txt")

    elif format == "compact":
        palaces = load_registry()
        return generate_tree(palaces)

    elif format == "graph":
        graph = load_memory_graph()
        return render_relationships(graph)

    elif format == "weak":
        sr = load_spaced_repetition()
        weak = [m for m in sr.memories if m.confidence < 0.75]
        return render_weak_spots(weak)
```

## Auto-Regeneration

The map is regenerated when:
- New memories added
- Red Queen session completes
- Confidence scores change
- Palace structure modified
