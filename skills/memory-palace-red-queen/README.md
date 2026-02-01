# Memory Palace Skill

This is the **production version** of the Memory Palace skill - a cognitive framework for managing AI-assisted memory systems using the ancient method of loci combined with the Red Queen adversarial learning protocol.

## Overview

The Memory Palace skill implements a structured approach to knowledge organization using spatial encoding. Information is stored as vivid mental images placed in imagined locations (loci), enabling superior recall through spatial navigation. This skill helps maintain continuity across conversations and provides a reliable system for managing complex information.

**Current Status**: 8 evolutions tested, 99% skill fitness, 66% retention improvement with Fibonacci spaced repetition.

## How to Use

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `memory-palace create <name> [theme]` | Create a new palace | `create "TypeScript Mastery" "Ancient Library"` |
| `memory-palace store <topic>` | Store a memory with vivid encoding | `store "generics"` |
| `memory-palace recall [topic]` | Walk through palace with semantic search | `recall` or `recall "type safety"` |
| `memory-palace list` | Show all available palaces | `list` |
| `memory-palace open <name>` | Set active palace | `open "TypeScript Mastery"` |
| `memory-palace status` | Show current palace state and stats | `status` |

### Advanced Features

| Command | Description |
|---------|-------------|
| `memory-palace define <concept>` | Instant one-sentence lookup |
| `memory-palace navigate [destination]` | Cross-palace exploration with heat maps |
| `memory-palace red-queen [strategy]` | Adversarial recall testing (random, weak-spots, depth-first, cross-link) |
| `memory-palace interview [topic] [duration]` | Timed rapid-fire Q&A mode |
| `memory-palace add-locus <name>` | Add a new location to current palace |
| `memory-palace tour` | Full guided walkthrough |

### Storage System

Memories are stored locally in `~/memory/`:

```
~/memory/
├── config.json              # System configuration
├── global/                  # Cross-project knowledge
│   ├── palace-registry.json # List of all palaces
│   ├── meta-index.md        # Cross-references
│   ├── learning-journal.md  # Progress tracking
│   └── *.json               # Individual palaces
│
└── project/{projectId}/     # Project-specific knowledge
    ├── palace-registry.json
    ├── meta-index.md
    └── *.json
```

**Context Detection**: Automatically detects global vs project context based on git repository.

## Installation

### Method 1: npm (Recommended)

```bash
npx memory-palace-red-queen
```

### Method 2: Direct Copy

```bash
# From the root of the repository
mkdir -p ~/.claude/skills/memory-palace-red-queen
cp -r skills/memory-palace-red-queen/* ~/.claude/skills/memory-palace-red-queen/

# Create storage directories
mkdir -p ~/memory/global ~/memory/project
```

### Method 3: Symlink (Development)

```bash
# From the root of the repository
ln -s $(pwd)/skills/memory-palace-red-queen ~/.claude/skills/memory-palace-red-queen
mkdir -p ~/memory/global ~/memory/project
```

### Verify Installation

Run in Claude Code:
```
/memory-palace status
```

Expected output:
```
🏛️ Memory Palace Status
📊 0 memories | 0 palaces | Storage: ~/memory/
✅ Skill ready - create your first palace!
```

## Directory Structure

```
skills/memory-palace-red-queen/
├── README.md                 # This file
├── SKILL.md                  # Core skill documentation (detailed reference)
├── commands/                 # Command implementations
│   ├── create.md            # Create palace command
│   ├── store.md             # Store memory command
│   ├── recall.md            # Recall/walkthrough command
│   ├── map.md               # Map visualization
│   ├── status.md            # Status command
│   ├── list.md              # List palaces
│   ├── define.md            # Quick lookup
│   ├── navigate.md          # Cross-palace navigation
│   ├── interview.md         # Q&A mode
│   ├── red-queen.md         # Adversarial testing
│   └── context.md           # Context management
├── subagents/                # Specialized sub-agents
│   ├── evolver.md           # Memory strengthening agent
│   ├── evaluator.md         # Scoring agent
│   ├── learner.md           # Recall agent
│   └── examiner.md          # Question generation agent
└── features/                 # Feature implementations
    ├── analytics/           # Analytics and tracking
    ├── export-import/       # Multi-format export
    └── gamification/        # Gamification system
```

## Key Features

### 1. SMASHIN SCOPE Encoding

Transform abstract concepts into unforgettable mental images using 12 encoding factors:

- **S**ubstitute (abstract → concrete)
- **M**ovement (animated, not static)
- **A**bsurd (impossible/exaggerated)
- **S**ensory (all 5 senses)
- **H**umor (make it funny)
- **I**nteract (user is part of scene)
- **N**umbers (encode numerically)
- **S**ymbols (visual puns)
- **C**olor (vivid, unusual)
- **O**versize (dramatic scale)
- **P**osition (precise placement)
- **E**motion (strong feelings)

### 2. Red Queen Protocol

Constant adversarial testing prevents memory decay:

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

Strategies:
- `random` - Random sampling
- `weak-spots` - Focus on low-confidence items
- `depth-first` - Complete palace tour
- `cross-link` - Connect related concepts
- `adversarial` - Edge cases and failure modes

### 3. Fibonacci Spaced Repetition

Based on Evolution 004 discovery: Fibonacci intervals (1,2,3,5,8,13,21 days) achieve **86% retention** vs 19.8% with industry-standard exponential intervals (p < 0.0001).

### 4. Semantic Search

Vector embeddings enable meaning-based discovery:
- 1536-dimensional embeddings
- Cosine similarity search
- Cross-palace linking
- 85% top-5 precision

### 5. Hierarchical Architecture

Hierarchical chunking overcomes Miller's Law (7±2 limit):
- 4 groups of 3-4 loci = 100+ loci per palace
- 100% navigation success
- Context-efficient retrieval

## Evolution History

The skill has been scientifically tested through 8 major evolutions:

| ID | Hypothesis | Status | Result |
|----|-----------|--------|--------|
| 001 | SQLite Backend | ✅ Accepted | 10-100x faster queries |
| 002 | Semantic Search | ✅ Accepted | 85% top-5 precision |
| 003 | Hook System | ❌ Rejected | Too annoying (7.35/10) |
| 004 | Fibonacci Spaced Repetition | ✅ Accepted | 86% vs 19% retention (+66%) |
| 005 | Palace Architecture | ✅ Accepted | 100+ loci, 100% navigation |
| 006 | Export/Import | ✅ Accepted | Multi-format: Anki, MD, JSON, Gists |
| 007 | Subagent Specialization | ✅ Accepted | 4 specialized agents |
| 008 | Gamification | ◐ Hybrid | Adaptive by user type |

See [evolutions/](../../evolutions/) for full test results.

## How to Contribute

1. **Add new commands**: Create new `.md` files in the `commands/` directory
2. **Extend subagents**: Add new capabilities in `subagents/` directory
3. **Run experiments**: Use the `evolutions/` framework to test improvements
4. **Submit PRs**: Follow the existing patterns and documentation style

## Documentation

- **Website**: https://algiras.github.io/memory-palace/
- **Paper**: https://algiras.github.io/memory-palace/book/
- **Getting Started**: https://algiras.github.io/memory-palace/getting-started/
- **SKILL.md](SKILL.md) - Full reference
- [Root README](../../README.md) - Project overview

## Version

Production v1.0 - 8 evolutions, 99% fitness

## License

MIT License - See [LICENSE](../../LICENSE) for details.
