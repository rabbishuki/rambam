// ============================================================================
// Shell - Injects shared HTML structure
// ============================================================================

// ============================================================================
// Toggle Settings Configuration
// ============================================================================
function getToggleSettings() {
  return [
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
        if (!hasPermission) {
          window.showNotification('יש לאפשר התראות בדפדפן כדי לקבל תזכורות יומיות');
          // Revert the setting if permission denied
          await setDailyReminderEnabled(false);
          // Update UI
          const buttons = document.querySelectorAll(`[data-setting-id="daily-reminder"]`);
          buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === 'false');
          });
        }
        // If permission granted, setDailyReminderEnabled already registered the sync
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
  },
  {
    id: 'font-size',
    label: 'גודל גופן',
    trueLabel: 'גדול',
    falseLabel: 'קטן',
    getter: getLargeFontSize,
    setter: setLargeFontSize,
    sideEffect: (newValue) => {
      const container = document.querySelector('.container');
      if (container) {
        if (newValue) {
          container.classList.add('large-font');
        } else {
          container.classList.remove('large-font');
        }
      }
    }
  },
  {
    id: 'dark-mode',
    label: 'מצב כהה',
    trueLabel: 'כן',
    falseLabel: 'לא',
    getter: getDarkMode,
    setter: setDarkMode,
    sideEffect: (newValue) => {
      if (newValue) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }
  ];
}

