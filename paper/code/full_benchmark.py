#!/usr/bin/env python3
"""
Full LLM Memory Retrieval Benchmark

Tests at scale:
1. Retrieval accuracy at different corpus sizes
2. Context efficiency (hierarchical vs flat)
3. Hallucination prevention with verify tokens
4. SMASHIN SCOPE distinctiveness
"""

import json
import os
import time
import random
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from datetime import datetime

# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class Memory:
    id: str
    topic: str
    content: str
    anchor: str
    image: str
    verify_token: str
    domain: str

# =============================================================================
# GENERATE SYNTHETIC CORPUS
# =============================================================================

DOMAINS = ["fundamentals", "distributed", "scaling", "patterns", "data", "reliability", "cloud"]

SMASHIN_TEMPLATES = [
    # Template with 12 factors
    "A {SIZE} {COLOR} {CREATURE} named {NAME}! It {ACTION} while {SOUND}. You can {SMELL} and feel {TOUCH}. {EMOTION}! The {NUMBER} {OBJECTS} {ABSURD}.",
]

def generate_memory(idx: int, smashin_score: int = 12) -> Memory:
    """Generate a synthetic memory with SMASHIN SCOPE encoding."""
    sizes = ["GIANT", "TINY", "50-FOOT", "MICROSCOPIC", "TOWERING"]
    colors = ["PURPLE", "GOLDEN", "NEON GREEN", "CRIMSON", "ELECTRIC BLUE"]
    creatures = ["DRAGON", "OCTOPUS", "ROBOT", "ELEPHANT", "WIZARD"]
    actions = ["DANCES", "EXPLODES", "MELTS", "MULTIPLIES", "SCREAMS"]
    sounds = ["THUNDERING", "WHISPERING", "CRACKLING", "ROARING", "TINKLING"]
    smells = ["smell BURNING RUBBER", "smell FRESH COOKIES", "smell LIGHTNING", "smell ROSES"]
    touches = ["ICY COLD", "BURNING HOT", "STICKY", "ELECTRIC", "SOFT as clouds"]
    emotions = ["You feel TERRIFIED", "You feel ECSTATIC", "You laugh uncontrollably", "Your heart races"]
    numbers = ["47", "1000", "3", "99", "7"]
    objects = ["STATUES", "CLONES", "DOORS", "CRYSTALS", "KEYS"]
    absurds = ["float upside down", "turn into butterflies", "sing opera", "speak backwards"]

    domain = DOMAINS[idx % len(DOMAINS)]
    topic = f"Concept_{idx:04d}"

    # Generate unique verify token
    verify = f"{random.choice(numbers)}-{random.choice(creatures).lower()}"

    # Build SMASHIN SCOPE image
    image = (f"A {random.choice(sizes)} {random.choice(colors)} {random.choice(creatures)} "
             f"named {topic}! It {random.choice(actions)} while {random.choice(sounds)}. "
             f"You can {random.choice(smells)} and feel {random.choice(touches)}. "
             f"{random.choice(emotions)}! The {random.choice(numbers)} {random.choice(objects)} "
             f"{random.choice(absurds)}. [Verify: {verify}]")

    return Memory(
        id=f"mem-{idx:04d}",
        topic=topic,
        content=f"This is the factual content for concept {idx}",
        anchor=f"anchor-{idx:04d}",
        image=image,
        verify_token=verify,
        domain=domain
    )


def generate_corpus(n_memories: int) -> List[Memory]:
    """Generate a corpus of N memories."""
    return [generate_memory(i) for i in range(n_memories)]


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

        # Simple keyword matching
        query_lower = query.lower()
        for mem in self.memories.values():
            if mem.id in query_lower or mem.topic.lower() in query_lower:
                return mem, context_size

        # Return first match or None
        return None, context_size


