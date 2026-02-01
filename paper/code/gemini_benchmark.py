#!/usr/bin/env python3
"""
Gemini API Memory Retrieval Benchmark

Uses Google's Gemini API for non-local testing. Compares flat RAG vs Memory Palace
hierarchical retrieval using Gemini for both embeddings and LLM inference.

This benchmark:
1. Uses Gemini embedding model for vector embeddings
2. Uses Gemini Pro for answer generation
3. Compares against local Ollama results
4. Measures: latency, accuracy, retrieval quality
"""

import json
import os
import time
import re
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

# Gemini configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Check for API key before importing Gemini library
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in environment or .env file")
    print("Add GEMINI_API_KEY=your_key_here to paper/code/.env")
    exit(1)

try:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    print("ERROR: google-generativeai not installed")
    print("Run: pip install google-generativeai")
    exit(1)

# Model configuration
EMBEDDING_MODEL = "models/embedding-001"
LLM_MODEL = "gemini-pro"


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


@dataclass
class BenchmarkResult:
    method: str
    accuracy: float
    avg_latency_ms: float
    avg_context_size: int
    total_queries: int


# =============================================================================
# GEMINI HELPERS
# =============================================================================

def get_embedding(text: str) -> List[float]:
    """Get embedding from Gemini API."""
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Embedding error: {e}")
        return []


def get_query_embedding(text: str) -> List[float]:
    """Get query embedding (optimized for retrieval)."""
    try:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']
    except Exception as e:
        print(f"Query embedding error: {e}")
        return []


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b:
        return 0.0
    a_arr = np.array(a)
    b_arr = np.array(b)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def generate_response(prompt: str, context: str) -> Tuple[str, float]:
    """Generate response using Gemini Pro. Returns (response, latency_ms)."""
    full_prompt = f"""Context:
{context}

Question: {prompt}

Answer based only on the context provided. If the answer is not in the context, say "I don't know."
"""
    start = time.time()
    try:
        model = genai.GenerativeModel(LLM_MODEL)
        response = model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500
            )
        )
        latency = (time.time() - start) * 1000
        return response.text, latency
    except Exception as e:
        latency = (time.time() - start) * 1000
        print(f"Generation error: {e}")
        return "", latency


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
            if (i + 1) % 10 == 0:
                print(f"    Embedded {i + 1}/{len(memories)}")
            # Rate limiting - Gemini has quotas
            time.sleep(0.1)

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Memory], int, float]:
        """Return top-k memories by similarity. Returns (memories, context_size, latency_ms)."""
        start = time.time()
        query_emb = get_query_embedding(query)

        # Calculate similarities
        scored = []
        for m in self.memories:
            if m.embedding:
                sim = cosine_similarity(query_emb, m.embedding)
                scored.append((sim, m))

        # Sort by similarity
        scored.sort(key=lambda x: x[0], reverse=True)
        top_k = [m for _, m in scored[:k]]

        latency = (time.time() - start) * 1000

        # Context size = returned content
        context_size = sum(len(m.image) + len(m.content) for m in top_k)
        return top_k, context_size, latency


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
            time.sleep(0.1)  # Rate limiting

        # Embed individual memories within domains (for second hop)
        print(f"  Embedding memories within domains...")
        for i, m in enumerate(memories):
            text = f"{m.topic}: {m.content}"
            m.embedding = get_embedding(text)
            if (i + 1) % 10 == 0:
                print(f"    Embedded {i + 1}/{len(memories)}")
            time.sleep(0.1)  # Rate limiting

        self.root_index_size = len(str(list(self.domains.keys())))

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Memory], int, int, float]:
        """2-hop retrieval: find domain, then find memories within domain."""
        start = time.time()
        query_emb = get_query_embedding(query)
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
            latency = (time.time() - start) * 1000
            return [], context_size, hops, latency

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

        latency = (time.time() - start) * 1000
        context_size += sum(len(m.image) + len(m.content) for m in top_k)
        return top_k, context_size, hops, latency


# =============================================================================
# KEYWORD-BASED RETRIEVAL (for comparison)
# =============================================================================

