import React, { useState, useEffect, useRef } from 'react';
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
  Shield,
  Store,
  Edit3,
  Upload,
  X
} from 'lucide-react';
import { AppSettings as IAppSettings, InterestDuration } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAppLock } from '../../context/AppLockContext';
import { useToast } from '../common/Toast';
import { ShopLogoBadge } from '../common/ShopLogoBadge';
import { saveSettings } from '../../services/settingsService';
import { updateShopProfile } from '../../services/authService';
import { processUploadFile } from '../../services/fileStorageService';
import { hashCredential, authenticateWithBiometrics } from '../../services/appLockService';
import { isValidPIN, isValidPassword, isValidIndianPhone, isValidEmail } from '../../utils/validators';

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
  const { shopProfile, refreshProfile } = useAuth();
  const { config, setLockConfig, biometricAvailable } = useAppLock();
  const { showToast } = useToast();

  // Shop Profile Edit State
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profileFormError, setProfileFormError] = useState('');
  const [profileForm, setProfileForm] = useState({
    shopName: shopProfile?.shopName || '',
    ownerName: shopProfile?.ownerName || '',
    phone: shopProfile?.phone || '',
    email: shopProfile?.email || '',
    address: shopProfile?.address || '',
    logoUrl: shopProfile?.logoUrl || '',
  });

  useEffect(() => {
    if (shopProfile && !isEditingProfile) {
      setProfileForm({
        shopName: shopProfile.shopName || '',
        ownerName: shopProfile.ownerName || '',
        phone: shopProfile.phone || '',
        email: shopProfile.email || '',
        address: shopProfile.address || '',
        logoUrl: shopProfile.logoUrl || '',
      });
    }
  }, [shopProfile, isEditingProfile]);

  const handleStartEditProfile = () => {
    setProfileFormError('');
    setProfileForm({
      shopName: shopProfile?.shopName || '',
      ownerName: shopProfile?.ownerName || '',
      phone: shopProfile?.phone || '',
      email: shopProfile?.email || '',
      address: shopProfile?.address || '',
      logoUrl: shopProfile?.logoUrl || '',
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileFormError('');
    setProfileForm({
      shopName: shopProfile?.shopName || '',
      ownerName: shopProfile?.ownerName || '',
      phone: shopProfile?.phone || '',
      email: shopProfile?.email || '',
      address: shopProfile?.address || '',
      logoUrl: shopProfile?.logoUrl || '',
    });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProfileFormError('');
    setUploadingLogo(true);
    try {
      const processed = await processUploadFile(file, {
        allowPdf: false,
        maxDimension: 320,
        quality: 0.85,
        preserveTransparency: true,
      });
      setProfileForm((prev) => ({ ...prev, logoUrl: processed.dataUrl }));
      showToast('Shop logo ready. Click "Save Changes" to apply across your shop.', 'info');
    } catch (err: any) {
      const msg = err?.message || 'Unable to process selected logo image.';
      setProfileFormError(msg);
      showToast(msg, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveShopProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFormError('');

    const trimmedShopName = profileForm.shopName.trim();
    const trimmedOwnerName = profileForm.ownerName.trim();
    const trimmedPhone = profileForm.phone.trim();
    const trimmedEmail = profileForm.email.trim();
    const trimmedAddress = profileForm.address.trim();

    if (trimmedShopName.length < 2) {
      setProfileFormError('Please enter a valid Shop Name (at least 2 characters).');
      return;
    }
    if (trimmedOwnerName.length < 2) {
      setProfileFormError('Please enter a valid Owner Name (at least 2 characters).');
      return;
    }
    if (!isValidIndianPhone(trimmedPhone)) {
      setProfileFormError('Please enter a valid 10-digit Shop Phone Number.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setProfileFormError('Please enter a valid Email ID.');
      return;
    }
    if (trimmedAddress.length < 4) {
      setProfileFormError('Please enter a valid Shop Address.');
      return;
    }

    let activeShopId = shopProfile?.shopId;
    if (!activeShopId) {
      try {
        const recovered = await refreshProfile();
        activeShopId = recovered?.shopId;
      } catch {
        // handled below
      }
    }
    if (!activeShopId) {
      setProfileFormError('Shop profile is not available yet. Please refresh and try again.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateShopProfile(activeShopId, {
        shopName: trimmedShopName,
        ownerName: trimmedOwnerName,
        phone: trimmedPhone,
        email: trimmedEmail,
        address: trimmedAddress,
        logoUrl: profileForm.logoUrl,
      });
      await refreshProfile();
      setIsEditingProfile(false);
      showToast('Shop profile updated successfully and synced to Firebase.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to update shop profile.';
      setProfileFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

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
          Manage your shop profile, default interest parameters, and local app lock security
        </p>
      </div>

      {/* Edit Shop Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <ShopLogoBadge
              logoUrl={isEditingProfile ? profileForm.logoUrl : shopProfile?.logoUrl}
              shopName={isEditingProfile ? profileForm.shopName : shopProfile?.shopName}
              sizeClass="w-12 h-12"
              iconClass="w-6 h-6 text-white"
              roundedClass="rounded-xl"
              fallbackBgClass="bg-brand-950 shadow-xs"
            />
            <div>
              <h3 className="text-lg font-bold text-brand-950 flex items-center gap-2">
                <span>Shop Profile</span>
              </h3>
              <p className="text-xs text-slate-500">
                View and update your business details and shop branding logo
              </p>
            </div>
          </div>

          {!isEditingProfile && (
            <button
              type="button"
              onClick={handleStartEditProfile}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-brand-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {profileFormError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileFormError}</span>
          </div>
        )}

        {isEditingProfile ? (
          <form onSubmit={handleSaveShopProfile} className="space-y-5">
            {/* Logo Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <ShopLogoBadge
                logoUrl={profileForm.logoUrl}
                shopName={profileForm.shopName || 'Shop Logo'}
                sizeClass="w-16 h-16"
                iconClass="w-7 h-7 text-white"
                roundedClass="rounded-2xl"
                fallbackBgClass="bg-brand-950"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-brand-950 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-accent-600" />
                  <span>Shop Logo</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload a square JPG, PNG, WEBP, or GIF image (max 5 MB). Automatically optimized and synced across devices.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{profileForm.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                  </button>
                  {profileForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.shopName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, shopName: e.target.value }))}
                  placeholder="Enter your pawn shop name"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Owner Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.ownerName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Enter shop owner full name"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Shop Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="shop@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Shop Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Complete shop street address, city, PIN"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelEditProfile}
                disabled={savingProfile}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile || uploadingLogo}
                className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-bold shadow-md shadow-accent-600/20 disabled:opacity-60 cursor-pointer"
              >
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Shop Name</p>
              <p className="font-bold text-brand-950 mt-0.5">{shopProfile?.shopName || 'Not set'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Owner Name</p>
              <p className="font-bold text-brand-950 mt-0.5">{shopProfile?.ownerName || 'Not set'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Shop Phone Number</p>
              <p className="font-bold text-brand-950 mt-0.5">{shopProfile?.phone || 'Not set'}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Email ID</p>
              <p className="font-bold text-brand-950 mt-0.5 break-all">{shopProfile?.email || 'Not set'}</p>
            </div>
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Shop Address</p>
              <p className="font-medium text-brand-950 mt-0.5">{shopProfile?.address || 'Not set'}</p>
            </div>
          </div>
        )}
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
