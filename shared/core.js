// ============================================================================
// LocalStorage Utilities
// ============================================================================
const CYCLE_START = '2026-02-03';

function getStart() {
  const stored = localStorage.getItem('rambam_start');
  // If not set, return the default but don't save it yet
  return stored || CYCLE_START;
}

function setStart(dateStr) {
  localStorage.setItem('rambam_start', dateStr);
}

// Generic setting utilities
function getSetting(key, defaultValue = true) {
  const stored = localStorage.getItem(key);
  return stored === null ? defaultValue : stored === 'true';
}

function setSetting(key, value) {
  localStorage.setItem(key, value.toString());
}

// Specific setting functions (backward compatibility wrappers)
function getAutoMark() {
  return getSetting('rambam_auto_mark', true);
}

function setAutoMark(enabled) {
  setSetting('rambam_auto_mark', enabled);
}

function getHideCompleted() {
  return getSetting('rambam_hide_completed', true);
}

function setHideCompleted(enabled) {
  setSetting('rambam_hide_completed', enabled);
}

function getHideCompletedDays() {
  return getSetting('rambam_hide_completed_days', true);
}

function setHideCompletedDays(enabled) {
  setSetting('rambam_hide_completed_days', enabled);
}

function isFirstVisit() {
  return !localStorage.getItem('rambam_start');
}

function getTodayInIsrael() {
  // Get current time in Israel timezone (Asia/Jerusalem)
  const now = new Date();
  const israelTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
  const israelTime = new Date(israelTimeStr);
  const hour = israelTime.getHours();
  const minute = israelTime.getMinutes();

  // Jewish day starts at sunset (using cached sunset time)
  const isPastSunset = (hour > cachedSunsetHour) ||
                       (hour === cachedSunsetHour && minute >= cachedSunsetMinute);

  let jewishDate = new Date(israelTime);

  if (!isPastSunset) {
    // Before sunset - still in previous Jewish day
    // No adjustment needed, use current calendar date
  } else {
    // After sunset - advance to next Jewish day
    jewishDate.setDate(jewishDate.getDate() + 1);
  }

  const year = jewishDate.getFullYear();
  const month = String(jewishDate.getMonth() + 1).padStart(2, '0');
  const day = String(jewishDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Plan-specific storage functions - read from window.PLAN.storagePrefix
function getDays() {
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_days`);
  return stored ? JSON.parse(stored) : {};
}

function saveDays(days) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_days`, JSON.stringify(days));
}

function getDone() {
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_done`);
  return stored ? JSON.parse(stored) : {};
}

function saveDone(done) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_done`, JSON.stringify(done));
}

function markDone(date, index) {
  const done = getDone();
  done[`${date}:${index}`] = new Date().toISOString();
  saveDone(done);
}

