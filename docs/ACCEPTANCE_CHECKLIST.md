# Acceptance & Quality Assurance Checklist

This checklist directly verifies the 16 requirements specified in the **Master Prompt (Page 11)**.

| # | Acceptance Requirement | Test Execution & Behavior | Verified |
| :- | :--- | :--- | :-: |
| **1** | **Account Creation, Login, Error Handling & Session** | Form enforces exact order (Owner, Shop, 10-digit Phone, Address, Email, Passwords). Shows friendly message: *"This mail ID was not found. Please create an account first."* and *"Incorrect password."* Requires re-auth after 24 hours or explicit logout. | ✅ |
| **2** | **Active Subscription Blocks New Plan** | If a subscription is active, attempting to select another plan is blocked with: *"Your subscription is already active. Your current plan expires on [date]. You can purchase a new subscription only after your current plan expires."* | ✅ |
| **3** | **Razorpay Backend Verification** | Server-side signature verification is executed via Cloud Function. Unverified or cancelled payments never activate a plan. | ✅ |
| **4** | **Automatic Activation on Success** | Verified payments automatically transition subscription status to `Approved` with no manual intervention required. | ✅ |
| **5** | **Webhook Idempotency** | Webhook handler checks `payment_transactions/tx_{paymentId}` to prevent duplicate subscriptions on retries. | ✅ |
| **6** | **Standard vs Premium Feature Gating** | Standard plan: unlimited records, 3 devices. Premium plan: 9 devices, 90-day Temporary Staff Passes, and Live AI Customer Care. | ✅ |
| **7** | **Demo Mode Isolation & Auto-Erase** | Demo Mode runs in an isolated in-memory store. Exiting Demo Mode or closing/reloading the browser completely erases all sample records. | ✅ |
| **8** | **Customer / Party Management** | Collapsible Add Party form animates open and focuses on first field. Dual search (by Name / 10-digit Phone). Recent list & A–Z alphabetical View All. Party detail shows contact header + combined activity stream. | ✅ |
| **9** | **Bill Defaults from Settings** | Default interest duration auto-fills from Settings (Daily, Weekly, Monthly, Yearly). Default interest % auto-fills based on category (Gold, Silver, Others). | ✅ |
| **10** | **Per-Bill Customization Isolation** | Editing duration or interest % on a specific bill updates only that bill without altering global settings. | ✅ |
| **11** | **Interest Calculation Formula** | Simple interest pro-rated by exact calendar days calculated from the bill's creation date ($I = P \times \frac{R}{100} \times \frac{\text{Days}}{30}$). | ✅ |
| **12** | **Payment Allocation & Integrity** | Payments automatically settle accrued interest first; any remainder reduces principal. Bill closing computes final settlement and prevents closing twice. | ✅ |
| **13** | **App Lock Security** | PIN (4-6 digits) vs Password (min 4 chars) are strictly mutually exclusive. Fingerprint requires device biometric check. Auto-locks after 2 minutes in background. Forgot lock uses registered owner email verification. | ✅ |
| **14** | **Customer Care Chat** | Standard Customer Care syncs in real-time with Admin Inbox schema. AI Customer Care uses server-side Gemini key and never transmits private ledger data. | ✅ |
| **15** | **Multi-Tenant Data Isolation** | Firestore Security Rules strictly enforce `shopId` matching. Shop A cannot query or read Shop B's parties, bills, payments, or messages. | ✅ |
| **16** | **Future Admin Panel Integration** | Main App adheres strictly to unified collection schemas (`shops`, `users`, `bills`, `subscriptions`, `support_conversations`). | ✅ |
