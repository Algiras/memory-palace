# Context Command Handler

## Command
`/memory-palace context <global|project>`

## Execution Flow

1. **Parse Argument**
   - Validate: must be "global" or "project"
   - If invalid: show usage and current context

2. **If Switching to GLOBAL**
   
   a. **Verify Global Directory**
      - Check `~/memory/global/` exists
      - Create if missing:
        ```bash
        mkdir -p ~/memory/global
        ```
   
   b. **Initialize if Empty**
      - Create `palace-registry.json` with empty palaces array
      - Create `meta-index.md` with header
      - Create `learning-journal.md` template
   
   c. **Update Config**
      ```json
      {
        "context": "global",
        "activePalace": null,
        "lastContextSwitch": "YYYY-MM-DDTHH:MM:SS"
      }
      ```
   
   d. **Confirm Switch**
      ```
      🌍 Switched to GLOBAL context
      Location: ~/memory/global/
      
      Available palaces:
      • System Design Citadel (50 memories)
      • Career Skills Path (12 memories)
      
      💡 /memory-palace list - View all
      💡 /memory-palace create <name> - New palace
      ```

3. **If Switching to PROJECT**
   
   a. **Detect Project**
      - Look for `.git/` directory (up to 5 levels up)
      - If found:
        - Get remote URL: `git remote get-url origin`
        - Generate ID: `hash(remote_url)` or `hash(folder_path)`
      - If not found:
        - Use current folder path hash
        - Warn: "No git repo detected, using folder path"
   
   b. **Calculate Project ID**
      ```javascript
      function getProjectId() {
        const remote = execSync('git remote get-url origin 2>/dev/null || echo ""');
        if (remote) {
          return hashString(remote.trim());
        }
        return hashString(process.cwd());
      }
      
      function hashString(str) {
        // Simple hash: first 8 chars of base64 encoded sha256
        return crypto.createHash('sha256')
          .update(str)
          .digest('base64')
          .substring(0, 8);
      }
      ```
   
   c. **Create Project Directory**
      ```bash
      mkdir -p ~/memory/project/{projectId}
      ```
   
   d. **Initialize Project Structure**
      - Copy template registry.json
      - Create meta-index.md with project path
      - Create learning-journal.md
   
   e. **Update Config**
      ```json
      {
        "context": "project",
        "projectId": "a1b2c3d4",
        "projectPath": "/Users/algimantask/projects/my-app",
        "activePalace": null,
        "lastContextSwitch": "2026-02-01T10:30:00"
      }
      ```
   
   f. **Confirm Switch**
      ```
      📁 Switched to PROJECT context
      Project: my-app (a1b2c3d4)
      Location: ~/memory/project/a1b2c3d4/
      
      Available palaces:
      • Codebase Architecture (23 memories)
      • Team Conventions (8 memories)
      
      💡 /memory-palace list - View all
      💡 /memory-palace create <name> - New palace
      ```

4. **Context Detection Helper**

   Auto-detect on skill load:
   ```javascript
   function detectContext() {
     const config = loadConfig();
     
     // Check if in git repo
     try {
       const gitRoot = execSync('git rev-parse --show-toplevel 2>/dev/null');
       if (gitRoot) {
         const projectId = getProjectId();
         if (config.projectId === projectId) {
           return 'project';
         }
       }
     } catch (e) {
       // Not in git repo
     }
     
     return config.context || 'global';
   }
   ```

5. **Context Information Display**

   Always show current context in prompt:
   ```
   [memory-palace:global] > 
   [memory-palace:project/my-app] > 
   ```

## Error Handling

- **Invalid argument**: Show usage, list current context
- **Project detection failed**: Offer manual project ID entry
- **Permission denied**: Check ~/memory/ ownership
- **Config corruption**: Reset to defaults

## Context Inheritance

When creating new palace in project context:
- Auto-link to global palaces on related topics
- Mark as `parentPalace` in registry if extending
- Update both project and global meta-indexes

## Example Sessions

**Switch to Global:**
```
> /memory-palace context global
🌍 Switched to GLOBAL context
📍 ~/memory/global/
📝 3 palaces available
```

**Switch to Project (auto-detect):**
```
> /memory-palace context project
📁 Switched to PROJECT context
🔍 Detected: /Users/algimantask/projects/nile-knowledge
🆔 Project ID: a1b2c3d4
📍 ~/memory/project/a1b2c3d4/
📝 2 palaces available
```

**Show Current:**
```
> /memory-palace context
Current context: project (nile-knowledge)
Project ID: a1b2c3d4
Path: ~/memory/project/a1b2c3d4/
Active Palace: Codebase Architecture

💡 /memory-palace context global - Switch to global
```
