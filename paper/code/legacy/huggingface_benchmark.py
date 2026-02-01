#!/usr/bin/env python3
"""
HuggingFace Datasets Benchmark for Memory Retrieval

Uses real QA datasets from HuggingFace to test retrieval accuracy:
- SQuAD v2 (reading comprehension)
- NaturalQuestions (Google's real queries)
- TriviaQA (trivia facts)

This provides external validation of the Memory Palace retrieval approach
using industry-standard benchmarks.
"""

import json
import os
import random
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from datetime import datetime

import os
from pathlib import Path

# Load .env file if present
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

try:
    from datasets import load_dataset
except ImportError:
    print("Please install datasets: pip install datasets")
    exit(1)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class Memory:
    id: str
    topic: str  # question summary / title
    content: str  # answer / context
    anchor: str  # context snippet
    image: str  # full context (simulating memory palace image)
    verify_token: str
    domain: str


# =============================================================================
# DATASET LOADERS
# =============================================================================

def load_squad_v2(n_samples: int = 500) -> Tuple[List[Memory], List[Tuple[str, str]]]:
    """
    Load SQuAD v2 dataset and convert to Memory format.
    Returns (memories, list of (question, expected_memory_id))
    """
    print(f"Loading SQuAD v2 (up to {n_samples} samples)...")

    dataset = load_dataset("rajpurkar/squad_v2", split="validation")

    memories = []
    queries = []
    seen_contexts = set()

    # Group by context to create memory "domains"
    context_to_domain = {}
    domain_counter = 0

    for i, item in enumerate(dataset):
        if len(memories) >= n_samples:
            break

        context = item['context']
        question = item['question']
        answers = item['answers']['text']

        # Skip unanswerable questions (SQuAD v2 has these)
        if not answers:
            continue

        answer = answers[0]

        # Create unique memory ID
        mem_id = f"squad-{i:05d}"

        # Assign domain based on context
        context_hash = hash(context[:100])
        if context_hash not in context_to_domain:
            context_to_domain[context_hash] = f"domain-{domain_counter:03d}"
            domain_counter += 1

        domain = context_to_domain[context_hash]

        # Create verify token from answer
        verify_token = f"{len(answer.split())}-{answer[:8].lower().replace(' ', '')}"

        # Build memory
        memories.append(Memory(
            id=mem_id,
            topic=question,  # Use question as topic for retrieval
            content=answer,
            anchor=context[:100],  # First 100 chars as anchor
            image=f"Context: {context}. Answer: {answer}. [Verify: {verify_token}]",
            verify_token=verify_token,
            domain=domain
        ))

        queries.append((question, mem_id))

    print(f"  Loaded {len(memories)} memories from {domain_counter} domains")
    return memories, queries


def load_natural_questions(n_samples: int = 500) -> Tuple[List[Memory], List[Tuple[str, str]]]:
    """
    Load Natural Questions dataset.
    """
    print(f"Loading Natural Questions (up to {n_samples} samples)...")

    try:
        dataset = load_dataset("google-research-datasets/natural_questions", "default",
                              split="validation", trust_remote_code=True)
    except Exception as e:
        print(f"  Could not load Natural Questions: {e}")
        return [], []

    memories = []
    queries = []
    domain_counter = 0

    for i, item in enumerate(dataset):
        if len(memories) >= n_samples:
            break

        question = item.get('question', {}).get('text', '')
        # NQ has complex annotation structure
        annotations = item.get('annotations', [])
        if not annotations:
            continue

        short_answers = annotations[0].get('short_answers', [])
        if not short_answers:
            continue

        answer = short_answers[0].get('text', '')
        if not answer:
            continue

        mem_id = f"nq-{i:05d}"
        domain = f"nq-domain-{domain_counter % 50:03d}"
        domain_counter += 1

        verify_token = f"{len(answer.split())}-{answer[:5].lower()}"

        memories.append(Memory(
            id=mem_id,
            topic=question,
            content=answer,
            anchor=question[:50],
            image=f"Q: {question} A: {answer}. [Verify: {verify_token}]",
            verify_token=verify_token,
            domain=domain
        ))

        queries.append((question, mem_id))

    print(f"  Loaded {len(memories)} memories")
    return memories, queries


