// ============================================================================
// Shell - Injects shared HTML structure
// ============================================================================

// ============================================================================
// Toggle Settings Configuration
// ============================================================================
const TOGGLE_SETTINGS = [
  {
    id: 'daily-reminder',
    label: 'תזכורת יומית',
    trueLabel: 'פעיל',
    falseLabel: 'כבוי',
    getter: getDailyReminderEnabled,
    setter: setDailyReminderEnabled,
    sideEffect: async (newValue) => {
      if (newValue) {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          scheduleDailyReminder();
        } else {
          alert('יש לאפשר התראות בדפדפן כדי לקבל תזכורות יומיות');
          // Revert the setting if permission denied
          setDailyReminderEnabled(false);
          // Update UI
          const buttons = document.querySelectorAll(`[data-setting-id="daily-reminder"]`);
          buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === 'false');
          });
        }
      }
    }
  },
  {
    id: 'auto-mark',
    label: 'סימון הלכות קודמות כנקראו',
    trueLabel: 'כן',
    falseLabel: 'לא',
    getter: getAutoMark,
    setter: setAutoMark
  },
  {
    id: 'hide-completed-items',
    label: 'הלכות שהושלמו',
    trueLabel: 'הסתר',
    falseLabel: 'הצג',
    getter: getHideCompleted,
    setter: setHideCompleted,
    sideEffect: (newValue) => {
      const container = document.querySelector('.container');
      if (container) {
        if (newValue) {
          container.classList.add('hide-completed');
        } else {
          container.classList.remove('hide-completed');
        }
      }
    }
  },
  {
    id: 'hide-completed-days',
    label: 'ימים שהושלמו',
    trueLabel: 'הסתר',
    falseLabel: 'הצג',
    getter: getHideCompletedDays,
    setter: setHideCompletedDays,
    sideEffect: (newValue) => {
      const container = document.querySelector('.container');
      if (container) {
        if (newValue) {
          container.classList.add('hide-completed-days');
        } else {
          container.classList.remove('hide-completed-days');
        }
      }
    }
  }
];

// Generate toggle settings HTML
function generateToggleSettings() {
  return TOGGLE_SETTINGS.map(setting => `
    <div class="settings-section toggle">
      <label class="settings-label">${setting.label}</label>
      <div class="toggle-container">
        <button class="toggle-btn" data-setting-id="${setting.id}" data-value="true">${setting.trueLabel}</button>
        <button class="toggle-btn" data-setting-id="${setting.id}" data-value="false">${setting.falseLabel}</button>
      </div>
    </div>
  `).join('');
}

// Generic toggle settings event listeners
function attachToggleListeners() {
  TOGGLE_SETTINGS.forEach(setting => {
    const currentValue = setting.getter();
    const buttons = document.querySelectorAll(`[data-setting-id="${setting.id}"]`);

    // Set initial active state
    buttons.forEach(btn => {
      const btnValue = btn.dataset.value === 'true';
      if (btnValue === currentValue) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Attach click listeners
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newValue = btn.dataset.value === 'true';

        // Update storage
        setting.setter(newValue);

        // Update UI state
        buttons.forEach(b => {
          b.classList.toggle('active', b.dataset.value === btn.dataset.value);
        });

        // Execute side effect if defined
        if (setting.sideEffect) {
          setting.sideEffect(newValue);
        }
      });
    });
  });

  // Apply initial side effects
  TOGGLE_SETTINGS.forEach(setting => {
    if (setting.sideEffect) {
      setting.sideEffect(setting.getter());
    }
  });
}

