# Memory Palace + Red Queen

> "It takes all the running you can do, to keep in the same place." — Lewis Carroll

**Memory without testing is belief without verification.**

This skill combines two powerful techniques:
1. **Method of Loci** — Ancient technique for vivid, unforgettable encoding
2. **Red Queen Protocol** — Continuous adversarial testing to prevent decay and hallucinations

**Why both matter:**
- Vivid encoding creates memories that stick
- Adversarial testing keeps them accurate
- Without testing: confident hallucinations, rapid decay
- Without vivid encoding: testing fails because memories are weak

> **Note:** This skill starts with **zero memories**. You build your own palaces from scratch using the commands below.

## The Red Queen Effect

Studies show untested memories decay 40% within 24 hours. The Red Queen Protocol solves this with four specialized agents that continuously challenge your knowledge:

- **Examiner** — Generates hard questions targeting weak spots
- **Learner** — Attempts blind recall, rates confidence  
- **Evaluator** — Scores accuracy, identifies gaps
- **Evolver** — Strengthens weak memories with better imagery

**Result:** -37% retrievals needed, +23% retention for weak memories, F1=0.92 hallucination detection

## Installation

### Quick Install (Recommended)

```bash
npx memory-palace-red-queen
```

### Manual Install

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Algiras/memory-palace.git
   cd memory-palace
   ```

2. **Copy the skill to your Claude Code skills directory:**
   ```bash
   mkdir -p ~/.claude/skills/memory-palace-red-queen
   cp -r skills/memory-palace-red-queen/* ~/.claude/skills/memory-palace-red-queen/

   # Or symlink for development
   ln -s $(pwd)/skills/memory-palace-red-queen ~/.claude/skills/memory-palace-red-queen
   ```

3. **Initialize storage:**
   ```bash
   mkdir -p ~/memory/global ~/memory/project
   ```

4. **Start using:**
   ```
   /memory-palace create "My First Palace" "Ancient Library"
   ```

### Finding Other Skills

```bash
npx skills find <keyword>    # Search for skills
npx skills check             # Check for updates
npx skills update            # Update all skills
```

Browse available skills at: [skills.sh](https://skills.sh/)

## Documentation

- **Website:** https://algiras.github.io/memory-palace/
- **Paper:** https://algiras.github.io/memory-palace/book/
- **Getting Started:** https://algiras.github.io/memory-palace/getting-started/
- **Evolution History:** https://algiras.github.io/memory-palace/evolutions/
- **Releases:** https://github.com/Algiras/memory-palace/releases

## Commands

| Command | Description |
|---------|-------------|
| `/memory-palace create <name> [theme]` | Create a new memory palace |
| `/memory-palace store <topic>` | Store a memory in current palace |
| `/memory-palace recall [topic]` | Walk through with semantic search |
| `/memory-palace define <concept>` | Instant one-sentence lookup |
| `/memory-palace navigate [destination]` | Cross-palace exploration with heat maps |
| `/memory-palace list` | Show all palaces |
| `/memory-palace open <name>` | Set active palace |
| `/memory-palace tour` | Full walkthrough of current palace |
| `/memory-palace add-locus <name>` | Add a new location |
| `/memory-palace red-queen [strategy]` | Run adversarial recall testing |
| `/memory-palace interview [topic] [duration]` | Timed rapid-fire Q&A mode |
| `/memory-palace status` | Show memory statistics with decay prediction |

## Quick Start

```
/memory-palace create "TypeScript Mastery" "Ancient Library"
/memory-palace store "generics"
/memory-palace recall
/memory-palace red-queen weak-spots
```

## Storage Location

Memory is organized into **global** and **project-specific** contexts:

```
~/memory/
├── config.json              # System configuration
├── global/                  # Cross-project knowledge
│   ├── palace-registry.json
│   ├── meta-index.md
│   ├── learning-journal.md
│   └── *.json               # Global palaces (system-design, algorithms, etc.)
│
└── project/
    └── {projectId}/         # Project-specific knowledge
        ├── palace-registry.json
        ├── meta-index.md
        └── *.json           # Project palaces (codebase, domain, conventions)
```

### Context Detection

| Context | When Used | Examples |
|---------|-----------|----------|
| **Global** | General knowledge applicable everywhere | System design, algorithms, career skills |
| **Project** | Domain-specific to current codebase | Architecture decisions, team conventions, business logic |

Project ID is derived from: `hash(git_remote_url)` or `hash(folder_path)`

## Command Implementation

### `/memory-palace create <name> [theme]`

1. If no theme provided, suggest 3 options:
   - "Ancient Library" (hierarchical knowledge)
   - "Space Station" (technical systems)
   - "Journey Path" (sequential learning)

2. Create palace JSON structure:
```json
{
  "name": "<name>",
  "created": "YYYY-MM-DD",
  "theme": "<theme>",
  "activeLocus": "entrance",
  "loci": [
    {
      "id": "entrance",
      "name": "Grand Entrance",
      "anchor": "<vivid anchor description>",
      "memories": [],
      "children": [],
      "parent": null
    }
  ]
}
```

3. Save to `~/memory/global/<slugified-name>.json` (or project context)
4. Update `palace-registry.json` in current context
5. Describe the entrance vividly to anchor it

### `/memory-palace store <topic>`

1. Ensure palace is active (or ask which to use)
2. Ask what information to memorize
3. Transform using SMASHIN SCOPE:
   - **S**ubstitute abstract → concrete
   - **M**ovement - make it animated
   - **A**bsurd - impossible/exaggerated
   - **S**ensory - all 5 senses
   - **H**umor - make it funny
   - **I**nteract - user is part of scene
   - **N**umbers - encode with shapes
   - **S**ymbols - visual puns
   - **C**olor - vivid, unusual
   - **O**versize - dramatic scale
   - **P**osition - precise placement
   - **E**motion - strong feelings

4. Present image to user, refine if needed
5. Place at specific locus
6. Update palace JSON and meta-index
7. Brief "walk back" to reinforce

### `/memory-palace recall [topic]`

1. If topic specified, search palace for matching memories
2. If no topic, offer options:
   - Full tour (walk all loci)
   - Recent (last 5 memories)
   - Random quiz

3. For each memory:
   - Describe the locus vividly
   - Present the image
   - Reveal the content
   - Ask if user wants elaboration

### `/memory-palace red-queen [strategy]`

Strategies:
- `random` - Random sampling (default)
- `weak-spots` - Focus on low-confidence items
- `depth-first` - Complete palace tour
- `cross-link` - Questions connecting concepts
- `adversarial` - Edge cases and failure modes

Protocol:
1. Load palace and meta-index
2. Launch Examiner agent (haiku) to generate questions
3. Launch Learner agent (haiku) for blind recall
4. Launch Evaluator agent (haiku) to score
5. Update learning journal with gaps
6. Optionally launch Evolver to strengthen weak memories

### `/memory-palace status`

Display:
- Total palaces
- Total memories
- Last accessed
- Weak spots count
- Next review due (spaced repetition)

## Palace JSON Schema

```json
{
  "name": "string",
  "created": "YYYY-MM-DD",
  "theme": "string",
  "description": "string",
  "activeLocus": "locus-id",
  "loci": [
    {
      "id": "unique-id",
      "name": "Location Name",
      "anchor": "memorable feature",
      "description": "detailed scene",
      "memories": [
        {
          "id": "memory-id",
          "subject": "topic",
          "image": "vivid SMASHIN SCOPE image",
          "content": "actual information",
          "created": "YYYY-MM-DD",
          "confidence": 1-5,
          "lastRecalled": "YYYY-MM-DD",
          "recallCount": 0,
          "linkedTo": ["other-memory-ids"]
        }
      ],
      "children": ["child-locus-ids"],
      "parent": "parent-id or null"
    }
  ]
}
```

## Red Queen Protocol

> "It takes all the running you can do, to keep in the same place."
> — The Red Queen, *Through the Looking-Glass* (Lewis Carroll, 1871)

Named after Lewis Carroll's famous quote, the Red Queen Protocol represents the insight that constant adversarial testing is required just to maintain knowledge—without it, memories decay and hallucinations creep in.

**Key Results:** -37% retrievals needed, +23% retention for weak memories, F1=0.92 hallucination detection

Four specialized agents continuously challenge and strengthen memories:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  EXAMINER   │────►│   LEARNER   │────►│  EVALUATOR  │
│  (haiku)    │     │   (haiku)   │     │   (haiku)   │
│ Generate Qs │     │ Blind recall│     │ Score gaps  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   EVOLVER   │
                                        │   (opus)    │
                                        │ Strengthen  │
                                        └─────────────┘
```

### Agent Roles

| Agent | Model | Role |
|-------|-------|------|
| **Examiner** | haiku | Read palace, generate hard questions targeting weak spots |
| **Learner** | haiku | Attempt blind recall from anchors only, rate confidence |
| **Evaluator** | haiku | Compare to ground truth, score accuracy, identify gaps |
| **Evolver** | opus | Create stronger SMASHIN SCOPE images for weak memories |

### Evolution Triggers

1. **Manual**: `/memory-palace red-queen [strategy]`
2. **Contextual**: When discussing a topic with stored memories
3. **Scheduled**: Based on spaced repetition intervals

### Context-Aware Evolution

- **Global memories** evolve from general discussions (~/memory/global/)
- **Project memories** evolve from codebase-specific work (~/memory/project/{id}/)
- Each context has its own learning journal tracking gaps

## Survival Structure

For context loss recovery:

1. `meta-index.md` contains short anchors that trigger full recall
2. `palace-registry.json` tracks all palaces for chunked loading
3. Loading strategy:
   - Minimal: meta-index only
   - Standard: + registry
   - Full: + all palace JSONs

## Navigation

- [Table of Contents](./TOC.md)
- [References](./references/INDEX.md) - Techniques and templates
- [Examples](./examples/INDEX.md) - Sample palaces
- [Palaces](./palaces/) - Your memory palaces
- [Red Queen Protocol](./red-queen-protocol.md) - Adversarial testing details

## Context-Aware Memory Surfacing

The skill automatically surfaces relevant memories when you discuss related topics:

### Proactive Triggers
- **Keyword Detection**: Mentioning "caching", "CAP theorem", "distributed" etc. triggers suggestions
- **Weak Spot Alerts**: If a concept you mention is a weak spot, you'll be alerted
- **Decay Warnings**: Memories predicted to decay below 60% get surfaced for review
- **Code Context**: Working with Redis, Kafka, etc. surfaces related patterns

### Example Surfacing
```
User: "I need to design a caching strategy"

💡 MEMORY SURFACING
━━━━━━━━━━━━━━━━━━━
6 caching memories available:
• Cache-Aside (85%) - Librarian notebook
• Write-Through (80%) - Two-handed clerk
• Write-Behind (68%) ⚠️ WEAK - Procrastinator

Quick recall? /memory-palace recall caching
```

### Surfacing Rules
- Maximum 3 suggestions per session
- 30-minute cooldown between suggestions
- Weak spots are always surfaced (highest priority)
- Decaying memories get surfacing priority

### Disable Surfacing
To disable proactive surfacing, edit `~/memory/global/context-triggers.json`:
```json
{
  "surfacingConfig": {
    "enabled": false
  }
}
```

## Storage & Performance (v2.0)

The skill uses a unified storage adapter with multiple optimizations:

### Storage Backends
- **SQLite** (default): 10-100x faster queries, FTS5 full-text search, ACID transactions
- **JSON** (fallback): Portable, human-readable, automatic migration

### Semantic Search
- **Local embeddings**: Find memories by meaning, not just keywords
- **Cross-palace discovery**: Automatically links related concepts
- **Synonym expansion**: "2pc" → "Two-Phase Commit", "cap" → "CAP Theorem"

### Performance Features
- **LRU caching**: Configurable cache for frequent lookups
- **Topic/anchor indexing**: O(1) lookups by topic or anchor
- **Lazy loading**: Load only active palace, defer others
- **Compression**: gzip support for 75% smaller storage

### Configuration
Edit `~/memory/global/config.json`:
```json
{
  "backend": "auto",
  "embeddings": { "enabled": true },
  "performance": {
    "caching": true,
    "cacheSize": 100,
    "indexing": true
  }
}
```

## Cross-Palace Navigation

Explore your entire knowledge base with visual indicators:

```
> /memory-palace navigate --weak

🔴 WEAK SPOT NAVIGATOR
#1 ⚠️ Write-Behind Cache (68% → 43% in 3 days)
#2 ⚠️ Two-Phase Commit (71% → 45% in 3 days)

> /memory-palace navigate --heatmap

🌡️ CONFIDENCE HEAT MAP
95%+ ██████████████████████ 15 (16%)
85%+ ████████████████████████████ 20 (22%)
75%+ ██████████████████████████████████ 25 (27%)
65%+ ████████████████████ 18 (19%)
<65% ██████████████ 15 (16%)
```

## Best Practices

1. **Start small**: 5-7 loci per palace initially
2. **Review regularly**: Run red-queen weekly
3. **Connect palaces**: Link related memories across palaces
4. **Personalize**: More personal = stronger memory
5. **All senses**: Sound, smell, texture, taste, not just visual
6. **Trust the absurd**: Impossible images stick better
7. **Use define for quick lookups**: `/memory-palace define cap` for instant recall
8. **Run interview mode regularly**: Practice under time pressure
9. **Navigate weak spots**: `/memory-palace navigate --weak` to find gaps
10. **Use semantic search**: Natural language queries find related concepts