def load_triviaqa(n_samples: int = 500) -> Tuple[List[Memory], List[Tuple[str, str]]]:
    """
    Load TriviaQA dataset.
    """
    print(f"Loading TriviaQA (up to {n_samples} samples)...")

    try:
        dataset = load_dataset("trivia_qa", "rc", split="validation")
    except Exception as e:
        print(f"  Could not load TriviaQA: {e}")
        return [], []

    memories = []
    queries = []

    # Categorize by first word of question for domain grouping
    question_type_to_domain = {}
    domain_counter = 0

    for i, item in enumerate(dataset):
        if len(memories) >= n_samples:
            break

        question = item.get('question', '')
        answer_obj = item.get('answer', {})
        answer = answer_obj.get('value', '') if isinstance(answer_obj, dict) else str(answer_obj)

        if not question or not answer:
            continue

        mem_id = f"trivia-{i:05d}"

        # Group by question type (What, Who, When, Where, etc.)
        first_word = question.split()[0].lower() if question else "other"
        if first_word not in question_type_to_domain:
            question_type_to_domain[first_word] = f"trivia-{first_word}"
        domain = question_type_to_domain[first_word]

        verify_token = f"{len(answer)}-{answer[:6].lower().replace(' ', '')}"

        memories.append(Memory(
            id=mem_id,
            topic=question,
            content=answer,
            anchor=question[:50],
            image=f"Trivia: {question} → {answer}. [Verify: {verify_token}]",
            verify_token=verify_token,
            domain=domain
        ))

        queries.append((question, mem_id))

    print(f"  Loaded {len(memories)} memories")
    return memories, queries


# =============================================================================
# RETRIEVAL METHODS
# =============================================================================

class FlatRetriever:
    """Standard RAG: load all memories into context."""

    def __init__(self, memories: List[Memory]):
        self.memories = {m.id: m for m in memories}

    def retrieve(self, query: str) -> Tuple[Optional[Memory], int]:
        """Returns (memory, context_size_chars)"""
        context_size = sum(len(m.image) + len(m.content) for m in self.memories.values())

        query_lower = query.lower()
        for mem in self.memories.values():
            # Match if query is very similar to topic
            if mem.topic.lower() in query_lower or query_lower in mem.topic.lower():
                return mem, context_size

        return None, context_size


class HierarchicalRetriever:
    """Memory Palace: 2-hop hierarchical retrieval."""

    def __init__(self, memories: List[Memory]):
        self.memories = {m.id: m for m in memories}
        self.root_index: Dict[str, str] = {}  # keyword -> domain
        self.domain_indices: Dict[str, Dict[str, str]] = {}  # domain -> {topic -> id}

        # Build indices
        for m in memories:
            topic_lower = m.topic.lower()

            # Root index - full topic
            self.root_index[topic_lower] = m.domain
            self.root_index[m.id.lower()] = m.domain

            # Index significant words (skip stop words)
            stop_words = {'a', 'an', 'the', 'is', 'was', 'are', 'were', 'be', 'been',
                         'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by',
                         'what', 'who', 'when', 'where', 'which', 'how', 'why',
                         'did', 'does', 'do', 'has', 'have', 'had'}
            for word in topic_lower.split():
                word_clean = ''.join(c for c in word if c.isalnum())
                if len(word_clean) > 2 and word_clean not in stop_words:
                    self.root_index[word_clean] = m.domain

            # Domain index
            if m.domain not in self.domain_indices:
                self.domain_indices[m.domain] = {}
            self.domain_indices[m.domain][topic_lower] = m.id
            self.domain_indices[m.domain][m.id.lower()] = m.id

        self.root_size = len(str(self.root_index))
        self.domain_sizes = {d: len(str(idx)) for d, idx in self.domain_indices.items()}

    def retrieve(self, query: str) -> Tuple[Optional[Memory], int, int]:
        """Returns (memory, context_size_chars, hops)"""
        context_size = self.root_size
        hops = 1

        query_lower = query.lower()

        # Sort by length descending to prefer longer matches
        sorted_keys = sorted(self.root_index.keys(), key=len, reverse=True)

        # Find domain
        domain = None
        for kw in sorted_keys:
            if kw in query_lower:
                domain = self.root_index[kw]
                break

        if not domain:
            return None, context_size, hops

        # Load domain index
        hops = 2
        context_size += self.domain_sizes.get(domain, 0)

        # Find memory
        domain_idx = self.domain_indices.get(domain, {})
        sorted_domain_keys = sorted(domain_idx.keys(), key=len, reverse=True)

        memory_id = None
        for key in sorted_domain_keys:
            if key in query_lower:
                memory_id = domain_idx[key]
                break

        if not memory_id and domain_idx:
            memory_id = list(domain_idx.values())[0]

        memory = self.memories.get(memory_id)
        if memory:
            context_size += len(memory.image)

        return memory, context_size, hops


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_dataset_benchmark(
    dataset_name: str,
    memories: List[Memory],
    queries: List[Tuple[str, str]]
) -> Dict:
    """Run benchmark on a specific dataset."""

    if not memories or not queries:
        print(f"  Skipping {dataset_name}: no data")
        return {}

    flat = FlatRetriever(memories)
    hier = HierarchicalRetriever(memories)

    flat_correct = 0
    flat_context_total = 0
    hier_correct = 0
    hier_context_total = 0
    hier_hops_total = 0

    for question, expected_id in queries:
        # Flat retrieval
        mem, ctx = flat.retrieve(question)
        flat_context_total += ctx
        if mem and mem.id == expected_id:
            flat_correct += 1

        # Hierarchical retrieval
        mem, ctx, hops = hier.retrieve(question)
        hier_context_total += ctx
        hier_hops_total += hops
        if mem and mem.id == expected_id:
            hier_correct += 1

    n_queries = len(queries)
    flat_accuracy = flat_correct / n_queries if n_queries > 0 else 0
    hier_accuracy = hier_correct / n_queries if n_queries > 0 else 0
    ctx_reduction = 1 - (hier_context_total / flat_context_total) if flat_context_total > 0 else 0

    print(f"\n{dataset_name} Results:")
    print(f"  Memories: {len(memories)}, Queries: {n_queries}")
    print(f"  Flat:         Acc={flat_accuracy:.1%}, Ctx={flat_context_total/n_queries/1000:.1f}KB")
    print(f"  Hierarchical: Acc={hier_accuracy:.1%}, Ctx={hier_context_total/n_queries/1000:.1f}KB")
    print(f"  Context Reduction: {ctx_reduction:.1%}")

    return {
        "dataset": dataset_name,
        "memories": len(memories),
        "queries": n_queries,
        "flat_accuracy": flat_accuracy,
        "hier_accuracy": hier_accuracy,
        "flat_avg_context": flat_context_total / n_queries if n_queries > 0 else 0,
        "hier_avg_context": hier_context_total / n_queries if n_queries > 0 else 0,
        "context_reduction": ctx_reduction
    }


