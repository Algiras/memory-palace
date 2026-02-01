# Recall Command Handler

## Command
`/memory-palace recall [topic]`

## Execution Flow

1. **Parse Arguments**
   - If topic provided: search for specific memory
   - If no topic: offer recall options

2. **Load Palace Context**
   - Detect context (global/project)
   - Load active palace from registry
   - Load `meta-index.md` for anchors

3. **If Topic Specified**
   - Search palace for matching `subject` or `content`
   - Use topic index in registry for fast lookup
   - If found: navigate to that locus
   - If not found: suggest similar topics or full tour

4. **If No Topic - Present Options**
   
   ```
   🔍 RECALL OPTIONS:
   1. 🏰 Full Tour - Walk all loci systematically
   2. 🕐 Recent Memories - Last 5 stored
   3. 🎯 Random Quiz - Test random memories
   4. 🔗 Linked Chain - Follow memory connections
   5. 📍 Current Locus - Review active location
   ```

5. **Execute Recall Walk**

   For each locus in path:
   
   a. **Describe Locus Vividly**
      - Read `anchor` and `description`
      - Paint sensory picture (sight, sound, smell)
      - Establish spatial orientation
   
   b. **Present Memory Images**
      - For each memory in locus:
        - Show image (don't reveal content yet)
        - Ask: "What do you see? What does this represent?"
        - Wait for user recall attempt
   
   c. **Reveal Content**
      - Show `content` field
      - Compare to user's recall
      - Note accuracy and gaps
   
   d. **Update Stats**
      - Increment `recallCount`
      - Update `lastRecalled`
      - Adjust `confidence` based on accuracy

6. **Navigation Options**
   - Continue to next locus?
   - Jump to specific locus?
   - Deep dive on specific memory?
   - End tour?

7. **Post-Recall**
   - Summarize what was recalled
   - Identify weak spots (low confidence)
   - Suggest: `/memory-palace red-queen weak-spots`

## Memory Presentation Format

```
📍 LOCUS: Tower of Fundamentals
🔰 ANCHOR: Ancient stone tower with glowing blue runes

Memory 1 of 3:
🖼️ IMAGE: Two GLADIATORS locked in eternal combat! PERFORMANCE 
   is a CHEETAH-MAN, blindingly fast but ALONE. SCALABILITY is 
   a HYDRA - slower, but grows NEW HEADS...

🤔 What does this represent?
[User answers]

✅ CORRECT: Performance vs Scalability
📖 Performance: how fast for one user
📖 Scalability: maintaining performance as load increases

Confidence rating (1-5)? [User rates]
```

## Error Handling

- **No active palace**: List available, ask to select
- **Empty palace**: Guide to `/memory-palace store`
- **Topic not found**: Fuzzy search, suggest alternatives
- **Context switch**: Re-load appropriate palace

## Example Sessions

**Topic-Specific:**
```
> /memory-palace recall "CAP theorem"
🔍 Searching for "CAP theorem"...
📍 Found: Fundamentals Tower → Consistency Corner

🚶 Walking to location...
[Present CAP theorem memory with three-headed dragon]
```

**Full Tour:**
```
> /memory-palace recall
🏰 Starting full tour of System Design Citadel
12 loci, 50 memories

📍 LOCUS 1: Sky Bridge Entrance
[Continue through all loci...]
```
