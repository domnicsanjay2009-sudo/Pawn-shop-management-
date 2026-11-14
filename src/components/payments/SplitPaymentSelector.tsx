import React from 'react';
import { IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrencyPaise } from '../../utils/formatters';
import { rupeesToPaise } from '../../utils/calculations';

export interface SplitPaymentState {
  cashSelected?: boolean;
  upiSelected?: boolean;
  netBankingSelected?: boolean;
  cashRupees: string;
  upiRupees: string;
  netBankingRupees: string;
}

interface SplitPaymentSelectorProps {
  agreedAmountPaise: number; // Represents Previous Outstanding Balance in Close Bill
  state: SplitPaymentState;
  onChange: (newState: SplitPaymentState) => void;
  label?: string;
  isCloseBill?: boolean;
}

/**
 * Safely parses rupee string input to exact integer paise.
 * Empty string or zero is interpreted as 0 paise.
 */
export const parseInputRupeesToPaise = (val: string | number | undefined): number => {
  if (val === undefined || val === null) return 0;
  const str = val.toString().trim();
  if (str === '' || str === '0') return 0;
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0) return 0;
  return rupeesToPaise(parsed);
};

export const SplitPaymentSelector: React.FC<SplitPaymentSelectorProps> = ({
  agreedAmountPaise,
  state,
  onChange,
  label = 'Payment Intake',
  isCloseBill = false,
}) => {
  const cashPaise = parseInputRupeesToPaise(state.cashRupees);
  const upiPaise = parseInputRupeesToPaise(state.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(state.netBankingRupees);

  // Automatic Total Calculation: Total Paid = Cash + GPay/PhonePe + Net Banking
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;

  // Outstanding Balance Calculation: Remaining = Previous Outstanding - Total Paid
  const remainingBalancePaise = agreedAmountPaise - totalAllocatedPaise;

  const isExactMatch = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;
  const isZeroPayment = totalAllocatedPaise === 0;
  const isUnderpaid = totalAllocatedPaise < agreedAmountPaise;
  const isOverpaid = totalAllocatedPaise > agreedAmountPaise;

  const handleAmountChange = (mode: 'cash' | 'upi' | 'netBanking', rawValue: string) => {
    // Reject negative values and invalid characters
    if (rawValue.includes('-')) return;

    onChange({
      ...state,
      [`${mode}Rupees`]: rawValue,
      [`${mode}Selected`]: parseInputRupeesToPaise(rawValue) > 0,
    });
  };

  return (
    <div className="space-y-4 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
      {/* Header showing target / previous outstanding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            {label}
          </label>
          <p className="text-[11px] text-slate-500">
            {isCloseBill
              ? 'Enter payment amounts across payment modes. Total Paid will update automatically.'
              : 'Enter split payment amounts. Empty inputs are treated as ₹0.00.'}
          </p>
        </div>
        <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-500 mr-2">
            {isCloseBill ? 'Previous Outstanding:' : 'Agreed Amount:'}
          </span>
          <span className="font-extrabold text-brand-950 font-mono text-sm">
            {formatCurrencyPaise(agreedAmountPaise)}
          </span>
        </div>
      </div>

      {/* Permanently Visible Payment Mode Input Fields */}
      <div className="space-y-2.5">
        {/* 1. Cash Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-brand-950 text-xs sm:text-sm">Cash Amount</span>
          </div>
          <div className="relative w-full sm:w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.cashRupees}
              onChange={(e) => handleAmountChange('cash', e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
            />
          </div>
        </div>

        {/* 2. GPay / UPI Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
            <span className="font-bold text-brand-950 text-xs sm:text-sm">GPay / UPI Amount</span>
          </div>
          <div className="relative w-full sm:w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.upiRupees}
              onChange={(e) => handleAmountChange('upi', e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
            />
          </div>
        </div>

        {/* 3. Others (Net Banking / Cheque) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <span className="font-bold text-brand-950 text-xs sm:text-sm">Others Amount</span>
              <span className="text-[10px] text-slate-400 block">Net Banking / Cheque / Card</span>
            </div>
          </div>
          <div className="relative w-full sm:w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.netBankingRupees}
              onChange={(e) => handleAmountChange('netBanking', e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Calculated Breakdown Summary */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-slate-600">
          <span>{isCloseBill ? 'Previous Outstanding Balance:' : 'Agreed Settlement:'}</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatCurrencyPaise(agreedAmountPaise)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Total Paid (Cash + GPay/PhonePe + Net Banking):</span>
          <span className="font-extrabold text-brand-950 font-mono text-sm">
            {formatCurrencyPaise(totalAllocatedPaise)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-800">
            {isCloseBill ? 'Remaining Outstanding:' : 'Remaining Balance:'}
          </span>
          <span
            className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
              isExactMatch
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {formatCurrencyPaise(remainingBalancePaise)}
          </span>
        </div>
      </div>

      {/* Validation Message Bar */}
      <div>
        {isZeroPayment ? (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              {isCloseBill
                ? 'Cannot close this bill. Please enter a valid payment amount.'
                : 'Payment amount must be greater than ₹0.00.'}
            </span>
          </div>
        ) : isUnderpaid ? (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {isCloseBill
                  ? `Payment is insufficient! Remaining outstanding: ${formatCurrencyPaise(remainingBalancePaise)}. Please allocate the full settlement amount before closing.`
                  : `Settlement mismatch! Underpayment by ${formatCurrencyPaise(remainingBalancePaise)}.`}
              </p>
            </div>
          </div>
        ) : isOverpaid ? (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {isCloseBill
                  ? `Overpayment detected! Total paid exceeds the outstanding balance by ${formatCurrencyPaise(totalAllocatedPaise - agreedAmountPaise)}. Please adjust payment amounts.`
                  : `Settlement mismatch! Overpayment by ${formatCurrencyPaise(totalAllocatedPaise - agreedAmountPaise)}.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isCloseBill
                ? 'Exact Match — Total Paid matches outstanding balance (Remaining: ₹0.00).'
                : 'Exact Match — Settlement allocation is fully reconciled (₹0.00 remaining).'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
