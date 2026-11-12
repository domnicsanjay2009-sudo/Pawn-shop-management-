import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  User
} from 'lucide-react';
import { AdminDevice, revokeDevice, revokeAllUserDevices } from '../services/adminDataService';

interface DeviceHistoryViewProps {
  devices: AdminDevice[];
}

export const DeviceHistoryView: React.FC<DeviceHistoryViewProps> = ({ devices }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [selectedUserForBulkRevoke, setSelectedUserForBulkRevoke] = useState<{ uid: string; email: string } | null>(null);
  const [singleRevokeDevice, setSingleRevokeDevice] = useState<AdminDevice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [revokeReason, setRevokeReason] = useState('Administrative compliance policy');

  const filteredDevices = devices.filter((d) => {
    if (statusFilter !== 'all' && d.device_status !== statusFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.owner_email.toLowerCase().includes(q) ||
      d.user_uid.toLowerCase().includes(q) ||
      d.shop_name.toLowerCase().includes(q) ||
      d.device_name.toLowerCase().includes(q) ||
      d.device_id.toLowerCase().includes(q) ||
      d.browser.toLowerCase().includes(q) ||
      d.operating_system.toLowerCase().includes(q)
    );
  });

  const handleSingleRevoke = async () => {
    if (!singleRevokeDevice) return;
    setActionLoading(true);
    await revokeDevice(singleRevokeDevice.device_id, singleRevokeDevice.user_uid, revokeReason);
    setActionLoading(false);
    setSingleRevokeDevice(null);
  };

  const handleBulkRevoke = async () => {
    if (!selectedUserForBulkRevoke) return;
    setActionLoading(true);
    await revokeAllUserDevices(selectedUserForBulkRevoke.uid, revokeReason);
    setActionLoading(false);
    setSelectedUserForBulkRevoke(null);
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-4 h-4 text-cyan-400" />;
    if (type === 'Tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Complete Device History Registry
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Permanent hardware ledger: tracks all devices ever registered per user across multiple logins.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#0B1528] border border-slate-800 text-xs text-slate-300">
          Total Registered: <span className="font-bold text-white">{devices.length}</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer email, shop, device name, hardware ID..."
            className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex rounded-xl bg-[#080E1C] border border-slate-800 p-0.5 text-xs">
            {(['all', 'active', 'revoked'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === mode
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Device History Table */}
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080E1C]/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Owner & Shop</th>
                <th className="py-3 px-4">Device Identification</th>
                <th className="py-3 px-4">Client Specs</th>
                <th className="py-3 px-4">First Registered</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Total Sessions</th>
                <th className="py-3 px-4">Status & Reason</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No registered devices found.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => {
                  const isRevoked = d.device_status === 'revoked';

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Owner & Shop */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">{d.owner_email}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {d.owner_name} &bull; <span className="text-blue-400">{d.shop_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                          UID: {d.user_uid}
                        </div>
                      </td>

                      {/* Device Identification */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(d.device_type)}
                          <span className="font-medium text-slate-200 truncate max-w-[150px]">
                            {d.device_name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[160px]">
                          ID: {d.device_id}
                        </div>
                      </td>

                      {/* Client Specs */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{d.browser}</div>
                        <div className="text-[11px] text-slate-500">{d.operating_system}</div>
                      </td>

                      {/* First Registered */}
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{new Date(d.first_seen_at).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(d.first_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{new Date(d.last_seen_at).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(d.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Total Sessions */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold border border-slate-700">
                          {d.total_sessions || 1}
                        </span>
                      </td>

                      {/* Status & Reason */}
                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                              <Ban className="w-3 h-3" />
                              Revoked
                            </span>
                            {d.revocation_reason && (
                              <div className="text-[10px] text-rose-400/80 mt-1 max-w-[180px] truncate" title={d.revocation_reason}>
                                {d.revocation_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Authorized
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isRevoked && (
                            <button
                              onClick={() => setSingleRevokeDevice(d)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium cursor-pointer"
                              title="Revoke this device"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUserForBulkRevoke({ uid: d.user_uid, email: d.owner_email })}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium cursor-pointer"
                            title="Revoke all devices for this user"
                          >
                            Revoke All
                          </button>
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

      {/* Single Revoke Modal */}
      {singleRevokeDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <h3 className="font-bold text-white text-base mb-2">Revoke Hardware Device</h3>
            <p className="text-slate-300 text-xs mb-4">
              Revoking <strong className="text-white">{singleRevokeDevice.device_name}</strong> will terminate all active sessions for this device and permanently block access until authorized.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Revocation</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSingleRevokeDevice(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
              <button
                onClick={handleSingleRevoke}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl font-medium"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Revoke Modal */}
      {selectedUserForBulkRevoke && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <h3 className="font-bold text-white text-base mb-2">Bulk Revoke All Devices</h3>
            <p className="text-slate-300 text-xs mb-4">
              Revoking all devices for customer <strong className="text-white">{selectedUserForBulkRevoke.email}</strong> will terminate all active and inactive sessions across every hardware unit paired to this account.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Bulk Revocation</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedUserForBulkRevoke(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
              <button
                onClick={handleBulkRevoke}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl font-medium"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Bulk Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
