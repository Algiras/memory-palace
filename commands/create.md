# Create Command Handler

## Command
`/memory-palace create <name> [theme]`

## Execution Flow

1. **Validate Context**
   - Check if `global` or `project` context active
   - If project context, verify project ID exists in `~/memory/project/`

2. **Theme Selection (if not provided)**
   - Suggest 3 options:
     - "Ancient Library" (hierarchical knowledge, bookshelves)
     - "Space Station" (technical systems, modules)
     - "Journey Path" (sequential learning, trail)
   - Wait for user selection

3. **Generate Palace Structure**
   ```json
   {
     "name": "<name>",
     "created": "YYYY-MM-DD",
     "theme": "<theme>",
     "activeLocus": "entrance",
     "loci": [
       {
         "id": "entrance",
         "name": "Grand Entrance",
         "anchor": "<vivid anchor description>",
         "description": "<detailed scene description>",
         "memories": [],
         "children": [],
         "parent": null
       }
     ]
   }
   ```

4. **Create Entrance Anchor**
   - Generate vivid SMASHIN SCOPE image for entrance
   - Describe to user:
     - Visual details
     - Sensory elements (sound, smell, texture)
     - Emotional tone
     - Memorable features

5. **Save Palace**
   - Path: `~/memory/{context}/<slugified-name>.json`
   - Slugify: lowercase, hyphenated, no special chars

6. **Update Registry**
   - Load `palace-registry.json`
   - Add entry:
     ```json
     {
       "id": "<slugified-name>",
       "name": "<name>",
       "file": "<slugified-name>.json",
       "memoryCount": 0,
       "lociCount": 1,
       "theme": "<theme>",
       "topics": [],
       "created": "YYYY-MM-DD",
       "lastAccessed": "YYYY-MM-DD",
       "accessCount": 1,
       "priority": "normal"
     }
     ```
   - Save registry

7. **Update Meta-Index**
   - Add short anchor to `meta-index.md`
   - Format: `- **<name>**: <theme> - <entrance anchor summary>`

8. **Confirm Creation**
   - Display palace summary
   - Show entrance anchor vividly
   - Suggest next: `/memory-palace store <topic>`

## Error Handling

- **Name collision**: Append number ("name-2", "name-3")
- **Invalid characters**: Auto-slugify, warn user
- **Missing context**: Default to global with warning
- **Permission denied**: Check ~/memory/ exists, offer to create

## Example

```
> /memory-palace create "TypeScript Mastery" "Ancient Library"

🏛️ Creating palace: TypeScript Mastery
Theme: Ancient Library

🚪 ENTRANCE ANCHOR:
You stand before massive oak doors carved with glowing TypeScript 
symbols. As they creak open, you smell old paper and ozone. Inside, 
the library breathes—bookshelves shift and rearrange. A beam of 
golden light hits a central pedestal where the first memory awaits.

✅ Palace created: ~/memory/global/typescript-mastery.json
📚 Registry updated
📝 Meta-index updated

Next: /memory-palace store "generics"
```
