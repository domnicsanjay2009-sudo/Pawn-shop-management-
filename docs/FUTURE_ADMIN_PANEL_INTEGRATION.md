# Future Admin Panel Integration Guide

This guide defines the exact contracts, shared collections, and role-based access rules that the **Admin Panel** (the second deliverable) must reuse. The Admin Panel must connect to the **SAME Firebase project** and use the **SAME Cloud Firestore database** without modifying the Main App's schema.

---

## 1. Firebase Project & Environment Sharing
- **Project ID**: The Admin Panel must point to the same Firebase Project ID as the Main App.
- **Firebase Authentication**:
  - Global Administrators log in using standard Firebase Email/Password auth or Google OAuth.
  - An Admin user is assigned the custom claim: `{ "role": "global_admin" }` via Firebase Admin SDK.

```javascript
// Server script to provision a Global Platform Administrator:
const admin = require('firebase-admin');
admin.auth().setCustomUserClaims(adminUid, { role: 'global_admin' });
```

---

## 2. Shared Collections & Data Contracts

### A. All Registered Shops (`/shops`)
- **Path**: `shops/{shopId}`
- **Admin Access**: Read all shops, view owner contact details, address, phone numbers, and creation timestamps.
- **Actions**: Approve special requests, suspend delinquent shops, or update verified status.

### B. Subscriptions & Licensing (`/subscriptions`)
- **Path**: `subscriptions/{shopId}`
- **Admin Access**: Read all subscriptions across every shop.
- **Fields**:
  - `shopId`: Shop identifier
  - `plan`: `'Yearly' | 'Yearly Premium'`
  - `status`: `'Approved' | 'Pending' | 'Expired' | 'Failed'`
  - `startDate`, `expiryDate`: ms timestamps
  - `maxDevices`: Device limit (3 for Yearly, 9 for Premium)
- **Admin Actions**: Can manually extend subscription expiry dates, modify active device quotas, or issue promotional access.

### C. Financial Transactions Ledger (`/payment_transactions`)
- **Path**: `payment_transactions/{txId}`
- **Admin Access**: Read-only platform audit stream showing all Razorpay payment IDs, order IDs, timestamps, and rupee amounts collected across all shops.

### D. Customer Care & Support Inbox (`/support_conversations`)
- **Conversation Path**: `support_conversations/{shopId}`
- **Messages Path**: `support_conversations/{shopId}/messages/{messageId}`
- **Admin Workflow**:
  1. The Admin Panel dashboard listens to `support_conversations` ordered by `lastUpdated desc`.
  2. The Admin sees: `shopName`, `ownerName`, `ownerEmail`, and unread badges.
  3. When an Admin replies to a conversation, they write to `support_conversations/{shopId}/messages` with:
     ```json
     {
       "conversationId": "{shopId}",
       "shopId": "{shopId}",
       "senderType": "admin",
       "senderName": "Platform Support Specialist",
       "messageText": "Hello! We have reviewed your account inquiry...",
       "timestamp": 1730505600000
     }
     ```
  4. This message instantly appears in real time on the customer's Main App Chat Box!

---

## 3. Cloud Functions to Reuse
The Admin Panel interacts with the same backend Cloud Functions:
1. `razorpayWebhook`: Central webhook processing for subscription payments.
2. `askGeminiSupport`: Proxied AI guidance for Premium subscribers.
3. Custom Admin Callables: (e.g. `adminRevokeSubscription`, `adminSendBroadcastNotification`).

---

## 4. Firestore Security Rules Compatibility
The `firestore.rules` already deployed includes the helper:
```javascript
function isPlatformAdmin() {
  return request.auth != null && request.auth.token.role == 'global_admin';
}
```
Global administrators are already authorized to inspect subscriptions, audit transactions, and reply to all support tickets without requiring any schema changes or duplicate databases.