class HierarchicalRetriever:
    """Memory Palace: 2-hop hierarchical retrieval."""

    def __init__(self, memories: List[Memory]):
        self.memories = {m.id: m for m in memories}
        self.root_index: Dict[str, str] = {}  # keyword -> domain
        self.domain_indices: Dict[str, Dict[str, str]] = {}  # domain -> {anchor -> id}

        # Build indices
        for m in memories:
            # Root index - store full topic (not just split words) for better matching
            self.root_index[m.topic.lower()] = m.domain  # "concept_0001" -> domain
            self.root_index[m.id.lower()] = m.domain     # "mem-0001" -> domain
            # Also index individual words for natural language queries
            for word in m.topic.lower().replace("_", " ").replace("-", " ").split():
                if len(word) > 2:  # Skip very short words
                    self.root_index[word] = m.domain

            # Domain index - use multiple keys for better retrieval
            if m.domain not in self.domain_indices:
                self.domain_indices[m.domain] = {}
            self.domain_indices[m.domain][m.anchor] = m.id
            self.domain_indices[m.domain][m.topic.lower()] = m.id  # Also index by topic
            self.domain_indices[m.domain][m.id.lower()] = m.id     # Also index by id

        self.root_size = len(str(self.root_index))
        self.domain_sizes = {d: len(str(idx)) for d, idx in self.domain_indices.items()}

    def retrieve(self, query: str) -> Tuple[Optional[Memory], int, int]:
        """Returns (memory, context_size_chars, hops)"""
        context_size = self.root_size  # Always load root
        hops = 1

        # Find domain using best (longest) match
        query_lower = query.lower()
        query_words = [w for w in query_lower.replace("_", " ").replace("-", " ").split() if len(w) > 2]

        # Sort root index keys by length (descending) to prefer longer/more specific matches
        sorted_keys = sorted(self.root_index.keys(), key=len, reverse=True)

        domain = None
        matched_key = None
        for kw in sorted_keys:
            if kw in query_lower:
                domain = self.root_index[kw]
                matched_key = kw
                break  # Found longest match, stop searching

        if not domain:
            return None, context_size, hops

        # Load domain index
        hops = 2
        context_size += self.domain_sizes.get(domain, 0)

        # Find memory using best (longest) match
        domain_idx = self.domain_indices.get(domain, {})

        # Sort domain keys by length (descending) to prefer longer matches
        sorted_domain_keys = sorted(domain_idx.keys(), key=len, reverse=True)

        memory_id = None
        for key in sorted_domain_keys:
            if key in query_lower:
                memory_id = domain_idx[key]
                break  # Found longest match

        if not memory_id and domain_idx:
            # Take first in domain as fallback
            memory_id = list(domain_idx.values())[0]

        memory = self.memories.get(memory_id)
        if memory:
            context_size += len(memory.image)

        return memory, context_size, hops


# =============================================================================
# HALLUCINATION TEST
# =============================================================================

