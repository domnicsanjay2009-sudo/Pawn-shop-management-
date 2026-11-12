import React, { useState, useEffect, useCallback } from 'react';
import {
  MailCheck,
  RefreshCw,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export const EmailVerificationScreen: React.FC = () => {
  const {
    pendingVerificationUser,
    authBanner,
    checkVerificationStatus,
    resendVerification,
    cancelPendingVerification,
  } = useAuth();
  const { showToast } = useToast();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [resendConfirm, setResendConfirm] = useState('');

  const registeredEmail = pendingVerificationUser?.email || authBanner?.prefillEmail || '';

  const handleSilentVisibilityCheck = useCallback(async () => {
    if (!pendingVerificationUser || document.hidden || checking) return;
    const res = await checkVerificationStatus(pendingVerificationUser);
    if (res.verified) {
      showToast('Email verified! Please log in to continue.', 'success');
    }
  }, [pendingVerificationUser, checking, checkVerificationStatus, showToast]);

  // Automatically check Firebase Auth verification state when user returns to this browser tab
  useEffect(() => {
    const onFocusOrVisible = () => {
      if (!document.hidden) {
        handleSilentVisibilityCheck();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [handleSilentVisibilityCheck]);

  const handleCheckVerification = async () => {
    if (checking) return;
    setStatusError('');
    setResendConfirm('');
    setChecking(true);
    try {
      const res = await checkVerificationStatus(pendingVerificationUser);
      if (res.verified) {
        showToast('Email verified! Redirecting to Login Page...', 'success');
      } else {
        setStatusError(
          res.error || 'Your email address is not verified yet. Please check your inbox and try again.'
        );
      }
    } catch (err: any) {
      setStatusError(
        err?.message || 'Unable to verify status right now. Please try again.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setStatusError('');
    setResendConfirm('');
    setResending(true);
    try {
      const res = await resendVerification(pendingVerificationUser);
      if (res.alreadyVerified) {
        showToast('Your email is already verified! Please log in.', 'success');
      } else if (res.success) {
        const msg = `Verification link sent to ${registeredEmail}. Please check your inbox and spam folder.`;
        setResendConfirm(msg);
        showToast('Verification email sent! Please check your inbox.', 'success');
      } else {
        setStatusError(res.error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <button
        type="button"
        onClick={cancelPendingVerification}
        className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center space-x-2 text-sm font-medium transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Login</span>
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent-600">
            <MailCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-brand-950">Verify Your Email</h2>
          <p className="text-sm text-slate-500 mt-1">
            Email verification is required before signing in
          </p>
        </div>

        {/* Success / Registration Confirmation Banner */}
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm space-y-1.5">
          <div className="flex items-start space-x-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              {authBanner?.message ||
                'Account created successfully! Please verify your email address before logging in.'}
            </span>
          </div>
          <div className="flex items-start space-x-2 text-xs text-emerald-800 pt-1">
            <Inbox className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              We sent a verification link to{' '}
              <strong className="font-semibold break-all">{registeredEmail || 'your email address'}</strong>.
              Please check your inbox (and spam folder) and click the link to activate your account.
            </span>
          </div>
        </div>

        {resendConfirm && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium">
            {resendConfirm}
          </div>
        )}

        {statusError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={checking || resending}
            className="w-full py-3.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking verification status...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>I&apos;ve Verified — Continue to Login</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || checking}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-70 cursor-pointer"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending verification email...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-accent-600" />
                <span>Resend Verification Email</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already verified from another device?{' '}
          <button
            type="button"
            onClick={cancelPendingVerification}
            className="font-semibold text-accent-600 hover:text-accent-700 cursor-pointer"
          >
            Go to Login Page
          </button>
        </p>
      </div>
    </div>
  );
};
