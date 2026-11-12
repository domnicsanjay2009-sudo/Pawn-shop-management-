import React, { useState } from 'react';
import {
  Clock,
  Percent,
  Lock,
  Fingerprint,
  BookOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { AppSettings as IAppSettings, InterestDuration } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppLock } from '../../context/AppLockContext';
import { useToast } from '../common/Toast';
import { saveSettings } from '../../services/settingsService';
import { hashCredential, authenticateWithBiometrics } from '../../services/appLockService';
import { isValidPIN, isValidPassword } from '../../utils/validators';

interface AppSettingsProps {
  settings: IAppSettings;
  onUpdateSettings: (newSettings: IAppSettings) => void;
  onOpenIntroduction: () => void;
}

export const AppSettings: React.FC<AppSettingsProps> = ({
  settings,
  onUpdateSettings,
  onOpenIntroduction,
}) => {
  const { shopProfile } = useAuth();
  const { config, setLockConfig, biometricAvailable } = useAppLock();
  const { showToast } = useToast();

  // Settings State: Exactly the 3 requested items
  const [duration, setDuration] = useState<InterestDuration>(
    settings.defaultInterestDuration || 'Monthly'
  );
  const [goldRate, setGoldRate] = useState<number>(settings.defaultGoldPercentage || 2.0);
  const [silverRate, setSilverRate] = useState<number>(settings.defaultSilverPercentage || 3.0);
  const [othersRate, setOthersRate] = useState<number>(settings.defaultOthersPercentage || 4.0);
  const [savingSettings, setSavingSettings] = useState(false);

  // App Lock Setup State (PIN vs Password: Strictly Mutually Exclusive)
  const [lockMode, setLockMode] = useState<'pin' | 'password' | 'none'>(config.type);
  const [credInput, setCredInput] = useState('');
  const [reCredInput, setReCredInput] = useState('');
  const [lockStep, setLockStep] = useState<'input' | 'confirm'>('input');
  const [lockError, setLockError] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleSaveFinancialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopProfile?.shopId) return;

    setSavingSettings(true);
    try {
      const updated: IAppSettings = {
        ...settings,
        defaultInterestDuration: duration,
        defaultGoldPercentage: Number(goldRate),
        defaultSilverPercentage: Number(silverRate),
        defaultOthersPercentage: Number(othersRate),
        updatedAt: Date.now(),
      };

      await saveSettings(shopProfile.shopId, updated);
      onUpdateSettings(updated);
      showToast('Default interest settings saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStartLockChange = (mode: 'pin' | 'password' | 'none') => {
    setLockMode(mode);
    setCredInput('');
    setReCredInput('');
    setLockStep('input');
    setLockError('');

    if (mode === 'none') {
      setLockConfig({
        type: 'none',
        hash: '',
        biometricEnabled: false,
        lastActive: Date.now(),
      });
      showToast('App Lock disabled.', 'info');
    }
  };

  const handleNextLockStep = () => {
    setLockError('');

    if (lockMode === 'pin') {
      const check = isValidPIN(credInput);
      if (!check.valid) {
        setLockError(check.error || 'Invalid PIN.');
        return;
      }
    } else if (lockMode === 'password') {
      const check = isValidPassword(credInput);
      if (!check.valid) {
        setLockError(check.error || 'Invalid Password.');
        return;
      }
    }

    setLockStep('confirm');
  };

  const handleSaveLockCredential = async () => {
    setLockError('');

    if (credInput !== reCredInput) {
      setLockError('Confirmation entry does not match.');
      return;
    }

    const hash = await hashCredential(credInput);
    setLockConfig({
      type: lockMode,
      hash,
      biometricEnabled: false, // Must be explicitly toggled with biometric verification
      lastActive: Date.now(),
    });

    showToast(`${lockMode.toUpperCase()} Lock configured and active.`, 'success');
    setLockStep('input');
    setCredInput('');
    setReCredInput('');
  };

  const handleToggleBiometric = async () => {
    if (config.type === 'none') {
      showToast('Enable PIN or Password lock first before turning on Biometrics.', 'warning');
      return;
    }

    setBiometricLoading(true);
    // Requires a successful biometric verification once before enabling or disabling
    const verified = await authenticateWithBiometrics();
    setBiometricLoading(false);

    if (verified) {
      const nextState = !config.biometricEnabled;
      setLockConfig({
        ...config,
        biometricEnabled: nextState,
      });
      showToast(
        nextState ? 'Biometric fingerprint unlock enabled.' : 'Biometric unlock disabled.',
        'success'
      );
    } else {
      showToast('Biometric verification cancelled or unavailable on this device.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-brand-950">App Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure default interest parameters and local app lock security
        </p>
      </div>

      {/* Setting 1 & 2: Default Interest Duration & Percentage Form */}
      <form
        onSubmit={handleSaveFinancialSettings}
        className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-950">Default Interest Settings</h3>
            <p className="text-xs text-slate-500">
              New bills auto-fill these values. You can still customize each bill individually.
            </p>
          </div>
        </div>

        {/* 1. Default Interest Duration */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            1. Default Interest Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as InterestDuration[]).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDuration(dur)}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  duration === dur
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Default Interest Percentage for Gold, Silver, Others */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            2. Default Interest Percentage (%) per Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gold */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
              <span className="block text-xs font-bold text-amber-900 mb-1">Gold Interest Rate</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  required
                  value={goldRate}
                  onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-800">
                  %
                </span>
              </div>
            </div>

            {/* Silver */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="block text-xs font-bold text-slate-800 mb-1">Silver Interest Rate</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  required
                  value={silverRate}
                  onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                  %
                </span>
              </div>
            </div>

            {/* Others */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200">
              <span className="block text-xs font-bold text-blue-900 mb-1">Others Interest Rate</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  required
                  value={othersRate}
                  onChange={(e) => setOthersRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-brand-950 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-800">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-2.5 bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-70 cursor-pointer"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Default Interest Settings</span>
          </button>
        </div>
      </form>

      {/* App Lock Settings: PIN / Password & Biometrics */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-brand-950 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-950">App Lock (Local Device Protection)</h3>
            <p className="text-xs text-slate-500">
              Locks automatically after 2 minutes in background or upon closing the application.
            </p>
          </div>
        </div>

        {/* Lock Mode Selector (Strictly Mutually Exclusive) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Select Lock Mode (Only one may be enabled)
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleStartLockChange('none')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                config.type === 'none'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              None (Off)
            </button>
            <button
              type="button"
              onClick={() => handleStartLockChange('pin')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                config.type === 'pin'
                  ? 'bg-accent-600 text-white border-accent-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              PIN Lock
            </button>
            <button
              type="button"
              onClick={() => handleStartLockChange('password')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                config.type === 'password'
                  ? 'bg-accent-600 text-white border-accent-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Password Lock
            </button>
          </div>
        </div>

        {/* PIN / Password Setup Flow: Enter -> Next -> Re-enter -> Save */}
        {lockMode !== 'none' && (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 max-w-md space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-950">
              {config.type === lockMode ? 'Change ' : 'Configure '}
              {lockMode === 'pin' ? '4-6 Digit PIN' : 'Password Lock'}
            </h4>

            {lockError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {lockError}
              </div>
            )}

            {lockStep === 'input' ? (
              <div className="space-y-3">
                <input
                  type={lockMode === 'pin' ? 'password' : 'password'}
                  inputMode={lockMode === 'pin' ? 'numeric' : 'text'}
                  value={credInput}
                  onChange={(e) => setCredInput(e.target.value)}
                  placeholder={
                    lockMode === 'pin' ? 'Enter PIN (4 to 6 digits)' : 'Enter Password (min 4 chars)'
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <button
                  type="button"
                  onClick={handleNextLockStep}
                  className="w-full py-2 bg-brand-900 hover:bg-brand-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type={lockMode === 'pin' ? 'password' : 'password'}
                  inputMode={lockMode === 'pin' ? 'numeric' : 'text'}
                  value={reCredInput}
                  onChange={(e) => setReCredInput(e.target.value)}
                  placeholder={lockMode === 'pin' ? 'Re-enter PIN' : 'Re-enter Password'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLockStep('input')}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLockCredential}
                    className="flex-1 py-2 bg-accent-600 hover:bg-accent-500 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    Save Lock
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fingerprint / Biometric Option */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-950">Device Fingerprint / Biometric</h4>
              <p className="text-xs text-slate-500">
                Unlock instantly using system biometric credentials. Requires PIN or Password as fallback.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={config.type === 'none' || biometricLoading}
            onClick={handleToggleBiometric}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              config.biometricEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'
            }`}
          >
            {biometricLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : config.biometricEnabled ? (
              'Biometrics Enabled'
            ) : (
              'Enable Biometric'
            )}
          </button>
        </div>
      </div>

      {/* Item 3 (Must be last in App Settings as specified): Introduction Page */}
      <div className="bg-gradient-to-r from-brand-950 to-brand-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/30 text-accent-400 flex items-center justify-center font-bold border border-accent-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Introduction Page</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Review features, workflow tutorials, and operational guides
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenIntroduction}
          className="px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors shrink-0 cursor-pointer"
        >
          Open Introduction Page
        </button>
      </div>
    </div>
  );
};
