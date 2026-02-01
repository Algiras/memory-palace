# Learning Journal - System Design Citadel

## Session 1: 2026-02-01

### Protocol: READ QUEEN
- **R**ecall - Attempt retrieval without looking
- **E**valuate - Check accuracy against source
- **A**nalyze - Find gaps, confusions, weak links
- **D**evelop - Create new memories/links

- **Q**uestion - Generate challenging questions
- **U**ncover - Find edge cases that break recall
- **E**xtend - Add new knowledge domains
- **E**volve - Improve palace structure
- **N**avigate - Build better indexes/TOCs

---

## Recall Attempt #1 (blind)

### What I think I remember:

**CAP Theorem**: Three-headed dragon... C is consistency (blue), A is availability (green), P is partition tolerance (red). Only 2 heads can breathe at once. In practice P is required so choose CP or AP.

**Consistent Hashing**: Clock face with gnomes... data thrown like darts, rolls clockwise to nearest gnome. When gnome leaves, only adjacent data moves.

**Circuit Breaker**: Electrical breaker... closed (normal), open (failing fast), half-open (testing). Prevents cascade failures.

**Vector Clocks**: Scoreboard tracking everyone's counters... can detect concurrent events unlike Lamport clocks.

### What feels fuzzy:
- Exact difference between write-through vs write-behind cache?
- Saga pattern details?
- What's in the Reliability Rampart?

---

## Gaps Identified:
1. Need stronger links between related concepts
2. Missing: DNS, specific consensus algorithm details, real-world examples
3. No "failure mode" memories - what happens when things break
4. No interview question hooks

---

## Recall Test #1 (from anchors only)

Testing reconstruction ability without reading full palace JSON:

| Anchor | Could Recall Image? | Could Recall Content? | Confidence |
|--------|---------------------|----------------------|------------|
| Three-headed dragon CAP | ✓ | ✓ | High |
| Clock face with gnomes | ✓ | ✓ | High |
| Wedding ceremony (2PC) | ✓ | ✓ | High |
| Paranoid accountant diary (WAL) | ✓ | Partial | Medium |
| Pool water lines (watermarks) | ✓ | Weak | Low |
| Numbered ticket (fencing) | ✓ | ✓ | High |

### Findings:
- **Strong**: Images with emotional/absurd elements (dragon, wedding) recall better
- **Weak**: Technical patterns with similar mechanics (watermarks) blur together
- **Action**: Need more DISTINCT anchors for similar concepts

### Breaking Points Found:
1. **Low/High Water Mark confusion** - both use pool metaphor, need differentiation
2. **Lease vs Fencing Token** - related but distinct, need clearer link
3. **Missing**: What happens when things FAIL? Need failure mode images

---

## Red Queen Protocol Session #1

**Date:** 2026-02-01
**Strategy:** Adversarial multi-agent testing (haiku models)

### Agents Used:
- Examiner (haiku): Generated 5 challenging questions
- Learner (haiku): Attempted blind recall from anchors
- Evaluator (haiku): Scored accuracy, identified gaps

### Results:

| Question | Score | Key Gap |
|----------|-------|---------|
| CAP Theorem | 4.5/5 | Missing dragon metaphor, no examples (robot banker, clone store) |
| Consistent Hashing | 4.0/5 | Missing virtual nodes, no darts/rolling image |
| 2PC vs Saga | 4.5/5 | Good! Missing "priest dies = forever" drama |
| Thundering Herd | 4.0/5 | Missing buffalo stampede visual |

**Overall: 4.25/5 (85%)**

### Critical Finding:
> "Learner prioritizes technical correctness over memorable mental models"

The Red Queen revealed: **technical knowledge decays without vivid anchors**.
Answers were factually correct but lacked the emotional/absurd imagery that enables long-term retention.

### Priority Gaps to Strengthen:
1. Add specific examples to CAP (robot banker, clone store)
2. Add virtual nodes concept to consistent hashing
3. Dramatize failure modes ("priest dies = FOREVER frozen")
4. Embody the buffalo stampede viscerally

### Confidence Calibration: APPROPRIATE
Learner's 4/5 ratings matched actual performance. Good metacognition.

---

## Red Queen Protocol Session #2 (Weak Spot Targeting)

**Date:** 2026-02-01
**Strategy:** Target specific weak spots with EVOLVER strengthening

### Weak Spots Strengthened:

| Concept | Enhancement | New Element |
|---------|-------------|-------------|
| Consistent Hashing | Holographic clone gnomes | Virtual nodes = 3 clones per gnome |
| CAP Theorem | Robot banker + Clone store statues | Concrete CP/AP examples |
| Two-Phase Commit | Priest dies mid-ceremony | ETERNAL blocking horror |
| Thundering Herd | 10,000 buffalo, ONE door | Visceral crushing, bone-cracking |

### Key Improvements:

1. **Virtual Nodes**: Added "whoosh-whoosh-whoosh" sound of smooth redistribution
2. **CAP Examples**: Robot with BZZZZT alarm (CP), arguing clones (AP)
3. **2PC Horror**: Moldy wedding photos, hollow eyes, skeleton music
4. **Stampede**: Chest vibration, choking dust, screaming buffalo

### Sensory Depth Added:
- Sound: Whoosh, BZZZZT, crack, boom-boom, screaming
- Smell: Sulfur, decaying flowers, blood and fear
- Touch: Crushing pressure, chest vibration, choking dust
- Emotion: Dread, horror, relief, helplessness

### File Created:
`enhanced-memories.json` - Contains all strengthened images

---

## Extension Completed

Added Distributed Patterns Wing with 18 new memories:
- Durability Hall: WAL, Segmented Log, Water Marks
- Consensus Chamber: Leader/Followers, Heartbeat, Quorum, Epoch, Replicated Log
- Coordination Corridor: Lease, Fencing, State Watch, Consistent Core, Idempotent
- Partitioning Pit: Fixed/Range Partitions, Gossip, Emergent Leader

**Total memories now: 68**

---
