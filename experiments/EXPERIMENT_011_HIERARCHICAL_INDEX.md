# Experiment 011: Hierarchical Index with Anti-Hallucination

**Date**: 2026-02-01
**Status**: ✅ VALIDATED
**Type**: Retrieval Architecture

## Problem Solved

| Issue | Solution |
|-------|----------|
| LLM skips steps | Forced 2-hop retrieval path |
| LLM hallucinates | Verify tokens catch fabrication |
| Too much context | 97% reduction via hierarchy |
| Slow retrieval | O(1) lookups at each level |

## Architecture

```
LEVEL 0: Root Index (400 chars)
    │
    │   "2pc" → DISTRIBUTED
    │
    ▼
LEVEL 1: Domain Index (300 chars)
    │
    │   wedding-statues → citadel.json:327
    │   verify: "47 couples"
    │
    ▼
LEVEL 2: Actual Memory (500 chars)
    │
    │   Full SMASHIN SCOPE image
    │   Contains verify token
    │
    ▼
ANSWER (with verification)
```

## Anti-Hallucination Test Results

### Test A: Withhold Source File
- LLM asked to answer without actual memory
- Result: **REFUSED** to fabricate
- Confidence: 0/10 (honest)
- Verify token: NOT present (correct)

### Test B: Full Retrieval Path
- LLM followed 2-hop protocol
- Read actual file at specified line
- Result: **ACCURATE** answer
- Verify token: "47 couples" ✅ PRESENT

## Metrics

| Metric | Flat Scan | Hierarchical | Improvement |
|--------|-----------|--------------|-------------|
| Context needed | 46,500 chars | 1,200 chars | **97% less** |
| Hops to memory | 1 (scan all) | 2 (direct) | **Predictable** |
| Hallucination risk | High | Low | **Verifiable** |
| Index size | N/A | 2.5 KB | **Minimal** |

## Verify Token System

Each memory has a unique phrase that:
1. Only exists in the actual stored content
2. Seems unrelated to the concept (hard to guess)
3. Must appear in any valid answer

| Concept | Verify Token | Why It Works |
|---------|--------------|--------------|
| 2PC | "47 couples" | Specific number, unusual context |
| Write-Behind | "50-foot grandmother" | Absurd scale, emotional |
| CAP | "two heads breathe" | Dragon metaphor specific |
| Consistent Hashing | "gnomes on clock" | Unique visual |

## Files Created

```
~/memory/global/
├── palace-root-index.md      # Level 0 (400 chars)
└── index/
    ├── fundamentals.md       # Level 1 domain
    ├── scaling.md            # Level 1 domain
    └── distributed.md        # Level 1 domain
```

## Retrieval Protocol

```python
def retrieve(query):
    # Step 1: Root index (always loaded)
    domain = root_index.match_keyword(query)

    # Step 2: Domain index (load on demand)
    domain_index = load(f"index/{domain}.md")
    location = domain_index.get_location(query)
    verify_token = domain_index.get_verify(query)

    # Step 3: Actual memory (load on demand)
    memory = read_file(location.file, location.line)

    # Step 4: Generate answer
    answer = generate_answer(memory)

    # Step 5: Verify (anti-hallucination)
    if verify_token not in answer:
        raise HallucinationError("Answer lacks verify token")

    return answer
```

## Conclusion

The hierarchical index with verification tokens:

1. **Reduces context by 97%** - Only load what's needed
2. **Forces actual retrieval** - Index has pointers, not content
3. **Catches hallucination** - Verify tokens are checksums
4. **Scales to 1000+ memories** - O(1) at each level

> "The index is a map, not the territory. Force the LLM to visit the territory."
