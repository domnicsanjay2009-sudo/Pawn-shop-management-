import React, { useState, useMemo, useRef } from 'react';
import { X, Edit3, Calendar, IndianRupee, Scale, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { Bill, Party, ItemCategory, InterestDuration, WeightUnit } from '../../types';
import { rupeesToPaise, paiseToRupees } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { editBill, EditBillInput } from '../../services/recalculationService';
import { useAuth } from '../../context/AuthContext';
import { useModalScrollLock } from '../../utils/modalScrollLock';

interface EditBillModalProps {
  bill: Bill;
  party?: Party;
  onClose: () => void;
  onSuccess: (updatedBill: Bill) => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({
  bill,
  party,
  onClose,
  onSuccess,
}) => {
  useModalScrollLock(true, onClose);
  const { currentUser } = useAuth();

  // Form State initialized from current bill
  const [partyName, setPartyName] = useState(bill.partyName);
  const [partyPhone, setPartyPhone] = useState(bill.partyPhone || '');
  const [billDate, setBillDate] = useState(bill.billDate);
  const [dueDate, setDueDate] = useState(bill.dueDate || '');
  const [principalRupees, setPrincipalRupees] = useState(paiseToRupees(bill.principalPaise).toString());
  const [itemCategory, setItemCategory] = useState<ItemCategory>(bill.itemCategory);
  const [itemDescription, setItemDescription] = useState(bill.itemDescription);
  const [purity, setPurity] = useState(bill.purity || '');
  const [grossWeight, setGrossWeight] = useState(bill.grossWeight.toString());
  const [netWeight, setNetWeight] = useState(bill.netWeight.toString());
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(bill.weightUnit);
  const [interestPercentage, setInterestPercentage] = useState(bill.interestPercentage.toString());
  const [interestDuration, setInterestDuration] = useState<InterestDuration>(bill.interestDuration);

  // Security & Audit State
  const [ownerCredential, setOwnerCredential] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setError('');

    const parsedPrincipal = parseFloat(principalRupees);
    if (isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
      setError('Principal loan amount must be greater than ₹0.00.');
      return;
    }

    const parsedInterestRate = parseFloat(interestPercentage);
    if (isNaN(parsedInterestRate) || parsedInterestRate < 0) {
      setError('Interest percentage cannot be negative.');
      return;
    }

    if (!reason.trim()) {
      setError('A valid reason for editing this financial record is mandatory for audit compliance.');
      return;
    }

    if (!ownerCredential.trim()) {
      setError('Owner PIN or Master Password is required to authorize financial alterations.');
      return;
    }

    const updates: EditBillInput = {
      partyName: partyName.trim(),
      partyPhone: partyPhone.trim(),
      billDate,
      dueDate: dueDate || undefined,
      principalPaise: rupeesToPaise(parsedPrincipal),
      itemCategory,
      itemDescription: itemDescription.trim(),
      purity: purity.trim() || undefined,
      grossWeight: parseFloat(grossWeight) || 0,
      netWeight: parseFloat(netWeight) || 0,
      weightUnit,
      interestPercentage: parsedInterestRate,
      interestDuration,
    };

    try {
      submittingRef.current = true;
      setLoading(true);

      const res = await editBill(bill.shopId, bill.id, updates, {
        reason: reason.trim(),
        performedBy: currentUser?.displayName || 'Owner',
        performedByUid: currentUser?.uid || '',
        ownerCredential: ownerCredential.trim(),
      });

      if (!res.success || !res.bill) {
        setError(res.error || 'Failed to edit bill and recalculate history.');
        return;
      }

      onSuccess(res.bill);
      onClose();
    } catch (err: any) {
      console.error('Error submitting bill edit:', err);
      setError(err?.message || 'Failed to save bill edits. Please verify credentials.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-bill-title"
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Edit3 className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 id="edit-bill-title" className="text-base sm:text-lg font-black tracking-tight text-white flex items-center space-x-2">
                <span>Edit / Alter Pledge Bill</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/20 text-white border border-white/20">
                  {bill.billNumber}
                </span>
              </h3>
              <p className="text-[11px] text-amber-100 font-medium">
                Historical Date & Interest Recalculation Engine
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

            {/* Current Financial Status Warning */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authoritative Historical Recalculation Warning</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Changing the Bill Date or Principal will chronologically re-compute all subsequent interest accruals, partial payment allocations, and closing settlement amounts across the bill&apos;s history.
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            {/* Financial Terms: Date, Principal, Interest */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bill Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Principal Loan (₹) *
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
                    value={principalRupees}
                    onChange={(e) => setPrincipalRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Interest Rate (% / Duration) *
                </label>
                <div className="flex space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={interestPercentage}
                    onChange={(e) => setInterestPercentage(e.target.value)}
                    className="w-20 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                  <select
                    value={interestDuration}
                    onChange={(e) => setInterestDuration(e.target.value as InterestDuration)}
                    className="flex-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Collateral & Ornament Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                Collateral & Ornament Specification
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Purity</label>
                  <input
                    type="text"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    placeholder="e.g. 22K / 916"
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ornament Description (e.g. Gold Chain, Ring, Necklace, Kolusu) *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Detailed description of collateral"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gross Wt</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Net Wt</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="mg">Milligrams (mg)</option>
                    <option value="pavan">Pavan</option>
                    <option value="tola">Tola</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MANDATORY SECURITY AUTHORIZATION & AUDIT REASON */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
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
                  placeholder="e.g. Correcting original date of pledge from customer slip"
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
              disabled={loading}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recalculating & Saving...</span>
                </>
              ) : (
                <span>Save & Recalculate History</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
