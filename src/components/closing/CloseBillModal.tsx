import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CheckCircle, Calendar, IndianRupee, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Party, Bill, PaymentMode } from '../../types';
import { evaluateBillStatus, rupeesToPaise } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { SplitPaymentSelector, SplitPaymentState } from '../payments/SplitPaymentSelector';

interface CloseBillModalProps {
  party: Party;
  bill: Bill;
  onClose: () => void;
  onConfirmClose: (data: any) => Promise<void>;
}

export const CloseBillModal: React.FC<CloseBillModalProps> = ({
  party,
  bill,
  onClose,
  onConfirmClose,
}) => {
  const { currentUser, shopProfile } = useAuth();
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSettlementRupees, setCustomSettlementRupees] = useState<string>('');
  const [notes, setNotes] = useState('Pawn pledge redeemed in full, items returned to customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Calculate exact financial reconciliation to closing date
  const status = useMemo(() => {
    return evaluateBillStatus(bill, closingDate);
  }, [bill, closingDate]);

  const defaultTotalPaise = status.totalPayablePaise;
  const settlementPaise = customSettlementRupees
    ? rupeesToPaise(customSettlementRupees)
    : defaultTotalPaise;

  // Multi-Mode Split Payment Allocation State (Module 7)
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashSelected: true,
    upiSelected: false,
    netBankingSelected: false,
    cashRupees: (defaultTotalPaise / 100).toString(),
    upiRupees: '',
    netBankingRupees: '',
  });

  // Keep single selected mode synchronized with agreed settlement amount
  useEffect(() => {
    const activeCount =
      (splitState.cashSelected ? 1 : 0) +
      (splitState.upiSelected ? 1 : 0) +
      (splitState.netBankingSelected ? 1 : 0);

    if (activeCount === 1) {
      const amountStr = (settlementPaise / 100).toString();
      if (splitState.cashSelected) {
        setSplitState((prev) => ({ ...prev, cashRupees: amountStr }));
      } else if (splitState.upiSelected) {
        setSplitState((prev) => ({ ...prev, upiRupees: amountStr }));
      } else if (splitState.netBankingSelected) {
        setSplitState((prev) => ({ ...prev, netBankingRupees: amountStr }));
      }
    }
  }, [settlementPaise, splitState.cashSelected, splitState.upiSelected, splitState.netBankingSelected]);

  const cashPaise = splitState.cashSelected ? rupeesToPaise(splitState.cashRupees) : 0;
  const upiPaise = splitState.upiSelected ? rupeesToPaise(splitState.upiRupees) : 0;
  const netBankingPaise = splitState.netBankingSelected ? rupeesToPaise(splitState.netBankingRupees) : 0;
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isAllocationExact = totalAllocatedPaise === settlementPaise && settlementPaise > 0;

  const closedByName = shopProfile?.ownerName || currentUser?.displayName || 'Shop Owner';
  const closedByUid = currentUser?.uid || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (bill.status === 'Closed') {
      setError('This bill is already closed.');
      return;
    }

    if (bill.partyId !== party.id) {
      setError('Security validation failed: Bill does not belong to this customer.');
      return;
    }

    if (!splitState.cashSelected && !splitState.upiSelected && !splitState.netBankingSelected) {
      setError('Please select at least one settlement payment mode.');
      return;
    }

    if (totalAllocatedPaise < settlementPaise) {
      const diff = settlementPaise - totalAllocatedPaise;
      setError(`Reconciliation failed: Underpayment by ${formatCurrencyPaise(diff)}. Split allocations must match agreed settlement exactly.`);
      return;
    }

    if (totalAllocatedPaise > settlementPaise) {
      const diff = totalAllocatedPaise - settlementPaise;
      setError(`Reconciliation failed: Overpayment by ${formatCurrencyPaise(diff)}. Split allocations must match agreed settlement exactly.`);
      return;
    }

    const activeModes: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[] = [];
    if (splitState.cashSelected && cashPaise > 0) activeModes.push('Cash');
    if (splitState.upiSelected && upiPaise > 0) activeModes.push('GPay / PhonePe');
    if (splitState.netBankingSelected && netBankingPaise > 0) activeModes.push('Net Banking');

    const summaryMode: PaymentMode = activeModes.length > 1
      ? 'Split'
      : activeModes[0] === 'GPay / PhonePe'
      ? 'UPI'
      : activeModes[0] === 'Net Banking'
      ? 'Bank Transfer'
      : 'Cash';

    const closingTransactionId = `tx_close_${bill.id}_${Date.now()}`;

    submittingRef.current = true;
    setLoading(true);
    try {
      await onConfirmClose({
        billId: bill.id,
        partyId: party.id,
        closingDate,
        paymentMode: summaryMode,
        paymentModes: activeModes,
        splitAllocations: {
          cashPaise,
          upiPaise,
          netBankingPaise,
        },
        cashPaise,
        upiPaise,
        netBankingPaise,
        agreedSettlementPaise: settlementPaise,
        totalAllocatedPaise,
        closedBy: closedByName,
        closedByUid,
        closingTransactionId,
        notes: notes.trim(),
        finalSettlementAmountPaise: settlementPaise,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to close bill.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Redeem & Close Bill</h3>
              <p className="text-xs text-slate-300">
                Bill {bill.billNumber} • Party: {party.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Collateral details summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Pledged Collateral:</span>
              <span className="font-semibold text-brand-950">
                {bill.itemCategory} - {bill.itemDescription}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Weight:</span>
              <span className="font-semibold text-brand-950">
                Gross {bill.grossWeight}{bill.weightUnit} / Net {bill.netWeight}{bill.weightUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Initial Loan Date:</span>
              <span className="font-mono text-brand-950">{formatDate(bill.billDate)}</span>
            </div>
          </div>

          {/* Financial Reconciliation Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Initial Principal:</span>
              <span className="font-bold text-brand-950">
                {formatCurrencyPaise(bill.principalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding Principal:</span>
              <span className="font-bold text-brand-950">
                {formatCurrencyPaise(status.remainingPrincipalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Accrued Interest ({status.daysElapsed} days elapsed):</span>
              <span className="font-bold text-accent-600">
                {formatCurrencyPaise(status.accruedInterestPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 pt-2 border-t border-slate-200 text-sm font-bold">
              <span>Computed Settlement Total:</span>
              <span className="text-emerald-700 font-extrabold text-base">
                {formatCurrencyPaise(defaultTotalPaise)}
              </span>
            </div>
          </div>

          {/* Closing Date & Settlement Amount override */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Closing Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Agreed Settlement (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  value={customSettlementRupees}
                  onChange={(e) => setCustomSettlementRupees(e.target.value)}
                  placeholder={(defaultTotalPaise / 100).toString()}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
          </div>

          {/* Multi-Mode Split Settlement Allocation */}
          <SplitPaymentSelector
            agreedAmountPaise={settlementPaise}
            state={splitState}
            onChange={setSplitState}
            label="Settlement Payment Allocation"
          />

          {/* Closing Remarks */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Closing Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Immutable Audit Trail Signature */}
          <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-brand-900 shrink-0" />
              <span>Immutable Audit Signature:</span>
            </div>
            <span className="font-bold text-brand-950 font-mono text-[11px]">
              Closed By: {closedByName} {closedByUid ? `(${closedByUid.substring(0, 8)}...)` : ''}
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Closing this bill marks the pledge as redeemed. All original records and payments remain preserved for audit compliance.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAllocationExact}
              className="px-6 py-2.5 bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Closing...</span>
                </>
              ) : (
                <span>Confirm Bill Closure</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