def main():
    print("=" * 70)
    print("HUGGINGFACE DATASETS BENCHMARK")
    print("=" * 70)

    results = []

    # Run benchmarks on each dataset
    n_samples = 500  # Adjust based on available memory/time

    # SQuAD v2
    try:
        squad_memories, squad_queries = load_squad_v2(n_samples)
        squad_results = run_dataset_benchmark("SQuAD v2", squad_memories, squad_queries)
        if squad_results:
            results.append(squad_results)
    except Exception as e:
        print(f"SQuAD v2 failed: {e}")

    # TriviaQA
    try:
        trivia_memories, trivia_queries = load_triviaqa(n_samples)
        trivia_results = run_dataset_benchmark("TriviaQA", trivia_memories, trivia_queries)
        if trivia_results:
            results.append(trivia_results)
    except Exception as e:
        print(f"TriviaQA failed: {e}")

    # Natural Questions (optional - requires more setup)
    # try:
    #     nq_memories, nq_queries = load_natural_questions(n_samples)
    #     nq_results = run_dataset_benchmark("Natural Questions", nq_memories, nq_queries)
    #     if nq_results:
    #         results.append(nq_results)
    # except Exception as e:
    #     print(f"Natural Questions failed: {e}")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    if results:
        print(f"\n{'Dataset':<20} {'Flat Acc':<12} {'Hier Acc':<12} {'Ctx Reduction':<15}")
        print("-" * 60)
        for r in results:
            flat_acc = f"{r['flat_accuracy']:.1%}"
            hier_acc = f"{r['hier_accuracy']:.1%}"
            ctx_red = f"{r['context_reduction']:.1%}"
            print(f"{r['dataset']:<20} {flat_acc:<12} {hier_acc:<12} {ctx_red:<15}")

        # Average metrics
        avg_flat = sum(r['flat_accuracy'] for r in results) / len(results)
        avg_hier = sum(r['hier_accuracy'] for r in results) / len(results)
        avg_ctx = sum(r['context_reduction'] for r in results) / len(results)
        print("-" * 60)
        avg_flat_s = f"{avg_flat:.1%}"
        avg_hier_s = f"{avg_hier:.1%}"
        avg_ctx_s = f"{avg_ctx:.1%}"
        print(f"{'Average':<20} {avg_flat_s:<12} {avg_hier_s:<12} {avg_ctx_s:<15}")

    # Save results
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"huggingface_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    all_results = {
        "timestamp": datetime.now().isoformat(),
        "datasets": results
    }

    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    main()
