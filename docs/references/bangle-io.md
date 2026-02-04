# Bangle.io Reference

**Source:** https://bangle.io
**Privacy Policy:** https://bangle.io/privacy
**GitHub:** https://github.com/bangle-io/bangle-io

A local-first markdown note-taking app that offers multiple storage backends.

---

## Overview

Bangle.io is a browser-based markdown editor that prioritizes local-first principles. Users choose where their data lives.

### Key Characteristics

- Built on ProseMirror (rich text editor)
- Markdown as underlying storage format
- Multiple storage backend options
- No account required
- Works offline

---

## Storage Options

Bangle.io offers users a choice of storage backends:

### Option 1: Browser Storage (IndexedDB)

```
Pros:
✓ Works in all browsers
✓ No permissions required
✓ Simple setup

Cons:
✗ Data stuck in browser
✗ Can't sync with other tools
✗ Lost if browser data cleared
```

### Option 2: Local File System (File System Access API)

```
Pros:
✓ Real files on your computer
✓ Works with git, Dropbox, etc.
✓ Full user ownership

Cons:
✗ Only works in Chromium browsers
✗ No Firefox support
✗ No mobile support
✗ Requires permission grant
```

---

## File System Access API Details

### Browser Support (Why It's Limited)

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Desktop only |
| Edge | ✅ Full | Desktop only |
| Firefox | ❌ None | Explicitly refused to implement |
| Safari | ⚠️ Partial | Limited, macOS only |
| Mobile | ❌ None | Not supported on any mobile browser |

**Overall: ~30% of users**

### How It Works

```javascript
// User picks a directory
const dirHandle = await window.showDirectoryPicker()

// App can read/write files in that directory
const fileHandle = await dirHandle.getFileHandle('note.md', { create: true })
const file = await fileHandle.getFile()
const contents = await file.text()

// Write back (no "Save As" dialog needed)
const writable = await fileHandle.createWritable()
await writable.write(newContents)
await writable.close()
```

### Why Firefox Refuses

Mozilla's position:
- Security concerns about persistent file access
- Privacy implications of directory access
- Prefer sandboxed alternatives (OPFS)

---

## Bangle.io's Workspace Architecture

```
User opens Bangle.io
    ↓
"Choose workspace location"
    ↓
┌─────────────────────────────────────┐
│  Browser Storage                     │
│  └── IndexedDB workspace            │
│      ├── note1.md                   │
│      ├── note2.md                   │
│      └── folder/                    │
│          └── note3.md               │
└─────────────────────────────────────┘
        OR
┌─────────────────────────────────────┐
│  Local Folder (Chrome only)         │
│  └── ~/Documents/Notes/             │
│      ├── note1.md                   │
│      ├── note2.md                   │
│      └── folder/                    │
│          └── note3.md               │
└─────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. User Choice Over One-Size-Fits-All

Bangle.io doesn't pick one storage method - it lets users decide based on their needs:
- Power users on Chrome → Local folder
- Everyone else → Browser storage

### 2. Markdown as Universal Format

Data is stored as plain `.md` files, not proprietary format:
- Readable by any text editor
- Works with existing tools (VS Code, Obsidian, etc.)
- Survives the app dying

### 3. Workspace-Based Organization

Each workspace is independent:
- Can have multiple workspaces
- Different storage backends per workspace
- No cross-workspace dependencies

---

## Lessons for Rambam

### Don't Use File System Access API

For Rambam's use case (mobile-first PWA), File System Access API is wrong:
- Most users are on mobile → not supported
- Firefox users → not supported
- Adds complexity with fallbacks

### Use OPFS Instead

Origin Private File System provides similar benefits:
- File-like API
- Fast access
- Works in ALL browsers
- No permissions needed

### Consider Export/Import

Like Bangle.io's flexibility, offer data portability:
```javascript
// Export progress as JSON
const data = {
  settings: {...},
  completion: {...},
  prefetchedDays: {...}
}
downloadAsFile('rambam-backup.json', JSON.stringify(data))

// Import from file
const file = await pickFile()
const data = JSON.parse(await file.text())
restoreFromBackup(data)
```

---

## OPFS vs File System Access API

| Feature | File System Access | OPFS |
|---------|-------------------|------|
| Browser support | ~30% | ~95% |
| Mobile | ❌ | ✅ |
| Firefox | ❌ | ✅ |
| User-visible files | ✅ | ❌ |
| Permissions needed | ✅ | ❌ |
| Speed | Fast | Very fast |
| Capacity | Unlimited | GB+ |

**Recommendation:** Use OPFS for Rambam, offer JSON export for portability.

---

## References

- [Bangle.io](https://bangle.io)
- [File System Access API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Origin Private File System - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [browser-fs-access (polyfill)](https://github.com/GoogleChromeLabs/browser-fs-access)
