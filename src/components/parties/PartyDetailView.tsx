import React, { useState, useMemo } from 'react';
import {
  Phone,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle,
  Plus,
  Search,
  Calendar,
  X,
  ArrowRight,
  TrendingUp,
  Percent,
  Clock,
  User,
  Paperclip
} from 'lucide-react';
import { Party, Bill, Payment, ClosingBill } from '../../types';
import { formatCurrencyPaise, formatDate, formatDateTime } from '../../utils/formatters';
import { evaluateBillStatus } from '../../utils/calculations';
import { MediaPreviewModal } from '../common/MediaPreviewModal';

interface PartyDetailViewProps {
  party: Party;
  bills: Bill[];
  payments: Payment[];
  closingBills: ClosingBill[];
  onClose: () => void;
  onOpenAddBill: (party: Party) => void;
  onOpenPayment: (party: Party, bill?: Bill) => void;
  onOpenCloseBill: (party: Party, bill: Bill) => void;
}

type ActivityFilter = 'All' | 'Bills' | 'Payments' | 'Closing Bills' | 'Expired Bills';

interface CombinedActivityItem {
  id: string;
  type: 'bill' | 'payment' | 'closing' | 'expired';
  timestamp: number;
  dateStr: string;
  data: Bill | Payment | ClosingBill;
}

