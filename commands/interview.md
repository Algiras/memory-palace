# Interview Mode Command

## Command
`/memory-palace interview [topic] [duration]`

## Purpose
Rapid-fire Q&A simulation for interview preparation. Time-pressured recall builds confidence and identifies gaps under stress.

## Quick Start Examples
```
/memory-palace interview                    # 5-minute quick review, all topics
/memory-palace interview caching 5m         # 5-minute focus on caching
/memory-palace interview distributed 15m    # 15-minute distributed systems
/memory-palace interview all 45m            # Full 45-minute simulation
```

## Modes

### Quick Review (5m or 5min)
- 10 questions
- 30 seconds per question
- Focus: Core concepts only
- **Use case**: Morning warmup, quick refresh before calls

### Standard Practice (15m or 15min)
- 25 questions
- 35 seconds per question
- Focus: Concepts + comparisons
- **Use case**: Daily practice, interview prep

### Full Simulation (45m or 45min)
- 50 questions
- 45 seconds per question
- Focus: Scenarios + deep dives + cross-cutting
- **Use case**: Mock interview, comprehensive review

## Question Types

| Type | Weight | Example |
|------|--------|---------|
| Definition | 20% | "What is consistent hashing?" |
| Comparison | 25% | "Compare 2PC vs Saga pattern" |
| Trade-off | 20% | "When would you choose AP over CP?" |
| Scenario | 25% | "Design a cache strategy for..." |
| Failure Mode | 10% | "What happens if the coordinator dies in 2PC?" |

## Execution Flow

```
1. SETUP
   ├── Parse duration (5m, 15m, 45m)
   ├── Select topic(s) or "all"
   ├── Load spaced-repetition.json for weak spots
   ├── Load memory-graph.json for related concepts
   ├── PRIORITIZE: weak spots first (auto-detected)
   └── Generate question queue via Interviewer agent

2. RAPID FIRE (with real timers)
   ┌─────────────────────────────────────────────┐
   │ 🎯 Q1/10: What is the CAP theorem?          │
   │                                              │
   │ ⏱️ 30s │████████████████░░░░│ 18s remaining │
   │                                              │
   │ Type your answer or:                         │
   │ [s]kip  [h]int (anchor)  [q]uit             │
   └─────────────────────────────────────────────┘

   For each question:
   ├── Start countdown timer (visual)
   ├── Show question type indicator
   ├── Wait for answer or timeout
   ├── Record response time (affects score)
   ├── Brief feedback (correct/incorrect)
   └── Move to next immediately

3. QUESTION PRIORITIZATION (NEW)
   - 40% from weak spots (confidence < 70%)
   - 30% from decaying memories (predicted < 60% in 3 days)
   - 20% from core concepts (high interview relevance)
   - 10% random (prevent overfitting)

4. EVALUATION (via Evaluator agent)
   ├── Batch process all answers
   ├── Score accuracy (0-100%)
   ├── Apply time multiplier
   ├── Identify gaps and patterns
   └── Update spaced-repetition.json

5. RESULTS DASHBOARD
   ┌─────────────────────────────────────────────┐
   │ 📊 INTERVIEW SIMULATION RESULTS             │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │                                              │
   │ Score: 78% (8/10 correct)                   │
   │ Avg Response: 18.3s                          │
   │ Time Score: 1.05x (fast recall bonus)       │
   │ Final Score: 82%                             │
   │                                              │
   │ 📈 STATUS: READY (>75%)                     │
   │                                              │
   │ ✅ STRONG AREAS:                            │
   │    CAP theorem, caching strategies          │
   │                                              │
   │ ⚠️ WEAK AREAS:                              │
   │    distributed transactions (60%)           │
   │                                              │
   │ 🔴 PRIORITY REVIEW:                         │
   │    1. Two-Phase Commit - blocking scenario  │
   │    2. Saga Pattern - compensation flow      │
   │                                              │
   │ 💡 Recommended:                              │
   │    /memory-palace red-queen weak-spots      │
   └─────────────────────────────────────────────┘
```

## Readiness Metrics

| Score | Status | Recommendation |
|-------|--------|----------------|
| 90%+ | EXCELLENT | Ready for senior roles |
| 75-89% | READY | Good for most interviews |
| 60-74% | REVIEW | Focus on weak areas |
| <60% | NOT READY | More study needed |

## Response Time Scoring

| Time | Multiplier | Interpretation |
|------|------------|----------------|
| <10s | 1.2x | Instant recall - well mastered |
| 10-20s | 1.0x | Good recall - solid understanding |
| 20-35s | 0.9x | Slow recall - needs reinforcement |
| >35s | 0.7x | Struggled - priority for review |

## Implementation

```python
async def interview_mode(topic="all", duration=15):
    # 1. Setup
    memories = load_memories_by_topic(topic)
    question_count = duration_to_questions(duration)
    questions = generate_interview_questions(memories, question_count)

    results = []

    # 2. Rapid fire loop
    for i, question in enumerate(questions):
        print(f"Q{i+1}/{question_count}: {question.text}")
        print(f"⏱️ {question.time_limit}s")

        start = time.now()
        answer = await get_user_answer(timeout=question.time_limit)
        response_time = time.now() - start

        results.append({
            "question": question,
            "answer": answer,
            "response_time": response_time,
            "skipped": answer is None
        })

    # 3. Batch evaluation
    evaluations = await Task(
        description="Evaluate interview answers",
        subagent_type="general-purpose",
        model="haiku",
        prompt=format_batch_evaluation(questions, results)
    )

    # 4. Calculate metrics
    score = calculate_score(evaluations, results)
    readiness = determine_readiness(score)
    weak_areas = identify_weak_areas(evaluations)

    # Update spaced repetition
    update_spaced_repetition(results, evaluations)

    return InterviewResults(
        score=score,
        readiness=readiness,
        weak_areas=weak_areas,
        response_times=results
    )
```

## Sample Questions by Topic

### CAP Theorem
- "Explain CAP theorem in 30 seconds"
- "Give an example of a CP system and why"
- "When would you choose AP over CP?"

### Caching
- "Compare cache-aside vs write-through"
- "What causes thundering herd and how do you prevent it?"
- "Design a caching strategy for a social media feed"

### Distributed Transactions
- "Why is 2PC problematic? What's the alternative?"
- "Walk me through a Saga with compensating transactions"
- "How do you handle partial failures in microservices?"

### Scaling
- "When would you scale vertically vs horizontally?"
- "Design a system to handle 10x traffic spike"
- "How does consistent hashing help with scaling?"
