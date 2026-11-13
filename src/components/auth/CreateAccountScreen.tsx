import React, { useState, useRef } from 'react';
import { User, Store, Phone, MapPin, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { isValidIndianPhone, isValidEmail } from '../../utils/validators';

interface CreateAccountScreenProps {
  onBackToLogin: () => void;
  onNavigate?: (path: string) => void;
}

export const CreateAccountScreen: React.FC<CreateAccountScreenProps> = ({ onBackToLogin, onNavigate }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [rePassword, setRePassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setErrorMessage('');

    if (!ownerName.trim() || !shopName.trim() || !address.trim()) {
      setErrorMessage('Please fill in all required owner and shop details.');
      return;
    }

    // Field 3 Validation: Shop phone number must contain exactly 10 digits
    if (!isValidIndianPhone(phone)) {
      setErrorMessage('Shop phone number must contain exactly 10 digits.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid Mail ID.');
      return;
    }

    // Password Validation (Firebase Email/Password requires at least 6 characters)
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    // Passwords Match Validation
    if (newPassword !== rePassword) {
      setErrorMessage('Password and Re-entered Password do not match.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await register({
        ownerName,
        shopName,
        phone,
        address,
        email,
        password: newPassword,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to create account.');
      } else {
        showToast(
          'Account created successfully! Please verify your email address before logging in.',
          'success'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4 sm:p-6 py-12 relative">
      <button
        onClick={onBackToLogin}
        className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center space-x-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Login</span>
      </button>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-accent-600">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-brand-950">Register New Shop</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create your shop profile and administrator credentials
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Owner Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              1. Owner Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Suresh Kumar"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* 2. Shop Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              2. Shop Name
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Sri Balaji Bankers & Jewellers"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* 3. Shop Phone Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              3. Shop Phone Number (10 Digits)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* 4. Shop Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              4. Shop Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop number, street, city and pin code"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* 5. Mail ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              5. Mail ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* 6. New Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              6. New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 7. Re-enter Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              7. Re-enter Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
                placeholder="Re-enter to confirm"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-brand-950 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500">
            By creating an account, you agree to our{' '}
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('/terms-and-conditions') : (window.location.href = '/terms-and-conditions')}
              className="text-accent-600 hover:underline font-medium cursor-pointer"
            >
              Terms &amp; Conditions
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('/privacy-policy') : (window.location.href = '/privacy-policy')}
              className="text-accent-600 hover:underline font-medium cursor-pointer"
            >
              Privacy Policy
            </button>
            .
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Shop Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>
      </div>

      {/* Mandatory Public Policy & Business Footer Links (Section 8) */}
      <div className="w-full max-w-lg mt-6 text-center z-10 space-y-2">
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
