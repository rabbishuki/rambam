const assert = require('node:assert/strict');

global.window = global;
require('../chasidishe/about.js');
require('../chasidishe/torah-or-catalog.js');
require('../chasidishe/content-counts.js');
require('../chasidishe/schedule.js');
require('../chasidishe/plan.js');

const catalog = Object.values(window.TORAH_OR_CATALOG);
const totalCheckpoints = catalog.reduce((sum, section) => sum + section.total, 0);
const totalMaamarim = catalog.reduce((sum, section) =>
  sum + Object.values(section.chapters).flat().filter(checkpoint => checkpoint.title).length, 0);

assert.equal(catalog.length, 31, 'Torah Or catalog section count changed');
assert.equal(totalMaamarim, 154, 'Torah Or maamar count changed');
assert.equal(totalCheckpoints, 683, 'Torah Or checkpoint count changed');
assert.equal(window.SCHEDULE.length, 365, 'Daily schedule must contain 365 days');
assert.equal(window.PLAN.CYCLE_START, '2026-10-04', 'Chasidus cycle start changed');
assert.equal(window.PLAN.storagePrefix, 'chasidus', 'Chasidus data prefix changed');
assert.equal(window.PLAN.settingsPrefix, 'chasidus', 'Chasidus settings prefix changed');
assert.equal(window.PLAN.startStorageKey, 'chasidus_start', 'Chasidus start-date storage key changed');
assert.equal(window.PLAN.installPromptStorageKey, 'chasidus_install_prompt_shown', 'Chasidus install key changed');
assert.equal(window.PLAN.showCardNumbers, false, 'Chasidus must use Sefaria chapter markers instead of generated numbers');
assert.equal(window.CHASIDUS_CONTENT_COUNTS['Torah_Ohr,_Bereshit.1'], 14, 'Sefaria paragraph counts changed');
assert.equal(window.CHASIDUS_CONTENT_COUNTS['Likkutei_Torah,_Shir_HaShirim.16'], 15, 'Title-only lines must not count as cards');
assert.equal(window.APP_CONFIG.about.showYomiLink, false, 'Chasidus About panel must hide the Rambam Yomi link');
assert.match(window.APP_CONFIG.about.bodySection, /תורה אור ולקוטי תורה/, 'Chasidus About copy is missing');

const missing = [];
window.SCHEDULE.forEach((day, dayIndex) => {
  day.books.forEach(({ book, chapter }) => {
    const ref = `${book}.${chapter}`;
    if (!(window.CHASIDUS_CONTENT_COUNTS[ref] > 0)) missing.push({ dayIndex, ref, type: 'count' });
    if (book.startsWith('Torah_Ohr') && !window.TORAH_OR_CATALOG[book]?.chapters?.[chapter]) {
      missing.push({ dayIndex, ref, type: 'catalog' });
    }
  });
});

assert.deepEqual(missing, [], 'Schedule references content without card metadata');
console.log('Validated 31 sections, 154 maamarim, 683 checkpoints, and 365 schedule days.');
