// ============================================================================
// About Panel - Info screen for Rambam app
// ============================================================================

function initAboutPanel() {
  // Create info panel element
  const infoPanel = document.createElement('div');
  infoPanel.className = 'info-panel';
  infoPanel.id = 'infoPanel';

  infoPanel.innerHTML = `
    <div class="info-header">
      <h2>מידע על האתר</h2>
      <button class="close-btn" id="closeInfoBtn" aria-label="סגור">×</button>
    </div>
    <div class="info-content">
      <section class="info-section">
        <h3>למה בניתי את האפליקציה</h3>
        <p>
          בתחילת המחזור הנוכחי התחלתי ללמוד רמב״ם, אבל מהר מאוד הבנתי שקשה לי למצוא זמן מספיק בשביל ללמוד כמו שצריך מתוך ספר.
          אז חשבתי, מה אם אוכל לנצל את כל הרגעים הקטנים במהלך היום?
         </p>
        <p> בתור לקופה, בדרך לפגישה, בהפסקת קפה, כל רגע כזה הוא הזדמנות ללמוד כמה הלכות. </p>
        <p>
          וככה נולדה האפליקציה הזו: פותחים, קוראים, מחליקים ימינה כדי לסמן, וממשיכים הלאה. בלי להתעסק, בלי הרשמה, בלי שרת, ובלי לבזבז זמן. פשוט ללמוד.
        </p>
        <p>
        כמובן שאם יש לכם קצת יותר זמן ממני, ואתם רוצים גם ללמוד עם ביאורים אני ממליץ על האתר של 
        <a href="https://yomi.org.il?affId=2bcbbdd2" target="_blank" rel="noopener">
            <img src="https://yomi.org.il/assets/icons/svg/yomi-logo-welcome.svg" alt="Yomi" style="width: 25px; height: 18px">
           yomi.org.il
        </a>
        </p>
        <p>ולמי שבמסלול אחר יש גם אפליקציה המתאימה</p>
        <div class="flavor-links" id="otherFlavorsLinks">
          <!-- Links will be injected by JavaScript -->
        </div>
      </section>

      <section class="info-section">
        <h3>אודות לימוד הרמב״ם</h3>
        <p>
תקנת לימוד הרמב״ם היא יוזמה ללימוד יומי קבוע בספר משנה תורה לרמב״ם, שנוסדה על־ידי הרבי מליובאוויטש מלך המשיח שליט״א באחרון של פסח בשנת תשד״מ.
        </p>
        <p> 
מטרת התקנה היא לאחד את עם ישראל באמצעות לימוד משותף של חיבור הלכתי המקיף את כל התורה שבעל־פה, כולל הלכות שאינן נוהגות בפועל בימינו. 
        </p>
        <p>
לשם כך נקבעו שלושה מסלולי לימוד, המאפשרים לכל אחד להשתתף על־פי יכולתו: מסלול העיקרי של שלושה פרקים ביום, המאפשר סיום משנה תורה כולו בתוך שנה; מסלול של פרק אחד ביום, שבו מסיימים את הספר בשלוש שנים; ומסלול לימוד יומי בספר המצוות לרמב״ם, המקביל ללימוד ההלכות. 
        </p>
        <p>
לימוד זה מבטא את שלמות התורה ואת ההכנה הרוחנית לגאולה, שבה יתגלו ויתקיימו כל דיני התורה במלואם. האחדות הנוצרת סביב לימוד יומי זה מחזקת את האמונה, הציפייה וההכנה המעשית לגאולה האמיתית והשלמה.
        </p>
      </section>

      <section class="info-section">
        <h3>איך משתמשים באתר</h3>
        <div class="info-demo-row">
          <div class="info-demo-image">
            <img src="./assets/swipe.gif" alt="הדגמת החלקת הלכה" class="demo-gif">
          </div>
          <div class="info-demo-text">
            <h4>סימון הלכה כנקראה</h4>
            <p>
              כל הלכה באפליקציה היא כרטיס שאפשר להחליק עליו.
              החלקה ימינה מסמנת את ההלכה כנקראה ומעבירה אותה למצב "הושלם" (עם רקע אפור).
              החלקה שמאלה מבטלת את הסימון ומחזירה את ההלכה למצב הרגיל.
            </p>
          </div>
        </div>
        <div class="info-demo-row">
          <div class="info-demo-image">
            <img src="./assets/percent.gif" alt="הדגמת פס התקדמות" class="demo-gif">
          </div>
          <div class="info-demo-text">
            <h4>פס התקדמות חכם</h4>
            <p>
              כשאתה גולל למטה בעמוד, יופיע פס צהוב בראש המסך המציג את היום הנוכחי ואת אחוז ההתקדמות שלך בו.
              הפס כולל שני כפתורים: חץ למעלה לחזרה לראש העמוד, וחץ למטה שמקפיץ אותך להלכה הבאה שטרם קראת.
            </p>
          </div>
        </div>
      </section>

      <section class="info-section">
        <h3>הגדרות</h3>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>תאריך התחלה</h4>
            <div class="toggle-container" id="infoStartDateToggle">
              <button class="toggle-btn" id="infoSetCycleBtn">מחזור נוכחי</button>
              <button class="toggle-btn" id="infoStartDateCustomBtn">
                <input type="date" id="infoStartDateInput" class="date-input-inline">
              </button>
            </div>
          </div>
          <p class="info-setting-description">
            בחר מתי להתחיל את הלימוד: מתחילת המחזור (ט״ו בשבט תשפ״ו) או מתאריך מותאם אישית.
          </p>
        </div>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>עבור ליום הבא</h4>
            <div class="toggle-container" id="infoDayTransitionToggle">
              <button class="toggle-btn" id="infoDayTransitionTimeBtn">
                <input type="time" id="infoDayTransitionTime" class="time-input-inline">
              </button>
              <button class="toggle-btn" id="infoDayTransitionSunsetBtn">שקיעה</button>
            </div>
          </div>
          <p class="info-setting-description">
            בחר מתי היום החדש מתחיל: בשעה קבועה או לפי זמן השקיעה האמיתי במיקום שלך.
          </p>
        </div>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>סימון הלכות קודמות כנקראו</h4>
            <div class="toggle-container" id="infoAutoMarkToggle">
              <button class="toggle-btn" data-value="true">כן</button>
              <button class="toggle-btn" data-value="false">לא</button>
            </div>
          </div>
          <p class="info-setting-description">
            כשמסמנים הלכה, כל ההלכות הקודמות לה באותו היום מסומנות אוטומטית.
            אם כבוי, צריך לסמן כל הלכה בנפרד.
          </p>
        </div>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>הלכות שהושלמו</h4>
            <div class="toggle-container" id="infoHideCompletedToggle">
              <button class="toggle-btn" data-value="true">הסתר</button>
              <button class="toggle-btn" data-value="false">הצג</button>
            </div>
          </div>
          <p class="info-setting-description">
            הסתר הלכות שכבר סימנת כדי להתמקד במה שנשאר ללמוד.
            שומר על הממשק נקי וממוקד.
          </p>
        </div>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>ימים שהושלמו</h4>
            <div class="toggle-container" id="infoHideCompletedDaysToggle">
              <button class="toggle-btn" data-value="true">הסתר</button>
              <button class="toggle-btn" data-value="false">הצג</button>
            </div>
          </div>
          <p class="info-setting-description">
            הסתר ימים שלמים שסיימת לגמרי כדי לראות בבהירות מה עוד צריך להשלים.
          </p>
        </div>

        <div class="info-setting-row">
          <div class="info-setting-header">
            <h4>גודל גופן</h4>
            <div class="toggle-container" id="infoFontSizeToggle">
              <button class="toggle-btn" data-value="true">גדול</button>
              <button class="toggle-btn" data-value="false">קטן</button>
            </div>
          </div>
          <p class="info-setting-description">
            שנה את גודל הטקסט להתאים לנוחות הקריאה שלך.
          </p>
        </div>

        <div class="info-more-settings">
          להגדרות נוספות ולראות מה חדש, לחץ על <strong>⚙</strong> במסך הראשי.
        </div>
      </section>

      <section class="info-section">
        <h3>קישורים</h3>
        <div class="info-links">
          <a href="https://www.sefaria.org" target="_blank" rel="noopener" class="info-link">
            <img src="https://www.sefaria.org/static/icons/apple-touch-icon.png" alt="Sefaria" class="link-icon">
            <span>ספריא - מקור הטקסטים</span>
          </a>
          <a href="https://chat.whatsapp.com/KswOcHsdHlI7XOTOmqlzw1" target="_blank" rel="noopener" class="info-link">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" class="link-icon">
            <span>קבוצת WhatsApp לתמיכה ועדכונים</span>
          </a>
          <a href="https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם" target="_blank" rel="noopener" class="info-link">
              <img src="assets/rabbi.jpeg" alt="הרב שוקי" class="footer-avatar">
              <span>הודעה ישירה לרב שוקי</span>
              <svg class="whatsapp-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#25D366"/>
              </svg>
          </a>
          <a href="https://yomi.org.il?affId=2bcbbdd2" target="_blank" rel="noopener" class="info-link">
            <img src="https://yomi.org.il/assets/icons/svg/yomi-logo-welcome.svg" alt="Yomi" class="link-icon">
            <span>yomi.org.il - לימוד מעמיק</span>
          </a>
        </div>
      </section>
    </div>
    <div class="dedication">
       <div class="dedication-label">האתר לעילוי נשמת</div>
       <div class="dedication-names"><b>ישראל שאול</b> בן <b>משה אהרון</b> ו<b>מלכה</b> בת <b>נתן</b></div>
    </div>

    <div class="dedication yechi">
      יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד
    </div>
  `;

  // Append to body
  document.body.appendChild(infoPanel);

  // Attach event listeners
  document.getElementById('closeInfoBtn').addEventListener('click', closeInfo);

  // Initialize settings toggles
  initInfoSettingsToggles();

  // Populate other flavors links
  populateOtherFlavors();
}

