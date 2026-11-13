import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, CheckCircle, Calendar, AlertTriangle, UserCheck, Banknote, Smartphone, MoreHorizontal } from 'lucide-react';
import { Party, Bill, PaymentMode, AppSettings } from '../../types';
import { evaluateBillStatus, rupeesToPaise } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useModalScrollLock } from '../../utils/modalScrollLock';

interface CloseBillModalProps {
  party: Party;
  bill: Bill;
  allPartyBills?: Bill[];
  settings?: AppSettings;
  onClose: () => void;
  onConfirmClose: (data: any) => Promise<void>;
}

export const CloseBillModal: React.FC<CloseBillModalProps> = ({
  party,
  bill,
  allPartyBills,
  settings,
  onClose,
  onConfirmClose,
}) => {
  const { currentUser, shopProfile } = useAuth();
  
  // 1. Background Interaction Lock & Keyboard Accessibility
  useModalScrollLock(true, onClose);

  const [selectedBillId, setSelectedBillId] = useState(bill.id);
  const [billSearchQuery, setBillSearchQuery] = useState('');

  const activeBills = useMemo(() => {
    const list = (allPartyBills && allPartyBills.length > 0) ? allPartyBills : [bill];
    return list.filter((b) => b.status === 'Active');
  }, [allPartyBills, bill]);

  const filteredBills = useMemo(() => {
    const q = billSearchQuery.trim().toLowerCase();
    if (!q) return activeBills;
    return activeBills.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(q) ||
        b.itemCategory.toLowerCase().includes(q) ||
        b.itemDescription.toLowerCase().includes(q)
    );
  }, [activeBills, billSearchQuery]);

  const currentBill = useMemo(() => {
    return activeBills.find((b) => b.id === selectedBillId) || bill;
  }, [activeBills, selectedBillId, bill]);

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

  // Financial status calculation
  const status = useMemo(() => {
    return evaluateBillStatus(currentBill, closingDate);
  }, [currentBill, closingDate]);

  // Late fees calculations if applicable
  const lateInterestFeesPaise = useMemo(() => {
    if (currentBill.lateInterestFeesPaise) return currentBill.lateInterestFeesPaise;
    if (settings?.lateInterestFeesEnabled && settings.lateInterestFeeRateOrAmount) {
      return Math.round(currentBill.principalPaise * (settings.lateInterestFeeRateOrAmount / 100));
    }
    return 0;
  }, [currentBill, settings]);

  const lateClosingFeesPaise = useMemo(() => {
    if (currentBill.lateClosingBillFeesPaise) return currentBill.lateClosingBillFeesPaise;
    if (settings?.lateClosingFeesEnabled && settings.lateClosingFeeAmountPaise) {
      return settings.lateClosingFeeAmountPaise;
    }
    return 0;
  }, [currentBill, settings]);

  // Base calculated closing amount in paise (principal + interest + late fees)
  const baseClosingPaise = status.totalPayablePaise + lateInterestFeesPaise + lateClosingFeesPaise;

  // Mandatory Part 8: Plus (+) / Minus (-) Settlement Adjustment State
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

  // Payment method selection modes:
  // 'cash_full' (Cash checkbox ticked)
  // 'gpay_full' (GPay checkbox ticked)
  // 'split' (Neither checked: manual distribution)
  const [paymentSelection, setPaymentSelection] = useState<'cash_full' | 'gpay_full' | 'split'>('cash_full');

  // Manual split state (used when 'split' is active)
  const [cashAmountRupees, setCashAmountRupees] = useState<string>((calculatedClosingPaise / 100).toString());
  const [gpayAmountRupees, setGpayAmountRupees] = useState<string>('');

  // Others payment mode
  const [enableOthers, setEnableOthers] = useState<boolean>(false);
  const [othersType, setOthersType] = useState<string>('Bank Transfer');
  const [othersDescription, setOthersDescription] = useState<string>('');
  const [othersAmountRupees, setOthersAmountRupees] = useState<string>('');

  // When closing amount updates, update single-checkbox allocations
  useEffect(() => {
    if (paymentSelection === 'cash_full') {
      setCashAmountRupees((calculatedClosingPaise / 100).toString());
      setGpayAmountRupees('');
    } else if (paymentSelection === 'gpay_full') {
      setGpayAmountRupees((calculatedClosingPaise / 100).toString());
      setCashAmountRupees('');
    }
  }, [calculatedClosingPaise, paymentSelection]);

  const handleCashCheckboxToggle = (checked: boolean) => {
    if (checked) {
      setPaymentSelection('cash_full');
      setCashAmountRupees((calculatedClosingPaise / 100).toString());
      setGpayAmountRupees('');
    } else {
      setPaymentSelection('split');
    }
  };

  const handleGpayCheckboxToggle = (checked: boolean) => {
    if (checked) {
      setPaymentSelection('gpay_full');
      setGpayAmountRupees((calculatedClosingPaise / 100).toString());
      setCashAmountRupees('');
    } else {
      setPaymentSelection('split');
    }
  };

  // Convert inputs to integer paise
  const allocatedCashPaise = useMemo(() => {
    if (paymentSelection === 'cash_full') return calculatedClosingPaise;
    if (paymentSelection === 'gpay_full') return 0;
    const val = parseFloat(cashAmountRupees);
    return isNaN(val) || val <= 0 ? 0 : rupeesToPaise(val);
  }, [paymentSelection, calculatedClosingPaise, cashAmountRupees]);

  const allocatedGpayPaise = useMemo(() => {
    if (paymentSelection === 'gpay_full') return calculatedClosingPaise;
    if (paymentSelection === 'cash_full') return 0;
    const val = parseFloat(gpayAmountRupees);
    return isNaN(val) || val <= 0 ? 0 : rupeesToPaise(val);
  }, [paymentSelection, calculatedClosingPaise, gpayAmountRupees]);

  const allocatedOthersPaise = useMemo(() => {
    if (!enableOthers) return 0;
    const val = parseFloat(othersAmountRupees);
    return isNaN(val) || val <= 0 ? 0 : rupeesToPaise(val);
  }, [enableOthers, othersAmountRupees]);

  const totalAllocatedPaise = allocatedCashPaise + allocatedGpayPaise + allocatedOthersPaise;
  const isSettlementExact = totalAllocatedPaise === calculatedClosingPaise && totalAllocatedPaise > 0;
  const differencePaise = calculatedClosingPaise - totalAllocatedPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    if (currentBill.status === 'Closed') {
      setError('This bill is already closed.');
      return;
    }

    if (totalAllocatedPaise <= 0) {
      setError('Cannot close this bill. Please allocate a valid payment amount.');
      return;
    }

    if (!isSettlementExact) {
      if (differencePaise > 0) {
        setError(
          `Payment is insufficient by ${formatCurrencyPaise(differencePaise)}. The sum of payment methods must exactly equal the calculated closing amount (${formatCurrencyPaise(calculatedClosingPaise)}).`
        );
      } else {
        setError(
          `Overpayment detected by ${formatCurrencyPaise(Math.abs(differencePaise))}. The sum of payment methods must exactly equal the calculated closing amount (${formatCurrencyPaise(calculatedClosingPaise)}).`
        );
      }
      return;
    }

    if (enableOthers && (!othersType.trim() || !othersDescription.trim())) {
      setError('Please provide the payment type and description for the Others payment method.');
      return;
    }

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
    if (allocatedCashPaise > 0) activeModes.push('Cash');
    if (allocatedGpayPaise > 0) activeModes.push('GPay / PhonePe');
    if (allocatedOthersPaise > 0) activeModes.push('Net Banking');

    const summaryMode: PaymentMode =
      activeModes.length > 1
        ? 'Split'
        : activeModes[0] === 'GPay / PhonePe'
        ? 'UPI'
        : activeModes[0] === 'Net Banking'
        ? 'Bank Transfer'
        : 'Cash';

    const closingTransactionId = `tx_close_${currentBill.id}_${Date.now()}`;
    const closedByUid = currentUser?.uid || '';

    submittingRef.current = true;
    setLoading(true);
    try {
      await onConfirmClose({
        billId: currentBill.id,
        partyId: party.id,
        partyName: party.name,
        partyPhone: party.phone,
        closingDate,
        paymentMode: summaryMode,
        paymentModes: activeModes,
        splitAllocations: {
          cashPaise: allocatedCashPaise,
          upiPaise: allocatedGpayPaise,
          netBankingPaise: allocatedOthersPaise,
        },
        cashPaise: allocatedCashPaise,
        upiPaise: allocatedGpayPaise,
        netBankingPaise: allocatedOthersPaise,
        totalPaidPaise: totalAllocatedPaise,
        totalAllocatedPaise,
        agreedSettlementPaise: calculatedClosingPaise,
        finalSettlementAmountPaise: calculatedClosingPaise,
        baseOutstandingPaise: baseClosingPaise,
        adjustmentType: adjustmentType === 'none' ? undefined : adjustmentType,
        adjustmentAmountPaise: adjustmentPaise,
        finalOutstandingPaise: 0,
        lateInterestFeesPaise,
        lateClosingBillFeesPaise: lateClosingFeesPaise,
        cashCheckboxSelected: paymentSelection === 'cash_full',
        gpayCheckboxSelected: paymentSelection === 'gpay_full',
        othersPaymentType: enableOthers ? othersType : undefined,
        othersDescription: enableOthers ? othersDescription : undefined,
        closedBy: finalClosedByIdentification,
        closedByUid,
        closedByRole: finalRole,
        closingTransactionId,
        notes: enableOthers
          ? `Closed with ${othersType}: ${othersDescription}`
          : 'Pawn pledge redeemed in full, items returned to customer',
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
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 id="modal-close-bill-title" className="text-base font-bold text-white">
                Settle & Close Pledge Bill
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
          {/* Customer & Bill Selection with Ornament Search */}
          {activeBills.length > 1 && (
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Bill to Settle &amp; Close *
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredBills.length} of {activeBills.length} active bills
                </span>
              </div>

              <input
                type="text"
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                placeholder='Search customer bills by ornament ("Chain", "Ring", "Necklace", "B-1006")...'
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 mb-1"
              />

              <select
                value={selectedBillId}
                onChange={(e) => setSelectedBillId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {filteredBills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.billNumber} - {b.itemCategory} ({b.itemDescription || 'Collateral'}) • {formatCurrencyPaise(b.currentPrincipalPaise)} principal
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collateral details summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Pledged Collateral:</span>
              <span className="font-semibold text-brand-950">
                {currentBill.itemCategory} - {currentBill.itemDescription}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Weight:</span>
              <span className="font-semibold text-brand-950">
                Gross {currentBill.grossWeight}{currentBill.weightUnit} / Net {currentBill.netWeight}{currentBill.weightUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pledge Date:</span>
              <span className="font-mono text-brand-950">{formatDate(currentBill.billDate)}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Original Principal:</span>
              <span className="font-bold text-brand-950 font-mono">
                {formatCurrencyPaise(currentBill.principalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Outstanding Principal:</span>
              <span className="font-bold text-brand-950 font-mono">
                {formatCurrencyPaise(status.remainingPrincipalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Accumulated Interest ({status.daysElapsed} days):</span>
              <span className="font-bold text-accent-600 font-mono">
                {formatCurrencyPaise(status.accruedInterestPaise)}
              </span>
            </div>
            {lateInterestFeesPaise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Late Interest Fees:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {formatCurrencyPaise(lateInterestFeesPaise)}
                </span>
              </div>
            )}
            {lateClosingFeesPaise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Late Closing Bill Fees:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {formatCurrencyPaise(lateClosingFeesPaise)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 pt-2 border-t border-slate-200 text-sm font-bold">
              <span>Final Settlement Amount:</span>
              <span className="text-emerald-700 font-extrabold text-base font-mono">
                {formatCurrencyPaise(calculatedClosingPaise)}
              </span>
            </div>
          </div>

          {/* Mandatory Part 8: Settlement Adjustment (+ / -) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-950 uppercase tracking-wider">
                Settlement Adjustment (+ / -)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Mandatory Plus / Minus Discount or Fee
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('none');
                  setAdjustmentAmountRupees('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  adjustmentType === 'none'
                    ? 'bg-white border-slate-400 text-brand-950 shadow-xs'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                No Adjustment
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('plus')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 ${
                  adjustmentType === 'plus'
                    ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-amber-50'
                }`}
              >
                <span>+ PLUS (Extra Fee)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('minus')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1 ${
                  adjustmentType === 'minus'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <span>- MINUS (Discount)</span>
              </button>
            </div>

            {adjustmentType !== 'none' && (
              <div className="pt-1 space-y-2 animate-fadeIn">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={adjustmentAmountRupees}
                    onChange={(e) => setAdjustmentAmountRupees(e.target.value)}
                    placeholder={`Enter ${adjustmentType === 'plus' ? 'extra charge' : 'discount/waiver'} amount in rupees`}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-1">
                  <span className="text-slate-600">
                    Base: <strong className="font-mono text-brand-950">{formatCurrencyPaise(baseClosingPaise)}</strong>
                  </span>
                  <span className={adjustmentType === 'plus' ? 'text-amber-600 font-bold font-mono' : 'text-emerald-600 font-bold font-mono'}>
                    {adjustmentType === 'plus' ? `+ ${formatCurrencyPaise(adjustmentPaise)}` : `- ${formatCurrencyPaise(adjustmentPaise)}`}
                  </span>
                  <span className="font-extrabold text-brand-950">
                    Payable: <strong className="font-mono text-emerald-600">{formatCurrencyPaise(calculatedClosingPaise)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Closing Date */}
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
              />
            </div>
          </div>

          {/* Closing Payment Methods Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-950">
                Closing Payment Methods
              </span>
              <span className="text-[11px] text-slate-500">
                Exact Settlement Required
              </span>
            </div>

            {/* Checkbox 1: Cash (Full Amount) */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={paymentSelection === 'cash_full'}
                  onChange={(e) => handleCashCheckboxToggle(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Cash (Full Amount)</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {paymentSelection === 'cash_full'
                  ? formatCurrencyPaise(calculatedClosingPaise)
                  : '₹0.00'}
              </span>
            </label>

            {/* Checkbox 2: GPay (Full Amount) */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  checked={paymentSelection === 'gpay_full'}
                  onChange={(e) => handleGpayCheckboxToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>GPay / UPI (Full Amount)</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {paymentSelection === 'gpay_full'
                  ? formatCurrencyPaise(calculatedClosingPaise)
                  : '₹0.00'}
              </span>
            </label>

            {/* Split Payment: When neither Cash nor GPay checkbox is checked */}
            {paymentSelection === 'split' && (
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3 animate-fadeIn">
                <p className="text-[11px] font-bold text-blue-900">
                  Split Payment: Enter Cash & GPay amounts manually
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      Cash Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashAmountRupees}
                      onChange={(e) => setCashAmountRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                      GPay Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={gpayAmountRupees}
                      onChange={(e) => setGpayAmountRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Option: Others Payment Method */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={enableOthers}
                  onChange={(e) => {
                    setEnableOthers(e.target.checked);
                    if (!e.target.checked) setOthersAmountRupees('');
                  }}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <MoreHorizontal className="w-4 h-4 text-purple-600" />
                  <span>Others Payment Method</span>
                </span>
              </label>

              {enableOthers && (
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2.5 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Payment Type *
                      </label>
                      <input
                        type="text"
                        value={othersType}
                        onChange={(e) => setOthersType(e.target.value)}
                        placeholder="e.g. Bank Transfer, Cheque"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={othersAmountRupees}
                        onChange={(e) => setOthersAmountRupees(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Description / Reference *
                    </label>
                    <input
                      type="text"
                      value={othersDescription}
                      onChange={(e) => setOthersDescription(e.target.value)}
                      placeholder="Cheque No, Bank Ref ID, etc."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Allocation Status Indicator */}
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isSettlementExact
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div>
                <p className="font-bold">
                  {isSettlementExact ? '✓ Exact Settlement Matched' : '⚠ Settlement Allocation Mismatch'}
                </p>
                <p className="text-[11px] opacity-80">
                  Allocated: {formatCurrencyPaise(totalAllocatedPaise)} / Required: {formatCurrencyPaise(calculatedClosingPaise)}
                </p>
              </div>
              <span className="font-mono font-extrabold text-sm">
                {differencePaise === 0
                  ? '₹0.00 diff'
                  : `${differencePaise > 0 ? '-' : '+'}${formatCurrencyPaise(Math.abs(differencePaise))}`}
              </span>
            </div>
          </div>

          {/* Closed By Attribution */}
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium text-brand-950"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Recorded closing attribution:{' '}
              <strong className="text-brand-950 font-mono">
                {closedByInput.trim()
                  ? `Closed By: ${closedByInput.trim()}`
                  : `Closed By: ${defaultAttribution.name}`}
              </strong>
            </p>
          </div>

          {/* Action Buttons */}
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
              disabled={loading || !isSettlementExact}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Closing Bill...' : 'Confirm Settle & Close'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