// Generate toggle settings HTML
function generateToggleSettings() {
  return getToggleSettings().map(setting => `
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
  getToggleSettings().forEach(setting => {
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
  getToggleSettings().forEach(setting => {
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
        <img src="./assets/logo.svg" alt="Logo" class="logo">
        <h1>${planName}</h1>
      </div>
      <input type="date" id="headerDatePicker" class="header-date-picker">
      <div class="header-actions">
        <button class="header-btn" id="shareBtn" style="display: none;" aria-label="שתף אפליקציה">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
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
        <button class="header-btn" id="infoBtn" aria-label="מידע">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
        <button class="header-btn" id="settingsBtn" aria-label="הגדרות">⚙</button>
      </div>
    </header>

    <div id="scrollBanner" class="scroll-banner">
      <div class="scroll-banner-content">
        <div class="scroll-banner-actions">
          <button class="scroll-banner-btn up" id="scrollToTop" aria-label="חזור למעלה" title="חזור למעלה">➩</button>
          <button class="scroll-banner-btn down" id="scrollToNext" aria-label="קפוץ להלכה הבאה" title="קפוץ להלכה הבאה">➩</button>
        </div>
        <div class="scroll-banner-text">
          <div class="scroll-banner-title" id="scrollBannerTitle">טוען...</div>
          <div class="scroll-banner-meta">
            <span id="scrollBannerDate"></span>
            <span id="scrollBannerProgress">0/0</span>
          </div>
        </div>
        <div class="scroll-banner-percentage" id="scrollBannerPercentage">0%</div>
      </div>
      <div class="scroll-banner-bar" id="scrollBannerBar"></div>
    </div>

    <main id="mainContent"></main>

    <div class="dedication">
       <div class="dedication-label">הלימוד לעילוי נשמת</div>
       <div class="dedication-names"><b>ישראל שאול</b> בן <b>משה אהרון</b> ו<b>מלכה</b> בת <b>נתן</b></div>
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

  // Add notification dialog
  const notificationDialog = document.createElement('dialog');
  notificationDialog.id = 'notificationDialog';
  notificationDialog.className = 'notification-dialog';
  notificationDialog.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon"></div>
      <div class="notification-message"></div>
      <button class="notification-close">סגור</button>
    </div>
  `;
  document.body.appendChild(notificationDialog);

  // Attach close listener
  notificationDialog.querySelector('.notification-close').addEventListener('click', () => {
    notificationDialog.close();
  });

  // Add confirm dialog
  const confirmDialog = document.createElement('dialog');
  confirmDialog.id = 'confirmDialog';
  confirmDialog.className = 'confirm-dialog';
  confirmDialog.innerHTML = `
    <div class="confirm-content">
      <div class="confirm-message"></div>
      <div class="confirm-actions">
        <button class="btn btn-secondary confirm-cancel">ביטול</button>
        <button class="btn btn-primary confirm-ok">אישור</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmDialog);

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
        <div class="settings-section" id="syncSection">
          <label class="settings-label">לימוד בכמה מכשירים</label>
          <div id="syncContent"></div>
        </div>

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
  attachShareListener();
  initScrollBanner();

  // Initialize about panel
  if (typeof initAboutPanel === 'function') {
    initAboutPanel();
  }
}

// ============================================================================
// Sync Conflict Dialog
// ============================================================================
function showSyncConflictDialog(localCount, remoteCount) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'notification-dialog shabbat-dialog';
    dialog.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">⚠️</div>
        <div class="notification-message" style="font-weight: 600; font-size: 1.05rem;">נמצא מידע בשני הצדדים</div>
        <div class="notification-message" style="font-size: 0.9rem;">
          במכשיר זה: <b>${localCount}</b> הלכות הושלמו<br>
          במכשיר האחר: <b>${remoteCount}</b> הלכות הושלמו
        </div>
        <div class="notification-message" style="font-size: 0.85rem; color: var(--color-text-secondary);">מה לעשות?</div>
        <div class="shabbat-actions" style="flex-direction: column; gap: 0.5rem;">
          <button class="shabbat-btn shabbat-yes" id="syncConflictMerge">מזג את שניהם</button>
          <button class="shabbat-btn" id="syncConflictMine" style="background: var(--color-bg-muted); color: var(--color-text-primary);">שמור את שלי, העבר למכשיר האחר</button>
          <button class="shabbat-btn" id="syncConflictTheirs" style="background: var(--color-bg-muted); color: var(--color-text-primary);">החלף בנתונים מהמכשיר האחר</button>
          <button class="shabbat-btn shabbat-no" id="syncConflictCancel">ביטול</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();

    const cleanup = (result) => {
      dialog.close();
      dialog.remove();
      resolve(result);
    };

    dialog.querySelector('#syncConflictMerge').addEventListener('click', () => cleanup('merge'));
    dialog.querySelector('#syncConflictMine').addEventListener('click', () => cleanup('mine'));
    dialog.querySelector('#syncConflictTheirs').addEventListener('click', () => cleanup('theirs'));
    dialog.querySelector('#syncConflictCancel').addEventListener('click', () => cleanup(null));
  });
}

// ============================================================================
// Sync Section Rendering
// ============================================================================
function renderSyncSection() {
  const container = document.getElementById('syncContent');
  if (!container) return;

  const code = getSyncCode();

  if (code) {
    const formatted = code.slice(0, 3) + '-' + code.slice(3);
    const lastUpdated = getSyncLastUpdated();
    const lastUpdatedDisplay = lastUpdated
      ? new Date(lastUpdated).toLocaleString('he-IL')
      : 'לא ידוע';
    const dirtyNote = getSyncDirty()
      ? '<div class="sync-dirty-note">יש התקדמות חדשה שלא סונכרנה עדיין.</div>'
      : '';
    const canPush = getSyncDirty();

    container.innerHTML = `
      <div class="sync-code-display">${formatted}</div>
      <div class="sync-meta">עדכון אחרון: <time datetime="${lastUpdated || ''}">${lastUpdatedDisplay}</time></div>
      ${dirtyNote}
      <div class="sync-actions">
        <button class="btn btn-primary" id="syncPushNowBtn" ${canPush ? '' : 'disabled'}>↻ עדכן התקדמות</button>
        <button class="btn btn-secondary" id="syncDisconnectBtn">נתק</button>
      </div>
    `;

    document.getElementById('syncPushNowBtn').addEventListener('click', async () => {
      const btn = document.getElementById('syncPushNowBtn');
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'מעדכן...';
      try {
        await pushSync();
        renderSyncSection();
        renderDays();
      } catch (err) {
        console.error('Manual sync push failed:', err);
        window.showNotification('שגיאה בסנכרון. נסה שוב.');
      } finally {
        btn.disabled = false;
        btn.textContent = '↻ עדכן התקדמות';
      }
    });

    document.getElementById('syncDisconnectBtn').addEventListener('click', () => {
      showConfirm('האם לנתק את החיבור למכשירים האחרים?').then((ok) => {
        if (!ok) return;
        localStorage.removeItem('rambam_sync_code');
        localStorage.removeItem('rambam_sync_lastUpdated');
        localStorage.removeItem('rambam_synced_at');
        renderSyncSection();
      });
    });
  } else {
    container.innerHTML = `
      <div class="sync-connect-form">
        <button class="btn btn-primary" id="syncPushBtn">צור מספר למכשיר אחר</button>
        <div class="sync-divider">או</div>
        <div class="sync-input-row">
          <input type="number" id="syncCodeInput" placeholder="הכנס מספר מהמכשיר האחר" inputmode="numeric" min="100000" max="999999">
          <button class="btn btn-secondary" id="syncPullBtn">חבר</button>
        </div>
      </div>
    `;

    document.getElementById('syncPushBtn').addEventListener('click', async () => {
      const btn = document.getElementById('syncPushBtn');
      btn.disabled = true;
      btn.textContent = 'יוצר...';
      try {
        await pushSync();
        renderSyncSection();
      } catch (err) {
        console.error('Push sync failed:', err);
        window.showNotification('שגיאה בחיבור למכשיר אחר. נסה שוב.');
        btn.disabled = false;
        btn.textContent = 'צור מספר למכשיר אחר';
      }
    });

    document.getElementById('syncPullBtn').addEventListener('click', async () => {
      const input = document.getElementById('syncCodeInput');
      const codeVal = String(input.value).replace(/\D/g, '');
      if (codeVal.length !== 6) {
        window.showNotification('יש להכניס מספר של 6 ספרות מהמכשיר האחר.');
        return;
      }

      const btn = document.getElementById('syncPullBtn');
      btn.disabled = true;
      btn.textContent = 'מחבר...';

      try {
        // First, fetch remote data to check for conflict
        const res = await fetch(`${SYNC_API_URL}/sync/${codeVal}`);
        if (res.status === 404) {
          window.showNotification('המכשיר האחר לא נמצא. בדוק את המספר ונסה שוב.');
          btn.disabled = false;
          btn.textContent = 'חבר';
          return;
        }
        if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

        const { data: remoteData, lastUpdated: remoteLastUpdated } = await res.json();

        // Count local vs remote done items
        const prefix = window.PLAN.storagePrefix;
        const localDone = getDone();
        const localCount = Object.keys(localDone).filter(k => parseInt(k.split(':')[1]) >= 0).length;

        let remoteDone = {};
        try { remoteDone = JSON.parse(remoteData[`${prefix}_done`] || '{}'); } catch {}
        const remoteCount = Object.keys(remoteDone).filter(k => parseInt(k.split(':')[1]) >= 0).length;

        // Conflict: both sides have meaningful progress
        let strategy = 'merge';
        if (localCount > 0 && remoteCount > 0) {
          strategy = await showSyncConflictDialog(localCount, remoteCount);
          if (!strategy) {
            // User cancelled
            btn.disabled = false;
            btn.textContent = 'חבר';
            return;
          }
        } else if (localCount > 0 && remoteCount === 0) {
          strategy = 'mine';
        } else {
          strategy = 'theirs';
        }

        applySync(remoteData, remoteLastUpdated, strategy);
        if (strategy === 'mine') {
          setSyncCode(codeVal);
          await pushSync();
        } else {
          setSyncCode(codeVal);
        }
        setSyncedAt(new Date().toISOString());
        renderSyncSection();
        renderDays();
      } catch (err) {
        console.error('Pull sync failed:', err);
        window.showNotification('שגיאה בחיבור. נסה שוב.');
        btn.disabled = false;
        btn.textContent = 'חבר';
      }
    });
  }
}

// ============================================================================
// Settings Event Listeners
// ============================================================================
function openSettings() {
  // Close info if open
  if (typeof closeInfo === 'function') {
    closeInfo();
  }

  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  document.body.classList.add('no-scroll');

  renderSyncSection();
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
  document.body.classList.remove('no-scroll');
}

function attachSettingsListeners() {
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeBtn').addEventListener('click', closeSettings);
  document.getElementById('infoBtn').addEventListener('click', openInfo);
  document.getElementById('overlay').addEventListener('click', () => {
    closeSettings();
    if (typeof closeInfo === 'function') {
      closeInfo();
    }
  });

  // Toggle settings
  attachToggleListeners();

  // Refresh data button
  document.getElementById('refreshDataBtn').addEventListener('click', async () => {
    if (await showConfirm('האם לרענן את הנתונים? ההתקדמות שלך תישמר.')) {
      localStorage.removeItem(`${window.PLAN.storagePrefix}_days`);
      // Reset day transition settings to defaults
      localStorage.removeItem(`${window.PLAN.storagePrefix}_day_transition_mode`);
      localStorage.removeItem(`${window.PLAN.storagePrefix}_day_transition_time`);
      location.reload();
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (await showConfirm('האם אתה בטוח? כל ההתקדמות תימחק.')) {
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
  startDateInput.addEventListener('change', async (e) => {
    const newStart = e.target.value;
    if (await showConfirm(`האם לשנות את תאריך ההתחלה ל-${newStart}? זה עלול לאפס את ההתקדמות.`)) {
      setStart(newStart);
      location.reload();
    } else {
      e.target.value = getStart();
    }
  });

  // Cycle button click
  setCycleBtn.addEventListener('click', async () => {
    if (await showConfirm('האם לקבוע את תאריך ההתחלה לט״ו שבט ה׳תשפ״ו (3 בפברואר 2026)?')) {
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
// Share Button - Shows when installed as PWA
// ============================================================================
function attachShareListener() {
  const shareBtn = document.getElementById('shareBtn');

  // Check if app is running as installed PWA
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true;

  if (isInstalled) {
    shareBtn.style.display = '';

    shareBtn.addEventListener('click', async () => {
      const shareText = `תראה איזה אפליקציה מגניבה מצאתי ללימוד רמב״ם!\n\n${window.location.href}`;

      // Use unified share function
      if (window.shareContent) {
        await window.shareContent(shareText, null);
      } else {
        // Fallback if shareContent not loaded yet
        fallbackCopyToClipboard('תראה איזה אפליקציה מגניבה מצאתי ללימוד רמב״ם!', window.location.href);
      }
    });
  }
}

function fallbackCopyToClipboard(text, url) {
  const fullText = `${text}\n${url}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('הקישור הועתק ללוח!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('לא ניתן להעתיק');
    });
  } else {
    // Old-school fallback
    const textArea = document.createElement('textarea');
    textArea.value = fullText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('הקישור הועתק ללוח!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('לא ניתן להעתיק');
    }
    document.body.removeChild(textArea);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

// Global notification function
window.showNotification = function(message, type = 'success') {
  const dialog = document.getElementById('notificationDialog');
  if (!dialog) return;

  const iconEl = dialog.querySelector('.notification-icon');
  const messageEl = dialog.querySelector('.notification-message');

  // Set icon based on type
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  iconEl.textContent = icons[type] || icons.info;

  // Set message
  messageEl.textContent = message;

  // Show dialog
  dialog.showModal();

  // Auto-close after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      if (dialog.open) {
        dialog.close();
      }
    }, 5000);
  }
};

