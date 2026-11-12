import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Smartphone,
  Edit3,
  Calendar,
  AlertCircle,
  Receipt,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
  Ban,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';
import {
  SubscriptionItem,
  PaymentTxItem,
  grantComplimentaryPremium,
  revokeComplimentaryPremium,
  extendSubscriptionValidity
} from '../services/adminDataService';
import { ConfirmationModal, ActionCategory } from './ConfirmationModal';

interface SubscriptionManagementViewProps {
  subscriptions: SubscriptionItem[];
  transactions: PaymentTxItem[];
}

export const SubscriptionManagementView: React.FC<SubscriptionManagementViewProps> = ({
  subscriptions,
  transactions
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'subscriptions' | 'transactions'>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Selected subscription for details modal
  const [selectedSubForDetails, setSelectedSubForDetails] = useState<SubscriptionItem | null>(null);

  // Confirmation modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    actionType: ActionCategory;
    title: string;
    targetSub: SubscriptionItem | null;
    consequences: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning' | 'primary' | 'success';
    requiresReason: boolean;
    reasonPlaceholder?: string;
    extraDays?: number;
    newPlan?: string;
  }>({
    isOpen: false,
    actionType: 'grant_premium',
    title: '',
    targetSub: null,
    consequences: '',
    confirmLabel: 'Confirm',
    confirmVariant: 'primary',
    requiresReason: false,
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.shopId.toLowerCase().includes(q) ||
      (s.shopName && s.shopName.toLowerCase().includes(q)) ||
      (s.ownerEmail && s.ownerEmail.toLowerCase().includes(q)) ||
      s.plan.toLowerCase().includes(q) ||
      s.entitlementSource.toLowerCase().includes(q)
    );
  });

  const filteredTx = transactions.filter((t) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.orderId?.toLowerCase().includes(q) ||
      t.paymentId?.toLowerCase().includes(q) ||
      t.shopId?.toLowerCase().includes(q) ||
      t.planName?.toLowerCase().includes(q)
    );
  });

  // Action Triggers
  const triggerGrantPremium = (sub: SubscriptionItem) => {
    setOpenMenuId(null);
    setModalConfig({
      isOpen: true,
      actionType: 'grant_premium',
      title: 'Grant Complimentary Premium Entitlement',
      targetSub: sub,
      consequences:
        'This will upgrade the shop entitlement to Yearly Premium (9 devices max, AI customer care). Payment status will be marked COMPLIMENTARY without touching existing Razorpay records.',
      confirmLabel: 'Grant Complimentary Premium',
      confirmVariant: 'success',
      requiresReason: true,
      reasonPlaceholder: 'Reason for granting complimentary Premium (e.g., Annual promotion, Partner license)',
      extraDays: 365,
    });
  };

  const triggerRevokePremium = (sub: SubscriptionItem) => {
    setOpenMenuId(null);
    setModalConfig({
      isOpen: true,
      actionType: 'revoke_premium',
      title: 'Revoke Administrator-Granted Premium',
      targetSub: sub,
      consequences:
        'This will revert the subscription entitlement to Free tier, reduce device limit to 3, and deactivate AI Care.',
      confirmLabel: 'Revoke Premium',
      confirmVariant: 'danger',
      requiresReason: true,
      reasonPlaceholder: 'Reason for revoking complimentary entitlement (e.g., Trial period ended)',
    });
  };

  const triggerExtendValidity = (sub: SubscriptionItem, days = 90) => {
    setOpenMenuId(null);
    setModalConfig({
      isOpen: true,
      actionType: 'extend_subscription',
      title: `Extend Subscription Validity (+${days} Days)`,
      targetSub: sub,
      consequences: `This will extend the current subscription expiry date by ${days} calendar days from its current expiration or from today.`,
      confirmLabel: `Extend by ${days} Days`,
      confirmVariant: 'primary',
      requiresReason: true,
      reasonPlaceholder: 'Reason for validity extension (e.g., Grace period, Customer support courtesy)',
      extraDays: days,
    });
  };

  const handleModalConfirm = async (reason: string) => {
    const sub = modalConfig.targetSub;
    if (!sub) return;

    try {
      if (modalConfig.actionType === 'grant_premium') {
        const res = await grantComplimentaryPremium(
          sub.shopId,
          sub.shopId.replace('shop_', ''),
          sub.ownerEmail || sub.shopId,
          modalConfig.extraDays || 365,
          reason
        );
        if (res.success) {
          showNotification('success', `Complimentary Premium successfully activated for ${sub.shopName || sub.shopId}!`);
        } else {
          showNotification('error', res.error || 'Failed to grant Premium.');
        }
      } else if (modalConfig.actionType === 'revoke_premium') {
        const res = await revokeComplimentaryPremium(
          sub.shopId,
          sub.shopId.replace('shop_', ''),
          sub.ownerEmail || sub.shopId,
          reason
        );
        if (res.success) {
          showNotification('success', `Complimentary Premium revoked for ${sub.shopName || sub.shopId}.`);
        } else {
          showNotification('error', res.error || 'Failed to revoke Premium.');
        }
      } else if (modalConfig.actionType === 'extend_subscription') {
        const res = await extendSubscriptionValidity(
          sub.shopId,
          sub.shopId.replace('shop_', ''),
          sub.ownerEmail || sub.shopId,
          modalConfig.extraDays || 90,
          reason
        );
        if (res.success) {
          showNotification('success', `Subscription successfully extended by ${modalConfig.extraDays || 90} days!`);
        } else {
          showNotification('error', res.error || 'Failed to extend subscription.');
        }
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Operation failed.');
    }
  };

  const getEntitlementBadge = (source: string) => {
    switch (source) {
      case 'RAZORPAY':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">RAZORPAY</span>;
      case 'ADMIN_GRANTED':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">ADMIN_GRANTED</span>;
      case 'COMPLIMENTARY':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">COMPLIMENTARY</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">SYSTEM</span>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">PAID</span>;
      case 'COMPLIMENTARY':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">COMPLIMENTARY</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">UNPAID</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Subscription Entitlements & Razorpay Webhook Ledger
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Independent separation of Account Approval, Subscription Entitlement, and Genuine Razorpay Payment Status.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0B1528] border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveSubTab('subscriptions')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'subscriptions' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Subscription Entitlements ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'transactions' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Genuine Webhook Records ({transactions.length})
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer email, shop name, shop ID, plan name, or order ID..."
            className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Subscription Entitlements Table */}
      {activeSubTab === 'subscriptions' && (
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                  <th className="py-3.5 px-4">User Email</th>
                  <th className="py-3.5 px-4">Shop Name</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Subscription Status</th>
                  <th className="py-3.5 px-4">Entitlement Source</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No subscription entitlement records found.
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map((s) => {
                    const daysRemaining = Math.max(0, Math.ceil((s.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)));
                    const isApproved = s.status === 'Approved' && s.expiryDate > Date.now();

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                        {/* 1. User Email */}
                        <td className="py-3.5 px-4 font-mono font-medium text-white">
                          {s.ownerEmail || s.shopId}
                        </td>

                        {/* 2. Shop Name */}
                        <td className="py-3.5 px-4 font-semibold text-blue-400">
                          {s.shopName || s.shopId}
                        </td>

                        {/* 3. Current Plan */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-200">{s.plan}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Max: {s.maxDevices} devices</div>
                        </td>

                        {/* 4. Start Date */}
                        <td className="py-3.5 px-4 text-slate-300">
                          {s.startDate ? new Date(s.startDate).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* 5. Expiry Date */}
                        <td className="py-3.5 px-4 text-slate-300">
                          <div>{new Date(s.expiryDate).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500">
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                          </div>
                        </td>

                        {/* 6. Payment Status */}
                        <td className="py-3.5 px-4">
                          {getPaymentBadge(s.paymentStatus)}
                        </td>

                        {/* 7. Subscription Status */}
                        <td className="py-3.5 px-4">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              Expired
                            </span>
                          )}
                        </td>

                        {/* 8. Entitlement Source */}
                        <td className="py-3.5 px-4">
                          {getEntitlementBadge(s.entitlementSource)}
                        </td>

                        {/* 9. Actions Menu */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === s.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-1 w-56 bg-[#0B1528] border border-slate-700 rounded-xl shadow-2xl z-50 py-1 text-xs divide-y divide-slate-800 animate-scale-up text-left">
                                  {/* View Details */}
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setSelectedSubForDetails(s);
                                    }}
                                    className="w-full px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Receipt className="w-4 h-4 text-blue-400" />
                                    <span>View Subscription Details</span>
                                  </button>

                                  {/* Grant Complimentary Premium */}
                                  {s.plan !== 'Yearly Premium' && (
                                    <button
                                      onClick={() => triggerGrantPremium(s)}
                                      className="w-full px-3 py-2 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <Sparkles className="w-4 h-4 text-emerald-400" />
                                      <span>Grant Complimentary Premium</span>
                                    </button>
                                  )}

                                  {/* Extend Validity */}
                                  <button
                                    onClick={() => triggerExtendValidity(s, 90)}
                                    className="w-full px-3 py-2 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <span>Extend Validity (+90 Days)</span>
                                  </button>
                                  <button
                                    onClick={() => triggerExtendValidity(s, 365)}
                                    className="w-full px-3 py-2 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <span>Extend Validity (+365 Days)</span>
                                  </button>

                                  {/* Revoke Complimentary Premium */}
                                  {(s.entitlementSource === 'ADMIN_GRANTED' || s.entitlementSource === 'COMPLIMENTARY') && (
                                    <button
                                      onClick={() => triggerRevokePremium(s)}
                                      className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <Ban className="w-4 h-4 text-rose-400" />
                                      <span>Revoke Admin Premium</span>
                                    </button>
                                  )}
                                </div>
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
      )}

      {/* Genuine Webhook Transactions Table */}
      {activeSubTab === 'transactions' && (
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">
                  <th className="py-3.5 px-4">Razorpay Payment ID</th>
                  <th className="py-3.5 px-4">Razorpay Order ID</th>
                  <th className="py-3.5 px-4">Shop ID</th>
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Captured Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No webhook payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {t.paymentId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {t.orderId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {t.shopId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {t.planName}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ₹{(t.amount / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {t.method || 'Razorpay Webhook'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscription Details Modal */}
      {selectedSubForDetails && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" />
                Subscription Entitlement Details
              </h3>
              <button onClick={() => setSelectedSubForDetails(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#080E1C] p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 text-[11px]">Shop ID:</span>
                <p className="font-mono text-white font-medium">{selectedSubForDetails.shopId}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Shop Name:</span>
                <p className="text-blue-400 font-semibold">{selectedSubForDetails.shopName}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Current Plan:</span>
                <p className="font-bold text-white">{selectedSubForDetails.plan}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Entitlement Source:</span>
                <p className="text-purple-400 font-semibold">{selectedSubForDetails.entitlementSource}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Payment Status:</span>
                <p className="text-emerald-400 font-bold">{selectedSubForDetails.paymentStatus}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Max Authorized Devices:</span>
                <p className="text-white font-mono font-bold">{selectedSubForDetails.maxDevices} devices</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Start Date:</span>
                <p className="text-slate-300">{new Date(selectedSubForDetails.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Expiry Date:</span>
                <p className="text-slate-300">{new Date(selectedSubForDetails.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>

            {selectedSubForDetails.note && (
              <div className="p-3 bg-[#080E1C] rounded-xl border border-slate-800 text-slate-300">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">
                  Administrative Note:
                </span>
                <p>{selectedSubForDetails.note}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubForDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalConfig.isOpen && modalConfig.targetSub && (
        <ConfirmationModal
          isOpen={modalConfig.isOpen}
          actionType={modalConfig.actionType}
          title={modalConfig.title}
          targetEmail={modalConfig.targetSub.ownerEmail || modalConfig.targetSub.shopId}
          targetDetails={`Shop: ${modalConfig.targetSub.shopName || modalConfig.targetSub.shopId} | Current Plan: ${modalConfig.targetSub.plan}`}
          consequences={modalConfig.consequences}
          confirmLabel={modalConfig.confirmLabel}
          confirmVariant={modalConfig.confirmVariant}
          requiresReason={modalConfig.requiresReason}
          reasonPlaceholder={modalConfig.reasonPlaceholder}
          onConfirm={handleModalConfirm}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false, targetSub: null })}
        />
      )}
    </div>
  );
};
