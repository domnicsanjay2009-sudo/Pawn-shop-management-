# Pawn Shop Management — Main Customer-Facing Application

A production-minded, cross-platform Pawn Shop Management system engineered for pawn shop owners, counter staff, and borrowers. Compatible with **Android (Native APK via Capacitor)**, **Windows Desktop**, **macOS**, **iOS**, and **LG webOS**.

---

## 💎 Key Features

- **Pledge Ledger Management**: Create collateral loans for Gold, Silver, and custom categories. Choose weight units per bill (`g`, `mg`, `tola`, `pavan`).
- **Exact Financial Math**: Simple Interest with pro-rated calendar days ($I = P \times \frac{R}{100} \times \frac{\text{Days}}{30}$ for monthly rates). Accurate in integer paise (decimal-safe).
- **Automated Payment Allocation**: Accrued interest is settled first; surplus payment reduces principal.
- **Redeem & Close Bills**: Full reconciliation of remaining principal + accrued interest with settlement receipts. Prevents double closing.
- **Customer Directory (CRM)**: Dual search modes (by Name or 10-digit Phone). Recent list and A–Z alphabetical View All. Combined activity stream sorted latest to oldest.
- **App Lock Security**: Local PIN (4-6 digits) or Password (min 4 chars) in strict mutual exclusion, with device fingerprint biometrics, 2-minute background inactivity lock, and registered email recovery.
- **Subscriptions & Razorpay**: Yearly Plan (₹1,999/yr) and Yearly Premium Plan (₹2,999/yr). Server-side order creation and signature verification. 90-Day Temporary Staff Passes for Premium users.
- **Customer Care**: Real-time Human/Admin inbox chat and Live AI Customer Care powered by Google Gemini (gated to Premium).
- **Isolated Demo Mode**: In-memory sample sandbox to test workflows. Completely wiped on exit or app close.

---

## 🚀 Quick Start

### 1. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### 2. Run Automated Test Suite
```bash
npm run test
```

### 3. Production Build
```bash
npm run build
```

### 4. Build Installable Android APK
```bash
npx cap add android
npm run build
npx cap sync android
npx cap open android
```
Inside Android Studio: Click **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.

---

## 📚 Complete Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Firebase Setup Guide (Simple Language)](docs/FIREBASE_SETUP.md)
- [Database Schema & Collections](docs/DATABASE_SCHEMA.md)
- [Razorpay Integration & Secret Configuration](docs/RAZORPAY_INTEGRATION.md)
- [Gemini AI Customer Care Setup](docs/GEMINI_AI_SETUP.md)
- [Build & Deployment Guide](docs/BUILD_AND_DEPLOYMENT.md)
- [Acceptance & Quality Assurance Checklist](docs/ACCEPTANCE_CHECKLIST.md)
- [Future Admin Panel Integration Guide](docs/FUTURE_ADMIN_PANEL_INTEGRATION.md)
