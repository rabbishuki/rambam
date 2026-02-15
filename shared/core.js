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

// Font size settings
function getLargeFontSize() {
  return getSetting('rambam_large_font', false);
}

function setLargeFontSize(enabled) {
  setSetting('rambam_large_font', enabled);
}

// Day transition settings
function getDayTransitionMode() {
  // 'time' or 'sunset'
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_day_transition_mode`);
  return stored || 'time';
}

async function setDayTransitionMode(mode) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_day_transition_mode`, mode);

  // If daily reminder is enabled, update IndexedDB settings
  if (getDailyReminderEnabled()) {
    const transitionTime = getDayTransitionTime();
    const [hour, minute] = transitionTime.split(':').map(Number);
    await saveTransitionSettingsToIDB(mode, hour, minute);
  }
}

function getDayTransitionTime() {
  // Default to 18:00
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_day_transition_time`);
  return stored || '18:00';
}

async function setDayTransitionTime(time) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_day_transition_time`, time);

  // If daily reminder is enabled, update IndexedDB settings
  if (getDailyReminderEnabled()) {
    const mode = getDayTransitionMode();
    const [hour, minute] = time.split(':').map(Number);
    await saveTransitionSettingsToIDB(mode, hour, minute);
  }
}

function isFirstVisit() {
  return !localStorage.getItem('rambam_start');
}

function getJewishToday() {
  // Get current time in user's local timezone
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Get transition time based on mode
  let transitionHour, transitionMinute;
  const mode = getDayTransitionMode();

  if (mode === 'sunset') {
    // Use cached sunset time from API (already in user's local timezone from fetchSunset)
    transitionHour = cachedSunsetHour;
    transitionMinute = cachedSunsetMinute;
  } else {
    // Use custom time from settings (in user's local timezone)
    const [h, m] = getDayTransitionTime().split(':').map(Number);
    transitionHour = h;
    transitionMinute = m;
  }

  // Jewish day starts at transition time
  const isPastTransition = (hour > transitionHour) ||
                           (hour === transitionHour && minute >= transitionMinute);

  let jewishDate = new Date(now);

  if (!isPastTransition) {
    // Before transition time - still in previous Jewish day
    // No adjustment needed, use current calendar date
  } else {
    // After transition time - advance to next Jewish day
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
// Reading Time Tracking
// ============================================================================

// Get current book being read (from active cards on screen)
function getCurrentBook() {
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_current_book`);
  return stored ? JSON.parse(stored) : null;
}

function saveCurrentBook(bookInfo) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_current_book`, JSON.stringify(bookInfo));
}

// Get book reading times (accumulated minutes per book)
function getBookTimes() {
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_book_times`);
  return stored ? JSON.parse(stored) : {};
}

function saveBookTimes(times) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_book_times`, JSON.stringify(times));
}

// Get active session info
function getActiveSession() {
  const stored = localStorage.getItem(`${window.PLAN.storagePrefix}_active_session`);
  return stored ? JSON.parse(stored) : null;
}

function saveActiveSession(session) {
  localStorage.setItem(`${window.PLAN.storagePrefix}_active_session`, JSON.stringify(session));
}

function clearActiveSession() {
  localStorage.removeItem(`${window.PLAN.storagePrefix}_active_session`);
}

// Start tracking time for a book
function startBookTimer(bookName) {
  const currentBook = getCurrentBook();

  // If switching books, save time for previous book
  if (currentBook && currentBook.name !== bookName) {
    saveCurrentBookTime();
  }

  // Set new current book and start session
  saveCurrentBook({ name: bookName, startTime: Date.now() });
  saveActiveSession({ startTime: Date.now(), lastActivity: Date.now() });
}

// Save accumulated time for current book
function saveCurrentBookTime() {
  const session = getActiveSession();
  const currentBook = getCurrentBook();

  if (!session || !currentBook) return;

  const now = Date.now();
  const elapsed = now - session.startTime;
  const minutes = Math.round(elapsed / 60000);

  if (minutes > 0) {
    const times = getBookTimes();
    times[currentBook.name] = (times[currentBook.name] || 0) + minutes;
    saveBookTimes(times);
  }

  // Clear session
  clearActiveSession();
}

// Update activity timestamp (call on scroll/interaction)
function updateActivity() {
  const session = getActiveSession();
  if (session) {
    session.lastActivity = Date.now();
    saveActiveSession(session);
  }
}

// Get total time for a book in minutes
function getBookTime(bookName) {
  const times = getBookTimes();
  return times[bookName] || 0;
}

// Format minutes as HH:MM time string
function formatLearningTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hoursStr = String(hours).padStart(2, '0');
  const minsStr = String(mins).padStart(2, '0');
  return `${hoursStr}:${minsStr}`;
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

function getHebrewDayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hebrewDays = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];
  return hebrewDays[dayOfWeek];
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

// ============================================================================
// Shabbat Learning Tracking
// ============================================================================
function getLastShabbatPrompt() {
  return localStorage.getItem('rambam_last_shabbat_prompt');
}

function setLastShabbatPrompt(dateStr) {
  localStorage.setItem('rambam_last_shabbat_prompt', dateStr);
}

function checkShabbatLearning() {
  const today = getJewishToday(); // This is the Jewish date (respects transition time)

  // Parse the date properly to avoid timezone issues
  const [year, month, day] = today.split('-').map(Number);
  const jewishDate = new Date(year, month - 1, day); // Use local date constructor
  const jewishDayOfWeek = jewishDate.getDay();

  console.log('Checking Shabbat learning:', {
    today,
    jewishDate: jewishDate.toString(),
    jewishDayOfWeek,
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][jewishDayOfWeek],
    isSunday: jewishDayOfWeek === 0
  });

  // Only check on Sunday (day after Shabbat)
  if (jewishDayOfWeek !== 0) return;

  // Get yesterday's date (which would be Shabbat)
  // Subtract 1 day from the Jewish today
  const shabbatDateObj = new Date(year, month - 1, day - 1);
  const shabbatYear = shabbatDateObj.getFullYear();
  const shabbatMonth = String(shabbatDateObj.getMonth() + 1).padStart(2, '0');
  const shabbatDay = String(shabbatDateObj.getDate()).padStart(2, '0');
  const shabbatDate = `${shabbatYear}-${shabbatMonth}-${shabbatDay}`;

  console.log('Calculated Shabbat date:', {
    shabbatDateObj: shabbatDateObj.toString(),
    shabbatDate,
    shabbatDayOfWeek: shabbatDateObj.getDay()
  });

  // Check if we already prompted for this Shabbat
  const lastPrompt = getLastShabbatPrompt();

  console.log('Shabbat check details:', {
    shabbatDate,
    lastPrompt,
    alreadyPrompted: lastPrompt === shabbatDate
  });

  if (lastPrompt === shabbatDate) {
    console.log('Already prompted for this Shabbat, skipping');
    return;
  }

  // Check if Shabbat day exists in our data
  const days = getDays();
  const shabbatData = days[shabbatDate];
  if (!shabbatData) {
    console.log('No data for this Shabbat date:', shabbatDate);
    return;
  }

  // Show the Shabbat learning prompt
  console.log('Showing Shabbat prompt for:', shabbatDate);
  showShabbatPrompt(shabbatDate, shabbatData);
}

// Test function - call from console: window.testShabbatPrompt()
window.testShabbatPrompt = function() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const shabbatDate = yesterday.toISOString().split('T')[0];

  const days = getDays();
  const shabbatData = days[shabbatDate];

  if (shabbatData) {
    showShabbatPrompt(shabbatDate, shabbatData);
  } else {
    console.error('No data for yesterday:', shabbatDate);
  }
};

