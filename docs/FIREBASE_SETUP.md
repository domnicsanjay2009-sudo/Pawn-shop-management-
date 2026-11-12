# Firebase Project Setup Guide (Step-by-Step for Non-Programmers)

This guide walks you through setting up your free Firebase backend for the Pawn Shop Management application.

---

## Step 1: Create a Free Firebase Project
1. Open your browser and go to [Firebase Console](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. Click **Add project** (or **Create a project**).
4. Enter a project name (e.g., `my-pawn-shop-system`).
5. Disable Google Analytics for simplicity, then click **Create project**. Wait 30 seconds for the project to provision.

---

## Step 2: Enable Firebase Authentication
1. On the left navigation sidebar in the Firebase console, click **Build** -> **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Switch the **Enable** toggle on for **Email/Password** (keep "Email link" off).
5. Click **Save**.

---

## Step 3: Create Cloud Firestore Database
1. On the left sidebar, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose your database location:
   - For India / South Asia: select `asia-south1 (Mumbai)`.
4. Choose **Start in production mode** (we will deploy secure rules next).
5. Click **Create**.

---

## Step 4: Register Web App & Obtain Config Keys
1. In the Firebase console, click the **Gear Icon** ⚙️ (Project settings) in the top-left sidebar.
2. Scroll down to the **Your apps** card and click the **Web icon** (`</>`).
3. Enter an app nickname (e.g., `pawn-shop-web`), leave Firebase Hosting unselected for now, and click **Register app**.
4. Firebase will display your config object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "my-pawn-shop.firebaseapp.com",
     projectId: "my-pawn-shop",
     storageBucket: "my-pawn-shop.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:123456:web:abcdef"
   };
   ```
5. Copy these values into a file named `.env.local` inside your project root folder:
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="my-pawn-shop.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="my-pawn-shop"
   VITE_FIREBASE_STORAGE_BUCKET="my-pawn-shop.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
   VITE_FIREBASE_APP_ID="1:123456:web:abcdef"
   ```

---

## Step 5: Deploy Security Rules and Indexes
Open your terminal in the `pawn-shop-management` project directory and run:
```bash
# 1. Login to Firebase
npx firebase login

# 2. Link your Firebase project
npx firebase use --add

# 3. Deploy Firestore rules and composite indexes
npx firebase deploy --only firestore
```

All collections will now be protected by strict per-shop isolation rules!
