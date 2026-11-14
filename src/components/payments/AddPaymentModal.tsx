import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CreditCard, Calendar, IndianRupee, Loader2, AlertCircle } from 'lucide-react';
import { Party, Bill, PaymentMode } from '../../types';
import { rupeesToPaise, allocatePayment, evaluateBillStatus } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from './SplitPaymentSelector';
import { PartyAndBillSearchSelector } from '../common/PartyAndBillSearchSelector';
import { useModalScrollLock } from '../../utils/modalScrollLock';

interface AddPaymentModalProps {
  party?: Party | null;
  bill?: Bill | null;
  allPartyBills?: Bill[];
  allParties?: Party[];
  allBills?: Bill[];
  onClose: () => void;
  onSavePayment: (data: any) => Promise<void>;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  party,
  bill,
  allPartyBills = [],
  allParties = [],
  allBills = [],
  onClose,
  onSavePayment,
}) => {
  // Modal Background Lock & Keyboard Accessibility
  useModalScrollLock(true, onClose);

  // Pool of parties and bills to search from
  const partiesPool = useMemo(() => {
    if (allParties.length > 0) return allParties;
    return party ? [party] : [];
  }, [allParties, party]);

  const billsPool = useMemo(() => {
    if (allBills.length > 0) return allBills;
    if (allPartyBills.length > 0) return allPartyBills;
    return bill ? [bill] : [];
  }, [allBills, allPartyBills, bill]);

  // Selected party & bill state (supports dynamic search and selection)
  const [selectedParty, setSelectedParty] = useState<Party | null>(party || null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(bill || null);

  const [amountRupees, setAmountRupees] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Multi-Mode Split Payment Allocation State (Cash, GPay / UPI, Others)
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: '',
    upiRupees: '',
    netBankingRupees: '',
  });

  const agreedAmountPaise = useMemo(() => {
    const parsed = parseFloat(amountRupees);
    return isNaN(parsed) || parsed <= 0 ? 0 : rupeesToPaise(parsed);
  }, [amountRupees]);

  // Synchronize Cash amount when total agreed amount is typed if UPI & Others are empty
  useEffect(() => {
    const upiVal = parseInputRupeesToPaise(splitState.upiRupees);
    const netVal = parseInputRupeesToPaise(splitState.netBankingRupees);

    if (upiVal === 0 && netVal === 0) {
      setSplitState((prev) => ({ ...prev, cashRupees: amountRupees }));
    }
  }, [amountRupees]);

  // Real-time calculation of allocation
  const allocationBreakdown = useMemo(() => {
    if (!selectedBill || agreedAmountPaise <= 0) return null;

    const finStatus = evaluateBillStatus(selectedBill, paymentDate);
    const allocation = allocatePayment(selectedBill, agreedAmountPaise, paymentDate);

    return {
      finStatus,
      allocation,
    };
  }, [selectedBill, agreedAmountPaise, paymentDate]);

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isAllocationExact = totalAllocatedPaise === agreedAmountPaise && agreedAmountPaise > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (!selectedParty) {
      setError('Please search and select a customer first.');
      return;
    }

    if (!selectedBill) {
      setError('Please search and select a specific active bill.');
      return;
    }

    if (selectedBill.status === 'Closed') {
      setError('Cannot add payment to an already closed bill.');
      return;
    }

    if (agreedAmountPaise <= 0 || totalAllocatedPaise <= 0) {
      setError('Payment amount must be greater than ₹0.00.');
      return;
    }

    if (allocationBreakdown && agreedAmountPaise >= allocationBreakdown.finStatus.totalPayablePaise) {
      setError('Payment amount covers or exceeds full outstanding balance. Please use "Settle & Close Bill" to redeem collateral.');
      return;
    }

    if (totalAllocatedPaise !== agreedAmountPaise) {
      setError(
        'Settlement mismatch! The total split payment allocation (Cash + GPay + Others) must exactly match the agreed payment amount.'
      );
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

    try {
      submittingRef.current = true;
      setLoading(true);

      await onSavePayment({
        billId: selectedBill.id,
        partyId: selectedParty.id,
        partyName: selectedParty.name,
        amountPaise: agreedAmountPaise,
        paymentDate,
        paymentMode: primaryMode,
        paymentModes: activeModes,
        splitAllocations: {
          cashPaise,
          upiPaise,
          netBankingPaise,
        },
        cashPaise,
        upiPaise,
        netBankingPaise,
        agreedPaymentPaise: agreedAmountPaise,
        totalAllocatedPaise,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to submit payment:', err);
      setError(err?.message || 'Failed to record payment. Please check values and try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-payment-title"
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <CreditCard className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 id="add-payment-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                Record Part-Payment
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Customer & Bill Integrated Payment System
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
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* INTEGRATED PARTY SEARCH & BILL SEARCH COMPONENT */}
            <PartyAndBillSearchSelector
              parties={partiesPool}
              bills={billsPool}
              selectedParty={selectedParty}
              selectedBill={selectedBill}
              onSelectParty={(p) => {
                setSelectedParty(p);
                setError('');
              }}
              onSelectBill={(b) => {
                setSelectedBill(b);
                setError('');
              }}
              evaluationDate={paymentDate}
              requireActiveOnly={true}
              labelPrefix="Payment"
            />

            {/* Payment Details Section */}
            {selectedBill && (
              <div className="space-y-4 pt-3 border-t border-slate-200 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Payment Amount (₹) *
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
                        value={amountRupees}
                        onChange={(e) => setAmountRupees(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                      />
                    </div>
                  </div>

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
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Allocation Preview */}
                {allocationBreakdown && parseFloat(amountRupees) > 0 && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1.5 text-emerald-900 animate-fadeIn">
                    <p className="font-bold flex items-center justify-between">
                      <span>Automatic Interest-First Allocation Preview:</span>
                      <span className="font-mono text-[11px] text-emerald-700">
                        Total Intake: {formatCurrencyPaise(agreedAmountPaise)}
                      </span>
                    </p>
                    <div className="flex justify-between">
                      <span>• Settles Accrued Interest:</span>
                      <span className="font-bold font-mono">
                        {formatCurrencyPaise(allocationBreakdown.allocation.interestPortionPaise)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Reduces Principal Loan:</span>
                      <span className="font-bold font-mono">
                        {formatCurrencyPaise(allocationBreakdown.allocation.principalPortionPaise)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-emerald-200 font-bold">
                      <span>New Remaining Principal:</span>
                      <span className="font-mono text-emerald-950">
                        {formatCurrencyPaise(allocationBreakdown.allocation.newRemainingPrincipalPaise)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Multi-Mode Split Payment Engine: Cash, GPay / UPI, Others */}
                <SplitPaymentSelector
                  agreedAmountPaise={agreedAmountPaise}
                  state={splitState}
                  onChange={setSplitState}
                  label="Payment Modes (Cash, GPay / UPI, Others)"
                />

                {/* Receipt Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Receipt Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Part payment received via Cash & GPay"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBill || !isAllocationExact}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <span>Confirm & Apply Payment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