// Global confirm function - returns a Promise
window.showConfirm = function(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    if (!dialog) {
      resolve(false);
      return;
    }

    const messageEl = dialog.querySelector('.confirm-message');
    const okBtn = dialog.querySelector('.confirm-ok');
    const cancelBtn = dialog.querySelector('.confirm-cancel');

    // Set message
    messageEl.textContent = message;

    // Remove old listeners and add new ones
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
      dialog.close();
      resolve(true);
    });

    newCancelBtn.addEventListener('click', () => {
      dialog.close();
      resolve(false);
    });

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
        resolve(false);
      }
    }, { once: true });

    // Show dialog
    dialog.showModal();
  });
};

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
  let lastScrollY = 0;
  let scrollDirection = 'down';
  let lastCollapseToggleY = 0; // Track where we last toggled collapse state

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
        const dayOfWeek = getHebrewDayOfWeek(date);
        const dateLabel = formatHebrewDate(date);
        const displayLabel = isToday ? `${dayOfWeek} (היום)` : `${dayOfWeek} • ${dateLabel}`;

        scrollBannerTitle.textContent = dayData.he;
        scrollBannerDate.textContent = displayLabel;
        const doneCount = countDoneForDate(done, date);
        scrollBannerProgress.textContent = `${doneCount}/${dayData.count}`;

        // Update progress bar and percentage
        const percentage = dayData.count > 0 ? (doneCount / dayData.count) * 100 : 0;
        scrollBannerBar.style.width = `${percentage}%`;

        // Update percentage display
        const scrollBannerPercentage = document.getElementById('scrollBannerPercentage');
        scrollBannerPercentage.textContent = `${Math.round(percentage)}%`;
      }
    }
  }

  function updateScrollBanner() {
    const scrollY = window.scrollY;
    const mainHeader = document.getElementById('mainHeader');
    const mainContent = document.getElementById('mainContent');

    // Detect scroll direction
    scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = scrollY;

    // Don't collapse header on celebration page
    const isCelebrationPage = mainContent && mainContent.classList.contains('celebration-page');

    // Show banner after scrolling 50px
    if (scrollY > 50) {
      scrollBanner.classList.add('visible');
      updateBannerContent();
    } else {
      scrollBanner.classList.remove('visible');
    }

    // Header and Dedication: hide on scroll down, show on scroll up (with delta threshold)
    // Don't add scrolled class on celebration page
    if (!isCelebrationPage) {
      const SCROLL_UP_THRESHOLD = 50; // Need to scroll up 100px to expand header
      const SCROLL_DOWN_THRESHOLD = 20; // Need to scroll down 50px to collapse header

      if (scrollY > 200) {
        const isCurrentlyCollapsed = document.body.classList.contains('scrolled');

        if (scrollDirection === 'down') {
          // Collapse header if scrolled down enough from last toggle point
          if (!isCurrentlyCollapsed && scrollY - lastCollapseToggleY > SCROLL_DOWN_THRESHOLD) {
            document.body.classList.add('scrolled');
            mainHeader.classList.add('scrolled');
            lastCollapseToggleY = scrollY;
          }
        } else {
          // Expand header only if scrolled up significantly from last toggle point
          if (isCurrentlyCollapsed && lastCollapseToggleY - scrollY > SCROLL_UP_THRESHOLD) {
            document.body.classList.remove('scrolled');
            mainHeader.classList.remove('scrolled');
            lastCollapseToggleY = scrollY;
          }
        }
      } else {
        // Always show full version at the very top
        document.body.classList.remove('scrolled');
        mainHeader.classList.remove('scrolled');
        lastCollapseToggleY = 0;
      }
    } else {
      // Always show full version on celebration page
      document.body.classList.remove('scrolled');
      mainHeader.classList.remove('scrolled');
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
