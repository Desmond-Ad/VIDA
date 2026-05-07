# VIDA PWA Installation Guide

## ✅ PWA Setup Verification

All PWA files have been properly configured:

- ✅ `manifest.json` - PWA metadata and icons
- ✅ `sw.js` - Service Worker for offline support
- ✅ All HTML pages have PWA meta tags
- ✅ Server configured to serve PWA files with correct headers
- ✅ Service Worker registration on all pages
- ✅ Install button on login page as fallback

---

## 📱 Installation Steps for Android Phone

### Prerequisites:
- Phone and computer on **same WiFi network**
- Node server **running** on your computer
- Phone Chrome browser (or compatible browser)

### Step-by-Step:

1. **Find your computer's local IP:**
   ```
   On your computer, run: ipconfig | Select-String "IPv4"
   Example: 10.73.92.233
   ```

2. **On your Android phone, open Chrome** and visit:
   ```
   http://10.73.92.233:5000
   (Replace 10.73.92.233 with your actual IP)
   ```

3. **Wait for the page to fully load** (2-3 seconds on first visit)

4. **Look for one of these:**
   - **Automatic popup** at top/bottom saying "Install app"
   - **Green button labeled "📱 Install VIDA App"** below Login form

5. **Click either option** to trigger the install prompt

6. **Confirm the installation** in the popup that appears

7. **Wait for completion** - VIDA icon will appear on your home screen

### After Installation:

- **Tap the VIDA icon** to open the app fullscreen (no browser bar)
- App works **offline** with cached data
- **Automatic sync** when back online
- **No need to visit URL** - it's a real app!

---

## 🍎 Installation Steps for iPhone (iOS)

### Step-by-Step:

1. **On your iPhone, open Safari** and visit:
   ```
   http://10.73.92.233:5000
   (Replace with your computer IP)
   ```

2. **Tap the Share button** (box with arrow at bottom)

3. **Scroll down and tap "Add to Home Screen"**

4. **Edit the name** (keep as "VIDA") and tap "Add"

5. **VIDA icon appears on your home screen**

6. **Tap it anytime** to launch the app

---

## 🧪 Testing Your PWA Installation

Run this on your computer to verify all files are accessible:

```bash
node test-pwa.js
```

Expected output:
```
✅ PWA Manifest (200)
✅ Service Worker (200)
✅ Login Page (200)
✅ Purchase Page (200)
✅ Receive Page (200)
✅ Dashboard Page (200)
✅ App Icon (200)

Results: 7 passed, 0 failed
```

---

## ❌ Troubleshooting

### "Install button doesn't appear"
- Hard refresh: Swipe down from top, pull to refresh
- Clear Chrome cache: Settings → Apps → Chrome → Clear Cache
- Wait 3-5 seconds for Service Worker to register

### "Can't connect to server"
- Verify IP: Run `ipconfig | Select-String "IPv4"`
- Check firewall: Allow port 5000 in Windows Firewall
- Ensure phone and computer are on **same WiFi**
- Try ping: `ping 10.73.92.233` from phone (use IP Ping app)

### "App won't install"
- Use Chrome browser (not Safari or others)
- Close and reopen the page
- Make sure you see the green "Install VIDA App" button
- Try on different phone if possible

### "Gets "This site can't be reached"
- Double-check the IP address (must be local network IP, not localhost)
- Verify Node server is running
- Check Windows Firewall settings for port 5000

---

## 📋 PWA Features Included

✅ **Offline Support** - Works without internet using cached data
✅ **Auto-Sync** - Syncs data when connection returns  
✅ **App Shortcuts** - Long-press icon for quick access to Purchase/Receive/Dashboard
✅ **Fullscreen Mode** - No browser UI when installed
✅ **Push Notifications Ready** - Can be added later
✅ **Fast Loading** - Instant opens from home screen
✅ **Works on LAN** - Accessible across your network

---

## 🔧 Technical Details

**Manifest File:** `/manifest.json`
- Defines app name, icons, colors, display mode

**Service Worker:** `/sw.js`
- Caches app files for offline access
- Network-first for API calls
- Cache-first for static assets

**Cache Strategy:**
- API calls: Try network first, fallback to cache
- Static files: Use cache first, update in background
- Icons/Images: Cached indefinitely

**Ports:**
- Server: 5000
- Must be same WiFi for LAN access

---

Generated: February 10, 2026
VIDA PWA v1.0

