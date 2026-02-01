# Red Queen Command Handler

## Command
`/memory-palace red-queen [strategy]`

## Strategies
- `random` (default) - Random sampling across palace
- `weak-spots` - Focus on auto-detected low-confidence memories
- `auto` - Let decay model choose optimal targets (NEW)
- `depth-first` - Systematic palace walkthrough
- `cross-link` - Questions connecting multiple concepts
- `adversarial` - Edge cases and failure modes

## Auto Weak Spot Selection (NEW)

When `weak-spots` or `auto` strategy is used, the system automatically prioritizes memories using the decay model:

```
Priority Score =
  (1 - confidence) * 0.4 +           # Lower confidence = higher priority
  decayRate * 0.3 +                   # Faster decay = higher priority
  (daysSinceReview / 30) * 0.2 +     # Longer since review = higher priority
  interviewRelevance * 0.1            # More relevant to interviews = higher priority
```

### Auto-Detection Triggers
A memory becomes a weak spot when ANY of these are true:
- Current confidence < 70%
- Predicted confidence in 3 days < 50%
- Decay rate > 15% per week
- Last review > 7 days ago AND not mastered

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  RED QUEEN ORCHESTRATOR                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
     1. Load Context       │
        ┌──────────────────┴──────────────────┐
        │ • Determine context (global/project) │
        │ • Load palace-registry.json          │
        │ • Load meta-index.md                 │
        │ • Load learning-journal.md           │
        │ • Load spaced-repetition.json        │
        │ • Identify active palace             │
        │ • Calculate decay predictions        │
        │ • Auto-detect weak spots (NEW)       │
        └──────────────────┬──────────────────┘
                           │
     2. Launch Examiner    │
        ┌──────────────────┴──────────────────┐
        │ Task tool with:                      │
        │ • subagent_type: "general-purpose"   │
        │ • model: "haiku"                     │
        │ • prompt: examiner template          │
        │ • inputs: palace, strategy, weak_spots│
        └──────────────────┬──────────────────┘
                           │
     3. Launch Learner     │
        ┌──────────────────┴──────────────────┐
        │ Task tool with:                      │
        │ • subagent_type: "general-purpose"   │
        │ • model: "haiku"                     │
        │ • prompt: learner template           │
        │ • inputs: questions, anchors ONLY    │
        └──────────────────┬──────────────────┘
                           │
     4. Launch Evaluator   │
        ┌──────────────────┴──────────────────┐
        │ Task tool with:                      │
        │ • subagent_type: "general-purpose"   │
        │ • model: "haiku"                     │
        │ • prompt: evaluator template         │
        │ • inputs: ground_truth, answers      │
        └──────────────────┬──────────────────┘
                           │
     5. Optional: Evolver  │
        ┌──────────────────┴──────────────────┐
        │ If gaps found, Task tool with:       │
        │ • subagent_type: "general-purpose"   │
        │ • model: "opus"                      │
        │ • prompt: evolver template           │
        │ • inputs: weak_memories, gaps        │
        └──────────────────┬──────────────────┘
                           │
     6. Update State       │
        ┌──────────────────┴──────────────────┐
        │ • Update learning-journal.md         │
        │ • Update enhanced-memories.json      │
        │ • Update meta-index.md with anchors  │
        │ • Update spaced repetition schedule  │
        └─────────────────────────────────────┘
```

## Implementation

```python
# Pseudo-code for Red Queen execution

async def red_queen(strategy="random"):
    # 1. Load context
    context = detect_context()  # global or project
    palace = load_active_palace(context)
    meta_index = load_meta_index(context)
    journal = load_learning_journal(context)
    spaced_rep = load_spaced_repetition(context)

    # Auto-detect weak spots using decay model (NEW)
    weak_spots = auto_detect_weak_spots(spaced_rep)

