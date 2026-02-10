# רמב"ם יומי - Daily Rambam Tracker

A modular Progressive Web App (PWA) platform for tracking daily Jewish study with swipeable cards. Supports multiple learning plans (3-chapter Rambam, 1-chapter Rambam, and more).

## ✨ Features

- 📱 **Mobile-first PWA** - Install as a native app on any device
- 🔄 **Swipe to complete** - Swipe halakha cards right to mark as done
- 📊 **Track progress** - Days studied, today's completion %, and backlog halakhot
- 💾 **Works offline** - Full offline support with service worker caching
- 🇮🇱 **RTL Hebrew** - Native right-to-left support with Noto Sans Hebrew font
- 🕐 **Jewish day logic** - Automatically advances to next day at sunset (6 PM Israel time)
- 🎯 **Modular** - Shared code across multiple apps, easy to add new plans
- 🚀 **Zero build locally** - Symlinks for dev, one-line build for deployment

## 🚀 Quick Start

### Prerequisites

- A web browser (Chrome, Safari, Firefox, Edge)
- Node.js (for setup script only, optional)

### Running Locally

#### Option 1: With Symlinks (Recommended)
```bash
# One-time setup - creates symlinks for shared code and assets
npm run setup:rambam3

# Then open directly in browser
open rambam3/index.html
```

#### Option 2: Local Server
```bash
# Setup symlinks first
npm run setup:rambam3

# Serve with any static server
npx serve rambam3
# Then open: http://localhost:3000
```

#### Option 3: Build and Serve
```bash
# Copy files instead of symlinks (mimics Cloudflare deployment)
npm run build:rambam3

# Serve the built folder
npx serve rambam3
```

### Installing as PWA

1. Open the app in your browser
2. Look for the "Install" or "Add to Home Screen" prompt
3. Click install
4. App icon appears on your home screen/desktop

## 📖 How It Works

### Daily Learning Cycle

The app tracks the **3-chapter daily Rambam cycle** (Mishneh Torah):
- Fetches daily portions from [Sefaria API](https://www.sefaria.org)
- Each day includes 3 chapters divided into individual halakhot
- Started: ט״ו שבט ה׳תשפ״ו (Feb 3, 2026) - Cycle #46

### Jewish Day Logic

Days change at sunset (~6 PM Israel time):
- 6 PM Monday → Midnight Tuesday = Tuesday in Jewish time
- Midnight Tuesday → 6 PM Tuesday = Tuesday in Jewish time

### Usage

1. **View Today's Study**: Opens automatically on app load
2. **Expand a Day**: Click the ▶ arrow to view halakhot
3. **Complete Halakhot**: Swipe cards right (or drag with mouse) to mark as done
4. **Track Progress**:
   - **ימים שלמדתי** - Days completed / Total days
   - **היום** - Today's completion percentage
   - **הלכות להשלים** - Halakhot remaining from previous days
5. **Quick Actions**:
   - ✓ Mark entire day as complete
   - ↺ Reset a day's progress

### Settings

- **Start Date**: Change when you began the cycle
- **Quick Reset**: Set to Feb 3, 2026 (current cycle start)
- **Full Reset**: Clear all progress and start fresh

## 🏗️ Technical Details

### Architecture

This project uses a **modular multi-app architecture**:
- `/shared/` - Common code (CSS, JS) shared by all apps
- `/assets/` - Shared images (logos, icons)
- `/rambam3/`, `/rambam1/`, etc. - Individual apps, each with its own `plan.js`
- Symlinks for local dev, build script for deployment
- Each app deploys independently to its own Cloudflare Pages URL

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

### Tech Stack

- **Pure Vanilla JavaScript** - No frameworks, no dependencies
- **Service Worker** - Offline-first PWA with caching
- **LocalStorage** - Client-side data persistence
- **Sefaria API** - Jewish text database
- **Noto Sans Hebrew** - Google Fonts for beautiful Hebrew typography

### Adding a New Plan

1. Create a new directory (e.g., `/chumash/`)
2. Copy `rambam3/index.html`, `manifest.json`, `service-worker.js`
3. Create `plan.js` with your data loading logic
4. Update `package.json` with `build:chumash` and `setup:chumash` scripts
5. Run `npm run setup:chumash` to create symlinks
6. Deploy to Cloudflare Pages with `npm run build:chumash`

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed instructions.

### Data Storage

All data stored in browser `localStorage` with plan-specific prefixes:

```javascript
// Shared settings (no prefix)
rambam_start: "2026-02-03"
rambam_auto_mark: "true"
rambam_hide_completed: "true"

// Plan-specific data (prefixed with plan ID)
rambam3_days: {
  "2026-02-03": {
    he: "מסירת תורה שבעל פה א׳-מ״ה",
    ref: "Mishneh_Torah,_Transmission_of_the_Oral_Law.1-45",
    count: 45,
    heDate: "ט״ו שבט"
  }
}

rambam3_done: {
  "2026-02-03:0": "2026-02-03T09:15:00Z",
  "2026-02-03:1": "2026-02-03T09:16:00Z"
}
```

### File Structure

```
rambam/
├── shared/              # Shared code
│   ├── styles.css      # All CSS
│   ├── shell.js        # HTML injection
│   ├── core.js         # Rendering & logic
│   ├── api.js          # Sefaria/Hebcal APIs
│   └── changelog.js    # Version history
├── assets/              # Shared images
│   ├── logo.png        # App logo
│   ├── icon-*.png      # PWA icons
│   ├── favicon.ico     # Browser icon
│   ├── claude.jpeg     # Footer badge
│   └── rabbi.jpeg      # Footer avatar
├── rambam3/             # 3-chapter app
│   ├── index.html      # Minimal shell
│   ├── plan.js         # Plan config
│   ├── manifest.json   # PWA manifest
│   ├── service-worker.js
│   ├── shared/         # → ../shared (symlink)
│   └── assets/         # → ../assets (symlink)
├── package.json         # Build scripts
├── .gitignore          # Ignore symlinks
├── ARCHITECTURE.md     # Architecture guide
└── README.md           # This file
```

## 🎨 Features in Detail

### Hebrew Letter Numbering

Each halakha is numbered with Hebrew letters (א, ב, ג...):
- Handles special cases: ט״ו and ט״ז (instead of יה, יו)
- Supports hundreds: ק, קא, קב... etc
- Resets numbering per chapter

### Swipe Gestures

- **Touch devices**: Swipe right to dismiss
- **Desktop**: Click and drag right with mouse
- Threshold: 100px for completion
- Smooth animations with CSS transitions

### Stats Calculation

- **Days Studied**: Counts all days with 100% completion
- **Today %**: Completed halakhot / total halakhot today
- **Backlog**: Sum of incomplete halakhot from all previous days

## 🙏 Credits

**Built with**:
- [Claude AI](https://claude.ai) - AI pair programming
- [Sefaria API](https://www.sefaria.org) - Jewish text database

**Created by**: Rabbi Shuki with guidance, ideas, and support

**In Memory Of**: ישראל שאול בן משה אהרון ומלכה בת נתן

## 📄 License

MIT License - Feel free to use and modify for your own study tracking!

## 🐛 Issues & Feedback

Contact via [WhatsApp](https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם)
