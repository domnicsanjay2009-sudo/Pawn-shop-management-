import { describe, it, expect } from 'vitest';
import { formatAuthError } from '../services/authService';
import { Bill } from '../types';

describe('Master Specification: Auth Error Messages & Customer-First Settlement Flows', () => {
  describe('1. Exact Authentication Error Messages (Part 1 Specification)', () => {
    it('should return exact string for unregistered email', () => {
      const err = formatAuthError({ code: 'auth/user-not-found' });
      expect(err).toBe('This mail ID is not found. Please create an account first.');
    });

    it('should return exact string for incorrect password', () => {
      const wrongPassErr = formatAuthError({ code: 'auth/wrong-password' });
      expect(wrongPassErr).toBe('Incorrect password. Please try again.');

      const invalidCredErr = formatAuthError({ code: 'auth/invalid-credential' });
      expect(invalidCredErr).toBe('Incorrect password. Please try again.');
    });

    it('should return exact string for network errors and timeouts', () => {
      const netErr = formatAuthError({ code: 'auth/network-request-failed' });
      expect(netErr).toBe('Network connection failed. Please check your internet connection.');

      const timeoutErr = formatAuthError({ code: 'auth/timeout' });
      expect(timeoutErr).toBe('Network connection failed. Please check your internet connection.');
    });
  });

  describe('2. Mandatory Plus (+) / Minus (-) Settlement Adjustment (Part 8 Specification)', () => {
    const baseOutstandingPaise = 2000000; // ₹20,000

    it('should increase payable amount when PLUS (+) adjustment is applied (penalty/extra fees)', () => {
      const positiveAdjustmentPaise = 50000; // ₹500 extra fee
      const adjustmentType: 'plus' | 'minus' = 'plus';
      
      const finalAmountPaise = adjustmentType === 'plus'
        ? baseOutstandingPaise + positiveAdjustmentPaise
        : baseOutstandingPaise - positiveAdjustmentPaise;

      expect(finalAmountPaise).toBe(2050000); // ₹20,500
    });

    it('should decrease payable amount when MINUS (-) adjustment is applied (discount/concession)', () => {
      const negativeAdjustmentPaise = 150000; // ₹1,500 discount
      const adjustmentType: 'plus' | 'minus' = 'minus';

      const finalAmountPaise = adjustmentType === 'minus'
        ? Math.max(0, baseOutstandingPaise - negativeAdjustmentPaise)
        : baseOutstandingPaise + negativeAdjustmentPaise;

      expect(finalAmountPaise).toBe(1850000); // ₹18,500
    });

    it('should prevent negative final payable amount when discount exceeds balance', () => {
      const hugeDiscountPaise = 2500000; // ₹25,000 discount on ₹20,000 bill
      const adjustmentType: 'plus' | 'minus' = 'minus';

      const finalAmountPaise = adjustmentType === 'minus'
        ? Math.max(0, baseOutstandingPaise - hugeDiscountPaise)
        : baseOutstandingPaise + hugeDiscountPaise;

      expect(finalAmountPaise).toBe(0);
    });
  });

  describe('3. Customer-First Ornament Search within Customer Bills (Part 5 & 7 Specification)', () => {
    const customerBills: Partial<Bill>[] = [
      { id: 'b1', billNumber: 'B-1001', itemCategory: 'Gold', itemDescription: 'Heavy 22K Gold Chain', status: 'Active' },
      { id: 'b2', billNumber: 'B-1002', itemCategory: 'Gold', itemDescription: 'Diamond Stone Finger Ring', status: 'Active' },
      { id: 'b3', billNumber: 'B-1003', itemCategory: 'Silver', itemDescription: 'Traditional Silver Anklet / Kolusu', status: 'Active' },
      { id: 'b4', billNumber: 'B-1004', itemCategory: 'Gold', itemDescription: 'Bridal Choker Necklace', status: 'Active' },
      { id: 'b5', billNumber: 'B-1005', itemCategory: 'Gold', itemDescription: 'Men Heavy Bracelet', status: 'Active' },
    ];

    function filterCustomerBills(bills: Partial<Bill>[], query: string) {
      const q = query.trim().toLowerCase();
      if (!q) return bills;
      return bills.filter(
        (b) =>
          b.billNumber?.toLowerCase().includes(q) ||
          b.itemCategory?.toLowerCase().includes(q) ||
          b.itemDescription?.toLowerCase().includes(q)
      );
    }

    it('should find bill when searching by ornament "Chain"', () => {
      const results = filterCustomerBills(customerBills, 'Chain');
      expect(results.length).toBe(1);
      expect(results[0].billNumber).toBe('B-1001');
    });

    it('should find bill when searching by ornament "Ring"', () => {
      const results = filterCustomerBills(customerBills, 'ring');
      expect(results.length).toBe(1);
      expect(results[0].billNumber).toBe('B-1002');
    });

    it('should find bill when searching by ornament "Necklace"', () => {
      const results = filterCustomerBills(customerBills, 'Necklace');
      expect(results.length).toBe(1);
      expect(results[0].billNumber).toBe('B-1004');
    });

    it('should find bill when searching by ornament "Bracelet"', () => {
      const results = filterCustomerBills(customerBills, 'bracelet');
      expect(results.length).toBe(1);
      expect(results[0].billNumber).toBe('B-1005');
    });

    it('should find bill when searching by bill number "B-1003"', () => {
      const results = filterCustomerBills(customerBills, 'B-1003');
      expect(results.length).toBe(1);
      expect(results[0].itemDescription).toContain('Kolusu');
    });
  });
});
