---
name: memory-palace
description: Build and navigate hierarchical memory palaces using the method of loci. Use when memorizing information, creating knowledge structures, studying, or recalling stored memories. Triggers on "remember this", "memorize", "create memory palace", "recall", "what did I store", "memory palace", "red queen".
license: MIT
metadata:
  author: Algiras
  version: "2.0.0"
---

# Memory Palace Skill

Transform information into unforgettable memories using the ancient method of loci combined with the Red Queen adversarial learning protocol.

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

## Best Practices

1. **Start small**: 5-7 loci per palace initially
2. **Review regularly**: Run red-queen weekly
3. **Connect palaces**: Link related memories across palaces
4. **Personalize**: More personal = stronger memory
5. **All senses**: Sound, smell, texture, taste, not just visual
6. **Trust the absurd**: Impossible images stick better
