import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { AuditLog } from '../services/adminDataService';

interface AdminAuditLogsViewProps {
  logs: AuditLog[];
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.audit_id.toLowerCase().includes(q) ||
      log.admin_email.toLowerCase().includes(q) ||
      (log.target_user_email && log.target_user_email.toLowerCase().includes(q)) ||
      (log.target_user_uid && log.target_user_uid.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      log.target_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            Security & Administrative Audit Logs
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Immutable system record of administrator approvals, device revocations, account suspensions, blocks, and manual entitlements.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#0B1528] border border-slate-800 text-xs text-slate-300">
          Total Recorded Actions: <span className="font-bold text-white">{logs.length}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0B1528] border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by administrator, target email, UID, action, or reason..."
            className="w-full pl-10 pr-4 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-[#080E1C] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="APPROVE_USER_PREMIUM">APPROVE_USER_PREMIUM</option>
            <option value="DISABLE_USER">DISABLE_USER</option>
            <option value="BLOCK_USER">BLOCK_USER</option>
            <option value="REACTIVATE_USER">REACTIVATE_USER</option>
            <option value="UNBLOCK_USER">UNBLOCK_USER</option>
            <option value="GRANT_PREMIUM">GRANT_PREMIUM</option>
            <option value="REVOKE_PREMIUM">REVOKE_PREMIUM</option>
            <option value="EXTEND_SUBSCRIPTION">EXTEND_SUBSCRIPTION</option>
            <option value="REVOKE_DEVICE">REVOKE_DEVICE</option>
            <option value="REVOKE_ALL_DEVICES">REVOKE_ALL_DEVICES</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table with All Required Fields */}
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080E1C]/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                <th className="py-3 px-3">Audit Log ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Administrator</th>
                <th className="py-3 px-3">Action Type</th>
                <th className="py-3 px-3">Target User</th>
                <th className="py-3 px-3">Status Transition</th>
                <th className="py-3 px-3">Subscription Transition</th>
                <th className="py-3 px-3">Administrative Reason</th>
                <th className="py-3 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No administrative audit records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                    {/* 1. Audit Log ID */}
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-400 max-w-[110px] truncate" title={log.audit_id}>
                      {log.audit_id}
                    </td>

                    {/* 2. Timestamp */}
                    <td className="py-3 px-3 text-slate-300 font-mono text-[10px]">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* 3. Administrator UID & Email */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{log.admin_email}</div>
                      <div className="text-[10px] text-slate-500 font-mono max-w-[120px] truncate" title={log.admin_uid}>
                        {log.admin_uid}
                      </div>
                    </td>

                    {/* 4. Action Type */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>

                    {/* 5. Target User UID & Email */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{log.target_user_email || log.target_id}</div>
                      {log.target_user_uid && (
                        <div className="text-[10px] text-slate-500 font-mono max-w-[120px] truncate" title={log.target_user_uid}>
                          UID: {log.target_user_uid}
                        </div>
                      )}
                    </td>

                    {/* 6. Status Transition */}
                    <td className="py-3 px-3">
                      {log.previous_status || log.new_status ? (
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="text-slate-400">{log.previous_status || 'N/A'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-bold text-white">{log.new_status || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* 7. Subscription Transition */}
                    <td className="py-3 px-3">
                      {log.previous_subscription || log.new_subscription ? (
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="text-slate-400 truncate max-w-[100px]">{log.previous_subscription || 'N/A'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="font-bold text-purple-300 truncate max-w-[120px]">{log.new_subscription || 'N/A'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* 8. Administrative Reason */}
                    <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate" title={log.reason}>
                      {log.reason || 'None provided'}
                    </td>

                    {/* 9. Operation Result */}
                    <td className="py-3 px-3 text-right">
                      {log.operation_result === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          FAILURE
                        </span>
                      )}
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
