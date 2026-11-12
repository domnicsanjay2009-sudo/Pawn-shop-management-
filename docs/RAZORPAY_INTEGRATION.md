# Razorpay Integration & Secure Secret Configuration Guide

## 1. Understanding Razorpay Credentials

| Credential Name | What It Is | Where It Belongs | Security Rule |
| :--- | :--- | :--- | :--- |
| **Key ID** (`rzp_test_...` or `rzp_live_...`) | Public identifier of your Razorpay merchant account | Client-side `.env.local` (`VITE_RAZORPAY_KEY_ID`) | Safe to be visible in client HTML/JS |
| **Key Secret** (alphanumeric string) | Private password used to authenticate backend API calls and verify payment HMAC signatures | **Backend Server / Firebase Functions ONLY** | **NEVER put in client code, public GitHub repos, or app APKs** |
| **Webhook Secret** | Custom secret token used to verify that incoming webhook requests originate from Razorpay | **Backend Server / Firebase Functions ONLY** | **NEVER put in client code** |

---

## 2. Test Mode Setup Instructions

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. In the top navbar or left menu, toggle the switch from **Live Mode** to **Test Mode**.
3. Go to **Settings** -> **API Keys**.
4. Click **Generate Test Key**.
5. Copy the **Key ID** and **Key Secret**.
6. Set the **Key ID** in your client `.env.local`:
   ```env
   VITE_RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere"
   ```
7. Configure the **Key Secret** on your Firebase Functions backend:
   ```bash
   firebase functions:config:set razorpay.key_id="rzp_test_YourKeyIdHere" razorpay.key_secret="YourKeySecretHere"
   ```
   Or set them in `functions/.env` for local emulator testing.

---

## 3. Webhook Configuration

1. In Razorpay Dashboard (Test Mode), navigate to **Settings** -> **Webhooks**.
2. Click **Add New Webhook**.
3. Set Webhook URL to your Cloud Function URL:
   `https://asia-south1-your-project-id.cloudfunctions.net/razorpayWebhook`
4. Enter a strong Secret (e.g. generate a random 32-character string).
5. Check the following Active Events:
   - `payment.captured`
   - `order.paid`
6. Save the webhook and store the secret in your Cloud Functions config:
   ```bash
   firebase functions:config:set razorpay.webhook_secret="YourWebhookSecretHere"
   ```

---

## 4. Checklist for Switching to Live Mode

- [ ] Complete KYC verification on Razorpay Dashboard.
- [ ] Toggle from **Test Mode** to **Live Mode**.
- [ ] Go to **Settings** -> **API Keys** -> **Generate Live Key**.
- [ ] Update `VITE_RAZORPAY_KEY_ID` with your `rzp_live_...` key.
- [ ] Update `razorpay.key_secret` on your server with the Live Key Secret.
- [ ] Create a Live Webhook endpoint with a new secret and test with a live transaction (e.g. ₹1 test bill).
- [ ] Verify that live subscriptions auto-activate to status `Approved`.
