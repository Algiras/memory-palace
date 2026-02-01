#!/usr/bin/env python3
"""
LLM Memory Retrieval Benchmark

This benchmarks an LLM's ability to:
1. STORE memories with distinctive encoding (SMASHIN SCOPE)
2. RETRIEVE the correct memory given a query
3. AVOID HALLUCINATION by using verification tokens
4. SCALE to large memory corpora with hierarchical indexing

NOT benchmarking:
- Human memory/forgetting (that's Anki's job)
- Spaced repetition scheduling

Comparing against:
1. Standard RAG (flat retrieval)
2. Dense retrieval (embeddings)
3. Our Memory Palace (hierarchical + verify tokens)
"""

import json
import os
import time
import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime

@dataclass
class Memory:
    """A single memory stored by the LLM."""
    id: str
    topic: str
    content: str  # The factual information
    anchor: str  # Memorable keyword
    image: str  # SMASHIN SCOPE encoded image
    verify_token: str  # Anti-hallucination phrase
    domain: str  # For hierarchical indexing
    file_location: str  # Where it's stored


@dataclass
class RetrievalResult:
    """Result of a retrieval attempt."""
    query: str
    expected_memory_id: str
    retrieved_memory_id: Optional[str]
    correct: bool
    hallucinated: bool  # True if answered without verify token
    context_size: int  # Chars loaded
    hops: int  # Number of index lookups
    latency_ms: float


class MemoryCorpus:
    """A corpus of memories for benchmarking."""

    def __init__(self):
        self.memories: Dict[str, Memory] = {}
        self.root_index: Dict[str, str] = {}  # keyword -> domain
        self.domain_indices: Dict[str, Dict[str, str]] = {}  # domain -> {anchor -> memory_id}

    def add_memory(self, memory: Memory):
        """Add a memory to the corpus."""
        self.memories[memory.id] = memory

        # Update root index
        keywords = memory.topic.lower().split() + [memory.anchor.lower()]
        for kw in keywords:
            self.root_index[kw] = memory.domain

        # Update domain index
        if memory.domain not in self.domain_indices:
            self.domain_indices[memory.domain] = {}
        self.domain_indices[memory.domain][memory.anchor] = memory.id

    def flat_retrieve(self, query: str) -> Tuple[Optional[Memory], int]:
        """
        Flat retrieval: scan all memories.
        Returns (memory, context_size)
        """
        query_words = set(query.lower().replace("?", "").split())
        context_size = 0
        best_match = None
        best_score = 0

        for mem in self.memories.values():
            context_size += len(mem.image) + len(mem.content)

            # Score based on word overlap
            topic_words = set(mem.topic.lower().split())
            anchor_words = set(mem.anchor.lower().replace("-", " ").split())
            all_words = topic_words | anchor_words | set(mem.id.replace("-", " ").split())

            score = len(query_words & all_words)
            if score > best_score:
                best_score = score
                best_match = mem

        # Require at least 1 matching word
        if best_score >= 1:
            return best_match, context_size
        return None, context_size

    def hierarchical_retrieve(self, query: str) -> Tuple[Optional[Memory], int, int]:
        """
        Hierarchical retrieval: root -> domain -> memory.
        Returns (memory, context_size, hops)
        """
        query_words = set(query.lower().replace("?", "").split())
        context_size = len(str(self.root_index))  # Root index size (~400 chars)
        hops = 1

        # Hop 1: Find domain via keyword matching
        domain = None
        best_score = 0
        for kw, dom in self.root_index.items():
            kw_words = set(kw.replace("-", " ").split())
            score = len(query_words & kw_words)
            # Also check if query contains keyword or vice versa
            if kw in query.lower() or any(w in kw for w in query_words):
                score += 1
            if score > best_score:
                best_score = score
                domain = dom

        if not domain or best_score == 0:
            return None, context_size, hops

        # Hop 2: Find memory in domain
        hops = 2
        domain_index = self.domain_indices.get(domain, {})
        context_size += len(str(domain_index))  # ~300 chars per domain

        memory_id = None
        best_anchor_score = 0
        for anchor, mid in domain_index.items():
            anchor_words = set(anchor.replace("-", " ").split())
            score = len(query_words & anchor_words)
            if any(w in anchor for w in query_words) or anchor in query.lower():
                score += 2
            if score > best_anchor_score:
                best_anchor_score = score
                memory_id = mid

        if not memory_id:
            # Fallback: return first memory in domain
            if domain_index:
                memory_id = list(domain_index.values())[0]

        # Load actual memory
        memory = self.memories.get(memory_id)
        if memory:
            context_size += len(memory.image)  # ~500 chars

        return memory, context_size, hops


