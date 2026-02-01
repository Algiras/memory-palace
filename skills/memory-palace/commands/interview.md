# Interview Mode Command

## Command
`/memory-palace interview [topic] [duration]`

## Purpose
Rapid-fire Q&A simulation for interview preparation. Time-pressured recall builds confidence and identifies gaps under stress.

## Modes

### Quick Review (5 min)
- 10 questions
- 30 seconds per question
- Focus: Core concepts only

### Standard Practice (15 min)
- 25 questions
- 35 seconds per question
- Focus: Concepts + comparisons

### Full Simulation (45 min)
- 50 questions
- 45 seconds per question
- Focus: Scenarios + deep dives + cross-cutting

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
   ├── Select topic(s) or "all"
   ├── Select duration/mode
   ├── Load relevant memories from graph
   └── Generate question queue

2. RAPID FIRE
   ┌─────────────────────────────────────┐
   │ Q1/25: What is the CAP theorem?     │
   │ ⏱️ 35s remaining                     │
   │                                      │
   │ [Answer] [Skip] [Hint]              │
   └─────────────────────────────────────┘

   For each question:
   ├── Start timer
   ├── Show question + anchor hint (optional)
   ├── Capture answer or skip
   ├── Record response time
   └── Move to next

3. EVALUATION
   ├── Launch evaluator agent (parallel batches)
   ├── Score each answer
   ├── Calculate metrics
   └── Update spaced repetition

4. RESULTS
   ┌─────────────────────────────────────┐
   │ 📊 INTERVIEW SIMULATION RESULTS     │
   │                                      │
   │ Score: 78% (19/25 correct)          │
   │ Avg Response: 22.3s                  │
   │ Confidence: READY (>75%)            │
   │                                      │
   │ Strong: CAP, scaling, caching        │
   │ Weak: distributed transactions       │
   │                                      │
   │ 🔴 Focus Areas:                      │
   │ • Two-Phase Commit blocking          │
   │ • Saga compensation flow             │
   └─────────────────────────────────────┘
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
