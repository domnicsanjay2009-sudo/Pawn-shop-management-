import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CheckCircle, Calendar, IndianRupee, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { Party, Bill, PaymentMode } from '../../types';
import { evaluateBillStatus, rupeesToPaise } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from '../payments/SplitPaymentSelector';

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
  const { currentUser } = useAuth();
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [customSettlementRupees, setCustomSettlementRupees] = useState<string>('');
  
  // 2.1 Single User-Editable Closing Identification Field
  const [closedByInput, setClosedByInput] = useState<string>('');
  
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

  // 3. Always Visible Split Settlement State (Cash, UPI, Net Banking)
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: (defaultTotalPaise / 100).toString(),
    upiRupees: '',
    netBankingRupees: '',
  });

  // Keep Cash auto-synced with agreed settlement if other two modes are empty
  useEffect(() => {
    const upiVal = parseInputRupeesToPaise(splitState.upiRupees);
    const netVal = parseInputRupeesToPaise(splitState.netBankingRupees);

    if (upiVal === 0 && netVal === 0) {
      setSplitState((prev) => ({
        ...prev,
        cashRupees: (settlementPaise / 100).toString(),
      }));
    }
  }, [settlementPaise]);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);

  // Formula: Total Allocated = Cash + GPay/PhonePe + Net Banking
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isAllocationExact = totalAllocatedPaise === settlementPaise && settlementPaise > 0;

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

    // 2.3 Strict Zero Payment Validation (Total Allocated = ₹0.00)
    if (totalAllocatedPaise <= 0 || settlementPaise <= 0) {
      setError('Cannot close this bill. Payment amount must be greater than ₹0.00.');
      return;
    }

    // 3.4 Strict Settlement Reconciliation: Remaining Balance must equal exactly ₹0.00
    if (totalAllocatedPaise !== settlementPaise) {
      setError(
        'Settlement mismatch! The total payment allocation must exactly match the agreed settlement amount. Please correct the payment amounts before closing this bill.'
      );
      return;
    }

    // 2.2 Default Name Logic:
    // Trim unnecessary whitespace; do not accept whitespace-only as custom name.
    // If left blank, automatically use the customer's registered name.
    const trimmedClosedBy = closedByInput.trim();
    const resolvedName = trimmedClosedBy !== '' ? trimmedClosedBy : party.name;
    const finalClosedByIdentification = resolvedName.toLowerCase().startsWith('closed by:')
      ? resolvedName
      : `Closed By: ${resolvedName}`;

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
        agreedSettlementPaise: settlementPaise,
        totalAllocatedPaise,
        closedBy: finalClosedByIdentification,
        closedByUid,
        closingTransactionId,
        notes: 'Pawn pledge redeemed in full, items returned to customer',
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
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
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
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-5 mb-0 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl font-bold flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                {formatCurrencyPaise(defaultTotalPaise)}
              </span>
            </div>
          </div>

          {/* Closing Date & Agreed Settlement Override */}
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
                Agreed Settlement (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={customSettlementRupees}
                  onChange={(e) => setCustomSettlementRupees(e.target.value)}
                  placeholder={(defaultTotalPaise / 100).toString()}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Split Settlement - Always Visible Payment Mode Fields */}
          <SplitPaymentSelector
            agreedAmountPaise={settlementPaise}
            state={splitState}
            onChange={setSplitState}
            label="Split Settlement Breakdown"
          />

          {/* 2.1 Single User-Editable Field: Closed By */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>Closed By</span>
              <span className="text-[11px] text-slate-400 normal-case font-normal">
                (Defaults to customer if blank)
              </span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={closedByInput}
                onChange={(e) => setClosedByInput(e.target.value)}
                placeholder={`Leave blank to save as: ${party.name}`}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium text-brand-950"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Recorded closing identification:{' '}
              <strong className="text-brand-950 font-mono">
                {closedByInput.trim() ? `Closed By: ${closedByInput.trim()}` : `Closed By: ${party.name}`}
              </strong>
            </p>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Closing this bill marks the pledge as redeemed. All original records and payments remain preserved for audit compliance.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAllocationExact || totalAllocatedPaise <= 0}
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
