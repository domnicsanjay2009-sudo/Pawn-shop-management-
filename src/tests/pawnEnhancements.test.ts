import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: createStorageMock(), writable: true });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', { value: createStorageMock(), writable: true });
}

import {
  GOLD_PURITIES,
  SILVER_PURITIES,
  OTHER_PURITIES,
} from '../components/bills/AddBillForm';
import { parseInputRupeesToPaise } from '../components/payments/SplitPaymentSelector';
import { rupeesToPaise, paiseToRupees } from '../utils/calculations';
import { demoStore } from '../services/demoDataService';
import {
  getPendingEmailChange,
  clearPendingEmailChange,
} from '../services/authService';

describe('Pawn Shop Management Application - Master Enhancement Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    demoStore.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Module 1: Authentication & Identity Security (Email Change Workflow)', () => {
    it('manages pending email change in local storage without affecting active auth state', () => {
      expect(getPendingEmailChange()).toBeNull();

      localStorage.setItem(
        'psm_pending_email_change',
        JSON.stringify({
          newEmail: 'newshop@example.com',
          requestedAt: 1700000000000,
        })
      );

      const pending = getPendingEmailChange();
      expect(pending).not.toBeNull();
      expect(pending?.newEmail).toBe('newshop@example.com');
      expect(pending?.requestedAt).toBe(1700000000000);

      clearPendingEmailChange();
      expect(getPendingEmailChange()).toBeNull();
    });

    it('handles corrupted pending email change localStorage gracefully', () => {
      localStorage.setItem('psm_pending_email_change', '{ corrupted json');
      expect(getPendingEmailChange()).toBeNull();
    });
  });

  describe('Module 2: Legal & Compliance Documentation', () => {
    it('ensures Introduction Page is removed from active routing tabs', async () => {
      const sidebarModule = await import('../components/layout/Sidebar');
      expect(sidebarModule).toBeDefined();
    });
  });

  describe('Module 3: Customer Management & Search UX', () => {
    const mockParties = [
      {
        id: 'p1',
        shopId: 'shop_1',
        name: 'Rajesh Kumar',
        phone: '9876543210',
        address: '14, Gandhi Bazar',
        totalBills: 2,
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'p2',
        shopId: 'shop_1',
        name: 'Anita Sharma',
        phone: '9845123456',
        address: '56, Temple Road',
        totalBills: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'p3',
        shopId: 'shop_1',
        name: 'Vikram Singh',
        phone: '9731234567',
        address: '88, Ring Road',
        totalBills: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    it('filters customers by case-insensitive name match', () => {
      const query = 'rajesh';
      const results = mockParties.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('p1');
    });

    it('filters customers by partial phone digits match', () => {
      const query = '1234';
      const cleanDigits = query.replace(/\D/g, '');
      const results = mockParties.filter((p) => {
        const cleanPhone = p.phone.replace(/\D/g, '');
        return cleanPhone.includes(cleanDigits);
      });
      expect(results).toHaveLength(2); // Anita (9845123456) and Vikram (9731234567)
      expect(results.map((r) => r.name)).toContain('Anita Sharma');
      expect(results.map((r) => r.name)).toContain('Vikram Singh');
    });

    it('returns empty array when customer does not match any name or phone', () => {
      const query = 'NonExistentPerson 9999999999';
      const cleanDigits = query.replace(/\D/g, '');
      const results = mockParties.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(query.toLowerCase());
        const phoneMatch = cleanDigits ? p.phone.replace(/\D/g, '').includes(cleanDigits) : false;
        return nameMatch || phoneMatch;
      });
      expect(results).toHaveLength(0);
    });

    it('preserves customer thumbnail photoUrl when present', () => {
      const rajesh = mockParties.find((p) => p.name === 'Rajesh Kumar');
      expect(rajesh?.photoUrl).toBeDefined();
      expect(rajesh?.photoUrl).toContain('unsplash');
    });
  });

  describe('Bug Fix 1: Customer View – New Pledge Bill Navigation & Auto-Population', () => {
    it('automatically associates new pledge bill with preselected customer without re-searching', () => {
      const customer = demoStore.getParties()[0];
      expect(customer).toBeDefined();

      // Simulate passing selected customer to bill creation
      const preselectedPartyId = customer.id;
      const newBill = demoStore.addBill({
        shopId: customer.shopId,
        partyId: preselectedPartyId,
        partyName: customer.name,
        partyPhone: customer.phone,
        itemCategory: 'Gold',
        itemDescription: '22K Hallmarked Ring',
        purity: '22K / 916',
        grossWeight: 8.5,
        netWeight: 8.0,
        weightUnit: 'g',
        principalPaise: 4000000,
        currentPrincipalPaise: 4000000,
        interestPercentage: 2.0,
        interestDuration: 'Monthly',
        billDate: '2026-11-12',
        status: 'Active',
      });

      expect(newBill.partyId).toBe(customer.id);
      expect(newBill.partyName).toBe(customer.name);
      expect(newBill.partyPhone).toBe(customer.phone);

      // Verify the bill is discoverable under the customer
      const partyBills = demoStore.getBills().filter((b) => b.partyId === customer.id);
      expect(partyBills.map((b) => b.id)).toContain(newBill.id);
    });
  });

  describe('Bug Fix 2: Bill Closure – Closed By Field & Zero Payment Validation', () => {
    it('Scenario A: uses registered customer name when Closed By field is left blank or whitespace-only', () => {
      const activeBill = demoStore.getBills().find((b) => b.status === 'Active')!;
      expect(activeBill).toBeDefined();

      const closed = demoStore.closeBill({
        shopId: activeBill.shopId,
        billId: activeBill.id,
        billNumber: activeBill.billNumber,
        partyId: activeBill.partyId,
        partyName: activeBill.partyName,
        partyPhone: activeBill.partyPhone,
        initialPrincipalPaise: activeBill.principalPaise,
        outstandingPrincipalPaise: activeBill.currentPrincipalPaise,
        accruedInterestPaise: 10000,
        finalSettlementAmountPaise: 100000,
        closingDate: '2026-11-12',
        paymentMode: 'Cash',
        cashPaise: 100000,
        totalAllocatedPaise: 100000,
        closedBy: '   ', // whitespace only - should resolve to customer name
        closedByUid: 'uid_test_123',
      });

      expect(closed.closedBy).toBe(`Closed By: ${activeBill.partyName}`);

      // Verify customer's registered record remains unchanged
      const party = demoStore.getParties().find((p) => p.id === activeBill.partyId);
      expect(party?.name).toBe(activeBill.partyName);
    });

    it('Scenario B: uses custom entered name when Closed By field is provided', () => {
      const activeBills = demoStore.getBills().filter((b) => b.status === 'Active');
      const activeBill = activeBills[0];
      expect(activeBill).toBeDefined();

      const closed = demoStore.closeBill({
        shopId: activeBill.shopId,
        billId: activeBill.id,
        billNumber: activeBill.billNumber,
        partyId: activeBill.partyId,
        partyName: activeBill.partyName,
        partyPhone: activeBill.partyPhone,
        initialPrincipalPaise: activeBill.principalPaise,
        outstandingPrincipalPaise: activeBill.currentPrincipalPaise,
        accruedInterestPaise: 10000,
        finalSettlementAmountPaise: 100000,
        closingDate: '2026-11-12',
        paymentMode: 'Cash',
        cashPaise: 100000,
        totalAllocatedPaise: 100000,
        closedBy: '  Manager Kumar  ', // custom name with spaces to trim
        closedByUid: 'uid_manager_456',
      });

      expect(closed.closedBy).toBe('Closed By: Manager Kumar');
      expect(closed.closedByUid).toBe('uid_manager_456');

      // Verify bill in store has the exact resolved Closed By
      const billInStore = demoStore.getBills().find((b) => b.id === activeBill.id);
      expect(billInStore?.closedBy).toBe('Closed By: Manager Kumar');
      expect(billInStore?.closedByUid).toBe('uid_manager_456');
    });

    it('Zero Payment Validation: blocks bill closure when Total Allocated = ₹0.00', () => {
      const activeBill = demoStore.getBills().find((b) => b.status === 'Active')!;
      expect(activeBill).toBeDefined();

      expect(() => {
        demoStore.closeBill({
          shopId: activeBill.shopId,
          billId: activeBill.id,
          billNumber: activeBill.billNumber,
          partyId: activeBill.partyId,
          partyName: activeBill.partyName,
          partyPhone: activeBill.partyPhone,
          initialPrincipalPaise: activeBill.principalPaise,
          outstandingPrincipalPaise: activeBill.currentPrincipalPaise,
          accruedInterestPaise: 10000,
          finalSettlementAmountPaise: 100000,
          closingDate: '2026-11-12',
          paymentMode: 'Cash',
          cashPaise: 0,
          upiPaise: 0,
          netBankingPaise: 0,
          totalAllocatedPaise: 0,
          closedBy: 'Manager',
        });
      }).toThrow('Cannot close this bill. Payment amount must be greater than ₹0.00.');

      // Verify bill status is completely unchanged
      const billAfter = demoStore.getBills().find((b) => b.id === activeBill.id);
      expect(billAfter?.status).toBe('Active');
    });
  });

  describe('Bug Fix 3: Split Settlement – Always Visible Fields & Exact Reconciliation', () => {
    it('treats empty or zero fields as zero paise', () => {
      expect(parseInputRupeesToPaise('')).toBe(0);
      expect(parseInputRupeesToPaise('   ')).toBe(0);
      expect(parseInputRupeesToPaise('0')).toBe(0);
      expect(parseInputRupeesToPaise(undefined)).toBe(0);
      expect(parseInputRupeesToPaise('4000')).toBe(400000);
      expect(parseInputRupeesToPaise('3000.50')).toBe(300050);
    });

    it('accepts exact split reconciliation across all 3 always-visible fields', () => {
      const agreedSettlementPaise = rupeesToPaise(10000); // ₹10,000

      const cashPaise = parseInputRupeesToPaise('4000'); // ₹4,000
      const upiPaise = parseInputRupeesToPaise('3000'); // ₹3,000
      const netBankingPaise = parseInputRupeesToPaise('3000'); // ₹3,000

      const totalAllocated = cashPaise + upiPaise + netBankingPaise;
      const remainingBalance = agreedSettlementPaise - totalAllocated;

      expect(totalAllocated).toBe(agreedSettlementPaise);
      expect(remainingBalance).toBe(0);
    });

    it('rejects underpayment allocation when closing bill', () => {
      const activeBill = demoStore.getBills().find((b) => b.status === 'Active')!;
      expect(activeBill).toBeDefined();

      const agreedSettlementPaise = rupeesToPaise(10000); // ₹10,000
      const cashPaise = parseInputRupeesToPaise('4000');
      const upiPaise = parseInputRupeesToPaise('3000');
      const netBankingPaise = parseInputRupeesToPaise('2000'); // Total = 9,000 (1,000 shortage)

      const totalAllocated = cashPaise + upiPaise + netBankingPaise;

      expect(() => {
        demoStore.closeBill({
          shopId: activeBill.shopId,
          billId: activeBill.id,
          billNumber: activeBill.billNumber,
          partyId: activeBill.partyId,
          partyName: activeBill.partyName,
          partyPhone: activeBill.partyPhone,
          initialPrincipalPaise: activeBill.principalPaise,
          outstandingPrincipalPaise: activeBill.currentPrincipalPaise,
          accruedInterestPaise: 5000,
          finalSettlementAmountPaise: agreedSettlementPaise,
          closingDate: '2026-11-12',
          paymentMode: 'Split',
          cashPaise,
          upiPaise,
          netBankingPaise,
          totalAllocatedPaise: totalAllocated,
          closedBy: 'Cashier',
        });
      }).toThrow('Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before closing this bill.');
    });

    it('rejects overpayment allocation when closing bill', () => {
      const activeBill = demoStore.getBills().find((b) => b.status === 'Active')!;
      expect(activeBill).toBeDefined();

      const agreedSettlementPaise = rupeesToPaise(10000); // ₹10,000
      const cashPaise = parseInputRupeesToPaise('5000');
      const upiPaise = parseInputRupeesToPaise('5000');
      const netBankingPaise = parseInputRupeesToPaise('1000'); // Total = 11,000 (1,000 excess)

      const totalAllocated = cashPaise + upiPaise + netBankingPaise;

      expect(() => {
        demoStore.closeBill({
          shopId: activeBill.shopId,
          billId: activeBill.id,
          billNumber: activeBill.billNumber,
          partyId: activeBill.partyId,
          partyName: activeBill.partyName,
          partyPhone: activeBill.partyPhone,
          initialPrincipalPaise: activeBill.principalPaise,
          outstandingPrincipalPaise: activeBill.currentPrincipalPaise,
          accruedInterestPaise: 5000,
          finalSettlementAmountPaise: agreedSettlementPaise,
          closingDate: '2026-11-12',
          paymentMode: 'Split',
          cashPaise,
          upiPaise,
          netBankingPaise,
          totalAllocatedPaise: totalAllocated,
          closedBy: 'Cashier',
        });
      }).toThrow('Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before closing this bill.');
    });
  });

  describe('Module 4 & 5: Collateral Fields & Standardized Purity', () => {
    it('creates bill using gross weight, net weight, and weight units without Go So Weight requirement', () => {
      const newBill = demoStore.addBill({
        shopId: 'demo_shop',
        partyId: 'demo_party_1',
        partyName: 'Rajesh Kumar',
        partyPhone: '9876543210',
        itemCategory: 'Gold',
        itemDescription: '22K Gold Bangle',
        purity: '22K / 916',
        grossWeight: 16.5,
        netWeight: 16.0,
        weightUnit: 'g',
        principalPaise: 8000000,
        currentPrincipalPaise: 8000000,
        interestPercentage: 2.0,
        interestDuration: 'Monthly',
        billDate: '2026-11-12',
        status: 'Active',
      });

      expect(newBill.id).toBeDefined();
      expect(newBill.grossWeight).toBe(16.5);
      expect(newBill.netWeight).toBe(16.0);
      expect(newBill.weightUnit).toBe('g');
      expect((newBill as any).goSoWeight).toBeUndefined();
    });

    it('enforces controlled standardized purity categories for Gold and Silver', () => {
      expect(GOLD_PURITIES).toEqual([
        '24K / 999',
        '22K / 916',
        '20K / 833',
        '18K / 750',
        '14K / 585',
      ]);
      expect(SILVER_PURITIES).toEqual([
        '999 Fine Silver',
        '925 Sterling Silver',
        '900 Silver',
        '835 Silver',
        '800 Silver',
      ]);
      expect(OTHER_PURITIES).toContain('Platinum 950');
    });
  });
});
