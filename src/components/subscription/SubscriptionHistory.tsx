import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, CreditCard, Calendar, IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSubscriptionHistory } from '../../services/subscriptionService';
import { Subscription } from '../../types';
import { formatCurrencyPaise, formatDate, formatDateTime } from '../../utils/formatters';

export const SubscriptionHistory: React.FC = () => {
  const { shopProfile } = useAuth();
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopProfile?.shopId) {
      getSubscriptionHistory(shopProfile.shopId).then((records) => {
        setHistory(records);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [shopProfile?.shopId]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-brand-950">Subscription History</h2>
        <p className="text-xs text-slate-500 mt-1">
          Verified audit records of all plan purchases and renewals for this shop
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-4 pl-6">Plan Name</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Start Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Transaction / Order ID</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Loading verified transaction records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No previous subscription payments recorded yet.</p>
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-brand-950 flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-accent-600" />
                      <span>{record.plan}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600">
                      {formatCurrencyPaise(record.amountPaise)}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {record.paymentMethod || 'Razorpay Standard'}
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="p-4 text-slate-600 font-mono">
                      {formatDate(record.startDate)}
                    </td>
                    <td className="p-4 text-slate-600 font-mono">
                      {formatDate(record.expiryDate)}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {record.razorpayPaymentId || record.razorpayOrderId || record.id}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