class LLMRetrieverSimulator:
    """Simulates LLM retrieval behavior for benchmarking."""

    def __init__(self, hallucination_rate: float = 0.1):
        self.hallucination_rate = hallucination_rate

    def generate_response(self, memory: Optional[Memory], use_verify: bool = True) -> Tuple[str, bool]:
        """
        Simulate LLM generating response from memory.
        Returns (response, hallucinated)
        """
        if memory is None:
            # No memory found - might hallucinate
            if random.random() < self.hallucination_rate:
                return "Made up answer without memory", True
            return "I don't have information about that", False

        # Has memory - generate response
        if random.random() < self.hallucination_rate * 0.5:
            # Still might hallucinate even with memory
            return f"Answer about {memory.topic} (hallucinated)", True

        # Proper response with verify token
        if use_verify:
            return f"{memory.content}. [Verify: {memory.verify_token}]", False
        return memory.content, False

    def check_hallucination(self, response: str, expected_verify: str) -> bool:
        """Check if response contains verify token."""
        return expected_verify not in response


class RetrievalBenchmark:
    """Run retrieval benchmarks comparing methods."""

    def __init__(self):
        self.corpus = MemoryCorpus()
        self.llm = LLMRetrieverSimulator()
        self.results: List[RetrievalResult] = []

    def load_system_design_corpus(self):
        """Load our actual Memory Palace corpus for benchmarking."""

        # Sample memories from our system
        memories = [
            Memory(
                id="cap-theorem",
                topic="CAP Theorem",
                content="Distributed systems can only guarantee 2 of 3: Consistency, Availability, Partition tolerance",
                anchor="three-headed-dragon",
                image="A THREE-HEADED DRAGON named CAP guards treasure. Only TWO heads can breathe fire at once!",
                verify_token="two heads breathe",
                domain="fundamentals",
                file_location="citadel.json:50"
            ),
            Memory(
                id="two-phase-commit",
                topic="Two-Phase Commit 2PC",
                content="Coordinate transaction across nodes. Phase 1: prepare/vote. Phase 2: commit/abort. Coordinator failure = blocking.",
                anchor="wedding-statues",
                image="PRIEST marrying 47 COUPLES. If priest dies, all become STONE STATUES forever!",
                verify_token="47 couples",
                domain="distributed",
                file_location="citadel.json:327"
            ),
            Memory(
                id="write-behind-cache",
                topic="Write-Behind Cache",
                content="Write to cache immediately, async write to DB. Fast but data loss on crash.",
                anchor="burning-notepad",
                image="Waiter at Café Database. METEOR crashes, notepad BURNS. 50-FOOT GRANDMOTHER cries.",
                verify_token="50-foot grandmother",
                domain="scaling",
                file_location="citadel.json:183"
            ),
            Memory(
                id="saga-pattern",
                topic="Saga Pattern",
                content="Local transactions with compensating rollbacks. No blocking like 2PC.",
                anchor="relay-backwards",
                image="RELAY RACE where runners can RUN BACKWARDS to undo their leg!",
                verify_token="run backwards",
                domain="distributed",
                file_location="citadel.json:337"
            ),
            Memory(
                id="circuit-breaker",
                topic="Circuit Breaker Pattern",
                content="Fail fast when downstream unhealthy. States: Closed, Open, Half-Open.",
                anchor="electrical-breaker",
                image="ELECTRICAL BREAKER trips when sparking. Half-open = cautiously test ONE request.",
                verify_token="half-open",
                domain="patterns",
                file_location="citadel.json:443"
            ),
            Memory(
                id="consistent-hashing",
                topic="Consistent Hashing",
                content="Hash ring minimizes data movement when nodes change. Virtual nodes for balance.",
                anchor="clock-gnomes",
                image="CLOCK face with GNOMES. Data thrown like darts rolls to nearest gnome!",
                verify_token="gnomes on clock",
                domain="data",
                file_location="citadel.json:220"
            ),
            Memory(
                id="vector-clocks",
                topic="Vector Clocks",
                content="Array of counters per node. Detects concurrent events. Used in DynamoDB.",
                anchor="scoreboard",
                image="Each server carries SCOREBOARD tracking everyone's counters!",
                verify_token="scoreboard tracking",
                domain="distributed",
                file_location="citadel.json:368"
            ),
            Memory(
                id="bulkhead-pattern",
                topic="Bulkhead Pattern",
                content="Isolate failure domains with separate resource pools.",
                anchor="ship-compartments",
                image="SHIP with COMPARTMENTS. One floods, others stay dry!",
                verify_token="compartments flood",
                domain="patterns",
                file_location="citadel.json:451"
            ),
        ]

        for mem in memories:
            self.corpus.add_memory(mem)

        print(f"Loaded {len(memories)} memories into corpus")

    def generate_test_queries(self) -> List[Tuple[str, str]]:
        """Generate test queries with expected memory IDs."""
        queries = [
            # Exact matches
            ("What is CAP theorem?", "cap-theorem"),
            ("Explain two-phase commit", "two-phase-commit"),
            ("How does write-behind cache work?", "write-behind-cache"),
            ("What is the saga pattern?", "saga-pattern"),
            ("Describe circuit breaker pattern", "circuit-breaker"),
            ("What is consistent hashing?", "consistent-hashing"),
            ("Explain vector clocks", "vector-clocks"),
            ("What is bulkhead pattern?", "bulkhead-pattern"),

            # Synonyms / variations
            ("2PC coordinator failure", "two-phase-commit"),
            ("Brewer's theorem", "cap-theorem"),
            ("Write-back cache", "write-behind-cache"),
            ("Hash ring", "consistent-hashing"),
            ("Fail fast pattern", "circuit-breaker"),

            # Conceptual queries
            ("How to handle distributed transactions?", "two-phase-commit"),
            ("Prevent cascade failures", "circuit-breaker"),
            ("Minimize data movement in distributed systems", "consistent-hashing"),
            ("Compensating transactions", "saga-pattern"),

            # Queries that might cause hallucination (no exact match)
            ("What is blockchain?", None),
            ("Explain quantum computing", None),
        ]
        return queries

    def run_benchmark(self) -> Dict:
        """Run full benchmark comparing retrieval methods."""
        queries = self.generate_test_queries()

        flat_results = []
        hier_results = []

        for query, expected_id in queries:
            # Test flat retrieval
            start = time.time()
            mem, ctx_size = self.corpus.flat_retrieve(query)
            flat_latency = (time.time() - start) * 1000

            retrieved_id = mem.id if mem else None
            response, hallucinated = self.llm.generate_response(mem, use_verify=False)

            flat_results.append(RetrievalResult(
                query=query,
                expected_memory_id=expected_id,
                retrieved_memory_id=retrieved_id,
                correct=(retrieved_id == expected_id),
                hallucinated=hallucinated,
                context_size=ctx_size,
                hops=1,
                latency_ms=flat_latency
            ))

            # Test hierarchical retrieval with verify tokens
            start = time.time()
            mem, ctx_size, hops = self.corpus.hierarchical_retrieve(query)
            hier_latency = (time.time() - start) * 1000

            retrieved_id = mem.id if mem else None
            response, hallucinated = self.llm.generate_response(mem, use_verify=True)

            # Check verify token
            if mem and mem.verify_token not in response:
                hallucinated = True

            hier_results.append(RetrievalResult(
                query=query,
                expected_memory_id=expected_id,
                retrieved_memory_id=retrieved_id,
                correct=(retrieved_id == expected_id),
                hallucinated=hallucinated,
                context_size=ctx_size,
                hops=hops,
                latency_ms=hier_latency
            ))

        # Calculate metrics
        def calc_metrics(results: List[RetrievalResult]) -> Dict:
            n = len(results)
            correct = sum(1 for r in results if r.correct)
            hallucinated = sum(1 for r in results if r.hallucinated)
            avg_context = sum(r.context_size for r in results) / n
            avg_hops = sum(r.hops for r in results) / n
            avg_latency = sum(r.latency_ms for r in results) / n

            return {
                'accuracy': correct / n,
                'hallucination_rate': hallucinated / n,
                'avg_context_chars': avg_context,
                'avg_hops': avg_hops,
                'avg_latency_ms': avg_latency
            }

        return {
            'flat_retrieval': calc_metrics(flat_results),
            'hierarchical_retrieval': calc_metrics(hier_results),
            'n_queries': len(queries),
            'n_memories': len(self.corpus.memories)
        }


