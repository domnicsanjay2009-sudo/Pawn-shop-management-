import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Bill, Payment, ClosingBill, FinancialEditAuditRecord } from '../types';
import { calculateAccruedInterestPaise, evaluateBillStatus } from '../utils/calculations';
import { verifyCredential, getAppLockConfig } from './appLockService';

const BILLS_COLLECTION = 'bills';
const PAYMENTS_COLLECTION = 'payments';
const CLOSING_COLLECTION = 'closing_bills';
const AUDIT_COLLECTION = 'financial_edits';

export interface EditAuditMeta {
  reason: string;
  performedBy: string;
  performedByUid: string;
  ownerCredential?: string; // PIN or Master Password
}

/**
 * Verifies authorization for financial edits using configured AppLock PIN/password
 * or default owner validation.
 */
export async function verifyOwnerAuthorization(
  credential: string | undefined,
  ownerUid?: string
): Promise<{ authorized: boolean; error?: string }> {
  if (!credential || !credential.trim()) {
    return { authorized: false, error: 'Owner PIN or Master Password is required to authorize edits.' };
  }

  const cleanCred = credential.trim();
  const config = getAppLockConfig();

  // 1. If AppLock is active with a PIN or Password, verify against the cryptographic hash
  if (config.type !== 'none' && config.hash) {
    const isValid = await verifyCredential(cleanCred);
    if (!isValid) {
      return { authorized: false, error: `Invalid ${config.type === 'pin' ? 'Owner PIN' : 'Master Password'}. Authorization denied.` };
    }
    return { authorized: true };
  }

  // 2. Fallback: If AppLock is not yet configured, allow reasonable 4-6 digit owner PIN or password
  if (cleanCred.length >= 4) {
    return { authorized: true };
  }

  return { authorized: false, error: 'Owner PIN / Master Password must be at least 4 characters.' };
}

/**
 * PURE REPLAY FUNCTION:
 * Chronologically recalculates a bill's financial history from its origin:
 * 1. Takes the base bill terms (billDate, principalPaise, interestPercentage, interestDuration).
 * 2. Processes each payment in strict ascending chronological order.
 * 3. Accrues interest on remaining principal from the previous transaction date to the payment date.
 * 4. Applies interest-first payment allocation.
 * 5. Replays the closing bill (if any) against the final remaining principal and closing date.
 */
