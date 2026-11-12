# Free Backend Deployment Guide (Zero Cost, No Credit Card Required)

This backend powers the **Razorpay Payment Gateway**, **Cryptographic Signature Verification**, **Automated Webhooks**, and **AI Customer Care** for the Pawn Shop Management application without requiring a paid Firebase Blaze plan.

---

## Free Hosting Comparison

| Platform | Free Tier | Credit Card Required? | Free HTTPS URL | Cold Start |
|---|---|---|---|---|
| **Vercel (Recommended)** | 100% Free Hobby Plan | **NO** | `https://your-app.vercel.app` | None (instant serverless) |
| **Render** | 100% Free Web Service (750 hrs/mo) | **NO** | `https://your-app.onrender.com` | ~30s on idle |
| **Local / Cloudflare Tunnel** | 100% Free Self-Hosted | **NO** | Custom HTTPS via Tunnel | 0 ms |

---

## Option 1: Deploy to Vercel (Recommended — Takes 2 Minutes)

Vercel provides completely free serverless functions with automatic SSL and zero credit card requirements.

### Step 1: Install Vercel CLI (or connect GitHub)
Open your terminal in the project root and run:
```bash
npm install -g vercel
```
Or use `npx vercel` without installing globally.

### Step 2: Deploy
From the project root:
```bash
npx vercel
```
1. Follow the interactive prompts:
   - "Set up and deploy?": **Yes** (`y`)
   - "Which scope?": Select your account
   - "Link to existing project?": **No** (`n`)
   - "What's your project's name?": `pawn-shop-backend` (or your choice)
   - "In which directory is your code located?": `./`
2. For production deployment:
```bash
npx vercel --prod
```

### Step 3: Add Environment Variables in Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your project -> **Settings** -> **Environment Variables**
3. Add the following:
   - `RAZORPAY_KEY_ID` = `rzp_live_YOUR_KEY_ID` (or your test key)
   - `RAZORPAY_KEY_SECRET` = `YOUR_RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` = `YOUR_RAZORPAY_WEBHOOK_SECRET`
   - `FIREBASE_PROJECT_ID` = `pawn-shop-management`
   - *(Optional for full Firestore Admin writes)* `FIREBASE_SERVICE_ACCOUNT` = Paste your Firebase Service Account JSON (see below)
   - *(Optional for AI support)* `GEMINI_API_KEY` = Your Gemini API key
4. Redeploy or click **Deployments** -> **Redeploy** to apply variables.

Your backend will now be live at: `https://pawn-shop-backend.vercel.app`

---

## Option 2: Deploy to Render (100% Free Web Service)

1. Sign up at [https://render.com](https://render.com) (No credit card needed).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Select **Free** ($0 / month).
5. Add Environment Variables under the **Environment** tab:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT` (optional)
6. Click **Create Web Service**. Your service URL will be `https://<service-name>.onrender.com`.

---

## Option 3: Run Locally (For Local Testing)

Run the backend locally using the bundled script:
```bash
npm run backend
```
The server will start on `http://localhost:5000`.
Health check: `http://localhost:5000/api/health`

---

## How to Get Your Free Firebase Service Account JSON (3 Clicks)

To allow the free backend to write verified subscriptions to Firestore:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `pawn-shop-management`.
3. Click the **Gear icon (Project Settings)** in the top left -> **Service accounts** tab.
4. Click **Generate new private key** -> Click **Generate key**.
5. A JSON file will download. Open it in a text editor, copy its contents, and paste it into the `FIREBASE_SERVICE_ACCOUNT` environment variable on Vercel or Render.

---

## Connecting the Frontend to Your Free Backend

Once your backend is live (e.g. `https://pawn-shop-backend.vercel.app`):
1. Open `.env.local` in the project root.
2. Add:
   ```env
   VITE_BACKEND_API_URL="https://pawn-shop-backend.vercel.app"
   ```
3. Rebuild and deploy the frontend:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## Configure Razorpay Webhooks

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
3. **Webhook URL**:
   `https://<your-backend-domain>/api/webhook` (e.g. `https://pawn-shop-backend.vercel.app/api/webhook`)
4. **Secret**: `YOUR_RAZORPAY_WEBHOOK_SECRET`
5. **Active Events**: Select:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`
   - `refund.processed`
6. Click **Save**.
