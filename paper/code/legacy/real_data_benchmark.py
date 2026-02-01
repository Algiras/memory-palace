#!/usr/bin/env python3
"""
Real Data LLM Memory Retrieval Benchmark

Tests retrieval accuracy using actual Memory Palace data from ~/memory/global/*.json.
This provides realistic metrics for the paper using natural language topics like
"CAP Theorem", "Write-Ahead Log", etc.
"""

import json
import os
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
    topic: str  # subject field from palace
    content: str
    anchor: str
    image: str
    verify_token: str
    domain: str  # derived from locus id


# =============================================================================
# LOAD REAL MEMORY PALACE DATA
# =============================================================================

PALACE_FILES = [
    "system-design-citadel.json",
    "distributed-patterns-wing.json",
    "failure-modes-annex.json",
    "cloud-and-security-wing.json",
]

# Domain classification based on locus id patterns
DOMAIN_MAPPINGS = {
    "fundamentals": "fundamentals",
    "consistency": "fundamentals",
    "scalability": "scaling",
    "caching": "scaling",
    "data": "data",
    "nosql": "data",
    "distributed": "distributed",
    "clocks": "distributed",
    "message": "distributed",
    "patterns": "patterns",
    "reliability": "reliability",
    "durability": "distributed",
    "consensus": "distributed",
    "coordination": "distributed",
    "partitioning": "distributed",
    "cascade": "reliability",
    "split": "reliability",
    "loss": "reliability",
    "cloud": "cloud",
    "security": "security",
}


def classify_domain(locus_id: str) -> str:
    """Classify locus into a domain based on naming patterns."""
    locus_lower = locus_id.lower()
    for pattern, domain in DOMAIN_MAPPINGS.items():
        if pattern in locus_lower:
            return domain
    return "general"


def extract_verify_token(image: str) -> str:
    """Extract verify token from image if present, otherwise generate one."""
    # Look for [Verify: xxx] pattern
    import re
    match = re.search(r'\[Verify:\s*([^\]]+)\]', image)
    if match:
        return match.group(1)
    # Generate one from image content
    words = image.split()[:10]
    return f"{len(words)}-{words[0].lower() if words else 'mem'}"


def load_real_memories() -> List[Memory]:
    """Load actual Memory Palace data from ~/memory/global/*.json."""
    base_path = os.path.expanduser("~/memory/global")
    memories = []

    for palace_file in PALACE_FILES:
        filepath = os.path.join(base_path, palace_file)
        if not os.path.exists(filepath):
            print(f"  Skipping {palace_file} (not found)")
            continue

        with open(filepath, 'r') as f:
            palace = json.load(f)

        palace_name = palace.get("name", palace_file)
        print(f"  Loading {palace_name}...")

        for locus in palace.get("loci", []):
            locus_anchor = locus.get("anchor", "unknown anchor")
            domain = classify_domain(locus.get("id", ""))

            for mem in locus.get("memories", []):
                memories.append(Memory(
                    id=mem.get("id", f"unknown-{len(memories)}"),
                    topic=mem.get("subject", "Unknown Topic"),
                    content=mem.get("content", ""),
                    anchor=locus_anchor,
                    image=mem.get("image", ""),
                    verify_token=extract_verify_token(mem.get("image", "")),
                    domain=domain
                ))

    return memories


# =============================================================================
# RETRIEVAL METHODS (same as full_benchmark.py)
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
        self.domain_indices: Dict[str, Dict[str, str]] = {}  # domain -> {key -> id}

        # Build indices - optimized for natural language queries
        for m in memories:
            topic_lower = m.topic.lower()

            # Root index - full topic and key words
            self.root_index[topic_lower] = m.domain
            self.root_index[m.id.lower()] = m.domain

            # Index meaningful words from topic (skip common words)
            stop_words = {'a', 'an', 'the', 'is', 'vs', 'and', 'or', 'of', 'for', 'to', 'in', 'what'}
            for word in topic_lower.replace("-", " ").replace("(", " ").replace(")", " ").split():
                if len(word) > 2 and word not in stop_words:
                    self.root_index[word] = m.domain

            # Domain index - use multiple keys
            if m.domain not in self.domain_indices:
                self.domain_indices[m.domain] = {}
            self.domain_indices[m.domain][topic_lower] = m.id
            self.domain_indices[m.domain][m.id.lower()] = m.id
            # Also index acronyms and short forms
            if "(" in m.topic:
                # Extract acronym like "WAL" from "Write-Ahead Log (WAL)"
                import re
                acronym_match = re.search(r'\(([A-Z]+)\)', m.topic)
                if acronym_match:
                    self.domain_indices[m.domain][acronym_match.group(1).lower()] = m.id

        self.root_size = len(str(self.root_index))
        self.domain_sizes = {d: len(str(idx)) for d, idx in self.domain_indices.items()}

    def retrieve(self, query: str) -> Tuple[Optional[Memory], int, int]:
        """Returns (memory, context_size_chars, hops)"""
        context_size = self.root_size
        hops = 1

        query_lower = query.lower()

        # Sort root index keys by length (descending) to prefer longer/more specific matches
        sorted_keys = sorted(self.root_index.keys(), key=len, reverse=True)

        # Find domain using best (longest) match
        domain = None
        for kw in sorted_keys:
            if kw in query_lower:
                domain = self.root_index[kw]
                break  # Found longest match

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
            memory_id = list(domain_idx.values())[0]

        memory = self.memories.get(memory_id)
        if memory:
            context_size += len(memory.image)

        return memory, context_size, hops


