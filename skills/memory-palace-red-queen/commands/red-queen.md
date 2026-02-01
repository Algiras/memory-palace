# Red Queen Command Handler

## Command
`/memory-palace red-queen [strategy]`

## Strategies
- `random` (default) - Random sampling across palace
- `weak-spots` - Focus on low-confidence memories
- `depth-first` - Systematic palace walkthrough
- `cross-link` - Questions connecting multiple concepts
- `adversarial` - Edge cases and failure modes

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
        │ • Identify active palace             │
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

    # Get weak spots from journal
    weak_spots = journal.get_weak_spots()

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
