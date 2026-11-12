import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Smartphone,
  ShieldAlert,
  Loader2,
  MoreVertical,
  Check,
  X,
  CreditCard,
  Sparkles,
  PowerOff,
  RefreshCw,
  Clock,
  Building,
  Mail,
  Phone,
  Calendar,
  Lock
} from 'lucide-react';
import {
  UserSummary,
  approveAndGrantPremium,
  disableUserAccount,
  reactivateDisabledAccount,
  blockUserAccount,
  unblockUserAccount,
  revokeAllUserDevices
} from '../services/adminDataService';
import { ConfirmationModal, ActionCategory } from './ConfirmationModal';

interface UserManagementViewProps {
  users: UserSummary[];
}

type UserSectionTab = 'all' | 'pending' | 'disabled' | 'blocked';

export const UserManagementView: React.FC<UserManagementViewProps> = ({ users }) => {
  const [activeSubTab, setActiveSubTab] = useState<UserSectionTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    actionType: ActionCategory;
    title: string;
    targetUser: UserSummary | null;
    consequences: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning' | 'primary' | 'success';
    requiresReason: boolean;
    reasonPlaceholder?: string;
  }>({
    isOpen: false,
    actionType: 'approve_premium',
    title: '',
    targetUser: null,
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

  // Section Filters
  const filteredUsers = users.filter((u) => {
    // Tab filter
    if (activeSubTab === 'pending' && u.status !== 'Pending') return false;
    if (activeSubTab === 'disabled' && u.status !== 'Disabled' && u.status !== 'Suspended') return false;
    if (activeSubTab === 'blocked' && u.status !== 'Blocked') return false;

    // Search filter
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.ownerName.toLowerCase().includes(q) ||
      u.shopName.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  // Action Triggers
  const triggerApprovePremium = (user: UserSummary) => {
    setOpenMenuUid(null);
    setModalConfig({
      isOpen: true,
      actionType: 'approve_premium',
      title: 'Approve User & Grant Full Premium Access',
      targetUser: user,
      consequences:
        'This will immediately approve the shop account and activate a complimentary full Premium subscription entitlement (max 9 devices, AI care, all premium features). Genuine Razorpay records will not be altered.',
      confirmLabel: 'Approve & Grant Premium',
      confirmVariant: 'success',
      requiresReason: false,
      reasonPlaceholder: 'Optional administrator note (e.g., Verified by phone, VIP shop)',
    });
  };

  const triggerDisable = (user: UserSummary) => {
    setOpenMenuUid(null);
    setModalConfig({
      isOpen: true,
      actionType: 'disable',
      title: 'Disable User Account (Temporary Restriction)',
      targetUser: user,
      consequences:
        'The user will be immediately logged out, all active device sessions revoked, and new logins rejected. Customer information, bills, and payment records remain preserved.',
      confirmLabel: 'Disable Account',
      confirmVariant: 'warning',
      requiresReason: true,
      reasonPlaceholder: 'Reason for account suspension (e.g., Pending verification, policy review)',
    });
  };

  const triggerBlock = (user: UserSummary) => {
    setOpenMenuUid(null);
    setModalConfig({
      isOpen: true,
      actionType: 'block',
      title: 'Block User Account (Permanent Restriction)',
      targetUser: user,
      consequences:
        'The account will be blocked. All active sessions and registered hardware devices will be immediately revoked. Login access and subscription purchases through Razorpay will be rejected until unblocked by a Global Administrator.',
      confirmLabel: 'Block Account',
      confirmVariant: 'danger',
      requiresReason: true,
      reasonPlaceholder: 'Reason for account block (e.g., Severe terms violation, fraudulent chargeback)',
    });
  };

  const triggerReactivate = (user: UserSummary) => {
    setOpenMenuUid(null);
    setModalConfig({
      isOpen: true,
      actionType: 'reactivate',
      title: 'Reactivate Disabled Account',
      targetUser: user,
      consequences:
        'This will restore active login capability for this shop. Existing data and subscription records will remain intact.',
      confirmLabel: 'Reactivate Account',
      confirmVariant: 'primary',
      requiresReason: false,
      reasonPlaceholder: 'Optional reactivation note',
    });
  };

  const triggerUnblock = (user: UserSummary) => {
    setOpenMenuUid(null);
    setModalConfig({
      isOpen: true,
      actionType: 'unblock',
      title: 'Unblock Account Access',
      targetUser: user,
      consequences:
        'This will remove the BLOCKED restriction and restore login authorization for the user and their registered devices.',
      confirmLabel: 'Unblock Account',
      confirmVariant: 'primary',
      requiresReason: true,
      reasonPlaceholder: 'Administrative justification for unblocking',
    });
  };

  // Execution Handler
  const handleModalConfirm = async (reason: string) => {
    const user = modalConfig.targetUser;
    if (!user) return;

    try {
      if (modalConfig.actionType === 'approve_premium') {
        const res = await approveAndGrantPremium(user.shopId, user.uid, user.email, {
          reason: reason || 'Complimentary administrator-granted full Premium access',
          previousStatus: user.status,
          previousPlan: user.plan,
        });
        if (res.success) {
          showNotification('success', `User ${user.email} successfully approved with full Premium access!`);
        } else {
          showNotification('error', res.error || 'Failed to approve user.');
        }
      } else if (modalConfig.actionType === 'disable') {
        const res = await disableUserAccount(
          user.shopId,
          user.uid,
          user.email,
          reason || 'Account suspended by administrator. Please contact customer support.',
          user.status
        );
        if (res.success) {
          showNotification('success', `User ${user.email} account has been disabled and all sessions terminated.`);
        } else {
          showNotification('error', res.error || 'Failed to disable user account.');
        }
      } else if (modalConfig.actionType === 'block') {
        const res = await blockUserAccount(
          user.shopId,
          user.uid,
          user.email,
          reason || 'Your account has been blocked by the administrator. Please contact customer support.',
          user.status
        );
        if (res.success) {
          showNotification('success', `User ${user.email} has been permanently blocked.`);
        } else {
          showNotification('error', res.error || 'Failed to block user.');
        }
      } else if (modalConfig.actionType === 'reactivate') {
        const res = await reactivateDisabledAccount(user.shopId, user.uid, user.email, reason);
        if (res.success) {
          showNotification('success', `User ${user.email} successfully reactivated.`);
        } else {
          showNotification('error', res.error || 'Failed to reactivate user.');
        }
      } else if (modalConfig.actionType === 'unblock') {
        const res = await unblockUserAccount(user.shopId, user.uid, user.email, reason);
        if (res.success) {
          showNotification('success', `User ${user.email} has been unblocked.`);
        } else {
          showNotification('error', res.error || 'Failed to unblock user.');
        }
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Operation failed.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'Disabled':
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <PowerOff className="w-3 h-3" />
            Disabled
          </span>
        );
      case 'Blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
            <Ban className="w-3 h-3" />
            Blocked
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
            {status}
          </span>
        );
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
      {/* Notifications Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
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
            <Users className="w-5 h-5 text-blue-400" />
            User Management & Administrative Control System
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Complete user registry, complimentary Premium activations, account restrictions, and session governance.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0B1528] border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'pending' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({users.filter((u) => u.status === 'Pending').length})
          </button>
          <button
            onClick={() => setActiveSubTab('disabled')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'disabled' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            Disabled Users ({users.filter((u) => u.status === 'Disabled' || u.status === 'Suspended').length})
          </button>
          <button
            onClick={() => setActiveSubTab('blocked')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeSubTab === 'blocked' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Blocked Users ({users.filter((u) => u.status === 'Blocked').length})
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800 flex items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by owner name, shop name, email, phone number, UID, or city..."
            className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Owner Name</th>
                <th className="py-3.5 px-4">Shop Name</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">User UID</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Subscription Plan</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4">Registered Devices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No user accounts match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                    {/* 1. Owner Name */}
                    <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                      {u.ownerName}
                    </td>

                    {/* 2. Shop Name */}
                    <td className="py-3.5 px-4 font-medium text-blue-400 whitespace-nowrap">
                      {u.shopName}
                    </td>

                    {/* 3. Email Address WITH THREE-DOT MENU BESIDE EMAIL */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 relative">
                        <span className="font-mono text-slate-200">{u.email}</span>

                        {/* Three-Dot Menu Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuUid(openMenuUid === u.uid ? null : u.uid)}
                            title="Account actions"
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {openMenuUid === u.uid && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuUid(null)}
                              />
                              <div className="absolute left-0 mt-1 w-52 bg-[#0B1528] border border-slate-700/80 rounded-xl shadow-2xl z-50 py-1 text-xs divide-y divide-slate-800/80 animate-scale-up">
                                {/* Action 1: APPROVE */}
                                <button
                                  type="button"
                                  onClick={() => triggerApprovePremium(u)}
                                  className="w-full text-left px-3 py-2 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Sparkles className="w-4 h-4 text-emerald-400" />
                                  <span>APPROVE (Grant Premium)</span>
                                </button>

                                {/* Action 2: DISABLE */}
                                {u.status !== 'Disabled' && u.status !== 'Suspended' ? (
                                  <button
                                    type="button"
                                    onClick={() => triggerDisable(u)}
                                    className="w-full text-left px-3 py-2 text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <PowerOff className="w-4 h-4 text-amber-400" />
                                    <span>DISABLE (Restrict Access)</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => triggerReactivate(u)}
                                    className="w-full text-left px-3 py-2 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <RefreshCw className="w-4 h-4 text-blue-400" />
                                    <span>REACTIVATE Account</span>
                                  </button>
                                )}

                                {/* Action 3: BLOCK */}
                                {u.status !== 'Blocked' ? (
                                  <button
                                    type="button"
                                    onClick={() => triggerBlock(u)}
                                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <Ban className="w-4 h-4 text-rose-400" />
                                    <span>BLOCK (Permanent)</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => triggerUnblock(u)}
                                    className="w-full text-left px-3 py-2 text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    <span>UNBLOCK Account</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Phone Number */}
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {u.phone || 'N/A'}
                    </td>

                    {/* 5. User UID */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-[130px] truncate" title={u.uid}>
                      {u.uid}
                    </td>

                    {/* 6. Registration Date */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* 7. Account Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>

                    {/* 8. Subscription Plan */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{u.plan}</div>
                      {u.entitlementSource === 'ADMIN_GRANTED' && (
                        <div className="text-[10px] text-purple-400">Admin Granted</div>
                      )}
                    </td>

                    {/* 9. Payment Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPaymentBadge(u.paymentStatus)}
                    </td>

                    {/* 10. Last Login */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                      {u.lastLoginAt ? (
                        <div>
                          <div>{new Date(u.lastLoginAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Never</span>
                      )}
                    </td>

                    {/* 11. Number of Registered Devices */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-white text-xs">{u.totalRegisteredDevicesCount}</span>
                        <span className="text-slate-500 text-[10px]">({u.activeDevicesCount} active)</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standardized Confirmation Modal */}
      {modalConfig.isOpen && modalConfig.targetUser && (
        <ConfirmationModal
          isOpen={modalConfig.isOpen}
          actionType={modalConfig.actionType}
          title={modalConfig.title}
          targetEmail={modalConfig.targetUser.email}
          targetDetails={`Shop: ${modalConfig.targetUser.shopName} | UID: ${modalConfig.targetUser.uid}`}
          consequences={modalConfig.consequences}
          confirmLabel={modalConfig.confirmLabel}
          confirmVariant={modalConfig.confirmVariant}
          requiresReason={modalConfig.requiresReason}
          reasonPlaceholder={modalConfig.reasonPlaceholder}
          onConfirm={handleModalConfirm}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false, targetUser: null })}
        />
      )}
    </div>
  );
};
