import React from 'react';
import {
  Home,
  CreditCard,
  History,
  MessageSquare,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShopLogoBadge } from '../common/ShopLogoBadge';

export type NavigationTab =
  | 'home'
  | 'parties'
  | 'subscription'
  | 'subscription-history'
  | 'chat'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { shopProfile, logout } = useAuth();

  const ownerName = shopProfile?.ownerName || 'Owner';

  const menuItems: { id: NavigationTab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'subscription-history', label: 'Subscription History', icon: History },
    { id: 'chat', label: 'Chat Box', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to securely log out?')) {
      await logout();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-brand-950/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container: 25-30% width on tablet/desktop */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 md:w-[26%] max-w-xs bg-brand-950 text-white flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div>
          {/* Logo & App Branding */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <ShopLogoBadge
                logoUrl={shopProfile?.logoUrl}
                shopName={shopProfile?.shopName}
                sizeClass="w-10 h-10"
                iconClass="w-6 h-6 text-white"
              />
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate">
                  {shopProfile?.shopName || (
                    <>
                      Pawn Shop <span className="text-accent-400 font-light">Management</span>
                    </>
                  )}
                </h1>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  Pawn Shop Management
                </p>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Specified Header: "Hi [Owner Name]" */}
          <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/60">
            <p className="text-xs uppercase tracking-wider font-semibold text-accent-400">
              Logged In Owner
            </p>
            <h3 className="text-lg font-bold text-white mt-0.5 truncate">
              Hi {ownerName}
            </h3>
            {shopProfile?.shopName && (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {shopProfile.shopName}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-accent-600 text-white shadow-md shadow-accent-600/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
