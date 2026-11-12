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
  paymentModes?: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[];
  splitAllocations?: PaymentModeAllocation;
  cashPaise?: number;
  upiPaise?: number;
  netBankingPaise?: number;
  agreedSettlementPaise?: number;
  totalAllocatedPaise?: number;
  closedBy?: string;
  closedByUid?: string;
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

      // Formula: Total Allocated = Cash + GPay/PhonePe + Net Banking
      const computedTotalAllocated = (input.cashPaise || 0) + (input.upiPaise || 0) + (input.netBankingPaise || 0);
      const totalAllocated = input.totalAllocatedPaise !== undefined ? input.totalAllocatedPaise : computedTotalAllocated;

      // 2.3 Strict Zero Payment Validation: Total Allocated = ₹0.00
      if (totalAllocated <= 0) {
        throw new Error('Cannot close this bill. Payment amount must be greater than ₹0.00.');
      }

      const financialStatus = evaluateBillStatus(bill, input.closingDate);
      const finalAmount = input.finalSettlementAmountPaise ?? financialStatus.totalPayablePaise;

      if (finalAmount <= 0) {
        throw new Error('Cannot close this bill. Payment amount must be greater than ₹0.00.');
      }

      // 3.4 Strict Settlement Reconciliation: Allocation must match agreed settlement exactly
      if (totalAllocated !== finalAmount) {
        throw new Error('Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before closing this bill.');
      }

      // 2.2 Default Name Logic:
      // Trim unnecessary spaces; if blank, use the customer's existing registered name
      let resolvedClosedBy = (input.closedBy || '').trim();
      if (!resolvedClosedBy) {
        resolvedClosedBy = bill.partyName;
      }
      if (!resolvedClosedBy.toLowerCase().startsWith('closed by:')) {
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
        finalSettlementAmountPaise: finalAmount,
        closingDate: input.closingDate,
        paymentMode: input.paymentMode,
        paymentModes: input.paymentModes,
        splitAllocations: input.splitAllocations,
        cashPaise: input.cashPaise ?? 0,
        upiPaise: input.upiPaise ?? 0,
        netBankingPaise: input.netBankingPaise ?? 0,
        agreedSettlementPaise: input.agreedSettlementPaise ?? finalAmount,
        totalAllocatedPaise: totalAllocated,
        notes: input.notes?.trim() || '',
        closedAt: Date.now(),
        closedBy: resolvedClosedBy,
        closedByUid: input.closedByUid || '',
        closingTransactionId: input.closingTransactionId || `tx_close_${bill.id}_${Date.now()}`,
        serverCreatedAt: serverTimestamp(),
      };

      const closingRef = doc(collection(db, CLOSING_COLLECTION));
      transaction.set(closingRef, closingRecord);

      // Update Bill to Closed with immutable closing audit trail
      transaction.update(billRef, {
        status: 'Closed',
        currentPrincipalPaise: 0,
        closedAt: closingRecord.closedAt,
        closedBy: closingRecord.closedBy,
        closedByUid: closingRecord.closedByUid,
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
