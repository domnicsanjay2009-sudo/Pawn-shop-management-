import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Smartphone,
  CheckCircle2,
  Radio,
  PowerOff,
  Ban,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AdminStats, ActivityLog, AdminSession } from '../services/adminDataService';
import { AdminTab } from './AdminLayout';

interface AdminDashboardProps {
  stats: AdminStats;
  recentLogs: ActivityLog[];
  liveSessions: AdminSession[];
  onNavigate: (tab: AdminTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  recentLogs,
  liveSessions,
  onNavigate
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#0F1E3A] to-[#0B1528] border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            System Operations Dashboard
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Live Real-Time
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time device monitoring, customer heartbeats, and administrative controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('live-devices')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-300" />
            <span>Open Device Monitor</span>
          </button>
          {stats.pendingUsers > 0 && (
            <button
              onClick={() => onNavigate('approvals')}
              className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Review {stats.pendingUsers} Pending</span>
            </button>
          )}
        </div>
      </div>

      {/* User Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">User Account Metrics</h3>
          <button
            onClick={() => onNavigate('users')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total Registered Users */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Total Users</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight">{stats.totalUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Platform accounts</p>
          </div>

          {/* Approved Users */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Approved</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">{stats.approvedUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Active business licenses</p>
          </div>

          {/* Pending Users */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Pending</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 tracking-tight">{stats.pendingUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting approval</p>
          </div>

          {/* Disabled Users */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Disabled</span>
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                <UserX className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-orange-400 tracking-tight">{stats.disabledUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Temporarily restricted</p>
          </div>

          {/* Blocked Users */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Blocked</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Ban className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-400 tracking-tight">{stats.blockedUsers}</div>
            <p className="text-[11px] text-slate-500 mt-1">Permanently restricted</p>
          </div>
        </div>
      </div>

      {/* Device & Session Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Device & Hardware Telemetry</h3>
          <button
            onClick={() => onNavigate('live-devices')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>Live Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Total Registered Devices */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Registered</span>
              <Smartphone className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalDevices}</div>
            <span className="text-[11px] text-slate-500">Ever paired</span>
          </div>

          {/* Currently Active Devices */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeDevices}</div>
            <span className="text-[11px] text-slate-500">Authorized devices</span>
          </div>

          {/* Currently Online Users */}
          <div className="bg-[#0B1528] border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online Now
              </span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.currentlyOnlineUsers}</div>
            <span className="text-[11px] text-emerald-500/80">Heartbeat &lt; 90s</span>
          </div>

          {/* Inactive Devices */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Inactive</span>
              <PowerOff className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-300">{stats.inactiveDevices}</div>
            <span className="text-[11px] text-slate-500">Idle / Disconnected</span>
          </div>

          {/* Revoked Devices */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Revoked</span>
              <Ban className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.revokedDevices}</div>
            <span className="text-[11px] text-slate-500">Admin killed</span>
          </div>
        </div>
      </div>

      {/* Grid: Live Sessions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Active Sessions Card */}
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Real-Time Active Sessions</h3>
            </div>
            <button
              onClick={() => onNavigate('live-devices')}
              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
            >
              View All ({liveSessions.length})
            </button>
          </div>

          {liveSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <PowerOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active sessions detected at this moment.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {liveSessions.slice(0, 5).map((sess) => {
                const diffSec = Math.floor((Date.now() - sess.last_heartbeat_at) / 1000);
                const isOnline = diffSec <= 90 && sess.session_status === 'online';

                return (
                  <div
                    key={sess.session_id}
                    className="p-3 rounded-xl bg-[#080E1C] border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-semibold text-white truncate">{sess.email_snapshot}</span>
                        <span className="text-slate-500 text-[10px]">({sess.shop_name || 'Shop'})</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 truncate">
                        {sess.device_name} &bull; {sess.browser} &bull; {sess.operating_system}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isOnline ? `${diffSec}s ago` : 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Login & Security Activity */}
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm">Recent Login & Device Activity</h3>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
            >
              Full Ledger ({recentLogs.length})
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activity records logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {recentLogs.slice(0, 5).map((log) => {
                let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                if (log.event_type === 'device_revoked') badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                if (log.event_type === 'logout') badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#080E1C] border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${badgeClass}`}>
                          {log.event_type}
                        </span>
                        <span className="font-medium text-white truncate">{log.email}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 truncate font-mono">
                        Device: {log.device_id.substring(0, 16)}...
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 text-[11px] text-slate-500">
                      {new Date(log.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