function initShell() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  const planName = window.PLAN?.name || 'רמב"ם יומי';
  const cycleNumber = window.PLAN?.cycleNumber;
  const cycleText = cycleNumber ? `מחזור ${cycleNumber}` : 'תחילת המחזור';

  app.innerHTML = `
    <header id="mainHeader">
      <div class="header-content">
        <img src="./assets/logo.png" alt="Logo" class="logo">
        <h1>${planName}</h1>
      </div>
      <input type="date" id="headerDatePicker" class="header-date-picker">
      <div class="header-actions">
        <button class="header-btn" id="installHeaderBtn" style="display: none;" aria-label="התקן אפליקציה">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="header-btn" id="calendarBtn" aria-label="בחר תאריך">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
        <button class="header-btn" id="settingsBtn" aria-label="הגדרות">⚙</button>
      </div>
    </header>

    <div id="scrollBanner" class="scroll-banner">
      <div class="scroll-banner-content">
        <div class="scroll-banner-actions">
          <button class="scroll-banner-btn" id="scrollToTop" aria-label="חזור למעלה" title="חזור למעלה">↑</button>
          <button class="scroll-banner-btn" id="scrollToNext" aria-label="קפוץ להלכה הבאה" title="קפוץ להלכה הבאה">↓</button>
        </div>
        <div class="scroll-banner-text">
          <div class="scroll-banner-title" id="scrollBannerTitle">טוען...</div>
          <div class="scroll-banner-meta">
            <span id="scrollBannerDate"></span>
            <span id="scrollBannerProgress">0/0</span>
          </div>
        </div>
      </div>
      <div class="scroll-banner-bar" id="scrollBannerBar"></div>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-value" id="completedDaysValue">0/0</span>
        <div class="stat-label">ימים שלמדתי</div>
      </div>
      <div class="stat">
        <span class="stat-value" id="todayValue">0%</span>
        <div class="stat-label">היום</div>
      </div>
      <div class="stat">
        <span class="stat-value" id="backlogValue">0</span>
        <div class="stat-label">הלכות להשלים</div>
      </div>
    </div>

    <main id="mainContent"></main>

    <div class="dedication">
      הלימוד לעילוי נשמת <b>ישראל שאול</b> בן <b>משה אהרון</b> ו<b>מלכה</b> בת <b>נתן</b>
    </div>

    <div class="dedication yechi">
      יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד
    </div>
  `;

  // Add overlay
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'overlay';
  document.body.appendChild(overlay);

  // Add install prompt
  const installPrompt = document.createElement('div');
  installPrompt.className = 'install-prompt';
  installPrompt.id = 'installPrompt';
  installPrompt.innerHTML = `
    <div class="install-prompt-content">
      <div class="install-prompt-text">
        💡 התקן את האפליקציה למסך הבית לגישה מהירה ושימוש ללא אינטרנט!
      </div>
      <div class="install-prompt-buttons">
        <button class="install-prompt-btn primary" id="installBtn">התקן</button>
        <button class="install-prompt-btn secondary" id="dismissInstallBtn">אולי מאוחר יותר</button>
      </div>
    </div>
  `;
  document.body.appendChild(installPrompt);

  // Add settings panel
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'settings-panel';
  settingsPanel.id = 'settingsPanel';
  settingsPanel.innerHTML = `
    <div class="settings-header">
      <h2>הגדרות</h2>
      <button class="close-btn" id="closeBtn" aria-label="סגור">×</button>
    </div>
    <div class="settings-content">
      <div class="settings-scrollable">
        <div class="settings-section toggle">
          <label class="settings-label">תאריך התחלה</label>
          <div class="toggle-container">
            <button class="toggle-btn" id="setCycleBtn">${cycleText}</button>
            <button class="toggle-btn" id="startDateCustomBtn">
              <input type="date" id="startDateInput" class="date-input-inline">
            </button>
          </div>
        </div>

        <div class="settings-section toggle">
          <label class="settings-label">עבור ליום הבא</label>
          <div class="toggle-container">
            <button class="toggle-btn" id="dayTransitionTimeBtn">
              <input type="time" id="dayTransitionTime" class="time-input-inline">
            </button>
            <button class="toggle-btn" id="dayTransitionSunsetBtn">שקיעה</button>
          </div>
        </div>
        
        ${generateToggleSettings()}

        <div class="settings-section toggle">
          <label class="settings-label">איפוס</label>
          <div class="date-row">
            <button class="btn btn-warning" id="refreshDataBtn">שמור התקדמות</button>
            <button class="btn btn-danger" id="resetBtn">מחק התקדמות</button>
          </div>
        </div>

        <div class="settings-section">
          <label class="settings-label">רשימת שינויים</label>
          <div id="changelogContainer"></div>
        </div>
      </div>

      <footer class="footer">
        <div class="footer-content">
          <div class="footer-badge">
            <img src="./assets/claude.jpeg" alt="Claude" class="claude-icon">
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Claude Code</span>
          </div>
          <span>בנה,</span>
          <a href="https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם" class="footer-link" target="_blank" rel="noopener" aria-label="שלח הודעה בוואטסאפ">
            <div class="footer-badge">
              <img src="./assets/rabbi.jpeg" alt="הרב שוקי" class="footer-avatar">
              <span>הרב שוקי</span>
              <svg class="whatsapp-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#25D366"/>
              </svg>
            </div>
          </a>
          <span>הגה והכווין.</span>
        </div>
      </footer>
    </div>
  `;
  document.body.appendChild(settingsPanel);

  // Attach event listeners
  attachSettingsListeners();
  attachCalendarListeners();
  attachInstallListeners();
  initScrollBanner();
}

// ============================================================================
// Settings Event Listeners
// ============================================================================
function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

