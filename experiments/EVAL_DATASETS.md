# Memory Palace Evaluation Datasets

## Dataset Categories

We need datasets to evaluate 4 aspects of the Memory Palace system:

| Aspect | What to Test | Relevant Datasets |
|--------|--------------|-------------------|
| **Retrieval** | Can we find the right memory? | RAG benchmarks |
| **Recall Accuracy** | Is the recalled content correct? | QA benchmarks |
| **Memory Decay** | Does spaced repetition work? | Flashcard logs |
| **Domain Coverage** | Do we cover interview topics? | Tech interview sets |

---

## 1. RAG / Retrieval Evaluation

### RAGBench (rungalileo/ragbench)
- **URL**: https://huggingface.co/datasets/rungalileo/ragbench
- **Size**: 100,000 examples
- **Use Case**: Test if hierarchical index retrieves correct memories
- **Metrics**: Retrieval precision, context relevance

### Open RAGBench (vectara/open_ragbench)
- **URL**: https://huggingface.co/datasets/vectara/open_ragbench
- **Size**: 1,000 PDFs, 3,045 QA pairs
- **Use Case**: Test semantic search across technical documents
- **Metrics**: Answer accuracy, retrieval F1

### MultiHop-RAG
- **URL**: https://github.com/yixuantt/MultiHop-RAG
- **Size**: Multi-document reasoning
- **Use Case**: Test graph-based memory traversal
- **Metrics**: Multi-hop accuracy, path correctness

### RAGAS Framework
- **URL**: https://huggingface.co/papers/2309.15217
- **Type**: Evaluation framework (not dataset)
- **Use Case**: Automated RAG evaluation without ground truth
- **Metrics**: Faithfulness, answer relevancy, context precision

---

## 2. Knowledge Recall / QA

### RepLiQA (ServiceNow/repliqa)
- **URL**: https://huggingface.co/datasets/ServiceNow/repliqa
- **Size**: 5 test splits, novel content
- **Use Case**: Test recall on UNSEEN content (anti-contamination)
- **Why Perfect**: Content not in LLM training data = true retrieval test
- **Metrics**: Exact match, F1 score

### TriviaQA
- **URL**: https://huggingface.co/datasets/trivia_qa
- **Size**: 95,000 QA pairs
- **Use Case**: Test factual knowledge recall
- **Metrics**: Accuracy, partial match

### SQuAD 2.0
- **URL**: https://huggingface.co/datasets/squad_v2
- **Size**: 150,000 questions
- **Use Case**: Test reading comprehension from retrieved context
- **Metrics**: Exact match, F1

### GroUSE (illuin/grouse)
- **URL**: https://huggingface.co/datasets/illuin/grouse
- **Use Case**: Evaluate grounded QA (answer from given context)
- **Metrics**: Groundedness score

---

## 3. Spaced Repetition / Memory Decay

### FSRS-Anki-20k ⭐ HIGHLY RELEVANT
- **URL**: https://huggingface.co/datasets/open-spaced-repetition/FSRS-Anki-20k
- **Size**: 1.7 BILLION reviews from 20k users
- **Use Case**: Validate our decay model against real human memory data
- **Contains**: Review timestamps, difficulty ratings, intervals, retention
- **Why Perfect**: Ground truth for Ebbinghaus forgetting curves

### Student Memory Logs (Maimemo/student-memory-logs)
- **URL**: https://huggingface.co/datasets/Maimemo/student-memory-logs
- **Use Case**: Validate spaced repetition scheduling
- **Research**: "Optimizing Spaced Repetition Schedule by Capturing the Dynamics of Memory"

### Medical Flashcards (medalpaca/medical_meadow_medical_flashcards)
- **URL**: https://huggingface.co/datasets/medalpaca/medical_meadow_medical_flashcards
- **Use Case**: Test mnemonic-style Q&A format
- **Format**: Question-answer pairs with mnemonics

---

## 4. Technical Interview / Domain Knowledge

### Interview Questions (Aiman1234/Interview-questions)
- **URL**: https://huggingface.co/datasets/Aiman1234/Interview-questions
- **Use Case**: Test coverage of interview topics
- **Format**: Questions with expected answers

### AI Interview Questions (K-areem/AI-Interview-Questions)
- **URL**: https://huggingface.co/datasets/K-areem/AI-Interview-Questions
- **Use Case**: Test technical concept coverage
- **Format**: Q&A pairs

### Interview with Context (andmev/interview-question-with-context)
- **URL**: https://huggingface.co/datasets/andmev/interview-question-with-context
- **Use Case**: Test contextual recall (like our palace context)

---

## Evaluation Plan

### Phase 1: Retrieval Accuracy
```
Dataset: RAGBench (subset)
Test: Given query, does hierarchical index return correct memory?
Metrics:
- Retrieval@1 (first result correct)
- Retrieval@5 (correct in top 5)
- Index hop efficiency (should be ≤2)
```

### Phase 2: Recall Accuracy
```
Dataset: RepLiQA (novel content test)
Test: Store content → Query → Compare to ground truth
Metrics:
- Exact match rate
- Semantic similarity (embeddings)
- Verify token presence (anti-hallucination)
```

### Phase 3: Memory Decay Model
```
Dataset: FSRS-Anki-20k
Test: Compare our C(t) = C0 * e^(-t*decay) to real retention data
Metrics:
- Predicted vs actual retention
- Optimal review scheduling
- Weak spot detection accuracy
```

### Phase 4: Coverage Audit
```
Dataset: Interview-questions
Test: What % of interview topics do we have memories for?
Metrics:
- Topic coverage rate
- Gap identification
- Suggested additions
```

---

## Quick Start Commands

```bash
# Install datasets library
pip install datasets

# Load RAGBench
from datasets import load_dataset
ragbench = load_dataset("rungalileo/ragbench")

# Load FSRS (spaced repetition gold standard)
fsrs = load_dataset("open-spaced-repetition/FSRS-Anki-20k")

# Load RepLiQA (anti-contamination QA)
repliqa = load_dataset("ServiceNow/repliqa")

# Load interview questions
interviews = load_dataset("Aiman1234/Interview-questions")
```

---

## Priority Order

| Priority | Dataset | Why |
|----------|---------|-----|
| 🥇 P0 | FSRS-Anki-20k | Validates our core decay model |
| 🥈 P1 | RepLiQA | Tests true retrieval (not memorized) |
| 🥉 P2 | RAGBench subset | Tests hierarchical index |
| P3 | Interview-questions | Domain coverage audit |

---

## Expected Outcomes

### Success Criteria
- Retrieval@1 > 80% on hierarchical index
- Recall accuracy > 85% with verify tokens
- Decay model within 10% of FSRS ground truth
- Interview topic coverage > 70%

### Regression Detection
- If retrieval drops, check index integrity
- If recall drops, check compression level
- If decay diverges, recalibrate model
- If coverage drops, add missing memories

---

## Sources

- [RAGBench Paper](https://huggingface.co/papers/2407.11005)
- [Open RAGBench](https://huggingface.co/datasets/vectara/open_ragbench)
- [RepLiQA](https://huggingface.co/datasets/ServiceNow/repliqa)
- [RAGAS Framework](https://huggingface.co/papers/2309.15217)
- [FSRS-Anki-20k](https://huggingface.co/datasets/open-spaced-repetition/FSRS-Anki-20k)
- [SRS Benchmark](https://github.com/open-spaced-repetition/srs-benchmark)
- [Maimemo Memory Logs](https://huggingface.co/datasets/Maimemo/student-memory-logs)
