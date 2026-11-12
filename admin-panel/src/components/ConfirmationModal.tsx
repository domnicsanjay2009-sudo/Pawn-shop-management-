import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
  X,
  Sparkles,
  Ban,
  PowerOff,
  RefreshCw
} from 'lucide-react';

export type ActionCategory =
  | 'approve_premium'
  | 'disable'
  | 'reactivate'
  | 'block'
  | 'unblock'
  | 'grant_premium'
  | 'revoke_premium'
  | 'extend_subscription'
  | 'revoke_device'
  | 'bulk_revoke_devices';

interface ConfirmationModalProps {
  isOpen: boolean;
  actionType: ActionCategory;
  title?: string;
  targetEmail: string;
  targetDetails?: string;
  consequences: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary' | 'success';
  requiresReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason: string, extraData?: any) => Promise<boolean | void>;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  actionType,
  title,
  targetEmail,
  targetDetails,
  consequences,
  confirmLabel,
  confirmVariant = 'primary',
  requiresReason = false,
  reasonPlaceholder = 'Enter administrative reason...',
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (requiresReason && !reason.trim()) {
      setError('Please provide an administrative reason for this action.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await onConfirm(reason.trim());
      setLoading(false);
      if (res !== false) {
        onClose();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'The administrative operation failed. Please retry.');
    }
  };

  const getHeaderIcon = () => {
    switch (actionType) {
      case 'approve_premium':
      case 'grant_premium':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
        );
      case 'disable':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <PowerOff className="w-6 h-6 text-amber-400" />
          </div>
        );
      case 'block':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
            <Ban className="w-6 h-6 text-rose-400" />
          </div>
        );
      case 'reactivate':
      case 'unblock':
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <RefreshCw className="w-6 h-6 text-blue-400" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <ShieldAlert className="w-6 h-6 text-blue-400" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20';
      default:
        return 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-5">
          {getHeaderIcon()}
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {title || 'Confirm Administrative Action'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target User: <strong className="text-blue-400">{targetEmail}</strong>
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Consequences Box */}
        <div className="p-4 rounded-xl bg-[#080E1C] border border-slate-800/80 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Important System Consequences</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pl-6">
            {consequences}
          </p>
          {targetDetails && (
            <p className="text-[11px] text-slate-500 mt-2 pl-6 font-mono">
              {targetDetails}
            </p>
          )}
        </div>

        {/* Administrative Reason Input */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Administrative Reason {requiresReason ? <span className="text-rose-400">*</span> : <span className="text-slate-500 font-normal">(Optional)</span>}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder={reasonPlaceholder}
            className="w-full px-3.5 py-2.5 bg-[#050811] border border-slate-800 rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${getConfirmButtonClasses()}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Authorization...</span>
              </>
            ) : (
              <span>{confirmLabel || 'Confirm Action'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
