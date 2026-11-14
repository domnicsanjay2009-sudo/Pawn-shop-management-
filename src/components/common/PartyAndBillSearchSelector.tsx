import React, { useState, useMemo } from 'react';
import { Search, User, FileText, CheckCircle2, ChevronRight, X, Sparkles, Coins, Calendar, ArrowRight } from 'lucide-react';
import { Party, Bill } from '../../types';
import { evaluateBillStatus } from '../../utils/calculations';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { CustomerAvatar } from './CustomerAvatar';

interface PartyAndBillSearchSelectorProps {
  parties: Party[];
  bills: Bill[];
  selectedParty: Party | null;
  selectedBill: Bill | null;
  onSelectParty: (party: Party | null) => void;
  onSelectBill: (bill: Bill | null) => void;
  evaluationDate?: string;
  requireActiveOnly?: boolean;
  labelPrefix?: string; // e.g. 'Payment' or 'Closing'
}

export const PartyAndBillSearchSelector: React.FC<PartyAndBillSearchSelectorProps> = ({
  parties,
  bills,
  selectedParty,
  selectedBill,
  onSelectParty,
  onSelectBill,
  evaluationDate = new Date().toISOString().split('T')[0],
  requireActiveOnly = true,
  labelPrefix = 'Transaction',
}) => {
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);

  // 1. Filter Parties dynamically based on search input
  const filteredParties = useMemo(() => {
    const q = partySearchQuery.trim().toLowerCase();
    if (!q) {
      // Show up to 5 parties with active loans when query is blank
      return parties
        .filter((p) => bills.some((b) => b.partyId === p.id && (!requireActiveOnly || b.status === 'Active')))
        .slice(0, 6);
    }
    return parties
      .filter((p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [parties, partySearchQuery, bills, requireActiveOnly]);

  // 2. Active bills for selected party
  const partyActiveBills = useMemo(() => {
    if (!selectedParty) return [];
    return bills.filter(
      (b) => b.partyId === selectedParty.id && (!requireActiveOnly || b.status === 'Active')
    );
  }, [bills, selectedParty, requireActiveOnly]);

  // 3. Multi-field Bill Search across bill number, category, description, and ornaments
  // ("Chain", "Gold", "Silver", "Ring", "Necklace", "Bangle", "Kolusu", etc.)
  const filteredBills = useMemo(() => {
    const q = billSearchQuery.trim().toLowerCase();
    if (!q) return partyActiveBills;

    const tokens = q.split(/\s+/).filter(Boolean);

    return partyActiveBills.filter((b) => {
      const searchTarget = [
        b.billNumber,
        b.itemCategory,
        b.itemDescription,
        b.purity || '',
        b.weightUnit,
        `${b.grossWeight}g`,
      ]
        .join(' ')
        .toLowerCase();

      return tokens.every((token) => searchTarget.includes(token));
    });
  }, [partyActiveBills, billSearchQuery]);

  // Financial evaluation of the selected bill up to the evaluation date
  const selectedBillFinancials = useMemo(() => {
    if (!selectedBill) return null;
    const status = evaluateBillStatus(selectedBill, evaluationDate);
    const lateFees = (selectedBill.lateInterestFeesPaise || 0) + (selectedBill.lateClosingBillFeesPaise || 0);
    const totalOutstanding = status.totalPayablePaise + lateFees;

    return {
      originalPrincipalPaise: selectedBill.principalPaise,
      accruedInterestPaise: status.accruedInterestPaise,
      previousPaymentsPaise: selectedBill.totalPaidPaise || 0,
      lateFeesPaise: lateFees,
      totalOutstandingPaise: totalOutstanding,
      daysElapsed: status.daysElapsed,
    };
  }, [selectedBill, evaluationDate]);

  const handlePartySelect = (party: Party) => {
    onSelectParty(party);
    setPartySearchQuery('');
    setIsPartyDropdownOpen(false);

    // If party only has 1 active bill, auto-select it for convenience, otherwise leave for user to choose
    const activeForParty = bills.filter(
      (b) => b.partyId === party.id && (!requireActiveOnly || b.status === 'Active')
    );
    if (activeForParty.length === 1) {
      onSelectBill(activeForParty[0]);
    } else {
      onSelectBill(null);
    }
  };

  const handleClearParty = () => {
    onSelectParty(null);
    onSelectBill(null);
    setPartySearchQuery('');
    setBillSearchQuery('');
    setIsPartyDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          STEP 1: PARTY NAME SEARCH
      ========================================================================= */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <span>1. Customer / Party Name *</span>
          {selectedParty && (
            <button
              type="button"
              onClick={handleClearParty}
              className="text-[11px] font-semibold text-accent-600 hover:text-accent-700 hover:underline cursor-pointer flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Change Customer</span>
            </button>
          )}
        </label>

        {!selectedParty ? (
          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={partySearchQuery}
                onFocus={() => setIsPartyDropdownOpen(true)}
                onChange={(e) => {
                  setPartySearchQuery(e.target.value);
                  setIsPartyDropdownOpen(true);
                }}
                placeholder="Type customer name or phone number..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Dynamic Customer Search Dropdown */}
            {isPartyDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredParties.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No customers found matching &quot;{partySearchQuery}&quot;
                  </div>
                ) : (
                  filteredParties.map((p) => {
                    const activeCount = bills.filter(
                      (b) => b.partyId === p.id && (!requireActiveOnly || b.status === 'Active')
                    ).length;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePartySelect(p)}
                        className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <CustomerAvatar photoUrl={p.photoUrl} name={p.name} size="sm" />
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-brand-950 group-hover:text-accent-600 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{p.phone || 'No phone'}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            activeCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {activeCount} Active {activeCount === 1 ? 'Loan' : 'Loans'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          /* Selected Customer Card */
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CustomerAvatar photoUrl={selectedParty.photoUrl} name={selectedParty.name} size="md" />
              <div>
                <p className="font-bold text-sm text-brand-950 flex items-center space-x-1.5">
                  <span>{selectedParty.name}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedParty.phone} {selectedParty.address ? `• ${selectedParty.address}` : ''}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-extrabold text-brand-950 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {partyActiveBills.length} Active {partyActiveBills.length === 1 ? 'Bill' : 'Bills'}
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          STEP 2: BILL SEARCH (Filtered only to Selected Party)
      ========================================================================= */}
      {selectedParty && (
        <div className="space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Select Pledge Bill *
            </label>
            <span className="text-[11px] text-slate-400">
              Search by Bill #, ornament, purity, weight
            </span>
          </div>

          {partyActiveBills.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center font-medium">
              This customer has no active loans eligible for {labelPrefix.toLowerCase()}.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Bill Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={billSearchQuery}
                  onChange={(e) => setBillSearchQuery(e.target.value)}
                  placeholder="Search bill: e.g. B-1001, Gold, Chain, Ring, 22K, Necklace..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Dynamic Bills Grid / List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredBills.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-3">
                    No bills match &quot;{billSearchQuery}&quot; for this customer.
                  </p>
                ) : (
                  filteredBills.map((b) => {
                    const isSelected = selectedBill?.id === b.id;
                    const bFinancial = evaluateBillStatus(b, evaluationDate);
                    return (
                      <div
                        key={b.id}
                        onClick={() => onSelectBill(b)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-accent-50/50 border-accent-500 ring-2 ring-accent-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-xs sm:text-sm text-brand-950 font-mono">
                                {b.billNumber}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {b.itemCategory} {b.purity ? `• ${b.purity}` : ''}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(b.billDate)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 font-medium">
                              {b.itemDescription} ({b.netWeight} {b.weightUnit})
                            </p>
                          </div>
                        </div>

                        {/* Financial snapshot */}
                        <div className="text-left sm:text-right shrink-0 pl-7 sm:pl-0">
                          <p className="text-[11px] text-slate-400">
                            Principal: {formatCurrencyPaise(b.currentPrincipalPaise)}
                          </p>
                          <p className="text-xs font-extrabold text-accent-700 font-mono">
                            Payable: {formatCurrencyPaise(bFinancial.totalPayablePaise)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 3: AUTHORITATIVE SELECTED BILL FINANCIAL BREAKDOWN
      ========================================================================= */}
      {selectedBill && selectedBillFinancials && (
        <div className="p-4 bg-linear-to-br from-slate-900 to-brand-950 text-white rounded-2xl shadow-md border border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Selected Bill Financial Status (As of Today)
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent-500/20 text-accent-300 border border-accent-500/30">
              {selectedBill.billNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Original Principal</p>
              <p className="text-sm font-extrabold font-mono text-white mt-0.5">
                {formatCurrencyPaise(selectedBillFinancials.originalPrincipalPaise)}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Accrued Interest</p>
              <p className="text-sm font-extrabold font-mono text-accent-400 mt-0.5">
                {formatCurrencyPaise(selectedBillFinancials.accruedInterestPaise)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedBillFinancials.daysElapsed} days @ {selectedBill.interestPercentage}%
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Previous Payments</p>
              <p className="text-sm font-extrabold font-mono text-emerald-400 mt-0.5">
                {formatCurrencyPaise(selectedBillFinancials.previousPaymentsPaise)}
              </p>
            </div>

            <div className="bg-white/10 p-2 rounded-xl border border-white/15">
              <p className="text-[10px] text-accent-200 uppercase tracking-wider font-bold">
                Current Outstanding
              </p>
              <p className="text-base font-black font-mono text-emerald-300 mt-0.5">
                {formatCurrencyPaise(selectedBillFinancials.totalOutstandingPaise)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
