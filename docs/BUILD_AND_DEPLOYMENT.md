# Build, Run, and Cross-Platform Deployment Guide

This project can be run directly as a responsive web app on all devices (Windows, macOS, LG webOS, iOS) and compiled into an installable native Android APK.

---

## 1. Running Locally (Development Mode)

From the project root directory:
```bash
# Start local Vite development server
npm run dev
```
Open your browser to `http://localhost:3000` to interact with the application.

---

## 2. Running Automated Unit Tests

Automated Vitest test suites verify financial calculations, pro-rated interest formulas, and field validators:
```bash
npm run test
```

---

## 3. Building the Production Web & PWA Bundle

```bash
npm run build
```
The optimized production output will be generated inside the `dist/` directory.

---

## 4. Building the Installable Android APK (via Capacitor)

Your computer already has Android Studio and Android SDK installed at `C:\Users\3 os sanjay\AppData\Local\Android\Sdk`.

### Step 1: Initialize Capacitor Android Platform
```bash
npx cap add android
```

### Step 2: Sync Web Assets to Android Project
Whenever you update code or run `npm run build`, copy the assets to Android:
```bash
npm run build
npx cap sync android
```

### Step 3: Open in Android Studio & Generate APK
```bash
npx cap open android
```
Inside Android Studio:
1. Wait for Gradle sync to complete.
2. In the top menu, click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
3. Once completed, Android Studio will display a popup: *"APK(s) generated successfully"*.
4. Click **locate** to find your `app-debug.apk` or `app-release.apk` file.
5. Transfer this APK file to any Android phone or tablet to install!

---

## 5. Deploying to Firebase Hosting

```bash
# 1. Build the production files
npm run build

# 2. Deploy hosting and firestore rules
npx firebase deploy
```
Your app will be live on a fast, secure HTTPS Google domain (e.g., `https://your-pawn-shop.web.app`) accessible from any desktop or mobile browser.
