# Gemini Server-Side AI Customer Care Setup Guide

## 1. Overview
The **AI Customer Care** feature allows Yearly Premium subscribers to receive instant, 24/7 guided answers regarding pawn shop software workflows.

To protect your API account and customer privacy:
1. **The Gemini API Key is stored strictly server-side** in Firebase Cloud Functions (`functions/index.js`). It is **never bundled inside the client application or APK**.
2. **Private customer financial records are NEVER sent to Gemini**. The assistant functions strictly as an operational product guide.
3. Access is automatically verified server-side: non-premium shops cannot invoke the Gemini endpoint.

---

## 2. Generating a Gemini API Key

1. Navigate to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the left navigation.
4. Click **Create API key** (select an existing Google Cloud project or create a new one).
5. Copy your generated key (`AIzaSy...`).

---

## 3. Configuring the Secret in Firebase Functions

Run the following command in your terminal:
```bash
firebase functions:config:set gemini.api_key="AIzaSyYourGeneratedGeminiApiKey"
```
Or define it in `functions/.env`:
```env
GEMINI_API_KEY="AIzaSyYourGeneratedGeminiApiKey"
```

Then deploy the function:
```bash
firebase deploy --only functions:askGeminiSupport
```

---

## 4. Testing AI Customer Care
1. Sign in to the Main App with an account that has an active **Yearly Premium Plan**.
2. Navigate to **Chat Box** from the sidebar.
3. Select the **AI Customer Care** tab.
4. Ask a question such as:
   - *"How do I register a new gold chain collateral?"*
   - *"How does the system allocate partial payments towards interest?"*
   - *"How do I enable fingerprint lock on my counter device?"*
5. The assistant returns a concise, professional answer powered by Gemini 1.5 Flash.
