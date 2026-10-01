// Dvarim-only overrides of core.js: parashiyot are keyed on fake dates, so hide dates and skip Shabbat logic

checkShabbatLearning = () => {};

// Migrate from the single-day version: drop the cached whole book, keep progress inside פרשת דברים (105 pesukim)
const cachedDays = getDays();
if (cachedDays[DATE] && cachedDays[DATE].ref === 'Deuteronomy.1-34') {
  delete cachedDays[DATE];
  saveDays(cachedDays);
  const done = getDone();
  Object.keys(done).forEach(key => { if (+key.split(':')[1] >= 105) delete done[key]; });
  saveDone(done);
}

// "יום ה׳ • כ׳ תשרי • 3/105" -> "3/105", "✓ 2 ימים הושלמו" -> "✓ 2 פרשיות הושלמו"
new MutationObserver(() => {
  document.querySelectorAll('.day-meta').forEach(el => {
    if (el.textContent.includes(' • ')) el.textContent = el.textContent.split(' • ').pop();
  });
  document.querySelectorAll('.completed-days-counter').forEach(el => {
    if (el.textContent.includes('ימים')) el.textContent = el.textContent.replace('ימים', 'פרשיות');
  });
}).observe(document.body, { childList: true, subtree: true, characterData: true });

// Make sure the book is saved for offline use even when the day list was already cached
loadBook().catch(() => {});

// Report completed parashiyot to Clarity (session tag, filterable in the dashboard) whenever progress changes
let reportedDone;
function reportProgress() {
  const days = getDays();
  const done = getDone();
  const count = Object.keys(days).filter(date => parashaFor(date) && countDoneForDate(done, date) >= days[date].count).length;
  if (count !== reportedDone && typeof clarity === 'function') clarity('set', 'parashiyot_done', String(count));
  reportedDone = count;
}
const coreRenderDays = renderDays;
renderDays = (...args) => { coreRenderDays(...args); reportProgress(); };
const coreUpdateDayHeader = updateDayHeader;
updateDayHeader = (...args) => { coreUpdateDayHeader(...args); reportProgress(); };