function showShabbatPrompt(shabbatDate, shabbatData) {
  // Mark that we've shown the prompt for this Shabbat
  // Do this BEFORE showing to avoid double-prompts on reload
  setLastShabbatPrompt(shabbatDate);

  // Create a custom dialog for Shabbat prompt
  const dialog = document.createElement('dialog');
  dialog.className = 'notification-dialog shabbat-dialog';
  dialog.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">📖</div>
      <div class="notification-message">למדת בשבת מתוך הספר?</div>
      <div class="shabbat-actions">
        <button class="shabbat-btn shabbat-yes">כן</button>
        <button class="shabbat-btn shabbat-no">לא</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  dialog.showModal();

  // Handle Yes button - mark all items for Shabbat as complete
  dialog.querySelector('.shabbat-yes').addEventListener('click', () => {
    const done = getDone();
    for (let i = 0; i < shabbatData.count; i++) {
      const key = `${shabbatDate}:${i}`;
      if (!done[key]) {
        done[key] = new Date().toISOString();
      }
    }
    saveDone(done);
    dialog.close();
    dialog.remove();

    // Reload the UI to show the updated completion
    window.location.reload();
  });

  // Handle No button - just dismiss
  dialog.querySelector('.shabbat-no').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
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
  const today = getJewishToday();
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
  const today = getJewishToday();

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

  // Total chapters and halakhot completed
  let totalChapters = 0;
  let totalHalakhot = 0;
  Object.keys(days).forEach(date => {
    if (date <= today) {
      const dayData = days[date];
      const doneCount = Object.keys(done).filter(key =>
        key.startsWith(`${date}:`)
      ).length;

      // For completed days, count chapters (assuming 3 chapters per day for rambam3)
      if (doneCount >= dayData.count) {
        totalChapters += 3; // Adjust based on plan
      }

      totalHalakhot += doneCount;
    }
  });

  return { completedDays, totalChapters, totalHalakhot };
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
  const today = getJewishToday();
  const isToday = date === today;
  const dayOfWeek = getHebrewDayOfWeek(date);
  const dateLabel = formatHebrewDate(date);
  const displayLabel = isToday ? `${dayOfWeek} (היום)` : `${dayOfWeek} • ${dateLabel}`;
  dayMeta.textContent = `${displayLabel} • ${doneCount}/${dayData.count}`;

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
// Book Completion Celebration Page
// ============================================================================
function renderBookCelebration(bookName, totalBookChapters, totalBookHalakhot) {
  const mainContent = document.getElementById('mainContent');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  mainContent.classList.add('celebration-page');

  // Hide scroll banner during celebration
  const scrollBanner = document.getElementById('scrollBanner');
  if (scrollBanner) {
    scrollBanner.style.display = 'none';
  }

  // Prevent header from collapsing
  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader) {
    mainHeader.classList.remove('scrolled');
  }

  // Save any remaining time for current book, then get total
  saveCurrentBookTime();
  const totalMinutes = getBookTime(bookName);
  const formattedTime = formatLearningTime(totalMinutes);

  mainContent.innerHTML = `
      <div class="confetti-container" id="confetti"></div>
      <div class="rays"></div>

      <button class="celebration-close" onclick="window.exitCelebration()" title="חזור ללימוד">✕</button>

      <div class="celebration-content">

        <!-- Title -->
        <h2 class="celebration-title">🎉 מזל טוב! 🎉</h2>

        <!-- Subtitle -->
        <div class="celebration-subtitle">
          סיימת את הלכות
        </div>

        <div class="celebration-book-name">
          ${bookName}
        </div>

        <!-- Stats -->
        <div class="celebration-stats">
          <div class="celebration-stat">
            <span class="celebration-stat-value">${totalBookChapters}</span>
            <span class="celebration-stat-label">פרקים</span>
          </div>
          <div class="celebration-stat">
            <span class="celebration-stat-value">${totalBookHalakhot}</span>
            <span class="celebration-stat-label">הלכות</span>
          </div>
          <div class="celebration-stat">
            <span class="celebration-stat-value">${formattedTime}</span>
            <span class="celebration-stat-label">שעות לימוד</span>
          </div>
        </div>

        <!-- Rambam Quote -->
        <div class="celebration-quote">
          ״כל איש מישראל חייב בתלמוד תורה, בין עני בין עשיר, בין שלם בגופו בין בעל יסורין, בין בחור בין שהיה זקן גדול שתשש כחו...״
        </div>
        <div class="celebration-quote-source">רמב״ם, הלכות תלמוד תורה א׳ ח׳</div>

        <!-- Rebbe Line -->
        <div class="celebration-rebbe-line">הרבי ממש גאה בך!</div>

        <!-- CTA Buttons -->
        <div class="celebration-cta">
          <button class="celebration-btn celebration-btn-outline" onclick="window.celebrationShare('${bookName}', ${totalBookChapters}, ${totalBookHalakhot})">🎉 שתף את ההישג</button>
          <a href="https://yomi.org.il?affId=2bcbbdd2" target="_blank" rel="noopener noreferrer" class="celebration-btn celebration-btn-yomi">
            <img src="https://yomi.org.il/assets/icons/svg/yomi-logo-welcome.svg" alt="Yomi" class="yomi-logo">
            ללימוד חוויתי עם ביאורים
          </a>
        </div>

        <!-- Continue Message -->
        <div class="celebration-return-message">
          לחץ על ה-X כדי להמשיך ללמוד
        </div>
      </div>
  `;

  // Initialize confetti and animations
  setTimeout(() => initCelebrationEffects(bookName, totalBookChapters, totalBookHalakhot), 100);

  // Exit celebration mode
  window.exitCelebration = function() {
    mainContent.classList.remove('celebration-page');

    // Restore scroll banner
    const scrollBanner = document.getElementById('scrollBanner');
    if (scrollBanner) {
      scrollBanner.style.display = '';
    }

    renderDays();

    // After rendering, find and open the next incomplete day, then scroll to first incomplete card
    setTimeout(() => {
      // Find the first day with incomplete halakhot
      const days = getDays();
      const done = getDone();
      const today = getJewishToday();
      const start = getStart();
      const allDates = dateRange(start, today).reverse();

      for (const date of allDates) {
        const dayData = days[date];
        if (dayData) {
          const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
          if (doneCount < dayData.count) {
            // Found incomplete day, open it
            const details = document.querySelector(`details[data-date="${date}"]`);
            if (details && !details.open) {
              details.open = true;

              // Wait for content to load, then scroll to first incomplete
              setTimeout(() => {
                const firstIncomplete = details.querySelector('.halakha-card:not(.completed)');
                if (firstIncomplete) {
                  scrollToCard(firstIncomplete);
                }
              }, 500);
            } else if (details) {
              // Already open, just scroll
              const firstIncomplete = details.querySelector('.halakha-card:not(.completed)');
              if (firstIncomplete) {
                scrollToCard(firstIncomplete);
              }
            }
            break;
          }
        }
      }
    }, 100);
  };
}

