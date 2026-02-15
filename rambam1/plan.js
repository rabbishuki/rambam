window.PLAN = {
  id: 'rambam1',
  name: 'רמב"ם - פרק אחד',
  storagePrefix: 'rambam1',
  cycleNumber: 16,

  async loadDay(date) {
    const { he, ref } = await fetchCalendar(date, 'Daily Rambam');
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
