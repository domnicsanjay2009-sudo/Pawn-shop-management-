import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  Banknote,
  Smartphone,
  Building,
  User,
  ArrowDownLeft,
  FileText,
  Edit3
} from 'lucide-react';
import { Payment, Party, Bill } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { CustomerAvatar } from '../common/CustomerAvatar';

interface PaymentsViewProps {
  payments: Payment[];
  bills: Bill[];
  parties: Party[];
  onOpenPaymentModal: () => void;
  onEditPayment?: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  bills,
  parties,
  onOpenPaymentModal,
  onEditPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('All');

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      if (modeFilter !== 'All' && p.paymentMode !== modeFilter) {
        return false;
      }
      if (!q) return true;

      const partyMatch = p.partyName.toLowerCase().includes(q);
      const billNoMatch = p.billNumber.toLowerCase().includes(q);
      const modeMatch = p.paymentMode.toLowerCase().includes(q);
      const notesMatch = (p.notes || '').toLowerCase().includes(q);

      return partyMatch || billNoMatch || modeMatch || notesMatch;
    });
  }, [payments, searchQuery, modeFilter]);

  const totalCollectedPaise = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);
  }, [payments]);

  const totalInterestCollectedPaise = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.interestPortionPaise || 0), 0);
  }, [payments]);

  const totalPrincipalRepaidPaise = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.principalPortionPaise || 0), 0);
  }, [payments]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-950">
            Payment Transactions Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time record of all partial repayments, interest allocations, and payment modes.
          </p>
        </div>

        <button
          onClick={onOpenPaymentModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Part-Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Collections
          </p>
          <h4 className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
            {formatCurrencyPaise(totalCollectedPaise)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Across {payments.length} recorded payments
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Interest Allocated
          </p>
          <h4 className="text-2xl font-extrabold text-accent-600 mt-1 font-mono">
            {formatCurrencyPaise(totalInterestCollectedPaise)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Accrued interest settled
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Principal Recovered
          </p>
          <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
            {formatCurrencyPaise(totalPrincipalRepaidPaise)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Direct balance reductions
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, bill number, notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 font-medium"
          />
        </div>

        {/* Filter by Mode */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {['All', 'Cash', 'UPI', 'Split'].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modeFilter === m
                  ? 'bg-brand-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-4 pl-6">Payment Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Bill No</th>
                <th className="p-4">Total Paid</th>
                <th className="p-4">Interest Portion</th>
                <th className="p-4">Principal Reduction</th>
                <th className="p-4">Payment Mode</th>
                <th className="p-4">Notes</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No payment records found.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const matchingParty = parties.find((pt) => pt.id === p.partyId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6 font-mono text-slate-600">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <CustomerAvatar photoUrl={matchingParty?.photoUrl} name={p.partyName} size="sm" />
                          <div>
                            <p className="font-bold text-brand-950">{p.partyName}</p>
                            {matchingParty?.phone && <p className="text-[11px] text-slate-400 font-mono">{matchingParty.phone}</p>}
                          </div>
                        </div>
                      </td>
                    <td className="p-4 font-mono font-bold text-accent-600">
                      {p.billNumber}
                    </td>
                    <td className="p-4 font-mono font-extrabold text-emerald-600 text-sm">
                      {formatCurrencyPaise(p.amountPaise)}
                    </td>
                    <td className="p-4 font-mono text-accent-600">
                      {formatCurrencyPaise(p.interestPortionPaise)}
                    </td>
                    <td className="p-4 font-mono text-slate-700">
                      {formatCurrencyPaise(p.principalPortionPaise)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.paymentMode === 'Cash' && <Banknote className="w-3 h-3 text-emerald-600" />}
                        {p.paymentMode === 'UPI' && <Smartphone className="w-3 h-3 text-blue-600" />}
                        <span>{p.paymentMode}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 truncate max-w-xs">
                      {p.notes || '—'}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {onEditPayment && (
                        <button
                          onClick={() => onEditPayment(p)}
                          title="Edit / Alter Payment"
                          className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
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
