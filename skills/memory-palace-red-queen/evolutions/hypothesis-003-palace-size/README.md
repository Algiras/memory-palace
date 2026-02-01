# Hypothesis 003: Palace Size Optimization

## Research Question

**Does Miller's Law (7±2 items) apply to memory palaces?**

Are palaces with 5-9 loci more effective than larger palaces (12+ loci) or flat structures?

---

## Theoretical Framework

### Miller's Law
George Miller's 1956 paper "The Magical Number Seven, Plus or Minus Two" established that humans can hold approximately 7±2 items in working memory simultaneously. This fundamental limit of cognitive capacity has implications for information architecture and spatial memory.

### Application to Memory Palaces
The Memory Palace technique relies on navigating a familiar spatial structure to retrieve information. If Miller's Law applies:

- **Small palaces (5 loci)**: Easy to navigate but limited capacity
- **Medium palaces (9 loci)**: Optimal (7+2), balanced capacity and navigability
- **Large palaces (15 loci)**: Risk cognitive overload with flat structure
- **Hierarchical structures**: May overcome limits through chunking

### Key Hypotheses

| Hypothesis | Prediction |
|------------|------------|
| **A: Medium Optimal** | 9-locus palaces win - optimal balance of capacity and navigability |
| **B: Hierarchical Advantage** | Chunked structures overcome Miller's limit through hierarchical organization |
| **C: Organization Over Size** | Size is irrelevant; organization and familiarity matter more |

---

## Test Design

### Palace Structures

Four palace configurations will be tested, each containing the same density of memories (5 memories per locus):

#### 1. Small Palace
```
Structure: 5 loci, linear
Capacity: 25 memories (5 per locus)
Example: Front Door → Hallway → Kitchen → Living Room → Bedroom
```

**Characteristics:**
- Single path, no branching
- Complete visibility of entire palace
- Minimal cognitive load
- Limited capacity for expansion

#### 2. Medium Palace (Miller's Optimal)
```
Structure: 9 loci, linear with minor branches
Capacity: 45 memories (5 per locus)
Example: Entrance → Foyer (Left/Right) → Main Hall → Kitchen/Dining → Living Room → Study → Bedroom → Bathroom
```

**Characteristics:**
- Natural home layout with 9 distinct rooms
- Single level of branching (foyer split)
- Balanced complexity
- Matches 7±2 working memory limit

#### 3. Large Palace (Flat Structure)
```
Structure: 15 loci, flat layout
Capacity: 75 memories (5 per locus)
Example: Large mansion with 15 rooms on single floor
Path: Entrance → Room 1 → Room 2 → ... → Room 15
```

**Characteristics:**
- Linear progression through many spaces
- No hierarchical organization
- High cognitive load for navigation
- Tests pure Miller's limit

#### 4. Hierarchical Palace
```
Structure: 12 main loci + 3 extension wings
Capacity: 75 memories total (5 per locus)
Hierarchy:
  Main Wing (12 loci)
    ├── East Wing (3 loci)
    ├── West Wing (3 loci)
    └── North Wing (3 loci)
```

**Characteristics:**
- Chunked into 4 groups of 3 loci each
- Hierarchical navigation (choose wing, then room)
- Tests chunking theory
- Same capacity as Large palace

---

## Methodology

### Phase 1: Palace Construction

1. **Standardize Memory Content**
   - Use identical memory sets across all palaces
   - 5 memories per locus, evenly distributed difficulty
   - Mix of factual, procedural, and episodic memories

2. **Control Variables**
   - Same user for all tests
   - Same training time (30 minutes per palace)
   - Same memory encoding technique
   - Same recall interval (24 hours post-training)

3. **Virtual Environment**
   - Create 3D representations of each palace
   - Consistent visual style and fidelity
   - Navigation via consistent interface

### Phase 2: Data Collection

#### Metric 1: Recall Speed

```
Measurement: Time from memory cue to location in palace

Procedure:
1. Present memory identifier (e.g., "Find: Birthday 2020")
2. User navigates to correct locus
3. Record time until arrival confirmation

Trials: 20 random memories per palace
Expected: Medium < Hierarchical < Small < Large
```

#### Metric 2: Navigation Accuracy

```
Measurement: Correct path efficiency

Procedure:
1. Track user path from entrance to target locus
2. Count wrong turns, backtracking, hesitations
3. Calculate efficiency: optimal_steps / actual_steps

Scoring:
- 1.0 = Perfect path
- 0.8-0.99 = Minor inefficiencies
- 0.5-0.79 = Significant wrong turns
- <0.5 = Lost/confused

Expected: Medium > Small > Hierarchical > Large
```

#### Metric 3: Cognitive Load (Simulated)

```
Measurement: Working memory burden proxy

Proxies:
1. Navigation hesitation time at decision points
2. Frequency of "where am I?" queries
3. Secondary task performance (dual-task paradigm)

Calculation:
Cognitive Load Score = Σ(hesitation_time × decision_complexity)

Expected: Large > Hierarchical > Medium > Small
```

#### Metric 4: Retention Rate

```
Measurement: % of memories recalled correctly

Procedure:
1. Train user on palace (30 min)
2. 24-hour delay
3. Test: Random 50% of memories
4. Score: correct_loci / total_tested

Expected: Medium ≈ Hierarchical > Small > Large
```

