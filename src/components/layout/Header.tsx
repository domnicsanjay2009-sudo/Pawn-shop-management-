import React from 'react';
import { Menu, Sparkles, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { useAppLock } from '../../context/AppLockContext';
import { useAuth } from '../../context/AuthContext';
import { ShopLogoBadge } from '../common/ShopLogoBadge';

interface HeaderProps {
  title: string;
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenMobileSidebar }) => {
  const { isDemoMode, enterDemoMode, exitDemoMode } = useDemo();
  const { manualLock, config } = useAppLock();
  const { shopProfile } = useAuth();

  const handleDemoToggle = () => {
    if (isDemoMode) {
      if (window.confirm('Exit Demo Mode? All temporary sample records will be completely erased.')) {
        exitDemoMode();
      }
    } else {
      enterDemoMode();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-brand-950 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        {shopProfile?.logoUrl && (
          <ShopLogoBadge
            logoUrl={shopProfile.logoUrl}
            shopName={shopProfile.shopName}
            sizeClass="w-8 h-8"
            iconClass="w-4 h-4 text-white"
            roundedClass="rounded-lg"
          />
        )}
        <h2 className="text-xl font-bold text-brand-950 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center space-x-3">
        {/* Manual Lock Shortcut if Lock is Configured */}
        {config.type !== 'none' && (
          <button
            onClick={manualLock}
            title="Lock Application Now"
            className="p-2 text-slate-500 hover:text-brand-950 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* Demo Mode Button at top-right as specified */}
        <button
          onClick={handleDemoToggle}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isDemoMode
              ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 shadow-sm animate-pulse'
              : 'bg-slate-100 text-slate-700 hover:bg-accent-50 hover:text-accent-600 border border-slate-200'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>{isDemoMode ? 'Demo Mode Active (In-Memory)' : 'Demo Mode'}</span>
        </button>
      </div>
    </header>
  );
};