function attachSettingsListeners() {
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeBtn').addEventListener('click', closeSettings);
  document.getElementById('overlay').addEventListener('click', closeSettings);

  // Toggle settings
  attachToggleListeners();

  // Refresh data button
  document.getElementById('refreshDataBtn').addEventListener('click', () => {
    if (confirm('האם לרענן את הנתונים? ההתקדמות שלך תישמר.')) {
      localStorage.removeItem(`${window.PLAN.storagePrefix}_days`);
      // Reset day transition settings to defaults
      localStorage.removeItem(`${window.PLAN.storagePrefix}_day_transition_mode`);
      localStorage.removeItem(`${window.PLAN.storagePrefix}_day_transition_time`);
      location.reload();
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('האם אתה בטוח? כל ההתקדמות תימחק.')) {
      // Only remove plan-specific data, not shared settings or other apps
      localStorage.removeItem(`${window.PLAN.storagePrefix}_days`);
      localStorage.removeItem(`${window.PLAN.storagePrefix}_done`);
      location.reload();
    }
  });

  // Start date settings
  const startDateInput = document.getElementById('startDateInput');
  const startDateCustomBtn = document.getElementById('startDateCustomBtn');
  const setCycleBtn = document.getElementById('setCycleBtn');

  function updateStartDateUI() {
    const currentStart = getStart();
    const isCycleDate = currentStart === CYCLE_START;

    startDateInput.value = currentStart;

    if (isCycleDate) {
      startDateCustomBtn.classList.remove('active');
      setCycleBtn.classList.add('active');
    } else {
      startDateCustomBtn.classList.add('active');
      setCycleBtn.classList.remove('active');
    }
  }

  updateStartDateUI();

  // Custom date button click - activate custom mode
  startDateCustomBtn.addEventListener('click', () => {
    // Just focus the date input when clicking the button
    startDateInput.focus();
  });

  // Date input change
  startDateInput.addEventListener('change', (e) => {
    const newStart = e.target.value;
    if (confirm(`האם לשנות את תאריך ההתחלה ל-${newStart}? זה עלול לאפס את ההתקדמות.`)) {
      setStart(newStart);
      location.reload();
    } else {
      e.target.value = getStart();
    }
  });

  // Cycle button click
  setCycleBtn.addEventListener('click', () => {
    if (confirm('האם לקבוע את תאריך ההתחלה לט״ו שבט ה׳תשפ״ו (3 בפברואר 2026)?')) {
      setStart(CYCLE_START);
      location.reload();
    }
  });

  // Day transition settings
  const dayTransitionTime = document.getElementById('dayTransitionTime');
  const dayTransitionTimeBtn = document.getElementById('dayTransitionTimeBtn');
  const dayTransitionSunsetBtn = document.getElementById('dayTransitionSunsetBtn');

  // Initialize day transition UI
  function updateDayTransitionUI() {
    const mode = getDayTransitionMode();
    dayTransitionTime.value = getDayTransitionTime();

    if (mode === 'time') {
      dayTransitionTimeBtn.classList.add('active');
      dayTransitionSunsetBtn.classList.remove('active');
    } else {
      dayTransitionTimeBtn.classList.remove('active');
      dayTransitionSunsetBtn.classList.add('active');
    }
  }

  updateDayTransitionUI();

  // Time button click - activate time mode
  dayTransitionTimeBtn.addEventListener('click', () => {
    setDayTransitionMode('time');
    updateDayTransitionUI();
    // Focus the time input
    dayTransitionTime.focus();
  });

  // Time input change
  dayTransitionTime.addEventListener('change', (e) => {
    const newTime = e.target.value;
    setDayTransitionTime(newTime);
    setDayTransitionMode('time');
    updateDayTransitionUI();
  });

  // Sunset button click - fetch location and sunset
  dayTransitionSunsetBtn.addEventListener('click', async () => {
    const btn = dayTransitionSunsetBtn;
    const originalText = btn.textContent;
    btn.textContent = 'מעדכן...';
    btn.disabled = true;

    try {
      const coords = await getUserCoords();
      const now = new Date();
      const israelTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
      const israelTime = new Date(israelTimeStr);
      const year = israelTime.getFullYear();
      const month = String(israelTime.getMonth() + 1).padStart(2, '0');
      const day = String(israelTime.getDate()).padStart(2, '0');
      const rawDateStr = `${year}-${month}-${day}`;
      await fetchSunset(rawDateStr, coords);

      // Get the updated sunset time from cachedSunsetHour/Minute (set by fetchSunset)
      const hourStr = String(cachedSunsetHour).padStart(2, '0');
      const minStr = String(cachedSunsetMinute).padStart(2, '0');
      const sunsetTime = `${hourStr}:${minStr}`;

      // Save sunset time to localStorage
      setDayTransitionTime(sunsetTime);
      setDayTransitionMode('sunset');

      // Update UI
      dayTransitionTime.value = sunsetTime;
      updateDayTransitionUI();

      btn.textContent = '✓ עודכן';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to fetch sunset:', error);

      // Revert to time mode on any error
      setDayTransitionMode('time');
      updateDayTransitionUI();

      btn.textContent = '✗';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    }
  });
}

