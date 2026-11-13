import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  Search,
  Eye,
  Calendar,
  Banknote,
  Smartphone,
  ShieldCheck,
  FileText,
  UserCheck
} from 'lucide-react';
import { ClosingBill, Bill, Party } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { CustomerAvatar } from '../common/CustomerAvatar';

interface ClosingBillsViewProps {
  closingBills: ClosingBill[];
  bills: Bill[];
  parties: Party[];
  onOpenCloseBillModal: () => void;
  onViewReceipt: (bill: Bill, party?: Party, closing?: ClosingBill) => void;
}

export const ClosingBillsView: React.FC<ClosingBillsViewProps> = ({
  closingBills,
  bills,
  parties,
  onOpenCloseBillModal,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClosingBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return closingBills.filter((c) => {
      if (!q) return true;
      const billNoMatch = c.billNumber.toLowerCase().includes(q);
      const partyMatch = c.partyName.toLowerCase().includes(q);
      const phoneMatch = (c.partyPhone || '').toLowerCase().includes(q);
      const closedByMatch = (c.closedBy || '').toLowerCase().includes(q);
      const txMatch = (c.closingTransactionId || '').toLowerCase().includes(q);

      return billNoMatch || partyMatch || phoneMatch || closedByMatch || txMatch;
    });
  }, [closingBills, searchQuery]);

  const totalSettledAmountPaise = useMemo(() => {
    return closingBills.reduce((acc, c) => acc + (c.finalSettlementAmountPaise || 0), 0);
  }, [closingBills]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-950">
            Closing Bills & Settlements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Archived record of all fully settled pledge loans, released collateral, and audit signatures.
          </p>
        </div>

        <button
          onClick={onOpenCloseBillModal}
          className="px-4 py-2.5 bg-brand-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Settle & Close a Bill</span>
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Bills Settled
          </p>
          <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
            {closingBills.length}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            100% redeemed collateral
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Settlement Volume
          </p>
          <h4 className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
            {formatCurrencyPaise(totalSettledAmountPaise)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Final principal + interest collected
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Audit Authenticity
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold text-slate-700">
              Verified Audit Signatures
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Every closure is signed with operator identity
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
            placeholder="Search by bill number, customer, operator..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredClosingBills.length} closed records
        </span>
      </div>

      {/* Closing Bills Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-4 pl-6">Bill No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Settlement Total</th>
                <th className="p-4">Payment Breakdown</th>
                <th className="p-4">Closed Date</th>
                <th className="p-4">Closed By</th>
                <th className="p-4 pr-6 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClosingBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-600" />
                    <p className="font-medium">No closed bill records found.</p>
                  </td>
                </tr>
              ) : (
                filteredClosingBills.map((c) => {
                  const matchingBill = bills.find((b) => b.id === c.billId);
                  const matchingParty = parties.find((p) => p.id === c.partyId);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-brand-950">
                        {c.billNumber}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <CustomerAvatar photoUrl={matchingParty?.photoUrl} name={c.partyName} size="sm" />
                          <div>
                            <p className="font-bold text-brand-950">{c.partyName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{c.partyPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-extrabold text-emerald-600 text-sm">
                        {formatCurrencyPaise(c.finalSettlementAmountPaise)}
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {c.cashPaise && c.cashPaise > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold">
                              Cash: {formatCurrencyPaise(c.cashPaise)}
                            </span>
                          ) : null}
                          {c.upiPaise && c.upiPaise > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold">
                              GPay: {formatCurrencyPaise(c.upiPaise)}
                            </span>
                          ) : null}
                          {c.netBankingPaise && c.netBankingPaise > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono font-bold">
                              Other: {formatCurrencyPaise(c.netBankingPaise)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {formatDate(c.closingDate)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1 font-mono font-semibold text-brand-950 text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-accent-600" />
                          <span>{c.closedBy || 'Closed By: Authorized User'}</span>
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => {
                            if (matchingBill) {
                              onViewReceipt(matchingBill, matchingParty, c);
                            }
                          }}
                          disabled={!matchingBill}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer disabled:opacity-40"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
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
