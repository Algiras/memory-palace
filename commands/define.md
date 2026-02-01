# Define Command Handler

## Command
`/memory-palace define <concept>`

## Purpose
Instant one-sentence lookup for rapid recall. Read anchor, visualize image, verify with definition.

## Execution Flow

```
1. PARSE INPUT
   ├── Normalize concept (lowercase, trim)
   ├── Build search terms (synonyms, abbreviations)
   └── Check for exact match vs fuzzy search

2. SEARCH QUICK-RECALL
   ├── Load ~/memory/global/quick-recall.md
   ├── Search by anchor OR concept name
   ├── Fallback: semantic search in memory-graph.json
   └── Return best match with confidence

3. DISPLAY RESULT
   ┌─────────────────────────────────────────────┐
   │ 🔍 CAP Theorem                              │
   │                                              │
   │ 🖼️ Anchor: Three-headed dragon               │
   │ 📖 Pick 2 of 3: Consistency, Availability,  │
   │    Partition tolerance                       │
   │                                              │
   │ Confidence: 92% | Last: 2 days ago          │
   │                                              │
   │ 💡 Related: CP Systems, AP Systems          │
   └─────────────────────────────────────────────┘

4. OFFER DEEP DIVE (optional)
   - "Want full recall? /memory-palace recall CAP"
   - "Review weak spots? /memory-palace red-queen weak-spots"
```

## Search Algorithm

```python
def define(concept):
    # 1. Exact match (fast path)
    quick_recall = load_quick_recall()
    for entry in quick_recall:
        if concept.lower() in entry.concept.lower():
            return format_definition(entry)

    # 2. Anchor match
    for entry in quick_recall:
        if concept.lower() in entry.anchor.lower():
            return format_definition(entry)

    # 3. Semantic search via graph
    graph = load_memory_graph()
    related = find_related_concepts(graph, concept)
    if related:
        return format_definition(related[0], fuzzy=True)

    # 4. Not found - offer to store
    return offer_store_new(concept)
```

## Output Format

### Found - Single Match
```
🔍 CAP Theorem

🖼️ Three-headed dragon
📖 Pick 2 of 3: Consistency, Availability, Partition tolerance

⏱️ 92% confidence | Reviewed 2 days ago
🔗 Related: CP Systems, AP Systems, Consistent Hashing
```

### Found - Multiple Matches
```
🔍 Found 3 matches for "cache":

1. Cache-Aside (Librarian notebook)
   App manages cache; check cache, miss = fetch from DB

2. Write-Through (Two-handed clerk)
   Sync write to cache AND DB; consistent but slow writes

3. Write-Behind (Procrastinator + bus)
   Async DB write; fast but data loss risk on crash

Which one? [1/2/3/all]
```

### Not Found
```
❓ "vector clock" not in quick-recall index

💡 Options:
   1. Search full memories: /memory-palace recall "vector clock"
   2. Store new concept: /memory-palace store "vector clock"
   3. Similar: "Lamport Clock", "Clock Skew"
```

## Abbreviation Support

Common abbreviations auto-expand:
| Input | Expands To |
|-------|------------|
| `cap` | CAP Theorem |
| `2pc` | Two-Phase Commit |
| `wal` | Write-Ahead Log |
| `lru` | LRU Cache Eviction |
| `cdn` | Content Delivery Network |
| `cqrs` | CQRS Pattern |
| `db` | Database |
| `lb` | Load Balancer |
| `mtls` | Mutual TLS |
| `api` | API Gateway |

## Integration with Other Commands

### Chain to recall
```
/memory-palace define cap
# User sees one-liner
# Optionally: "Deep dive? y/n"
# If yes: /memory-palace recall "CAP theorem"
```

### Chain to red-queen
```
/memory-palace define 2pc
# If confidence < 70%:
# "⚠️ Weak spot detected! Run: /memory-palace red-queen weak-spots"
```

## Performance

- **Target**: < 100ms response time
- **Approach**: Quick-recall.md is flat file, fast text search
- **Fallback**: Memory graph only if text search fails
- **Cache**: Keep quick-recall in memory for session

## Error Handling

| Scenario | Action |
|----------|--------|
| No quick-recall.md | Guide to generate from palaces |
| Empty search | List all categories |
| Partial match | Show fuzzy results with confidence |
| Multiple exact | Present numbered list |

## Example Session

```
> /memory-palace define consistent hashing

🔍 Consistent Hashing

🖼️ Clock with gnomes
📖 Hash ring minimizes data movement when nodes change

⏱️ 85% confidence | Reviewed 2 days ago
🔗 Related: Sharding, CAP Theorem, Partitioning

💡 Deeper? /memory-palace recall "consistent hashing"
```

## Quick-Recall Generation

Auto-generate quick-recall entries from palace memories:

```python
def generate_quick_recall_entry(memory):
    return {
        "anchor": memory.anchor,
        "concept": memory.subject,
        "summary": summarize_to_one_sentence(memory.content),
        "memory_id": memory.id,
        "confidence": memory.confidence,
        "last_recalled": memory.lastRecalled
    }
```

One-sentence summaries follow pattern:
- **Definition**: "[Concept] = [what it is]"
- **Comparison**: "[A] = [difference from B]"
- **Trade-off**: "[Concept]: [benefit] but [cost]"
- **Pattern**: "[Name]: [trigger] → [action]"