// Populate links to other app flavors
function populateOtherFlavors() {
  const container = document.getElementById('otherFlavorsLinks');
  if (!container) return;

  // Define all app flavors
  const flavors = [
    {
      url: 'https://rambam3.pages.dev',
      name: '3 פרקים',
      key: 'rambam3'
    },
    {
      url: 'https://rambam1.pages.dev',
      name: 'פרק אחד',
      key: 'rambam1'
    },
    {
      url: 'https://sefer-mitzvot.pages.dev',
      name: 'ספר המצוות',
      key: 'mitzvot'
    }
  ];

  // Detect current app based on hostname
  const currentHost = window.location.hostname;

  // Filter out current app
  const otherFlavors = flavors.filter(f => !currentHost || currentHost.includes(f.key));

  // Generate HTML as inline badges
  container.style.display = 'flex';
  container.style.gap = '0.5rem';
  container.style.flexWrap = 'wrap';

  otherFlavors.forEach(flavor => {
    const link = document.createElement('a');
    link.href = flavor.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      background: white;
      border: 2px solid #6366f1;
      border-radius: 8px;
      color: #6366f1;
      font-weight: 600;
      text-size: 0.85rem
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    // Add external link icon (SVG)
    link.innerHTML = `
      ${flavor.name}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: -2px;">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    `;

    // Add hover effect
    link.addEventListener('mouseenter', () => {
      link.style.background = '#6366f1';
      link.style.color = 'white';
      link.style.transform = 'translateY(-1px)';
      link.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.3)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = 'white';
      link.style.color = '#6366f1';
      link.style.transform = 'translateY(0)';
      link.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    });

    container.appendChild(link);
  });
}

