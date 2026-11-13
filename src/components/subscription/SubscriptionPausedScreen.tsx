import React, { useState } from 'react';
import {
  PauseCircle,
  Mail,
  Phone,
  MessageSquare,
  LogOut,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChatContainer } from '../chat/ChatContainer';

interface SubscriptionPausedScreenProps {
  reason?: string;
  onOpenChat?: () => void;
}

export const SubscriptionPausedScreen: React.FC<SubscriptionPausedScreenProps> = ({ reason }) => {
  const { logout, shopProfile } = useAuth();
  const [showChatModal, setShowChatModal] = useState(false);

  const displayReason =
    reason ||
    shopProfile?.disabledReason ||
    shopProfile?.suspensionReason ||
    'Your subscription access has been temporarily paused by the Global Administrator.';

  return (
    <div className="min-h-screen bg-[#080E1C] flex flex-col items-center justify-center p-4 sm:p-6 text-white relative">
      <div className="max-w-md w-full bg-[#0B1528] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6 animate-scale-up">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <PauseCircle className="w-9 h-9 text-amber-400 animate-pulse" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Your Subscription is Paused by Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {displayReason}
          </p>
        </div>

        {/* Official Administrator Contact Card */}
        <div className="bg-[#080E1C] border border-slate-800 rounded-2xl p-4 text-left space-y-3">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
            Direct Administrator Support
          </span>

          <div className="flex items-center gap-3 text-xs text-slate-200">
            <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <a
              href="mailto:dominicsanjay2009@gmail.com"
              className="font-mono hover:text-amber-300 transition-colors truncate"
            >
              dominicsanjay2009@gmail.com
            </a>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-200">
            <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <a
              href="tel:+919363200295"
              className="font-mono hover:text-amber-300 transition-colors"
            >
              +91 9363200295
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with Customer Care Now</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Once the administrator unpauses your account, your access to the pawn shop system will restore automatically in real time.
        </p>
      </div>

      {/* Support Chat Overlay Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-scale-up">
            <div className="p-3 bg-brand-950 text-white flex items-center justify-between border-b border-brand-900">
              <span className="font-bold text-xs">Customer Care & Support</span>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatContainer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
