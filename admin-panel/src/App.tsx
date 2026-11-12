import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AdminUser,
  onAdminAuthStateChanged
} from './services/adminAuthService';
import {
  AdminStats,
  AdminSession,
  AdminDevice,
  UserSummary,
  ActivityLog,
  AuditLog,
  SubscriptionItem,
  PaymentTxItem,
  subscribeToDashboardStats,
  subscribeToActiveSessions,
  subscribeToAllDevices,
  subscribeToUsersAndShops,
  subscribeToActivityLogs,
  subscribeToAuditLogs,
  subscribeToSubscriptionsAndPayments
} from './services/adminDataService';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { AdminLayout, AdminTab } from './components/AdminLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { LiveDeviceMonitor } from './components/LiveDeviceMonitor';
import { DeviceHistoryView } from './components/DeviceHistoryView';
import { UserManagementView } from './components/UserManagementView';
import { RegistrationApprovalsView } from './components/RegistrationApprovalsView';
import { SubscriptionManagementView } from './components/SubscriptionManagementView';
import { LoginActivityView } from './components/LoginActivityView';
import { AdminSupportChatView } from './components/AdminSupportChatView';
import { AdminAuditLogsView } from './components/AdminAuditLogsView';

export const App: React.FC = () => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Real-time Datasets
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    disabledUsers: 0,
    blockedUsers: 0,
    suspendedUsers: 0,
    totalDevices: 0,
    activeDevices: 0,
    currentlyOnlineUsers: 0,
    inactiveDevices: 0,
    revokedDevices: 0,
  });
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [subData, setSubData] = useState<{ subscriptions: SubscriptionItem[]; transactions: PaymentTxItem[] }>({
    subscriptions: [],
    transactions: [],
  });

  // Listen for admin authentication state
  useEffect(() => {
    const unsub = onAdminAuthStateChanged((user, loading) => {
      setAdminUser(user);
      setAuthLoading(loading);
    });
    return () => unsub();
  }, []);

  // Listen to real-time collections when authenticated
  useEffect(() => {
    if (!adminUser) return;

    const unsubStats = subscribeToDashboardStats(setStats);
    const unsubSessions = subscribeToActiveSessions(setSessions);
    const unsubDevices = subscribeToAllDevices(setDevices);
    const unsubUsers = subscribeToUsersAndShops(setUsers);
    const unsubActivity = subscribeToActivityLogs(setActivityLogs);
    const unsubAudit = subscribeToAuditLogs(setAuditLogs);
    const unsubSubs = subscribeToSubscriptionsAndPayments(setSubData);

    return () => {
      unsubStats();
      unsubSessions();
      unsubDevices();
      unsubUsers();
      unsubActivity();
      unsubAudit();
      unsubSubs();
    };
  }, [adminUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-medium tracking-wide">Validating Administrator Privileges...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLoginScreen onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  return (
    <AdminLayout
      currentAdmin={adminUser}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={stats.pendingUsers}
      onlineCount={stats.currentlyOnlineUsers}
    >
      {activeTab === 'dashboard' && (
        <AdminDashboard
          stats={stats}
          recentLogs={activityLogs}
          liveSessions={sessions}
          onNavigate={setActiveTab}
        />
      )}

      {activeTab === 'live-devices' && (
        <LiveDeviceMonitor sessions={sessions} />
      )}

      {activeTab === 'device-history' && (
        <DeviceHistoryView devices={devices} />
      )}

      {activeTab === 'users' && (
        <UserManagementView users={users} />
      )}

      {activeTab === 'approvals' && (
        <RegistrationApprovalsView users={users} />
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionManagementView
          subscriptions={subData.subscriptions}
          transactions={subData.transactions}
        />
      )}

      {activeTab === 'activity' && (
        <LoginActivityView logs={activityLogs} />
      )}

      {activeTab === 'support' && (
        <AdminSupportChatView />
      )}

      {activeTab === 'audit' && (
        <AdminAuditLogsView logs={auditLogs} />
      )}
    </AdminLayout>
  );
};
