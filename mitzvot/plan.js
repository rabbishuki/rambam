window.PLAN = {
  id: 'mitzvot',
  name: 'ספר המצוות',
  storagePrefix: 'mitzvot',
  cycleNumber: 46,

  // Sefer HaMitzvot uses static data from mitzvot.js
  async loadDay(date) {
    // Calculate day number from cycle start
    const start = localStorage.getItem('rambam_start') || '2026-02-03';
    const startDate = new Date(start);
    const currentDate = new Date(date);
    const dayNumber = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (!window.mitzvot || !window.mitzvot[dayNumber]) {
      throw new Error(`No mitzvot data for day ${dayNumber}`);
    }

    const dayData = window.mitzvot[dayNumber];
    const heDate = await fetchHebrewDate(date);

    // Determine display name - use Hebrew date for mitzvot mode
    let he;
    if (dayData.intro) {
      he = dayNumber === 1 ? 'מבוא לספר המצוות' : `עקרונות ${dayNumber - 1}`;
    } else {
      // For regular days, show the Hebrew date or formatted Gregorian date
      he = heDate || formatDateHebrew(date);
    }

    // For intro days, count is 1; otherwise, count positive + negative mitzvot
    const count = dayData.intro ? 1 : (dayData.p.length + dayData.n.length);

    return {
      he,
      ref: `mitzvot-day-${dayNumber}`,
      count: Math.max(count, 1), // Always at least 1
      heDate,
      dayNumber
    };
  },

  async loadContent(date, ref) {
    // Extract day number from ref
    const dayNumber = parseInt(ref.split('-')[2]);
    const dayData = window.mitzvot[dayNumber];

    if (!dayData) {
      return { chapters: [[]], chapterNumbers: [1] };
    }

    // For intro days, return a simple placeholder
    if (dayData.intro) {
      const introText = dayNumber === 1
        ? 'קרא את המבוא לספר המצוות באתר חב"ד או בספר.'
        : `קרא את העיקרון ${dayNumber - 1} באתר חב"ד או בספר.`;

      return {
        chapters: [[introText]],
        chapterNumbers: [1]
      };
    }

    // Load mitzvot content from Sefaria
    const mitzvotContent = [];

    // Add positive mitzvot (without numbering - the title already has the mitzvah number)
    for (const num of dayData.p) {
      const text = await fetchMitzvah('positive', num);
      if (text) {
        mitzvotContent.push(`<b>מצות עשה ${toHebrewLetter(num)}</b><br>${text}`);
      }
    }

    // Add negative mitzvot (without numbering - the title already has the mitzvah number)
    for (const num of dayData.n) {
      const text = await fetchMitzvah('negative', num);
      if (text) {
        mitzvotContent.push(`<b>מצות לא תעשה ${toHebrewLetter(num)}</b><br>${text}`);
      }
    }

    // Return as single chapter - pass empty chapterNumbers to signal no numbering needed
    return {
      chapters: [mitzvotContent.length > 0 ? mitzvotContent : ['אין מצוות ליום זה']],
      chapterNumbers: [] // Empty array = don't add Hebrew letter numbering
    };
  }
};

// Helper function to format date in Hebrew style
function formatDateHebrew(dateStr) {
  const date = new Date(dateStr);
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const dayOfWeek = days[date.getDay()];

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return `יום ${dayOfWeek}, ${day}/${month}/${year}`;
}

// Helper function to fetch individual mitzvah text from Sefaria
async function fetchMitzvah(type, number) {
  try {
    const book = type === 'positive'
      ? 'Sefer_HaMitzvot,_Positive_Commandments'
      : 'Sefer_HaMitzvot,_Negative_Commandments';

    const url = `https://www.sefaria.org/api/v3/texts/${book}.${number}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch mitzvah ${type} ${number}`);

    const data = await res.json();
    return data.versions[0]?.text || '';
  } catch (error) {
    console.error(`Failed to load mitzvah ${type} ${number}:`, error);
    return `מצוה ${number} (שגיאה בטעינה)`;
  }
}
