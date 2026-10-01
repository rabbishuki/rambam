// Chumash Devarim - learned in full on the night of Hoshana Rabba.
// One "day" per year (keyed on erev Hoshana Rabba), all 34 chapters,
// one swipeable card per pasuk. Progress is stored per date, so each year starts fresh
// and previous years stay visible.

// Erev Hoshana Rabba (20 Tishrei), 5787-5806. Keyed on the day before so the
// learning shows all day today, not only after the 18:00 switch.
const HOSHANA_RABBA = [
  '2026-10-01', '2027-10-21', '2028-10-10', '2029-09-29', '2030-10-17',
  '2031-10-07', '2032-09-25', '2033-10-13', '2034-10-03', '2035-10-23',
  '2036-10-11', '2037-09-29', '2038-10-19', '2039-10-08', '2040-09-27',
  '2041-10-15', '2042-10-04', '2043-10-24', '2044-10-11', '2045-10-01'
];
const DVARIM_REF = 'Deuteronomy.1-34';

// Default start = most recent erev Hoshana Rabba (or the first one), so there's never an empty page.
// Runs before init(), so core.js sees it as already set.
(function setDefaultStart() {
  if (localStorage.getItem('rambam_start')) return;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const past = HOSHANA_RABBA.filter(date => date <= today);
  localStorage.setItem('rambam_start', past.length ? past[past.length - 1] : HOSHANA_RABBA[0]);
})();

window.PLAN = {
  id: 'dvarim',          // must match the Cloudflare Pages project name (used for share URL)
  name: 'חומש דברים',
  storagePrefix: 'chumash',

  async loadDay(date) {
    if (!HOSHANA_RABBA.includes(date)) {
      throw new Error(`${date} is not Hoshana Rabba`);
    }
    const { chapters } = await fetchText(DVARIM_REF);
    const heDate = await fetchHebrewDate(date);
    const count = chapters.reduce((sum, ch) => sum + ch.length, 0);
    return { he: 'חומש דברים - ליל הושענא רבה', ref: DVARIM_REF, count, heDate };
  },

  async loadContent(date, ref) {
    const { chapters, chapterNumbers } = await fetchText(ref);
    return { chapters, chapterNumbers };
  }
};
