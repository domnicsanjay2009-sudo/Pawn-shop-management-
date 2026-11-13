import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import {
  loginAdmin,
  sendAdminPasswordReset,
  verifyAdminPasswordResetCode,
  confirmAdminPasswordResetAndLogin,
  ENFORCED_ADMIN_EMAIL
} from '../services/adminAuthService';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthView = 'login' | 'forgot' | 'reset';

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState(ENFORCED_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Reset Password state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL parameters on mount to auto-detect Firebase password reset action links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('oobCode');
      const mode = params.get('mode');

      if (code && (mode === 'resetPassword' || !mode)) {
        setResetCode(code);
        setView('reset');
        setError(null);
        setVerifyingCode(true);

        verifyAdminPasswordResetCode(code).then((res) => {
          setVerifyingCode(false);
          if (res.success && res.email) {
            setVerifiedEmail(res.email);
          } else {
            setError(res.error || 'The password reset link is invalid or has expired. Please request a new one.');
          }
        });
      }
    } catch (e) {
      console.error('Error parsing URL reset params:', e);
    }
  }, []);

  // Standard Admin Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setError(res.error || 'Authentication failed. Access is restricted.');
    }
  };

  // Trigger Forgot Password Link to dominicsanjay2009@gmail.com
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const res = await sendAdminPasswordReset(email);
    setLoading(false);

    if (res.success) {
      setSuccessMessage(
        res.message ||
          `Password reset link sent to ${ENFORCED_ADMIN_EMAIL}. Please check your inbox and click the link to reset your password.`
      );
    } else {
      setError(res.error || 'Failed to send reset link.');
    }
  };

  // Confirm Reset and Immediately Log In
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const codeToUse = resetCode.trim();
    if (!codeToUse) {
      setError('Please provide the password reset code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);
    const res = await confirmAdminPasswordResetAndLogin(codeToUse, newPassword);
    setLoading(false);

    if (res.success) {
      // Clear URL query parameters
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('oobCode');
          url.searchParams.delete('mode');
          url.searchParams.delete('apiKey');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
        }
      } catch {}

      // Immediate login!
      onLoginSuccess();
    } else {
      setError(res.error || 'Failed to reset password. Please check your reset code or request a new one.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0B1528] border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 shadow-inner">
            {view === 'reset' ? (
              <KeyRound className="w-8 h-8 text-blue-400" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {view === 'login' && 'Administrator Portal'}
            {view === 'forgot' && 'Reset Administrator Password'}
            {view === 'reset' && 'Set New Password'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {view === 'login' && 'Pawn Shop Management Platform Control Center'}
            {view === 'forgot' && 'A secure verification reset link will be sent to the administrator email'}
            {view === 'reset' && 'Create a new password and immediately access the control center'}
          </p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Strict Single-User Access Enforced</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* VIEW 1: Standard Admin Login */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dominicsanjay2009@gmail.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Restricted exclusively to: <span className="text-slate-300 font-mono">{ENFORCED_ADMIN_EMAIL}</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Secret Key / Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setView('forgot');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating Administrator...</span>
                </>
              ) : (
                <span>Authenticate Session</span>
              )}
            </button>
          </form>
        )}

        {/* VIEW 2: Forgot Password - Request Reset Link */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Administrator Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  readOnly
                  value={ENFORCED_ADMIN_EMAIL}
                  className="w-full pl-11 pr-4 py-3 bg-[#080E1C] border border-slate-800 rounded-xl text-slate-300 cursor-not-allowed text-sm font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Password reset links are only transmitted to the verified administrator account.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Reset Link to {ENFORCED_ADMIN_EMAIL}</span>
                </>
              )}
            </button>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setView('reset');
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                Already have a reset code or email link? <span className="text-blue-400 font-semibold">Enter code</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setView('login');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Administrator Login</span>
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: Set New Password & Immediate Login */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {verifyingCode ? (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center gap-2 text-blue-300 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Verifying reset authorization code...</span>
              </div>
            ) : verifiedEmail ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified Administrator: <strong className="font-mono text-emerald-200">{verifiedEmail}</strong></span>
              </div>
            ) : null}

            {/* Manual Reset Code field if not auto-populated */}
            {!resetCode && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Reset Code (from email link)
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter oobCode from email"
                    className="w-full pl-11 pr-4 py-2.5 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                New Administrator Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-11 pr-11 py-2.5 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-4 py-2.5 bg-[#080E1C] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Updating &amp; Authenticating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password &amp; Log In Immediately</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setView('login');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Administrator Login</span>
              </button>
            </div>
          </form>
        )}

        {/* Prohibited Registration Notice */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">
            Account Creation &amp; Registration Prohibited
          </p>
          <p className="text-[11px] text-slate-500">
            This administrative terminal does not permit new account registrations. Only the initialized platform administrator is authorized.
          </p>
        </div>
      </div>
    </div>
  );
};