function initCelebrationEffects() {
  const confettiColors = ['#ffc107','#ffe082','#ff6f00','#ffffff','#64b5f6','#e1f5fe','#ffd54f','#ffab00','#7c4dff','#ff4081'];
  const confettiShapes = ['■','●','▲','★','◆'];
  const container = document.getElementById('confetti');

  function burst(count, delayBase) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.textContent = confettiShapes[Math.floor(Math.random() * confettiShapes.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      el.style.fontSize = (6 + Math.random() * 12) + 'px';
      el.style.animationDuration = (2.5 + Math.random() * 3) + 's';
      el.style.animationDelay = (delayBase + Math.random() * 1.5) + 's';
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  // Three waves of confetti
  burst(50, 0.3);
  burst(35, 2);
  burst(25, 4.5);

  // Unified share function
  // Parameters:
  // - text: The full text to share (used as fallback if image fails)
  // - image: Optional Blob/File object for image sharing
  window.shareContent = async function(text, image = null) {
    const planId = window.PLAN?.id || 'rambam3';
    const shareUrl = `https://${planId}.pages.dev`;

    // Check if running as PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;

    // Try sharing with image first if provided
    if (image && navigator.canShare) {
      try {
        const file = new File([image], 'share.png', { type: 'image/png' });
        const files = [file];

        // Check if file sharing is supported
        if (navigator.canShare({ files })) {
          await navigator.share({
            files: files,
            text: shareUrl  // Just the link when sharing with image
          });
          return; // Success with image
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // User canceled, don't fall back
        }
        console.error('Image share failed:', err);
        // Continue to text fallback
      }
    }

    // Fallback to text-only sharing
    if (isInstalled && navigator.share) {
      // PWA: Use native share dialog
      try {
        await navigator.share({
          text: text
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          // Fallback to WhatsApp if share fails
          openWhatsAppShare(text);
        }
      }
    } else {
      // Website: Open WhatsApp
      openWhatsAppShare(text);
    }
  };

  function openWhatsAppShare(text) {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  }

  // Capture celebration screen as image
  // Uses the external screenshot.js file for simple text overlay on background image
  async function captureCelebrationScreenshot(chapterName, chapters, halachot, timelapse, days) {
    try {
      // Check if screenshot generator is loaded
      if (typeof window.generateCelebrationScreenshot !== 'function') {
        console.error('Screenshot generator not loaded');
        return null;
      }

      // Use the simple screenshot generator
      return await window.generateCelebrationScreenshot(chapterName, chapters, halachot, timelapse, days);
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      return null;
    }
  }

  // Global share function for book celebration with confetti
  window.celebrationShare = async function(bookName, totalChapters, totalHalakhot) {
    // Trigger confetti burst
    burst(60, 0);
    setTimeout(() => burst(40, 0), 1500);

    // Check if running as installed PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;

    // Build share URL
    const planId = window.PLAN?.id || 'rambam3';
    const shareUrl = `https://${planId}.pages.dev`;
    const shareText = `סיימתי את הלכות ${bookName} ברמב״ם! 🎉\n\n${totalChapters} פרקים של ${totalHalakhot} הלכות\n\n${shareUrl}`;

    // Capture screenshot
    try {
      // Get the time spent on this book
      const totalMinutes = getBookTime(bookName);
      const formattedTime = formatLearningTime(totalMinutes);

      // Get current streak (completed days)
      const stats = computeStats();
      const currentStreak = stats.completedDays;

      // captureCelebrationScreenshot expects: chapterName, chapters, halachot, timelapse, days
      const blob = await captureCelebrationScreenshot(bookName, totalChapters, totalHalakhot, formattedTime, currentStreak);

      if (!blob) {
        console.error('Failed to generate screenshot blob');
        return;
      }

      // If installed as PWA, use native share
      if (isInstalled && navigator.share && navigator.canShare) {
        const file = new File([blob], 'celebration.png', { type: 'image/png' });
        const shareData = {
          text: shareText,
          files: [file]
        };

        // Check if we can share files
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch (shareErr) {
            // User cancelled or share failed, fall through to clipboard
            if (shareErr.name !== 'AbortError') {
              console.error('Native share failed:', shareErr);
            }
          }
        }
      }

      // Fallback: Copy image and text to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
            'text/plain': new Blob([shareText], { type: 'text/plain' })
          })
        ]);
        window.showNotification('התמונה והטקסט הועתקו ללוח!\n\nעכשיו אפשר להדביק בוואטסאפ או ברשתות חברתיות', 'success');
      } catch (clipboardErr) {
        console.error('Failed to copy both to clipboard:', clipboardErr);
        // Try copying just the image
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          window.showNotification('התמונה הועתקה ללוח!\n\nעכשיו אפשר להדביק בוואטסאפ או ברשתות חברתיות', 'success');
        } catch (imageErr) {
          console.error('Failed to copy image to clipboard:', imageErr);
          // Silent fallback - don't show error to user
        }
      }
    } catch (err) {
      console.error('Failed to capture/copy screenshot:', err);
      // Silent fallback - don't show error to user
    }
  };
}

