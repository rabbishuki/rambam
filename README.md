# רמב"ם יומי - Daily Rambam Tracker

A Progressive Web App (PWA) for tracking your daily Rambam (3 chapters) study with swipeable halakha cards.

## ✨ Features

- 📱 **Mobile-first PWA** - Install as a native app on any device
- 🔄 **Swipe to complete** - Swipe halakha cards right to mark as done
- 📊 **Track progress** - Days studied, today's completion %, and backlog halakhot
- 💾 **Works offline** - Full offline support with service worker caching
- 🇮🇱 **RTL Hebrew** - Native right-to-left support with Noto Sans Hebrew font
- 🕐 **Jewish day logic** - Automatically advances to next day at sunset (6 PM Israel time)
- 🎯 **Lightweight** - Single HTML file, no build process required

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3613

> **Port 3613**: תרי״ג - The number of mitzvot in the Torah, as catalogued by the Rambam in Sefer HaMitzvot.

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

### Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Service Worker** - Offline-first PWA with caching
- **LocalStorage** - Client-side data persistence
- **Sefaria API** - Jewish text database

> Legacy vanilla JS version available in `legacy/` folder for reference.

### Data Storage

All data stored in browser `localStorage`:

```javascript
// Start date
rambam_start: "2026-02-03"

// Daily metadata
rambam_days: {
  "2026-02-03": {
    he: "מסירת תורה שבעל פה א׳-מ״ה",
    ref: "Mishneh_Torah,_Transmission_of_the_Oral_Law.1-45",
    count: 45
  }
}

// Completed halakhot
rambam_done: {
  "2026-02-03:0": "2026-02-03T09:15:00Z",
  "2026-02-03:1": "2026-02-03T09:16:00Z"
}
```

### File Structure

```
rambam/
├── src/app/             # Next.js App Router
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Tailwind CSS
├── public/              # Static assets
│   ├── icon-192.png     # PWA icon 192×192
│   ├── icon-512.png     # PWA icon 512×512
│   └── logo.png         # App logo
├── legacy/              # Original vanilla JS app
│   ├── index.html       # Legacy main app
│   ├── service-worker.js
│   └── manifest.json
├── docs/                # Migration documentation
├── MIGRATION_PLAN.md    # Next.js migration plan
├── PLAN.md              # Implementation plan
├── QUICK_REFERENCE.md   # API reference
└── README.md            # This file
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
