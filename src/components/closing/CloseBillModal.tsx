import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle,
  Calendar,
  AlertTriangle,
  UserCheck,
  Banknote,
  Smartphone,
  MoreHorizontal,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Party, Bill, PaymentMode, AppSettings } from '../../types';
import { evaluateBillStatus, rupeesToPaise } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useModalScrollLock } from '../../utils/modalScrollLock';
import { SplitPaymentSelector, SplitPaymentState, parseInputRupeesToPaise } from '../payments/SplitPaymentSelector';
import { PartyAndBillSearchSelector } from '../common/PartyAndBillSearchSelector';

interface CloseBillModalProps {
  party?: Party | null;
  bill?: Bill | null;
  allPartyBills?: Bill[];
  allParties?: Party[];
  allBills?: Bill[];
  settings?: AppSettings;
  onClose: () => void;
  onConfirmClose: (data: any) => Promise<void>;
}

export const CloseBillModal: React.FC<CloseBillModalProps> = ({
  party,
  bill,
  allPartyBills = [],
  allParties = [],
  allBills = [],
  settings,
  onClose,
  onConfirmClose,
}) => {
  const { currentUser, shopProfile } = useAuth();

  // 1. Background Interaction Lock & Keyboard Accessibility
  useModalScrollLock(true, onClose);

  // Pool of parties and bills
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

  const [closingDate, setClosingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closedByInput, setClosedByInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  // Determine current operator identity
  const defaultAttribution = useMemo(() => {
    let staffName = '';
    try {
      staffName =
        localStorage.getItem('psm_active_staff_name') ||
        sessionStorage.getItem('psm_active_staff_name') ||
        localStorage.getItem('active_staff_name') ||
        '';
    } catch {
      // Ignore
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

  useEffect(() => {
    if (!closedByInput) {
      setClosedByInput(defaultAttribution.name);
    }
  }, [defaultAttribution]);

  // Financial status calculation
  const status = useMemo(() => {
    if (!selectedBill) return null;
    return evaluateBillStatus(selectedBill, closingDate);
  }, [selectedBill, closingDate]);

  // Late fees calculations if applicable
  const lateInterestFeesPaise = useMemo(() => {
    if (!selectedBill) return 0;
    if (selectedBill.lateInterestFeesPaise) return selectedBill.lateInterestFeesPaise;
    if (settings?.lateInterestFeesEnabled && settings.lateInterestFeeRateOrAmount) {
      return Math.round(selectedBill.principalPaise * (settings.lateInterestFeeRateOrAmount / 100));
    }
    return 0;
  }, [selectedBill, settings]);

  const lateClosingFeesPaise = useMemo(() => {
    if (!selectedBill) return 0;
    if (selectedBill.lateClosingBillFeesPaise) return selectedBill.lateClosingBillFeesPaise;
    if (settings?.lateClosingFeesEnabled && settings.lateClosingFeeAmountPaise) {
      return settings.lateClosingFeeAmountPaise;
    }
    return 0;
  }, [selectedBill, settings]);

  // Base calculated closing amount in paise (principal + interest + late fees)
  const baseClosingPaise = useMemo(() => {
    if (!status) return 0;
    return status.totalPayablePaise + lateInterestFeesPaise + lateClosingFeesPaise;
  }, [status, lateInterestFeesPaise, lateClosingFeesPaise]);

  // Mandatory: Plus (+) / Minus (-) Settlement Adjustment State
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'plus' | 'minus'>('none');
  const [adjustmentAmountRupees, setAdjustmentAmountRupees] = useState<string>('');

  const adjustmentPaise = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const parsed = parseFloat(adjustmentAmountRupees);
    return isNaN(parsed) || parsed <= 0 ? 0 : rupeesToPaise(parsed);
  }, [adjustmentType, adjustmentAmountRupees]);

  // Final Authoritative total calculated closing amount in paise:
  // Final Closing Amount = Outstanding Amount + Positive Adjustment - Negative Adjustment
  const calculatedClosingPaise = useMemo(() => {
    if (adjustmentType === 'plus') {
      return baseClosingPaise + adjustmentPaise;
    }
    if (adjustmentType === 'minus') {
      return Math.max(0, baseClosingPaise - adjustmentPaise);
    }
    return baseClosingPaise;
  }, [baseClosingPaise, adjustmentType, adjustmentPaise]);

  // Multi-Mode Split Payment Intake State (Cash, GPay / UPI, Others)
  const [splitState, setSplitState] = useState<SplitPaymentState>({
    cashRupees: (calculatedClosingPaise / 100).toFixed(2),
    upiRupees: '',
    netBankingRupees: '',
  });

  // When calculated closing amount changes, automatically synchronize default Cash payment if other modes are untouched
  useEffect(() => {
    const upiVal = parseInputRupeesToPaise(splitState.upiRupees);
    const netVal = parseInputRupeesToPaise(splitState.netBankingRupees);

    if (upiVal === 0 && netVal === 0 && calculatedClosingPaise > 0) {
      setSplitState((prev) => ({
        ...prev,
        cashRupees: (calculatedClosingPaise / 100).toFixed(2),
      }));
    }
  }, [calculatedClosingPaise]);

  const [notes, setNotes] = useState('');

  const cashPaise = parseInputRupeesToPaise(splitState.cashRupees);
  const upiPaise = parseInputRupeesToPaise(splitState.upiRupees);
  const netBankingPaise = parseInputRupeesToPaise(splitState.netBankingRupees);

  // Formula: Total Paid = Cash + GPay/PhonePe + Net Banking / Others
  const totalAllocatedPaise = cashPaise + upiPaise + netBankingPaise;
  const isExactSettlement = totalAllocatedPaise === calculatedClosingPaise && calculatedClosingPaise > 0;

  const handleConfirm = async () => {
    if (submittingRef.current || loading) return;
    setError('');

    if (!selectedParty) {
      setError('Please search and select a customer.');
      return;
    }

    if (!selectedBill) {
      setError('Please search and select an active bill to close.');
      return;
    }

    if (selectedBill.status === 'Closed') {
      setError('This bill is already closed. Please select an active bill.');
      return;
    }

    // Strict Zero Payment Validation
    if (totalAllocatedPaise <= 0) {
      setError('Cannot close this bill. Please enter a valid payment amount.');
      return;
    }

    // Settlement Reconciliation
    if (totalAllocatedPaise < calculatedClosingPaise) {
      const remaining = calculatedClosingPaise - totalAllocatedPaise;
      setError(
        `Payment is insufficient! Remaining outstanding: ${formatCurrencyPaise(
          remaining
        )}. Please allocate the full settlement amount before closing.`
      );
      return;
    }

    if (totalAllocatedPaise > calculatedClosingPaise) {
      const excess = totalAllocatedPaise - calculatedClosingPaise;
      setError(
        `Overpayment detected! Total paid exceeds the agreed settlement balance by ${formatCurrencyPaise(
          excess
        )}. Please adjust payment amounts.`
      );
      return;
    }

    const activeModes: ('Cash' | 'GPay / PhonePe' | 'Net Banking')[] = [];
    if (cashPaise > 0) activeModes.push('Cash');
    if (upiPaise > 0) activeModes.push('GPay / PhonePe');
    if (netBankingPaise > 0) activeModes.push('Net Banking');

    let primaryMode: PaymentMode = 'Split';
    if (activeModes.length === 1) {
      primaryMode =
        activeModes[0] === 'GPay / PhonePe'
          ? 'UPI'
          : activeModes[0] === 'Net Banking'
          ? 'Bank Transfer'
          : 'Cash';
    }

    const finalClosedByName = closedByInput.trim() || defaultAttribution.name;
    const resolvedClosedByRole =
      finalClosedByName.toLowerCase() === defaultAttribution.name.toLowerCase()
        ? defaultAttribution.role
        : 'authorized_user';

    try {
      submittingRef.current = true;
      setLoading(true);

      await onConfirmClose({
        billId: selectedBill.id,
        partyId: selectedParty.id,
        closingDate,
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
        totalPaidPaise: totalAllocatedPaise,
        baseOutstandingPaise: baseClosingPaise,
        adjustmentType: adjustmentType !== 'none' ? adjustmentType : undefined,
        adjustmentAmountPaise: adjustmentPaise > 0 ? adjustmentPaise : undefined,
        finalSettlementAmountPaise: calculatedClosingPaise,
        finalOutstandingPaise: 0,
        closedBy: finalClosedByName,
        closedByUid: currentUser?.uid || '',
        closedByRole: resolvedClosedByRole,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      console.error('Error confirming bill closure:', err);
      setError(err?.message || 'Failed to close bill. Please check inputs and try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-bill-title"
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="close-bill-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                Settle & Close a Bill
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                Customer & Bill Integrated Settlement Engine
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
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* INTEGRATED PARTY SEARCH & BILL SEARCH */}
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
            evaluationDate={closingDate}
            requireActiveOnly={true}
            labelPrefix="Closing"
          />

          {selectedBill && status && (
            <div className="space-y-4 pt-3 border-t border-slate-200 animate-fadeIn">
              {/* Date & Closed By Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Closing Settlement Date *
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                    <span>Closed By (Operator) *</span>
                    <span className="text-[10px] font-mono text-accent-600 lowercase">
                      {defaultAttribution.role}
                    </span>
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={closedByInput}
                      onChange={(e) => setClosedByInput(e.target.value)}
                      placeholder="Enter operator / staff name"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-brand-950 font-bold focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mandatory PLUS (+) / MINUS (-) Settlement Adjustment */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                      Settlement Adjustment (+ / -)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Add additional fees or apply a discount/waiver to reach final closing amount.
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
                      No Adjustment
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
                      + PLUS (Extra Fee)
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
                      - MINUS (Discount)
                    </button>
                  </div>
                </div>

                {adjustmentType !== 'none' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3 animate-fadeIn">
                    <span className="text-xs font-semibold text-slate-700">
                      {adjustmentType === 'plus' ? 'Positive Adjustment (+ Extra Fee):' : 'Negative Adjustment (- Discount/Waiver):'}
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

              {/* Authoritative Final Closing Amount Summary */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Final Authoritative Closing Amount
                  </span>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Outstanding ({formatCurrencyPaise(baseClosingPaise)})
                    {adjustmentType === 'plus' && ` + Fee (${formatCurrencyPaise(adjustmentPaise)})`}
                    {adjustmentType === 'minus' && ` - Discount (${formatCurrencyPaise(adjustmentPaise)})`}
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-900">
                  {formatCurrencyPaise(calculatedClosingPaise)}
                </span>
              </div>

              {/* Split Payment Engine: Cash, GPay / UPI, Others */}
              <SplitPaymentSelector
                agreedAmountPaise={calculatedClosingPaise}
                state={splitState}
                onChange={setSplitState}
                label="Closing Settlement Split Payment"
                isCloseBill={true}
              />

              {/* Settlement Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Settlement & Collateral Release Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Collateral verified & released to customer in person"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedBill || !isExactSettlement}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Closing Bill...</span>
              </>
            ) : (
              <span>Confirm & Settle Bill</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
