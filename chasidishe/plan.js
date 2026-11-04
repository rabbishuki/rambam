// Torah Ohr + Likkutei Torah daily plan.
// Torah Ohr checkpoints come from torah-or-catalog.js; the schedule comes from schedule.js.

function getTorahOrCheckpoints(book, chapter) {
  return window.TORAH_OR_CATALOG?.[book]?.chapters?.[chapter] || null;
}

function checkpointCount(item) {
  return getTorahOrCheckpoints(item.book, item.chapter)?.length || 1;
}

window.PLAN = {
  id: 'chasidus',
  name: 'תורה אור ולקוטי תורה',
  storagePrefix: 'chasidus',
  CYCLE_START: '2025-10-12',

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
      count: entry.books.reduce((total, item) => total + checkpointCount(item), 0),
      heDate: await fetchHebrewDate(date),
    };
  },

  async loadContent(date, ref) {
    const idx = parseInt(ref.split('-')[2]);
    const entry = window.SCHEDULE?.[idx];
    if (!entry) return { chapters: [[]], chapterNumbers: [1] };

    const chapters = await Promise.all(entry.books.map(({ book, chapter }) =>
      fetchChasidusChapter(book, chapter)
    ));

    return {
      chapters,
      chapterNumbers: chapters.map((_, index) => index + 1),
    };
  },
};

const _chapterCache = {};

function textPointAt(root, requestedOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, requestedOffset);
  let node;

  while ((node = walker.nextNode())) {
    if (remaining <= node.nodeValue.length) return { node, offset: remaining };
    remaining -= node.nodeValue.length;
  }

  return { node: root, offset: root.childNodes.length };
}

function htmlRange(root, start, end) {
  const range = document.createRange();
  const startPoint = textPointAt(root, start);
  const endPoint = textPointAt(root, end);
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);

  const holder = document.createElement('div');
  holder.appendChild(range.cloneContents());
  return holder.innerHTML;
}

function appendParagraph(card, html) {
  if (!html || !html.replace(/<[^>]*>/g, '').trim()) return card;
  const paragraph = `<p>${html}</p>`;
  return card ? `${card}${paragraph}` : paragraph;
}

function splitByCheckpoints(paragraphs, checkpoints) {
  const byParagraph = new Map();
  checkpoints.forEach(checkpoint => {
    const list = byParagraph.get(checkpoint.paragraph) || [];
    list.push(checkpoint);
    byParagraph.set(checkpoint.paragraph, list);
  });

  const cards = [];
  let current = '';

  paragraphs.forEach((paragraph, index) => {
    const paragraphNumber = index + 1;
    const points = (byParagraph.get(paragraphNumber) || [])
      .slice()
      .sort((a, b) => a.offset - b.offset);

    if (points.length === 0) {
      current = appendParagraph(current, paragraph);
      return;
    }

    const root = document.createElement('div');
    root.innerHTML = paragraph;
    const length = root.textContent.length;
    const offsets = [...new Set(points.map(point => Math.min(point.offset, length)))];

    const prefix = htmlRange(root, 0, offsets[0]);
    current = appendParagraph(current, prefix);
    if (current) cards.push(current);

    offsets.forEach((offset, pointIndex) => {
      const end = offsets[pointIndex + 1] ?? length;
      const fragment = htmlRange(root, offset, end);
      if (fragment.replace(/<[^>]*>/g, '').trim()) cards.push(`<p>${fragment}</p>`);
    });

    current = cards.pop() || '';
  });

  if (current) cards.push(current);
  return cards;
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

    const checkpoints = getTorahOrCheckpoints(book, chapter);
    const cards = checkpoints
      ? splitByCheckpoints(paragraphs, checkpoints)
      : [paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')];

    const result = cards.filter(card => card.replace(/<[^>]*>/g, '').trim());
    _chapterCache[cacheKey] = result.length ? result : ['(לא נמצא תוכן)'];
    return _chapterCache[cacheKey];
  } catch (err) {
    console.error(`Failed to load ${cacheKey}:`, err);
    return [`שגיאה בטעינת ${book} פרק ${chapter}`];
  }
}
