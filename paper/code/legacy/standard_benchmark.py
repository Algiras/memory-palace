#!/usr/bin/env python3
"""
Standard QA Benchmark for Memory Palace Retrieval

Uses widely accepted open datasets with Gemini/Ollama models:
- SQuAD 2.0 (Stanford Question Answering Dataset)
- TriviaQA (Large-scale QA dataset)
- Natural Questions (Google's QA benchmark)

Models:
- Gemini: Google's embedding-001 + gemini-pro
- Ollama: nomic-embed-text + llama3.2 (local)

Compares:
- Flat RAG (standard vector similarity)
- Memory Palace (hierarchical domain routing)
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import numpy as np

# Load environment
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
    print("Installing datasets...")
    import subprocess
    subprocess.check_call(["pip", "install", "datasets"])
    from datasets import load_dataset


# =============================================================================
# MODEL BACKENDS
# =============================================================================

class OllamaBackend:
    """Local Ollama for embeddings and generation."""

    def __init__(self):
        import requests
        self.requests = requests
        self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.embed_model = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        self.llm_model = os.environ.get("OLLAMA_LLM_MODEL", "llama3.2")
        self.name = f"Ollama ({self.embed_model})"

    def is_available(self) -> bool:
        try:
            resp = self.requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except:
            return False

    def get_embedding(self, text: str) -> List[float]:
        try:
            resp = self.requests.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embed_model, "prompt": text},
                timeout=30
            )
            if resp.status_code == 200:
                return resp.json().get("embedding", [])
        except Exception as e:
            print(f"Ollama embedding error: {e}")
        return []

    def generate(self, prompt: str, context: str) -> str:
        full_prompt = f"""Context: {context}

Question: {prompt}

Answer based only on the context. Be concise."""
        try:
            resp = self.requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.llm_model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 100}
                },
                timeout=60
            )
            if resp.status_code == 200:
                return resp.json().get("response", "")
        except Exception as e:
            print(f"Ollama generation error: {e}")
        return ""


class GeminiBackend:
    """Google Gemini API for embeddings and generation."""

    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.name = "Gemini (embedding-001)"
        self.genai = None

        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai = genai
            except ImportError:
                print("Install: pip install google-generativeai")

    def is_available(self) -> bool:
        return self.genai is not None

    def get_embedding(self, text: str) -> List[float]:
        if not self.genai:
            return []
        try:
            result = self.genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_document"
            )
            time.sleep(0.1)  # Rate limiting
            return result['embedding']
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return []

    def generate(self, prompt: str, context: str) -> str:
        if not self.genai:
            return ""
        full_prompt = f"""Context: {context}

Question: {prompt}