// ============================================================================
// Date Utilities
// ============================================================================
function dateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatHebrewDate(dateStr) {
  const days = getDays();
  const dayData = days[dateStr];

  // Try to use cached Hebrew date first
  if (dayData && dayData.heDate) {
    return dayData.heDate;
  }

  // Fall back to Gregorian format
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}/${m}/${y}`;
}

function toHebrewLetter(num) {
  const ones = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  if (num < 1) return '';

  let result = '';

  // Hundreds
  const hundred = Math.floor(num / 100);
  if (hundred > 0 && hundred < hundreds.length) {
    result += hundreds[hundred];
  }

  // Tens and ones
  const remainder = num % 100;

  // Handle 15 and 16 specially (טו, טז instead of יה, יו which spell God's name)
  if (remainder === 15) {
    result += 'טו';
  } else if (remainder === 16) {
    result += 'טז';
  } else if (remainder > 0) {
    if (remainder < 10) {
      result += ones[remainder - 1];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      result += tens[ten];
      if (one > 0) {
        result += ones[one - 1];
      }
    }
  }

  return result || num.toString();
}

// ============================================================================
// Data Loading
// ============================================================================
async function loadMissingDays() {
  const start = getStart();
  const today = getTodayInIsrael();
  const allDates = dateRange(start, today);
  const days = getDays();

  const missing = allDates.filter(date => !days[date]);
  const needHeDate = allDates.filter(date => days[date] && !days[date].heDate);

  // Fetch all missing dates in parallel
  if (missing.length > 0) {
    const results = await Promise.allSettled(
      missing.map(async (date) => {
        return await window.PLAN.loadDay(date);
      })
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        days[missing[i]] = result.value;
      } else {
        console.error(`Failed to load ${missing[i]}:`, result.reason);
      }
    });
  }

  // Backfill Hebrew dates for existing days
  if (needHeDate.length > 0) {
    const results = await Promise.allSettled(
      needHeDate.map(async (date) => {
        const heDate = await fetchHebrewDate(date);
        return { date, heDate };
      })
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const { date, heDate } = result.value;
        if (heDate && days[date]) {
          days[date].heDate = heDate;
        }
      } else {
        console.error(`Failed to fetch Hebrew date for ${needHeDate[i]}:`, result.reason);
      }
    });
  }

  saveDays(days);
}

// ============================================================================
// Stats Computation
// ============================================================================
function computeStats() {
  const days = getDays();
  const done = getDone();
  const today = getTodayInIsrael();

  // Completed days: count how many days have been fully completed
  let completedDays = 0;
  let totalDays = 0;

  Object.keys(days).forEach(date => {
    if (date <= today) {
      totalDays++;
      const dayData = days[date];
      const doneCount = Object.keys(done).filter(key =>
        key.startsWith(`${date}:`)
      ).length;

      if (doneCount >= dayData.count) {
        completedDays++;
      }
    }
  });

  // Today percentage
  const todayData = days[today];
  let todayPercent = 0;
  if (todayData) {
    const todayDone = Object.keys(done).filter(key =>
      key.startsWith(`${today}:`)
    ).length;
    todayPercent = Math.round((todayDone / todayData.count) * 100);
  }

  // Backlog: sum of incomplete halakhot before today (not including today)
  let backlog = 0;
  Object.keys(days).forEach(date => {
    if (date < today) {
      const dayData = days[date];
      const doneCount = Object.keys(done).filter(key =>
        key.startsWith(`${date}:`)
      ).length;
      const remaining = dayData.count - doneCount;
      if (remaining > 0) {
        backlog += remaining;
      }
    }
  });

  return { completedDays, totalDays, todayPercent, backlog };
}

function renderStats() {
  const { completedDays, totalDays, todayPercent, backlog } = computeStats();
  document.getElementById('completedDaysValue').textContent = `${completedDays}/${totalDays}`;
  document.getElementById('todayValue').textContent = `${todayPercent}%`;
  document.getElementById('backlogValue').textContent = backlog;
}

function updateDayHeader(date) {
  const days = getDays();
  const done = getDone();
  const dayData = days[date];
  if (!dayData) return;

  const doneCount = Object.keys(done).filter(key =>
    key.startsWith(`${date}:`)
  ).length;
  const isComplete = doneCount >= dayData.count;

  // Find the details element for this date
  const details = document.querySelector(`details[data-date="${date}"]`);
  if (!details) return;

  // Update the completed class
  if (isComplete) {
    details.classList.add('completed');
  } else {
    details.classList.remove('completed');
  }

  // Update the progress text
  const dayMeta = details.querySelector('.day-meta');
  const today = getTodayInIsrael();
  const isToday = date === today;
  const dateLabel = isToday ? 'היום' : formatHebrewDate(date);
  dayMeta.textContent = `${dateLabel} • ${doneCount}/${dayData.count}`;

  // Update button visibility
  const checkBtn = details.querySelector('.day-action-btn.check');
  const resetBtn = details.querySelector('.day-action-btn.reset');

  // Hide check button if all done
  if (isComplete) {
    checkBtn.style.display = 'none';
  } else {
    checkBtn.style.display = '';
  }

  // Hide reset button if nothing done
  if (doneCount === 0) {
    resetBtn.style.display = 'none';
  } else {
    resetBtn.style.display = '';
  }
}

// ============================================================================
// Rendering
// ============================================================================
function renderDays() {
  const days = getDays();
  const done = getDone();
  const today = getTodayInIsrael();
  const start = getStart();

  const allDates = dateRange(start, today).reverse(); // Today first
  const mainContent = document.getElementById('mainContent');

  if (allDates.length === 0) {
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">ברוכים הבאים!</div>
        <div class="empty-state-text">טוען את הלימוד היומי שלך...</div>
      </div>
    `;
    return;
  }

  mainContent.innerHTML = '';

  let consecutiveCompletedCount = 0;

  allDates.forEach((date) => {
    const dayData = days[date];
    if (!dayData) return;

    const doneCount = Object.keys(done).filter(key =>
      key.startsWith(`${date}:`)
    ).length;
    const isComplete = doneCount >= dayData.count;

    if (isComplete) {
      consecutiveCompletedCount++;
    } else {
      // If we have accumulated completed days, show the counter
      if (consecutiveCompletedCount > 0) {
        const daysCounter = document.createElement('div');
        daysCounter.className = 'completed-counter completed-days-counter';
        daysCounter.textContent = `✓ ${consecutiveCompletedCount} ימים הושלמו`;
        mainContent.appendChild(daysCounter);
        consecutiveCompletedCount = 0;
      }
    }

    const details = document.createElement('details');
    details.className = `day-group ${isComplete ? 'completed' : ''}`;
    details.dataset.date = date;
    details.dataset.ref = dayData.ref;

    const isToday = date === today;
    const dateLabel = isToday ? 'היום' : formatHebrewDate(date);

    // Determine button visibility
    const showCheckBtn = !isComplete;
    const showResetBtn = doneCount > 0;

    details.innerHTML = `
      <summary>
        <div class="day-header">
          <span class="day-arrow">◀</span>
          <div class="day-info">
            <div>${dayData.he}</div>
            <div class="day-meta">${dateLabel} • ${doneCount}/${dayData.count}</div>
          </div>
        </div>
        <div class="day-actions">
          <button class="day-action-btn check" data-action="complete" data-date="${date}" title="סמן הכל כהושלם" aria-label="סמן הכל כהושלם" style="display: ${showCheckBtn ? '' : 'none'}">✓</button>
          <button class="day-action-btn reset" data-action="reset" data-date="${date}" title="אפס יום" aria-label="אפס יום" style="display: ${showResetBtn ? '' : 'none'}">↺</button>
        </div>
      </summary>
      <div class="cards-container" data-date="${date}"></div>
    `;

    mainContent.appendChild(details);
  });

  // Add final counter if we ended with completed days
  if (consecutiveCompletedCount > 0) {
    const daysCounter = document.createElement('div');
    daysCounter.className = 'completed-counter completed-days-counter';
    daysCounter.textContent = `✓ ${consecutiveCompletedCount} ימים הושלמו`;
    mainContent.appendChild(daysCounter);
  }

  // Attach listeners to details elements
  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', handleDetailsToggle);
  });

  // Attach listeners to action buttons
  document.querySelectorAll('.day-action-btn').forEach(btn => {
    btn.addEventListener('click', handleDayAction);
  });
}