// ============================================================================
// Calendar Event Listeners
// ============================================================================
function attachCalendarListeners() {
  const calendarBtn = document.getElementById('calendarBtn');
  const headerDatePicker = document.getElementById('headerDatePicker');
  const mainHeader = document.getElementById('mainHeader');

  calendarBtn.addEventListener('click', () => {
    if (viewingDate) {
      // Already viewing a specific date, return to normal mode
      viewingDate = null;
      renderDays();
      mainHeader.classList.remove('viewing-other-date');
    } else {
      // Open date picker
      headerDatePicker.showPicker();
    }
  });

  headerDatePicker.addEventListener('change', async (e) => {
    const selectedDate = e.target.value;
    viewingDate = selectedDate;

    const today = getJewishToday();
    if (selectedDate !== today) {
      mainHeader.classList.add('viewing-other-date');
    } else {
      mainHeader.classList.remove('viewing-other-date');
    }

    await renderSingleDay(selectedDate);
  });
}

// ============================================================================
// Install Event Listeners
// ============================================================================
function attachInstallListeners() {
  // Header install button
  document.getElementById('installHeaderBtn').addEventListener('click', triggerInstall);

  // Prompt install button
  document.getElementById('installBtn').addEventListener('click', async () => {
    await triggerInstall();
    // Hide the prompt
    document.getElementById('installPrompt').classList.remove('show');
    localStorage.setItem('install_prompt_shown', 'true');
  });

  document.getElementById('dismissInstallBtn').addEventListener('click', () => {
    document.getElementById('installPrompt').classList.remove('show');
    localStorage.setItem('install_prompt_shown', 'true');
  });
}

// ============================================================================
// Scroll Banner - Shows current day when scrolling
// ============================================================================
function initScrollBanner() {
  const scrollBanner = document.getElementById('scrollBanner');
  const scrollBannerTitle = document.getElementById('scrollBannerTitle');
  const scrollBannerDate = document.getElementById('scrollBannerDate');
  const scrollBannerProgress = document.getElementById('scrollBannerProgress');
  const scrollBannerBar = document.getElementById('scrollBannerBar');

  let ticking = false;
  let currentDisplayedDate = null;

  function updateBannerContent() {
    // Find the current day in viewport
    const dayGroups = document.querySelectorAll('.day-group[open]');
    let currentDay = null;

    for (const dayGroup of dayGroups) {
      const rect = dayGroup.getBoundingClientRect();
      // Check if day is visible in viewport (accounting for header + banner)
      if (rect.top < 200 && rect.bottom > 150) {
        currentDay = dayGroup;
        break;
      }
    }

    if (currentDay) {
      const date = currentDay.dataset.date;
      currentDisplayedDate = date;
      const days = getDays();
      const done = getDone();
      const dayData = days[date];

      if (dayData) {
        const today = getJewishToday();
        const isToday = date === today;
        const dateLabel = isToday ? 'היום' : formatHebrewDate(date);

        scrollBannerTitle.textContent = dayData.he;
        scrollBannerDate.textContent = dateLabel;
        const doneCount = Object.keys(done).filter(key => key.startsWith(`${date}:`)).length;
        scrollBannerProgress.textContent = `${doneCount}/${dayData.count}`;

        // Update progress bar
        const percentage = dayData.count > 0 ? (doneCount / dayData.count) * 100 : 0;
        scrollBannerBar.style.width = `${percentage}%`;
      }
    }
  }

  function updateScrollBanner() {
    const scrollY = window.scrollY;

    // Show banner after scrolling 50px
    if (scrollY > 50) {
      scrollBanner.classList.add('visible');
      updateBannerContent();
    } else {
      scrollBanner.classList.remove('visible');
    }

    ticking = false;
  }

  // Expose updateBannerContent globally so it can be called when marking halakhot
  window.updateScrollBannerContent = updateBannerContent;

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateScrollBanner);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });

  // Scroll to top button
  document.getElementById('scrollToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Scroll to next incomplete halakha button (in banner)
  document.getElementById('scrollToNext').addEventListener('click', () => {
    const done = getDone();
    const allCards = document.querySelectorAll('.halakha-card');

    for (const card of allCards) {
      const date = card.dataset.date;
      const index = parseInt(card.dataset.index);
      const key = `${date}:${index}`;

      if (!done[key]) {
        // Found first incomplete card, scroll to it using scrollToCard function
        scrollToCard(card);
        return;
      }
    }
  });
}