// Initialize settings toggles in info panel
function initInfoSettingsToggles() {
  // Start Date
  initStartDateSetting();

  // Day Transition
  initDayTransitionSetting();

  // Daily Reminder
  initToggle('infoReminderToggle', getDailyReminderEnabled, async (value) => {
    if (value) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        setDailyReminderEnabled(true);
        scheduleDailyReminder();
      } else {
        window.showNotification('יש לאפשר התראות בדפדפן כדי לקבל תזכורות יומיות');
        setDailyReminderEnabled(false);
        updateToggleUI('infoReminderToggle', false);
      }
    } else {
      setDailyReminderEnabled(false);
    }
  });

  // Auto Mark
  initToggle('infoAutoMarkToggle', getAutoMark, setAutoMark);

  // Hide Completed Items
  initToggle('infoHideCompletedToggle', getHideCompleted, (value) => {
    setHideCompleted(value);
    const container = document.querySelector('.container');
    if (container) {
      container.classList.toggle('hide-completed', value);
    }
  });

  // Hide Completed Days
  initToggle('infoHideCompletedDaysToggle', getHideCompletedDays, (value) => {
    setHideCompletedDays(value);
    const container = document.querySelector('.container');
    if (container) {
      container.classList.toggle('hide-completed-days', value);
    }
  });

  // Font Size
  initToggle('infoFontSizeToggle', getLargeFontSize, (value) => {
    setLargeFontSize(value);
    const container = document.querySelector('.container');
    if (container) {
      container.classList.toggle('large-font', value);
    }
  });
}

// Helper function to initialize a toggle
function initToggle(containerId, getter, setter) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const buttons = container.querySelectorAll('.toggle-btn');
  const currentValue = getter();

  // Set initial state
  updateToggleUI(containerId, currentValue);

  // Attach click listeners
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const newValue = btn.dataset.value === 'true';
      await setter(newValue);
      updateToggleUI(containerId, newValue);
    });
  });
}

// Helper function to update toggle UI
function updateToggleUI(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const buttons = container.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    const btnValue = btn.dataset.value === 'true';
    btn.classList.toggle('active', btnValue === value);
  });
}

// Initialize start date setting
function initStartDateSetting() {
  const startDateInput = document.getElementById('infoStartDateInput');
  const startDateCustomBtn = document.getElementById('infoStartDateCustomBtn');
  const setCycleBtn = document.getElementById('infoSetCycleBtn');

  if (!startDateInput || !startDateCustomBtn || !setCycleBtn) return;

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
}

// Initialize day transition setting
function initDayTransitionSetting() {
  const dayTransitionTime = document.getElementById('infoDayTransitionTime');
  const dayTransitionTimeBtn = document.getElementById('infoDayTransitionTimeBtn');
  const dayTransitionSunsetBtn = document.getElementById('infoDayTransitionSunsetBtn');

  if (!dayTransitionTime || !dayTransitionTimeBtn || !dayTransitionSunsetBtn) return;

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

// Open info panel
function openInfo() {
  // Close settings if open
  if (typeof closeSettings === 'function') {
    closeSettings();
  }

  document.getElementById('infoPanel').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.classList.add('no-scroll');
}

// Close info panel
function closeInfo() {
  document.getElementById('infoPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
  document.body.classList.remove('no-scroll');
}

// Make functions globally accessible
window.initAboutPanel = initAboutPanel;
window.openInfo = openInfo;
window.closeInfo = closeInfo;