function handleDayAction(event) {
  event.stopPropagation(); // Prevent summary toggle
  const btn = event.currentTarget;
  const action = btn.dataset.action;
  const date = btn.dataset.date;
  const days = getDays();
  const dayData = days[date];

  if (!dayData) return;

  if (action === 'reset') {
    if (!confirm(`האם לאפס את כל ההתקדמות של ${dayData.he}?`)) return;

    // Remove all done entries for this date
    const done = getDone();
    Object.keys(done).forEach(key => {
      if (key.startsWith(`${date}:`)) {
        delete done[key];
      }
    });
    saveDone(done);

    // Refresh the display
    renderDays();
    renderStats();
  } else if (action === 'complete') {
    if (!confirm(`האם לסמן את כל ${dayData.he} כהושלם?`)) return;

    // Mark all halakhot as done
    const done = getDone();
    for (let i = 0; i < dayData.count; i++) {
      done[`${date}:${i}`] = new Date().toISOString();
    }
    saveDone(done);

    // Refresh the display
    renderDays();
    renderStats();
  }
}

async function handleDetailsToggle(event) {
  const details = event.target;
  if (!details.open) return;

  const date = details.dataset.date;
  const ref = details.dataset.ref;
  const container = details.querySelector('.cards-container');

  if (container.children.length > 0) return; // Already loaded

  container.innerHTML = '<div class="loading">טוען הלכות...</div>';

  try {
    const { chapters, chapterNumbers } = await window.PLAN.loadContent(date, ref);
    const done = getDone();

    container.innerHTML = '';

    let globalIndex = 0; // For tracking completion across all chapters
    const showChapterDividers = chapters.length > 1; // Only show dividers if multiple chapters

    chapters.forEach((chapter, chapterIdx) => {
      // Add chapter divider only if there are multiple chapters
      if (showChapterDividers) {
        const divider = document.createElement('div');
        divider.className = 'chapter-divider';
        divider.innerHTML = `<span>פרק ${toHebrewLetter(chapterNumbers[chapterIdx])}</span>`;
        container.appendChild(divider);
      }

      // Count completed in this chapter
      let chapterCompletedCount = 0;
      chapter.forEach((text, halakhaIdx) => {
        if (done[`${date}:${globalIndex + halakhaIdx}`]) {
          chapterCompletedCount++;
        }
      });

      // Always add completed counter placeholder for this chapter (even if 0)
      const counter = document.createElement('div');
      counter.className = 'completed-counter';
      counter.dataset.chapterIndex = chapterIdx;
      if (chapterCompletedCount > 0) {
        counter.textContent = `✓ ${chapterCompletedCount} הלכות הושלמו`;
        counter.dataset.count = chapterCompletedCount;
      } else {
        counter.textContent = '';
        counter.dataset.count = 0;
      }
      container.appendChild(counter);

      // Add halakhot for this chapter
      chapter.forEach((text, halakhaIdx) => {
        const isDone = done[`${date}:${globalIndex}`];

        const card = document.createElement('div');
        card.className = 'halakha-card';
        if (isDone) {
          card.classList.add('completed');
        }
        card.dataset.date = date;
        card.dataset.index = globalIndex;

        // Number within chapter (1, 2, 3...)
        const hebrewNum = toHebrewLetter(halakhaIdx + 1);
        card.innerHTML = `
          <div class="halakha-text"><b>${hebrewNum}.</b> ${text}</div>
        `;

        attachSwipeHandler(card);
        container.appendChild(card);

        globalIndex++;
      });
    });
  } catch (error) {
    console.error('Failed to load halakhot:', error);
    container.innerHTML = '<div class="loading">❌ שגיאה בטעינה</div>';
  }
}

