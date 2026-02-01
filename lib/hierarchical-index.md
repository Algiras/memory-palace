# Hierarchical Memory Index Design

## The Problem

```
Current: Flat structure, 93 memories
- LLM must scan/search linearly
- Can hallucinate instead of retrieving
- Many steps to find specific memory
- No guarantee LLM reads actual data
```

## The Solution: 3-Level Hierarchy

```
LEVEL 0: ROOT INDEX (fits in 500 chars)
    │
    ├── LEVEL 1: DOMAIN ANCHORS (7 domains, ~100 chars each)
    │       │
    │       └── LEVEL 2: MEMORY POINTERS (direct file:line references)
    │
    └── MAX 2 HOPS to any memory
```

## Level 0: Root Index (The Map)

```
MEMORY PALACE ROOT - 93 memories in 7 domains:

🏛️ FUNDAMENTALS [12] → "dragon, gladiators, mirrors"
⚡ SCALING [8] → "clone army, octopus, squirrel"
💾 DATA [15] → "dungeon, shards, gnomes"
🌐 DISTRIBUTED [18] → "dome, clocks, wedding"
🔧 PATTERNS [12] → "pavilion, city, bodyguards"
🛡️ RELIABILITY [11] → "rampart, nines, relay"
☁️ CLOUD [17] → "atrium, vault, mad scientist"

RETRIEVAL: Read domain anchor → Get file:line → Read actual memory
```

**Size: ~400 chars** - Fits in any context window.

## Level 1: Domain Anchors

Each domain has a compressed anchor that:
1. Lists topic clusters
2. Provides exact file locations
3. Uses memorable keywords for LLM pattern matching

### Example: DISTRIBUTED Domain

```
🌐 DISTRIBUTED SYSTEMS (18 memories)

CLUSTERS:
├── Transactions: wedding(2PC), relay-race(Saga) → citadel.json:325-340
├── Clocks: timezone-nightmare, click-counter, scoreboard → citadel.json:350-375
├── Messaging: post-office, town-crier, receipts → citadel.json:385-415
└── Consensus: wizard-council, pirate-election → wing.json:50-80

QUICK LOOKUP:
- "2PC" → citadel.json:325 (wedding)
- "vector clocks" → citadel.json:367 (scoreboard)
- "saga" → citadel.json:333 (relay backwards)
```

**Size: ~300 chars per domain** - Total L1: ~2KB

## Level 2: Memory Pointers

Direct references that FORCE file reads:

```json
{
  "2pc": {
    "file": "system-design-citadel.json",
    "line": 325,
    "anchor": "stone wedding statues",
    "verify": "47 couples"
  }
}
```

The `verify` field is a checksum - if LLM's answer doesn't include "47 couples", it didn't read the actual file.

## Retrieval Protocol

### STRICT MODE (prevents hallucination)

```
1. User asks about "two-phase commit"
2. LLM reads ROOT INDEX → finds "DISTRIBUTED" domain
3. LLM reads DISTRIBUTED anchor → finds "wedding(2PC) → citadel.json:325"
4. LLM MUST call Read tool on citadel.json:325
5. LLM extracts from ACTUAL file content
6. Verify: Response must contain "47 couples" or "stone statues"
```

### Why This Works

- **2 hops maximum** - Root → Domain → Memory
- **Forced file reads** - Index only contains pointers, not content
- **Verification checksums** - Can detect if LLM hallucinated
- **Compressed entry point** - 400-char root fits anywhere

## Anti-Hallucination Measures

### 1. Pointers, Not Content
Index contains ONLY:
- Domain names
- Anchor keywords (for matching)
- File:line references

Index does NOT contain:
- Full explanations
- Technical details
- The actual memory content

### 2. Verification Tokens
Each memory has a "verify" token - a unique phrase that only appears in the actual stored memory. If LLM's answer lacks this token, it didn't read the file.

### 3. Mandatory Tool Calls
The retrieval protocol REQUIRES a Read tool call. An answer without a preceding Read is flagged as potentially hallucinated.

## Compression Ratios

| Level | Content | Size | Memories Covered |
|-------|---------|------|------------------|
| L0 Root | Domain list | 400 chars | All 93 |
| L1 Domain | Cluster + pointers | 300 chars | 10-18 each |
| L2 Memory | Full SMASHIN SCOPE | 500 chars | 1 |

### Total Index Size
- Root: 400 chars
- 7 Domains: 2,100 chars
- **Total navigational overhead: 2.5KB**

### Compared to Flat
- Flat scan: Read all 93 × 500 = 46.5KB
- Hierarchical: 2.5KB index + 500 chars target = 3KB
- **Savings: 93% reduction in retrieval context**

## Implementation

### Root Index File
`~/memory/global/palace-root-index.md`

### Domain Index Files
`~/memory/global/index/{domain}.md`

### Memory Files (unchanged)
`~/memory/global/{palace}.json`
