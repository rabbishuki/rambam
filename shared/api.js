// ============================================================================
// API Constants & State
// ============================================================================
const SEFARIA_API = 'https://www.sefaria.org';
const HEBCAL_API = 'https://www.hebcal.com';
const DEFAULT_COORDS = { latitude: 32.0853, longitude: 34.7818 }; // Tel Aviv fallback
const textCache = new Map(); // In-memory cache for halakha texts
let cachedSunsetHour = 18;   // fallback
let cachedSunsetMinute = 0;
let cachedCoords = DEFAULT_COORDS;
let isUsingDefaultLocation = true;
let cachedLocationName = 'תל אביב';

// ============================================================================
// Geolocation
// ============================================================================
function getUserCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using Tel Aviv');
      isUsingDefaultLocation = true;
      resolve(DEFAULT_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Got user location:', pos.coords.latitude, pos.coords.longitude);
        isUsingDefaultLocation = false;
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (error) => {
        console.log('Geolocation error:', error.message, '- using Tel Aviv');
        isUsingDefaultLocation = true;
        resolve(DEFAULT_COORDS);
      },
      { timeout: 5000 }
    );
  });
}

// ============================================================================
// Sefaria API
// ============================================================================
async function fetchCalendar(dateStr, sefariaTitle) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const url = `${SEFARIA_API}/api/calendars?day=${d}&month=${m}&year=${y}`;
  const res = await fetch(url);
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
      const res = await fetch(url);
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
async function fetchLocationName(coords) {
  try {
    // Use BigDataCloud's free reverse geocoding API (no API key, no rate limits)
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=he`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const data = await res.json();

    console.log('Geocoding response:', data);

    // Try to get city name in Hebrew - locality is most accurate
    const cityName = data.locality || data.city || data.principalSubdivision || 'מיקום נוכחי';
    console.log('Extracted city name:', cityName);
    return cityName;
  } catch (error) {
    console.error('Failed to fetch location name:', error);
    return 'מיקום נוכחי';
  }
}

async function fetchSunset(dateStr, coords) {
  try {
    cachedCoords = coords;

    // Fetch location name and sunset in parallel
    const [locationName, sunsetRes] = await Promise.all([
      isUsingDefaultLocation ? Promise.resolve('תל אביב') : fetchLocationName(coords),
      fetch(`${HEBCAL_API}/zmanim?cfg=json&latitude=${coords.latitude}&longitude=${coords.longitude}&date=${dateStr}`)
    ]);

    cachedLocationName = locationName;

    if (!sunsetRes.ok) throw new Error(`Zmanim API failed: ${sunsetRes.status}`);
    const data = await sunsetRes.json();

    if (data.times && data.times.sunset) {
      const sunsetTime = new Date(data.times.sunset);
      cachedSunsetHour = sunsetTime.getHours();
      cachedSunsetMinute = sunsetTime.getMinutes();
    }
    updateLocationDisplay();
  } catch (error) {
    console.error('Failed to fetch sunset time:', error);
    // Keep fallback values (18:00)
    updateLocationDisplay();
  }
}

function updateLocationDisplay() {
  const locationText = document.getElementById('locationText');
  const sunsetText = document.getElementById('sunsetText');

  console.log('Updating location display:', {
    cachedLocationName,
    isUsingDefaultLocation,
    cachedSunsetHour,
    cachedSunsetMinute,
    locationText: !!locationText,
    sunsetText: !!sunsetText
  });

  if (locationText) {
    const suffix = isUsingDefaultLocation ? ' (ברירת מחדל)' : '';
    locationText.textContent = `מיקום: ${cachedLocationName}${suffix}`;
  }

  if (sunsetText) {
    const hourStr = String(cachedSunsetHour).padStart(2, '0');
    const minStr = String(cachedSunsetMinute).padStart(2, '0');
    sunsetText.textContent = `שקיעה: ${hourStr}:${minStr}`;
  }
}

// ============================================================================
// Hebrew Date
// ============================================================================
async function fetchHebrewDate(dateStr) {
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