// ============================================================================
// Rendering
// ============================================================================
function renderDays() {
  const days = getDays();
  const done = getDone();
  const today = getJewishToday();
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
    details.dataset.he = dayData.he;

    const isToday = date === today;
    const dayOfWeek = getHebrewDayOfWeek(date);
    const dateLabel = formatHebrewDate(date);
    const displayLabel = isToday ? `${dayOfWeek} (היום)` : `${dayOfWeek} • ${dateLabel}`;

    // Determine button visibility
    const showCheckBtn = !isComplete;
    const showResetBtn = doneCount > 0;

    details.innerHTML = `
      <summary>
        <div class="day-header">
          <span class="day-arrow">◀</span>
          <div class="day-info">
            <div>${dayData.he}</div>
            <div class="day-meta">${displayLabel} • ${doneCount}/${dayData.count}</div>
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
  }
}

async function handleDetailsToggle(event) {
  const details = event.target;
  if (!details.open) return;

  const date = details.dataset.date;
  const ref = details.dataset.ref;
  const hebrewName = details.dataset.he; // Get Hebrew name
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
      const currentChapterNum = chapterNumbers[chapterIdx];

      // Check if this is the last chapter of a book
      const bookInfo = window.checkIfLastChapter && window.checkIfLastChapter(ref, currentChapterNum);

      // Add chapter divider only if there are multiple chapters
      if (showChapterDividers) {
        const divider = document.createElement('div');
        divider.className = 'chapter-divider';
        divider.innerHTML = `<span>פרק ${toHebrewLetter(currentChapterNum)}</span>`;
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
        const isLastHalakhaOfChapter = halakhaIdx === chapter.length - 1;
        // If bookInfo exists, this chapter IS the last of the book
        const isLastHalakhaOfBook = bookInfo && isLastHalakhaOfChapter;

        const card = document.createElement('div');
        card.className = 'halakha-card';
        if (isDone) {
          card.classList.add('completed');
        }
        card.dataset.date = date;
        card.dataset.index = globalIndex;

        // Mark if this is the last halakha of a book
        if (isLastHalakhaOfBook) {
          // Extract just the book name from Hebrew (e.g., "דעות" from "הלכות דעות ו׳-ז׳")
          card.dataset.bookName = window.extractHebrewBookName
            ? window.extractHebrewBookName(hebrewName)
            : hebrewName;
          card.dataset.bookChapters = bookInfo.totalChapters;

          // Calculate total halakhot and chars from all days belonging to this book
          const bookName = window.extractBookName ? window.extractBookName(ref) : null;
          let totalHalakhot = 0;
          let totalChars = 0;

          if (bookName) {
            const days = getDays();
            // Find all days that belong to this book and sum their halakhot counts
            Object.values(days).forEach(dayData => {
              if (dayData.ref) {
                const dayBookName = window.extractBookName ? window.extractBookName(dayData.ref) : null;
                if (dayBookName === bookName) {
                  totalHalakhot += dayData.count;
                }
              }
            });

            // Calculate average chars per halakha from loaded chapters
            let loadedChars = 0;
            let loadedHalakhot = 0;
            for (let i = 0; i <= chapterIdx; i++) {
              loadedHalakhot += chapters[i].length;
              chapters[i].forEach(text => {
                loadedChars += text.length;
              });
            }

            // Estimate total chars based on average
            if (loadedHalakhot > 0) {
              const avgCharsPerHalakha = loadedChars / loadedHalakhot;
              totalChars = Math.round(avgCharsPerHalakha * totalHalakhot);
            } else {
              totalChars = loadedChars; // Fallback
            }
          }

          card.dataset.bookHalakhot = totalHalakhot;
          card.dataset.bookChars = totalChars;
        }

        // Number within chapter (1, 2, 3...) - but skip if text already has numbering
        // (e.g., mitzvot already have their number in the title)
        const hasOwnNumbering = text.trim().startsWith('<b>');
        const hebrewNum = toHebrewLetter(halakhaIdx + 1);
        card.innerHTML = hasOwnNumbering
          ? `<div class="halakha-text">${text}</div>`
          : `<div class="halakha-text"><b>${hebrewNum}.</b> ${text}</div>`;

        attachSwipeHandler(card);
        container.appendChild(card);

        globalIndex++;
      });
    });

    // Start timer for this book
    const bookName = window.extractBookName ? window.extractBookName(ref) : null;
    if (bookName) {
      const hebrewBookName = window.extractHebrewBookName
        ? window.extractHebrewBookName(hebrewName)
        : hebrewName;
      startBookTimer(hebrewBookName);
    }
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
    // Scroll to top of card with offset for header + banner + spacing
    const yOffset = -190;
    const y = card.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({
      top: y,
      behavior: 'smooth'
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
    updateDayHeader(date);
    updateCompletedCounter(card);

    // Check if this is the last halakha of a book
    if (card.dataset.bookName) {
      const bookName = card.dataset.bookName;
      const bookChapters = parseInt(card.dataset.bookChapters);
      const bookHalakhot = parseInt(card.dataset.bookHalakhot);
      const bookChars = parseInt(card.dataset.bookChars);

      // Show book completion celebration
      setTimeout(() => {
        renderBookCelebration(bookName, bookChapters, bookHalakhot, bookChars);
      }, 500);
      return; // Don't scroll to next card, celebration will handle navigation
    }

    // Add completed class to day if all items are now complete
    const days = getDays();
    const dayData = days[date];
    let dayJustCompleted = false;
    if (dayData) {
      const done = getDone();
      const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
      if (doneCount >= dayData.count) {
        const dayGroup = card.closest('.day-group');
        if (dayGroup) {
          dayGroup.classList.add('completed');
        }
        dayJustCompleted = true;
      }
    }

    // Update scroll banner if it exists
    if (window.updateScrollBannerContent) {
      window.updateScrollBannerContent();
    }

    // Scroll to next card
    let nextCard = card.nextElementSibling;
    while (nextCard && !nextCard.classList.contains('halakha-card')) {
      nextCard = nextCard.nextElementSibling;
    }

    // If we just completed the day and there's no next card in this day, open next incomplete day
    if (dayJustCompleted && !nextCard) {
      const today = getJewishToday();
      const start = getStart();
      const allDates = dateRange(start, today).reverse();
      const done = getDone();

      // Find next incomplete day after current date
      let foundCurrent = false;
      for (const checkDate of allDates) {
        if (checkDate === date) {
          foundCurrent = true;
          continue;
        }

        if (foundCurrent) {
          const checkDayData = days[checkDate];
          if (checkDayData) {
            const checkDoneCount = Object.keys(done).filter(key => key.startsWith(`${checkDate}:`)).length;
            if (checkDoneCount < checkDayData.count) {
              // Found next incomplete day, open it
              const nextDayDetails = document.querySelector(`details[data-date="${checkDate}"]`);
              if (nextDayDetails && !nextDayDetails.open) {
                nextDayDetails.open = true;

                // Wait for content to load, then scroll to first incomplete
                setTimeout(() => {
                  const firstIncomplete = nextDayDetails.querySelector('.halakha-card:not(.completed)');
                  if (firstIncomplete) {
                    scrollToCard(firstIncomplete);
                  }
                }, 800);
              }
              break;
            }
          }
        }
      }
    } else {
      scrollToCard(nextCard);
    }
  }

  // Unmark card as done
  function unmarkCardDone() {
    const date = card.dataset.date;
    const index = parseInt(card.dataset.index);

    card.classList.remove('completed');
    const done = getDone();
    delete done[`${date}:${index}`];
    saveDone(done);
    updateDayHeader(date);
    updateCompletedCounter(card);

    // Remove completed class from day if it's no longer complete
    const days = getDays();
    const dayData = days[date];
    if (dayData) {
      const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
      if (doneCount < dayData.count) {
        const dayGroup = card.closest('.day-group');
        if (dayGroup) {
          dayGroup.classList.remove('completed');
        }
      }
    }

    // Update scroll banner if it exists
    if (window.updateScrollBannerContent) {
      window.updateScrollBannerContent();
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
  const today = getJewishToday();
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
  details.dataset.he = dayData.he;
  details.open = true; // Auto-open when viewing single day

  const isToday = date === today;
  const dayOfWeek = getHebrewDayOfWeek(date);
  const dateLabel = formatHebrewDate(date);
  const displayLabel = isToday ? `${dayOfWeek} (היום)` : `${dayOfWeek} • ${dateLabel}`;

  const showCheckBtn = !isComplete;
  const showResetBtn = doneCount > 0;

  details.innerHTML = `
    <summary>
      <div class="day-header">
        <span class="day-arrow">◀</span>
        <div class="day-info">
          <div>${dayData.he}</div>
          <div class="day-meta">${displayLabel} • ${doneCount}/${dayData.count}</div>
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
// Notifications
// ============================================================================
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker for better reliability
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      // Fallback to regular notification
      new Notification(title, options);
    }
  }
}

