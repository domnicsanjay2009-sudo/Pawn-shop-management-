import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CreditCard, Calendar, IndianRupee, Loader2, ArrowRight } from 'lucide-react';
import { Party, Bill, PaymentMode } from '../../types';
import { rupeesToPaise, allocatePayment, evaluateBillStatus } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from './SplitPaymentSelector';
import { useModalScrollLock } from '../../utils/modalScrollLock';

interface AddPaymentModalProps {
  party: Party;
  bill?: Bill;
  allPartyBills: Bill[];
  onClose: () => void;
  onSavePayment: (data: any) => Promise<void>;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  party,
  bill,
  allPartyBills,
  onClose,
  onSavePayment,
}) => {
  // Modal Background Lock & Keyboard Accessibility
  useModalScrollLock(true, onClose);

  const activeBills = useMemo(() => {
    return allPartyBills.filter((b) => b.status === 'Active');
  }, [allPartyBills]);

  const [selectedBillId, setSelectedBillId] = useState(bill?.id || (activeBills[0]?.id || ''));
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Multi-Mode Split Payment Allocation State (Module 7)
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: '',
    upiRupees: '',
    netBankingRupees: '',
  });

  const currentBill = useMemo(() => {
    return activeBills.find((b) => b.id === selectedBillId) || bill;
  }, [activeBills, selectedBillId, bill]);

  const agreedAmountPaise = useMemo(() => {
    const parsed = parseFloat(amountRupees);
    return isNaN(parsed) || parsed <= 0 ? 0 : rupeesToPaise(parsed);
  }, [amountRupees]);

  // Synchronize Cash amount when agreed amount is typed if UPI & Net Banking are empty
  useEffect(() => {
    const upiVal = parseInputRupeesToPaise(splitState.upiRupees);
    const netVal = parseInputRupeesToPaise(splitState.netBankingRupees);

    if (upiVal === 0 && netVal === 0) {
      setSplitState((prev) => ({ ...prev, cashRupees: amountRupees }));
    }
  }, [amountRupees]);

  // Real-time calculation of allocation
  const allocationBreakdown = useMemo(() => {
    if (!currentBill || agreedAmountPaise <= 0) return null;

    const finStatus = evaluateBillStatus(currentBill, paymentDate);
    const allocation = allocatePayment(currentBill, agreedAmountPaise, paymentDate);

    return {
      finStatus,
      allocation,
    };
  }, [currentBill, agreedAmountPaise, paymentDate]);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isAllocationExact = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (!currentBill) {
      setError('Please select an active bill.');
      return;
    }

    if (agreedAmountPaise <= 0 || totalAllocatedPaise <= 0) {
      setError('Payment amount must be greater than ₹0.00.');
      return;
    }

    if (allocationBreakdown && agreedAmountPaise >= allocationBreakdown.finStatus.totalPayablePaise) {
      setError('Please Close the Bill');
      return;
    }

    if (totalAllocatedPaise !== agreedAmountPaise) {
      setError(
        'Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before recording this payment.'
      );
      return;
    }

    const activeModes: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[] = [];
    if (cashPaise > 0) activeModes.push('Cash');
    if (upiPaise > 0) activeModes.push('GPay / PhonePe');
    if (netBankingPaise > 0) activeModes.push('Net Banking');

    const summaryMode: PaymentMode = activeModes.length > 1
      ? 'Split'
      : activeModes[0] === 'GPay / PhonePe'
      ? 'UPI'
      : activeModes[0] === 'Net Banking'
      ? 'Bank Transfer'
      : 'Cash';

    submittingRef.current = true;
    setLoading(true);
    try {
      await onSavePayment({
        billId: currentBill.id,
        partyId: party.id,
        partyName: party.name,
        amountPaise: agreedAmountPaise,
        agreedPaymentPaise: agreedAmountPaise,
        totalAllocatedPaise,
        paymentDate,
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
        notes: notes.trim(),
        idempotencyKey: `pay_${currentBill.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Payment submission failed.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-payment-title"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Shrink-0) */}
        <div className="bg-gradient-to-r from-brand-950 to-brand-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-add-payment-title" className="text-base font-bold text-white">Record Customer Payment</h3>
              <p className="text-xs text-slate-300">Party: {party.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Bill Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Select Pledge Bill *
            </label>
            <select
              required
              value={selectedBillId}
              onChange={(e) => setSelectedBillId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {activeBills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.billNumber} - {b.itemCategory} ({formatCurrencyPaise(b.currentPrincipalPaise)} principal)
                </option>
              ))}
            </select>
          </div>

          {/* Current Financial Status Card */}
          {allocationBreakdown && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Remaining Principal:</span>
                <span className="font-bold text-brand-950">
                  {formatCurrencyPaise(allocationBreakdown.finStatus.remainingPrincipalPaise)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Accrued Interest ({allocationBreakdown.finStatus.daysElapsed} days):</span>
                <span className="font-bold text-accent-600">
                  {formatCurrencyPaise(allocationBreakdown.finStatus.accruedInterestPaise)}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 pt-1.5 border-t border-slate-200 font-bold">
                <span>Total Amount Due:</span>
                <span className="text-emerald-700 font-extrabold text-sm">
                  {formatCurrencyPaise(allocationBreakdown.finStatus.totalPayablePaise)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Payment Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  required
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Payment Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Real-time Allocation Preview */}
          {allocationBreakdown && parseFloat(amountRupees) > 0 && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-900 animate-fadeIn">
              <p className="font-bold flex items-center">
                <span>Automatic Allocation Preview:</span>
              </p>
              <div className="flex justify-between">
                <span>• Settles Accrued Interest:</span>
                <span className="font-bold">
                  {formatCurrencyPaise(allocationBreakdown.allocation.interestPortionPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>• Reduces Loan Principal:</span>
                <span className="font-bold">
                  {formatCurrencyPaise(allocationBreakdown.allocation.principalPortionPaise)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200">
                <span>New Remaining Principal:</span>
                <span className="font-bold">
                  {formatCurrencyPaise(allocationBreakdown.allocation.newRemainingPrincipalPaise)}
                </span>
              </div>
            </div>
          )}

          {/* Multi-Mode Split Payment Engine */}
          <SplitPaymentSelector
            agreedAmountPaise={agreedAmountPaise}
            state={splitState}
            onChange={setSplitState}
            label="Payment Mode Allocation"
          />

          {/* Receipt Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Receipt Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Part payment received via Cash & GPay"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          </div>

          {/* Modal Actions (Shrink-0) */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm Payment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
