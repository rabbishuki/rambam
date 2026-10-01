// Dvarim-only overrides of core.js: parashiyot are keyed on fake dates, so hide dates and skip Shabbat logic

checkShabbatLearning = () => {};

// Core's learning timer only runs for a recognised book; count every parasha as one book
window.extractBookName = window.extractHebrewBookName = () => 'ספר דברים';

// Migrate from the single-day version: drop the cached whole book, keep progress inside פרשת דברים (105 pesukim)
const cachedDays = getDays();
if (cachedDays[DATE] && cachedDays[DATE].ref === 'Deuteronomy.1-34') {
  delete cachedDays[DATE];
  saveDays(cachedDays);
  const done = getDone();
  Object.keys(done).forEach(key => { if (+key.split(':')[1] >= 105) delete done[key]; });
  saveDone(done);
}

// "יום ה׳ • כ׳ תשרי • 3/105" -> "3/105", and Rambam wording -> Chumash wording
const WORDING = [['ימים הושלמו', 'פרשיות הושלמו'], ['סיימת את הלכות', 'סיימת את'], ['הלכות קודמות', 'פסוקים קודמים'], ['הלכות', 'פסוקים'], ['להלכה הבאה', 'לפסוק הבא']];
const fixWording = text => WORDING.reduce((t, [from, to]) => t.replace(from, to), text);
new MutationObserver(() => {
  document.querySelectorAll('.day-meta').forEach(el => {
    if (el.textContent.includes(' • ')) el.textContent = el.textContent.split(' • ').pop();
  });
  document.querySelectorAll('.completed-counter, .loading, .settings-label, .celebration-subtitle, .celebration-stat-label').forEach(el => {
    const text = fixWording(el.textContent);
    if (text !== el.textContent) el.textContent = text;
  });
  document.querySelectorAll('#scrollToNext').forEach(el => {
    el.title = el.ariaLabel = fixWording(el.title);
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
  if (reportedDone !== undefined && reportedDone < count && count === PARASHOT.length) {
    const pesukim = Object.values(days).reduce((sum, day) => sum + day.count, 0);
    setTimeout(() => renderBookCelebration('ספר דברים', 34, pesukim), 600);
  }
  reportedDone = count;
}
const coreRenderDays = renderDays;
renderDays = (...args) => { coreRenderDays(...args); reportProgress(); };
const coreUpdateDayHeader = updateDayHeader;
updateDayHeader = (...args) => { coreUpdateDayHeader(...args); reportProgress(); };

// Celebration share: text + link (core's image share needs screenshot.js, which dvarim doesn't load)
const coreInitCelebrationEffects = initCelebrationEffects;
initCelebrationEffects = (...args) => {
  coreInitCelebrationEffects(...args);
  window.celebrationShare = (bookName, chapters, pesukim) => window.shareContent(
    `סיימתי את כל ספר דברים בליל הושענא רבה! 🎉\n\n${chapters} פרקים, ${pesukim} פסוקים, ${formatLearningTime(getBookTime(bookName))} שעות לימוד\n\nhttps://${window.PLAN.id}.pages.dev`
  );
};
