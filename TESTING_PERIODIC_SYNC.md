# Testing Periodic Background Sync for Daily Reminders

## What Was Implemented

✅ **Periodic Background Sync** - Native browser API that allows notifications even when the app is closed
- Works on: Chrome/Edge (desktop & Android)
- Does NOT work on: Firefox, Safari, iOS
- Fallback: In-app notifications using `setTimeout()` (only works when app is open)

## How It Works

1. User enables "תזכורת יומית" in settings
2. App requests notification permission
3. App saves user's transition time (e.g., 18:30) to **IndexedDB** (accessible by service worker)
4. App registers a periodic sync task with the service worker
5. Service worker checks **once every 24 hours** (minimum allowed by browser)
6. If the current hour matches user's study hour (e.g., 18:00-18:59), shows notification
7. Works even if the app/browser is closed (on supported browsers)

**Important:** Notification shows during the **hour** containing your transition time, not at the exact minute.
- If you set transition to 18:30, notification shows between 18:00-18:59
- If you set transition to 20:15, notification shows between 20:00-20:59

## How to Test

### Step 1: Check Browser Support

Open the app and run in console:
```javascript
window.checkPeriodicSync()
```

**Expected output (Chrome/Edge):**
```
✅ Periodic Background Sync is supported!
📋 Registered sync tags: []
⚠️  Daily study reminder is NOT registered
ℹ️  Enable "תזכורת יומית" in settings to register
```

**Expected output (Firefox/Safari):**
```
❌ Periodic Background Sync not supported in this browser
ℹ️  This feature only works in Chrome/Edge on desktop/Android
ℹ️  Falling back to in-app notifications (only work when app is open)
```

### Step 2: Enable Daily Reminder

1. Open Settings panel
2. Enable "תזכורת יומית"
3. Grant notification permission when prompted

### Step 3: Verify Registration

Run in console again:
```javascript
window.checkPeriodicSync()
```

**Expected output:**
```
✅ Periodic Background Sync is supported!
📋 Registered sync tags: ["daily-study-check"]
✅ Daily study reminder is registered
ℹ️  Mode: time
ℹ️  Notifications will be shown around 18:00 local time daily
ℹ️  (Actually shows during the hour containing your transition time)

📦 Checking IndexedDB settings...
✅ IndexedDB settings: {key: "dayTransition", mode: "time", hour: 18, minute: 0, planId: "rambam3"}
```

### Step 4: Test Immediate Notification

To test that notifications work (without waiting 24 hours):
```javascript
window.testNotification()
```

This should show a test notification immediately.

### Step 5: Test the Full Flow

**Important:** You cannot trigger periodic sync manually or speed it up. The browser controls when it fires (minimum 24 hours, usually once per day).

To properly test:

1. ✅ Enable the reminder in settings
2. ✅ Verify registration with `window.checkPeriodicSync()`
3. ✅ Make sure you're at study time (18:00-18:59 local time)
4. ✅ **Close the app completely** (close browser or navigate away)
5. ⏰ **Wait for the browser to trigger the sync** (happens automatically within ~24 hours)
6. ✅ Should receive notification around 18:00

## Checking Service Worker Registration

Open Chrome DevTools:
1. Go to **Application** tab
2. Click **Service Workers** (left sidebar)
3. Should see service worker for your origin with status "activated"
4. Click **Periodic Background Sync** (left sidebar under Background Services)
5. Should see tag: `daily-study-check` with interval: `86400000` ms (24 hours)

## Debugging

### Check if sync is firing

In DevTools > Application > Periodic Background Sync:
- Check the timestamps to see when it last fired
- The browser shows "Last Sync" time

### Force a sync (Chrome DevTools only)

1. Open DevTools > Application > Service Workers
2. Find your service worker
3. Look for "Periodic Background Sync" section
4. Click the sync button next to `daily-study-check` tag
5. Check console for logs from `checkAndNotifyDailyStudy()`

### Check notification logs

In the service worker console:
```javascript
// Service worker logs when sync fires
console.log('Periodic sync fired: daily-study-check');
console.log('Current hour:', hour, 'Study hour:', 18);
```

## Limitations

### Periodic Background Sync Limitations:
- ⏱️ **Minimum 24-hour interval** (browser enforced)
- 🔋 **Battery-dependent**: Browser may skip syncs if device is low on battery
- 📶 **Network-dependent**: Browser prefers to sync when on WiFi
- 🔒 **PWA must be installed**: Some browsers require the app to be installed
- 🚫 **No precision timing**: Browser decides exact time (can't guarantee 18:00 exactly)
- 🌐 **Limited browser support**: Only Chrome/Edge

### Notification Limitations:
- ✅ Shows notification during the **hour containing user's transition time**
  - Example: User sets 18:30 → notification shows 18:00-18:59
  - Example: User sets 20:15 → notification shows 20:00-20:59
- ⚠️ **Cannot show at exact minute** (browser controls when sync fires within the hour)
- ⚠️ User must grant notification permission
- ⚠️ User must not have disabled notifications at OS level
- ⚠️ Sunset mode: Uses time from when reminder was enabled (doesn't recalculate daily)

## Fallback Behavior

If Periodic Background Sync is not supported:
- Falls back to `setTimeout()` approach
- Only works when app is **open and active**
- Stops working when tab is closed or browser is closed
- User will see console message: "Periodic Background Sync not supported, using in-app notifications"

## Production Deployment

After deploying:

1. **Update changelog** (already done in version 5.1)
2. **Increment service worker version** in `rambam3/service-worker.js`
3. **Deploy to Cloudflare Pages**
4. **Test on actual device** with Chrome/Edge
5. **Wait 24 hours** to verify sync fires
6. **Check at 18:00 local time** for notification

## User Communication

Add to settings panel or info section:
```
תזכורת יומית
• עובד רק בדפדפן Chrome/Edge
• דורש התקנה כאפליקציה (PWA)
• ההתראה תופיע בסביבות השעה 18:00
• בדפדפנים אחרים - עובד רק כשהאפליקציה פתוחה
```

## Future Improvements

1. ✅ ~~Make study time configurable~~ - **DONE! Uses user's transition time**
2. ✅ ~~Add IndexedDB storage~~ - **DONE! Settings synced to IndexedDB**
3. **Show last sync time in settings**: Help users verify it's working
4. **Add manual "test sync" button**: For debugging (DevTools already has this)
5. **Support sunset mode daily recalculation**: Currently uses sunset time from when enabled
6. **More precise timing**: Use Notification API scheduling (if it becomes available)
