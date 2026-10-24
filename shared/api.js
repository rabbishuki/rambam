// ============================================================================
// API Constants & State
// ============================================================================
const SEFARIA_API = 'https://www.sefaria.org';
const HEBCAL_API = 'https://www.hebcal.com';
const textCache = new Map(); // In-memory cache for halakha texts
let cachedSunsetHour = 18;   // fallback
let cachedSunsetMinute = 0;

// No readable response: offline, blocked, or a rate-limit reply hidden by missing CORS headers
class NetworkError extends Error {}

async function apiFetch(url) {
  try {
    return await fetch(url);
  } catch (error) {
    throw new NetworkError(`Request failed: ${url}`, { cause: error });
  }
}

// ============================================================================
// Geolocation
// ============================================================================
function getUserCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000 }
    );
  });
}

// ============================================================================
// Sefaria API
// ============================================================================
async function fetchCalendar(dateStr, sefariaTitle) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const url = `${SEFARIA_API}/api/calendars?day=${d}&month=${m}&year=${y}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Calendar API failed: ${res.status}`);
  const data = await res.json();

  // Filter ALL matching Rambam entries (there can be multiple)
  const rambamEntries = data.calendar_items.filter(item =>
    item.title.en === sefariaTitle
  );

  if (rambamEntries.length === 0) throw new Error('No Rambam entry found');

  // Combine all entries
  const combinedHe = rambamEntries.map(entry => entry.displayValue.he).join(', ');
  const combinedRef = rambamEntries.map(entry => entry.ref).join(';');

  return {
    he: combinedHe,
    ref: combinedRef
  };
}

async function fetchText(ref) {
  if (textCache.has(ref)) {
    return textCache.get(ref);
  }

  // Handle multiple references separated by semicolons
  const refs = ref.split(';');
  let chapters = []; // Array of arrays: [[halakha1, halakha2...], [halakha1, halakha2...]]
  let chapterNumbers = []; // [10, 1, 2]

  // Fetch all references in parallel
  const results = await Promise.all(
    refs.map(async (singleRef) => {
      const url = `${SEFARIA_API}/api/v3/texts/${singleRef.trim()}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(`Text API failed: ${res.status}`);
      return res.json();
    })
  );

  // Helper to extract chapter number from reference
  function extractChapterNumber(singleRef) {
    // Examples:
    // "Mishneh Torah, Foundations of the Torah 10" -> 10
    // "Mishneh Torah, Human Dispositions 1-2" -> 1
    const match = singleRef.match(/[.\s](\d+)(?:-\d+)?$/);
    return match ? parseInt(match[1]) : 1;
  }

  // Combine all results
  results.forEach((data, resultIndex) => {
    const text = data.versions[0].text;
    const singleRef = refs[resultIndex].trim();
    const startChapterNum = extractChapterNumber(singleRef);

    if (data.isSpanning) {
      // Multiple chapters in this reference (e.g., "1-2")
      text.forEach((chapter, chapterIndex) => {
        chapters.push(chapter);
        chapterNumbers.push(startChapterNum + chapterIndex);
      });
    } else if (Array.isArray(text)) {
      // Single chapter
      chapters.push(text);
      chapterNumbers.push(startChapterNum);
    } else {
      // Single halakha
      chapters.push([text]);
      chapterNumbers.push(startChapterNum);
    }
  });

  const result = { chapters, chapterNumbers };
  textCache.set(ref, result);
  return result;
}

// ============================================================================
// Location & Sunset
// ============================================================================
async function fetchSunset(dateStr, coords) {
  const sunsetRes = await fetch(`${HEBCAL_API}/zmanim?cfg=json&latitude=${coords.latitude}&longitude=${coords.longitude}&date=${dateStr}`);

  if (!sunsetRes.ok) throw new Error(`Zmanim API failed: ${sunsetRes.status}`);
  const data = await sunsetRes.json();

  if (!data.times || !data.times.sunset) {
    throw new Error('Sunset data not available');
  }

  const sunsetTime = new Date(data.times.sunset);
  cachedSunsetHour = sunsetTime.getHours();
  cachedSunsetMinute = sunsetTime.getMinutes();
}

// ============================================================================
// Hebrew Date
// ============================================================================
const HEBREW_ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const HEBREW_TENS = ['', 'י', 'כ', 'ל'];

function hebrewDayNumeral(n) {
  const letters = n === 15 ? 'טו' : n === 16 ? 'טז' : HEBREW_TENS[Math.floor(n / 10)] + HEBREW_ONES[n % 10];
  return letters.length === 1 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

let hebrewDateFormat;

// Converts in the browser; returns null when the browser can't, so the caller falls back to Hebcal
function localHebrewDate(dateStr) {
  try {
    hebrewDateFormat ||= new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    if (hebrewDateFormat.resolvedOptions().calendar !== 'hebrew') return null;

    const parts = hebrewDateFormat.formatToParts(new Date(`${dateStr}T00:00:00Z`));
    const day = Number(parts.find(p => p.type === 'day')?.value);
    const month = parts.find(p => p.type === 'month')?.value;
    if (!(day >= 1 && day <= 30) || !/^[א-ת][א-ת ׳']*$/.test(month || '')) return null;

    return `${hebrewDayNumeral(day)} ${month}`;
  } catch (error) {
    return null;
  }
}

async function fetchHebrewDate(dateStr) {
  const local = localHebrewDate(dateStr);
  if (local) return local;

  try {
    const url = `${HEBCAL_API}/converter?cfg=json&date=${dateStr}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Converter API failed: ${res.status}`);
    const data = await res.json();

    if (data.heDateParts && data.heDateParts.d && data.heDateParts.m) {
      return `${data.heDateParts.d} ${data.heDateParts.m}`;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch Hebrew date:', error);
    return null;
  }
}
