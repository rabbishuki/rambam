# Local-First Software: You Own Your Data, in Spite of the Cloud

**Source:** https://www.inkandswitch.com/local-first/
**PDF:** https://www.inkandswitch.com/local-first/static/local-first.pdf
**Authors:** Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan
**Published:** Onward! 2019 Conference, October 2019

---

## Abstract

Cloud apps like Google Docs and Trello are popular because they enable real-time collaboration with colleagues, and they make it easy for us to access our work from all of our devices. However, by centralizing data storage on servers, cloud apps also take away ownership and agency from users.

This paper proposes **local-first software**: a set of principles for software that enables both collaboration and ownership for users.

---

## The Problem with Cloud Software

### What We Lose

1. **Ownership** - Data lives on company servers, not yours
2. **Speed** - Every action requires network round-trip
3. **Offline** - No internet = no access to your work
4. **Longevity** - Company shuts down = data lost
5. **Privacy** - Company can read/mine your data
6. **Control** - Company can change terms, lock you out

### The Old Way (Files)

```
You → Local files → Your computer
     (Full control, but no collaboration)
```

### The Cloud Way

```
You → Cloud service → Their servers
     (Collaboration, but they own it)
```

### The Local-First Way

```
You → Local data → Your devices ←→ Sync ←→ Collaborators
     (Full control AND collaboration)
```

---

## The Seven Ideals

### 1. Fast

> "No spinners: your work at your fingertips"

- User actions should feel instantaneous
- Data is local, so no network latency
- UI never waits for server response

**Metric:** < 100ms response time for all interactions

### 2. Multi-Device

> "Your work across all your devices"

- Same data available on phone, tablet, laptop
- Changes sync automatically
- No manual export/import

### 3. Offline

> "The network is optional"

- Read and write data without internet
- Changes sync when connectivity returns
- No degraded "read-only" mode

### 4. Collaboration

> "Seamless collaboration with your colleagues"

- Real-time editing with others
- See changes as they happen
- Conflict resolution is automatic

### 5. Longevity

> "The Long Now"

- Your data outlives any service
- Files remain readable decades later
- No vendor lock-in

**Test:** Can you access this data in 10 years without the original software?

### 6. Privacy

> "Security and privacy by default"

- End-to-end encryption
- Data unreadable by service operators
- No data mining possible

### 7. User Control

> "You retain ultimate ownership and control"

- No terms of service that can lock you out
- No subscription that can be revoked
- No company that can disappear

---

## Evaluating Existing Software

| Software | Fast | Multi-Device | Offline | Collaboration | Longevity | Privacy | Control |
|----------|------|--------------|---------|---------------|-----------|---------|---------|
| Files + Email | ✅ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ✅ |
| Google Docs | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| Dropbox | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Git + GitHub | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| **Local-First** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## CRDTs: The Enabling Technology

### What is a CRDT?

**Conflict-free Replicated Data Type** - A data structure designed for distributed systems where:
- Multiple users can edit simultaneously
- No central server needed for coordination
- All changes eventually converge to same state
- Conflicts are resolved automatically

### How CRDTs Work

```
Device A: document = "Hello"
Device B: document = "Hello"

A adds " World" → "Hello World"
B adds "!" → "Hello!"

Without CRDT: CONFLICT! Which one wins?

With CRDT: Both changes merge automatically
Result on both: "Hello World!" (order determined by algorithm)
```

### Types of CRDTs

1. **G-Counter** - Grow-only counter
2. **PN-Counter** - Increment/decrement counter
3. **G-Set** - Grow-only set
4. **OR-Set** - Observed-remove set
5. **LWW-Register** - Last-writer-wins register
6. **Sequence CRDTs** - For ordered lists/text

### CRDT Libraries

- **Automerge** (JavaScript) - JSON-like documents
- **Yjs** (JavaScript) - High performance, many bindings
- **Diamond Types** (Rust) - Very fast text CRDT
- **Loro** (Rust/WASM) - Modern, full-featured

---

## Implementation Patterns

### Pattern 1: Local-First with Optional Sync

```
┌─────────────────────────────────────────┐
│              Your Device                 │
├─────────────────────────────────────────┤
│  App ←→ Local Database (source of truth) │
│              ↓ (when online)            │
│         Sync Layer (optional)           │
└─────────────────────────────────────────┘
                   ↕
        ┌─────────────────┐
        │   Sync Server   │  (relay only, not authority)
        └─────────────────┘
                   ↕
┌─────────────────────────────────────────┐
│            Other Devices                 │
└─────────────────────────────────────────┘
```

### Pattern 2: Optimistic Updates

```javascript
// Traditional (pessimistic)
async function saveDocument(doc) {
  setLoading(true)
  await api.save(doc)  // Wait for server
  setLoading(false)
  updateUI(doc)
}

// Local-first (optimistic)
function saveDocument(doc) {
  localDb.save(doc)    // Save locally (instant)
  updateUI(doc)        // Update UI (instant)
  syncQueue.add(doc)   // Queue for background sync
}
```

### Pattern 3: Background Sync

```javascript
// Sync when online, queue when offline
const syncQueue = {
  pending: [],

  add(change) {
    this.pending.push(change)
    this.trySync()
  },

  async trySync() {
    if (!navigator.onLine) return

    while (this.pending.length > 0) {
      const change = this.pending[0]
      try {
        await syncToServer(change)
        this.pending.shift()  // Remove on success
      } catch (e) {
        break  // Retry later
      }
    }
  }
}

// Auto-sync when coming online
window.addEventListener('online', () => syncQueue.trySync())
```

---

## Challenges and Tradeoffs

### Challenge 1: Storage Limits

Browser storage has limits:
- localStorage: 5-10 MB
- IndexedDB: 50-500 MB typical
- OPFS: GB+ but varies

**Solution:** Be smart about what to cache, allow manual cleanup

### Challenge 2: Initial Load

Large datasets take time to sync initially

**Solution:** Progressive loading, sync most recent first

### Challenge 3: Conflict Resolution

Some conflicts can't be automatically resolved

**Solution:** Use CRDTs where possible, show UI for manual resolution otherwise

### Challenge 4: Security

End-to-end encryption adds complexity

**Solution:** Use established libraries, consider threat model

---

## Recommendations from the Authors

1. **Start with local storage** - Make the app work offline first
2. **Add sync later** - Sync is an enhancement, not a requirement
3. **Use CRDTs for shared data** - They handle conflicts automatically
4. **Keep data in open formats** - JSON, Markdown, SQLite
5. **Provide export options** - Let users take their data elsewhere
6. **Design for longevity** - Will this still work in 10 years?

---

## Conclusion

> "We believe that data ownership and real-time collaboration are not at odds with each other. It is possible to create software that has all the advantages of cloud apps, while also allowing users to retain full ownership of their data."

> "CRDTs have the potential to be a foundation for a new generation of software."

---

## TODO: Full Content

**[PLACEHOLDER]** - Upload the HTML or PDF to extract complete essay content including:
- Detailed case studies
- Prototype examples (Trellis, Pixelpusher, etc.)
- Technical deep-dives
- Full bibliography

---

## References

- [Essay](https://www.inkandswitch.com/local-first/)
- [PDF](https://www.inkandswitch.com/local-first/static/local-first.pdf)
- [ACM Digital Library](https://dl.acm.org/doi/10.1145/3359591.3359737)
- [Martin Kleppmann's Site](https://martin.kleppmann.com/papers/local-first.pdf)
- [Automerge](https://automerge.org/)
- [Yjs](https://yjs.dev/)
