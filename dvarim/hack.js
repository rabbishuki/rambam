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

// Save all parashiyot for offline use on first load (the SW isn't active yet then, so it misses them).
// Same cache name and URLs as service-worker.js and fetchText, so the SW's offline fallback finds them.
if ('caches' in window) {
  caches.open(`dvarim-v${Math.max(...Object.keys(CHANGELOG).map(Number))}`).then(cache =>
    PARASHOT.forEach(async parasha => {
      const url = `${SEFARIA_API}/api/v3/texts/${refFor(parasha)}`;
      if (!(await cache.match(url))) cache.add(url).catch(() => {});
    })
  );
}