class KeywordRetriever:
    """Simple keyword/BM25-style retrieval for comparison."""

    def __init__(self, memories: List[Memory]):
        self.memories = memories
        # Build inverted index
        self.index: Dict[str, List[Memory]] = {}
        for m in memories:
            words = set(m.topic.lower().split() + m.content.lower().split())
            for word in words:
                if word not in self.index:
                    self.index[word] = []
                self.index[word].append(m)

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Memory], int, float]:
        """Return top-k memories by keyword overlap."""
        start = time.time()
        query_words = set(query.lower().split())

        # Score by keyword overlap
        scores: Dict[str, int] = {}
        for word in query_words:
            for m in self.index.get(word, []):
                scores[m.id] = scores.get(m.id, 0) + 1

        # Sort by score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        top_k = [m for m in self.memories if m.id in sorted_ids[:k]]

        latency = (time.time() - start) * 1000
        context_size = sum(len(m.image) + len(m.content) for m in top_k)
        return top_k, context_size, latency


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_gemini_benchmark():
    """Run benchmark using Gemini API."""
    print("=" * 70)
    print("GEMINI API MEMORY RETRIEVAL BENCHMARK")
    print("=" * 70)

    print(f"\nUsing embedding model: {EMBEDDING_MODEL}")
    print(f"Using LLM model: {LLM_MODEL}")

    # Load memories
    print("\nLoading Memory Palace data...")
    memories = load_real_memories()
    print(f"Loaded {len(memories)} memories")

    if len(memories) == 0:
        print("ERROR: No memories loaded!")
        print("Make sure memory palace files exist in ~/memory/global/")
        return

    # Limit memories for API cost/time management
    max_memories = min(30, len(memories))
    memories = memories[:max_memories]
    print(f"Using {len(memories)} memories for benchmark (API cost management)")

    # Build retrievers
    print("\nBuilding retrievers...")
    print("Building flat retriever...")
    flat = FlatEmbeddingRetriever(memories)

    print("Building hierarchical retriever...")
    hier = HierarchicalEmbeddingRetriever(memories)

    print("Building keyword retriever...")
    keyword = KeywordRetriever(memories)

    # Generate test queries
    queries = [(m.topic, m) for m in memories]
    n_queries = min(20, len(queries))  # Limit for API costs
    test_queries = queries[:n_queries]

    print(f"\nRunning {n_queries} queries...")

    # Results tracking
    results = {
        "flat_embedding": {"correct": 0, "context": 0, "latency": 0},
        "hierarchical_embedding": {"correct": 0, "context": 0, "latency": 0},
        "keyword": {"correct": 0, "context": 0, "latency": 0}
    }

    for i, (query, target) in enumerate(test_queries):
        question = f"What is {query}?"

        # Flat embedding retrieval
        flat_results, flat_ctx, flat_lat = flat.retrieve(question, k=3)
        results["flat_embedding"]["context"] += flat_ctx
        results["flat_embedding"]["latency"] += flat_lat
        if any(m.id == target.id for m in flat_results):
            results["flat_embedding"]["correct"] += 1

        # Hierarchical embedding retrieval
        hier_results, hier_ctx, hops, hier_lat = hier.retrieve(question, k=3)
        results["hierarchical_embedding"]["context"] += hier_ctx
        results["hierarchical_embedding"]["latency"] += hier_lat
        if any(m.id == target.id for m in hier_results):
            results["hierarchical_embedding"]["correct"] += 1

        # Keyword retrieval
        kw_results, kw_ctx, kw_lat = keyword.retrieve(question, k=3)
        results["keyword"]["context"] += kw_ctx
        results["keyword"]["latency"] += kw_lat
        if any(m.id == target.id for m in kw_results):
            results["keyword"]["correct"] += 1

        if (i + 1) % 5 == 0:
            print(f"  Processed {i + 1}/{n_queries} queries")

        # Rate limiting
        time.sleep(0.2)

    # Calculate metrics
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"\nTotal memories: {len(memories)}")
    print(f"Test queries: {n_queries}")

    print("\n{:<30} {:>10} {:>15} {:>15}".format(
        "Method", "Accuracy", "Avg Latency", "Avg Context"))
    print("-" * 70)

    final_results = {}
    for method, data in results.items():
        accuracy = data["correct"] / n_queries
        avg_latency = data["latency"] / n_queries
        avg_context = data["context"] / n_queries

        print("{:<30} {:>10.1%} {:>12.1f} ms {:>12.0f} B".format(
            method, accuracy, avg_latency, avg_context))

        final_results[method] = {
            "accuracy": accuracy,
            "avg_latency_ms": avg_latency,
            "avg_context_bytes": avg_context
        }

    # Context reduction calculation
    flat_ctx = results["flat_embedding"]["context"]
    hier_ctx = results["hierarchical_embedding"]["context"]
    ctx_reduction = 1 - (hier_ctx / flat_ctx) if flat_ctx > 0 else 0

    print(f"\nContext Reduction (Hierarchical vs Flat): {ctx_reduction:.1%}")

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "embedding_model": EMBEDDING_MODEL,
        "llm_model": LLM_MODEL,
        "memories": len(memories),
        "queries": n_queries,
        "results": final_results,
        "context_reduction": ctx_reduction
    }

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(
        output_dir,
        f"gemini_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nResults saved to: {output_file}")

    # Compare with Ollama if available
    print("\n" + "=" * 70)
    print("COMPARISON NOTES")
    print("=" * 70)
    print("""
To compare with local Ollama results:
1. Run: python ollama_benchmark.py
2. Compare accuracy and latency between:
   - Gemini embedding-001 vs nomic-embed-text
   - Gemini Pro vs llama3.2

Key differences:
- Gemini: Higher quality embeddings, cloud-based, API costs
- Ollama: Local inference, no API costs, privacy-preserving
""")


if __name__ == "__main__":
    run_gemini_benchmark()
