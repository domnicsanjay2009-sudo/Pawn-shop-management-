import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  MoreVertical,
  RotateCcw,
  Eye,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { Bill, Party, AppSettings } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { isBillEligibleForExpiry, republishExpiredBill } from '../../services/expiredBillService';
import { evaluateBillStatus } from '../../utils/calculations';
import { CustomerAvatar } from '../common/CustomerAvatar';

interface ExpiredBillsViewProps {
  bills: Bill[];
  parties: Party[];
  settings: AppSettings;
  onRepublishBill: (bill: Bill) => Promise<void>;
  onViewReceipt: (bill: Bill, party?: Party) => void;
}

export const ExpiredBillsView: React.FC<ExpiredBillsViewProps> = ({
  bills,
  parties,
  settings,
  onRepublishBill,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillForRepublish, setSelectedBillForRepublish] = useState<Bill | null>(null);
  const [activeMenuBillId, setActiveMenuBillId] = useState<string | null>(null);
  const [isRepublishing, setIsRepublishing] = useState(false);

  // Expired bills: either marked as Expired or eligible based on configured duration
  const expiredDurationYears = settings.expiredBillsDurationYears || 2;

  const expiredBillsList = useMemo(() => {
    return bills.filter((b) => {
      if (b.status === 'Closed') return false;
      if (b.status === 'Expired' || b.isExpired) return true;

      // Check if eligible
      const paymentCount = b.totalPaidPaise && b.totalPaidPaise > 0 ? 1 : 0;
      return isBillEligibleForExpiry(b, paymentCount, expiredDurationYears);
    });
  }, [bills, expiredDurationYears]);

  const filteredExpiredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expiredBillsList.filter((b) => {
      if (!q) return true;
      const billNoMatch = b.billNumber.toLowerCase().includes(q);
      const partyMatch = b.partyName.toLowerCase().includes(q);
      const itemMatch = (b.itemDescription || '').toLowerCase().includes(q);
      return billNoMatch || partyMatch || itemMatch;
    });
  }, [expiredBillsList, searchQuery]);

  const totalFrozenPrincipalPaise = useMemo(() => {
    return expiredBillsList.reduce((acc, b) => acc + (b.principalPaise || 0), 0);
  }, [expiredBillsList]);

  const handleConfirmRepublish = async () => {
    if (!selectedBillForRepublish || isRepublishing) return;
    setIsRepublishing(true);
    try {
      await onRepublishBill(selectedBillForRepublish);
      setSelectedBillForRepublish(null);
      setActiveMenuBillId(null);
    } finally {
      setIsRepublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-950">
            Expired Bills Vault
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Untouched pledge bills older than {expiredDurationYears} years. Calculations are frozen until republished.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 flex items-center space-x-2 text-xs font-semibold text-amber-900">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Configured Expiration: {expiredDurationYears} Years</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Expired Bills
          </p>
          <h4 className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">
            {expiredBillsList.length}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Zero payments recorded
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Frozen Principal Locked
          </p>
          <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
            {formatCurrencyPaise(totalFrozenPrincipalPaise)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Original disbursed loan value
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ledger Freeze Status
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-slate-700">
              Interest Accrual Paused
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Interest stops until manual republish
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expired bills by bill number, borrower..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredExpiredBills.length} expired records
        </span>
      </div>

      {/* Expired Bills Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-4 pl-6">Bill No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Collateral</th>
                <th className="p-4">Principal Loan</th>
                <th className="p-4">Pledge Date</th>
                <th className="p-4">Original Rate</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpiredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-600" />
                    <p className="font-medium">No expired bills found in this ledger.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bills are eligible only if open for {expiredDurationYears}+ years with zero payments.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpiredBills.map((b) => {
                  const p = parties.find((part) => part.id === b.partyId);
                  const isMenuOpen = activeMenuBillId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-brand-950">
                        {b.billNumber}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <CustomerAvatar photoUrl={p?.photoUrl} name={b.partyName} size="sm" />
                          <div>
                            <p className="font-bold text-brand-950">{b.partyName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{b.partyPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{b.itemCategory}</span>
                        <p className="text-slate-600 truncate max-w-xs">{b.itemDescription}</p>
                      </td>
                      <td className="p-4 font-mono font-bold text-brand-950">
                        {formatCurrencyPaise(b.principalPaise)}
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {formatDate(b.billDate)}
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        {b.interestPercentage}% / {b.interestDuration}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          EXPIRED (FROZEN)
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5 relative">
                          <button
                            onClick={() => onViewReceipt(b, p)}
                            className="p-1.5 text-slate-500 hover:text-brand-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Expired Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Three-Dot Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuBillId(isMenuOpen ? null : b.id)}
                              className="p-1.5 text-slate-500 hover:text-brand-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-20 animate-fadeIn">
                                <button
                                  onClick={() => {
                                    setActiveMenuBillId(null);
                                    setSelectedBillForRepublish(b);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-accent-600 hover:bg-accent-50 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Republish Bill</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Republish Confirmation Modal */}
      {selectedBillForRepublish && (
        <div
          className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedBillForRepublish(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center font-bold shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-950">
                  Republish Bill {selectedBillForRepublish.billNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: {selectedBillForRepublish.partyName}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Original Loan Date:</span>
                <span className="font-mono font-bold text-brand-950">
                  {formatDate(selectedBillForRepublish.billDate)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Principal Amount:</span>
                <span className="font-mono font-bold text-brand-950">
                  {formatCurrencyPaise(selectedBillForRepublish.principalPaise)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Interest Term:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedBillForRepublish.interestPercentage}% per {selectedBillForRepublish.interestDuration}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Interest will be recalculated from the original opening date ({formatDate(selectedBillForRepublish.billDate)}) to today, applying enabled late fees. The bill will return to the active ledger.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBillForRepublish(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRepublishing}
                onClick={handleConfirmRepublish}
                className="px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isRepublishing ? 'Republishing...' : 'Confirm Republish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
