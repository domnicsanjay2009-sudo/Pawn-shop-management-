import React from 'react';
import { CheckSquare, Square, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrencyPaise } from '../../utils/formatters';
import { rupeesToPaise } from '../../utils/calculations';

export interface SplitPaymentState {
  cashSelected: boolean;
  upiSelected: boolean;
  netBankingSelected: boolean;
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

export const SplitPaymentSelector: React.FC<SplitPaymentSelectorProps> = ({
  agreedAmountPaise,
  state,
  onChange,
  label = 'Payment Allocation',
}) => {
  const cashPaise = state.cashSelected ? rupeesToPaise(state.cashRupees) : 0;
  const upiPaise = state.upiSelected ? rupeesToPaise(state.upiRupees) : 0;
  const netBankingPaise = state.netBankingSelected ? rupeesToPaise(state.netBankingRupees) : 0;

  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const remainingBalancePaise = agreedAmountPaise - totalAllocatedPaise;

  const isExactMatch = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;
  const isUnderpaid = totalAllocatedPaise < agreedAmountPaise;
  const isOverpaid = totalAllocatedPaise > agreedAmountPaise;
  const hasModeSelected = state.cashSelected || state.upiSelected || state.netBankingSelected;

  const handleToggle = (mode: 'cash' | 'upi' | 'netBanking') => {
    if (mode === 'cash') {
      const next = !state.cashSelected;
      onChange({
        ...state,
        cashSelected: next,
        cashRupees: next ? state.cashRupees || (remainingBalancePaise > 0 ? (remainingBalancePaise / 100).toString() : '') : '',
      });
    } else if (mode === 'upi') {
      const next = !state.upiSelected;
      onChange({
        ...state,
        upiSelected: next,
        upiRupees: next ? state.upiRupees || (remainingBalancePaise > 0 ? (remainingBalancePaise / 100).toString() : '') : '',
      });
    } else if (mode === 'netBanking') {
      const next = !state.netBankingSelected;
      onChange({
        ...state,
        netBankingSelected: next,
        netBankingRupees: next ? state.netBankingRupees || (remainingBalancePaise > 0 ? (remainingBalancePaise / 100).toString() : '') : '',
      });
    }
  };

  return (
    <div className="space-y-3.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
          {label} (Multi-Mode Split Allowed)
        </label>
        <span className="font-bold text-slate-700">
          Agreed: <span className="font-extrabold text-brand-950 font-mono text-sm">{formatCurrencyPaise(agreedAmountPaise)}</span>
        </span>
      </div>

      {/* Mode 1: Cash */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-xl">
        <button
          type="button"
          onClick={() => handleToggle('cash')}
          className="flex items-center space-x-2.5 font-bold text-brand-950 cursor-pointer select-none text-left"
        >
          {state.cashSelected ? (
            <CheckSquare className="w-4 h-4 text-accent-600 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>Cash Payment</span>
        </button>

        {state.cashSelected && (
          <div className="relative w-full sm:w-44">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="1"
              min="0"
              value={state.cashRupees}
              onChange={(e) => onChange({ ...state, cashRupees: e.target.value })}
              placeholder="0.00"
              className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}
      </div>

      {/* Mode 2: GPay / PhonePe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-xl">
        <button
          type="button"
          onClick={() => handleToggle('upi')}
          className="flex items-center space-x-2.5 font-bold text-brand-950 cursor-pointer select-none text-left"
        >
          {state.upiSelected ? (
            <CheckSquare className="w-4 h-4 text-accent-600 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>GPay / PhonePe (UPI)</span>
        </button>

        {state.upiSelected && (
          <div className="relative w-full sm:w-44">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="1"
              min="0"
              value={state.upiRupees}
              onChange={(e) => onChange({ ...state, upiRupees: e.target.value })}
              placeholder="0.00"
              className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}
      </div>

      {/* Mode 3: Net Banking */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-xl">
        <button
          type="button"
          onClick={() => handleToggle('netBanking')}
          className="flex items-center space-x-2.5 font-bold text-brand-950 cursor-pointer select-none text-left"
        >
          {state.netBankingSelected ? (
            <CheckSquare className="w-4 h-4 text-accent-600 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>Net Banking (NEFT/IMPS)</span>
        </button>

        {state.netBankingSelected && (
          <div className="relative w-full sm:w-44">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
              ₹
            </span>
            <input
              type="number"
              step="1"
              min="0"
              value={state.netBankingRupees}
              onChange={(e) => onChange({ ...state, netBankingRupees: e.target.value })}
              placeholder="0.00"
              className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-brand-950 text-right focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}
      </div>

      {/* Live Financial Reconciliation Bar (Formula: Total = Cash + UPI + Net Banking; Remaining = Agreed - Total) */}
      <div className="pt-2 border-t border-slate-200/80 space-y-1.5 font-medium">
        <div className="flex justify-between text-slate-600">
          <span>Total Allocated:</span>
          <span className="font-bold text-brand-950 font-mono">
            {formatCurrencyPaise(totalAllocatedPaise)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Remaining Balance:</span>
          <span
            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
              isExactMatch
                ? 'bg-emerald-100 text-emerald-800'
                : isUnderpaid
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {formatCurrencyPaise(remainingBalancePaise)}
          </span>
        </div>

        {/* Live Status Indicator */}
        <div className="pt-1">
          {!hasModeSelected ? (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Please select at least one payment mode above.</span>
            </p>
          ) : isExactMatch ? (
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Exact Match — Payment allocation is fully reconciled.</span>
            </p>
          ) : isUnderpaid ? (
            <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Underpayment: Allocate {formatCurrencyPaise(remainingBalancePaise)} more to match agreed amount.</span>
            </p>
          ) : (
            <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Overpayment: Allocated amount exceeds agreed amount by {formatCurrencyPaise(Math.abs(remainingBalancePaise))}.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
