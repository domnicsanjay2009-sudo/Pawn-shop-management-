import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CheckCircle, Calendar, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { Party, Bill, PaymentMode } from '../../types';
import { evaluateBillStatus } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from '../payments/SplitPaymentSelector';
import { useModalScrollLock } from '../../utils/modalScrollLock';

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
  
  // 1. Background Interaction Lock & Keyboard Accessibility
  useModalScrollLock(true, onClose);

  const [closingDate, setClosingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // 3. User-Editable Closing Attribution Field
  const [closedByInput, setClosedByInput] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Determine current operator identity (Staff Member -> Shop Owner -> Authorized User)
  // NEVER default to customer name!
  const defaultAttribution = useMemo(() => {
    let staffName = '';
    try {
      staffName =
        localStorage.getItem('psm_active_staff_name') ||
        sessionStorage.getItem('psm_active_staff_name') ||
        localStorage.getItem('active_staff_name') ||
        '';
    } catch {
      // Ignore storage access errors
    }

    if (staffName.trim()) {
      return { name: staffName.trim(), role: 'staff' as const };
    }

    const ownerName = shopProfile?.ownerName?.trim() || currentUser?.displayName?.trim();
    if (ownerName) {
      return { name: ownerName, role: 'owner' as const };
    }

    return { name: 'Authorized User', role: 'authorized_user' as const };
  }, [shopProfile, currentUser]);

  // Calculate actual financial status from trusted calculation engine
  const status = useMemo(() => {
    return evaluateBillStatus(bill, closingDate);
  }, [bill, closingDate]);

  // Actual current outstanding balance required to close
  const previousOutstandingPaise = status.totalPayablePaise;

  // 2. Three Permanently Visible Payment Mode Inputs (Cash, UPI, Net Banking)
  // Initially allocate the computed outstanding to Cash by default
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: (previousOutstandingPaise / 100).toString(),
    upiRupees: '',
    netBankingRupees: '',
  });

  // Keep Cash auto-synced with calculated outstanding if UPI and Net Banking remain empty
  useEffect(() => {
    const upiVal = parseInputRupeesToPaise(splitState.upiRupees);
    const netVal = parseInputRupeesToPaise(splitState.netBankingRupees);

    if (upiVal === 0 && netVal === 0) {
      setSplitState((prev) => ({
        ...prev,
        cashRupees: (previousOutstandingPaise / 100).toString(),
      }));
    }
  }, [previousOutstandingPaise]);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);

  // Formula: Total Paid = Cash + GPay/PhonePe + Net Banking
  const totalPaidPaise = cashPaise + upiPaise + netBankingPaise;

  // Formula: Remaining Outstanding = Previous Outstanding Balance - Total Paid
  const remainingOutstandingPaise = previousOutstandingPaise - totalPaidPaise;
  const isAllocationExact = totalPaidPaise === previousOutstandingPaise && totalPaidPaise > 0;

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

    // Strict Zero Payment Validation: Total Paid must be greater than ₹0.00
    if (totalPaidPaise <= 0) {
      setError('Cannot close this bill. Please enter a valid payment amount.');
      return;
    }

    // Strict Closure Validation: Total Paid must exactly equal the outstanding amount
    if (totalPaidPaise < previousOutstandingPaise) {
      setError(
        `Payment is insufficient! Remaining outstanding: ${formatCurrencyPaise(
          remainingOutstandingPaise
        )}. Please allocate the full settlement amount before closing.`
      );
      return;
    }

    if (totalPaidPaise > previousOutstandingPaise) {
      setError(
        `Overpayment detected! Total paid exceeds the outstanding balance by ${formatCurrencyPaise(
          totalPaidPaise - previousOutstandingPaise
        )}. Please adjust payment amounts.`
      );
      return;
    }

    // 3. Accurate Audit Logging – Closed By Attribution
    // Scenario D: Manually entered name (preserve exact entered string, trimming only leading/trailing spaces)
    // Scenario A/B/C: Default to Authenticated Staff / Owner / Authorized User (NEVER the customer)
    const entered = closedByInput.trim();
    let finalClosedByIdentification = '';
    let finalRole: 'owner' | 'staff' | 'authorized_user' = defaultAttribution.role;

    if (entered !== '') {
      finalClosedByIdentification = entered.toLowerCase().startsWith('closed by:')
        ? entered
        : `Closed By: ${entered}`;
      finalRole = 'authorized_user';
    } else {
      finalClosedByIdentification = `Closed By: ${defaultAttribution.name}`;
      finalRole = defaultAttribution.role;
    }

    const activeModes: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[] = [];
    if (cashPaise > 0) activeModes.push('Cash');
    if (upiPaise > 0) activeModes.push('GPay / PhonePe');
    if (netBankingPaise > 0) activeModes.push('Net Banking');

    const summaryMode: PaymentMode =
      activeModes.length > 1
        ? 'Split'
        : activeModes[0] === 'GPay / PhonePe'
        ? 'UPI'
        : activeModes[0] === 'Net Banking'
        ? 'Bank Transfer'
        : 'Cash';

    const closingTransactionId = `tx_close_${bill.id}_${Date.now()}`;
    const closedByUid = currentUser?.uid || '';

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
        totalPaidPaise,
        totalAllocatedPaise: totalPaidPaise,
        agreedSettlementPaise: previousOutstandingPaise,
        finalSettlementAmountPaise: previousOutstandingPaise,
        finalOutstandingPaise: 0,
        closedBy: finalClosedByIdentification,
        closedByUid,
        closedByRole: finalRole,
        closingTransactionId,
        notes: 'Pawn pledge redeemed in full, items returned to customer',
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
        aria-labelledby="modal-close-bill-title"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Shrink-0) */}
        <div className="bg-gradient-to-r from-brand-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 id="modal-close-bill-title" className="text-base font-bold text-white">
                Redeem & Close Bill
              </h3>
              <p className="text-xs text-slate-300">
                Bill {bill.billNumber} • Customer: {party.name}
              </p>
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
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl font-bold flex items-start space-x-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

          {/* Financial Status Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Initial Principal:</span>
              <span className="font-bold text-brand-950 font-mono">
                {formatCurrencyPaise(bill.principalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding Principal:</span>
              <span className="font-bold text-brand-950 font-mono">
                {formatCurrencyPaise(status.remainingPrincipalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Accrued Interest ({status.daysElapsed} days elapsed):</span>
              <span className="font-bold text-accent-600 font-mono">
                {formatCurrencyPaise(status.accruedInterestPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 pt-2 border-t border-slate-200 text-sm font-bold">
              <span>Computed Settlement Total:</span>
              <span className="text-emerald-700 font-extrabold text-base font-mono">
                {formatCurrencyPaise(previousOutstandingPaise)}
              </span>
            </div>
          </div>

          {/* Closing Date Selection */}
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

          {/* 2. Streamlined Payment Intake – No Agreed Settlement Total Field */}
          <SplitPaymentSelector
            agreedAmountPaise={previousOutstandingPaise}
            state={splitState}
            onChange={setSplitState}
            isCloseBill={true}
            label="Payment Intake (Split Across Modes)"
          />

          {/* 3. Accurate Audit Logging – Closed By Attribution */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>Closed By</span>
              <span className="text-[11px] text-slate-400 normal-case font-normal">
                (Defaults to operator identity if empty)
              </span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={closedByInput}
                onChange={(e) => setClosedByInput(e.target.value)}
                placeholder={`Defaults to: ${defaultAttribution.name}`}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium text-brand-950"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Recorded closing identification:{' '}
              <strong className="text-brand-950 font-mono">
                {closedByInput.trim()
                  ? `Closed By: ${closedByInput.trim()}`
                  : `Closed By: ${defaultAttribution.name}`}
              </strong>
            </p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Closing this bill marks the pledge as redeemed. All payment records and audit signatures are permanently preserved.
            </span>
          </div>

          {/* Action Buttons (Always visible at the bottom) */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAllocationExact || totalPaidPaise <= 0}
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
