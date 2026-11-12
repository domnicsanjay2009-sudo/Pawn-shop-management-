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
import { ClosingBill, PaymentMode, Bill } from '../types';
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

      const financialStatus = evaluateBillStatus(bill, input.closingDate);
      const finalAmount = input.finalSettlementAmountPaise ?? financialStatus.totalPayablePaise;

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
        notes: input.notes?.trim() || '',
        closedAt: Date.now(),
        serverCreatedAt: serverTimestamp(),
      };

      const closingRef = doc(collection(db, CLOSING_COLLECTION));
      transaction.set(closingRef, closingRecord);

      // Update Bill to Closed
      transaction.update(billRef, {
        status: 'Closed',
        currentPrincipalPaise: 0,
        closedAt: Date.now(),
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
