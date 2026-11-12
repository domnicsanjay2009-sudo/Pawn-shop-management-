import React, { useState, useEffect } from 'react';
import {
  Check,
  Crown,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  AlertCircle,
  Copy,
  Plus,
  Loader2,
  Clock
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { PLANS, createStaffPass, getStaffPasses } from '../../services/subscriptionService';
import { formatDate, formatCurrencyPaise } from '../../utils/formatters';
import { PlanType, StaffPass } from '../../types';

export const SubscriptionPlans: React.FC = () => {
  const { subscription, isPremium, hasActivePlan, upgradePlan, refreshSubscription } =
    useSubscription();
  const { shopProfile } = useAuth();
  const { showToast } = useToast();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [staffPasses, setStaffPasses] = useState<StaffPass[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [creatingPass, setCreatingPass] = useState(false);

  useEffect(() => {
    if (shopProfile?.shopId && isPremium) {
      getStaffPasses(shopProfile.shopId).then(setStaffPasses);
    }
  }, [shopProfile?.shopId, isPremium]);

  const isNearExpiry = hasActivePlan && subscription?.expiryDate
    ? (subscription.expiryDate - Date.now()) <= (30 * 24 * 60 * 60 * 1000)
    : false;

  const handleSelectPlan = async (plan: PlanType) => {
    if (hasActivePlan && subscription) {
      if (subscription.plan === 'Yearly Premium' && plan === 'Yearly') {
        showToast('You are already enjoying the highest Yearly Premium Plan.', 'info');
        return;
      }
      if (subscription.plan === plan && !isNearExpiry) {
        const expDate = formatDate(subscription.expiryDate);
        showToast(
          `Your subscription is already active. Current plan expires on ${expDate}. You can renew within 30 days of expiry.`,
          'info'
        );
        return;
      }
    }

    setLoadingPlan(plan);
    await upgradePlan(
      plan,
      () => {
        setLoadingPlan(null);
        showToast(`Congratulations! ${plan} Plan activated successfully.`, 'success');
        refreshSubscription();
      },
      (err) => {
        setLoadingPlan(null);
        showToast(err, 'error');
      }
    );
  };

  const handleCreateStaffPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !shopProfile?.shopId) return;

    setCreatingPass(true);
    try {
      const pass = await createStaffPass(shopProfile.shopId, newStaffName.trim());
      setStaffPasses((prev) => [pass, ...prev]);
      setNewStaffName('');
      showToast(`90-Day Temporary Staff Pass generated for ${pass.staffName}.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Could not generate pass', 'error');
    } finally {
      setCreatingPass(false);
    }
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    showToast('Staff token copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 max-w-5xl mx-auto">
      {/* Title & Header */}
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-3xl font-extrabold text-brand-950 tracking-tight">
          Subscription Plans
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Transparent annual pricing built for reliable pawn shop businesses. All plans include unlimited records with data isolation.
        </p>
      </div>

      {/* Active Subscription Banner */}
      {hasActivePlan && subscription && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-bold text-emerald-950">
                  Active Plan: {subscription.plan}
                </h4>
                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Approved
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Expires on <strong className="font-semibold">{formatDate(subscription.expiryDate)}</strong> (
                {Math.ceil((subscription.expiryDate - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-800 bg-white/60 px-3.5 py-2 rounded-xl border border-emerald-200">
            {subscription.maxDevices} Devices Supported
          </div>
        </div>
      )}

      {/* Two Plan Cards: Yearly Plan (₹1,999) & Yearly Premium (₹2,999) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Plan 1: Yearly Plan (₹1,999) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Standard
              </span>
            </div>

            <h3 className="text-2xl font-bold text-brand-950">Yearly Plan</h3>
            <p className="text-xs text-slate-500 mt-1">Complete core management for your pawn shop</p>

            <div className="mt-6 flex items-baseline space-x-1">
              <span className="text-4xl font-extrabold text-brand-950">₹1,999</span>
              <span className="text-slate-500 font-medium text-sm">/ year</span>
            </div>

            <div className="mt-8 space-y-3.5">
              {PLANS.YEARLY.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-3 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => handleSelectPlan('Yearly')}
              disabled={
                loadingPlan !== null ||
                (hasActivePlan && (subscription?.plan === 'Yearly Premium' || (subscription?.plan === 'Yearly' && !isNearExpiry)))
              }
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                hasActivePlan && subscription?.plan === 'Yearly' && !isNearExpiry
                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                  : 'bg-brand-900 hover:bg-brand-800 text-white shadow-md disabled:opacity-50'
              }`}
            >
              {loadingPlan === 'Yearly' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : hasActivePlan && subscription?.plan === 'Yearly' ? (
                isNearExpiry ? 'Renew Yearly Plan' : 'Current Active Plan'
              ) : hasActivePlan && subscription?.plan === 'Yearly Premium' ? (
                'Included in Premium'
              ) : (
                'Select Yearly Plan'
              )}
            </button>
          </div>
        </div>

        {/* Plan 2: Yearly Premium Plan (₹2,999) */}
        <div className="bg-brand-950 text-white rounded-3xl border-2 border-accent-500 shadow-xl p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Premium ribbon */}
          <div className="absolute top-0 right-8 bg-gradient-to-r from-accent-600 to-accent-500 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-b-xl uppercase tracking-wider shadow-sm flex items-center space-x-1">
            <Crown className="w-3 h-3" />
            <span>Recommended</span>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-accent-400 bg-accent-500/10 px-3 py-1 rounded-full border border-accent-500/20">
                Premium
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>Yearly Premium Plan</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              AI Support, expanded 9-device limit, & 90-day staff passes
            </p>

            <div className="mt-6 flex items-baseline space-x-1">
              <span className="text-4xl font-extrabold text-white">₹2,999</span>
              <span className="text-slate-400 font-medium text-sm">/ year</span>
            </div>

            <div className="mt-8 space-y-3.5">
              {PLANS.PREMIUM.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-3 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => handleSelectPlan('Yearly Premium')}
              disabled={
                loadingPlan !== null ||
                (hasActivePlan && subscription?.plan === 'Yearly Premium' && !isNearExpiry)
              }
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                hasActivePlan && subscription?.plan === 'Yearly Premium' && !isNearExpiry
                  ? 'bg-accent-500/20 text-accent-300 cursor-default'
                  : 'bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-600/30 disabled:opacity-50'
              }`}
            >
              {loadingPlan === 'Yearly Premium' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : hasActivePlan && subscription?.plan === 'Yearly Premium' ? (
                isNearExpiry ? 'Renew Premium Plan' : 'Current Active Plan'
              ) : hasActivePlan && subscription?.plan === 'Yearly' ? (
                'Upgrade to Premium'
              ) : (
                'Select Premium Plan'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Premium Feature Section: 90-Day Temporary Staff Passes */}
      {isPremium && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-brand-950">
                  90-Day Temporary Staff Pass Delegation
                </h3>
                <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Premium Feature
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issue safe, temporary 90-day invite passes to secondary counter devices and staff members.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateStaffPass} className="flex gap-3 mb-6 max-w-md">
            <input
              type="text"
              required
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Staff Name / Counter ID"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="submit"
              disabled={creatingPass}
              className="px-4 py-2.5 bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Issue 90-Day Pass</span>
            </button>
          </form>

          {/* List of active passes */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {staffPasses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No active staff passes issued. Enter a staff name above to create one.
              </div>
            ) : (
              staffPasses.map((pass) => (
                <div
                  key={pass.id}
                  className="p-4 flex items-center justify-between text-xs hover:bg-slate-50"
                >
                  <div>
                    <h5 className="font-bold text-brand-950">{pass.staffName}</h5>
                    <div className="flex items-center space-x-2 text-slate-500 font-mono mt-0.5">
                      <span>Token: {pass.token}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(pass.token)}
                        className="text-accent-600 hover:text-accent-700"
                        title="Copy token"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Valid until {formatDate(pass.expiresAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
