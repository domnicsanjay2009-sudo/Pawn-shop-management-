import React, { useState } from 'react';
import { Mail, KeyRound, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isValidEmail } from '../../utils/validators';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  onNavigate?: (path: string) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackToLogin, onNavigate }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid Mail ID.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(result.error || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <button
        onClick={onBackToLogin}
        className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center space-x-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Login</span>
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-accent-600">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-brand-950">Forgot Password</h2>
          <p className="text-sm text-slate-500 mt-1">
            We will send a secure password reset link to your registered email
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-950 mb-2">Reset Link Sent</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Check your inbox at <strong className="text-brand-950">{email}</strong> and follow the instructions to securely reset your password.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full py-3 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl transition-colors"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Mail ID
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered mail ID"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending reset email...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Mandatory Public Policy & Business Footer Links (Section 8) */}
      <div className="w-full max-w-md mt-6 text-center z-10 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
          <button
            onClick={() => onNavigate ? onNavigate('/about-us') : (window.location.href = '/about-us')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            About Us
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate ? onNavigate('/contact-us') : (window.location.href = '/contact-us')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Contact Us
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate ? onNavigate('/terms-and-conditions') : (window.location.href = '/terms-and-conditions')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate ? onNavigate('/refund-policy') : (window.location.href = '/refund-policy')}
            className="hover:text-accent-400 font-medium transition-colors cursor-pointer text-accent-400/90"
          >
            Refund Policy
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate ? onNavigate('/privacy-policy') : (window.location.href = '/privacy-policy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          GS Pawn shop management • Ponneri, Thiruvallur, Tamil Nadu, India • +91 9363200295
        </p>
      </div>
    </div>
  );
};