// Schedule daily study reminder
function scheduleDailyReminder() {
  const mode = getDayTransitionMode();
  let transitionHour, transitionMinute;

  if (mode === 'sunset') {
    transitionHour = cachedSunsetHour;
    transitionMinute = cachedSunsetMinute;
  } else {
    const [h, m] = getDayTransitionTime().split(':').map(Number);
    transitionHour = h;
    transitionMinute = m;
  }

  // Calculate time until next transition (using user's local time)
  const now = new Date();

  const nextTransition = new Date(now);
  nextTransition.setHours(transitionHour, transitionMinute, 0, 0);

  // If we've passed today's transition, schedule for tomorrow
  if (now >= nextTransition) {
    nextTransition.setDate(nextTransition.getDate() + 1);
  }

  const msUntilTransition = nextTransition - now;

  // Schedule notification
  setTimeout(() => {
    showNotification('יום חדש בלימוד!', {
      body: `הגיע הזמן ללימוד היומי של ${window.PLAN.name}`,
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      tag: 'daily-study',
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'פתח את האפליקציה' }
      ]
    });

    // Schedule next day's reminder
    scheduleDailyReminder();
  }, msUntilTransition);

  console.log(`Daily reminder scheduled for ${nextTransition.toLocaleString('he-IL')}`);
}

