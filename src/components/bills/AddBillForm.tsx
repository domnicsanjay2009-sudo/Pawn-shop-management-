import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Coins,
  Scale,
  Calendar,
  IndianRupee,
  Percent,
  Clock,
  Loader2,
  User,
  Search,
  CheckCircle2,
  MapPin,
  Phone,
  X
} from 'lucide-react';
import {
  Party,
  ItemCategory,
  InterestDuration,
  WeightUnit,
  AppSettings,
  GoldPurity,
  SilverPurity
} from '../../types';
import { rupeesToPaise } from '../../utils/calculations';

export const GOLD_PURITIES: GoldPurity[] = [
  '24K / 999',
  '22K / 916',
  '20K / 833',
  '18K / 750',
  '14K / 585',
];

export const SILVER_PURITIES: SilverPurity[] = [
  '999 Fine Silver',
  '925 Sterling Silver',
  '900 Silver',
  '835 Silver',
  '800 Silver',
];

export const OTHER_PURITIES = [
  'Platinum 950',
  'Diamond / Gemstone',
  'Brass / Bronze',
  'Other Collateral',
];

interface AddBillFormProps {
  parties: Party[];
  selectedParty?: Party | null;
  settings: AppSettings;
  onSave: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export const AddBillForm: React.FC<AddBillFormProps> = ({
  parties,
  selectedParty,
  settings,
  onSave,
  onCancel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [partyId, setPartyId] = useState(selectedParty?.id || '');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('Gold');
  const [itemDescription, setItemDescription] = useState('');
  const [purity, setPurity] = useState<string>('22K / 916');
  const [grossWeight, setGrossWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  const [principalRupees, setPrincipalRupees] = useState('');
  const [interestDuration, setInterestDuration] = useState<InterestDuration>(
    settings.defaultInterestDuration || 'Monthly'
  );
  const [interestPercentage, setInterestPercentage] = useState<number>(
    settings.defaultGoldPercentage || 2.0
  );
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected party object
  const activeSelectedParty = useMemo(() => {
    return parties.find((p) => p.id === partyId) || (selectedParty?.id === partyId ? selectedParty : null);
  }, [parties, partyId, selectedParty]);

  // Real-time customer search filtering (Module 3)
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return parties.slice(0, 8);

    const cleanQueryDigits = q.replace(/\D/g, '');

    return parties
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const cleanPhone = p.phone.replace(/\D/g, '');
        const phoneMatch = cleanQueryDigits ? cleanPhone.includes(cleanQueryDigits) : false;
        return nameMatch || phoneMatch;
      })
      .slice(0, 10);
  }, [parties, customerSearchQuery]);

  // Sync default interest percentage and standardized purity whenever category changes
  useEffect(() => {
    if (itemCategory === 'Gold') {
      setInterestPercentage(settings.defaultGoldPercentage || 2.0);
      setPurity('22K / 916');
    } else if (itemCategory === 'Silver') {
      setInterestPercentage(settings.defaultSilverPercentage || 3.0);
      setPurity('925 Sterling Silver');
    } else {
      setInterestPercentage(settings.defaultOthersPercentage || 4.0);
      setPurity('Other Collateral');
    }
  }, [itemCategory, settings]);

  // Sync party selection if passed as prop
  useEffect(() => {
    if (selectedParty) {
      setPartyId(selectedParty.id);
      setIsExpanded(true);
    }
  }, [selectedParty]);

  // Focus cursor in first field when expanded as required
  useEffect(() => {
    if (isExpanded && !partyId) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isExpanded, partyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!partyId) {
      setError('Please select a customer / party for this bill.');
      return;
    }

    const party = parties.find((p) => p.id === partyId) || selectedParty;
    if (!party) {
      setError('Selected party could not be found.');
      return;
    }

    const principal = parseFloat(principalRupees);
    if (isNaN(principal) || principal <= 0) {
      setError('Please enter a valid loan principal amount.');
      return;
    }

    const gross = parseFloat(grossWeight);
    const net = parseFloat(netWeight);
    if (isNaN(gross) || gross <= 0) {
      setError('Please enter valid item gross weight.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        partyId: party.id,
        partyName: party.name,
        partyPhone: party.phone,
        itemCategory,
        itemDescription: itemDescription.trim() || `${itemCategory} Pledge Item`,
        purity: purity.trim(),
        grossWeight: gross,
        netWeight: isNaN(net) || net <= 0 ? gross : net,
        weightUnit,
        principalPaise: rupeesToPaise(principal),
        interestPercentage: Number(interestPercentage),
        interestDuration,
        billDate,
        dueDate: dueDate || undefined,
      });

      // Reset and minimize form after saving
      setItemDescription('');
      setGrossWeight('');
      setNetWeight('');
      setPrincipalRupees('');
      setIsExpanded(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create bill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      {/* Minimized / Collapsed Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-950">Add Pledge Bill</h3>
            <p className="text-xs text-slate-500">
              Create a new pledge loan against gold, silver, or collateral
            </p>
          </div>
        </div>
        <div className="p-1 rounded-full text-slate-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Animated Form */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-fadeIn">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Customer Selection - Interactive Searchable UX (Module 3) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Linked Customer / Party *
              </label>

              {activeSelectedParty ? (
                <div className="flex items-center justify-between p-3.5 bg-accent-50/70 border border-accent-200 rounded-xl animate-fadeIn">
                  <div className="flex items-center space-x-3 min-w-0">
                    {activeSelectedParty.photoUrl ? (
                      <img
                        src={activeSelectedParty.photoUrl}
                        alt={activeSelectedParty.name}
                        className="w-10 h-10 rounded-full object-cover border border-accent-300 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-600/10 text-accent-700 flex items-center justify-center font-bold shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-brand-950 truncate">
                          {activeSelectedParty.name}
                        </p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{activeSelectedParty.phone}</span>
                        {activeSelectedParty.address && <span>• {activeSelectedParty.address}</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPartyId('');
                      setCustomerSearchQuery('');
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }}
                    className="ml-3 px-3 py-1.5 text-xs font-bold text-accent-700 hover:text-accent-900 bg-white border border-accent-300 rounded-lg hover:bg-accent-100 transition-colors shrink-0 cursor-pointer"
                  >
                    Change Customer
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Type customer name or phone number to search..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtered Customer Matches List */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-xs">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No customer found matching &quot;{customerSearchQuery}&quot;. Please check the spelling or add a new party in Customer Management above.
                      </div>
                    ) : (
                      filteredCustomers.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setPartyId(p.id);
                            setCustomerSearchQuery('');
                          }}
                          className="p-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={p.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-brand-950 truncate">{p.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{p.phone}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 text-[11px] font-bold text-accent-600 bg-accent-50 rounded-lg shrink-0"
                          >
                            Select
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Item Category & Purity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Item Category *
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-semibold text-brand-950"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Item Description & Ornaments *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g. 22K Hallmarked Gold Chain & 2 Bangles"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            {/* 3. Weight & Standardized Controlled Purity Selection (Module 4 & 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Unit *
                </label>
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-semibold"
                >
                  <option value="g">Grams (g)</option>
                  <option value="mg">Milligrams (mg)</option>
                  <option value="tola">Tola</option>
                  <option value="pavan">Sovereign / Pavan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Gross Weight *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  placeholder="e.g. 24.50"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Net Weight *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  placeholder="e.g. 24.00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Purity Category *
                </label>
                <select
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {itemCategory === 'Gold' &&
                    GOLD_PURITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  {itemCategory === 'Silver' &&
                    SILVER_PURITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  {itemCategory === 'Others' &&
                    OTHER_PURITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 4. Financial Terms: Principal & Interest Rate/Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-950 mb-1">
                  Principal Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    required
                    value={principalRupees}
                    onChange={(e) => setPrincipalRupees(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-950 mb-1">
                  Interest Rate (%) *
                </label>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={interestPercentage}
                    onChange={(e) => setInterestPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-950 mb-1">
                  Interest Duration *
                </label>
                <select
                  value={interestDuration}
                  onChange={(e) => setInterestDuration(e.target.value as InterestDuration)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>

            {/* 5. Bill Date (Calculated from creation date as specified) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Bill Date (Interest starts from this date) *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Target Due Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onCancel?.();
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Pledge Bill...</span>
                  </>
                ) : (
                  <span>Create Bill</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
