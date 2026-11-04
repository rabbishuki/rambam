const assert = require('node:assert/strict');

global.window = global;
require('../chasidishe/torah-or-catalog.js');
require('../chasidishe/schedule.js');

const catalog = Object.values(window.TORAH_OR_CATALOG);
const totalCheckpoints = catalog.reduce((sum, section) => sum + section.total, 0);
const totalMaamarim = catalog.reduce((sum, section) =>
  sum + Object.values(section.chapters).flat().filter(checkpoint => checkpoint.title).length, 0);

assert.equal(catalog.length, 31, 'Torah Or catalog section count changed');
assert.equal(totalMaamarim, 154, 'Torah Or maamar count changed');
assert.equal(totalCheckpoints, 683, 'Torah Or checkpoint count changed');
assert.equal(window.SCHEDULE.length, 365, 'Daily schedule must contain 365 days');

const missing = [];
window.SCHEDULE.forEach((day, dayIndex) => {
  day.books.forEach(({ book, chapter }) => {
    if (!book.startsWith('Torah_Ohr')) return;
    if (!window.TORAH_OR_CATALOG[book]?.chapters?.[chapter]) {
      missing.push({ dayIndex, book, chapter });
    }
  });
});

assert.deepEqual(missing, [], 'Torah Or schedule references missing catalog chapters');
console.log('Validated 31 sections, 154 maamarim, 683 checkpoints, and 365 schedule days.');
