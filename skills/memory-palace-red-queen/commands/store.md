# Store Command Handler

## Command
`/memory-palace store <topic>`

## Execution Flow

1. **Ensure Active Palace**
   - Check context (global/project)
   - Load `palace-registry.json`
   - If no active palace, list available and ask user to select
   - If multiple palaces, ask which one

2. **Load Palace**
   - Load `<palace-name>.json`
   - Identify current `activeLocus`
   - Show available loci (or current location)

3. **Get Memory Content**
   - Ask user: "What would you like to remember about <topic>?"
   - Accept detailed explanation, code, concepts, procedures
   - Clarify: "What are the key points to memorize?"

4. **SMASHIN SCOPE Transformation**
   
   Apply 12 principles to create vivid image:
   
   | Principle | Application |
   |-----------|-------------|
   | **S**ubstitute | Abstract → concrete object |
   | **M**ovement | Make it animated/action |
   | **A**bsurd | Exaggerate, make impossible |
   | **S**ensory | Add sound, smell, touch, taste |
   | **H**umor | Make it funny/memorable |
   | **I**nteract | User participates in scene |
   | **N**umbers | Encode as shapes/objects |
   | **S**ymbols | Use visual puns/metaphors |
   | **C**olor | Vivid, unusual colors |
   | **O**versize | Dramatic scale changes |
   | **P**osition | Precise spatial placement |
   | **E**motion | Strong emotional reaction |

5. **Present & Refine Image**
   - Describe vivid image to user
   - Ask: "Does this image capture the key points?"
   - If no: iterate, adjust specific elements
   - If yes: proceed

6. **Select Locus**
   - Option 1: Add to current locus
   - Option 2: Create new child locus
   - Option 3: Move to different existing locus
   
   If new locus:
   - Generate ID (kebab-case)
   - Create anchor (vivid description)
   - Link to parent
   - Update loci tree

7. **Create Memory Entry**
   ```json
   {
     "id": "<palace-prefix>-<incremental-number>",
     "subject": "<topic>",
     "image": "<vivid SMASHIN SCOPE description>",
     "content": "<actual information to remember>",
     "created": "YYYY-MM-DD",
     "confidence": 3,
     "lastRecalled": null,
     "recallCount": 0,
     "linkedTo": []
   }
   ```

8. **Save & Update**
   - Save palace JSON
   - Update registry (memoryCount++, lastAccessed)
   - Update meta-index with short anchor
   - If new locus, update topic index

9. **Reinforcement Walk**
   - Briefly walk back through the locus
   - Point to the new memory
   - Describe the image again
   - Encourage mental rehearsal

## Error Handling

- **Topic exists**: Ask to update or create variant
- **Locus full**: Suggest new locus or palace extension
- **Content too long**: Chunk into multiple linked memories
- **Context loss**: Re-detect from git remote or folder

## Example

```
> /memory-palace store "generics"

📍 Current location: Tower of Fundamentals

What would you like to remember about generics?
[User explains TypeScript generics concept]

🎨 Creating SMASHIN SCOPE image...

📸 MEMORY IMAGE:
A GIANT PLASTIC CONTAINER with a MAGNIFYING GLASS lid! Inside, you 
can put ANYTHING—apples, cars, code. The magnifying glass (type 
parameter) lets you ZOOM in and see exactly what's inside. The 
container ADAPTS to whatever you put in it. It HUMS with versatility, 
the plastic shimmering RAINBOW COLORS as it transforms!

Does this capture generics for you? (yes/refine)
[y]

✅ Memory stored: Tower of Fundamentals
🔗 ID: ts-001
📊 Palace now has 7 memories

🚶 Reinforcement walk: Tower of Fundamentals → Generics Container
```