#### Metric 5: User Preference

```
Measurement: Subjective experience ratings

Questions (1-10 scale):
1. "How natural did navigation feel?"
2. "How confident were you in your path?"
3. "How easy was it to remember the layout?"
4. "How willing would you be to use this palace daily?"
5. "Rate your mental fatigue after use"

Composite Score: Average of Q1-Q4 (higher = better)

Expected: Medium > Hierarchical > Small > Large
```

### Phase 3: Analysis

#### Statistical Tests

```
1. ANOVA: Compare recall speed across 4 palace types
2. Chi-square: Navigation accuracy distributions
3. Correlation: Palace size vs cognitive load
4. Regression: Predict retention from palace structure
```

#### Success Criteria

**Hypothesis A wins if:**
- Medium palace has fastest recall (p < 0.05)
- Medium has highest retention rate
- Medium scores highest on user preference
- Large palace shows significantly worse performance

**Hypothesis B wins if:**
- Hierarchical matches or exceeds Medium performance
- Hierarchical shows better retention than Large
- User preference for Hierarchical ≥ Medium
- Evidence of effective chunking in navigation patterns

**Hypothesis C wins if:**
- No significant differences between palace sizes
- User preference correlates with familiarity, not size
- Organization metrics (path clarity, distinctiveness) predict performance better than size

---

## Implementation Details

### Palace Rendering Specifications

```yaml
visual_style:
  palette: neutral_colors  # Consistent across all palaces
  lighting: natural_daylight
  textures: realistic_but_simplified
  scale: human_proportional

navigation:
  movement_speed: 1.5 m/s walking pace
  turn_rate: 90 degrees per 0.5 seconds
  interaction: click-to-move or WASD
  
loci_markers:
  visual_distinctiveness: high  # Each room visually unique
  audio_cues: optional ambient sounds
  transition_zones: clear doorways/arches
```

### Memory Encoding Protocol

```
Standard Encoding (30 minutes per palace):
1. Introduction (5 min): Palace layout walkthrough
2. Loci Familiarization (10 min): Visit each locus, note characteristics
3. Memory Placement (10 min): Place 5 memories per locus using method of loci
4. Consolidation (5 min): Full palace walkthrough, reinforce associations

Memory Types per Locus:
- 2 factual (definitions, facts)
- 2 procedural (steps, processes)
- 1 episodic (personal event, story)
```

### Data Logging

```javascript
// Example tracking schema
{
  session_id: "uuid",
  palace_type: "small|medium|large|hierarchical",
  timestamp: "ISO8601",
  event_type: "navigation_start|decision_point|arrival|error",
  position: { x, y, z },
  target_locus: "locus_id",
  time_to_target: milliseconds,
  path_efficiency: 0.0-1.0,
  cognitive_markers: {
    hesitations: count,
    backtracks: count,
    help_requests: count
  }
}
```

---

## Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| **Setup** | Week 1 | Build 4 palace environments, create memory sets |
| **Pilot** | Week 2 | Test with 5 users, refine metrics |
| **Data Collection** | Weeks 3-6 | 50 participants × 4 palaces each |
| **Analysis** | Week 7 | Statistical analysis, visualization |
| **Conclusion** | Week 8 | Write findings, recommendations |

---

## Selection Criteria

### Go/No-Go Decision Framework

**Proceed if:**
- [ ] At least 40 participants complete all 4 palace tests
- [ ] Data quality score > 80% (complete logs, valid timestamps)
- [ ] Clear statistical significance (p < 0.05) for at least 3 metrics
- [ ] No technical failures > 10% of sessions

**Pivot if:**
- [ ] No significant differences between palace types
- [ ] User preference contradicts performance metrics
- [ ] Technical issues prevent accurate measurement
- [ ] Retention rates < 60% across all palaces (indicates flawed methodology)

### Success Metrics Summary

| Outcome | Criteria |
|---------|----------|
| **Strong Evidence** | One palace type significantly superior (p < 0.01) on ≥4 metrics |
| **Moderate Evidence** | One palace type superior (p < 0.05) on 2-3 metrics |
| **Weak/Inconclusive** | Mixed results, no clear winner |
| **Reject Hypothesis** | All palaces perform equally; organization is key factor |

---

## Related Hypotheses

- [Hypothesis 001: Spatial Density](../hypothesis-001-spatial-density/README.md) - Optimal memory density per locus
- [Hypothesis 002: Navigation Patterns](../hypothesis-002-navigation-patterns/README.md) - Linear vs radial palace layouts
- **Hypothesis 003: Palace Size** (this document) - Miller's Law application

---

## References

1. Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review*, 63(2), 81-97.

2. Bower, G. H. (1970). Analysis of a mnemonic device: Modern psychology uncovers the powerful components of an ancient technique for improving memory. *American Scientist*, 58(5), 496-510.

3. Yates, F. A. (1966). *The Art of Memory*. University of Chicago Press.

4. Baddeley, A. D. (2000). The episodic buffer: a new component of working memory? *Trends in Cognitive Sciences*, 4(11), 417-423.

5. Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. *Behavioral and Brain Sciences*, 24(1), 87-114.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-01 | Claude | Initial hypothesis document creation |

---

*This hypothesis is part of the Memory Palace Evolution Framework. For methodology standards, see [../methodology.md](../methodology.md).*
