import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Eye,
  CheckCircle,
  CreditCard,
  ChevronDown,
  X,
  Coins,
  ArrowUpRight
} from 'lucide-react';
import { Bill, Party, AppSettings } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { evaluateBillStatus } from '../../utils/calculations';
import { AddBillForm } from './AddBillForm';
import { CustomerAvatar } from '../common/CustomerAvatar';

interface BillsViewProps {
  bills: Bill[];
  parties: Party[];
  settings: AppSettings;
  onSaveBill: (data: any) => Promise<void>;
  onOpenPayment: (party: Party, bill: Bill) => void;
  onOpenCloseBill: (party: Party, bill: Bill) => void;
  onViewReceipt: (bill: Bill, party?: Party) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  parties,
  settings,
  onSaveBill,
  onOpenPayment,
  onOpenCloseBill,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Closed'>('All');
  const [isAddBillExpanded, setIsAddBillExpanded] = useState(false);

  // Multi-field search matching Customer Name, Phone, Bill Number, and Ornament Descriptions
  // ("Chain", "Gold", "Silver", "Kolusu", etc.)
  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bills.filter((b) => {
      // Status filter
      if (statusFilter === 'Active' && b.status !== 'Active') return false;
      if (statusFilter === 'Closed' && b.status !== 'Closed') return false;

      if (!q) return true;

      const billNoMatch = b.billNumber.toLowerCase().includes(q);
      const customerMatch = b.partyName.toLowerCase().includes(q);
      const phoneMatch = (b.partyPhone || '').toLowerCase().includes(q);
      const categoryMatch = (b.itemCategory || '').toLowerCase().includes(q);
      const itemDescMatch = (b.itemDescription || '').toLowerCase().includes(q);
      const purityMatch = (b.purity || '').toLowerCase().includes(q);

      return (
        billNoMatch ||
        customerMatch ||
        phoneMatch ||
        categoryMatch ||
        itemDescMatch ||
        purityMatch
      );
    });
  }, [bills, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-950">
            Pledge Bills Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage active loans, search ornament descriptions, and view settlement receipts.
          </p>
        </div>

        {/* Quick Minimized Add Bill Button (if collapsed) */}
        {!isAddBillExpanded && (
          <button
            onClick={() => setIsAddBillExpanded(true)}
            className="px-4 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pledge Bill</span>
          </button>
        )}
      </div>

      {/* Minimized / Expanded Quick-Action Window */}
      {isAddBillExpanded && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300 animate-fadeIn">
          <div className="bg-brand-950 text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-accent-600/30 text-accent-400 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  New Pledge Bill Quick Action
                </h3>
                <p className="text-xs text-slate-300">
                  Fill in borrower details, collateral ornaments, and agreed loan terms.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAddBillExpanded(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <AddBillForm
              parties={parties}
              settings={settings}
              onSave={async (data) => {
                await onSaveBill(data);
                setIsAddBillExpanded(false);
              }}
              onCancel={() => setIsAddBillExpanded(false)}
            />
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input with Ornament support */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, bill no, or ornament (Chain, Kolusu, Gold)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {(['All', 'Active', 'Closed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-brand-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st} ({bills.filter((b) => (st === 'All' ? true : b.status === st)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Bills Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-4 pl-6">Bill No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Collateral Details</th>
                <th className="p-4">Principal Loan</th>
                <th className="p-4">Interest Term</th>
                <th className="p-4">Current Payable</th>
                <th className="p-4">Pledge Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No bills found matching your search criteria.</p>
                    {searchQuery && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Try searching by ornament description ("Chain", "Kolusu") or clear the search filter.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => {
                  const p = parties.find((part) => part.id === b.partyId);
                  const financial = evaluateBillStatus(b);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
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
                      <td className="p-4 max-w-xs">
                        <span className="font-bold text-slate-900">{b.itemCategory}</span>
                        <p className="text-slate-600 truncate">{b.itemDescription}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {b.grossWeight}{b.weightUnit} • {b.purity || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-brand-950">
                        {formatCurrencyPaise(b.principalPaise)}
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {b.interestPercentage}% / {b.interestDuration}
                      </td>
                      <td className="p-4 font-mono font-bold text-accent-600">
                        {b.status === 'Closed' ? '₹0.00' : formatCurrencyPaise(financial.totalPayablePaise)}
                      </td>
                      <td className="p-4 text-slate-500 font-mono">
                        {formatDate(b.billDate)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'Expired'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onViewReceipt(b, p)}
                            title="View Receipt"
                            className="p-1.5 text-slate-500 hover:text-brand-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {b.status === 'Active' && p && (
                            <>
                              <button
                                onClick={() => onOpenPayment(p, b)}
                                title="Record Part-Payment"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenCloseBill(p, b)}
                                title="Settle & Close Bill"
                                className="p-1.5 text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
    </div>
  );
};