// ============================================================================
// Completed Counter Helper
// ============================================================================
function updateCompletedCounter(card) {
  // Find the counter for this chapter (search backwards to chapter divider or start)
  let counter = null;
  let element = card.previousElementSibling;

  // Search backwards for the counter
  while (element) {
    if (element.classList.contains('completed-counter')) {
      counter = element;
      break;
    }
    element = element.previousElementSibling;
  }

  if (!counter) return;

  // Count completed halakhot from counter to next chapter divider/counter
  let count = 0;
  element = counter.nextElementSibling;
  while (element) {
    if (element.classList.contains('chapter-divider')) {
      break;
    }
    if (element.classList.contains('halakha-card') && element.classList.contains('completed')) {
      count++;
    }
    element = element.nextElementSibling;
  }

  // Update counter text
  if (count > 0) {
    counter.textContent = `✓ ${count} הלכות הושלמו`;
    counter.dataset.count = count;
  } else {
    counter.textContent = '';
    counter.dataset.count = 0;
  }
}

// ============================================================================
// Scroll Helper
// ============================================================================
function scrollToCard(card) {
  if (!card) return;

  setTimeout(() => {
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }, 500);
}

// ============================================================================
// Swipe Gesture & Double Click/Tap
// ============================================================================
function attachSwipeHandler(card) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isSwiping = false;
  let isMouseDown = false;
  let lastTapTime = 0;

  // Mark card as done with all the checks and scrolling
  function markCardDone() {
    const date = card.dataset.date;
    const index = parseInt(card.dataset.index);
    const done = getDone();

    // Check if there are incomplete cards above this one
    const container = card.parentElement;
    const cards = Array.from(container.querySelectorAll('.halakha-card'));
    const currentIndex = cards.indexOf(card);

    const incompleteAbove = [];
    for (let i = 0; i < currentIndex; i++) {
      const aboveCard = cards[i];
      const aboveIndex = parseInt(aboveCard.dataset.index);
      if (!done[`${date}:${aboveIndex}`]) {
        incompleteAbove.push(aboveIndex);
      }
    }

    if (incompleteAbove.length > 0 && getAutoMark()) {
      // Auto-mark all incomplete cards above as done
      incompleteAbove.forEach(idx => {
        markDone(date, idx);
        const cardToMark = cards.find(c => parseInt(c.dataset.index) === idx);
        if (cardToMark) {
          cardToMark.classList.add('completed');
        }
      });
    }

    card.classList.add('completed');
    markDone(date, index);
    renderStats();
    updateDayHeader(date);
    updateCompletedCounter(card);

    // Check if day is now complete and re-render if needed
    const days = getDays();
    const dayData = days[date];
    if (dayData) {
      const done = getDone();
      const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
      if (doneCount >= dayData.count) {
        // Day just became complete, re-render to update completed days grouping
        renderDays();
      }
    }

    // Scroll to next card
    let nextCard = card.nextElementSibling;
    while (nextCard && !nextCard.classList.contains('halakha-card')) {
      nextCard = nextCard.nextElementSibling;
    }
    scrollToCard(nextCard);
  }

  // Unmark card as done
  function unmarkCardDone() {
    const date = card.dataset.date;
    const index = parseInt(card.dataset.index);

    card.classList.remove('completed');
    const done = getDone();
    delete done[`${date}:${index}`];
    saveDone(done);
    renderStats();
    updateDayHeader(date);
    updateCompletedCounter(card);

    // Check if day is no longer complete and re-render if needed
    const days = getDays();
    const dayData = days[date];
    if (dayData) {
      const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
      if (doneCount < dayData.count) {
        // Day is no longer complete, re-render to update completed days grouping
        renderDays();
      }
    }

    // Scroll to current card
    scrollToCard(card);
  }

  // Double-click/tap handler
  function handleToggle() {
    const date = card.dataset.date;
    const index = parseInt(card.dataset.index);
    const done = getDone();
    const isCompleted = done[`${date}:${index}`];

    if (isCompleted) {
      unmarkCardDone();
    } else {
      markCardDone();
    }
  }

  // Double-click for desktop
  card.addEventListener('dblclick', (e) => {
    e.preventDefault();
    handleToggle();
  });

  // Touch events (mobile)
  card.addEventListener('touchstart', (e) => {
    // Double-tap detection
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      e.preventDefault();
      handleToggle();
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
    isSwiping = false;
    card.classList.add('swiping');
  }, { passive: false });

  card.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping = true;
    }

    if (isSwiping) {
      e.preventDefault();
      // Allow swiping in both directions
      card.style.transform = `translateX(${deltaX}px)`;
      card.style.opacity = 1 - (Math.abs(deltaX) / 300);
    }
  }, { passive: false });

  card.addEventListener('touchend', handleEnd, { passive: true });

  // Mouse events (desktop)
  card.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    currentY = startY;
    isSwiping = false;
    card.classList.add('swiping');
    e.preventDefault();
  });

  card.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;

    currentX = e.clientX;
    currentY = e.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping = true;
    }

    if (isSwiping) {
      // Allow swiping in both directions
      card.style.transform = `translateX(${deltaX}px)`;
      card.style.opacity = 1 - (Math.abs(deltaX) / 300);
    }
  });

  card.addEventListener('mouseup', handleEnd);
  card.addEventListener('mouseleave', handleEnd);

  function handleEnd() {
    if (!isSwiping && !isMouseDown) {
      card.classList.remove('swiping');
      currentX = 0;
      currentY = 0;
      return;
    }

    card.classList.remove('swiping');
    isMouseDown = false;

    const deltaX = currentX - startX;
    const date = card.dataset.date;
    const index = parseInt(card.dataset.index);
    const done = getDone();
    const isCompleted = done[`${date}:${index}`];

    // Swipe right: mark as done
    if (isSwiping && deltaX > 100 && !isCompleted) {
      markCardDone();
    }
    // Swipe left: unmark as done
    else if (isSwiping && deltaX < -100 && isCompleted) {
      unmarkCardDone();
    }

    // Reset position
    card.style.transform = '';
    card.style.opacity = '';

    isSwiping = false;
    currentX = 0;
    currentY = 0;
  }
}

