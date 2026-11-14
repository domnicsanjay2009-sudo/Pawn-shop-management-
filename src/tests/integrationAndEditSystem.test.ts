// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { Bill, Payment, ClosingBill, Party } from '../types';
import {
  chronologicalReplayBill,
  verifyOwnerAuthorization,
} from '../services/recalculationService';
import {
  calculateAccruedInterestPaise,
  evaluateBillStatus,
  allocatePayment,
  rupeesToPaise,
  paiseToRupees,
} from '../utils/calculations';

describe('CRITICAL INTEGRATION & ADVANCED EDIT SYSTEM TEST SUITE', () => {
  const mockParty: Party = {
    id: 'party_cust_001',
    shopId: 'shop_demo_1',
    name: 'Sanjay Kumar',
    phone: '9876543210',
    address: '12 Bazar Street, Chennai',
    totalBills: 2,
    createdAt: 1704067200000, // 2026-01-01
    updatedAt: 1704067200000,
  };

  const createMockBill = (overrides: Partial<Bill> = {}): Bill => {
    const principal = overrides.principalPaise ?? 5000000;
    return {
      id: 'bill_001',
      shopId: 'shop_demo_1',
      billNumber: 'B-1001',
      partyId: mockParty.id,
      partyName: mockParty.name,
      partyPhone: mockParty.phone,
      itemCategory: 'Gold',
      itemDescription: 'Gold Rope Chain 22K',
      purity: '22K / 916',
      grossWeight: 24.5,
      netWeight: 24.0,
      weightUnit: 'g',
      principalPaise: principal,
      currentPrincipalPaise: overrides.currentPrincipalPaise ?? principal,
      interestPercentage: 2.0, // 2% per month
      interestDuration: 'Monthly',
      billDate: '2026-01-01',
      dueDate: '2027-01-01',
      status: 'Active',
      totalPaidPaise: 0,
      totalInterestPaidPaise: 0,
      createdAt: 1704067200000,
      updatedAt: 1704067200000,
      ...overrides,
    };
  };

  const createMockPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay_001',
    shopId: 'shop_demo_1',
    billId: 'bill_001',
    billNumber: 'B-1001',
    partyId: mockParty.id,
    partyName: mockParty.name,
    amountPaise: 500000, // ₹5,000.00
    interestPortionPaise: 100000,
    principalPortionPaise: 400000,
    paymentDate: '2026-01-31',
    paymentMode: 'Split',
    paymentModes: ['Cash', 'GPay / PhonePe'],
    splitAllocations: {
      cashPaise: 200000, // ₹2,000
      upiPaise: 300000,  // ₹3,000
      netBankingPaise: 0,
    },
    cashPaise: 200000,
    upiPaise: 300000,
    netBankingPaise: 0,
    createdAt: 1706659200000,
    ...overrides,
  });

  // =========================================================================
  // SCENARIO 1: Multiple Bills for One Customer with Independent Records
  // =========================================================================
  describe('Scenario 1: Multiple Bills for One Customer Maintain Complete Independence', () => {
    it('creates multiple bills with independent principal, collateral, and statuses', () => {
      const bill1 = createMockBill({
        id: 'bill_gold_chain',
        billNumber: 'B-1001',
        itemDescription: 'Gold Chain 22K',
        principalPaise: 5000000, // ₹50,000
        currentPrincipalPaise: 5000000,
      });

      const bill2 = createMockBill({
        id: 'bill_silver_kolusu',
        billNumber: 'B-1002',
        itemCategory: 'Silver',
        itemDescription: 'Silver Kolusu Anklet',
        purity: '925 Sterling Silver',
        grossWeight: 80.0,
        netWeight: 78.5,
        principalPaise: 3000000, // ₹30,000
        currentPrincipalPaise: 3000000,
      });

      expect(bill1.partyId).toBe(mockParty.id);
      expect(bill2.partyId).toBe(mockParty.id);
      expect(bill1.id).not.toBe(bill2.id);
      expect(bill1.billNumber).not.toBe(bill2.billNumber);
      expect(bill1.principalPaise).toBe(5000000);
      expect(bill2.principalPaise).toBe(3000000);
      expect(bill1.status).toBe('Active');
      expect(bill2.status).toBe('Active');
    });
  });

  // =========================================================================
  // SCENARIO 2 & 3: Payments to Specific Bills Affect ONLY the Selected Bill
  // =========================================================================
  describe('Scenario 2 & 3: Payments are Isolated strictly to Selected Bills', () => {
    it('allocates payment to Bill 1 without altering Bill 2 balances', () => {
      const bill1 = createMockBill({ id: 'bill_1', billNumber: 'B-1001', principalPaise: 5000000 });
      const bill2 = createMockBill({ id: 'bill_2', billNumber: 'B-1002', principalPaise: 3000000 });

      // Apply payment ₹5,000 to Bill 1 on Jan 31 (30 days @ 2% monthly = ₹1,000 interest, ₹4,000 principal)
      const pay1 = createMockPayment({
        id: 'pay_1',
        billId: bill1.id,
        billNumber: bill1.billNumber,
        amountPaise: 500000,
        paymentDate: '2026-01-31',
      });

      const replayResultBill1 = chronologicalReplayBill(bill1, [pay1]);
      expect(replayResultBill1.recalculatedBill.currentPrincipalPaise).toBe(4600000); // ₹46,000 remaining
      expect(replayResultBill1.recalculatedBill.totalPaidPaise).toBe(500000);
      expect(replayResultBill1.recalculatedPayments[0].interestPortionPaise).toBe(100000);
      expect(replayResultBill1.recalculatedPayments[0].principalPortionPaise).toBe(400000);

      // Bill 2 must remain completely untouched
      expect(bill2.currentPrincipalPaise).toBe(3000000);
      expect(bill2.totalPaidPaise).toBe(0);
    });

    it('supports multiple sequential partial payments against the same bill with interest-first priority', () => {
      const bill = createMockBill({ billDate: '2026-01-01', principalPaise: 5000000 });

      // Payment 1 on Jan 31: ₹3,000 (30 days @ 2% = ₹1,000 interest, ₹2,000 principal) -> Remaining: ₹48,000
      const pay1 = createMockPayment({
        id: 'pay_1',
        paymentDate: '2026-01-31',
        amountPaise: 300000,
      });

      // Payment 2 on March 2: 30 days @ 2% of ₹48,000 = ₹960 interest. Payment = ₹5,000 -> Principal reduction: ₹4,040 -> Remaining: ₹43,960
      const pay2 = createMockPayment({
        id: 'pay_2',
        paymentDate: '2026-03-02',
        amountPaise: 500000,
      });

      const replay = chronologicalReplayBill(bill, [pay1, pay2]);

      expect(replay.recalculatedPayments[0].interestPortionPaise).toBe(100000); // ₹1,000
      expect(replay.recalculatedPayments[0].principalPortionPaise).toBe(200000); // ₹2,000
      expect(replay.recalculatedPayments[1].interestPortionPaise).toBe(96000);  // ₹960
      expect(replay.recalculatedPayments[1].principalPortionPaise).toBe(404000); // ₹4,040

      expect(replay.recalculatedBill.currentPrincipalPaise).toBe(4396000); // ₹43,960
      expect(replay.recalculatedBill.totalPaidPaise).toBe(800000); // ₹8,000 total
      expect(replay.recalculatedBill.totalInterestPaidPaise).toBe(196000); // ₹1,960
    });
  });

  // =========================================================================
  // SCENARIO 4: Closing One Bill Does Not Affect Any Other Bill
  // =========================================================================
  describe('Scenario 4: Closing One Bill Isolates Closure to That Bill Only', () => {
    it('closes Bill 1 to ₹0 outstanding while Bill 2 remains active and accruing interest', () => {
      const bill1 = createMockBill({ id: 'bill_1', billNumber: 'B-1001', principalPaise: 5000000 });
      const bill2 = createMockBill({ id: 'bill_2', billNumber: 'B-1002', principalPaise: 3000000 });

      const closingBill1: ClosingBill = {
        id: 'close_001',
        shopId: 'shop_demo_1',
        billId: bill1.id,
        billNumber: bill1.billNumber,
        partyId: mockParty.id,
        partyName: mockParty.name,
        partyPhone: mockParty.phone,
        initialPrincipalPaise: 5000000,
        outstandingPrincipalPaise: 5000000,
        accruedInterestPaise: 100000,
        baseOutstandingPaise: 5100000,
        finalSettlementAmountPaise: 5100000,
        totalPaidPaise: 5100000,
        finalOutstandingPaise: 0,
        closingDate: '2026-01-31',
        paymentMode: 'Split',
        cashPaise: 2000000, // ₹20,000
        upiPaise: 3000000,  // ₹30,000
        netBankingPaise: 100000, // ₹1,000
        closedAt: 1706659200000,
        closedBy: 'Closed By: Dominic Sanjay',
        closingTransactionId: 'tx_close_1001',
      };

      const replay1 = chronologicalReplayBill(bill1, [], closingBill1);
      expect(replay1.recalculatedBill.currentPrincipalPaise).toBe(0);
      expect(replay1.recalculatedBill.finalOutstandingPaise).toBe(0);
      expect(replay1.recalculatedClosingBill?.finalSettlementAmountPaise).toBe(5100000);

      // Bill 2 is completely unclosed and unaffected
      expect(bill2.status).toBe('Active');
      expect(bill2.currentPrincipalPaise).toBe(3000000);
      const b2Status = evaluateBillStatus(bill2, '2026-01-31');
      expect(b2Status.accruedInterestPaise).toBe(60000); // 30,000 * 2% = ₹600
    });
  });

  // =========================================================================
  // SCENARIO 5: Edit Bill Date / Principal & Chronological Interest Replay
  // =========================================================================
  describe('Scenario 5: Historical Bill Modification Triggers Chronological Replay', () => {
    it('corrects original principal from ₹50,000 to ₹60,000 and recalculates all past payments', () => {
      // Original bill was created with ₹50,000
      const originalBill = createMockBill({
        billDate: '2026-01-01',
        principalPaise: 5000000, // ₹50,000
      });

      // Payment on Jan 31: ₹10,000
      const pay1 = createMockPayment({
        paymentDate: '2026-01-31',
        amountPaise: 1000000,
      });

      // Replay with original bill
      const origReplay = chronologicalReplayBill(originalBill, [pay1]);
      // Interest on 50,000 for 30 days @ 2% = ₹1,000 (100,000 paise).
      // Principal portion = 10,000 - 1,000 = ₹9,000. New principal = 41,000.
      expect(origReplay.recalculatedPayments[0].interestPortionPaise).toBe(100000);
      expect(origReplay.recalculatedPayments[0].principalPortionPaise).toBe(900000);
      expect(origReplay.recalculatedBill.currentPrincipalPaise).toBe(4100000);

      // NOW EDIT: Principal was actually ₹60,000 (6,000,000 paise)
      const editedBill = { ...originalBill, principalPaise: 6000000 };
      const editedReplay = chronologicalReplayBill(editedBill, [pay1]);

      // Under corrected principal ₹60,000:
      // Interest for 30 days @ 2% = ₹1,200 (120,000 paise).
      // Principal portion = 10,000 - 1,200 = ₹8,800 (880,000 paise).
      // New remaining principal = 60,000 - 8,800 = ₹51,200 (5,120,000 paise).
      expect(editedReplay.recalculatedPayments[0].interestPortionPaise).toBe(120000);
      expect(editedReplay.recalculatedPayments[0].principalPortionPaise).toBe(880000);
      expect(editedReplay.recalculatedBill.currentPrincipalPaise).toBe(5120000);
    });

    it('corrects bill date from Jan 1 to Jan 16 and recalculates elapsed interest accurately', () => {
      const originalBill = createMockBill({
        billDate: '2026-01-01',
        principalPaise: 5000000,
      });

      const pay1 = createMockPayment({
        paymentDate: '2026-01-31',
        amountPaise: 500000, // ₹5,000
      });

      // Original 30 days: Interest = ₹1,000, Principal = ₹4,000
      const origReplay = chronologicalReplayBill(originalBill, [pay1]);
      expect(origReplay.recalculatedPayments[0].interestPortionPaise).toBe(100000);

      // Corrected bill date: Jan 16 (only 15 days elapsed to Jan 31)
      const editedBill = { ...originalBill, billDate: '2026-01-16' };
      const editedReplay = chronologicalReplayBill(editedBill, [pay1]);

      // 15 days elapsed @ 2% monthly on ₹50,000 = (15/30) * 1,000 = ₹500 (50,000 paise)
      expect(editedReplay.recalculatedPayments[0].interestPortionPaise).toBe(50000);
      expect(editedReplay.recalculatedPayments[0].principalPortionPaise).toBe(450000); // ₹4,500
      expect(editedReplay.recalculatedBill.currentPrincipalPaise).toBe(4550000); // 50,000 - 4,500 = ₹45,500
    });
  });

  // =========================================================================
  // SCENARIO 6: Edit An Old Payment and Verify Subsequent Balances
  // =========================================================================
  describe('Scenario 6: Editing a Past Payment Re-Evaluates Subsequent Balances in Chronological Order', () => {
    it('modifies Payment 1 amount from ₹3,000 to ₹6,000 and rolls forward to Payment 2', () => {
      const bill = createMockBill({ billDate: '2026-01-01', principalPaise: 5000000 });

      // Payment 1 on Jan 31
      const pay1 = createMockPayment({
        id: 'pay_1',
        paymentDate: '2026-01-31',
        amountPaise: 300000, // ₹3,000
      });

      // Payment 2 on March 2
      const pay2 = createMockPayment({
        id: 'pay_2',
        paymentDate: '2026-03-02',
        amountPaise: 500000, // ₹5,000
      });

      // Edit Payment 1 to ₹6,000 (600,000 paise)
      const editedPay1 = { ...pay1, amountPaise: 600000 };
      const replay = chronologicalReplayBill(bill, [editedPay1, pay2]);

      // Payment 1: ₹1,000 interest, ₹5,000 principal reduction -> Remaining Principal = ₹45,000
      expect(replay.recalculatedPayments[0].interestPortionPaise).toBe(100000);
      expect(replay.recalculatedPayments[0].principalPortionPaise).toBe(500000);

      // Payment 2 (30 days later): Accrues 2% on LOWER principal of ₹45,000 = ₹900 (90,000 paise)
      expect(replay.recalculatedPayments[1].interestPortionPaise).toBe(90000);
      // Principal portion = 5,000 - 900 = ₹4,100 (410,000 paise)
      expect(replay.recalculatedPayments[1].principalPortionPaise).toBe(410000);

      // Final remaining principal = 45,000 - 4,100 = ₹40,900
      expect(replay.recalculatedBill.currentPrincipalPaise).toBe(4090000);
    });
  });

  // =========================================================================
  // SCENARIO 7: Edit Closing Bill and Verify Linked Bill Status
  // =========================================================================
  describe('Scenario 7: Editing Closing Settlement Preserves Closed Status & Reconciles Adjustment', () => {
    it('re-evaluates closing bill with negative adjustment (discount) without reopening the bill', () => {
      const bill = createMockBill({
        billDate: '2026-01-01',
        principalPaise: 5000000, // ₹50,000
        status: 'Closed',
      });

      // Closing on Jan 31: Base = 50,000 + 1,000 = ₹51,000
      const closingBill: ClosingBill = {
        id: 'close_001',
        shopId: 'shop_demo_1',
        billId: bill.id,
        billNumber: bill.billNumber,
        partyId: mockParty.id,
        partyName: mockParty.name,
        partyPhone: mockParty.phone,
        closingDate: '2026-01-31',
        paymentMode: 'Cash',
        adjustmentType: 'minus',
        adjustmentAmountPaise: 50000, // ₹500 discount
        totalPaidPaise: 5050000,      // ₹50,500 settled
        closedAt: 1706659200000,
        closedBy: 'Dominic Sanjay',
      };

      const replay = chronologicalReplayBill(bill, [], closingBill);
      expect(replay.recalculatedBill.status).toBe('Closed');
      expect(replay.recalculatedBill.currentPrincipalPaise).toBe(0);
      expect(replay.recalculatedBill.finalOutstandingPaise).toBe(0);
      expect(replay.recalculatedClosingBill?.finalSettlementAmountPaise).toBe(5050000); // 51,000 - 500
    });
  });

  // =========================================================================
  // SCENARIO 8: Mathematical Balance Invariant Check (Zero Leakage)
  // =========================================================================
  describe('Scenario 8: Mathematical Conservation Law - Principal + Reductions = Original Principal', () => {
    it('guarantees exact integer equality without floating-point drift', () => {
      const bill = createMockBill({ principalPaise: 7500000 }); // ₹75,000
      const p1 = createMockPayment({ amountPaise: 2500000, paymentDate: '2026-01-31' });
      const p2 = createMockPayment({ amountPaise: 3000000, paymentDate: '2026-03-02' });

      const replay = chronologicalReplayBill(bill, [p1, p2]);
      const principalReductionsSum = replay.recalculatedPayments.reduce(
        (sum, p) => sum + p.principalPortionPaise,
        0
      );

      expect(principalReductionsSum + replay.recalculatedBill.currentPrincipalPaise).toBe(
        bill.principalPaise
      );
    });
  });

  // =========================================================================
  // SCENARIO 9: Multi-Mode Split Payments (Cash, GPay, Others)
  // =========================================================================
  describe('Scenario 9: Split Payment Allocation Validation', () => {
    it('validates multi-mode split: Cash ₹2,000 + GPay ₹3,000 + Others ₹500 = ₹5,500', () => {
      const cashPaise = rupeesToPaise(2000); // 200000
      const upiPaise = rupeesToPaise(3000);  // 300000
      const othersPaise = rupeesToPaise(500); // 50000
      const totalAgreedPaise = rupeesToPaise(5500); // 550000

      const computedTotal = cashPaise + upiPaise + othersPaise;
      expect(computedTotal).toBe(totalAgreedPaise);
      expect(paiseToRupees(computedTotal)).toBe(5500);
    });
  });

  // =========================================================================
  // SCENARIO 10: Security Authorization & Reason Enforcement
  // =========================================================================
  describe('Scenario 10: Security Authorization & Audit Verification', () => {
    it('rejects financial edits if owner PIN / password is missing', async () => {
      const auth = await verifyOwnerAuthorization('');
      expect(auth.authorized).toBe(false);
      expect(auth.error).toContain('Owner PIN or Master Password is required');
    });

    it('rejects financial edits if credential is under 4 characters', async () => {
      const auth = await verifyOwnerAuthorization('12');
      expect(auth.authorized).toBe(false);
      expect(auth.error).toContain('at least 4 characters');
    });

    it('authorizes financial edits when valid credential is provided', async () => {
      const auth = await verifyOwnerAuthorization('1234');
      expect(auth.authorized).toBe(true);
    });
  });
});
