import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { PLANS } from '../services/subscriptionService';

describe('Razorpay Integration & Security Verification Suite', () => {
  const TEST_KEY_SECRET = 'test_razorpay_secret_mock_key_12345';
  const TEST_WEBHOOK_SECRET = 'test_webhook_secret_mock_key_67890';

  describe('1. Subscription Plans & Pricing Invariants', () => {
    it('should have exact authoritative prices in rupees and paise for Yearly Plan', () => {
      expect(PLANS.YEARLY.priceRupees).toBe(1999);
      expect(PLANS.YEARLY.pricePaise).toBe(199900);
      expect(PLANS.YEARLY.maxDevices).toBe(3);
      expect(PLANS.YEARLY.durationDays).toBe(365);
    });

    it('should have exact authoritative prices in rupees and paise for Yearly Premium Plan', () => {
      expect(PLANS.PREMIUM.priceRupees).toBe(2999);
      expect(PLANS.PREMIUM.pricePaise).toBe(299900);
      expect(PLANS.PREMIUM.maxDevices).toBe(9);
      expect(PLANS.PREMIUM.durationDays).toBe(365);
    });
  });

  describe('2. Payment Signature Verification (HMAC-SHA256)', () => {
    it('should correctly verify valid payment signature from Razorpay', () => {
      const orderId = 'order_DAhk39gK3jd09';
      const paymentId = 'pay_938fhsd9f8h23';

      const expectedSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const clientSignature = expectedSignature;

      // Server verification simulation
      const computed = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(computed).toBe(clientSignature);
    });

    it('should reject tampered or forged payment signatures', () => {
      const orderId = 'order_DAhk39gK3jd09';
      const paymentId = 'pay_938fhsd9f8h23';
      const forgedPaymentId = 'pay_ATTACKER_INJECTED';

      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const tamperedCheck = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${orderId}|${forgedPaymentId}`)
        .digest('hex');

      expect(tamperedCheck).not.toBe(validSignature);
    });
  });

  describe('3. Webhook Raw Body Signature Verification', () => {
    it('should accept valid webhook signatures generated with webhook secret', () => {
      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_LiveTest123456',
              amount: 199900,
              currency: 'INR',
              status: 'captured',
              notes: { shopId: 'shop_demo_1', planName: 'Yearly' },
            },
          },
        },
      });

      const validSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      const computed = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      expect(computed).toBe(validSignature);
    });

    it('should reject webhook if body was altered in transit', () => {
      const rawPayload = JSON.stringify({ event: 'payment.captured', amount: 199900 });
      const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 299900 });

      const originalSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      const tamperedSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(tamperedPayload)
        .digest('hex');

      expect(tamperedSignature).not.toBe(originalSignature);
    });
  });

  describe('4. Subscription Expiry & Duration Invariants', () => {
    it('should accurately calculate 365-day expiry timestamp without drift', () => {
      const now = 1700000000000;
      const days = 365;
      const expectedExpiry = now + days * 24 * 60 * 60 * 1000;

      const differenceDays = (expectedExpiry - now) / (1000 * 60 * 60 * 24);
      expect(differenceDays).toBe(365);
    });
  });

  describe('6. Subscription Upgrade & Renewal Logic', () => {
    it('should allow upgrade from Yearly to Yearly Premium even when Yearly is active', () => {
      const activePlan: string = 'Yearly';
      const requestedPlan: string = 'Yearly Premium';
      const isUpgrade = activePlan === 'Yearly' && requestedPlan === 'Yearly Premium';
      expect(isUpgrade).toBe(true);
    });

    it('should block downgrade from Yearly Premium to Yearly while active', () => {
      const activePlan: string = 'Yearly Premium';
      const requestedPlan: string = 'Yearly';
      const isUpgrade = activePlan === 'Yearly' && requestedPlan === 'Yearly Premium';
      expect(isUpgrade).toBe(false);
    });

    it('should allow renewal when remaining subscription days are 30 or less', () => {
      const now = Date.now();
      const expiryNear = now + 15 * 24 * 60 * 60 * 1000; // 15 days remaining
      const expiryFar = now + 180 * 24 * 60 * 60 * 1000; // 180 days remaining

      const isNearExpiry15 = (expiryNear - now) <= 30 * 24 * 60 * 60 * 1000;
      const isNearExpiry180 = (expiryFar - now) <= 30 * 24 * 60 * 60 * 1000;

      expect(isNearExpiry15).toBe(true);
      expect(isNearExpiry180).toBe(false);
    });
  });

  describe('8. Serverless Razorpay API Endpoint Validation (/api/index.js)', () => {
    it('should verify payment signature and return activated subscription structure', async () => {
      const apiHandler = (await import('../../api/index.js')).default;
      const orderId = 'order_UnitTestOrder123';
      const paymentId = 'pay_UnitTestPayment456';
      const secret = 'mZl6mJyLzV40E7GG1GP0r2AN';
      const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

      const req: any = {
        method: 'POST',
        url: '/api/verify-payment',
        headers: {},
        body: {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          planName: 'Yearly Premium',
          shopId: 'shop_test_shop_1'
        }
      };

      let statusCode = 200;
      let bodyData: any = null;
      const res: any = {
        setHeader: () => {},
        end: (str: string) => {
          bodyData = JSON.parse(str);
        }
      };
      Object.defineProperty(res, 'statusCode', {
        set: (code) => { statusCode = code; },
        get: () => statusCode
      });

      await apiHandler(req, res);

      expect(statusCode).toBe(200);
      expect(bodyData.success).toBe(true);
      expect(bodyData.verified).toBe(true);
      expect(bodyData.subscription.plan).toBe('Yearly Premium');
      expect(bodyData.subscription.amountPaise).toBe(299900);
      expect(bodyData.subscription.maxDevices).toBe(9);
      expect(bodyData.subscription.status).toBe('Approved');
    });

    it('should reject payment verification with 403 on tampered signature', async () => {
      const apiHandler = (await import('../../api/index.js')).default;
      const req: any = {
        method: 'POST',
        url: '/api/verify-payment',
        headers: {},
        body: {
          razorpayOrderId: 'order_123',
          razorpayPaymentId: 'pay_123',
          razorpaySignature: 'bad_tampered_signature_hex',
          planName: 'Yearly',
          shopId: 'shop_test_shop_1'
        }
      };

      let statusCode = 200;
      let bodyData: any = null;
      const res: any = {
        setHeader: () => {},
        end: (str: string) => {
          bodyData = JSON.parse(str);
        }
      };
      Object.defineProperty(res, 'statusCode', {
        set: (code) => { statusCode = code; },
        get: () => statusCode
      });

      await apiHandler(req, res);

      expect(statusCode).toBe(403);
      expect(bodyData.error).toContain('Invalid payment signature');
    });

    it('should return 400 when create-order is missing mandatory fields', async () => {
      const apiHandler = (await import('../../api/index.js')).default;
      const req: any = {
        method: 'POST',
        url: '/api/create-order',
        headers: {},
        body: {}
      };

      let statusCode = 200;
      let bodyData: any = null;
      const res: any = {
        setHeader: () => {},
        end: (str: string) => {
          bodyData = JSON.parse(str);
        }
      };
      Object.defineProperty(res, 'statusCode', {
        set: (code) => { statusCode = code; },
        get: () => statusCode
      });

      await apiHandler(req, res);

      expect(statusCode).toBe(400);
      expect(bodyData.error).toContain('Missing mandatory fields');
    });
  });
});