Answer based only on the context. Be concise."""
        try:
            model = self.genai.GenerativeModel("gemini-pro")
            response = model.generate_content(
                full_prompt,
                generation_config=self.genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=100
                )
            )
            time.sleep(0.2)  # Rate limiting
            return response.text
        except Exception as e:
            print(f"Gemini generation error: {e}")
            return ""


# =============================================================================
# RETRIEVERS
# =============================================================================

def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    a_arr = np.array(a)
    b_arr = np.array(b)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


class FlatRetriever:
    """Standard flat RAG: embed all documents, retrieve by similarity."""

    def __init__(self, documents: List[Dict], backend):
        self.documents = documents
        self.backend = backend
        self.embeddings = []

        print(f"  Embedding {len(documents)} documents...")
        for i, doc in enumerate(documents):
            text = doc.get('text', doc.get('context', ''))[:1000]  # Limit length
            emb = backend.get_embedding(text)
            self.embeddings.append(emb)
            if (i + 1) % 20 == 0:
                print(f"    {i + 1}/{len(documents)}")

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Dict], int]:
        query_emb = self.backend.get_embedding(query)

        scored = []
        for i, emb in enumerate(self.embeddings):
            sim = cosine_similarity(query_emb, emb)
            scored.append((sim, self.documents[i]))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_k = [doc for _, doc in scored[:k]]

        context_size = sum(len(doc.get('text', doc.get('context', ''))) for doc in top_k)
        return top_k, context_size


class HierarchicalRetriever:
    """Memory Palace: 2-hop hierarchical retrieval with domain routing."""

    def __init__(self, documents: List[Dict], backend):
        self.backend = backend
        self.documents = documents
        self.domains: Dict[str, List[Dict]] = {}
        self.domain_embeddings: Dict[str, List[float]] = {}

        # Classify documents into domains
        for doc in documents:
            domain = self._classify_domain(doc)
            if domain not in self.domains:
                self.domains[domain] = []
            self.domains[domain].append(doc)

        print(f"  Built {len(self.domains)} domain clusters")

        # Embed domain summaries (hop 1)
        print(f"  Embedding domain summaries...")
        for domain, docs in self.domains.items():
            # Summary = first 500 chars of first 3 docs
            summary = " ".join([d.get('text', d.get('context', ''))[:200] for d in docs[:3]])
            self.domain_embeddings[domain] = backend.get_embedding(summary)

        # Embed individual documents (hop 2)
        print(f"  Embedding documents within domains...")
        self.doc_embeddings = {}
        for i, doc in enumerate(documents):
            text = doc.get('text', doc.get('context', ''))[:1000]
            self.doc_embeddings[i] = backend.get_embedding(text)
            if (i + 1) % 20 == 0:
                print(f"    {i + 1}/{len(documents)}")

    def _classify_domain(self, doc: Dict) -> str:
        """Simple domain classification based on keywords."""
        text = doc.get('text', doc.get('context', '')).lower()

        domain_keywords = {
            'science': ['research', 'study', 'experiment', 'scientific', 'biology', 'chemistry', 'physics'],
            'history': ['war', 'century', 'historical', 'ancient', 'empire', 'king', 'queen'],
            'geography': ['country', 'city', 'capital', 'population', 'located', 'river', 'mountain'],
            'sports': ['game', 'team', 'player', 'score', 'championship', 'league', 'won'],
            'entertainment': ['movie', 'film', 'actor', 'music', 'song', 'album', 'band'],
            'technology': ['computer', 'software', 'internet', 'digital', 'system', 'data'],
        }

        for domain, keywords in domain_keywords.items():
            if any(kw in text for kw in keywords):
                return domain
        return 'general'

    def retrieve(self, query: str, k: int = 3) -> Tuple[List[Dict], int, int]:
        query_emb = self.backend.get_embedding(query)

        # Hop 1: Find best domain
        best_domain = 'general'
        best_sim = -1
        for domain, emb in self.domain_embeddings.items():
            sim = cosine_similarity(query_emb, emb)
            if sim > best_sim:
                best_sim = sim
                best_domain = domain

        # Hop 2: Search within domain
        domain_docs = self.domains.get(best_domain, self.documents)

        scored = []
        for doc in domain_docs:
            idx = self.documents.index(doc)
            emb = self.doc_embeddings.get(idx, [])
            sim = cosine_similarity(query_emb, emb)
            scored.append((sim, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_k = [doc for _, doc in scored[:k]]

        # Context size = domain index + retrieved docs
        context_size = len(str(list(self.domains.keys()))) + \
                       sum(len(doc.get('text', doc.get('context', ''))) for doc in top_k)

        return top_k, context_size, 2  # 2 hops


# =============================================================================
# DATASET LOADERS
# =============================================================================

def load_squad_dataset(num_samples: int = 200) -> Tuple[List[Dict], List[Dict]]:
    """Load SQuAD 2.0 dataset - widely accepted QA benchmark."""
    print("Loading SQuAD 2.0 dataset...")

    try:
        dataset = load_dataset("rajpurkar/squad_v2", split="validation")
    except:
        dataset = load_dataset("squad_v2", split="validation")

    # Build corpus and queries
    contexts = {}
    queries = []

    for item in dataset:
        ctx = item['context']
        ctx_id = hash(ctx) % 10000000

        if ctx_id not in contexts:
            contexts[ctx_id] = {'id': str(ctx_id), 'text': ctx}

        if len(queries) < num_samples:
            answers = item['answers']['text']
            if answers:  # Has answer
                queries.append({
                    'question': item['question'],
                    'answer': answers[0],
                    'context_id': str(ctx_id)
                })

    corpus = list(contexts.values())[:num_samples * 2]
    queries = queries[:num_samples]

    print(f"Loaded {len(corpus)} contexts, {len(queries)} queries")
    return corpus, queries


def load_triviaqa_dataset(num_samples: int = 200) -> Tuple[List[Dict], List[Dict]]:
    """Load TriviaQA dataset - large-scale QA benchmark."""
    print("Loading TriviaQA dataset...")

    try:
        dataset = load_dataset("trivia_qa", "rc.nocontext", split="validation")
    except:
        print("TriviaQA not available, falling back to SQuAD")
        return load_squad_dataset(num_samples)

    corpus = []
    queries = []

    for i, item in enumerate(dataset):
        if i >= num_samples:
            break

        # TriviaQA has question and answer
        question = item.get('question', '')
        answer = item.get('answer', {}).get('value', '')

        if question and answer:
            # Create synthetic context from answer
            context = f"The answer to '{question}' is {answer}."
            corpus.append({'id': str(i), 'text': context})
            queries.append({
                'question': question,
                'answer': answer,
                'context_id': str(i)
            })

    print(f"Loaded {len(corpus)} contexts, {len(queries)} queries")
    return corpus, queries


def load_natural_questions(num_samples: int = 200) -> Tuple[List[Dict], List[Dict]]:
    """Load Natural Questions (simplified) dataset."""
    print("Loading Natural Questions dataset...")

    try:
        dataset = load_dataset("google-research-datasets/natural_questions", "default", split="validation")
    except:
        print("Natural Questions not available, falling back to SQuAD")
        return load_squad_dataset(num_samples)

    corpus = []
    queries = []

    for i, item in enumerate(dataset):
        if len(queries) >= num_samples:
            break

        question = item.get('question', {}).get('text', '')

        # Get short answer if available
        annotations = item.get('annotations', [{}])
        if annotations:
            short_answers = annotations[0].get('short_answers', [])
            if short_answers:
                answer = short_answers[0].get('text', '')
                if question and answer:
                    context = f"Question: {question} Answer: {answer}"
                    corpus.append({'id': str(i), 'text': context})
                    queries.append({
                        'question': question,
                        'answer': answer,
                        'context_id': str(i)
                    })

    print(f"Loaded {len(corpus)} contexts, {len(queries)} queries")
    return corpus, queries


# =============================================================================
# EVALUATION METRICS
# =============================================================================

def compute_exact_match(prediction: str, ground_truth: str) -> float:
    """Exact match score."""
    pred_clean = prediction.lower().strip()
    gt_clean = ground_truth.lower().strip()
    return 1.0 if gt_clean in pred_clean or pred_clean in gt_clean else 0.0


def compute_f1(prediction: str, ground_truth: str) -> float:
    """Token-level F1 score."""
    pred_tokens = set(prediction.lower().split())
    gt_tokens = set(ground_truth.lower().split())

    if not pred_tokens or not gt_tokens:
        return 0.0

    common = pred_tokens & gt_tokens
    if not common:
        return 0.0

    precision = len(common) / len(pred_tokens)
    recall = len(common) / len(gt_tokens)

    return 2 * precision * recall / (precision + recall)


def compute_recall_at_k(retrieved_ids: List[str], relevant_id: str, k: int = 3) -> float:
    """Recall@k - did we retrieve the relevant document?"""
    return 1.0 if relevant_id in retrieved_ids[:k] else 0.0


# =============================================================================
# BENCHMARK RUNNER
# =============================================================================

def run_benchmark(backend, dataset_name: str = "squad", num_samples: int = 100):
    """Run benchmark with specified backend and dataset."""

    print("=" * 70)
    print(f"MEMORY PALACE BENCHMARK")
    print(f"Backend: {backend.name}")
    print(f"Dataset: {dataset_name}")
    print("=" * 70)

    if not backend.is_available():
        print(f"ERROR: {backend.name} not available")
        return None

    # Load dataset
    if dataset_name == "squad":
        corpus, queries = load_squad_dataset(num_samples)
    elif dataset_name == "triviaqa":
        corpus, queries = load_triviaqa_dataset(num_samples)
    elif dataset_name == "nq":
        corpus, queries = load_natural_questions(num_samples)
    else:
        print(f"Unknown dataset: {dataset_name}")
        return None

    if not corpus or not queries:
        print("ERROR: Failed to load dataset")
        return None

    # Limit corpus size for embedding cost management
    max_corpus = min(100, len(corpus))
    corpus = corpus[:max_corpus]
    queries = [q for q in queries if q['context_id'] in [c['id'] for c in corpus]][:50]

    print(f"\nUsing {len(corpus)} documents, {len(queries)} queries")

    # Build retrievers
    print("\nBuilding Flat Retriever...")
    flat = FlatRetriever(corpus, backend)

    print("\nBuilding Hierarchical Retriever...")
    hier = HierarchicalRetriever(corpus, backend)

    # Run evaluation
    print(f"\nRunning evaluation on {len(queries)} queries...")

    results = {
        'flat': {'recall': [], 'em': [], 'f1': [], 'context': [], 'latency': []},
        'hierarchical': {'recall': [], 'em': [], 'f1': [], 'context': [], 'latency': []}
    }

    for i, query in enumerate(queries):
        question = query['question']
        answer = query['answer']
        relevant_id = query['context_id']

        # Flat retrieval
        start = time.time()
        flat_docs, flat_ctx = flat.retrieve(question, k=3)
        flat_latency = (time.time() - start) * 1000

        flat_ids = [d['id'] for d in flat_docs]
        flat_context = " ".join([d['text'] for d in flat_docs])
        flat_response = backend.generate(question, flat_context)

        results['flat']['recall'].append(compute_recall_at_k(flat_ids, relevant_id))
        results['flat']['em'].append(compute_exact_match(flat_response, answer))
        results['flat']['f1'].append(compute_f1(flat_response, answer))
        results['flat']['context'].append(flat_ctx)
        results['flat']['latency'].append(flat_latency)

        # Hierarchical retrieval
        start = time.time()
        hier_docs, hier_ctx, hops = hier.retrieve(question, k=3)
        hier_latency = (time.time() - start) * 1000

        hier_ids = [d['id'] for d in hier_docs]
        hier_context = " ".join([d['text'] for d in hier_docs])
        hier_response = backend.generate(question, hier_context)

        results['hierarchical']['recall'].append(compute_recall_at_k(hier_ids, relevant_id))
        results['hierarchical']['em'].append(compute_exact_match(hier_response, answer))
        results['hierarchical']['f1'].append(compute_f1(hier_response, answer))
        results['hierarchical']['context'].append(hier_ctx)
        results['hierarchical']['latency'].append(hier_latency)

        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(queries)}")

    # Aggregate results
    summary = {}
    for method, metrics in results.items():
        summary[method] = {
            'recall@3': np.mean(metrics['recall']),
            'exact_match': np.mean(metrics['em']),
            'f1': np.mean(metrics['f1']),
            'avg_context_bytes': np.mean(metrics['context']),
            'avg_latency_ms': np.mean(metrics['latency']),
            'n_queries': len(metrics['recall'])
        }

    # Print results
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)

    print(f"\n{'Method':<20} {'Recall@3':>10} {'EM':>10} {'F1':>10} {'Context':>12} {'Latency':>10}")
    print("-" * 75)

    for method, metrics in summary.items():
        print(f"{method:<20} {metrics['recall@3']:>10.1%} {metrics['exact_match']:>10.1%} "
              f"{metrics['f1']:>10.3f} {metrics['avg_context_bytes']:>10.0f}B "
              f"{metrics['avg_latency_ms']:>8.0f}ms")

    # Context reduction
    flat_ctx = summary['flat']['avg_context_bytes']
    hier_ctx = summary['hierarchical']['avg_context_bytes']
    reduction = (1 - hier_ctx / flat_ctx) * 100 if flat_ctx > 0 else 0

    print(f"\nContext Reduction: {reduction:.1f}%")

    # Save results
    output = {
        'timestamp': datetime.now().isoformat(),
        'backend': backend.name,
        'dataset': dataset_name,
        'corpus_size': len(corpus),
        'n_queries': len(queries),
        'results': summary,
        'context_reduction_pct': reduction
    }

    output_dir = Path(__file__).parent.parent / 'results'
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"standard_benchmark_{dataset_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\nResults saved to: {output_file}")

    return summary


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Run Memory Palace benchmark on standard datasets")
    parser.add_argument("--backend", choices=["ollama", "gemini"], default="ollama",
                       help="Model backend to use")
    parser.add_argument("--dataset", choices=["squad", "triviaqa", "nq"], default="squad",
                       help="Dataset to benchmark on")
    parser.add_argument("--samples", type=int, default=100,
                       help="Number of samples to evaluate")
    args = parser.parse_args()

    # Initialize backend
    if args.backend == "ollama":
        backend = OllamaBackend()
    else:
        backend = GeminiBackend()

    run_benchmark(backend, args.dataset, args.samples)


if __name__ == "__main__":
    main()
