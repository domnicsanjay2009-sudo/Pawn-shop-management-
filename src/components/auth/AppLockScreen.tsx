import React, { useState } from 'react';
import { Lock, Fingerprint, KeyRound, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppLock } from '../../context/AppLockContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { hashCredential } from '../../services/appLockService';
import { isValidPIN, isValidPassword } from '../../utils/validators';

export const AppLockScreen: React.FC = () => {
  const { config, verifyInput, triggerBiometric, setLockConfig } = useAppLock();
  const { shopProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery Mode State
  const [recoveryStep, setRecoveryStep] = useState<'locked' | 'verifyEmail' | 'newCredential'>('locked');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [newCred, setNewCred] = useState('');
  const [reNewCred, setReNewCred] = useState('');

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!input) return;

    setLoading(true);
    const valid = await verifyInput(input);
    setLoading(false);

    if (!valid) {
      setError(`Incorrect ${config.type === 'pin' ? 'PIN' : 'Password'}.`);
      setInput('');
    } else {
      showToast('Unlocked successfully', 'success');
    }
  };

  const handleBiometricClick = async () => {
    setError('');
    const success = await triggerBiometric();
    if (!success) {
      setError('Biometric authentication failed or cancelled.');
    } else {
      showToast('Unlocked with Biometrics', 'success');
    }
  };

  // Recovery Step 1: Verify registered shop email
  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    const targetEmail = (shopProfile?.email || '').trim().toLowerCase();
    if (recoveryEmail.trim().toLowerCase() !== targetEmail) {
      setRecoveryError('This email does not match the registered shop owner email.');
      return;
    }

    setRecoveryStep('newCredential');
  };

  // Recovery Step 2: Set new PIN or Password
  const handleSaveNewCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (config.type === 'pin') {
      const pinCheck = isValidPIN(newCred);
      if (!pinCheck.valid) {
        setRecoveryError(pinCheck.error || 'Invalid PIN.');
        return;
      }
    } else {
      const passCheck = isValidPassword(newCred);
      if (!passCheck.valid) {
        setRecoveryError(passCheck.error || 'Invalid Password.');
        return;
      }
    }

    if (newCred !== reNewCred) {
      setRecoveryError('Entries do not match.');
      return;
    }

    const newHash = await hashCredential(newCred);
    setLockConfig({
      ...config,
      hash: newHash,
      lastActive: Date.now()
    });

    showToast(`New ${config.type === 'pin' ? 'PIN' : 'Password'} saved. Please unlock now.`, 'success');
    setRecoveryStep('locked');
    setInput('');
    setNewCred('');
    setReNewCred('');
  };

  return (
    <div className="fixed inset-0 z-[999] bg-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 text-center animate-fadeIn">
        {/* Recovery Step: Email Verification */}
        {recoveryStep === 'verifyEmail' && (
          <div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-brand-950 mb-1">Verify Shop Email</h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter your registered shop email to reset your App Lock {config.type.toUpperCase()}
            </p>

            {recoveryError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <input
                type="email"
                required
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="registered-owner@email.com"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-900 hover:bg-brand-800 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
              >
                Verify & Continue
              </button>
              <button
                type="button"
                onClick={() => setRecoveryStep('locked')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Recovery Step: New Credential Setup */}
        {recoveryStep === 'newCredential' && (
          <div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-brand-950 mb-1">
              Set New {config.type === 'pin' ? 'PIN' : 'Password'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter your replacement local security lock
            </p>

            {recoveryError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleSaveNewCredential} className="space-y-3">
              <input
                type={config.type === 'pin' ? 'number' : 'password'}
                required
                value={newCred}
                onChange={(e) => setNewCred(e.target.value)}
                placeholder={config.type === 'pin' ? 'Enter 4 to 6 digit PIN' : 'Enter Password (min 4 chars)'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <input
                type={config.type === 'pin' ? 'number' : 'password'}
                required
                value={reNewCred}
                onChange={(e) => setReNewCred(e.target.value)}
                placeholder="Re-enter to confirm"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
              >
                Save New Lock
              </button>
            </form>
          </div>
        )}

        {/* Standard Lock Screen */}
        {recoveryStep === 'locked' && (
          <div>
            <div className="w-14 h-14 bg-brand-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-900/20">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-bold text-brand-950 mb-1">Pawn Shop Lock</h3>
            <p className="text-xs text-slate-500 mb-6">
              Enter your {config.type === 'pin' ? 'PIN' : 'Password'} to resume work
            </p>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={config.type === 'pin' ? 'password' : 'password'}
                  inputMode={config.type === 'pin' ? 'numeric' : 'text'}
                  autoFocus
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={config.type === 'pin' ? '• • • •' : 'Enter Password'}
                  className="w-full text-center tracking-widest text-lg py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Unlock Application</span>}
              </button>

              {/* Fingerprint Biometric Button */}
              {config.biometricEnabled && (
                <button
                  type="button"
                  onClick={handleBiometricClick}
                  className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Fingerprint className="w-5 h-5 text-accent-600" />
                  <span>Use Device Fingerprint</span>
                </button>
              )}
            </form>

            {/* Forgot Lock Link */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setRecoveryStep('verifyEmail')}
                className="text-accent-600 hover:text-accent-700 font-medium cursor-pointer"
              >
                Forgot?
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="text-slate-400 hover:text-slate-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
