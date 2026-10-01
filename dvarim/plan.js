const DATE = '2026-10-01';
const REF = 'Deuteronomy.1-34';
localStorage.setItem('rambam_start', DATE);
if (localStorage.getItem('rambam_large_font') === null) localStorage.setItem('rambam_large_font', 'true');

window.PLAN = {
  id: 'dvarim',
  name: 'חומש דברים',
  appName: 'חומש דברים',
  storagePrefix: 'dvarim',

  async loadDay(date) {
    if (date !== DATE) throw new Error(`${date} is not Hoshana Rabba`);
    const { chapters } = await fetchText(REF);
    const heDate = await fetchHebrewDate(date);
    const count = chapters.reduce((sum, ch) => sum + ch.length, 0);
    return { he: 'חומש דברים - ליל הושענא רבה', ref: REF, count, heDate };
  },

  loadContent: (date, ref) => fetchText(ref)
};
