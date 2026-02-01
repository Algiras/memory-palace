#!/usr/bin/env python3
"""
Ollama-Based Memory Retrieval Benchmark

Uses local Ollama for embeddings and LLM inference to provide a fair
comparison between flat RAG and Memory Palace hierarchical retrieval.

This benchmark:
1. Uses the same embedding model for both approaches
2. Uses the same LLM for answer generation
3. Measures actual retrieval accuracy and context efficiency
"""

import json
import os
import time
import requests
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np

# Load .env file if present
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

# Ollama configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
LLM_MODEL = os.environ.get("OLLAMA_LLM_MODEL", "llama3.2")


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
    embedding: Optional[List[float]] = None


# =============================================================================
# OLLAMA HELPERS
# =============================================================================

def check_ollama():
    """Check if Ollama is running and models are available."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if resp.status_code == 200:
            models = [m["name"] for m in resp.json().get("models", [])]
            print(f"Ollama available. Models: {', '.join(models[:5])}...")
            return True
    except requests.exceptions.ConnectionError:
        pass
    print("ERROR: Ollama not running. Start with: ollama serve")
    return False


def get_embedding(text: str) -> List[float]:
    """Get embedding from Ollama."""
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBEDDING_MODEL, "prompt": text}
    )
    if resp.status_code == 200:
        return resp.json().get("embedding", [])
    return []


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))


def generate_response(prompt: str, context: str) -> str:
    """Generate response using Ollama LLM."""
    full_prompt = f"""Context:
{context}

Question: {prompt}