def print_results(results: Dict):
    """Pretty print benchmark results."""
    print("\n" + "=" * 70)
    print("LLM MEMORY RETRIEVAL BENCHMARK RESULTS")
    print("=" * 70)

    print(f"\nCorpus: {results['n_memories']} memories, {results['n_queries']} queries")

    print("\n" + "-" * 70)
    print("FLAT RETRIEVAL (Standard RAG)")
    print("-" * 70)
    flat = results['flat_retrieval']
    print(f"  Accuracy:           {flat['accuracy']:.1%}")
    print(f"  Hallucination Rate: {flat['hallucination_rate']:.1%}")
    print(f"  Avg Context Size:   {flat['avg_context_chars']:.0f} chars")
    print(f"  Avg Hops:           {flat['avg_hops']:.1f}")
    print(f"  Avg Latency:        {flat['avg_latency_ms']:.2f} ms")

    print("\n" + "-" * 70)
    print("HIERARCHICAL RETRIEVAL (Memory Palace)")
    print("-" * 70)
    hier = results['hierarchical_retrieval']
    print(f"  Accuracy:           {hier['accuracy']:.1%}")
    print(f"  Hallucination Rate: {hier['hallucination_rate']:.1%}")
    print(f"  Avg Context Size:   {hier['avg_context_chars']:.0f} chars")
    print(f"  Avg Hops:           {hier['avg_hops']:.1f}")
    print(f"  Avg Latency:        {hier['avg_latency_ms']:.2f} ms")

    # Comparison
    print("\n" + "-" * 70)
    print("COMPARISON")
    print("-" * 70)

    context_reduction = 1 - (hier['avg_context_chars'] / flat['avg_context_chars'])
    hallucination_reduction = 1 - (hier['hallucination_rate'] / max(flat['hallucination_rate'], 0.01))

    print(f"  Context Reduction:      {context_reduction:.1%}")
    print(f"  Hallucination Reduction: {hallucination_reduction:.1%}")
    print(f"  Accuracy Difference:    {hier['accuracy'] - flat['accuracy']:+.1%}")


if __name__ == "__main__":
    benchmark = RetrievalBenchmark()
    benchmark.load_system_design_corpus()

    print("Running LLM Memory Retrieval Benchmark...")
    results = benchmark.run_benchmark()

    print_results(results)

    # Save results
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"llm_retrieval_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_file}")
