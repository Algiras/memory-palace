# Memory Palace

A cognitive framework for AI-assisted memory systems using the ancient method of loci combined with modern spaced repetition and adversarial learning.

## Key Results

Memory Palace achieves significant improvements over state-of-the-art spaced repetition systems:

| Method | Decay MAE | Accuracy | Reviews/Card | Retention | Context |
|--------|-----------|----------|--------------|-----------|---------|
| SM-2 | 0.218 | 80.2% | 18.6 | 100% | Full |
| FSRS | 0.218 | 80.2% | 2.3 | 100% | Full |
| **Memory Palace** | **0.094** | **86.4%** | 3.7 | 100% | **1.2KB** |

**Highlights:**
- **57% lower** decay prediction error vs SM-2/FSRS
- **99%+ context reduction** with hierarchical retrieval
- **Personalized** encoding via SMASHIN SCOPE

## Method Comparison

![Method Comparison Radar](paper/figures/method_comparison_radar.png)

Memory Palace outperforms traditional methods across all key metrics:
- **Decay Prediction**: Better accuracy at predicting memory strength
- **Learning Efficiency**: Fewer reviews needed per card
- **Context Reduction**: Hierarchical index vs flat scan
- **Resilience**: Robust to context loss
- **Personalization**: Adaptive to individual encoding styles

## Context Efficiency

![Context Reduction](paper/figures/context_reduction.png)

The hierarchical 2-hop retrieval system reduces context window usage by 75-99% compared to flat RAG approaches, enabling efficient scaling to thousands of memories.

## SMASHIN SCOPE Encoding

![SMASHIN SCOPE Effect](paper/figures/smashin_scope_effect.png)

The SMASHIN SCOPE mnemonic encoding system dramatically reduces memory decay:
- **S**ubstitute, **M**ovement, **A**bsurd, **S**ensory, **H**umor, **I**nteract, **N**umbers
- **S**ymbols, **C**olor, **O**versize, **P**osition, **E**motion

Higher SMASHIN scores correlate with slower decay rates and better retention.

## Learning Efficiency

![Learning Efficiency](paper/figures/learning_efficiency.png)

Memory Palace with full SMASHIN SCOPE encoding (S=12) achieves optimal learning efficiency: high retention with minimal reviews.

## Quick Start

```bash
# Create a palace
/memory-palace create "TypeScript Mastery" "Ancient Library"

# Store information
/memory-palace store "generics"

# Recall with semantic search
/memory-palace recall

# Run adversarial testing
/memory-palace red-queen weak-spots
```

## Architecture

```
~/memory/
├── config.json              # System configuration
├── global/                  # Cross-project knowledge
│   ├── palace-registry.json
│   ├── meta-index.md
│   └── *.json               # Palaces
└── project/{id}/            # Project-specific knowledge
```

## Red Queen Protocol

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

## Commands

| Command | Description |
|---------|-------------|
| `/memory-palace create <name>` | Create a new memory palace |
| `/memory-palace store <topic>` | Store a memory in current palace |
| `/memory-palace recall [topic]` | Walk through with semantic search |
| `/memory-palace define <concept>` | Instant one-sentence lookup |
| `/memory-palace navigate` | Cross-palace exploration with heat maps |
| `/memory-palace red-queen` | Run adversarial recall testing |
| `/memory-palace interview` | Timed rapid-fire Q&A mode |
| `/memory-palace status` | Show memory statistics |

## Installation

The Memory Palace skill is available as a Claude Code plugin:

```bash
# Install the skill
claude skill install memory-palace
```

Or use the skill files directly from `skills/memory-palace/`.

## Benchmarks

Run benchmarks to compare retrieval methods:

```bash
cd paper/code
python -m venv .venv
source .venv/bin/activate
pip install numpy pandas matplotlib seaborn

# Local Ollama benchmark
python ollama_benchmark.py

# Cloud Gemini benchmark (requires API key)
# Add GEMINI_API_KEY to .env
python gemini_benchmark.py

# Generate visualizations
python visualize_results.py
```

## Documentation

- [SKILL.md](SKILL.md) - Full skill documentation
- [red-queen-protocol.md](red-queen-protocol.md) - Adversarial testing protocol
- [skills/memory-palace/](skills/memory-palace/) - Plugin implementation
- [paper/](paper/) - Research paper and benchmarks

## Research

This project explores the intersection of:
- **Method of Loci**: Ancient memory technique using spatial encoding
- **Spaced Repetition**: Optimal review scheduling (SM-2, FSRS)
- **Adversarial Learning**: Red Queen protocol for continuous improvement
- **Hierarchical Retrieval**: Context-efficient RAG architecture

## License

MIT License - See LICENSE for details.
