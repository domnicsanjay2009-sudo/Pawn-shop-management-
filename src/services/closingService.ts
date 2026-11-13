import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ClosingBill, PaymentMode, Bill, PaymentModeAllocation } from '../types';
import { evaluateBillStatus } from '../utils/calculations';

const CLOSING_COLLECTION = 'closing_bills';
const BILLS_COLLECTION = 'bills';

export interface CloseBillInput {
  billId: string;
  partyId: string;
  closingDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  notes?: string;
  finalSettlementAmountPaise?: number; // optional override if agreed with customer
  baseOutstandingPaise?: number;
  adjustmentType?: 'plus' | 'minus';
  adjustmentAmountPaise?: number;
  paymentModes?: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[];
  splitAllocations?: PaymentModeAllocation;
  cashPaise?: number;
  upiPaise?: number;
  netBankingPaise?: number;
  agreedSettlementPaise?: number;
  totalAllocatedPaise?: number;
  totalPaidPaise?: number;
  finalOutstandingPaise?: number;
  closedBy?: string;
  closedByUid?: string;
  closedByRole?: 'owner' | 'staff' | 'admin' | 'authorized_user';
  closingTransactionId?: string;
}

export async function closeBill(
  shopId: string,
  input: CloseBillInput
): Promise<{ success: boolean; closingBill?: ClosingBill; error?: string }> {
  try {
    const billRef = doc(db, BILLS_COLLECTION, input.billId);

    return await runTransaction(db, async (transaction) => {
      const billSnap = await transaction.get(billRef);
      if (!billSnap.exists()) {
        throw new Error('Bill not found');
      }

      const bill = { id: billSnap.id, ...billSnap.data() } as Bill;
      if (bill.shopId !== shopId) {
        throw new Error('Unauthorized bill access');
      }

      if (bill.partyId !== input.partyId) {
        throw new Error('Cannot close bill against an unrelated party');
      }

      if (bill.status === 'Closed') {
        throw new Error('This bill is already closed');
      }

      // Formula: Total Paid = Cash + GPay/PhonePe + Net Banking
      const computedTotalPaid = (input.cashPaise || 0) + (input.upiPaise || 0) + (input.netBankingPaise || 0);
      const totalPaid = input.totalPaidPaise !== undefined
        ? input.totalPaidPaise
        : (input.totalAllocatedPaise !== undefined ? input.totalAllocatedPaise : computedTotalPaid);

      // Strict Zero Payment Validation: Total Paid must be greater than ₹0.00
      if (totalPaid <= 0) {
        throw new Error('Cannot close this bill. Please enter a valid payment amount.');
      }

      const financialStatus = evaluateBillStatus(bill, input.closingDate);
      const basePayable = input.baseOutstandingPaise !== undefined
        ? input.baseOutstandingPaise
        : (financialStatus.totalPayablePaise + (bill.lateInterestFeesPaise || 0) + (bill.lateClosingBillFeesPaise || 0));

      let expectedSettlement = input.finalSettlementAmountPaise !== undefined
        ? input.finalSettlementAmountPaise
        : (input.agreedSettlementPaise !== undefined ? input.agreedSettlementPaise : basePayable);

      if (input.adjustmentType === 'plus' && input.adjustmentAmountPaise) {
        expectedSettlement = basePayable + input.adjustmentAmountPaise;
      } else if (input.adjustmentType === 'minus' && input.adjustmentAmountPaise) {
        expectedSettlement = Math.max(0, basePayable - input.adjustmentAmountPaise);
      }

      // Settlement Reconciliation
      if (totalPaid < expectedSettlement) {
        const remaining = expectedSettlement - totalPaid;
        throw new Error(`Payment is insufficient! Remaining outstanding: ₹${(remaining / 100).toFixed(2)}. Please allocate the full settlement amount before closing.`);
      }

      if (totalPaid > expectedSettlement) {
        const excess = totalPaid - expectedSettlement;
        throw new Error(`Overpayment detected! Total paid exceeds the agreed settlement balance by ₹${(excess / 100).toFixed(2)}. Please adjust payment amounts.`);
      }

      // Accurate Audit Logging - Closed By Attribution (NEVER default to customer)
      let resolvedClosedBy = (input.closedBy || '').trim();
      let resolvedRole: 'owner' | 'staff' | 'admin' | 'authorized_user' = input.closedByRole || 'authorized_user';

      if (!resolvedClosedBy) {
        resolvedClosedBy = 'Closed By: Authorized User';
        resolvedRole = 'authorized_user';
      } else if (!resolvedClosedBy.toLowerCase().startsWith('closed by:')) {
        resolvedClosedBy = `Closed By: ${resolvedClosedBy}`;
      }

      const closingRecord = {
        shopId,
        billId: bill.id,
        billNumber: bill.billNumber,
        partyId: bill.partyId,
        partyName: bill.partyName,
        partyPhone: bill.partyPhone,
        initialPrincipalPaise: bill.principalPaise,
        outstandingPrincipalPaise: bill.currentPrincipalPaise,
        accruedInterestPaise: financialStatus.accruedInterestPaise,
        baseOutstandingPaise: basePayable,
        adjustmentType: input.adjustmentType,
        adjustmentAmountPaise: input.adjustmentAmountPaise,
        finalSettlementAmountPaise: expectedSettlement,
        totalPaidPaise: totalPaid,
        finalOutstandingPaise: 0,
        closingDate: input.closingDate,
        paymentMode: input.paymentMode,
        paymentModes: input.paymentModes,
        splitAllocations: input.splitAllocations,
        cashPaise: input.cashPaise ?? 0,
        upiPaise: input.upiPaise ?? 0,
        netBankingPaise: input.netBankingPaise ?? 0,
        agreedSettlementPaise: expectedSettlement,
        totalAllocatedPaise: totalPaid,
        notes: input.notes?.trim() || '',
        closedAt: Date.now(),
        closedBy: resolvedClosedBy,
        closedByUid: input.closedByUid || '',
        closedByRole: resolvedRole,
        closingTransactionId: input.closingTransactionId || `tx_close_${bill.id}_${Date.now()}`,
        serverCreatedAt: serverTimestamp(),
      };

      const closingRef = doc(collection(db, CLOSING_COLLECTION));
      transaction.set(closingRef, closingRecord);

      // Update Bill to Closed with immutable closing audit trail
      transaction.update(billRef, {
        status: 'Closed',
        currentPrincipalPaise: 0,
        totalPaidPaise: (bill.totalPaidPaise || 0) + totalPaid,
        finalOutstandingPaise: 0,
        closedAt: closingRecord.closedAt,
        closedBy: closingRecord.closedBy,
        closedByUid: closingRecord.closedByUid,
        closedByRole: resolvedRole,
        closingTransactionId: closingRecord.closingTransactionId,
        closingNotes: input.notes?.trim() || '',
        updatedAt: Date.now(),
      });

      return {
        success: true,
        closingBill: { id: closingRef.id, ...closingRecord } as ClosingBill,
      };
    });
  } catch (error: any) {
    console.error('Error closing bill:', error);
    return {
      success: false,
      error: error?.message || 'Failed to close bill.',
    };
  }
}

export async function getClosingBillsForParty(shopId: string, partyId: string): Promise<ClosingBill[]> {
  try {
    const q = query(
      collection(db, CLOSING_COLLECTION),
      where('shopId', '==', shopId),
      where('partyId', '==', partyId),
      orderBy('closedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClosingBill));
  } catch (e) {
    console.error('Error fetching closing bills for party:', e);
    return [];
  }
}

export async function getAllClosingBills(shopId: string): Promise<ClosingBill[]> {
  try {
    const q = query(
      collection(db, CLOSING_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('closedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClosingBill));
  } catch (e) {
    console.error('Error fetching all closing bills:', e);
    return [];
  }
}
