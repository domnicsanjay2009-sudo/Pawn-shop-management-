import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  getDaysDifference,
  getElapsedPeriods,
  calculateAccruedInterestPaise,
  evaluateBillStatus,
  allocatePayment
} from '../utils/calculations';
import { Bill } from '../types';

describe('Financial Math & Currency Converters', () => {
  it('correctly converts Rupees to integer Paise', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(1999)).toBe(199900);
    expect(rupeesToPaise(2999.50)).toBe(299950);
    expect(rupeesToPaise('450.75')).toBe(45075);
  });

  it('correctly converts Paise to Rupees', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(199900)).toBe(1999);
    expect(paiseToRupees(299950)).toBe(2999.5);
  });

  it('calculates calendar day differences accurately', () => {
    expect(getDaysDifference('2026-01-01', '2026-01-31')).toBe(30);
    expect(getDaysDifference('2026-01-01', '2026-01-01')).toBe(0);
    expect(getDaysDifference('2026-01-10', '2026-01-01')).toBe(0); // non-negative
  });
});

describe('Simple Interest Calculations with Pro-Rated Days', () => {
  it('calculates monthly interest accurately for 30 days', () => {
    // Principal: ₹10,000 (1,000,000 paise)
    // Rate: 2.0% per month
    // 30 days elapsed = exactly 1 month
    // Expected Interest: ₹200 (20,000 paise)
    const interest = calculateAccruedInterestPaise(
      1000000,
      2.0,
      'Monthly',
      '2026-01-01',
      '2026-01-31'
    );
    expect(interest).toBe(20000);
  });

  it('calculates pro-rated monthly interest for 15 days', () => {
    // Principal: ₹10,000 (1,000,000 paise)
    // Rate: 2.0% per month
    // 15 days elapsed = 0.5 month
    // Expected Interest: ₹100 (10,000 paise)
    const interest = calculateAccruedInterestPaise(
      1000000,
      2.0,
      'Monthly',
      '2026-01-01',
      '2026-01-16'
    );
    expect(interest).toBe(10000);
  });

  it('calculates yearly interest pro-rated accurately', () => {
    // Principal: ₹100,000 (10,000,000 paise)
    // Rate: 12.0% per year
    // 365 days elapsed = 1 year
    // Expected Interest: ₹12,000 (1,200,000 paise)
    const interest = calculateAccruedInterestPaise(
      10000000,
      12.0,
      'Yearly',
      '2025-01-01',
      '2026-01-01'
    );
    expect(interest).toBe(1200000);
  });
});

describe('Payment Allocation Logic', () => {
  const dummyBill: Bill = {
    id: 'b-1',
    shopId: 'shop-1',
    billNumber: 'PSM-101',
    partyId: 'p-1',
    partyName: 'Rajesh Sharma',
    partyPhone: '9876543210',
    itemCategory: 'Gold',
    itemDescription: '22K Gold Chain',
    grossWeight: 20,
    netWeight: 19.5,
    weightUnit: 'g',
    principalPaise: 5000000, // ₹50,000
    currentPrincipalPaise: 5000000, // ₹50,000
    interestPercentage: 2.0, // 2% per month
    interestDuration: 'Monthly',
    billDate: '2026-01-01',
    status: 'Active',
    totalPaidPaise: 0,
    totalInterestPaidPaise: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('allocates partial payment to accrued interest when amount <= interest', () => {
    // On 2026-01-31 (30 days), interest on ₹50,000 at 2% is ₹1,000 (100,000 paise)
    // Customer pays ₹600 (60,000 paise)
    const result = allocatePayment(dummyBill, 60000, '2026-01-31');
    expect(result.interestPortionPaise).toBe(60000);
    expect(result.principalPortionPaise).toBe(0);
    expect(result.newRemainingPrincipalPaise).toBe(5000000); // principal unchanged
    expect(result.unpaidInterestRemainingPaise).toBe(40000); // ₹400 remaining interest
  });

  it('settles interest first and reduces principal with surplus payment', () => {
    // On 2026-01-31 (30 days), interest is ₹1,000 (100,000 paise)
    // Customer pays ₹11,000 (1,100,000 paise)
    const result = allocatePayment(dummyBill, 1100000, '2026-01-31');
    expect(result.interestPortionPaise).toBe(100000); // ₹1,000 to interest
    expect(result.principalPortionPaise).toBe(1000000); // ₹10,000 to principal
    expect(result.newRemainingPrincipalPaise).toBe(4000000); // ₹40,000 new principal
    expect(result.unpaidInterestRemainingPaise).toBe(0);
  });
});
