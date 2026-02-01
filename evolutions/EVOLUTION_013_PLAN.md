# Evolution 013: Distributed Storage

## 🎯 Question

**How do we sync memory palaces across devices with <1s latency and 100% reliability?**

Users have phones, laptops, tablets. They need access anywhere, offline capability, no data loss.

---

## 🧪 Hypothesis A: Cloud-First (Firebase/DynamoDB)

**Claim**: Cloud database as source of truth. Local = cache.

**Implementation**:
- Firebase Realtime DB or DynamoDB
- Real-time sync via WebSocket
- Local SQLite = offline cache
- Conflict resolution: last-write-wins

**Pros**: Simple, reliable, automatic sync
**Cons**: Requires internet, latency ~100-500ms

---

## 🧪 Hypothesis B: Local-First (CRDTs)

**Claim**: Local SQLite is source of truth. Background sync to cloud.

**Implementation**:
- CRDTs (Conflict-free Replicated Data Types)
- Local changes instant
- Async background sync
- Automatic conflict resolution

**Pros**: Instant response, offline-first
**Cons**: Complex conflict resolution, eventual consistency

---

## 🧪 Hypothesis C: Edge Caching (CDN + Local)

**Claim**: Cache frequently accessed memories at edge. Sync deltas.

**Implementation**:
- Working set cached locally
- Deltas synced periodically
- Cloudflare Workers / Lambda@Edge
- Geographically distributed

**Pros**: Fast globally, reduced bandwidth
**Cons**: Complexity, stale data risk

---

## 🧪 Hypothesis D: P2P Sync (WebRTC)

**Claim**: Devices sync directly peer-to-peer without cloud.

**Implementation**:
- WebRTC data channels
- Devices discover each other
- Sync when on same network
- Optional cloud backup

**Pros**: Private, no cloud dependency, fast local sync
**Cons**: Complex, devices must be online together

---

## 📊 Test Methodology

### Sync Benchmarks

**Scenario 1: Add Memory on Phone, View on Laptop**
- Phone: Add memory
- Measure: Time until visible on laptop
- Target: <1s

**Scenario 2: Offline Mode**
- Airplane mode: Add 10 memories
- Reconnect: Sync to cloud
- Measure: Sync time, data usage
- Target: <5s, <100KB

**Scenario 3: Conflict Resolution**
- Edit same memory on 2 devices simultaneously
- Measure: Conflict resolution accuracy
- Target: 100% (no data loss)

**Scenario 4: Large Sync**
- 1000 memories, initial sync
- Measure: Time, bandwidth
- Target: <30s, <5MB

---

## 📈 Expected Results

| Approach | Latency | Offline | Complexity | Privacy | Reliability |
|----------|---------|---------|------------|---------|-------------|
| Cloud-First | 200ms | ❌ Cache only | Low | Low | High |
| Local-First | 0ms | ✅ Full | High | High | High |
| Edge Caching | 50ms | ✅ Working set | Medium | Medium | Medium |
| P2P | 10ms (local) | ✅ LAN only | Very High | Very High | Low |

---

## 🔬 Implementation

```javascript
// Cloud-First Architecture
class CloudFirstSync {
  db = firebase.firestore();
  localCache = new SQLiteStorage();
  
  async init() {
    // Sync from cloud to local
    const snapshot = await this.db.collection('palaces').get();
    await this.localCache.import(snapshot);
    
    // Real-time updates
    this.db.collection('palaces').onSnapshot(changes => {
      changes.forEach(change => {
        this.localCache.update(change.doc.id, change.doc.data());
      });
    });
  }
  
  async addMemory(palaceId, memory) {
    // Write to cloud (triggers local update via listener)
    await this.db.collection('palaces').doc(palaceId)
      .collection('memories').add(memory);
  }
}

// Local-First with CRDTs
class LocalFirstSync {
  local = new SQLiteStorage();
  crdts = new CRDTManager();
  
  async addMemory(palaceId, memory) {
    // Instant local write
    const op = this.crdts.createOperation('add', palaceId, memory);
    await this.local.apply(op);
    
    // Async sync
    this.syncQueue.add(op);
  }
  
  async sync() {
    const pending = await this.syncQueue.getPending();
    await this.cloud.applyOperations(pending);
    
    const remoteOps = await this.cloud.getNewOperations();
    for (const op of remoteOps) {
      await this.crdts.merge(op);
    }
  }
}

// Edge Caching
class EdgeSync {
  local = new LRUCache({ max: 100 });
  edge = new CloudflareWorkerClient();
  
  async getMemory(id) {
    // Check local first
    if (this.local.has(id)) {
      return this.local.get(id);
    }
    
    // Check edge cache
    const cached = await this.edge.get(id);
    if (cached) {
      this.local.set(id, cached);
      return cached;
    }
    
    // Fetch from origin
    const memory = await this.origin.get(id);
    this.edge.set(id, memory);
    this.local.set(id, memory);
    return memory;
  }
}
```

---

## 🎯 Success Criteria

- **Sync Latency**: <1s for active devices
- **Offline Capability**: Full read, queued writes
- **Conflict Resolution**: 100% accuracy, no data loss
- **Bandwidth**: <100KB per sync
- **Battery**: Background sync <5% drain/hour
- **Storage**: <100MB local cache

---

## 🏆 Selection Logic

### Cloud-First Wins If:
- Simple implementation prioritized
- Always-online assumption valid
- Cost acceptable

### Local-First Wins If:
- Offline-first is critical
- Users edit frequently
- Privacy is priority

### Edge Caching Wins If:
- Global performance needed
- Bandwidth reduction critical
- Cost optimization

### P2P Wins If:
- Maximum privacy
- LAN sync sufficient
- No cloud dependency

### Hybrid Recommendation:
**Local-First + Cloud Backup**
- Primary: Local SQLite (instant)
- Sync: Background to cloud (eventual)
- P2P: Optional LAN sync (fast local)

---

## 🚨 Concerns & Mitigations

**Conflict Resolution**:
- Use CRDTs for automatic merging
- Last-write-wins for simple cases
- User prompt for complex conflicts

**Data Loss**:
- Multiple backups (local + cloud + optional 2nd cloud)
- Version history (keep last 30 days)
- Export reminder weekly

**Bandwidth**:
- Delta sync only (changed fields)
- Compression (gzip, 5:1 ratio)
- WiFi-only for large syncs

**Privacy**:
- End-to-end encryption
- Zero-knowledge option
- Self-hosting option

---

*Evolution 013: Your memories, everywhere, always*