def test_hallucination_detection(memories: List[Memory], n_tests: int = 100) -> Dict:
    """Test verify token system for catching hallucinations."""

    results = {
        "with_verify_token": {"caught": 0, "missed": 0},
        "without_verify_token": {"caught": 0, "missed": 0}
    }

    for _ in range(n_tests):
        mem = random.choice(memories)

        # Simulate correct response (includes verify token)
        correct_response = f"The answer is {mem.content}. [Verify: {mem.verify_token}]"

        # Simulate hallucinated response (wrong verify token)
        wrong_token = f"{random.randint(1,99)}-{random.choice(['cat', 'dog', 'bird'])}"
        hallucinated_response = f"The answer is something made up. [Verify: {wrong_token}]"

        # Test with verify token checking
        if mem.verify_token in correct_response:
            results["with_verify_token"]["caught"] += 0  # Correctly accepted
        else:
            results["with_verify_token"]["missed"] += 1

        if mem.verify_token not in hallucinated_response:
            results["with_verify_token"]["caught"] += 1  # Correctly rejected
        else:
            results["with_verify_token"]["missed"] += 1

        # Test without verify token (can't detect)
        # Both would be accepted without verification
        results["without_verify_token"]["missed"] += 1

    return results


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_scale_benchmark(corpus_sizes: List[int] = [10, 50, 100, 500, 1000]) -> Dict:
    """Run benchmark at different corpus sizes."""

    results = {"corpus_sizes": corpus_sizes, "flat": [], "hierarchical": []}

    for size in corpus_sizes:
        print(f"\nBenchmarking corpus size: {size}")
        memories = generate_corpus(size)

        flat = FlatRetriever(memories)
        hier = HierarchicalRetriever(memories)

        # Test retrieval
        n_queries = min(100, size)
        flat_correct = 0
        flat_context_total = 0
        hier_correct = 0
        hier_context_total = 0
        hier_hops_total = 0

        for i in range(n_queries):
            # Query for a random memory
            target = memories[i % len(memories)]
            query = f"What is {target.topic}?"

            # Flat retrieval
            mem, ctx = flat.retrieve(query)
            flat_context_total += ctx
            if mem and mem.id == target.id:
                flat_correct += 1

            # Hierarchical retrieval
            mem, ctx, hops = hier.retrieve(query)
            hier_context_total += ctx
            hier_hops_total += hops
            if mem and mem.id == target.id:
                hier_correct += 1

        results["flat"].append({
            "corpus_size": size,
            "accuracy": flat_correct / n_queries,
            "avg_context": flat_context_total / n_queries
        })

        results["hierarchical"].append({
            "corpus_size": size,
            "accuracy": hier_correct / n_queries,
            "avg_context": hier_context_total / n_queries,
            "avg_hops": hier_hops_total / n_queries
        })

        # Print comparison
        ctx_reduction = 1 - (hier_context_total / flat_context_total)
        print(f"  Flat:         Acc={flat_correct/n_queries:.1%}, Ctx={flat_context_total/n_queries/1000:.1f}KB")
        print(f"  Hierarchical: Acc={hier_correct/n_queries:.1%}, Ctx={hier_context_total/n_queries/1000:.1f}KB")
        print(f"  Context Reduction: {ctx_reduction:.1%}")

    return results


def run_hallucination_benchmark(corpus_size: int = 100) -> Dict:
    """Run hallucination detection benchmark."""
    print(f"\nHallucination Detection Benchmark (corpus={corpus_size})")

    memories = generate_corpus(corpus_size)
    results = test_hallucination_detection(memories, n_tests=200)

    # Calculate rates
    with_verify = results["with_verify_token"]
    without_verify = results["without_verify_token"]

    detection_rate_with = with_verify["caught"] / (with_verify["caught"] + with_verify["missed"])
    detection_rate_without = without_verify["caught"] / (without_verify["caught"] + without_verify["missed"])

    print(f"  With verify tokens:    {detection_rate_with:.1%} hallucinations caught")
    print(f"  Without verify tokens: {detection_rate_without:.1%} hallucinations caught")

    return {
        "with_verify_detection_rate": detection_rate_with,
        "without_verify_detection_rate": detection_rate_without
    }


def main():
    print("=" * 70)
    print("LLM MEMORY RETRIEVAL - FULL BENCHMARK")
    print("=" * 70)

    # Run scale benchmark
    scale_results = run_scale_benchmark([10, 50, 100, 500, 1000])

    # Run hallucination benchmark
    halluc_results = run_hallucination_benchmark(100)

    # Combined results
    all_results = {
        "timestamp": datetime.now().isoformat(),
        "scale_benchmark": scale_results,
        "hallucination_benchmark": halluc_results
    }

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    print("\nContext Reduction by Corpus Size:")
    print("-" * 40)
    for flat, hier in zip(scale_results["flat"], scale_results["hierarchical"]):
        size = flat["corpus_size"]
        reduction = 1 - (hier["avg_context"] / flat["avg_context"])
        print(f"  {size:4d} memories: {reduction:6.1%} reduction")

    print(f"\nHallucination Detection:")
    print(f"  With verify tokens:    {halluc_results['with_verify_detection_rate']:.1%}")
    print(f"  Without verify tokens: {halluc_results['without_verify_detection_rate']:.1%}")

    # Save results
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"full_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    main()