function getDailyReminderEnabled() {
  return getSetting(`${window.PLAN.storagePrefix}_daily_reminder`, false);
}

async function setDailyReminderEnabled(enabled) {
  setSetting(`${window.PLAN.storagePrefix}_daily_reminder`, enabled);

  // Register or unregister periodic background sync
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;

      if (enabled) {
        // Get user's configured transition settings
        const mode = getDayTransitionMode();
        const transitionTime = getDayTransitionTime(); // e.g., "18:00"
        const [hour, minute] = transitionTime.split(':').map(Number);

        // Store transition settings in IndexedDB so service worker can access them
        await saveTransitionSettingsToIDB(mode, hour, minute);

        // Register periodic sync for daily reminders
        const channel = new MessageChannel();
        const response = await new Promise((resolve) => {
          channel.port1.onmessage = (event) => resolve(event.data);
          registration.active.postMessage(
            {
              type: 'REGISTER_DAILY_SYNC',
              settings: { mode, hour, minute }
            },
            [channel.port2]
          );
        });

        if (response.success) {
          console.log('Daily reminder registered (background sync) for', transitionTime);
        } else {
          console.warn('Failed to register background sync:', response.error);
          // Fallback to setTimeout approach
          scheduleDailyReminder();
        }
      } else {
        // Unregister periodic sync
        const channel = new MessageChannel();
        registration.active.postMessage(
          { type: 'UNREGISTER_DAILY_SYNC' },
          [channel.port2]
        );
        console.log('Daily reminder unregistered');
      }
    } catch (error) {
      console.error('Periodic sync not supported, using fallback:', error);
      // Fallback to setTimeout approach
      if (enabled) {
        scheduleDailyReminder();
      }
    }
  } else {
    console.log('Periodic Background Sync not supported, using in-app notifications');
    // Fallback to setTimeout approach (only works while app is open)
    if (enabled) {
      scheduleDailyReminder();
    }
  }
}

// ============================================================================
// IndexedDB for Service Worker Settings
// ============================================================================

