import { Bill, InterestDuration } from '../types';

/**
 * Currency conversion helpers
 * Keeps all database values as exact integer paise (1 Rupee = 100 Paise)
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Calculates calendar day difference between two dates (YYYY-MM-DD or timestamps)
 */
export function getDaysDifference(startDate: string | number | Date, endDate: string | number | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set both to midnight UTC to compare clean days
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffMs = endUtc - startUtc;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Calculates elapsed periods for a given duration type and number of elapsed days
 */
export function getElapsedPeriods(daysElapsed: number, duration: InterestDuration): number {
  switch (duration) {
    case 'Daily':
      return daysElapsed;
    case 'Weekly':
      return daysElapsed / 7;
    case 'Monthly':
      // 30 days per month pro-rated
      return daysElapsed / 30;
    case 'Yearly':
      return daysElapsed / 365;
    default:
      return daysElapsed / 30;
  }
}

/**
 * Calculates accrued interest in integer paise from bill date to evaluation date
 * Simple Interest: I = P * R * T
 */
export function calculateAccruedInterestPaise(
  principalPaise: number,
  interestPercentage: number,
  duration: InterestDuration,
  startDateStr: string,
  evaluationDateStr: string = new Date().toISOString().split('T')[0]
): number {
  if (principalPaise <= 0 || interestPercentage <= 0) return 0;
  
  const days = getDaysDifference(startDateStr, evaluationDateStr);
  const periods = getElapsedPeriods(days, duration);
  
  // I = Principal * (Rate / 100) * Periods
  const interestPaise = principalPaise * (interestPercentage / 100) * periods;
  return Math.round(interestPaise);
}

/**
 * Evaluates current financial status of a bill:
 * Remaining Principal, Accrued Interest, and Total Payable to close
 */
export interface BillFinancialStatus {
  daysElapsed: number;
  periodsElapsed: number;
  remainingPrincipalPaise: number;
  accruedInterestPaise: number;
  totalPayablePaise: number;
}

export function evaluateBillStatus(
  bill: Bill,
  evaluationDateStr: string = new Date().toISOString().split('T')[0]
): BillFinancialStatus {
  const daysElapsed = getDaysDifference(bill.billDate, evaluationDateStr);
  const periodsElapsed = getElapsedPeriods(daysElapsed, bill.interestDuration);
  
  const accruedInterestPaise = calculateAccruedInterestPaise(
    bill.currentPrincipalPaise,
    bill.interestPercentage,
    bill.interestDuration,
    bill.lastPaymentDate || bill.billDate,
    evaluationDateStr
  );
  
  const totalPayablePaise = bill.currentPrincipalPaise + accruedInterestPaise;
  
  return {
    daysElapsed,
    periodsElapsed: parseFloat(periodsElapsed.toFixed(2)),
    remainingPrincipalPaise: bill.currentPrincipalPaise,
    accruedInterestPaise,
    totalPayablePaise,
  };
}

/**
 * Allocates a payment:
 * 1. Accrued interest is settled first
 * 2. Remaining payment reduces principal
 */
export interface PaymentAllocationResult {
  interestPortionPaise: number;
  principalPortionPaise: number;
  newRemainingPrincipalPaise: number;
  unpaidInterestRemainingPaise: number;
}

export function allocatePayment(
  bill: Bill,
  paymentAmountPaise: number,
  paymentDateStr: string
): PaymentAllocationResult {
  const accruedInterest = calculateAccruedInterestPaise(
    bill.currentPrincipalPaise,
    bill.interestPercentage,
    bill.interestDuration,
    bill.lastPaymentDate || bill.billDate,
    paymentDateStr
  );
  
  let interestPortion = 0;
  let principalPortion = 0;
  let unpaidInterest = 0;
  
  if (paymentAmountPaise <= accruedInterest) {
    interestPortion = paymentAmountPaise;
    principalPortion = 0;
    unpaidInterest = accruedInterest - paymentAmountPaise;
  } else {
    interestPortion = accruedInterest;
    principalPortion = paymentAmountPaise - accruedInterest;
    unpaidInterest = 0;
  }
  
  const newPrincipal = Math.max(0, bill.currentPrincipalPaise - principalPortion);
  
  return {
    interestPortionPaise: interestPortion,
    principalPortionPaise: principalPortion,
    newRemainingPrincipalPaise: newPrincipal,
    unpaidInterestRemainingPaise: unpaidInterest,
  };
}
