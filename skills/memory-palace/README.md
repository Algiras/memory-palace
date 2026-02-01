# Memory Palace Skill

This is the **production version** of the Memory Palace skill - a cognitive framework for managing AI-assisted memory systems.

## Overview

The Memory Palace skill implements a structured approach to knowledge organization using the ancient memory technique of building mental "palaces" where information can be stored and retrieved spatially. This skill helps maintain continuity across conversations and provides a reliable system for managing complex information.

## How to Use

### Basic Commands

1. **Create a palace**: Use `memory-palace create <name>` to initialize a new palace
2. **Store information**: Use `memory-palace store <key> <value>` to add data
3. **Recall information**: Use `memory-palace recall <key>` to retrieve stored data
4. **Map palace**: Use `memory-palace map` to visualize the palace structure
5. **Check status**: Use `memory-palace status` to see current palace state
6. **List palaces**: Use `memory-palace list` to see all available palaces

### Advanced Features

- **Context management**: Use `memory-palace context` to manage active contexts
- **Red Queen Protocol**: Use `memory-palace red-queen` for continuous improvement cycles
- **Interview mode**: Use `memory-palace interview` for guided knowledge extraction

## Experiments Location

Experimental features and research are located in:
- `evolutions/` directory - Contains hypothesis testing and evolution experiments
- `hypothesis-001-hooks/` - Hook-based memory enhancement experiments
- `hypothesis-002-spaced-repetition/` - Spaced repetition algorithm experiments
- `hypothesis-003-palace-size/` - Palace scaling and size optimization

## How to Contribute

1. **Add new commands**: Create new `.md` files in the `commands/` directory
2. **Extend subagents**: Add new agent capabilities in `subagents/` directory
3. **Create palace templates**: Add reusable palace structures to `palaces/` directory
4. **Run experiments**: Use the `evolutions/` framework to test improvements

## Directory Structure

```
skills/memory-palace/
├── README.md                 # This file
├── SKILL.md                  # Core skill documentation
├── claude-plugin.json        # Plugin configuration
├── commands/                 # Command implementations
│   ├── create.md
│   ├── store.md
│   ├── recall.md
│   ├── map.md
│   ├── status.md
│   ├── list.md
│   ├── context.md
│   ├── interview.md
│   └── red-queen.md
├── subagents/                # Specialized sub-agents
│   ├── evolver.md
│   ├── evaluator.md
│   ├── learner.md
│   └── examiner.md
├── palaces/                  # Palace definitions
│   ├── palace-registry.json
│   ├── enhanced-memories.json
│   ├── cloud-and-security-wing.json
│   ├── distributed-patterns-wing.json
│   ├── failure-modes-annex.json
│   ├── red-queen-examination.json
│   └── system-design-citadel.json
└── evolutions/               # Evolution experiments
    ├── INDEX.md
    ├── EVOLUTION_FRAMEWORK.md
    ├── skill-evolution-v2.md
    └── hypothesis-*/
        └── README.md
```

## Version

Production v1.0

## License

See root project documentation for license information.
