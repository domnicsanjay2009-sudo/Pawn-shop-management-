import React, { useState } from 'react';
import {
  Radio,
  Search,
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  Ban,
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import { AdminSession, revokeDevice } from '../services/adminDataService';
import { ConfirmationModal } from './ConfirmationModal';

interface LiveDeviceMonitorProps {
  sessions: AdminSession[];
}

export const LiveDeviceMonitor: React.FC<LiveDeviceMonitorProps> = ({ sessions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'revoked' | 'expired'>('all');
  const [sessionToRevoke, setSessionToRevoke] = useState<AdminSession | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const now = Date.now();

  const filteredSessions = sessions.filter((s) => {
    const diffSec = Math.floor((now - s.last_heartbeat_at) / 1000);
    const isOnline = diffSec <= 90 && s.session_status === 'online';
    const isExpired = s.session_status === 'expired' || (now > s.expires_at);

    if (statusFilter === 'online' && !isOnline) return false;
    if (statusFilter === 'offline' && (isOnline || s.session_status === 'revoked' || isExpired)) return false;
    if (statusFilter === 'revoked' && s.session_status !== 'revoked') return false;
    if (statusFilter === 'expired' && !isExpired) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.email_snapshot.toLowerCase().includes(q) ||
      s.user_uid.toLowerCase().includes(q) ||
      s.owner_name.toLowerCase().includes(q) ||
      s.shop_name.toLowerCase().includes(q) ||
      s.device_id.toLowerCase().includes(q) ||
      s.device_name.toLowerCase().includes(q) ||
      s.browser.toLowerCase().includes(q) ||
      s.operating_system.toLowerCase().includes(q) ||
      (s.ip_info && s.ip_info.toLowerCase().includes(q))
    );
  });

  const handleRevokeConfirm = async (reason: string) => {
    if (!sessionToRevoke) return;

    const ok = await revokeDevice(
      sessionToRevoke.device_id,
      sessionToRevoke.user_uid,
      sessionToRevoke.email_snapshot,
      reason || 'Device session revoked by administrator'
    );

    if (ok) {
      setActionSuccess(`Session for device "${sessionToRevoke.device_name}" successfully revoked.`);
      setSessionToRevoke(null);
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      alert('Failed to revoke device session. Please check permissions and retry.');
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-4 h-4 text-cyan-400" />;
    if (type === 'Tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            Live Device Monitor
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time device heartbeat telemetry, active customer presences, and administrative session kill-switch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#0B1528] border border-slate-800 text-xs text-slate-300">
            Total Monitored Sessions: <span className="font-bold text-white">{sessions.length}</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer email, owner name, shop name, device ID, OS, browser, or IP..."
            className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex rounded-xl bg-[#080E1C] border border-slate-800 p-0.5 text-xs">
            {(['all', 'online', 'offline', 'revoked', 'expired'] as const).map((mode) => (
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

      {/* Real-Time Table with All Required Columns */}
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                <th className="py-3 px-3">User Email</th>
                <th className="py-3 px-3">Owner Name</th>
                <th className="py-3 px-3">Shop Name</th>
                <th className="py-3 px-3">Device ID</th>
                <th className="py-3 px-3">Device Name</th>
                <th className="py-3 px-3">Device Type</th>
                <th className="py-3 px-3">Browser</th>
                <th className="py-3 px-3">Operating System</th>
                <th className="py-3 px-3">Login Time</th>
                <th className="py-3 px-3">Last Heartbeat</th>
                <th className="py-3 px-3">Current Session Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    No active sessions found matching the search or status filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const diffSec = Math.floor((now - s.last_heartbeat_at) / 1000);
                  const isOnline = diffSec <= 90 && s.session_status === 'online';
                  const isRevoked = s.session_status === 'revoked';
                  const isExpired = s.session_status === 'expired' || (now > s.expires_at);

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      OFFLINE ({diffSec > 3600 ? `${Math.floor(diffSec / 3600)}h ago` : `${Math.floor(diffSec / 60)}m ago`})
                    </span>
                  );

                  if (isRevoked) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                        <Ban className="w-3 h-3" />
                        REVOKED
                      </span>
                    );
                  } else if (isExpired) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                        <Clock className="w-3 h-3" />
                        EXPIRED
                      </span>
                    );
                  } else if (isOnline) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ONLINE ({diffSec}s ago)
                      </span>
                    );
                  }

                  return (
                    <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                      {/* 1. User Email */}
                      <td className="py-3 px-3 font-semibold text-white font-mono">
                        {s.email_snapshot}
                      </td>

                      {/* 2. Owner Name */}
                      <td className="py-3 px-3 text-slate-300">
                        {s.owner_name}
                      </td>

                      {/* 3. Shop Name */}
                      <td className="py-3 px-3 font-medium text-blue-400">
                        {s.shop_name}
                      </td>

                      {/* 4. Device ID */}
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400 max-w-[120px] truncate" title={s.device_id}>
                        {s.device_id}
                      </td>

                      {/* 5. Device Name */}
                      <td className="py-3 px-3 text-slate-200">
                        {s.device_name}
                      </td>

                      {/* 6. Device Type */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 capitalize text-slate-300">
                          {getDeviceIcon(s.device_type)}
                          <span>{s.device_type}</span>
                        </div>
                      </td>

                      {/* 7. Browser */}
                      <td className="py-3 px-3 text-slate-300">
                        {s.browser}
                      </td>

                      {/* 8. Operating System */}
                      <td className="py-3 px-3 text-slate-300">
                        {s.operating_system}
                      </td>

                      {/* 9. Login Time */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                        <div>{new Date(s.login_at).toLocaleDateString()}</div>
                        <div className="text-slate-500">
                          {new Date(s.login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* 10. Last Heartbeat */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                        <div>{new Date(s.last_heartbeat_at).toLocaleDateString()}</div>
                        <div className="text-slate-500">
                          {new Date(s.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* 11. Current Session Status */}
                      <td className="py-3 px-3">
                        {statusBadge}
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3 text-right">
                        {isRevoked ? (
                          <span className="text-[10px] text-rose-500 font-medium">Session Terminated</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSessionToRevoke(s)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Terminate active session immediately"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Revoke Device</span>
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

      {/* Confirmation Modal for Session Revocation */}
      {sessionToRevoke && (
        <ConfirmationModal
          isOpen={!!sessionToRevoke}
          actionType="revoke_device"
          title="Revoke Device Session (Immediate Force Logout)"
          targetEmail={sessionToRevoke.email_snapshot}
          targetDetails={`Device: ${sessionToRevoke.device_name} | ID: ${sessionToRevoke.device_id}`}
          consequences="Revoking this device will immediately signal the customer browser to terminate the session, log the user out, and invalidate the session token."
          confirmLabel="Execute Session Revoke"
          confirmVariant="danger"
          requiresReason={true}
          reasonPlaceholder="Reason for session revocation (e.g., Security policy violation, unauthorized device)"
          onConfirm={handleRevokeConfirm}
          onClose={() => setSessionToRevoke(null)}
        />
      )}
    </div>
  );
};