async function saveTransitionSettingsToIDB(mode, hour, minute) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RambamSettings', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      const settings = {
        key: 'dayTransition',
        mode: mode,
        hour: hour,
        minute: minute,
        planId: window.PLAN.id
      };

      store.put(settings);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
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
              // New version available - show notification
              showNotification('עדכון זמין', {
                body: 'גרסה חדשה של האפליקציה זמינה!',
                icon: './assets/icon-192.png',
                badge: './assets/icon-192.png',
                tag: 'app-update',
                requireInteraction: true,
                actions: [
                  { action: 'update', title: 'עדכן עכשיו' },
                  { action: 'dismiss', title: 'מאוחר יותר' }
                ]
              });

              // Also show confirm dialog as fallback
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

    // Apply initial settings classes
    const container = document.querySelector('.container');
    if (container) {
      if (getHideCompleted()) {
        container.classList.add('hide-completed');
      }
      if (getHideCompletedDays()) {
        container.classList.add('hide-completed-days');
      }
      if (getLargeFontSize()) {
        container.classList.add('large-font');
      }
    }

    // Load days first for fast initial render
    await loadMissingDays();
    renderDays();

    // Load changelog
    loadChangelog();

    // Register daily reminder if enabled (uses periodic sync if available, fallback to setTimeout)
    if (getDailyReminderEnabled()) {
      // Re-register to ensure sync is active (idempotent operation)
      await setDailyReminderEnabled(true);
    }

    // Check for Shabbat learning prompt (on Sunday mornings)
    if (!firstVisit) {
      checkShabbatLearning();
    }

    // Open settings on first visit
    if (firstVisit) {
      openSettings();
    } else {
      // Auto-open the first incomplete day (only if not first visit)
      const today = getJewishToday();
      const start = getStart();
      const allDates = dateRange(start, today).reverse(); // Today first
      const days = getDays();
      const done = getDone();

      // Find first incomplete day
      let firstIncompleteDay = null;
      for (const date of allDates) {
        const dayData = days[date];
        if (dayData) {
          const dayDone = Object.keys(done).filter(key =>
            key.startsWith(`${date}:`)
          ).length;

          if (dayDone < dayData.count) {
            firstIncompleteDay = date;
            break;
          }
        }
      }

      if (firstIncompleteDay) {
        // Find and open first incomplete day's details element
        const dayDetails = document.querySelector(`details[data-date="${firstIncompleteDay}"]`);
        if (dayDetails) {
          dayDetails.open = true;

          // Wait for cards to load, then scroll to first incomplete
          dayDetails.addEventListener('toggle', function scrollToIncomplete() {
            if (dayDetails.open) {
              setTimeout(() => {
                const firstIncomplete = dayDetails.querySelector('.halakha-card:not(.completed)');
                if (firstIncomplete) {
                  scrollToCard(firstIncomplete);
                }
              }, 800); // Give more time for cards to render
            }
          }, { once: true });
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

// ============================================================================
// Time Tracking - Auto-save
// ============================================================================

// Save reading time every minute
setInterval(() => {
  saveCurrentBookTime();

  // Restart timer if there's still a current book
  const currentBook = getCurrentBook();
  if (currentBook) {
    startBookTimer(currentBook.name);
  }
}, 60000); // Every 60 seconds

// Save time when page unloads
window.addEventListener('beforeunload', () => {
  saveCurrentBookTime();
});

// Save time when page becomes hidden (mobile app going to background)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveCurrentBookTime();
  } else {
    // Resume timer when coming back
    const currentBook = getCurrentBook();
    if (currentBook) {
      startBookTimer(currentBook.name);
    }
  }
});

// ============================================================================
// Testing & Debug Functions
// ============================================================================

// Test notification - call from console: window.testNotification()
window.testNotification = function() {
  console.log('Testing notification...');
  showNotification('בדיקת התראה', {
    body: 'זו הודעת בדיקה - אם אתה רואה אותה, ההתראות עובדות!',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    tag: 'test',
    requireInteraction: false
  });
};

// Check periodic sync status - call from console: window.checkPeriodicSync()
window.checkPeriodicSync = async function() {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service Worker not supported');
    return;
  }

  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.log('❌ Periodic Background Sync not supported in this browser');
    console.log('ℹ️  This feature only works in Chrome/Edge on desktop/Android');
    console.log('ℹ️  Falling back to in-app notifications (only work when app is open)');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const tags = await registration.periodicSync.getTags();

    console.log('✅ Periodic Background Sync is supported!');
    console.log('📋 Registered sync tags:', tags);

    // Show user's configured time
    const transitionTime = getDayTransitionTime();
    const mode = getDayTransitionMode();

    if (tags.includes('daily-study-check')) {
      console.log('✅ Daily study reminder is registered');
      console.log(`ℹ️  Mode: ${mode}`);
      console.log(`ℹ️  Notifications will be shown around ${transitionTime} local time daily`);
      console.log('ℹ️  (Actually shows during the hour containing your transition time)');
    } else {
      console.log('⚠️  Daily study reminder is NOT registered');
      console.log('ℹ️  Enable "תזכורת יומית" in settings to register');
    }

    // Check what's in IndexedDB
    console.log('\n📦 Checking IndexedDB settings...');
    const request = indexedDB.open('RambamSettings', 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        console.log('⚠️  No settings in IndexedDB yet');
        db.close();
        return;
      }
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get('dayTransition');
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          console.log('✅ IndexedDB settings:', data);
        } else {
          console.log('⚠️  No transition settings in IndexedDB');
        }
        db.close();
      };
    };
  } catch (error) {
    console.error('❌ Error checking periodic sync:', error);
  }
};
