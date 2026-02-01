# Interviewer Subagent

## Purpose
Fast question generation for interview rapid-fire mode. Uses haiku model for speed.

## Agent Configuration

```yaml
name: Interviewer
model: haiku
role: Generate rapid-fire interview questions
speed: < 2 seconds per question batch
```

## Invocation

```python
Task(
    description="Generate interview questions",
    subagent_type="general-purpose",
    model="haiku",
    prompt=format_interviewer_prompt(
        memories=selected_memories,
        question_count=10,
        weak_spots=weak_spots,
        mode="quick"  # quick | standard | full
    )
)
```

## Prompt Template

```markdown
You are an expert technical interviewer generating rapid-fire questions for system design interview prep.

## Context
- Mode: {mode} (quick=definitions, standard=+comparisons, full=+scenarios)
- Questions needed: {question_count}
- Time limit per question: {time_limit}s

## Memories to Test
{for each memory}
- **{concept}**: {definition} (confidence: {confidence}%)
  - Anchor: {anchor}
  - Weak spot reason: {weak_spot_reason or "none"}
{end for}

## Weak Spots (PRIORITIZE THESE)
{weak_spots_list}

## Question Types by Mode

### Quick Mode (30s answers)
- Definition: "What is X?"
- One-liner: "Explain X in one sentence"
- Anchor recall: "Your anchor is '{anchor}'. What concept?"

### Standard Mode (+35s answers)
- Comparison: "Compare X vs Y"
- Trade-off: "When would you choose X over Y?"
- Relationship: "How does X relate to Y?"

### Full Mode (+45s answers)
- Scenario: "Design a caching strategy for..."
- Failure: "What happens when X fails?"
- Deep dive: "Walk me through how X works internally"

## Output Format

Return JSON array:
```json
[
  {
    "id": 1,
    "question": "What is the CAP theorem?",
    "type": "definition",
    "target_memory": "cap-theorem",
    "time_limit": 30,
    "expected_points": ["consistency", "availability", "partition tolerance", "pick 2 of 3"],
    "anchor_hint": "Three-headed dragon",
    "difficulty": "easy"
  },
  {
    "id": 2,
    "question": "Compare Two-Phase Commit vs Saga pattern",
    "type": "comparison",
    "target_memories": ["two-phase-commit", "saga-pattern"],
    "time_limit": 35,
    "expected_points": ["2PC blocks", "saga compensates", "2PC coordinator SPOF", "saga eventual consistency"],
    "anchor_hint": "Wedding vs relay race",
    "difficulty": "medium"
  }
]
```

## Rules
1. PRIORITIZE weak spots - 40% of questions should target low-confidence memories
2. Vary question types to test different recall patterns
3. Include anchor hints for optional use
4. Expected points should be 3-5 key things per answer
5. Keep questions concise - interviewee should understand in <5 seconds
6. For comparisons, always ask about BOTH concepts
7. Difficulty should match time limit (easy=30s, medium=35s, hard=45s)
```

## Response Time Scoring

| Response Time | Multiplier | Interpretation |
|---------------|------------|----------------|
| < 10s         | 1.2x       | Instant recall - mastered |
| 10-20s        | 1.0x       | Good recall - solid |
| 20-30s        | 0.9x       | Slow recall - reinforce |
| 30-45s        | 0.8x       | Struggled - needs work |
| > 45s / skip  | 0.5x       | Gap identified |

## Question Distribution Algorithm

```python
def generate_question_queue(memories, weak_spots, count, mode):
    queue = []

    # 40% from weak spots
    weak_count = int(count * 0.4)
    weak_questions = generate_questions(weak_spots[:weak_count], mode)
    queue.extend(weak_questions)

    # 30% from decaying memories (will be weak soon)
    decay_count = int(count * 0.3)
    decaying = get_decaying_memories(memories)
    decay_questions = generate_questions(decaying[:decay_count], mode)
    queue.extend(decay_questions)

    # 20% core concepts (high interview relevance)
    core_count = int(count * 0.2)
    core = get_core_concepts(memories)
    core_questions = generate_questions(core[:core_count], mode)
    queue.extend(core_questions)

    # 10% random (prevent overfitting)
    random_count = count - len(queue)
    remaining = [m for m in memories if m not in queue]
    random_questions = generate_questions(random.sample(remaining, random_count), mode)
    queue.extend(random_questions)

    # Shuffle to prevent predictability
    random.shuffle(queue)

    return queue
```

## Integration with Other Agents

### Handoff to Evaluator
After interview completes, results go to Evaluator agent:

```python
evaluator_input = {
    "questions": questions,
    "answers": user_answers,
    "response_times": response_times,
    "expected_points": expected_points_per_question
}
```

### Feedback Loop to Evolver
If many questions on same topic failed, trigger Evolver:

```python
if topic_failure_rate > 0.5:
    trigger_evolver(
        weak_memories=failed_memories,
        gaps=identified_gaps
    )
```

## Example Session

```
> /memory-palace interview distributed 5m

🎯 INTERVIEW MODE: Quick Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Topic: Distributed Systems
Duration: 5 minutes
Questions: 10
Time per question: 30s

Loading weak spots... 2 found
Generating questions via Interviewer agent...

Ready? Press ENTER to start...

┌─────────────────────────────────────────────┐
│ Q1/10 [Definition] ⏱️ 30s                   │
│                                              │
│ What is the CAP theorem?                    │
│                                              │
│ [Type answer, 's' to skip, 'h' for hint]   │
└─────────────────────────────────────────────┘

> The CAP theorem states you can only have 2 of 3:
> consistency, availability, and partition tolerance

✅ Correct! (12.3s - fast recall bonus)
Key points hit: consistency ✓, availability ✓, partition ✓, 2-of-3 ✓

[ENTER for next question]

┌─────────────────────────────────────────────┐
│ Q2/10 [Comparison] ⏱️ 30s                   │
│                                              │
│ Compare 2PC vs Saga pattern                 │
│                                              │
│ [Type answer, 's' to skip, 'h' for hint]   │
└─────────────────────────────────────────────┘

> 2PC provides strong consistency but blocks if coordinator
> fails. Saga uses compensating transactions for eventual
> consistency without blocking.

✅ Correct! (24.1s)
Key points hit: 2PC blocks ✓, saga compensates ✓, consistency ✓

...continues...
```

## Timeout Handling

```python
async def handle_question(question, time_limit):
    start = time.now()

    # Show countdown timer
    with countdown_display(time_limit):
        try:
            answer = await get_input_with_timeout(time_limit)
            response_time = time.now() - start
            return (answer, response_time, "answered")
        except TimeoutError:
            return (None, time_limit, "timeout")
        except SkipRequested:
            response_time = time.now() - start
            return (None, response_time, "skipped")
```
