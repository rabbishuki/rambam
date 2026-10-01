// One fake date per parasha, ending on erev Hoshana Rabba (newest date = דברים, shown first)
const DATE = '2026-10-01';
const PARASHOT = [
  ['דברים', 1, 1, 3, 22], ['ואתחנן', 3, 23, 7, 11], ['עקב', 7, 12, 11, 25],
  ['ראה', 11, 26, 16, 17], ['שופטים', 16, 18, 21, 9], ['כי תצא', 21, 10, 25, 19],
  ['כי תבוא', 26, 1, 29, 8], ['נצבים', 29, 9, 30, 20], ['וילך', 31, 1, 31, 30],
  ['האזינו', 32, 1, 32, 52], ['וזאת הברכה', 33, 1, 34, 12]
];
const START = new Date(Date.parse(DATE) - (PARASHOT.length - 1) * 864e5).toISOString().slice(0, 10);
localStorage.setItem('rambam_start', START);
if (localStorage.getItem('rambam_large_font') === null) localStorage.setItem('rambam_large_font', 'true');

const parashaFor = date => PARASHOT[Math.round((Date.parse(DATE) - Date.parse(date)) / 864e5)];
const refFor = ([, c1, v1, c2, v2]) => `Deuteronomy.${c1}.${v1}-${c2}.${v2}`;

window.PLAN = {
  id: 'dvarim',
  name: 'חומש דברים',
  appName: 'חומש דברים',
  storagePrefix: 'dvarim',

  async loadDay(date) {
    const parasha = parashaFor(date);
    if (!parasha) throw new Error(`${date} is not a parasha date`);
    const { chapters } = await fetchText(refFor(parasha));
    const count = chapters.reduce((sum, ch) => sum + ch.length, 0);
    return { he: `פרשת ${parasha[0]}`, ref: refFor(parasha), count, heDate: parasha[0] };
  },

  // Number pesukim ourselves (core skips its numbering when text starts with <b>),
  // since a parasha can start mid-chapter
  async loadContent(date, ref) {
    const [, c1, v1] = parashaFor(date);
    const { chapters } = await fetchText(ref);
    return {
      chapters: chapters.map((ch, i) => ch.map((text, j) => `<b>${toHebrewLetter((i ? 1 : v1) + j)}.</b> ${text}`)),
      chapterNumbers: chapters.map((_, i) => c1 + i)
    };
  }
};