// ============================================================================
// Calendar Date Picker
// ============================================================================
let viewingDate = null; // null means viewing normal mode (all days)

async function renderSingleDay(date) {
  const days = getDays();
  const done = getDone();
  const today = getTodayInIsrael();
  const mainContent = document.getElementById('mainContent');

  // Check if we have this date cached
  let dayData = days[date];

  // If not cached, fetch it
  if (!dayData) {
    mainContent.innerHTML = '<div class="loading">טוען...</div>';

    try {
      dayData = await window.PLAN.loadDay(date);

      // Cache it
      days[date] = dayData;
      saveDays(days);
    } catch (error) {
      console.error('Failed to fetch date:', error);
      mainContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-title">שגיאה</div>
          <div class="empty-state-text">לא ניתן לטעון את הנתונים לתאריך זה</div>
        </div>
      `;
      return;
    }
  }

  const doneCount = Object.keys(done).filter(key =>
    key.startsWith(`${date}:`)
  ).length;
  const isComplete = doneCount >= dayData.count;

  mainContent.innerHTML = '';

  const details = document.createElement('details');
  details.className = `day-group ${isComplete ? 'completed' : ''}`;
  details.dataset.date = date;
  details.dataset.ref = dayData.ref;
  details.open = true; // Auto-open when viewing single day

  const isToday = date === today;
  const dateLabel = isToday ? 'היום' : formatHebrewDate(date);

  const showCheckBtn = !isComplete;
  const showResetBtn = doneCount > 0;

  details.innerHTML = `
    <summary>
      <div class="day-header">
        <span class="day-arrow">◀</span>
        <div class="day-info">
          <div>${dayData.he}</div>
          <div class="day-meta">${dateLabel} • ${doneCount}/${dayData.count}</div>
        </div>
      </div>
      <div class="day-actions">
        <button class="day-action-btn check" data-action="complete" data-date="${date}" title="סמן הכל כהושלם" aria-label="סמן הכל כהושלם" style="display: ${showCheckBtn ? '' : 'none'}">✓</button>
        <button class="day-action-btn reset" data-action="reset" data-date="${date}" title="אפס יום" aria-label="אפס יום" style="display: ${showResetBtn ? '' : 'none'}">↺</button>
      </div>
    </summary>
    <div class="cards-container" data-date="${date}"></div>
  `;

  mainContent.appendChild(details);

  // Attach listeners
  details.addEventListener('toggle', handleDetailsToggle);
  details.querySelectorAll('.day-action-btn').forEach(btn => {
    btn.addEventListener('click', handleDayAction);
  });
}

// ============================================================================
// PWA Install Prompt
// ============================================================================
let deferredPrompt;

function showInstallButton() {
  const installHeaderBtn = document.getElementById('installHeaderBtn');
  if (installHeaderBtn) {
    installHeaderBtn.style.display = '';
  }
}

function hideInstallButton() {
  const installHeaderBtn = document.getElementById('installHeaderBtn');
  if (installHeaderBtn) {
    installHeaderBtn.style.display = 'none';
  }
}

async function triggerInstall() {
  if (!deferredPrompt) return;

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);

  if (outcome === 'accepted') {
    hideInstallButton();
  }

  // Clear the deferredPrompt
  deferredPrompt = null;
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Save the event so it can be triggered later
  deferredPrompt = e;

  // Show install button in header
  showInstallButton();

  // Show install prompt after user has interacted with the app
  // Don't show on first visit
  if (!isFirstVisit()) {
    const installPromptShown = localStorage.getItem('install_prompt_shown');
    if (!installPromptShown) {
      setTimeout(() => {
        document.getElementById('installPrompt').classList.add('show');
      }, 3000); // Show after 3 seconds
    }
  }
});

// Check if already installed
window.addEventListener('appinstalled', () => {
  hideInstallButton();
  deferredPrompt = null;
});

// ============================================================================
// Service Worker Registration
// ============================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);

        // Check for updates on load
        reg.update();

        // Listen for new service worker waiting to activate
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (confirm('גרסה חדשה של האפליקציה זמינה! האם לרענן את הדף?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(err => console.error('Service Worker registration failed:', err));

    // Reload page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// ============================================================================
// Changelog
// ============================================================================
function loadChangelog() {
  try {
    const container = document.getElementById('changelogContainer');
    if (!container) return;

    container.innerHTML = '';

    // Get version numbers and sort in descending order
    const versions = Object.keys(CHANGELOG).sort((a, b) => parseInt(b) - parseInt(a));

    versions.forEach(version => {
      const changes = CHANGELOG[version];
      if (!changes || changes.length === 0) return; // Skip empty versions

      const details = document.createElement('details');
      details.className = 'changelog-version';
      if (version === versions[0]) {
        details.open = true; // Auto-open latest version
      }

      const summary = document.createElement('summary');
      summary.innerHTML = `<span class="changelog-arrow">◀</span> גרסה ${version}`;

      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'changelog-items';

      changes.forEach(change => {
        const item = document.createElement('div');
        item.className = 'changelog-item';
        item.textContent = change;
        itemsDiv.appendChild(item);
      });

      details.appendChild(summary);
      details.appendChild(itemsDiv);
      container.appendChild(details);
    });
  } catch (error) {
    console.error('Failed to load changelog:', error);
  }
}

// ============================================================================
// App Initialization
// ============================================================================
async function init() {
  try {
    // Check if this is the first visit BEFORE any other operations
    const firstVisit = isFirstVisit();

    // If first visit, set the default start date
    if (firstVisit) {
      localStorage.setItem('rambam_start', CYCLE_START);
    }

    // Load days first for fast initial render
    await loadMissingDays();
    renderDays();
    renderStats();

    // Load changelog
    loadChangelog();

    // Fetch coords and sunset in background (non-blocking)
    getUserCoords().then(coords => {
      const now = new Date();
      const israelTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
      const israelTime = new Date(israelTimeStr);
      const year = israelTime.getFullYear();
      const month = String(israelTime.getMonth() + 1).padStart(2, '0');
      const day = String(israelTime.getDate()).padStart(2, '0');
      const rawDateStr = `${year}-${month}-${day}`;
      fetchSunset(rawDateStr, coords);
    });

    // Open settings on first visit
    if (firstVisit) {
      openSettings();
    } else {
      // Auto-open today's section if not completed (only if not first visit)
      const today = getTodayInIsrael();
      const days = getDays();
      const done = getDone();
      const todayData = days[today];

      if (todayData) {
        const todayDone = Object.keys(done).filter(key =>
          key.startsWith(`${today}:`)
        ).length;

        if (todayDone < todayData.count) {
          // Find and open today's details element
          const todayDetails = document.querySelector(`details[data-date="${today}"]`);
          if (todayDetails) {
            todayDetails.open = true;

            // Wait for cards to load, then scroll to first incomplete
            todayDetails.addEventListener('toggle', function scrollToIncomplete() {
              if (todayDetails.open) {
                setTimeout(() => {
                  const firstIncomplete = todayDetails.querySelector('.halakha-card:not(.completed)');
                  if (firstIncomplete) {
                    scrollToCard(firstIncomplete);
                  }
                }, 800); // Give more time for cards to render
              }
            }, { once: true });
          }
        }
      }
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    document.getElementById('mainContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">שגיאה</div>
        <div class="empty-state-text">לא ניתן לטעון את הנתונים. נסה שוב מאוחר יותר.</div>
      </div>
    `;
  }
}
