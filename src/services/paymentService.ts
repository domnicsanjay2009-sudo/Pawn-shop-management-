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
import { Payment, PaymentMode, Bill, PaymentModeAllocation } from '../types';
import { allocatePayment } from '../utils/calculations';

const PAYMENTS_COLLECTION = 'payments';
const BILLS_COLLECTION = 'bills';

export interface RecordPaymentInput {
  billId: string;
  partyId: string;
  partyName: string;
  amountPaise: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  notes?: string;
  idempotencyKey?: string;
  paymentModes?: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[];
  splitAllocations?: PaymentModeAllocation;
  cashPaise?: number;
  upiPaise?: number;
  netBankingPaise?: number;
  agreedPaymentPaise?: number;
  totalAllocatedPaise?: number;
  recordedByUid?: string;
}

export async function recordPayment(
  shopId: string,
  input: RecordPaymentInput
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
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

      if (bill.status === 'Closed') {
        throw new Error('Cannot add payments to an already closed bill');
      }

      // Calculate allocation using the agreed financial rule
      const allocation = allocatePayment(bill, input.amountPaise, input.paymentDate);

      const paymentRecord = {
        shopId,
        billId: bill.id,
        billNumber: bill.billNumber,
        partyId: bill.partyId,
        partyName: bill.partyName,
        amountPaise: input.amountPaise,
        interestPortionPaise: allocation.interestPortionPaise,
        principalPortionPaise: allocation.principalPortionPaise,
        paymentDate: input.paymentDate,
        paymentMode: input.paymentMode,
        paymentModes: input.paymentModes,
        splitAllocations: input.splitAllocations,
        cashPaise: input.cashPaise,
        upiPaise: input.upiPaise,
        netBankingPaise: input.netBankingPaise,
        agreedPaymentPaise: input.agreedPaymentPaise ?? input.amountPaise,
        totalAllocatedPaise: input.totalAllocatedPaise ?? input.amountPaise,
        transactionId: input.idempotencyKey,
        recordedByUid: input.recordedByUid,
        notes: input.notes?.trim() || '',
        createdAt: Date.now(),
        serverCreatedAt: serverTimestamp(),
      };

      const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));
      transaction.set(paymentRef, paymentRecord);

      // Update Bill aggregates
      const updatedTotalPaid = (bill.totalPaidPaise || 0) + input.amountPaise;
      const updatedTotalInterest = (bill.totalInterestPaidPaise || 0) + allocation.interestPortionPaise;

      transaction.update(billRef, {
        currentPrincipalPaise: allocation.newRemainingPrincipalPaise,
        totalPaidPaise: updatedTotalPaid,
        totalInterestPaidPaise: updatedTotalInterest,
        lastPaymentDate: input.paymentDate,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        payment: { id: paymentRef.id, ...paymentRecord } as Payment,
      };
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return {
      success: false,
      error: error?.message || 'Failed to record payment.',
    };
  }
}

export async function getPaymentsForParty(shopId: string, partyId: string): Promise<Payment[]> {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('shopId', '==', shopId),
      where('partyId', '==', partyId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
  } catch (e) {
    console.error('Error fetching payments for party:', e);
    return [];
  }
}

export async function getPaymentsForBill(shopId: string, billId: string): Promise<Payment[]> {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('shopId', '==', shopId),
      where('billId', '==', billId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
  } catch (e) {
    console.error('Error fetching payments for bill:', e);
    return [];
  }
}

export async function getAllPayments(shopId: string): Promise<Payment[]> {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
  } catch (e) {
    console.error('Error fetching all payments:', e);
    return [];
  }
}
