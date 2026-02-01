# List Command Handler

## Command
`/memory-palace list`

## Execution Flow

1. **Detect Contexts**
   - Check both global and project contexts
   - Determine if in a project directory
   - Identify project ID if applicable

2. **Load Registries**
   - Load `~/memory/global/palace-registry.json`
   - If project context: load `~/memory/project/{id}/palace-registry.json`

3. **Display Global Palaces**
   ```
   🌍 GLOBAL PALACES (~/memory/global/)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   #  Palace Name              Theme              Memories  Last Access
   ─  ───────────────────────  ─────────────────  ────────  ───────────
   1  System Design Citadel    Floating Citadel   50        Today
   2  Algorithms Tower         Ancient Library    0         Never
   3  Career Skills Path       Journey Path       12        3 days ago
   ```

4. **Display Project Palaces (if applicable)**
   ```
   📁 PROJECT PALACES (~/memory/project/a1b2c3d4/)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   #  Palace Name              Theme              Memories  Last Access
   ─  ───────────────────────  ─────────────────  ────────  ───────────
   1  Codebase Architecture    Space Station      23        Today
   2  Team Conventions         Ancient Library    8         Yesterday
   ```

5. **Show Summary Statistics**
   ```
   📊 SUMMARY
   ━━━━━━━━━━
   Total Palaces: 7
   Total Memories: 93
   Active Palace: System Design Citadel
   Next Review Due: 2 memories
   ```

6. **Quick Actions**
   ```
   💡 Quick Actions:
   • /memory-palace open <name> - Set active palace
   • /memory-palace create <name> - Create new palace
   • /memory-palace status - Detailed statistics
   ```

## Display Columns

- **#**: Sequential number for reference
- **Palace Name**: Full name from registry
- **Theme**: Theme description
- **Memories**: Count from registry
- **Loci**: Number of locations
- **Last Access**: Human-readable date
- **Priority**: high/normal/low indicator

## Sorting Options

Default: Last accessed (most recent first)
Alternative sorts:
- Alphabetical
- Memory count (most first)
- Creation date
- Priority

## Filter Options

```
> /memory-palace list --theme "Ancient Library"
> /memory-palace list --with-memories
> /memory-palace list --recent
```

## Error Handling

- **No palaces**: Guide to `/memory-palace create`
- **Registry missing**: Offer to initialize
- **Permission denied**: Check ~/memory/ permissions
- **Corrupted registry**: Show what can be salvaged

## Example Output

```
> /memory-palace list

🌍 GLOBAL PALACES (~/memory/global/)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#  Palace Name              Theme              Memories  Last Access
─  ───────────────────────  ─────────────────  ────────  ───────────
1  System Design Citadel    Floating Citadel   50        Today ⭐
2  Career Skills Path       Journey Path       12        3 days ago
3  Algorithms Tower         Ancient Library    0         Never

📁 PROJECT PALACES (current: nile-knowledge)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#  Palace Name              Theme              Memories  Last Access
─  ───────────────────────  ─────────────────  ────────  ───────────
1  Codebase Architecture    Space Station      23        Today ⭐
2  Team Conventions         Ancient Library    8         Yesterday

📊 SUMMARY
Total Palaces: 5
Total Memories: 93
Active: System Design Citadel (global)

💡 /memory-palace create <name> | /memory-palace open <name>
```
