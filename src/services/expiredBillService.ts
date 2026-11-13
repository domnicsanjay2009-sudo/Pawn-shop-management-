import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Bill, AppSettings } from '../types';
import { calculateAccruedInterestPaise, getDaysDifference } from '../utils/calculations';

const BILLS_COLLECTION = 'bills';

/**
 * Checks whether an active bill is eligible for expiration.
 * Invariant:
 * 1. Bill must not be closed
 * 2. Bill has received ZERO payments (completely untouched)
 * 3. Elapsed time from original bill opening date >= configured durationYears
 */
export function isBillEligibleForExpiry(
  bill: Bill,
  paymentCount: number = 0,
  durationYears: number = 2
): boolean {
  if (bill.status === 'Closed' || bill.status === 'Expired' || bill.isExpired) {
    return false;
  }

  // Must have zero payments
  if (paymentCount > 0 || (bill.totalPaidPaise && bill.totalPaidPaise > 0)) {
    return false;
  }

  const billDate = new Date(bill.billDate);
  if (isNaN(billDate.getTime())) return false;

  const expiryTarget = new Date(billDate);
  expiryTarget.setFullYear(expiryTarget.getFullYear() + durationYears);

  return Date.now() >= expiryTarget.getTime();
}

/**
 * Freezes a bill as Expired.
 * When frozen: stops all interest and late-fee accruals, preserving financial state.
 */
export async function freezeBillAsExpired(
  shopId: string,
  bill: Bill,
  outstandingPaiseAtExpiry: number
): Promise<Bill> {
  const billRef = doc(db, BILLS_COLLECTION, bill.id);
  const now = Date.now();

  const updates = {
    status: 'Expired' as const,
    isExpired: true,
    expiredAt: now,
    frozenOutstandingPaise: outstandingPaiseAtExpiry,
    updatedAt: now,
  };

  await updateDoc(billRef, updates);

  return {
    ...bill,
    ...updates,
  };
}

/**
 * Republishes an Expired Bill:
 * 1. Confirms user action
 * 2. Restores bill to Active calculation state
 * 3. Calculates accrued interest from original bill opening date to current date
 * 4. Applies enabled Late Interest Fees and Late Closing Bill Fees
 * 5. Maintains an immutable audit record in republishHistory
 * 6. Returns bill to active ledger
 */
export async function republishExpiredBill(
  shopId: string,
  bill: Bill,
  settings: AppSettings,
  actorName: string,
  actorUid?: string
): Promise<Bill> {
  const billRef = doc(db, BILLS_COLLECTION, bill.id);
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  // Accrued interest calculated from original opening date to today
  const interestPaise = calculateAccruedInterestPaise(
    bill.principalPaise,
    bill.interestPercentage,
    bill.interestDuration,
    bill.billDate,
    todayStr
  );

  // Late Interest Fees if enabled
  let lateInterestFeesPaise = 0;
  if (settings.lateInterestFeesEnabled && settings.lateInterestFeeRateOrAmount) {
    // If rate percentage is specified
    lateInterestFeesPaise = Math.round(
      bill.principalPaise * (settings.lateInterestFeeRateOrAmount / 100)
    );
  }

  // Late Closing Bill Fees if enabled
  let lateClosingFeesPaise = 0;
  if (settings.lateClosingFeesEnabled && settings.lateClosingFeeAmountPaise) {
    lateClosingFeesPaise = settings.lateClosingFeeAmountPaise;
  }

  const totalCalculatedOutstandingPaise =
    bill.principalPaise + interestPaise + lateInterestFeesPaise + lateClosingFeesPaise;

  const historyEntry = {
    republishedAt: now,
    republishedBy: actorName || 'Authorized User',
    republishedByUid: actorUid || '',
    originalBillDate: bill.billDate,
    interestCalculatedPaise: interestPaise,
    lateInterestFeesPaise,
    lateClosingFeesPaise,
    totalCalculatedOutstandingPaise,
  };

  const existingHistory = bill.republishHistory || [];

  const updates = {
    status: 'Active' as const,
    isExpired: false,
    republishedAt: now,
    republishedBy: actorName || 'Authorized User',
    republishHistory: [...existingHistory, historyEntry],
    lateInterestFeesPaise,
    lateClosingBillFeesPaise: lateClosingFeesPaise,
    updatedAt: now,
  };

  await updateDoc(billRef, updates);

  return {
    ...bill,
    ...updates,
  };
}