def auto_detect_weak_spots(spaced_rep):
    """
    Auto-prioritize memories for review using decay model.
    Returns list sorted by priority score (highest first).
    """
    weak_spots = []
    today = datetime.now()

    for memory_id, memory in spaced_rep.memories.items():
        # Calculate days since last review
        last_review = datetime.parse(memory.lastReview)
        days_since = (today - last_review).days

        # Calculate current predicted confidence
        predicted = memory.currentConfidence * math.exp(-days_since * memory.decayRate)

        # Check if memory qualifies as weak spot
        is_weak = (
            memory.currentConfidence < 0.70 or
            memory.predictedConfidence.in3Days < 0.50 or
            memory.decayRate > 0.15 or
            (days_since > 7 and memory.status != "mastered")
        )

        if is_weak:
            # Calculate priority score
            priority_score = (
                (1 - memory.currentConfidence) * 0.4 +
                memory.decayRate * 0.3 +
                min(days_since / 30, 1) * 0.2 +
                memory.get("interviewRelevance", 0.5) * 0.1
            )
            weak_spots.append({
                "id": memory_id,
                "concept": memory.concept,
                "priority_score": priority_score,
                "current_confidence": memory.currentConfidence,
                "predicted_3d": memory.predictedConfidence.in3Days,
                "decay_rate": memory.decayRate,
                "reason": memory.get("weakSpotReason", "Auto-detected via decay model")
            })

    # Sort by priority score descending
    return sorted(weak_spots, key=lambda x: x["priority_score"], reverse=True)

    # 2. Launch Examiner
    examiner_result = await Task(
        description="Examiner: generate questions",
        subagent_type="general-purpose",
        model="haiku",
        prompt=format_examiner_prompt(
            palace=palace,
            strategy=strategy,
            weak_spots=weak_spots,
            question_count=5
        )
    )
    questions = parse_questions(examiner_result)

    # 3. Launch Learner (with anchors only, NOT full palace)
    learner_result = await Task(
        description="Learner: blind recall",
        subagent_type="general-purpose",
        model="haiku",
        prompt=format_learner_prompt(
            questions=questions,
            anchors=meta_index.get_anchors()  # Only anchors!
        )
    )
    answers = parse_answers(learner_result)

    # 4. Launch Evaluator
    evaluator_result = await Task(
        description="Evaluator: score accuracy",
        subagent_type="general-purpose",
        model="haiku",
        prompt=format_evaluator_prompt(
            ground_truth=palace.get_memory_content(),
            learner_answers=answers
        )
    )
    evaluation = parse_evaluation(evaluator_result)

    # 5. Optional: Launch Evolver if gaps found
    if evaluation.has_priority_gaps():
        evolver_result = await Task(
            description="Evolver: strengthen weak images",
            subagent_type="general-purpose",
            model="opus",  # Opus for creativity
            prompt=format_evolver_prompt(
                weak_memories=evaluation.priority_gaps,
                gap_analysis=evaluation.evaluations
            )
        )
        enhanced = parse_enhanced_memories(evolver_result)
        save_enhanced_memories(enhanced, context)

    # 6. Update state
    journal.add_session(evaluation)
    journal.update_weak_spots(evaluation.priority_gaps)
    journal.update_spaced_repetition()
    save_learning_journal(journal, context)

    return evaluation
```

## Example Session Output

```
🔴 RED QUEEN PROTOCOL - Session #3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strategy: weak-spots
Context: global
Palace: System Design Citadel

📝 EXAMINER generated 5 questions targeting weak spots

🎓 LEARNER attempted blind recall...

📊 EVALUATOR Results:
┌────────────────────┬───────┬─────────────────────────┐
│ Question           │ Score │ Gap                     │
├────────────────────┼───────┼─────────────────────────┤
│ CAP Theorem        │ 92%   │ -                       │
│ Write-Behind Cache │ 68%   │ Missing crash scenario  │
│ Consistent Hashing │ 85%   │ Virtual nodes weak      │
│ Two-Phase Commit   │ 71%   │ Blocking horror missing │
│ Thundering Herd    │ 78%   │ Stampede not visceral   │
└────────────────────┴───────┴─────────────────────────┘

Overall: 79% (up from 75% last session)

🧬 EVOLVER strengthened 3 weak memories
   • Write-Behind: Added bus crash image
   • 2PC: Enhanced eternal wedding horror
   • Thundering Herd: Added bone-cracking stampede

📔 Learning journal updated
⏰ Next review due: 2026-02-04
```
