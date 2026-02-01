# Recall Command Handler

## Command
`/memory-palace recall [topic]`

## Execution Flow

1. **Parse Arguments**
   - If topic provided: search for specific memory
   - If no topic: offer recall options

2. **Load Palace Context**
   - Detect context (global/project)
   - Load active palace from registry
   - Load `meta-index.md` for anchors

3. **If Topic Specified - Semantic Search (NEW)**

   a. **Direct Match**
      - Search palace for matching `subject` or `content`
      - Use topic index in registry for fast lookup

   b. **Synonym Expansion**
      - Load `memory-graph.json` searchIndex.bySynonym
      - Expand "2pc" → "two-phase-commit", "cap" → "cap-theorem"

   c. **Related Concepts via Graph**
      - Find concept in knowledge graph
      - Traverse edges to find related concepts
      - Show: "Also related: [concepts with relationship types]"

   d. **Domain-Based Discovery**
      - If no direct match, search by domain
      - "caching" → returns all caching strategies

   e. **If Not Found**
      - Suggest similar topics from graph
      - Offer to create new memory

4. **If No Topic - Present Options**
   
   ```
   🔍 RECALL OPTIONS:
   1. 🏰 Full Tour - Walk all loci systematically
   2. 🕐 Recent Memories - Last 5 stored
   3. 🎯 Random Quiz - Test random memories
   4. 🔗 Linked Chain - Follow memory connections
   5. 📍 Current Locus - Review active location
   ```

5. **Execute Recall Walk**

   For each locus in path:
   
   a. **Describe Locus Vividly**
      - Read `anchor` and `description`
      - Paint sensory picture (sight, sound, smell)
      - Establish spatial orientation
   
   b. **Present Memory Images**
      - For each memory in locus:
        - Show image (don't reveal content yet)
        - Ask: "What do you see? What does this represent?"
        - Wait for user recall attempt
   
   c. **Reveal Content**
      - Show `content` field
      - Compare to user's recall
      - Note accuracy and gaps
   
   d. **Update Stats**
      - Increment `recallCount`
      - Update `lastRecalled`
      - Adjust `confidence` based on accuracy

6. **Navigation Options**
   - Continue to next locus?
   - Jump to specific locus?
   - Deep dive on specific memory?
   - End tour?

7. **Post-Recall**
   - Summarize what was recalled
   - Identify weak spots (low confidence)
   - Suggest: `/memory-palace red-queen weak-spots`

## Memory Presentation Format

```
📍 LOCUS: Tower of Fundamentals
🔰 ANCHOR: Ancient stone tower with glowing blue runes

Memory 1 of 3:
🖼️ IMAGE: Two GLADIATORS locked in eternal combat! PERFORMANCE 
   is a CHEETAH-MAN, blindingly fast but ALONE. SCALABILITY is 
   a HYDRA - slower, but grows NEW HEADS...

🤔 What does this represent?
[User answers]

✅ CORRECT: Performance vs Scalability
📖 Performance: how fast for one user
📖 Scalability: maintaining performance as load increases

Confidence rating (1-5)? [User rates]
```

## Error Handling

- **No active palace**: List available, ask to select
- **Empty palace**: Guide to `/memory-palace store`
- **Topic not found**: Fuzzy search, suggest alternatives
- **Context switch**: Re-load appropriate palace

## Example Sessions

**Topic-Specific with Semantic Search:**
```
> /memory-palace recall "CAP theorem"
🔍 Searching for "CAP theorem"...
📍 Found: Fundamentals Tower → Consistency Corner

🔗 RELATED CONCEPTS (via knowledge graph):
├── enables → Consistent Hashing (hash ring for partitions)
├── constrains → Two-Phase Commit (can't have C+A during partition)
└── cluster → Data Distribution (same domain)

🚶 Walking to location...
[Present CAP theorem memory with three-headed dragon]
```

**Synonym Search:**
```
> /memory-palace recall "2pc"
🔍 Expanding "2pc" → "Two-Phase Commit"...
📍 Found: Distributed Transactions Chamber

🔗 RELATED CONCEPTS:
├── alternative → Saga Pattern (use when 2PC blocking is unacceptable)
├── requires → Consensus (needs coordination)
└── constrained by → CAP Theorem (can't have C+A during partition)

🚶 Walking to location...
```

**Domain Search:**
```
> /memory-palace recall "caching"
🔍 Found 3 caching strategies:

1. Cache-Aside (Librarian notebook) - 85% confidence
2. Write-Through (Two-handed clerk) - 80% confidence
3. Write-Behind (Procrastinator) - 68% confidence ⚠️

Which pattern? [1/2/3/all/compare]

> compare
📊 CACHING STRATEGY COMPARISON:
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│ Pattern         │ Cache-Aside  │ Write-Through│ Write-Behind │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Consistency     │ Eventual     │ Strong       │ Eventual     │
│ Write Latency   │ Fast (no cache) │ Slow      │ Fast         │
│ Complexity      │ App manages  │ Simple       │ Queue needed │
│ Data Loss Risk  │ No           │ No           │ Yes (crash)  │
└─────────────────┴──────────────┴──────────────┴──────────────┘
```

**Full Tour:**
```
> /memory-palace recall
🏰 Starting full tour of System Design Citadel
12 loci, 50 memories

📍 LOCUS 1: Sky Bridge Entrance
[Continue through all loci...]
```
