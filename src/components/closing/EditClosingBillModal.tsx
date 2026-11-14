import React, { useState, useMemo, useRef } from 'react';
import { X, Edit3, Calendar, IndianRupee, ShieldAlert, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import { ClosingBill, Bill } from '../../types';
import { rupeesToPaise, paiseToRupees } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { editClosingBill, EditClosingBillInput } from '../../services/recalculationService';
import { useAuth } from '../../context/AuthContext';
import { useModalScrollLock } from '../../utils/modalScrollLock';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from '../payments/SplitPaymentSelector';

interface EditClosingBillModalProps {
  closingBill: ClosingBill;
  linkedBill?: Bill;
  onClose: () => void;
  onSuccess: (updatedClosing: ClosingBill) => void;
}

export const EditClosingBillModal: React.FC<EditClosingBillModalProps> = ({
  closingBill,
  linkedBill,
  onClose,
  onSuccess,
}) => {
  useModalScrollLock(true, onClose);
  const { currentUser } = useAuth();

  const [closingDate, setClosingDate] = useState(closingBill.closingDate);
  const [closedBy, setClosedBy] = useState(closingBill.closedBy || 'Closed By: Authorized User');
  const [notes, setNotes] = useState(closingBill.notes || '');

  // Settlement Adjustment (+ / -)
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'plus' | 'minus'>(
    closingBill.adjustmentType || 'none'
  );
  const [adjustmentAmountRupees, setAdjustmentAmountRupees] = useState<string>(
    closingBill.adjustmentAmountPaise ? paiseToRupees(closingBill.adjustmentAmountPaise).toString() : ''
  );

  const baseOutstandingPaise: number =
    closingBill.baseOutstandingPaise ??
    closingBill.finalSettlementAmountPaise ??
    closingBill.totalPaidPaise ??
    0;

  const adjustmentPaise = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const parsed = parseFloat(adjustmentAmountRupees);
    return isNaN(parsed) || parsed <= 0 ? 0 : rupeesToPaise(parsed);
  }, [adjustmentType, adjustmentAmountRupees]);

  const targetSettlementPaise = useMemo(() => {
    if (adjustmentType === 'plus') return baseOutstandingPaise + adjustmentPaise;
    if (adjustmentType === 'minus') return Math.max(0, baseOutstandingPaise - adjustmentPaise);
    return baseOutstandingPaise;
  }, [baseOutstandingPaise, adjustmentType, adjustmentPaise]);

  // Split payment state
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: closingBill.cashPaise
      ? paiseToRupees(closingBill.cashPaise).toString()
      : closingBill.paymentMode === 'Cash' && closingBill.totalPaidPaise
      ? paiseToRupees(closingBill.totalPaidPaise).toString()
      : '',
    upiRupees: closingBill.upiPaise
      ? paiseToRupees(closingBill.upiPaise).toString()
      : closingBill.paymentMode === 'UPI' && closingBill.totalPaidPaise
      ? paiseToRupees(closingBill.totalPaidPaise).toString()
      : '',
    netBankingRupees: closingBill.netBankingPaise
      ? paiseToRupees(closingBill.netBankingPaise).toString()
      : closingBill.paymentMode === 'Bank Transfer' && closingBill.totalPaidPaise
      ? paiseToRupees(closingBill.totalPaidPaise).toString()
      : '',
  });

  // Security & Audit State
  const [ownerCredential, setOwnerCredential] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isExactSettlement = totalAllocatedPaise === targetSettlementPaise && targetSettlementPaise > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (totalAllocatedPaise <= 0) {
      setError('Closing settlement payment must be greater than ₹0.00.');
      return;
    }

    if (!isExactSettlement) {
      setError(`Settlement mismatch! The sum of Cash, GPay, and Others (${formatCurrencyPaise(totalAllocatedPaise)}) must match target settlement (${formatCurrencyPaise(targetSettlementPaise)}).`);
      return;
    }

    if (!reason.trim()) {
      setError('A valid reason for editing this closing record is mandatory for audit compliance.');
      return;
    }

    if (!ownerCredential.trim()) {
      setError('Owner PIN or Master Password is required to authorize closing alterations.');
      return;
    }

    const updates: EditClosingBillInput = {
      closingDate,
      totalPaidPaise: totalAllocatedPaise,
      cashPaise,
      upiPaise,
      netBankingPaise,
      closedBy: closedBy.trim(),
      notes: notes.trim(),
      adjustmentType: adjustmentType !== 'none' ? adjustmentType : undefined,
      adjustmentAmountPaise: adjustmentPaise > 0 ? adjustmentPaise : undefined,
    };

    try {
      submittingRef.current = true;
      setLoading(true);

      const res = await editClosingBill(closingBill.shopId, closingBill.id, updates, {
        reason: reason.trim(),
        performedBy: currentUser?.displayName || 'Owner',
        performedByUid: currentUser?.uid || '',
        ownerCredential: ownerCredential.trim(),
      });

      if (!res.success || !res.closingBill) {
        setError(res.error || 'Failed to edit closing bill.');
        return;
      }

      onSuccess(res.closingBill);
      onClose();
    } catch (err: any) {
      console.error('Error submitting closing bill edit:', err);
      setError(err?.message || 'Failed to save closing alterations. Please check credentials.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-closing-title"
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-800 via-indigo-900 to-brand-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Edit3 className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 id="edit-closing-title" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>Edit / Alter Closing Settlement</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/20 text-white border border-white/20">
                  {closingBill.billNumber}
                </span>
              </h3>
              <p className="text-[11px] text-purple-200 font-medium">
                Customer: {closingBill.partyName}
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

            {/* Status consistency info */}
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Historical Settlement Integrity</p>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Modifying closing settlement date, amount, or split payments will maintain the linked bill&apos;s closed status and recalculate dependent financial history.
                </p>
              </div>
            </div>

            {/* Closing Date & Closed By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Closing Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Closed By (Operator) *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={closedBy}
                    onChange={(e) => setClosedBy(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>

            {/* Mandatory Settlement Adjustment */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                    Settlement Adjustment (+ / -)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Base Outstanding: {formatCurrencyPaise(baseOutstandingPaise)}
                  </p>
                </div>

                <div className="inline-flex rounded-xl p-1 bg-slate-200/70 border border-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('none');
                      setAdjustmentAmountRupees('');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      adjustmentType === 'none'
                        ? 'bg-white text-brand-950 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('plus')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      adjustmentType === 'plus'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + PLUS
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('minus')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      adjustmentType === 'minus'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    - MINUS
                  </button>
                </div>
              </div>

              {adjustmentType !== 'none' && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3 animate-fadeIn">
                  <span className="text-xs font-semibold text-slate-700">
                    {adjustmentType === 'plus' ? 'Positive Adjustment (+ Fee):' : 'Negative Adjustment (- Discount):'}
                  </span>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={adjustmentAmountRupees}
                      onChange={(e) => setAdjustmentAmountRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold font-mono text-right text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Target Settlement Summary */}
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-950 block">Target Settlement Amount</span>
                <span className="text-[11px] text-purple-700 font-mono">
                  Base ({formatCurrencyPaise(baseOutstandingPaise)})
                  {adjustmentType === 'plus' && ` + ${formatCurrencyPaise(adjustmentPaise)}`}
                  {adjustmentType === 'minus' && ` - ${formatCurrencyPaise(adjustmentPaise)}`}
                </span>
              </div>
              <span className="text-base sm:text-lg font-black font-mono text-purple-950">
                {formatCurrencyPaise(targetSettlementPaise)}
              </span>
            </div>

            {/* Multi-Mode Split Intake Engine */}
            <SplitPaymentSelector
              agreedAmountPaise={targetSettlementPaise}
              state={splitState}
              onChange={setSplitState}
              label="Closing Settlement Split Payment"
              isCloseBill={true}
            />

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Settlement Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Corrected closing receipt notes"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            {/* MANDATORY SECURITY AUTHORIZATION & AUDIT REASON */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
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
                  placeholder="e.g. Reconciled cash drawer and updated split allocation"
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
              disabled={loading || !isExactSettlement}
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recalculating & Saving...</span>
                </>
              ) : (
                <span>Save & Recalculate Closing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
