import React, { useState } from 'react';
import {
  ShieldCheck,
  Coins,
  CreditCard,
  Users,
  CheckCircle,
  Lock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Check
} from 'lucide-react';

interface IntroductionPageProps {
  onBackToApp?: () => void;
  isInitialOnboarding?: boolean;
}

export const IntroductionPage: React.FC<IntroductionPageProps> = ({
  onBackToApp,
  isInitialOnboarding = false,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const features = [
    {
      title: 'Ledger & Pledge Bill Management',
      desc: 'Seamlessly register collateral loans for Gold, Silver, and custom categories. Default rates and durations auto-fill from settings while letting you tailor terms on each individual bill.',
      icon: Coins,
      color: 'text-amber-500 bg-amber-50',
      bullets: [
        'Automated pro-rated simple interest calculation from the exact bill date',
        'Custom weight unit support: grams, milligrams, tola, or sovereign',
        'Audit-grade immutability and record integrity',
      ],
    },
    {
      title: 'Customer / Party CRM',
      desc: 'Maintain a searchable, organized database of all borrowers. View real-time activity streams combining bills, payments, and settlements sorted latest to oldest.',
      icon: Users,
      color: 'text-blue-500 bg-blue-50',
      bullets: [
        'Dual search modes: Instant search by Name or 10-digit Phone Number',
        'Party detail view with filtered activity tabs for Bills, Payments, and Closing Bills',
        'Total active loan balances and collateral counters at a glance',
      ],
    },
    {
      title: 'Transparent Payment Settlements',
      desc: 'Accept flexible customer repayments. Our automated financial engine settles accrued interest first, applying any surplus directly to reducing the principal.',
      icon: CreditCard,
      color: 'text-emerald-500 bg-emerald-50',
      bullets: [
        'Real-time allocation preview before confirming any payment',
        'Closing bill reconciliation with final settlement receipt',
        'No duplicate counting or accidental double payments',
      ],
    },
    {
      title: 'Bank-Grade Security & Local App Lock',
      desc: 'Protect customer and financial confidentiality with multi-tenant data isolation, PIN/Password lock, and device biometric authentication.',
      icon: ShieldCheck,
      color: 'text-purple-500 bg-purple-50',
      bullets: [
        'Automatic 2-minute background inactivity auto-lock',
        'Fingerprint & system biometric unlock integration',
        'Registered owner email verification for safe lock recovery',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-12 relative animate-fadeIn">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-accent-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-950">
              Pawn Shop <span className="text-accent-600">Management</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Application Guide & Feature Tour</p>
          </div>
        </div>

        {/* Slide Counter */}
        <div className="text-xs font-semibold text-slate-400">
          Feature {activeSlide + 1} of {features.length}
        </div>
      </div>

      {/* Main Slide Carousel Card */}
      <div className="max-w-4xl mx-auto w-full my-auto py-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 sm:p-12 transition-all duration-300">
          {(() => {
            const feat = features[activeSlide];
            const Icon = feat.icon;
            return (
              <div className="space-y-6 animate-fadeIn" key={activeSlide}>
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center font-bold`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-accent-600">
                      Core Capability
                    </span>
                    <h2 className="text-2xl font-bold text-brand-950 mt-0.5">{feat.title}</h2>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{feat.desc}</p>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {feat.bullets.map((b, i) => (
                    <div key={i} className="flex items-start space-x-3 text-xs sm:text-sm text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Slide Navigation Dots */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex space-x-2">
              {features.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    activeSlide === i ? 'w-8 bg-accent-600' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                disabled={activeSlide === 0}
                onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                disabled={activeSlide === features.length - 1}
                onClick={() => setActiveSlide((prev) => Math.min(features.length - 1, prev + 1))}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer with Specified "Back" Button at Bottom-Right */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pt-4">
        <p className="text-xs text-slate-400 font-medium">
          Secure, compliant financial technology for modern pawn brokers.
        </p>

        {/* Back button shown when already-activated account opens from within app */}
        {!isInitialOnboarding && onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-6 py-3 bg-brand-900 hover:bg-brand-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
      </div>
    </div>
  );
};
