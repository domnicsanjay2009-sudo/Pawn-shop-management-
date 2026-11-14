import React, { useState, useMemo, useRef } from 'react';
import { X, Edit3, Calendar, IndianRupee, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { Payment, Bill, PaymentMode } from '../../types';
import { rupeesToPaise, paiseToRupees } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { editPayment, EditPaymentInput } from '../../services/recalculationService';
import { useAuth } from '../../context/AuthContext';
import { useModalScrollLock } from '../../utils/modalScrollLock';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from './SplitPaymentSelector';

interface EditPaymentModalProps {
  payment: Payment;
  availableBills?: Bill[];
  onClose: () => void;
  onSuccess: (updatedPayment: Payment) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  availableBills = [],
  onClose,
  onSuccess,
}) => {
  useModalScrollLock(true, onClose);
  const { currentUser } = useAuth();

  const [paymentDate, setPaymentDate] = useState(payment.paymentDate);
  const [amountRupees, setAmountRupees] = useState(paiseToRupees(payment.amountPaise).toString());
  const [selectedBillId, setSelectedBillId] = useState(payment.billId);
  const [notes, setNotes] = useState(payment.notes || '');

  // Split payment state initialized from existing payment values
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: payment.cashPaise ? paiseToRupees(payment.cashPaise).toString() : (payment.paymentMode === 'Cash' ? paiseToRupees(payment.amountPaise).toString() : ''),
    upiRupees: payment.upiPaise ? paiseToRupees(payment.upiPaise).toString() : (payment.paymentMode === 'UPI' ? paiseToRupees(payment.amountPaise).toString() : ''),
    netBankingRupees: payment.netBankingPaise ? paiseToRupees(payment.netBankingPaise).toString() : (payment.paymentMode === 'Bank Transfer' ? paiseToRupees(payment.amountPaise).toString() : ''),
  });

  // Security & Audit State
  const [ownerCredential, setOwnerCredential] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const agreedAmountPaise = useMemo(() => {
    const parsed = parseFloat(amountRupees);
    return isNaN(parsed) || parsed <= 0 ? 0 : rupeesToPaise(parsed);
  }, [amountRupees]);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isAllocationExact = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;

  // Bills of the same party that can be linked
  const eligibleBills = useMemo(() => {
    return availableBills.filter((b) => b.partyId === payment.partyId);
  }, [availableBills, payment.partyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (agreedAmountPaise <= 0) {
      setError('Payment amount must be greater than ₹0.00.');
      return;
    }

    if (!isAllocationExact) {
      setError('Settlement mismatch! The sum of Cash, GPay, and Others must exactly equal the total payment amount.');
      return;
    }

    if (!reason.trim()) {
      setError('A valid reason for editing this payment record is mandatory for audit compliance.');
      return;
    }

    if (!ownerCredential.trim()) {
      setError('Owner PIN or Master Password is required to authorize payment alterations.');
      return;
    }

    const activeModes: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[] = [];
    if (cashPaise > 0) activeModes.push('Cash');
    if (upiPaise > 0) activeModes.push('GPay / PhonePe');
    if (netBankingPaise > 0) activeModes.push('Net Banking');

    let primaryMode: PaymentMode = 'Split';
    if (activeModes.length === 1) {
      primaryMode = activeModes[0] === 'GPay / PhonePe' ? 'UPI' : activeModes[0] === 'Net Banking' ? 'Bank Transfer' : 'Cash';
    }

    const updates: EditPaymentInput = {
      paymentDate,
      amountPaise: agreedAmountPaise,
      cashPaise,
      upiPaise,
      netBankingPaise,
      paymentMode: primaryMode,
      notes: notes.trim(),
      targetBillId: selectedBillId !== payment.billId ? selectedBillId : undefined,
    };

    try {
      submittingRef.current = true;
      setLoading(true);

      const res = await editPayment(payment.shopId, payment.id, updates, {
        reason: reason.trim(),
        performedBy: currentUser?.displayName || 'Owner',
        performedByUid: currentUser?.uid || '',
        ownerCredential: ownerCredential.trim(),
      });

      if (!res.success || !res.payment) {
        setError(res.error || 'Failed to edit payment and recalculate balance.');
        return;
      }

      onSuccess(res.payment);
      onClose();
    } catch (err: any) {
      console.error('Error submitting payment edit:', err);
      setError(err?.message || 'Failed to save payment alterations. Please check credentials.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-payment-title"
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Edit3 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 id="edit-payment-title" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>Edit / Alter Payment</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/20 text-white border border-white/20">
                  {payment.billNumber}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Customer: {payment.partyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Replay Notice */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Historical Replay & Reallocation</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Saving alterations will replay this payment and all subsequent transactions in exact chronological order, recalculating interest settlements and principal balance.
                </p>
              </div>
            </div>

            {/* Linked Bill Selection (if customer has other bills) */}
            {eligibleBills.length > 1 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Linked Pledge Bill *
                </label>
                <select
                  value={selectedBillId}
                  onChange={(e) => setSelectedBillId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
                >
                  {eligibleBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.billNumber} • {b.itemCategory} ({b.itemDescription}) • Status: {b.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Date & Total Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            {/* Multi-Mode Split Intake Engine */}
            <SplitPaymentSelector
              agreedAmountPaise={agreedAmountPaise}
              state={splitState}
              onChange={setSplitState}
              label="Split Payment Allocation (Cash, GPay, Others)"
            />

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Receipt Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Corrected cash count after reconciliation"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            {/* MANDATORY SECURITY AUTHORIZATION & AUDIT REASON */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Security Authorization & Audit Record
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Reason for Alteration *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Corrected date from customer bank statement"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Owner PIN or Master Password *
                </label>
                <input
                  type="password"
                  required
                  value={ownerCredential}
                  onChange={(e) => setOwnerCredential(e.target.value)}
                  placeholder="Enter PIN or Password to authorize"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-mono text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
                  <span>Recalculating & Saving...</span>
                </>
              ) : (
                <span>Save & Recalculate Balance</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
