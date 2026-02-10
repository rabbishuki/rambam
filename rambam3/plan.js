window.PLAN = {
  id: 'rambam3',
  name: 'רמב"ם יומי',
  storagePrefix: 'rambam3',
  cycleNumber: 46,

  async loadDay(date) {
    const { he, ref } = await fetchCalendar(date, 'Daily Rambam (3 Chapters)');
    const { chapters } = await fetchText(ref);
    const heDate = await fetchHebrewDate(date);
    const count = chapters.reduce((sum, ch) => sum + ch.length, 0);
    return { he, ref, count, heDate };
  },

  async loadContent(date, ref) {
    const { chapters, chapterNumbers } = await fetchText(ref);
    return { chapters, chapterNumbers };
  }
};