Answer based only on the context provided. If the answer is not in the context, say "I don't know."
"""
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": LLM_MODEL,
            "prompt": full_prompt,
            "stream": False,
            "options": {"temperature": 0.1}
        }
    )
    if resp.status_code == 200:
        return resp.json().get("response", "")
    return ""


# =============================================================================
# LOAD DATA
# =============================================================================

def load_real_memories() -> List[Memory]:
    """Load actual Memory Palace data from ~/memory/global/*.json."""
    base_path = os.path.expanduser("~/memory/global")
    palace_files = [
        "system-design-citadel.json",
        "distributed-patterns-wing.json",
        "failure-modes-annex.json",
        "cloud-and-security-wing.json",
    ]

    # Domain classification
    domain_mappings = {
        "fundamentals": "fundamentals", "consistency": "fundamentals",
        "scalability": "scaling", "caching": "scaling",
        "data": "data", "nosql": "data",
        "distributed": "distributed", "clocks": "distributed",
        "message": "distributed", "patterns": "patterns",
        "reliability": "reliability", "durability": "distributed",
        "consensus": "distributed", "coordination": "distributed",
        "partitioning": "distributed", "cascade": "reliability",
        "split": "reliability", "loss": "reliability",
        "cloud": "cloud", "security": "security",
    }

    def classify_domain(locus_id: str) -> str:
        for pattern, domain in domain_mappings.items():
            if pattern in locus_id.lower():
                return domain
        return "general"

    memories = []

    for palace_file in palace_files:
        filepath = os.path.join(base_path, palace_file)
        if not os.path.exists(filepath):
            continue

        with open(filepath, 'r') as f:
            palace = json.load(f)

        for locus in palace.get("loci", []):
            locus_anchor = locus.get("anchor", "unknown")
            domain = classify_domain(locus.get("id", ""))

            for mem in locus.get("memories", []):
                import re
                image = mem.get("image", "")
                verify_match = re.search(r'\[Verify:\s*([^\]]+)\]', image)
                verify_token = verify_match.group(1) if verify_match else f"{len(image.split())}-mem"

                memories.append(Memory(
                    id=mem.get("id", f"unknown-{len(memories)}"),
                    topic=mem.get("subject", "Unknown Topic"),
                    content=mem.get("content", ""),
                    anchor=locus_anchor,
                    image=image,
                    verify_token=verify_token,
                    domain=domain,
                    embedding=None
                ))

    return memories


# =============================================================================
# EMBEDDING-BASED RETRIEVERS
# =============================================================================

class FlatEmbeddingRetriever:
    """Standard RAG with embeddings: embed all memories, search by similarity."""

    def __init__(self, memories: List[Memory]):
        self.memories = memories
        print(f"  Embedding {len(memories)} memories for flat retrieval...")

        # Embed all memories (topic + content)
        for i, m in enumerate(self.memories):
            text = f"{m.topic}: {m.content}"
            m.embedding = get_embedding(text)
            if (i + 1) % 20 == 0:
                print(f"    Embedded {i + 1}/{len(memories)}")

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Memory], int]:
        """Return top-k memories by similarity."""
        query_emb = get_embedding(query)

        # Calculate similarities
        scored = []
        for m in self.memories:
            if m.embedding:
                sim = cosine_similarity(query_emb, m.embedding)
                scored.append((sim, m))

        # Sort by similarity
        scored.sort(key=lambda x: x[0], reverse=True)
        top_k = [m for _, m in scored[:k]]

        # Context size = all embeddings + returned content
        context_size = sum(len(m.image) + len(m.content) for m in top_k)
        return top_k, context_size


class HierarchicalEmbeddingRetriever:
    """Memory Palace with embeddings: 2-hop retrieval via domain indices."""

    def __init__(self, memories: List[Memory]):
        self.memories = {m.id: m for m in memories}
        self.domains: Dict[str, List[Memory]] = {}

        # Group by domain
        for m in memories:
            if m.domain not in self.domains:
                self.domains[m.domain] = []
            self.domains[m.domain].append(m)

        # Embed domain summaries (for first hop)
        print(f"  Building domain index with {len(self.domains)} domains...")
        self.domain_embeddings: Dict[str, List[float]] = {}
        for domain, mems in self.domains.items():
            # Domain summary = concatenated topics
            topics = " ".join([m.topic for m in mems[:10]])
            self.domain_embeddings[domain] = get_embedding(topics)

        # Embed individual memories within domains (for second hop)
        print(f"  Embedding memories within domains...")
        for i, m in enumerate(memories):
            text = f"{m.topic}: {m.content}"
            m.embedding = get_embedding(text)
            if (i + 1) % 20 == 0:
                print(f"    Embedded {i + 1}/{len(memories)}")

        self.root_index_size = len(str(list(self.domains.keys())))

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Memory], int, int]:
        """2-hop retrieval: find domain, then find memories within domain."""
        query_emb = get_embedding(query)
        hops = 1

        # Hop 1: Find best matching domain
        best_domain = None
        best_sim = -1
        for domain, emb in self.domain_embeddings.items():
            sim = cosine_similarity(query_emb, emb)
            if sim > best_sim:
                best_sim = sim
                best_domain = domain

        context_size = self.root_index_size

        if not best_domain:
            return [], context_size, hops

        # Hop 2: Search within domain
        hops = 2
        domain_mems = self.domains.get(best_domain, [])

        scored = []
        for m in domain_mems:
            if m.embedding:
                sim = cosine_similarity(query_emb, m.embedding)
                scored.append((sim, m))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_k = [m for _, m in scored[:k]]

        context_size += sum(len(m.image) + len(m.content) for m in top_k)
        return top_k, context_size, hops


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_ollama_benchmark():
    """Run benchmark using Ollama embeddings and LLM."""
    print("=" * 70)
    print("OLLAMA-BASED MEMORY RETRIEVAL BENCHMARK")
    print("=" * 70)

    if not check_ollama():
        return

    print(f"\nUsing embedding model: {EMBEDDING_MODEL}")
    print(f"Using LLM model: {LLM_MODEL}")

    # Load memories
    print("\nLoading Memory Palace data...")
    memories = load_real_memories()
    print(f"Loaded {len(memories)} memories")

    if len(memories) == 0:
        print("ERROR: No memories loaded!")
        return

    # Build retrievers
    print("\nBuilding retrievers...")
    flat = FlatEmbeddingRetriever(memories)
    hier = HierarchicalEmbeddingRetriever(memories)

    # Generate test queries
    queries = [(m.topic, m) for m in memories]
    n_queries = min(50, len(queries))  # Limit for speed
    test_queries = queries[:n_queries]

    print(f"\nRunning {n_queries} queries...")

    flat_correct = 0
    flat_context_total = 0
    hier_correct = 0
    hier_context_total = 0

    for i, (query, target) in enumerate(test_queries):
        question = f"What is {query}?"

        # Flat retrieval
        flat_results, flat_ctx = flat.retrieve(question, k=3)
        flat_context_total += flat_ctx
        if any(m.id == target.id for m in flat_results):
            flat_correct += 1

        # Hierarchical retrieval
        hier_results, hier_ctx, hops = hier.retrieve(question, k=3)
        hier_context_total += hier_ctx
        if any(m.id == target.id for m in hier_results):
            hier_correct += 1

        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{n_queries} queries")

    # Calculate metrics
    flat_accuracy = flat_correct / n_queries
    hier_accuracy = hier_correct / n_queries
    ctx_reduction = 1 - (hier_context_total / flat_context_total) if flat_context_total > 0 else 0

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"\nTotal memories: {len(memories)}")
    print(f"Test queries: {n_queries}")
    print()
    print(f"Flat Embedding Retrieval:")
    print(f"  Accuracy (in top-3): {flat_accuracy:.1%}")
    print(f"  Avg Context Size: {flat_context_total/n_queries/1000:.1f}KB")
    print()
    print(f"Hierarchical Embedding Retrieval:")
    print(f"  Accuracy (in top-3): {hier_accuracy:.1%}")
    print(f"  Avg Context Size: {hier_context_total/n_queries/1000:.1f}KB")
    print()
    print(f"Context Reduction: {ctx_reduction:.1%}")

    # Save results
    results = {
        "timestamp": datetime.now().isoformat(),
        "embedding_model": EMBEDDING_MODEL,
        "llm_model": LLM_MODEL,
        "memories": len(memories),
        "queries": n_queries,
        "flat_accuracy": flat_accuracy,
        "hier_accuracy": hier_accuracy,
        "context_reduction": ctx_reduction
    }

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"ollama_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_file}")


if __name__ == "__main__":
    run_ollama_benchmark()
