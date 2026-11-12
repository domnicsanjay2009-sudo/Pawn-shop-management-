import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { UserSummary, approveAndGrantPremium, rejectUserRegistration } from '../services/adminDataService';

interface RegistrationApprovalsViewProps {
  users: UserSummary[];
}

export const RegistrationApprovalsView: React.FC<RegistrationApprovalsViewProps> = ({ users }) => {
  const pendingUsers = users.filter((u) => u.status === 'Pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ user: UserSummary; action: 'approve' | 'reject' } | null>(null);
  const [noteOrReason, setNoteOrReason] = useState('');

  const handleConfirm = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    if (selectedUser.action === 'approve') {
      await approveAndGrantPremium(
        selectedUser.user.shopId,
        selectedUser.user.uid,
        selectedUser.user.email,
        {
          reason: noteOrReason || 'Complimentary administrator-granted full Premium access upon registration approval',
          previousStatus: 'Pending',
          previousPlan: selectedUser.user.plan,
        }
      );
    } else {
      await rejectUserRegistration(selectedUser.user.shopId, selectedUser.user.uid, noteOrReason || 'Registration declined');
    }

    setActionLoading(false);
    setSelectedUser(null);
    setNoteOrReason('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Pending Registration Approvals
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Review and manually verify new shop registrations before authorizing access.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-semibold">
          {pendingUsers.length} Pending Review
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">All Caught Up!</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            There are no pending shop registrations waiting for verification at this moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingUsers.map((u) => (
            <div
              key={u.uid}
              className="bg-[#0B1528] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {u.shopName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{u.ownerName}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 bg-[#080E1C] p-3.5 rounded-xl border border-slate-800/80 mb-5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-400">Email:</span>
                    <span className="font-medium text-white truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-400">Phone:</span>
                    <span>{u.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-400">City / Location:</span>
                    <span>{u.city || 'N/A'}</span>
                  </div>
                  {u.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400">Applied On:</span>
                      <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedUser({ user: u, action: 'reject' })}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => setSelectedUser({ user: u, action: 'approve' })}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve License</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <h3 className="font-bold text-white text-base mb-2">
              {selectedUser.action === 'approve'
                ? 'Approve User & Grant Full Premium Access'
                : 'Decline Shop Registration'}
            </h3>
            <p className="text-slate-300 text-xs mb-4">
              {selectedUser.action === 'approve'
                ? 'Are you sure you want to approve this user and grant full Premium access? This will immediately activate full Premium entitlements (up to 9 devices, AI care) as a complimentary administrator grant.'
                : `Are you sure you want to decline registration for ${selectedUser.user.shopName}?`}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {selectedUser.action === 'approve' ? 'Optional Approval Note' : 'Reason for Declining'}
              </label>
              <input
                type="text"
                placeholder={selectedUser.action === 'approve' ? 'e.g. Verified by phone call' : 'e.g. Incomplete details'}
                value={noteOrReason}
                onChange={(e) => setNoteOrReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className={`px-4 py-2 text-white text-xs rounded-xl font-medium flex items-center gap-2 cursor-pointer ${
                  selectedUser.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm {selectedUser.action === 'approve' ? 'Approval' : 'Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
