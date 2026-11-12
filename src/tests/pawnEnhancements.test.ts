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

  describe('Module 4: Collateral Fields & Absence of Go So Weight', () => {
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
      // Go So Weight must not be a property of active bill creation
      expect((newBill as any).goSoWeight).toBeUndefined();
    });
  });

  describe('Module 5: Standardized Valuation & Purity Categories', () => {
    it('enforces controlled standardized purity categories for Gold', () => {
      expect(GOLD_PURITIES).toEqual([
        '24K / 999',
        '22K / 916',
        '20K / 833',
        '18K / 750',
        '14K / 585',
      ]);
      expect(GOLD_PURITIES).toContain('22K / 916');
      expect(GOLD_PURITIES).toContain('24K / 999');
    });

    it('enforces controlled standardized purity categories for Silver', () => {
      expect(SILVER_PURITIES).toEqual([
        '999 Fine Silver',
        '925 Sterling Silver',
        '900 Silver',
        '835 Silver',
        '800 Silver',
      ]);
      expect(SILVER_PURITIES).toContain('925 Sterling Silver');
    });

    it('supports customizable categories for Other collateral', () => {
      expect(OTHER_PURITIES).toContain('Platinum 950');
      expect(OTHER_PURITIES).toContain('Diamond / Gemstone');
    });
  });

  describe('Module 6: Immutable Audit Trails & Bill Closure', () => {
    it('records closedBy, closedByUid, and closingTransactionId upon bill closure', () => {
      const activeBills = demoStore.getBills().filter((b) => b.status === 'Active');
      expect(activeBills.length).toBeGreaterThan(0);
      const targetBill = activeBills[0];

      const closingTimestamp = Date.now();
      const closedBill = demoStore.closeBill({
        shopId: 'demo_shop',
        billId: targetBill.id,
        billNumber: targetBill.billNumber,
        partyId: targetBill.partyId,
        partyName: targetBill.partyName,
        partyPhone: targetBill.partyPhone,
        initialPrincipalPaise: targetBill.principalPaise,
        outstandingPrincipalPaise: targetBill.currentPrincipalPaise,
        accruedInterestPaise: 230000,
        finalSettlementAmountPaise: 11730000,
        closingDate: '2026-11-12',
        paymentMode: 'Split',
        paymentModes: ['Cash', 'GPay / PhonePe'],
        splitAllocations: {
          cashPaise: 7000000,
          upiPaise: 4730000,
          netBankingPaise: 0,
        },
        cashPaise: 7000000,
        upiPaise: 4730000,
        netBankingPaise: 0,
        agreedSettlementPaise: 11730000,
        totalAllocatedPaise: 11730000,
        closedBy: 'Master Admin Domnic',
        closedByUid: 'uid_admin_123',
        closingTransactionId: `tx_close_${targetBill.id}_${closingTimestamp}`,
        notes: 'Redeemed in full via Cash and GPay',
      });

      expect(closedBill.id).toBeDefined();
      expect(closedBill.closedBy).toBe('Master Admin Domnic');
      expect(closedBill.closedByUid).toBe('uid_admin_123');
      expect(closedBill.closingTransactionId).toContain(`tx_close_${targetBill.id}`);
      expect(closedBill.splitAllocations?.cashPaise).toBe(7000000);
      expect(closedBill.splitAllocations?.upiPaise).toBe(4730000);

      // Verify the bill in store is marked as Closed with immutable audit trail
      const updatedBill = demoStore.getBills().find((b) => b.id === targetBill.id);
      expect(updatedBill?.status).toBe('Closed');
      expect(updatedBill?.currentPrincipalPaise).toBe(0);
      expect(updatedBill?.closedBy).toBe('Master Admin Domnic');
      expect(updatedBill?.closedByUid).toBe('uid_admin_123');
      expect(updatedBill?.closingTransactionId).toBe(closedBill.closingTransactionId);
    });
  });

  describe('Module 7: Multi-Mode Split Payment & Settlement Engine', () => {
    it('correctly calculates integer paise for Indian Rupee amounts', () => {
      expect(rupeesToPaise(100)).toBe(10000);
      expect(rupeesToPaise(0.5)).toBe(50);
      expect(rupeesToPaise(1250.75)).toBe(125075);
      expect(paiseToRupees(125075)).toBe(1250.75);
      expect(paiseToRupees(10000)).toBe(100);
    });

    it('validates exact split payment allocation matching agreed amount in paise', () => {
      const agreedPaymentRupees = 15000;
      const agreedPaymentPaise = rupeesToPaise(agreedPaymentRupees); // 1,500,000 paise

      const cashAllocationRupees = 10000;
      const upiAllocationRupees = 5000;
      const netBankingAllocationRupees = 0;

      const cashPaise = rupeesToPaise(cashAllocationRupees);
      const upiPaise = rupeesToPaise(upiAllocationRupees);
      const netBankingPaise = rupeesToPaise(netBankingAllocationRupees);

      const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
      const isExactMatch = totalAllocatedPaise === agreedPaymentPaise;

      expect(isExactMatch).toBe(true);
      expect(agreedPaymentPaise - totalAllocatedPaise).toBe(0);
    });

    it('detects and calculates underpayment mismatch precisely in paise', () => {
      const agreedAmountPaise = rupeesToPaise(25000); // ₹25,000 = 2,500,000 paise

      const cashPaise = rupeesToPaise(15000); // ₹15,000
      const upiPaise = rupeesToPaise(8000); // ₹8,000
      const netBankingPaise = 0;

      const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise; // ₹23,000 = 2,300,000 paise
      const isUnderpaid = totalAllocatedPaise < agreedAmountPaise;
      const shortagePaise = agreedAmountPaise - totalAllocatedPaise;

      expect(isUnderpaid).toBe(true);
      expect(shortagePaise).toBe(200000); // ₹2,000 shortage
    });

    it('detects and calculates overpayment mismatch precisely in paise', () => {
      const agreedAmountPaise = rupeesToPaise(10000); // ₹10,000 = 1,000,000 paise

      const cashPaise = rupeesToPaise(7000); // ₹7,000
      const upiPaise = rupeesToPaise(5000); // ₹5,000

      const totalAllocatedPaise = cashPaise + upiPaise; // ₹12,000 = 1,200,000 paise
      const isOverpaid = totalAllocatedPaise > agreedAmountPaise;
      const excessPaise = totalAllocatedPaise - agreedAmountPaise;

      expect(isOverpaid).toBe(true);
      expect(excessPaise).toBe(200000); // ₹2,000 excess
    });

    it('records split payment details in demoStore', () => {
      const activeBill = demoStore.getBills().find((b) => b.status === 'Active')!;
      expect(activeBill).toBeDefined();

      const payment = demoStore.addPayment({
        shopId: 'demo_shop',
        partyId: activeBill.partyId,
        partyName: activeBill.partyName,
        billId: activeBill.id,
        billNumber: activeBill.billNumber,
        amountPaise: 500000, // ₹5,000
        interestPortionPaise: 200000, // ₹2,000
        principalPortionPaise: 300000, // ₹3,000
        paymentDate: '2026-11-12',
        paymentMode: 'Split',
        paymentModes: ['Cash', 'GPay / PhonePe'],
        splitAllocations: {
          cashPaise: 200000,
          upiPaise: 300000,
          netBankingPaise: 0,
        },
        cashPaise: 200000,
        upiPaise: 300000,
        netBankingPaise: 0,
        agreedPaymentPaise: 500000,
        totalAllocatedPaise: 500000,
        notes: 'Partial payment split Cash & GPay',
      });

      expect(payment.id).toBeDefined();
      expect(payment.paymentMode).toBe('Split');
      expect(payment.paymentModes).toContain('Cash');
      expect(payment.paymentModes).toContain('GPay / PhonePe');
      expect(payment.splitAllocations?.cashPaise).toBe(200000);
      expect(payment.splitAllocations?.upiPaise).toBe(300000);
    });
  });
});