export const PartyDetailView: React.FC<PartyDetailViewProps> = ({
  party,
  bills,
  payments,
  closingBills,
  onClose,
  onOpenAddBill,
  onOpenPayment,
  onOpenCloseBill,
}) => {
  const [filter, setFilter] = useState<ActivityFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState<{
    title: string;
    url: string;
    fileName?: string;
    fileType?: string;
  } | null>(null);

  // 1. Filter records strictly belonging to this party
  const partyBills = useMemo(() => bills.filter((b) => b.partyId === party.id), [bills, party.id]);
  const partyPayments = useMemo(() => payments.filter((p) => p.partyId === party.id), [payments, party.id]);
  const partyClosingBills = useMemo(() => closingBills.filter((c) => c.partyId === party.id), [closingBills, party.id]);
  const partyExpiredBills = useMemo(
    () => partyBills.filter((b) => b.status === 'Expired' || b.isExpired),
    [partyBills]
  );

  // Aggregate metrics for header
  const activeBills = partyBills.filter((b) => b.status === 'Active' && !b.isExpired);
  const totalPawnedPrincipalPaise = activeBills.reduce((acc, b) => acc + (b.currentPrincipalPaise || 0), 0);

  // 2. Build Combined Activity Stream
  const combinedStream = useMemo<CombinedActivityItem[]>(() => {
    const stream: CombinedActivityItem[] = [];

    partyBills.forEach((bill) => {
      const isExp = bill.status === 'Expired' || bill.isExpired;
      stream.push({
        id: `b_${bill.id}`,
        type: isExp ? 'expired' : 'bill',
        timestamp: bill.createdAt,
        dateStr: bill.billDate,
        data: bill,
      });
    });

    partyPayments.forEach((payment) => {
      stream.push({
        id: `p_${payment.id}`,
        type: 'payment',
        timestamp: payment.createdAt,
        dateStr: payment.paymentDate,
        data: payment,
      });
    });

    partyClosingBills.forEach((closing) => {
      stream.push({
        id: `c_${closing.id}`,
        type: 'closing',
        timestamp: closing.closedAt,
        dateStr: closing.closingDate,
        data: closing,
      });
    });

    // Sort strictly latest to oldest as required
    return stream.sort((a, b) => b.timestamp - a.timestamp);
  }, [partyBills, partyPayments, partyClosingBills]);

  // 3. Apply tab filter & search
  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return combinedStream.filter((item) => {
      // Tab filter
      if (filter === 'Bills' && (item.type !== 'bill' || (item.data as Bill).status === 'Expired' || (item.data as Bill).isExpired)) return false;
      if (filter === 'Payments' && item.type !== 'payment') return false;
      if (filter === 'Closing Bills' && item.type !== 'closing') return false;
      if (filter === 'Expired Bills' && item.type !== 'expired') return false;

      // Search filter
      if (!q) return true;

      if (item.type === 'bill') {
        const b = item.data as Bill;
        return (
          b.billNumber.toLowerCase().includes(q) ||
          b.itemCategory.toLowerCase().includes(q) ||
          b.itemDescription.toLowerCase().includes(q) ||
          (b.purity && b.purity.toLowerCase().includes(q))
        );
      } else if (item.type === 'payment') {
        const p = item.data as Payment;
        const amtStr = (p.amountPaise / 100).toString();
        return (
          p.billNumber.toLowerCase().includes(q) ||
          p.paymentMode.toLowerCase().includes(q) ||
          amtStr.includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q))
        );
      } else if (item.type === 'closing') {
        const c = item.data as ClosingBill;
        const amtStr = (c.finalSettlementAmountPaise / 100).toString();
        return (
          c.billNumber.toLowerCase().includes(q) ||
          c.paymentMode.toLowerCase().includes(q) ||
          amtStr.includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [combinedStream, filter, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-fadeIn flex flex-col h-full">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 text-white p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
          <div className="flex items-center space-x-4">
            {party.photoUrl ? (
              <button
                type="button"
                onClick={() =>
                  setPreviewMedia({
                    title: `${party.name} — Customer Photo`,
                    url: party.photoUrl!,
                    fileName: party.documentName || `${party.name}-photo.jpg`,
                    fileType: party.documentType || 'image/jpeg',
                  })
                }
                title="Click to inspect full customer photo"
                className="rounded-full overflow-hidden border-2 border-accent-500/60 hover:border-white transition-colors shadow-md shrink-0 cursor-zoom-in"
              >
                <img
                  src={party.photoUrl}
                  alt={party.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              </button>
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 text-slate-200 flex items-center justify-center shadow-md shrink-0">
                <User className="w-8 h-8" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white">{party.name}</h3>
                <span className="text-[11px] bg-accent-600/30 text-accent-300 font-semibold px-2 py-0.5 rounded-full border border-accent-500/30">
                  Customer
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="flex items-center space-x-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-accent-400" />
                  <span>{party.phone}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-accent-400" />
                  <span>{party.address}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
              Active Pawn Balance
            </p>
            <p className="text-xl font-extrabold text-accent-400">
              {formatCurrencyPaise(totalPawnedPrincipalPaise)}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {activeBills.length} Active {activeBills.length === 1 ? 'Bill' : 'Bills'}
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2.5">
          <button
            onClick={() => onOpenAddBill(party)}
            className="flex items-center space-x-2 px-3.5 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Pledge Bill</span>
          </button>
          {activeBills.length > 0 && (
            <button
              onClick={() => onOpenPayment(party)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}
          {(party.photoUrl || party.documentUrl) && (
            <button
              type="button"
              onClick={() =>
                setPreviewMedia({
                  title: `${party.name} — ${party.documentUrl ? 'Uploaded Document' : 'Customer Photo'}`,
                  url: (party.documentUrl || party.photoUrl)!,
                  fileName: party.documentName || (party.documentUrl ? 'document.pdf' : `${party.name}-photo.jpg`),
                  fileType: party.documentType || (party.documentUrl ? 'application/pdf' : 'image/jpeg'),
                })
              }
              className="flex items-center space-x-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
              <span>{party.documentUrl ? 'View Uploaded Document' : 'View Photo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filters: All, Bills, Payments, Closing Bills, Expired Bills */}
        <div className="flex flex-wrap rounded-xl bg-white border border-slate-200 p-0.5 text-xs font-semibold shrink-0 gap-0.5">
          {(['All', 'Bills', 'Payments', 'Closing Bills', 'Expired Bills'] as ActivityFilter[]).map((tab) => {
            const count =
              tab === 'All'
                ? combinedStream.length
                : tab === 'Bills'
                ? partyBills.filter((b) => b.status !== 'Expired' && !b.isExpired).length
                : tab === 'Payments'
                ? partyPayments.length
                : tab === 'Closing Bills'
                ? partyClosingBills.length
                : partyExpiredBills.length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filter === tab ? 'bg-brand-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* In-view Search control beside filters */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${filter}...`}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      {/* Activity Stream List (Latest to Oldest) */}
      <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-50/40">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No activity records found matching filters</p>
          </div>
        ) : (
          filteredActivities.map((item) => {
            if (item.type === 'bill') {
              const bill = item.data as Bill;
              const finStatus = evaluateBillStatus(bill);
              const isClosed = bill.status === 'Closed';

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden bg-white p-4 rounded-xl border shadow-xs transition-all ${
                    isClosed
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-slate-200 hover:border-accent-300'
                  }`}
                >
                  {/* Module 6: Semi-transparent CLOSED watermark overlay */}
                  {isClosed && (
                    <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center z-0">
                      <div className="transform -rotate-12 border-4 border-dashed border-rose-600/20 px-8 py-2 rounded-2xl">
                        <span className="text-rose-600/15 text-5xl sm:text-6xl font-black tracking-widest uppercase">
                          CLOSED
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isClosed ? 'bg-slate-200 text-slate-600' : 'bg-blue-50 text-accent-600'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-brand-950 font-mono text-sm">
                              {bill.billNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                !isClosed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {bill.status}
                            </span>
                            <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                              {bill.itemCategory}
                            </span>
                            {bill.purity && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                                {bill.purity}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-700 mt-1">
                            {bill.itemDescription}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1.5">
                            <span>
                              Gross: {bill.grossWeight} {bill.weightUnit} | Net: {bill.netWeight}{' '}
                              {bill.weightUnit}
                            </span>
                            <span>•</span>
                            <span>Date: {formatDate(bill.billDate)}</span>
                            <span>•</span>
                            <span>
                              Rate: {bill.interestPercentage}% / {bill.interestDuration}
                            </span>
                          </div>

                          {/* Audit trail metadata on closed bill */}
                          {isClosed && (
                            <div className="mt-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold text-slate-700">
                                <span className="text-brand-950 font-bold">
                                  {bill.closedBy
                                    ? (bill.closedBy.toLowerCase().startsWith('closed by:') ? bill.closedBy : `Closed By: ${bill.closedBy}`)
                                    : 'Closed By: Authorized Staff'}
                                </span>
                              </span>
                              {bill.closedAt && (
                                <span>Closed On: {formatDateTime(bill.closedAt)}</span>
                              )}
                              {bill.closingTransactionId && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  Ref: {bill.closingTransactionId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <p className="text-xs text-slate-400 font-semibold uppercase">Principal</p>
                        <p className="text-sm font-bold text-brand-950">
                          {formatCurrencyPaise(bill.principalPaise)}
                        </p>
                        {!isClosed && (
                          <div className="mt-1">
                            <span className="text-[11px] font-semibold text-accent-600">
                              + {formatCurrencyPaise(finStatus.accruedInterestPaise)} interest
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions for Active Bill */}
                    {!isClosed && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onOpenPayment(party, bill)}
                          className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Add Payment
                        </button>
                        <button
                          onClick={() => onOpenCloseBill(party, bill)}
                          className="px-3 py-1 bg-slate-100 hover:bg-brand-900 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Close Bill
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (item.type === 'payment') {
              const payment = item.data as Payment;
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-brand-950">
                          Payment for {payment.billNumber}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {payment.paymentMode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span>Date: {formatDate(payment.paymentDate)}</span>
                        {payment.notes && <span className="ml-2 italic text-slate-400">"{payment.notes}"</span>}
                      </div>

                      {/* Multi-Mode Split Breakdown */}
                      {payment.splitAllocations && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {payment.splitAllocations.cashPaise > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-medium">
                              Cash: {formatCurrencyPaise(payment.splitAllocations.cashPaise)}
                            </span>
                          )}
                          {payment.splitAllocations.upiPaise > 0 && (
                            <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-medium">
                              GPay/UPI: {formatCurrencyPaise(payment.splitAllocations.upiPaise)}
                            </span>
                          )}
                          {payment.splitAllocations.netBankingPaise > 0 && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md font-mono font-medium">
                              Net Banking: {formatCurrencyPaise(payment.splitAllocations.netBankingPaise)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">
                      + {formatCurrencyPaise(payment.amountPaise)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Interest: {formatCurrencyPaise(payment.interestPortionPaise)} | Principal: {formatCurrencyPaise(payment.principalPortionPaise)}
                    </p>
                  </div>
                </div>
              );
            } else {
              const closing = item.data as ClosingBill;
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between bg-slate-50/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-brand-950">
                          Bill Closed: {closing.billNumber}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          Settled
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {closing.paymentMode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Closing Date: {formatDate(closing.closingDate)}
                      </p>

                      {/* Audit Details */}
                      <div className="mt-1 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold text-slate-800">
                          <span className="text-brand-950 font-bold">
                            {closing.closedBy
                              ? (closing.closedBy.toLowerCase().startsWith('closed by:') ? closing.closedBy : `Closed By: ${closing.closedBy}`)
                              : 'Closed By: Authorized Staff'}
                          </span>
                        </span>
                        {closing.closingTransactionId && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Ref: {closing.closingTransactionId}
                          </span>
                        )}
                      </div>

                      {/* Multi-Mode Split Breakdown */}
                      {closing.splitAllocations && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {closing.splitAllocations.cashPaise > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-medium">
                              Cash: {formatCurrencyPaise(closing.splitAllocations.cashPaise)}
                            </span>
                          )}
                          {closing.splitAllocations.upiPaise > 0 && (
                            <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-medium">
                              GPay/UPI: {formatCurrencyPaise(closing.splitAllocations.upiPaise)}
                            </span>
                          )}
                          {closing.splitAllocations.netBankingPaise > 0 && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md font-mono font-medium">
                              Net Banking: {formatCurrencyPaise(closing.splitAllocations.netBankingPaise)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-950">
                      {formatCurrencyPaise(closing.finalSettlementAmountPaise)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Final Settlement</p>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      <MediaPreviewModal
        isOpen={!!previewMedia}
        title={previewMedia?.title || ''}
        url={previewMedia?.url}
        fileName={previewMedia?.fileName}
        fileType={previewMedia?.fileType}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
};
