import React from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  agreedAmountPaise: number;
  state: SplitPaymentState;
  onChange: (newState: SplitPaymentState) => void;
  label?: string;
}

/**
 * Helper to safely parse string rupee inputs (or empty string) to exact integer paise.
 * Empty or non-numeric input is interpreted as 0 paise.
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
  label = 'Payment Allocation',
}) => {
  const cashPaise = parseInputRupeesToPaise(state.cashRupees);
  const upiPaise = parseInputRupeesToPaise(state.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(state.netBankingRupees);

  // Dynamic Settlement Calculation: Total Allocated = Cash + GPay/PhonePe + Net Banking
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;

  // Remaining Balance = Agreed Settlement - Total Allocated
  const remainingBalancePaise = agreedAmountPaise - totalAllocatedPaise;

  const isExactMatch = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;
  const isZeroAllocation = totalAllocatedPaise === 0;
  const isUnderpaid = totalAllocatedPaise < agreedAmountPaise;
  const isOverpaid = totalAllocatedPaise > agreedAmountPaise;

  const handleAmountChange = (mode: 'cash' | 'upi' | 'netBanking', rawValue: string) => {
    // Reject negative values
    if (rawValue.includes('-')) return;

    const updatedState: SplitPaymentState = {
      ...state,
      [`${mode}Rupees`]: rawValue,
      [`${mode}Selected`]: parseInputRupeesToPaise(rawValue) > 0,
    };
    onChange(updatedState);
  };

  return (
    <div className="space-y-4 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
      {/* Header with Agreed Settlement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-1.5">
        <div>
          <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
            {label}
          </label>
          <p className="text-[11px] text-slate-500">
            Enter split amounts across payment modes. Empty fields are counted as ₹0.00.
          </p>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-500 mr-2">Agreed Settlement:</span>
          <span className="font-extrabold text-brand-950 font-mono text-sm">
            {formatCurrencyPaise(agreedAmountPaise)}
          </span>
        </div>
      </div>

      {/* 3.2 Always Visible Amount Fields (Cash, GPay/PhonePe, Net Banking) */}
      <div className="space-y-2.5">
        {/* Cash */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-brand-950 text-xs sm:text-sm">Cash</span>
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

        {/* GPay / PhonePe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
            <span className="font-bold text-brand-950 text-xs sm:text-sm">GPay / PhonePe</span>
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

        {/* Net Banking */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="font-bold text-brand-950 text-xs sm:text-sm">Net Banking</span>
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

      {/* 3.3 Dynamic Settlement Calculation Summary */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
        <div className="flex justify-between items-center text-slate-600">
          <span>Agreed Settlement:</span>
          <span className="font-bold text-slate-800 font-mono">
            {formatCurrencyPaise(agreedAmountPaise)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Total Allocated (Cash + UPI + Net Banking):</span>
          <span className="font-bold text-brand-950 font-mono">
            {formatCurrencyPaise(totalAllocatedPaise)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-800">Remaining Balance:</span>
          <span
            className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
              isExactMatch
                ? 'bg-emerald-100 text-emerald-800'
                : isZeroAllocation
                ? 'bg-rose-100 text-rose-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {formatCurrencyPaise(remainingBalancePaise)}
          </span>
        </div>
      </div>

      {/* 3.4 Strict Reconciliation & Zero Payment Feedback Messages */}
      <div>
        {isZeroAllocation ? (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>Cannot close this bill. Payment amount must be greater than ₹0.00.</span>
          </div>
        ) : !isExactMatch ? (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before closing this bill.
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                {isUnderpaid
                  ? `Shortage of ${formatCurrencyPaise(remainingBalancePaise)} remaining to allocate.`
                  : `Excess of ${formatCurrencyPaise(Math.abs(remainingBalancePaise))} over-allocated.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Exact Match — Settlement allocation is fully reconciled (₹0.00 remaining).</span>
          </div>
        )}
      </div>
    </div>
  );
};
