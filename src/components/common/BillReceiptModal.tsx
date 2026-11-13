import React from 'react';
import { X, Printer, CheckCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Bill, Party, ShopProfile, ClosingBill } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { ShopLogoBadge } from './ShopLogoBadge';

interface BillReceiptModalProps {
  bill: Bill;
  party?: Party;
  shopProfile?: ShopProfile | null;
  closingBill?: ClosingBill | null;
  onClose: () => void;
}

export const BillReceiptModal: React.FC<BillReceiptModalProps> = ({
  bill,
  party,
  shopProfile,
  closingBill,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isClosed = bill.status === 'Closed' || Boolean(bill.closedAt);
  const isExpired = bill.status === 'Expired' || Boolean(bill.isExpired);

  const closedByName =
    bill.closedBy ||
    closingBill?.closedBy ||
    (isClosed ? 'Authorized User' : '');

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="bg-brand-950 text-white p-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pawn Pledge Receipt
            </span>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-white">
              {bill.billNumber}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-receipt" className="p-8 sm:p-10 flex-1 overflow-y-auto relative bg-white text-slate-900">
          {/* Watermark: CLOSED */}
          {isClosed && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              aria-hidden="true"
            >
              <div className="transform -rotate-25 border-8 border-rose-500/20 text-rose-500/20 font-black text-6xl sm:text-8xl tracking-widest px-10 py-4 rounded-3xl uppercase">
                CLOSED
              </div>
            </div>
          )}

          {/* Watermark: EXPIRED */}
          {isExpired && !isClosed && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
              aria-hidden="true"
            >
              <div className="transform -rotate-25 border-8 border-amber-500/20 text-amber-500/20 font-black text-6xl sm:text-8xl tracking-widest px-10 py-4 rounded-3xl uppercase">
                EXPIRED
              </div>
            </div>
          )}

          <div className="relative z-10 space-y-6">
            {/* Header: Shop Info */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center space-x-3.5">
                <ShopLogoBadge
                  logoUrl={shopProfile?.logoUrl}
                  shopName={shopProfile?.shopName}
                  sizeClass="w-14 h-14"
                  roundedClass="rounded-2xl"
                  fallbackBgClass="bg-brand-950"
                  iconClass="w-7 h-7 text-white"
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-brand-950">
                    {shopProfile?.shopName || 'GS Pawn Shop Management'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {shopProfile?.address || 'Ponneri, Thiruvallur, Tamil Nadu, India'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Phone: {shopProfile?.phone || '+91 9363200295'} • Email: {shopProfile?.email || 'domnicsanjay2009@gmail.com'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    isClosed
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isExpired
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {bill.status}
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                  Bill No: {bill.billNumber}
                </p>
                <p className="text-[11px] text-slate-500">Date: {formatDate(bill.billDate)}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Customer / Borrower
                </span>
                <h4 className="text-sm font-bold text-brand-950 mt-0.5">
                  {bill.partyName || party?.name || 'Walk-in Customer'}
                </h4>
                <p className="text-slate-600 mt-0.5 font-mono">
                  {bill.partyPhone || party?.phone || 'No phone recorded'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Customer Address
                </span>
                <p className="text-slate-700 mt-0.5">
                  {party?.address || 'Address on file'}
                </p>
              </div>
            </div>

            {/* Collateral Description Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Pledged Ornament / Collateral
              </h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3">Purity</th>
                    <th className="p-3">Gross Wt</th>
                    <th className="p-3 text-right">Net Wt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold text-brand-950">{bill.itemCategory}</td>
                    <td className="p-3 text-slate-800">{bill.itemDescription}</td>
                    <td className="p-3 text-slate-600 font-mono">{bill.purity || 'N/A'}</td>
                    <td className="p-3 text-slate-700 font-mono">
                      {bill.grossWeight} {bill.weightUnit}
                    </td>
                    <td className="p-3 text-right text-brand-950 font-bold font-mono">
                      {bill.netWeight} {bill.weightUnit}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Ledger Terms */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Principal Loan Amount:</span>
                <span className="font-bold font-mono text-brand-950 text-sm">
                  {formatCurrencyPaise(bill.principalPaise)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Agreed Interest Terms:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {bill.interestPercentage}% per {bill.interestDuration}
                </span>
              </div>
              {bill.totalPaidPaise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Payments Made to Date:</span>
                  <span className="font-bold font-mono">
                    {formatCurrencyPaise(bill.totalPaidPaise)}
                  </span>
                </div>
              )}
              {isClosed && (
                <div className="flex justify-between text-rose-700 pt-2 border-t border-slate-200 font-bold text-sm">
                  <span>Settlement Status:</span>
                  <span className="uppercase">PLEDGE REDEEMED & CLOSED</span>
                </div>
              )}
            </div>

            {/* Closing Bill Attribution Details */}
            {isClosed && (
              <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-rose-950">
                  <span>Closing Execution:</span>
                  <span className="font-mono text-brand-950">{closedByName}</span>
                </div>
                {bill.closedAt && (
                  <div className="flex justify-between text-slate-600">
                    <span>Closed On:</span>
                    <span className="font-mono">
                      {new Date(bill.closedAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {bill.closingTransactionId && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Transaction Reference:</span>
                    <span className="font-mono">{bill.closingTransactionId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Expired Bill Notice */}
            {isExpired && !isClosed && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center space-x-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Frozen Ledger Record</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  This bill is expired and calculations are frozen. Use the Republish action to recalculate interest to the current date and return to the active ledger.
                </p>
              </div>
            )}

            {/* Footer Signatures */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="h-12 border-b border-dashed border-slate-300" />
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Customer Signature</p>
              </div>
              <div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  <span className="text-[11px] font-mono font-bold text-brand-950">
                    {closedByName || shopProfile?.ownerName || 'Authorized Signatory'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Authorized Shop Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
