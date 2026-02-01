# Q&A Recall Challenges

Test your memory palace recall. Cover the answers, recall the vivid image, then check.

---

## Level 1: Basic Recall (Single Concept)

### Q1: What is the CAP theorem?
<details>
<summary>Image Anchor</summary>
Three-headed dragon named CAP - blue (C), green (A), red (P) - only 2 heads can breathe at once!
</details>
<details>
<summary>Answer</summary>
Distributed systems can only guarantee 2 of 3: Consistency, Availability, Partition Tolerance. In practice P is required, so choose CP or AP.
</details>

### Q2: What's the difference between horizontal and vertical scaling?
<details>
<summary>Image Anchor</summary>
Clone warrior army (horizontal) vs single warrior drinking growth potions hitting ceiling (vertical)
</details>
<details>
<summary>Answer</summary>
Horizontal: add more machines. Vertical: make one machine more powerful. Horizontal scales linearly but needs coordination; vertical is simpler but has hardware limits.
</details>

### Q3: How does consistent hashing work?
<details>
<summary>Image Anchor</summary>
Clock face with gnomes at different hours, data thrown like darts rolls clockwise to nearest gnome
</details>
<details>
<summary>Answer</summary>
Hash ring where servers and data are mapped. Data assigned to next server clockwise. Adding/removing server only affects adjacent data. Minimizes redistribution.
</details>

### Q4: What's the circuit breaker pattern?
<details>
<summary>Image Anchor</summary>
Electrical circuit breaker - trips when sparking (failures), stops sending requests, half-open testing
</details>
<details>
<summary>Answer</summary>
Prevent cascade failures by failing fast when downstream is unhealthy. States: Closed (normal), Open (failing fast), Half-Open (testing). Trip on threshold, reset on success.
</details>

---

## Level 2: Comparison Challenges

### Q5: Cache-Aside vs Write-Through vs Write-Behind?
<details>
<summary>Image Anchors</summary>
- Cache-Aside: Librarian checks personal notebook before going to stacks
- Write-Through: Two-handed clerk writing simultaneously to cache and DB
- Write-Behind: Procrastinator clerk with to-do pile
</details>
<details>
<summary>Answer</summary>
- Cache-Aside: App manages cache, checks before DB, can have stale data
- Write-Through: Sync write to both, always consistent, higher write latency
- Write-Behind: Async DB write, fast writes, risk of data loss on crash
</details>

### Q6: Lamport Clocks vs Vector Clocks?
<details>
<summary>Image Anchors</summary>
- Lamport: Click counter with MAX(yours, theirs)+1 rule
- Vector: Scoreboard tracking EVERYONE's counters
</details>
<details>
<summary>Answer</summary>
- Lamport: Single counter, provides partial ordering, CANNOT detect concurrent events
- Vector: Array of counters per node, CAN detect concurrent events (mixed comparison = concurrent)
</details>

### Q7: Two-Phase Commit vs Saga?
<details>
<summary>Image Anchors</summary>
- 2PC: Wedding ceremony - priest asks all parties, if priest dies mid-ceremony, everyone waits forever
- Saga: Relay race where runners can run backwards (compensating transactions)
</details>
<details>
<summary>Answer</summary>
- 2PC: Blocking, global lock, coordinator failure = stuck
- Saga: Non-blocking, local transactions with compensating rollback, better availability
</details>

---

## Level 3: Scenario Challenges

### Q8: You're designing a global e-commerce inventory system. Users in Tokyo should see stock counts that might be slightly stale (1-2 seconds) but the system must NEVER be down. Which consistency model and why?
<details>
<summary>Think about...</summary>
- What's more important: accuracy or availability?
- What systems did the clone convenience store workers remind you of?
</details>
<details>
<summary>Answer</summary>
**AP system with Eventual Consistency**
- Clone store workers during storm = AP (always open, sometimes confused)
- Lazy monks playing telephone = Eventual consistency
- Use Cassandra/DynamoDB. Accept temporary inconsistency for 100% uptime.
</details>

### Q9: Your payment service is getting hammered and making downstream failures worse. What patterns should you implement?
<details>
<summary>Think about...</summary>
- What prevents cascade failures?
- What isolates failures?
- What limits incoming damage?
</details>
<details>
<summary>Answer</summary>
1. **Circuit Breaker** - electrical breaker trips when sparking
2. **Bulkhead** - ship compartments prevent flooding spread
3. **Rate Limiting** - nightclub bouncer with token bucket
4. **Backpressure** - pressure valve tells upstream to slow down
</details>

### Q10: You need to split a 10TB database across multiple servers. Users query by user_id. How do you partition?
<details>
<summary>Think about...</summary>
- Pizza sliced to restaurants - what's the shard key?
- Clock with gnomes - how does consistent hashing help?
</details>
<details>
<summary>Answer</summary>
**Hash-based sharding with consistent hashing**
- Shard key: user_id (all user's data on same shard)
- Consistent hashing (gnome clock): minimizes data movement when adding/removing servers
- Avoid range-based (library aisles): some letters/ranges might be much more popular
</details>

---

## Level 4: Design Challenge

### Q11: Design a notification system that sends alerts when prices change. Multiple services publish price updates. Millions of users have subscriptions.
<details>
<summary>Walk through the palace...</summary>
1. How do services communicate without coupling?
2. How do you handle millions of subscribers?
3. How do you ensure delivery?
</details>
<details>
<summary>Design</summary>
1. **Pub/Sub** (town crier): Price services publish to "price-updates" topic
2. **Message Queue** (post office): Buffer between publishers and notification workers
3. **Horizontal Scaling** (clone army): Multiple notification workers process queue
4. **Idempotent Receiver** (stamped packages): Deduplicate if same notification sent twice
5. **Rate Limiting** (bouncer): Don't overwhelm users with too many notifications
</details>

---

## Weak Spot Tracking

After each session, note which questions you struggled with:

| Date | Weak Spots | Action Taken |
|------|------------|--------------|
| | | |

---

## Generate Your Own

Template for creating new challenges:

```
### Q: [Question]
<details>
<summary>Image Anchor</summary>
[The vivid image that triggers recall]
</details>
<details>
<summary>Answer</summary>
[The actual content/definition]
</details>
```
