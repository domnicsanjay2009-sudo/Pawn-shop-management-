# System Architecture Overview

## 1. High-Level Architecture

The **Pawn Shop Management Application** is designed as a unified, enterprise-grade cross-platform solution supporting:
- **Android OS**: Installable native APK (via Capacitor bridge with BiometricPrompt & hardware APIs)
- **iOS & macOS**: Responsive Web & PWA via WebKit/Safari
- **Windows Desktop**: Desktop browser, PWA, or WebView
- **LG webOS**: Chromium-based Smart TV & counter display web runtime

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CROSS-PLATFORM CLIENT                           │
│  React 18 + TypeScript + Tailwind CSS + Vite + Capacitor Runtime       │
├────────────────────────────────────────────────────────────────────────┤
│ • Navigation & Workspace (25-30% left drawer, responsive workspace)   │
│ • Local App Lock (PIN / Password mutual exclusion + BiometricPrompt)   │
│ • Isolated In-Memory Demo Mode (Auto-erased on exit & reload)          │
│ • Automated Financial Ledger Engine (Simple Interest pro-rated days)   │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
       Client SDK   │                                │  HTTPS / Callables
                    ▼                                ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│       FIREBASE CLOUD FIRESTORE  │    │     FIREBASE CLOUD FUNCTIONS    │
│  Strict Multi-Tenant Isolation  │    │      Privileged Operations      │
├─────────────────────────────────┤    ├─────────────────────────────────┤
│ • shops (Shop Profiles)         │    │ • createRazorpayOrder           │
│ • users (Role & Mapping)        │    │ • verifyRazorpayPayment         │
│ • settings (Defaults)           │    │ • razorpayWebhook (HMAC SHA256) │
│ • parties (Customer CRM)        │    │ • askGeminiSupport (AI Proxy)   │
│ • bills (Immutable Loans)       │    └────────────────▲────────────────┘
│ • payments (Ledger Audit)       │                     │
│ • closing_bills (Settlements)   │                     │ Server-Side Secrets
│ • subscriptions (Licenses)      │                     ▼
│ • support_conversations (Chat)  │    ┌─────────────────────────────────┐
└─────────────────────────────────┘    │  EXTERNAL PROVIDERS:            │
                                       │  • Razorpay (Key & Webhook Sec) │
                                       │  • Google Gemini 1.5 Flash API  │
                                       └─────────────────────────────────┘
```

## 2. Security Boundaries & Zero-Trust Client Design
1. **Per-Shop Data Isolation**:
   - Every collection document carries a mandatory `shopId`.
   - Security Rules reject any query or mutation attempting to touch another shop's records.
2. **Server-Side Secret Stores**:
   - `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `GEMINI_API_KEY` are kept strictly in Cloud Functions private environment variables.
   - Client applications only hold public identifiers (`VITE_RAZORPAY_KEY_ID`).
3. **24-Hour Auth Session Re-Authentication**:
   - Session timestamps are tracked. Re-authentication with email and password is required once the 24-hour validity window elapses or if explicit Logout is pressed.
4. **App Lock Layer**:
   - Runs independently of Firebase Auth.
   - Automatically engages after 2 minutes of background inactivity or application close.
   - Supports PIN (4-6 digits) or Password (min 4 characters) in strict mutual exclusion, supplemented by biometric credentials.

## 3. Financial Integrity & Decimal Safety
- Money is represented in exact **integer paise** (1 Rupee = 100 Paise) across Firestore and runtime models.
- Calculations use **Simple Interest** with exact pro-rated days ($I = P \times \frac{R}{100} \times \frac{\text{Days}}{30}$ for monthly rates).
- Payment allocation settles accrued interest first, then reduces the principal balance.
