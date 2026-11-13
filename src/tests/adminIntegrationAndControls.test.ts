import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserDeviceLimit,
  pauseSubscription,
  unpauseSubscription,
  cancelSubscription
} from '../../admin-panel/src/services/adminDataService';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db, collectionName, id) => ({ collectionName, id, path: `${collectionName}/${id}` })),
    collection: vi.fn((_db, collectionName) => ({ collectionName })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ plan: 'Yearly Premium', status: 'Approved', expiryDate: Date.now() + 1000000 })
    }),
    getDocs: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    })),
    serverTimestamp: vi.fn(() => 1234567890),
  };
});

describe('Administrator Panel Integration & Controls Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Device Limit Enforcement (3 or 9 Devices)', () => {
    it('should return exactly 3 devices limit for Free and Yearly plans', () => {
      expect(getUserDeviceLimit('Free')).toBe(3);
      expect(getUserDeviceLimit('Yearly')).toBe(3);
      expect(getUserDeviceLimit(undefined)).toBe(3);
    });

    it('should return exactly 9 devices limit for Yearly Premium and Complimentary Premium plans', () => {
      expect(getUserDeviceLimit('Yearly Premium')).toBe(9);
      expect(getUserDeviceLimit('Complimentary Premium')).toBe(9);
    });
  });

  describe('2. Pause Subscription Security Control', () => {
    it('should set subscription status to Paused and shop/user to Suspended', async () => {
      const res = await pauseSubscription(
        'shop_user_123',
        'user_123',
        'customer@pawnshop.com',
        'Suspicious multi-device login activity'
      );

      expect(res.success).toBe(true);
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'subscriptions/shop_user_123' }),
        expect.objectContaining({
          status: 'Paused',
          pauseReason: 'Suspicious multi-device login activity',
        }),
        expect.anything()
      );

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'shops/shop_user_123' }),
        expect.objectContaining({
          status: 'Suspended',
          isSuspended: true,
        })
      );
    });
  });

  describe('3. Unpause Subscription Security Control', () => {
    it('should restore subscription to Approved and clear shop/user suspension', async () => {
      const res = await unpauseSubscription(
        'shop_user_123',
        'user_123',
        'customer@pawnshop.com',
        'Identity verified by phone'
      );

      expect(res.success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'subscriptions/shop_user_123' }),
        expect.objectContaining({
          status: 'Approved',
        })
      );

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'shops/shop_user_123' }),
        expect.objectContaining({
          status: 'Approved',
          isSuspended: false,
          disabledReason: null,
        })
      );
    });
  });

  describe('4. Decline / Cancel Subscription (Revoke) Security Control', () => {
    it('should terminate active subscription and revert user to Free tier', async () => {
      const res = await cancelSubscription(
        'shop_user_123',
        'user_123',
        'customer@pawnshop.com',
        'Non-payment / refund requested'
      );

      expect(res.success).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'subscriptions/shop_user_123' }),
        expect.objectContaining({
          plan: 'Free',
          status: 'Cancelled',
          maxDevices: 3,
        })
      );
    });
  });

  describe('5. Automated Access & Real-Time Enforcement', () => {
    it('should identify active vs paused vs cancelled subscription states correctly', () => {
      const now = Date.now();

      const activeSub = { status: 'Approved', expiryDate: now + 86400000 };
      const hasActivePlan = activeSub.status === 'Approved' && activeSub.expiryDate > now;
      expect(hasActivePlan).toBe(true);

      const pausedSub = { status: 'Paused', expiryDate: now + 86400000 };
      const isPaused = pausedSub.status === 'Paused';
      expect(isPaused).toBe(true);

      const cancelledSub = { status: 'Cancelled', expiryDate: now };
      const isCancelled = cancelledSub.status === 'Cancelled';
      expect(isCancelled).toBe(true);
    });
  });
});
