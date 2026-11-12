import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface LoginScreenProps {
  onBack: () => void;
  onOpenRegister: () => void;
  onOpenForgotPassword: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onOpenRegister,
  onOpenForgotPassword,
}) => {
  const { login, resendVerification } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsUnverified(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both Mail ID and Password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed.');
      if (result.isUnverified) {
        setIsUnverified(true);
        setUnverifiedUser(result.user);
      }
    } else {
      showToast('Login successful. Welcome back!', 'success');
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    const res = await resendVerification(unverifiedUser);
    setResendingEmail(false);
    if (res.success) {
      showToast('Verification email resent! Please check your inbox and spam folder.', 'success');
    } else {
      showToast(res.error || 'Failed to resend verification email.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      {/* Top back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center space-x-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-accent-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-brand-950">Shop Owner Login</h2>
          <p className="text-sm text-slate-500 mt-1">
            Access your secure pawn shop management workspace
          </p>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
            <p>{errorMessage}</p>
            {isUnverified && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="mt-2.5 inline-flex items-center text-xs font-bold text-accent-700 hover:text-accent-800 underline cursor-pointer disabled:opacity-60"
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Resending verification email...</span>
                  </>
                ) : (
                  <span>Resend Verification Email</span>
                )}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Mail ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Mail ID
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. Password with Show/Hide toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs font-medium text-accent-600 hover:text-accent-700 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        {/* Create Account Link */}
        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Don't have a registered shop account?{' '}
            <button
              onClick={onOpenRegister}
              className="font-semibold text-accent-600 hover:text-accent-700 transition-colors ml-1 cursor-pointer"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
