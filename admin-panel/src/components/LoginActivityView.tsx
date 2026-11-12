import React, { useState, useMemo } from 'react';
import {
  ListCollapse,
  Search,
  Filter,
  Activity,
  LogIn,
  LogOut,
  Ban,
  Clock,
  Radio,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldAlert,
  Calendar,
  X
} from 'lucide-react';
import { ActivityLog, LoginResultType } from '../services/adminDataService';

interface LoginActivityViewProps {
  logs: ActivityLog[];
}

export const LoginActivityView: React.FC<LoginActivityViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [onlyActiveSessions, setOnlyActiveSessions] = useState(false);

  // Drilldown modal for an individual user's login history
  const [selectedUserEmailForHistory, setSelectedUserEmailForHistory] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // User drilldown filter
      if (selectedUserEmailForHistory && log.email !== selectedUserEmailForHistory) {
        return false;
      }

      // Active sessions filter
      if (onlyActiveSessions && log.session_status !== 'online') {
        return false;
      }

      // Result filter
      if (resultFilter !== 'all' && log.login_result !== resultFilter) {
        return false;
      }

      // Device type filter
      if (deviceTypeFilter !== 'all') {
        const dType = (log.device_type || '').toLowerCase();
        if (dType !== deviceTypeFilter.toLowerCase()) return false;
      }

      // Session status filter
      if (sessionStatusFilter !== 'all' && log.session_status !== sessionStatusFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter === 'today' && now - log.event_timestamp > oneDayMs) {
        return false;
      }
      if (dateRangeFilter === '7days' && now - log.event_timestamp > 7 * oneDayMs) {
        return false;
      }
      if (dateRangeFilter === '30days' && now - log.event_timestamp > 30 * oneDayMs) {
        return false;
      }

      // Search term: email or UID or device ID
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        log.email.toLowerCase().includes(q) ||
        log.user_uid.toLowerCase().includes(q) ||
        log.device_id.toLowerCase().includes(q) ||
        (log.owner_name && log.owner_name.toLowerCase().includes(q)) ||
        (log.shop_name && log.shop_name.toLowerCase().includes(q)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(q))
      );
    });
  }, [
    logs,
    selectedUserEmailForHistory,
    onlyActiveSessions,
    resultFilter,
    deviceTypeFilter,
    sessionStatusFilter,
    dateRangeFilter,
    searchTerm,
    now
  ]);

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const getResultBadge = (result: LoginResultType) => {
    switch (result) {
      case 'Successful Login':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Successful Login
          </span>
        );
      case 'Failed Login':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
            <XCircle className="w-3 h-3 text-rose-400" />
            Failed Login
          </span>
        );
      case 'Session Revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <Ban className="w-3 h-3 text-amber-400" />
            Session Revoked
          </span>
        );
      case 'Session Expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
            <Clock className="w-3 h-3 text-slate-400" />
            Session Expired
          </span>
        );
      case 'Administrator Terminated Session':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Admin Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
            {result}
          </span>
        );
    }
  };

  const getDeviceIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
    if (t === 'tablet') return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
    return <Monitor className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ListCollapse className="w-5 h-5 text-blue-400" />
            LOGIN ACTIVITY
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Complete real-time historical ledger of every customer login attempt, session heartbeat, and revocation event.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedUserEmailForHistory && (
            <button
              onClick={() => setSelectedUserEmailForHistory(null)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <span>User: {selectedUserEmailForHistory}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-[#0B1528] border border-slate-800 text-xs text-slate-300">
            Total Activity Records: <span className="font-bold text-white">{logs.length}</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800 space-y-3">
        {/* Top search & Active Toggle */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by customer email address, User UID, or device ID..."
              className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setOnlyActiveSessions(!onlyActiveSessions);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer ${
              onlyActiveSessions
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-[#080E1C] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${onlyActiveSessions ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Currently Active Sessions Only</span>
          </button>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 1. Date Range */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Date Range</label>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#080E1C] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="all">All Time</option>
              <option value="today">Today (Past 24h)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* 2. Login Result */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Login Result</label>
            <select
              value={resultFilter}
              onChange={(e) => {
                setResultFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#080E1C] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="all">All Results</option>
              <option value="Successful Login">Successful Login</option>
              <option value="Failed Login">Failed Login</option>
              <option value="Session Revoked">Session Revoked</option>
              <option value="Session Expired">Session Expired</option>
              <option value="Administrator Terminated Session">Admin Terminated</option>
            </select>
          </div>

          {/* 3. Device Type */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Device Form Factor</label>
            <select
              value={deviceTypeFilter}
              onChange={(e) => {
                setDeviceTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#080E1C] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="all">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>

          {/* 4. Session Status */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Session Status</label>
            <select
              value={sessionStatusFilter}
              onChange={(e) => {
                setSessionStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#080E1C] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Professional Login Activity Table with 15 Required Columns */}
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                <th className="py-3 px-3">1. User Email</th>
                <th className="py-3 px-3">2. Owner Name</th>
                <th className="py-3 px-3">3. Shop Name</th>
                <th className="py-3 px-3">4. User UID</th>
                <th className="py-3 px-3">5. Device ID</th>
                <th className="py-3 px-3">6. Device Name</th>
                <th className="py-3 px-3">7. Type</th>
                <th className="py-3 px-3">8. OS</th>
                <th className="py-3 px-3">9. Browser</th>
                <th className="py-3 px-3">10. IP Address</th>
                <th className="py-3 px-3">11. Login Date</th>
                <th className="py-3 px-3">12. Login Time</th>
                <th className="py-3 px-3">13. Last Active</th>
                <th className="py-3 px-3">14. Session Status</th>
                <th className="py-3 px-3">15. Login Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    No login activity logs found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const logDate = new Date(log.event_timestamp);
                  const lastActiveDate = new Date(log.last_active_at || log.event_timestamp);

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                      {/* 1. User Email Address */}
                      <td className="py-3 px-3 font-semibold text-white">
                        <button
                          type="button"
                          onClick={() => setSelectedUserEmailForHistory(log.email)}
                          title="Click to view complete history for this user"
                          className="hover:text-blue-400 underline decoration-slate-700 hover:decoration-blue-400 cursor-pointer text-left"
                        >
                          {log.email}
                        </button>
                      </td>

                      {/* 2. Owner Name */}
                      <td className="py-3 px-3 text-slate-300">
                        {log.owner_name || 'N/A'}
                      </td>

                      {/* 3. Shop Name */}
                      <td className="py-3 px-3 text-blue-400 font-medium">
                        {log.shop_name || 'Shop'}
                      </td>

                      {/* 4. User UID */}
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={log.user_uid}>
                        {log.user_uid}
                      </td>

                      {/* 5. Device ID */}
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400 max-w-[120px] truncate" title={log.device_id}>
                        {log.device_id}
                      </td>

                      {/* 6. Device Name */}
                      <td className="py-3 px-3 text-slate-200">
                        {log.device_name || 'Generic Device'}
                      </td>

                      {/* 7. Device Type */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 capitalize text-slate-300">
                          {getDeviceIcon(log.device_type)}
                          <span>{log.device_type || 'Desktop'}</span>
                        </div>
                      </td>

                      {/* 8. Operating System */}
                      <td className="py-3 px-3 text-slate-300">
                        {log.operating_system || 'N/A'}
                      </td>

                      {/* 9. Browser */}
                      <td className="py-3 px-3 text-slate-300">
                        {log.browser || 'N/A'}
                      </td>

                      {/* 10. IP Address */}
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* 11. Login Date */}
                      <td className="py-3 px-3 text-slate-300">
                        {logDate.toLocaleDateString()}
                      </td>

                      {/* 12. Login Time */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                        {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* 13. Last Active Time */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                        {lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* 14. Session Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          log.session_status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : log.session_status === 'revoked'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {log.session_status || 'offline'}
                        </span>
                      </td>

                      {/* 15. Login Result */}
                      <td className="py-3 px-3">
                        {getResultBadge(log.login_result)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080E1C]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {paginatedLogs.length} of {totalItems} log entries</span>
            <span>&bull;</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#050811] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-[#050811] border border-slate-800 disabled:opacity-40 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-[#050811] border border-slate-800 disabled:opacity-40 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