export function chronologicalReplayBill(
  baseBill: Bill,
  rawPayments: Payment[],
  rawClosingBill?: ClosingBill | null
): {
  recalculatedBill: Bill;
  recalculatedPayments: Payment[];
  recalculatedClosingBill?: ClosingBill | null;
} {
  // Sort payments strictly ascending by paymentDate, then createdAt
  const sortedPayments = [...rawPayments].sort((a, b) => {
    const cmp = a.paymentDate.localeCompare(b.paymentDate);
    if (cmp !== 0) return cmp;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  let runningPrincipalPaise = baseBill.principalPaise;
  let lastTransactionDate = baseBill.billDate;
  let totalPaidPaise = 0;
  let totalInterestPaidPaise = 0;

  const recalculatedPayments: Payment[] = [];

  for (const p of sortedPayments) {
    // Interest accrues on running principal between last transaction date and this payment date
    const accruedInterest = calculateAccruedInterestPaise(
      runningPrincipalPaise,
      baseBill.interestPercentage,
      baseBill.interestDuration,
      lastTransactionDate,
      p.paymentDate
    );

    let interestPortion = 0;
    let principalPortion = 0;

    if (p.amountPaise <= accruedInterest) {
      interestPortion = p.amountPaise;
      principalPortion = 0;
    } else {
      interestPortion = accruedInterest;
      principalPortion = p.amountPaise - accruedInterest;
    }

    const newPrincipal = Math.max(0, runningPrincipalPaise - principalPortion);

    const updatedPayment: Payment = {
      ...p,
      billId: baseBill.id,
      billNumber: baseBill.billNumber,
      partyId: baseBill.partyId,
      partyName: baseBill.partyName,
      interestPortionPaise: interestPortion,
      principalPortionPaise: principalPortion,
    };

    recalculatedPayments.push(updatedPayment);

    runningPrincipalPaise = newPrincipal;
    totalPaidPaise += p.amountPaise;
    totalInterestPaidPaise += interestPortion;
    lastTransactionDate = p.paymentDate;
  }

  let recalculatedClosingBill: ClosingBill | null = null;

  if (rawClosingBill) {
    const closingAccruedInterest = calculateAccruedInterestPaise(
      runningPrincipalPaise,
      baseBill.interestPercentage,
      baseBill.interestDuration,
      lastTransactionDate,
      rawClosingBill.closingDate
    );

    const basePayable =
      runningPrincipalPaise +
      closingAccruedInterest +
      (baseBill.lateInterestFeesPaise || 0) +
      (baseBill.lateClosingBillFeesPaise || 0);

    let expectedSettlement = basePayable;
    if (rawClosingBill.adjustmentType === 'plus' && rawClosingBill.adjustmentAmountPaise) {
      expectedSettlement = basePayable + rawClosingBill.adjustmentAmountPaise;
    } else if (rawClosingBill.adjustmentType === 'minus' && rawClosingBill.adjustmentAmountPaise) {
      expectedSettlement = Math.max(0, basePayable - rawClosingBill.adjustmentAmountPaise);
    }

    recalculatedClosingBill = {
      ...rawClosingBill,
      billId: baseBill.id,
      billNumber: baseBill.billNumber,
      partyId: baseBill.partyId,
      partyName: baseBill.partyName,
      initialPrincipalPaise: baseBill.principalPaise,
      outstandingPrincipalPaise: runningPrincipalPaise,
      accruedInterestPaise: closingAccruedInterest,
      baseOutstandingPaise: basePayable,
      finalSettlementAmountPaise: expectedSettlement,
      totalPaidPaise: rawClosingBill.totalPaidPaise || expectedSettlement,
      finalOutstandingPaise: 0,
    };

    totalPaidPaise += recalculatedClosingBill.totalPaidPaise || 0;
    runningPrincipalPaise = 0;
  }

  const recalculatedBill: Bill = {
    ...baseBill,
    currentPrincipalPaise: rawClosingBill || baseBill.status === 'Closed' ? 0 : runningPrincipalPaise,
    totalPaidPaise,
    totalInterestPaidPaise,
    lastPaymentDate: sortedPayments.length > 0 ? sortedPayments[sortedPayments.length - 1].paymentDate : baseBill.billDate,
    finalOutstandingPaise: rawClosingBill || baseBill.status === 'Closed' ? 0 : undefined,
    updatedAt: Date.now(),
  };

  return {
    recalculatedBill,
    recalculatedPayments,
    recalculatedClosingBill,
  };
}

/**
 * Loads all related transactions for a bill and recalculates its entire financial chain
 */
export async function recalculateBillHistory(
  shopId: string,
  billId: string
): Promise<{
  success: boolean;
  bill?: Bill;
  payments?: Payment[];
  closingBill?: ClosingBill | null;
  error?: string;
}> {
  try {
    const billRef = doc(db, BILLS_COLLECTION, billId);
    const billSnap = await getDoc(billRef);
    if (!billSnap.exists()) {
      return { success: false, error: 'Bill not found' };
    }

    const bill = { id: billSnap.id, ...billSnap.data() } as Bill;
    if (bill.shopId !== shopId) {
      return { success: false, error: 'Unauthorized bill access' };
    }

    // Fetch payments for this bill
    const paymentsQuery = query(
      collection(db, PAYMENTS_COLLECTION),
      where('shopId', '==', shopId),
      where('billId', '==', billId)
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

    // Fetch closing bill if closed
    let closingBill: ClosingBill | null = null;
    const closingQuery = query(
      collection(db, CLOSING_COLLECTION),
      where('shopId', '==', shopId),
      where('billId', '==', billId)
    );
    const closingSnap = await getDocs(closingQuery);
    if (!closingSnap.empty) {
      const cDoc = closingSnap.docs[0];
      closingBill = { id: cDoc.id, ...cDoc.data() } as ClosingBill;
    }

    const result = chronologicalReplayBill(bill, payments, closingBill);

    // Atomically persist all recalculated values
    await runTransaction(db, async (transaction) => {
      // 1. Update bill
      transaction.update(billRef, {
        currentPrincipalPaise: result.recalculatedBill.currentPrincipalPaise,
        totalPaidPaise: result.recalculatedBill.totalPaidPaise,
        totalInterestPaidPaise: result.recalculatedBill.totalInterestPaidPaise,
        lastPaymentDate: result.recalculatedBill.lastPaymentDate,
        finalOutstandingPaise: result.recalculatedBill.finalOutstandingPaise ?? null,
        updatedAt: Date.now(),
      });

      // 2. Update each payment
      for (const p of result.recalculatedPayments) {
        const pRef = doc(db, PAYMENTS_COLLECTION, p.id);
        transaction.update(pRef, {
          interestPortionPaise: p.interestPortionPaise,
          principalPortionPaise: p.principalPortionPaise,
          billId: bill.id,
          billNumber: bill.billNumber,
          partyId: bill.partyId,
          partyName: bill.partyName,
          updatedAt: Date.now(),
        });
      }

      // 3. Update closing bill if exists
      if (result.recalculatedClosingBill) {
        const cRef = doc(db, CLOSING_COLLECTION, result.recalculatedClosingBill.id);
        transaction.update(cRef, {
          initialPrincipalPaise: result.recalculatedClosingBill.initialPrincipalPaise,
          outstandingPrincipalPaise: result.recalculatedClosingBill.outstandingPrincipalPaise,
          accruedInterestPaise: result.recalculatedClosingBill.accruedInterestPaise,
          baseOutstandingPaise: result.recalculatedClosingBill.baseOutstandingPaise,
          finalSettlementAmountPaise: result.recalculatedClosingBill.finalSettlementAmountPaise,
          totalPaidPaise: result.recalculatedClosingBill.totalPaidPaise,
          finalOutstandingPaise: 0,
          updatedAt: Date.now(),
        });
      }
    });

    return {
      success: true,
      bill: result.recalculatedBill,
      payments: result.recalculatedPayments,
      closingBill: result.recalculatedClosingBill,
    };
  } catch (error: any) {
    console.error('Error recalculating bill history:', error);
    return { success: false, error: error?.message || 'Failed to recalculate bill history.' };
  }
}

/**
 * EDIT BILL
 * Updates existing bill details and chronologically recalculates all financial balances
 */
export interface EditBillInput {
  partyName?: string;
  partyPhone?: string;
  billDate?: string;
  principalPaise?: number;
  itemCategory?: Bill['itemCategory'];
  itemDescription?: string;
  purity?: string;
  grossWeight?: number;
  netWeight?: number;
  weightUnit?: Bill['weightUnit'];
  interestPercentage?: number;
  interestDuration?: Bill['interestDuration'];
  dueDate?: string;
}

export async function editBill(
  shopId: string,
  billId: string,
  updates: EditBillInput,
  auditMeta: EditAuditMeta
): Promise<{ success: boolean; bill?: Bill; error?: string }> {
  try {
    // 1. Authorize with Owner PIN / Master Password
    const authCheck = await verifyOwnerAuthorization(auditMeta.ownerCredential, auditMeta.performedByUid);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!auditMeta.reason || !auditMeta.reason.trim()) {
      return { success: false, error: 'A valid reason for editing is required for audit compliance.' };
    }

    const billRef = doc(db, BILLS_COLLECTION, billId);
    const billSnap = await getDoc(billRef);
    if (!billSnap.exists()) {
      return { success: false, error: 'Bill not found' };
    }

    const originalBill = { id: billSnap.id, ...billSnap.data() } as Bill;
    if (originalBill.shopId !== shopId) {
      return { success: false, error: 'Unauthorized bill access' };
    }

    // Validate updated fields
    if (updates.principalPaise !== undefined && updates.principalPaise <= 0) {
      return { success: false, error: 'Principal amount must be greater than zero.' };
    }
    if (updates.interestPercentage !== undefined && updates.interestPercentage < 0) {
      return { success: false, error: 'Interest percentage cannot be negative.' };
    }
    if (updates.billDate && isNaN(Date.parse(updates.billDate))) {
      return { success: false, error: 'Invalid bill date format.' };
    }

    const mergedBaseBill: Bill = {
      ...originalBill,
      ...updates,
      principalPaise: updates.principalPaise ?? originalBill.principalPaise,
      interestPercentage: updates.interestPercentage ?? originalBill.interestPercentage,
      interestDuration: updates.interestDuration ?? originalBill.interestDuration,
      billDate: updates.billDate ?? originalBill.billDate,
      itemDescription: updates.itemDescription !== undefined ? updates.itemDescription.trim() : originalBill.itemDescription,
      purity: updates.purity !== undefined ? updates.purity.trim() : originalBill.purity,
    };

    // Fetch existing payments and closing bills
    const paymentsQuery = query(
      collection(db, PAYMENTS_COLLECTION),
      where('shopId', '==', shopId),
      where('billId', '==', billId)
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

    let closingBill: ClosingBill | null = null;
    const closingQuery = query(
      collection(db, CLOSING_COLLECTION),
      where('shopId', '==', shopId),
      where('billId', '==', billId)
    );
    const closingSnap = await getDocs(closingQuery);
    if (!closingSnap.empty) {
      const cDoc = closingSnap.docs[0];
      closingBill = { id: cDoc.id, ...cDoc.data() } as ClosingBill;
    }

    // Replay chronological calculations
    const replayResult = chronologicalReplayBill(mergedBaseBill, payments, closingBill);

    // Atomic transaction for database consistency
    await runTransaction(db, async (transaction) => {
      // 1. Update bill
      transaction.update(billRef, {
        ...updates,
        currentPrincipalPaise: replayResult.recalculatedBill.currentPrincipalPaise,
        totalPaidPaise: replayResult.recalculatedBill.totalPaidPaise,
        totalInterestPaidPaise: replayResult.recalculatedBill.totalInterestPaidPaise,
        lastPaymentDate: replayResult.recalculatedBill.lastPaymentDate,
        finalOutstandingPaise: replayResult.recalculatedBill.finalOutstandingPaise ?? null,
        updatedAt: Date.now(),
      });

      // 2. Update dependent payments
      for (const p of replayResult.recalculatedPayments) {
        const pRef = doc(db, PAYMENTS_COLLECTION, p.id);
        transaction.update(pRef, {
          interestPortionPaise: p.interestPortionPaise,
          principalPortionPaise: p.principalPortionPaise,
          billNumber: mergedBaseBill.billNumber,
          partyName: mergedBaseBill.partyName,
          updatedAt: Date.now(),
        });
      }

      // 3. Update closing bill if exists
      if (replayResult.recalculatedClosingBill) {
        const cRef = doc(db, CLOSING_COLLECTION, replayResult.recalculatedClosingBill.id);
        transaction.update(cRef, {
          initialPrincipalPaise: replayResult.recalculatedClosingBill.initialPrincipalPaise,
          outstandingPrincipalPaise: replayResult.recalculatedClosingBill.outstandingPrincipalPaise,
          accruedInterestPaise: replayResult.recalculatedClosingBill.accruedInterestPaise,
          baseOutstandingPaise: replayResult.recalculatedClosingBill.baseOutstandingPaise,
          finalSettlementAmountPaise: replayResult.recalculatedClosingBill.finalSettlementAmountPaise,
          totalPaidPaise: replayResult.recalculatedClosingBill.totalPaidPaise,
          updatedAt: Date.now(),
        });
      }

      // 4. Record audit log
      const auditRef = doc(collection(db, AUDIT_COLLECTION));
      const auditRecord: FinancialEditAuditRecord = {
        id: auditRef.id,
        shopId,
        entityType: 'bill',
        entityId: billId,
        linkedBillId: billId,
        billNumber: originalBill.billNumber,
        partyId: originalBill.partyId,
        partyName: originalBill.partyName,
        originalValues: {
          billDate: originalBill.billDate,
          principalPaise: originalBill.principalPaise,
          interestPercentage: originalBill.interestPercentage,
          interestDuration: originalBill.interestDuration,
          currentPrincipalPaise: originalBill.currentPrincipalPaise,
          totalPaidPaise: originalBill.totalPaidPaise,
          itemDescription: originalBill.itemDescription,
          grossWeight: originalBill.grossWeight,
          netWeight: originalBill.netWeight,
        },
        updatedValues: updates,
        reason: auditMeta.reason.trim(),
        performedBy: auditMeta.performedBy || 'Owner',
        performedByUid: auditMeta.performedByUid || '',
        timestamp: Date.now(),
        recalculatedTransactionsCount: payments.length + (closingBill ? 1 : 0),
      };
      transaction.set(auditRef, {
        ...auditRecord,
        serverCreatedAt: serverTimestamp(),
      });
    });

    return { success: true, bill: replayResult.recalculatedBill };
  } catch (error: any) {
    console.error('Error editing bill:', error);
    return { success: false, error: error?.message || 'Failed to edit bill.' };
  }
}

/**
 * EDIT PAYMENT
 * Modifies an existing payment record (date, amount, payment mode, split amounts, linked bill)
 * and chronologically recalculates all affected bills
 */
export interface EditPaymentInput {
  paymentDate?: string;
  amountPaise?: number;
  cashPaise?: number;
  upiPaise?: number;
  netBankingPaise?: number;
  paymentMode?: Payment['paymentMode'];
  notes?: string;
  targetBillId?: string; // If reassigning payment to another valid bill of same party
}

export async function editPayment(
  shopId: string,
  paymentId: string,
  updates: EditPaymentInput,
  auditMeta: EditAuditMeta
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    // 1. Authorize with Owner PIN / Master Password
    const authCheck = await verifyOwnerAuthorization(auditMeta.ownerCredential, auditMeta.performedByUid);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!auditMeta.reason || !auditMeta.reason.trim()) {
      return { success: false, error: 'A valid reason for editing is required for audit compliance.' };
    }

    const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
    const paymentSnap = await getDoc(paymentRef);
    if (!paymentSnap.exists()) {
      return { success: false, error: 'Payment not found' };
    }

    const originalPayment = { id: paymentSnap.id, ...paymentSnap.data() } as Payment;
    if (originalPayment.shopId !== shopId) {
      return { success: false, error: 'Unauthorized payment access' };
    }

    // Validate amount if updated
    const newAmountPaise = updates.amountPaise ?? originalPayment.amountPaise;
    if (newAmountPaise <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    // Validate split sum if split amounts provided
    const newCash = updates.cashPaise ?? originalPayment.cashPaise ?? 0;
    const newUpi = updates.upiPaise ?? originalPayment.upiPaise ?? 0;
    const newNet = updates.netBankingPaise ?? originalPayment.netBankingPaise ?? 0;
    const splitSum = newCash + newUpi + newNet;
    if (splitSum > 0 && splitSum !== newAmountPaise) {
      return {
        success: false,
        error: `Split amounts (Cash: ₹${(newCash / 100).toFixed(2)}, GPay: ₹${(newUpi / 100).toFixed(2)}, Others: ₹${(newNet / 100).toFixed(2)}) must exactly match total payment ₹${(newAmountPaise / 100).toFixed(2)}.`,
      };
    }

    const targetBillId = updates.targetBillId || originalPayment.billId;

    // Check if moving to a different bill
    if (targetBillId !== originalPayment.billId) {
      const targetBillRef = doc(db, BILLS_COLLECTION, targetBillId);
      const targetSnap = await getDoc(targetBillRef);
      if (!targetSnap.exists()) {
        return { success: false, error: 'Target bill not found.' };
      }
      const targetBill = targetSnap.data() as Bill;
      if (targetBill.partyId !== originalPayment.partyId) {
        return { success: false, error: 'Cannot reassign payment to a bill of a different customer.' };
      }
      if (targetBill.status === 'Closed') {
        return { success: false, error: 'Cannot attach payment to an already closed bill.' };
      }
    }

    // Apply payment doc update
    const updatedPaymentData = {
      amountPaise: newAmountPaise,
      paymentDate: updates.paymentDate ?? originalPayment.paymentDate,
      cashPaise: newCash,
      upiPaise: newUpi,
      netBankingPaise: newNet,
      paymentMode: updates.paymentMode ?? originalPayment.paymentMode,
      notes: updates.notes !== undefined ? updates.notes.trim() : originalPayment.notes,
      billId: targetBillId,
      updatedAt: Date.now(),
    };

    await updateDoc(paymentRef, updatedPaymentData);

    // Record audit record
    const auditRef = doc(collection(db, AUDIT_COLLECTION));
    const auditRecord: FinancialEditAuditRecord = {
      id: auditRef.id,
      shopId,
      entityType: 'payment',
      entityId: paymentId,
      linkedBillId: targetBillId,
      billNumber: originalPayment.billNumber,
      partyId: originalPayment.partyId,
      partyName: originalPayment.partyName,
      originalValues: {
        paymentDate: originalPayment.paymentDate,
        amountPaise: originalPayment.amountPaise,
        cashPaise: originalPayment.cashPaise,
        upiPaise: originalPayment.upiPaise,
        netBankingPaise: originalPayment.netBankingPaise,
        billId: originalPayment.billId,
        paymentMode: originalPayment.paymentMode,
      },
      updatedValues: updates,
      reason: auditMeta.reason.trim(),
      performedBy: auditMeta.performedBy || 'Owner',
      performedByUid: auditMeta.performedByUid || '',
      timestamp: Date.now(),
    };
    await runTransaction(db, async (t) => {
      t.set(auditRef, { ...auditRecord, serverCreatedAt: serverTimestamp() });
    });

    // Recalculate original bill
    await recalculateBillHistory(shopId, originalPayment.billId);

    // If reassigned to a different bill, recalculate target bill too
    if (targetBillId !== originalPayment.billId) {
      await recalculateBillHistory(shopId, targetBillId);
    }

    return {
      success: true,
      payment: {
        ...originalPayment,
        ...updatedPaymentData,
      },
    };
  } catch (error: any) {
    console.error('Error editing payment:', error);
    return { success: false, error: error?.message || 'Failed to edit payment.' };
  }
}

/**
 * EDIT CLOSING BILL
 * Modifies an existing closing bill record (date, split amounts, Closed By, notes, adjustments)
 * and keeps the linked bill and financial balances 100% consistent
 */
export interface EditClosingBillInput {
  closingDate?: string;
  totalPaidPaise?: number;
  cashPaise?: number;
  upiPaise?: number;
  netBankingPaise?: number;
  closedBy?: string;
  notes?: string;
  adjustmentType?: 'plus' | 'minus';
  adjustmentAmountPaise?: number;
}

export async function editClosingBill(
  shopId: string,
  closingBillId: string,
  updates: EditClosingBillInput,
  auditMeta: EditAuditMeta
): Promise<{ success: boolean; closingBill?: ClosingBill; error?: string }> {
  try {
    // 1. Authorize with Owner PIN / Master Password
    const authCheck = await verifyOwnerAuthorization(auditMeta.ownerCredential, auditMeta.performedByUid);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!auditMeta.reason || !auditMeta.reason.trim()) {
      return { success: false, error: 'A valid reason for editing is required for audit compliance.' };
    }

    const closingRef = doc(db, CLOSING_COLLECTION, closingBillId);
    const closingSnap = await getDoc(closingRef);
    if (!closingSnap.exists()) {
      return { success: false, error: 'Closing bill record not found.' };
    }

    const originalClosing = { id: closingSnap.id, ...closingSnap.data() } as ClosingBill;
    if (originalClosing.shopId !== shopId) {
      return { success: false, error: 'Unauthorized closing bill access' };
    }

    // Clean Closed By info
    let updatedClosedBy = updates.closedBy ? updates.closedBy.trim() : originalClosing.closedBy;
    if (updatedClosedBy && !updatedClosedBy.toLowerCase().startsWith('closed by:')) {
      updatedClosedBy = `Closed By: ${updatedClosedBy}`;
    }

    const newCash = updates.cashPaise ?? originalClosing.cashPaise ?? 0;
    const newUpi = updates.upiPaise ?? originalClosing.upiPaise ?? 0;
    const newNet = updates.netBankingPaise ?? originalClosing.netBankingPaise ?? 0;
    const computedTotalPaid = newCash + newUpi + newNet;
    const newTotalPaid = updates.totalPaidPaise ?? (computedTotalPaid > 0 ? computedTotalPaid : (originalClosing.totalPaidPaise || 0));

    if (newTotalPaid <= 0) {
      return { success: false, error: 'Closing settlement payment must be greater than zero.' };
    }

    const updatedData = {
      closingDate: updates.closingDate ?? originalClosing.closingDate,
      totalPaidPaise: newTotalPaid,
      cashPaise: newCash,
      upiPaise: newUpi,
      netBankingPaise: newNet,
      closedBy: updatedClosedBy,
      notes: updates.notes !== undefined ? updates.notes.trim() : originalClosing.notes,
      adjustmentType: updates.adjustmentType ?? originalClosing.adjustmentType,
      adjustmentAmountPaise: updates.adjustmentAmountPaise ?? originalClosing.adjustmentAmountPaise,
      updatedAt: Date.now(),
    };

    await updateDoc(closingRef, updatedData);

    // Record audit record
    const auditRef = doc(collection(db, AUDIT_COLLECTION));
    const auditRecord: FinancialEditAuditRecord = {
      id: auditRef.id,
      shopId,
      entityType: 'closing_bill',
      entityId: closingBillId,
      linkedBillId: originalClosing.billId,
      billNumber: originalClosing.billNumber,
      partyId: originalClosing.partyId,
      partyName: originalClosing.partyName,
      originalValues: {
        closingDate: originalClosing.closingDate,
        totalPaidPaise: originalClosing.totalPaidPaise,
        cashPaise: originalClosing.cashPaise,
        upiPaise: originalClosing.upiPaise,
        netBankingPaise: originalClosing.netBankingPaise,
        closedBy: originalClosing.closedBy,
        adjustmentType: originalClosing.adjustmentType,
        adjustmentAmountPaise: originalClosing.adjustmentAmountPaise,
      },
      updatedValues: updates,
      reason: auditMeta.reason.trim(),
      performedBy: auditMeta.performedBy || 'Owner',
      performedByUid: auditMeta.performedByUid || '',
      timestamp: Date.now(),
    };
    await runTransaction(db, async (t) => {
      t.set(auditRef, { ...auditRecord, serverCreatedAt: serverTimestamp() });
    });

    // Replay linked bill history to keep totals and closed status 100% synchronized
    const replayResult = await recalculateBillHistory(shopId, originalClosing.billId);

    return {
      success: true,
      closingBill: replayResult.closingBill || ({ ...originalClosing, ...updatedData } as ClosingBill),
    };
  } catch (error: any) {
    console.error('Error editing closing bill:', error);
    return { success: false, error: error?.message || 'Failed to edit closing bill.' };
  }
}

/**
 * Fetches all financial edit audit logs for a shop or specific bill
 */
export async function getFinancialEditAuditLogs(
  shopId: string,
  linkedBillId?: string
): Promise<FinancialEditAuditRecord[]> {
  try {
    let q;
    if (linkedBillId) {
      q = query(
        collection(db, AUDIT_COLLECTION),
        where('shopId', '==', shopId),
        where('linkedBillId', '==', linkedBillId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, AUDIT_COLLECTION),
        where('shopId', '==', shopId),
        orderBy('timestamp', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEditAuditRecord));
  } catch (error) {
    console.error('Error fetching edit audit logs:', error);
    return [];
  }
}
