# Red Queen Protocol

> "Now, here, you see, it takes all the running you can do, to keep in the same place."
> — The Red Queen, Through the Looking-Glass

## Concept

In evolutionary biology, the Red Queen hypothesis explains that organisms must constantly adapt just to maintain relative fitness against co-evolving competitors.

Applied to memory systems: **constant adversarial testing is required just to maintain knowledge** - without it, memories decay.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RED QUEEN ORCHESTRATOR                       │
│                   (coordinates the dance)                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   EXAMINER    │      │    LEARNER    │      │   EVALUATOR   │
│   (haiku)     │      │    (haiku)    │      │   (haiku)     │
│               │      │               │      │               │
│ Reads palace  │      │ Attempts to   │      │ Checks answer │
│ Generates Qs  │ ───► │ answer from   │ ───► │ Identifies    │
│ Picks strategy│      │ memory only   │      │ gaps/errors   │
└───────────────┘      └───────────────┘      └───────────────┘
                                                      │
                                                      ▼
                                              ┌───────────────┐
                                              │   EVOLVER     │
                                              │   (opus)      │
                                              │               │
                                              │ Creates new   │
                                              │ memories to   │
                                              │ fill gaps     │
                                              └───────────────┘
```

## Configuration

Memory source folder: `~/.claude/memory-palaces/`
(symlinked to project: `/Users/algimantask/Personal/memory-palace/palaces/`)

## Testing Strategies

### 1. Random Sampling
Pick random memories, test recall. Good for maintenance.

### 2. Weak Spot Focus
Target memories marked as weak in learning journal. Strengthen failures.

### 3. Depth-First Tour
Walk through palace in order, testing each locus. Comprehensive review.

### 4. Cross-Link Challenge
Ask questions that require connecting multiple concepts. Tests integration.

### 5. Adversarial Edge Cases
Generate tricky questions about failure modes, trade-offs, exceptions.

## Agent Prompts

### Examiner Agent
```
You are an examiner testing system design knowledge.
Read the memory palace and generate challenging questions.
Strategy: {strategy}
Focus on: {focus_area}
Difficulty: {difficulty}

DO NOT reveal answers. Ask questions that test:
1. Core concept recall
2. Comparison between similar concepts
3. Application to scenarios
4. Failure mode awareness
```

### Learner Agent
```
You are being tested on system design knowledge.
You may ONLY use what you can recall from memory.
DO NOT look up answers.
If unsure, say "I don't remember" - honesty is valued.

Question: {question}

Answer from memory, then rate your confidence (1-5).
```

### Evaluator Agent
```
You are evaluating a recall attempt.
Compare the learner's answer to the ground truth.

Ground Truth: {correct_answer}
Learner's Answer: {learner_answer}

Evaluate:
1. Accuracy (0-100%)
2. Key points missed
3. Misconceptions detected
4. Confidence calibration (was their confidence appropriate?)

Output: JSON with scores and gaps identified.
```

## Running the Protocol

Invoke with: `/memory-palace red-queen [strategy] [focus]`

Example session:
```
> /memory-palace red-queen weak-spot caching
Starting Red Queen Protocol...
Strategy: weak-spot
Focus: caching
Loading palace: system-design-citadel.json

[EXAMINER] Question 1:
Compare Write-Through and Write-Behind caching.
When would you choose each? What are the failure modes?

[LEARNER] Attempting recall...
Write-Through: dual clerk writing both hands... sync to cache and DB...
Write-Behind: procrastinator clerk with to-do pile...

[EVALUATOR] Score: 78%
Missed: specific failure mode for Write-Behind (data loss on crash)
Gap identified → adding to weak spots

[EVOLVER] Creating reinforcement memory...
Enhanced image for Write-Behind failure mode added.
```

## Metrics Tracked

- Questions asked per session
- Accuracy over time
- Weak spots identified
- Memories strengthened
- Confidence calibration score
