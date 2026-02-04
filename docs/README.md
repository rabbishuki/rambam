# Documentation Index

Reference materials for the Rambam PWA Next.js migration.

---

## Architecture & Planning

| Document | Description |
|----------|-------------|
| [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) | Full Next.js migration plan |
| [LESSONS_LOCAL_FIRST.md](LESSONS_LOCAL_FIRST.md) | Key takeaways for implementation |

---

## Reference Materials

| Document | Source | Key Content |
|----------|--------|-------------|
| [2brew-pwa.md](references/2brew-pwa.md) | https://2brew.github.io | Service worker patterns, pre-caching |
| [bangle-io.md](references/bangle-io.md) | https://bangle.io | Storage backends, OPFS vs File System API |
| [local-first-essay.md](references/local-first-essay.md) | Ink & Switch | The 7 ideals, CRDTs, principles |

---

## Quick Reference

### The 7 Local-First Ideals

1. **Fast** - Instant response (< 100ms)
2. **Multi-Device** - Sync across devices
3. **Offline** - Full functionality without network
4. **Collaboration** - Real-time editing (not needed for Rambam)
5. **Longevity** - Data survives the app
6. **Privacy** - End-to-end encryption
7. **User Control** - No vendor lock-in

### Rambam Storage Strategy

```
localStorage (~5MB)
├── Settings (Zustand persist)
└── Completion status

OPFS (GB+)
└── Prefetched halakhot texts

Service Worker Cache
├── App shell
└── API responses
```

### Caching Strategies

| Content | Strategy |
|---------|----------|
| App shell | Cache-first |
| Halakha texts | Cache-first |
| Calendar API | Stale-while-revalidate |
| Sunset times | Stale-while-revalidate |

---

## External Resources

- [Ink & Switch Local-First Essay](https://www.inkandswitch.com/local-first/)
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [web.dev: OPFS Guide](https://web.dev/articles/origin-private-file-system)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
