// plan.js - Torah Ohr + Likkutei Torah daily plan
// Uses window.SCHEDULE from schedule.js

window.PLAN = {
  id: 'chasidus',
  name: 'תורה אור ולקוטי תורה',
  storagePrefix: 'chasidus',

  // Cycle start: Oct 12, 2025 (index 0 = א' בראשית)
  CYCLE_START: '2025-10-12',

  _getDayIndex(date) {
    const start = new Date(this.CYCLE_START);
    const current = new Date(date);
    // Normalize to midnight UTC to avoid DST issues
    const diffMs = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
                 - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const raw = Math.floor(diffMs / 86400000);
    // Wrap for future cycles
    return ((raw % 365) + 365) % 365;
  },

  async loadDay(date) {
    const idx = this._getDayIndex(date);
    const entry = window.SCHEDULE?.[idx];
    if (!entry) throw new Error(`No schedule entry for index ${idx}`);

    const heDate = await fetchHebrewDate(date);

    return {
      he: entry.he,
      ref: `chasidus-day-${idx}`,
      count: entry.books.length,   // one "item" per book/chapter assigned
      heDate,
    };
  },

  async loadContent(date, ref) {
    const idx = parseInt(ref.split('-')[2]);
    const entry = window.SCHEDULE?.[idx];
    if (!entry) return { chapters: [[]], chapterNumbers: [1] };

    const chapters = [];
    const chapterNumbers = [];

    for (let i = 0; i < entry.books.length; i++) {
      const { book, chapter } = entry.books[i];
      const paras = await fetchChasidusChapter(book, chapter);
      chapters.push(paras);
      chapterNumbers.push(i + 1);
    }

    return { chapters, chapterNumbers };
  },
};

// ─────────────────────────────────────────────
// Fetch a single chapter from Sefaria
// Returns array of HTML strings (one per paragraph)
// ─────────────────────────────────────────────
const _chapterCache = {};

async function fetchChasidusChapter(book, chapter) {
  const cacheKey = `${book}.${chapter}`;
  if (_chapterCache[cacheKey]) return _chapterCache[cacheKey];

  try {
    const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book)}.${chapter}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Primary Hebrew version is always first
    const version = data.versions?.[0];
    const raw = version?.text;
    const paras = Array.isArray(raw) ? raw : (raw ? [raw] : []);

    // Strip Vilna page markers but keep bold ד"ה markers
    const cleaned = paras
      .filter(p => p && p.trim())
      .map(p => p
        .replace(/<i data-overlay[^>]*><\/i>/g, '')   // strip page markers
        .trim()
      )
      .filter(p => p.length > 0);

    const result = cleaned.length > 0 ? cleaned : ['(לא נמצא תוכן)'];
    _chapterCache[cacheKey] = result;
    return result;
  } catch (err) {
    console.error(`Failed to load ${cacheKey}:`, err);
    return [`שגיאה בטעינת ${book} פרק ${chapter}`];
  }
}
