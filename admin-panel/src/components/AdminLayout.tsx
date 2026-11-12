import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Radio,
  History,
  Users,
  UserCheck,
  CreditCard,
  ListCollapse,
  MessageSquare,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Server
} from 'lucide-react';
import { AdminUser, logoutAdmin } from '../services/adminAuthService';

export type AdminTab =
  | 'dashboard'
  | 'live-devices'
  | 'device-history'
  | 'users'
  | 'approvals'
  | 'subscriptions'
  | 'activity'
  | 'support'
  | 'audit';

interface AdminLayoutProps {
  currentAdmin: AdminUser;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingCount?: number;
  onlineCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentAdmin,
  activeTab,
  onTabChange,
  pendingCount = 0,
  onlineCount = 0,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4 text-blue-400" /> },
    {
      id: 'activity',
      label: 'LOGIN ACTIVITY',
      icon: <ListCollapse className="w-4 h-4 text-cyan-400" />,
      badge: 'Real-time',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'live-devices',
      label: 'Live Device Monitor',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      badge: onlineCount > 0 ? `${onlineCount} Live` : undefined,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    { id: 'device-history', label: 'Device History', icon: <History className="w-4 h-4" /> },
    {
      id: 'approvals',
      label: 'Pending Registrations',
      icon: <UserCheck className="w-4 h-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    { id: 'subscriptions', label: 'Subscription Entitlements', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'support', label: 'Support Desk Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'audit', label: 'Security & Audit Logs', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col antialiased">
      {/* Top Header Bar */}
      <header className="h-16 bg-[#0B1528] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">PAWN SHOP</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Companion Control Center</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Real-time Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300">Live Server Sync</span>
            <span className="text-slate-500 font-mono text-[11px] border-l border-slate-700 pl-2 ml-1">{timeStr}</span>
          </div>

          {/* Admin User Info */}
          <div className="flex items-center gap-3 pl-2 sm:border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-white">{currentAdmin.displayName || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{currentAdmin.email}</p>
            </div>
            <button
              onClick={() => logoutAdmin()}
              title="Logout Administrator"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-16 left-0 z-30 w-64 bg-[#0B1528] border-r border-slate-800/80 p-4 transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Management & Monitoring
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#080E1C] border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Environment</span>
              <span className="font-semibold text-emerald-400 text-[11px]">Production</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Firebase Plan</span>
              <span className="font-semibold text-slate-300 text-[11px]">Spark (Free)</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