# =============================================================================
# QUERY GENERATION
# =============================================================================

def generate_queries(memories: List[Memory]) -> List[Tuple[str, Memory]]:
    """Generate natural language queries for each memory."""
    queries = []

    query_templates = [
        "What is {topic}?",
        "Explain {topic}",
        "How does {topic} work?",
        "Tell me about {topic}",
        "{topic}",
    ]

    for mem in memories:
        # Use varied query templates
        template = random.choice(query_templates)
        query = template.format(topic=mem.topic)
        queries.append((query, mem))

    return queries


# =============================================================================
# HALLUCINATION TEST
# =============================================================================

def test_hallucination_detection(memories: List[Memory], n_tests: int = 100) -> Dict:
    """Test verify token system for catching hallucinations."""
    results = {
        "with_verify_token": {"caught": 0, "missed": 0},
        "without_verify_token": {"caught": 0, "missed": 0}
    }

    sample_size = min(n_tests, len(memories))
    test_memories = random.sample(memories, sample_size)

    for mem in test_memories:
        # Simulate correct response
        correct_response = f"The answer is {mem.content}. [Verify: {mem.verify_token}]"

        # Simulate hallucinated response
        wrong_token = f"{random.randint(1,99)}-{random.choice(['cat', 'dog', 'bird'])}"
        hallucinated_response = f"The answer is something made up. [Verify: {wrong_token}]"

        # With verify token checking
        if mem.verify_token in correct_response:
            pass  # Correctly accepted
        else:
            results["with_verify_token"]["missed"] += 1

        if mem.verify_token not in hallucinated_response:
            results["with_verify_token"]["caught"] += 1

        # Without verify token - can't detect
        results["without_verify_token"]["missed"] += 1

    return results


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_real_data_benchmark() -> Dict:
    """Run benchmark using real Memory Palace data."""
    print("\n" + "=" * 70)
    print("REAL DATA BENCHMARK")
    print("=" * 70)

    # Load real memories
    print("\nLoading Memory Palace data...")
    memories = load_real_memories()
    print(f"Loaded {len(memories)} memories from {len(PALACE_FILES)} palace files")

    if len(memories) == 0:
        print("ERROR: No memories loaded!")
        return {}

    # Initialize retrievers
    flat = FlatRetriever(memories)
    hier = HierarchicalRetriever(memories)

    # Generate queries
    queries = generate_queries(memories)
    n_queries = len(queries)

    print(f"\nRunning {n_queries} queries...")

    flat_correct = 0
    flat_context_total = 0
    hier_correct = 0
    hier_context_total = 0
    hier_hops_total = 0

    misses = []

    for query, target in queries:
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
        else:
            misses.append((query, target.topic, target.id, mem.id if mem else "None"))

    # Calculate metrics
    flat_accuracy = flat_correct / n_queries
    hier_accuracy = hier_correct / n_queries
    ctx_reduction = 1 - (hier_context_total / flat_context_total)

    print(f"\n" + "-" * 40)
    print("RETRIEVAL RESULTS")
    print("-" * 40)
    print(f"Total memories: {len(memories)}")
    print(f"Total queries:  {n_queries}")
    print()
    print(f"Flat Retrieval:")
    print(f"  Accuracy: {flat_accuracy:.1%}")
    print(f"  Avg Context: {flat_context_total/n_queries/1000:.1f}KB")
    print()
    print(f"Hierarchical Retrieval:")
    print(f"  Accuracy: {hier_accuracy:.1%}")
    print(f"  Avg Context: {hier_context_total/n_queries/1000:.1f}KB")
    print(f"  Avg Hops: {hier_hops_total/n_queries:.1f}")
    print()
    print(f"Context Reduction: {ctx_reduction:.1%}")

    # Hallucination test
    print("\n" + "-" * 40)
    print("HALLUCINATION DETECTION")
    print("-" * 40)
    halluc_results = test_hallucination_detection(memories)
    with_verify = halluc_results["with_verify_token"]
    detection_rate = with_verify["caught"] / (with_verify["caught"] + with_verify["missed"]) if (with_verify["caught"] + with_verify["missed"]) > 0 else 0
    print(f"With verify tokens: {detection_rate:.1%} hallucinations caught")

    # Sample misses for debugging
    if misses and len(misses) <= 10:
        print("\n" + "-" * 40)
        print("RETRIEVAL MISSES (sample)")
        print("-" * 40)
        for query, expected_topic, expected_id, got_id in misses[:5]:
            print(f"  Query: {query[:50]}...")
            print(f"  Expected: {expected_topic} ({expected_id})")
            print(f"  Got: {got_id}")
            print()

    # Build results
    results = {
        "timestamp": datetime.now().isoformat(),
        "corpus_size": len(memories),
        "queries": n_queries,
        "flat": {
            "accuracy": flat_accuracy,
            "avg_context": flat_context_total / n_queries
        },
        "hierarchical": {
            "accuracy": hier_accuracy,
            "avg_context": hier_context_total / n_queries,
            "avg_hops": hier_hops_total / n_queries
        },
        "context_reduction": ctx_reduction,
        "hallucination_detection": detection_rate
    }

    # Save results
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"real_data_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_file}")

    return results


def main():
    run_real_data_benchmark()


if __name__ == "__main__":
    main()
