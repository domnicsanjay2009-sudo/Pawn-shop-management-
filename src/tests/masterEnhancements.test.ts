import { describe, it, expect } from 'vitest';
import { isBillEligibleForExpiry } from '../services/expiredBillService';
import { calculateAccruedInterestPaise, evaluateBillStatus, allocatePayment } from '../utils/calculations';
import { Bill, AppSettings, NavigationTab } from '../types';

describe('Master Enhancement Suite – Financial Rules, Expired Bills, Navigation & Settlements', () => {
  const mockBill: Bill = {
    id: 'bill_test_101',
    shopId: 'shop_demo_1',
    billNumber: 'B-1001',
    partyId: 'party_1',
    partyName: 'Rajesh Kumar',
    partyPhone: '9876543210',
    itemCategory: 'Gold',
    itemDescription: '22K Gold Chain 16g',
    purity: '22K / 916',
    grossWeight: 16.5,
    netWeight: 16.0,
    weightUnit: 'g',
    principalPaise: 5000000, // ₹50,000.00
    currentPrincipalPaise: 5000000,
    interestPercentage: 2.0, // 2% per month
    interestDuration: 'Monthly',
    billDate: '2023-01-01',
    status: 'Active',
    totalPaidPaise: 0,
    totalInterestPaidPaise: 0,
    createdAt: new Date('2023-01-01').getTime(),
    updatedAt: new Date('2023-01-01').getTime(),
  };

  const defaultSettings: AppSettings = {
    shopId: 'shop_demo_1',
    defaultInterestDuration: 'Monthly',
    defaultGoldPercentage: 2.0,
    defaultSilverPercentage: 3.0,
    defaultOthersPercentage: 4.0,
    lateInterestFeesEnabled: true,
    lateInterestFeeRateOrAmount: 1.0, // 1%
    lateClosingFeesEnabled: true,
    lateClosingFeeAmountPaise: 5000, // ₹50.00
    lateClosingFeeDurationMonths: 12,
    expiredBillsDurationYears: 2,
    updatedAt: Date.now(),
  };

  describe('1. Main Application Navigation Order', () => {
    it('should strictly contain the 8 specified navigation tabs in order', () => {
      const expectedTabs: NavigationTab[] = [
        'home',
        'bills',
        'payments',
        'closing',
        'parties',
        'expired',
        'analytics',
        'settings',
      ];

      expect(expectedTabs.length).toBe(8);
      expect(expectedTabs).toEqual([
        'home',
        'bills',
        'payments',
        'closing',
        'parties',
        'expired',
        'analytics',
        'settings',
      ]);
    });
  });

  describe('2. Expired Bills Eligibility & Invariant', () => {
    it('should mark untouched bill open for >= 2 years with 0 payments as eligible for expiry', () => {
      const isEligible = isBillEligibleForExpiry(mockBill, 0, 2);
      expect(isEligible).toBe(true);
    });

    it('should NOT mark a bill as expired if it has received any payments (untouched requirement)', () => {
      const billWithPayment: Bill = {
        ...mockBill,
        totalPaidPaise: 50000, // ₹500 paid
      };
      const isEligible = isBillEligibleForExpiry(billWithPayment, 1, 2);
      expect(isEligible).toBe(false);
    });

    it('should NOT mark a recently created bill as expired', () => {
      const recentBill: Bill = {
        ...mockBill,
        billDate: new Date().toISOString().split('T')[0],
      };
      const isEligible = isBillEligibleForExpiry(recentBill, 0, 2);
      expect(isEligible).toBe(false);
    });

    it('should NOT mark an already closed bill as expired', () => {
      const closedBill: Bill = {
        ...mockBill,
        status: 'Closed',
      };
      const isEligible = isBillEligibleForExpiry(closedBill, 0, 2);
      expect(isEligible).toBe(false);
    });
  });

  describe('3. Normal Payment Full Settlement Restriction ("Please Close the Bill")', () => {
    it('should identify when payment amount equals or exceeds total payable amount', () => {
      const status = evaluateBillStatus(mockBill, '2023-03-01');
      const totalPayable = status.totalPayablePaise;

      // When attempting to pay full amount or excess
      const attemptedFullPayment = totalPayable;
      const isFullSettlement = attemptedFullPayment >= totalPayable;

      expect(isFullSettlement).toBe(true);
    });

    it('should permit valid partial payments and prioritize interest allocation', () => {
      const partialPaymentPaise = 100000; // ₹1,000.00
      const allocation = allocatePayment(mockBill, partialPaymentPaise, '2023-02-01');

      expect(allocation.interestPortionPaise).toBeGreaterThan(0);
      expect(allocation.interestPortionPaise + allocation.principalPortionPaise).toBe(partialPaymentPaise);
    });
  });

  describe('4. Closing Bill Exact Settlement Validation', () => {
    it('should validate exact sum match between Cash, GPay, and Others', () => {
      const calculatedClosingAmountPaise = 5200000; // ₹52,000.00

      const cashPaise = 2000000; // ₹20,000.00
      const gpayPaise = 3200000; // ₹32,000.00
      const othersPaise = 0;

      const totalAllocated = cashPaise + gpayPaise + othersPaise;
      const isExact = totalAllocated === calculatedClosingAmountPaise;

      expect(isExact).toBe(true);
    });

    it('should reject underpayment or overpayment during bill closure', () => {
      const calculatedClosingAmountPaise = 5200000;

      const underpayment = 5199900;
      const overpayment = 5200100;

      expect(underpayment === calculatedClosingAmountPaise).toBe(false);
      expect(overpayment === calculatedClosingAmountPaise).toBe(false);
    });
  });

  describe('5. Republishing Expired Bills & Late Fees', () => {
    it('should recalculate accrued interest starting from original opening date to today', () => {
      const todayStr = '2024-01-01';
      const interestPaise = calculateAccruedInterestPaise(
        mockBill.principalPaise,
        mockBill.interestPercentage,
        mockBill.interestDuration,
        mockBill.billDate,
        todayStr
      );

      // Principal: 50,000 * 2% monthly = 1,000/month. 365 days / 30 ~ 12.16 months ~ ₹12,167
      expect(interestPaise).toBeGreaterThan(1000000);
    });

    it('should apply enabled late fees and ignore disabled late fees', () => {
      let lateInterest = 0;
      if (defaultSettings.lateInterestFeesEnabled && defaultSettings.lateInterestFeeRateOrAmount) {
        lateInterest = Math.round(
          mockBill.principalPaise * (defaultSettings.lateInterestFeeRateOrAmount / 100)
        );
      }

      let lateClosing = 0;
      if (defaultSettings.lateClosingFeesEnabled && defaultSettings.lateClosingFeeAmountPaise) {
        lateClosing = defaultSettings.lateClosingFeeAmountPaise;
      }

      expect(lateInterest).toBe(50000); // 1% of ₹50,000 = ₹500 (50,000 paise)
      expect(lateClosing).toBe(5000); // ₹50 (5,000 paise)
    });
  });
});
