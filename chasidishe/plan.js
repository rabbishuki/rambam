// Torah Ohr + Likkutei Torah daily plan.
// The schedule selects the daily references; each Sefaria paragraph becomes a card.

function cardCount(item) {
  return window.CHASIDUS_CONTENT_COUNTS?.[`${item.book}.${item.chapter}`] || 1;
}

window.PLAN = {
  id: 'chasidus',
  name: 'תורה אור ולקוטי תורה',
  appName: 'א חסידישע פרשה',
  storagePrefix: 'chasidus',
  settingsPrefix: 'chasidus',
  startStorageKey: 'chasidus_start',
  installPromptStorageKey: 'chasidus_install_prompt_shown',
  showCardNumbers: false,
  CYCLE_START: '2026-10-04',

  _getDayIndex(date) {
    const start = new Date(this.CYCLE_START);
    const current = new Date(date);
    const diffMs = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
                 - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const raw = Math.floor(diffMs / 86400000);
    return ((raw % 365) + 365) % 365;
  },

  async loadDay(date) {
    const idx = this._getDayIndex(date);
    const entry = window.SCHEDULE?.[idx];
    if (!entry) throw new Error(`No schedule entry for index ${idx}`);

    return {
      he: entry.he,
      ref: `chasidus-day-${idx}`,
      count: entry.books.reduce((total, item) => total + cardCount(item), 0),
      heDate: await fetchHebrewDate(date),
    };
  },

  async loadContent(date, ref) {
    const idx = parseInt(ref.split('-')[2]);
    const entry = window.SCHEDULE?.[idx];
    if (!entry) return { chapters: [[]], chapterNumbers: [1] };

    const sections = await Promise.all(entry.books.map(({ book, chapter }) =>
      fetchChasidusChapter(book, chapter)
    ));

    return {
      chapters: sections.flatMap(section => section.chapters),
      chapterNumbers: sections.flatMap(section => section.chapterNumbers),
    };
  },
};

function refreshCachedDayCounts() {
  if (typeof localStorage === 'undefined') return;

  try {
    const key = `${window.PLAN.storagePrefix}_days`;
    const days = JSON.parse(localStorage.getItem(key) || '{}');
    let changed = false;

    Object.values(days).forEach(day => {
      const match = day.ref?.match(/^chasidus-day-(\d+)$/);
      const entry = match && window.SCHEDULE?.[Number(match[1])];
      if (!entry) return;

      const count = entry.books.reduce((total, item) => total + cardCount(item), 0);
      if (day.count !== count) {
        day.count = count;
        changed = true;
      }
    });

    if (changed) localStorage.setItem(key, JSON.stringify(days));
  } catch (error) {
    console.warn('Could not refresh cached Chasidus card counts:', error);
  }
}

refreshCachedDayCounts();

const _chapterCache = {};

function splitSefariaChapters(paragraphs) {
  const chapters = [[]];
  const chapterNumbers = [1];

  paragraphs.forEach(paragraph => {
    if (/^\s*<small>[^<]+<\/small>\s*$/.test(paragraph)) return;

    const marker = paragraph.match(/^\s*<small>\s*([א-ת][א-ת״׳"']*)\s*<\/small>\s*/);
    if (marker && chapters[chapters.length - 1].length > 0) {
      chapters.push([]);
      chapterNumbers.push(chapterNumbers.length + 1);
      paragraph = paragraph.slice(marker[0].length);
    } else if (marker) {
      paragraph = paragraph.slice(marker[0].length);
    }

    if (paragraph.replace(/<[^>]*>/g, '').trim()) {
      chapters[chapters.length - 1].push(`<p>${paragraph}</p>`);
    }
  });

  return {
    chapters: chapters.filter(chapter => chapter.length > 0),
    chapterNumbers: chapterNumbers.slice(0, chapters.filter(chapter => chapter.length > 0).length),
  };
}

async function fetchChasidusChapter(book, chapter) {
  const cacheKey = `${book}.${chapter}`;
  if (_chapterCache[cacheKey]) return _chapterCache[cacheKey];

  try {
    const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(cacheKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.versions?.find(version => version.language === 'he')?.text;
    const paragraphs = (Array.isArray(raw) ? raw.flat(Infinity) : [raw])
      .filter(text => text && text.trim())
      .map(text => text.replace(/<i data-overlay[^>]*><\/i>/g, ''));

    const result = splitSefariaChapters(paragraphs);
    if (result.chapters.length === 0) {
      result.chapters = [['(לא נמצא תוכן)']];
      result.chapterNumbers = [1];
    }
    _chapterCache[cacheKey] = result;
    return result;
  } catch (err) {
    console.error(`Failed to load ${cacheKey}:`, err);
    return {
      chapters: [[`שגיאה בטעינת ${book} פרק ${chapter}`]],
      chapterNumbers: [1],
    };
  }
}
