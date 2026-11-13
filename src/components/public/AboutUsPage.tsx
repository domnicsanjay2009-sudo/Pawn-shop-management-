import React, { useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Users,
  Coins,
  Receipt,
  BarChart3,
  Smartphone,
  Lock,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface AboutUsPageProps {
  onNavigate?: (path: string) => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'About Us - GS Pawn shop management';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <PublicHeader currentPath="/about-us" onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-950 via-slate-900 to-slate-900 text-white py-16 sm:py-20 px-4 sm:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-accent-600/20 border border-accent-500/30 text-accent-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>About Our Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            GS Pawn shop management
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Practical, secure, and modern digital counter software built specifically for independent pawn shops, gold loan operators, and jewellery lenders.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16 space-y-12">
        {/* Important Regulatory Disclaimer Banner */}
        <div className="p-5 sm:p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-4 text-amber-900">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-amber-950">Software Technology Provider Notice</h4>
            <p className="text-amber-800 leading-relaxed">
              <strong>GS Pawn shop management</strong> is strictly a business software technology solution. Our platform provides record-keeping, ledger calculation, and workflow automation tools for licensed pawn shop businesses. <strong>We do not offer loans, extend credit, hold banking licenses, or provide financial services directly.</strong>
            </p>
          </div>
        </div>

        {/* Section 1: Who We Are */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-brand-950">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Who We Are</h2>
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            GS Pawn shop management was created to address the daily operational challenges faced by traditional pawn shops and gold loan businesses. Pawnbroking has historically relied on manual paper registers, handwritten receipts, and error-prone interest calculations.
          </p>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Our team is committed to delivering practical, accessible digital management tools that safeguard customer records, eliminate calculation discrepancies, and enable pawn shop operators to manage their businesses with transparency and speed.
          </p>
        </section>

        {/* Section 2: What Our Software Does & Our Objectives */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-brand-950">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">What Our Software Does</h2>
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            GS Pawn shop management is a responsive, cloud-connected management suite designed to handle the end-to-end lifecycle of pawn pledges:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-brand-950 font-bold text-sm">
                <Users className="w-4 h-4 text-accent-600" />
                <span>Customer Record Management</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintain comprehensive customer profiles with mobile verification, address documentation, portrait attachments, and active pledge history.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-brand-950 font-bold text-sm">
                <Coins className="w-4 h-4 text-accent-600" />
                <span>Gold &amp; Silver Pledge Tracking</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Record ornament details, gross weight, net weight, weight units (g, mg, tola, pavan), and standardized purity touch (24K/999, 22K/916, 18K/750, 925 Silver).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-brand-950 font-bold text-sm">
                <Receipt className="w-4 h-4 text-accent-600" />
                <span>Payment &amp; Settlement Tracking</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automate statutory simple interest allocations (settling accrued interest before reducing loan principal), multi-mode split intake (Cash, UPI, Net Banking), and redemption closures.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center space-x-2 text-brand-950 font-bold text-sm">
                <BarChart3 className="w-4 h-4 text-accent-600" />
                <span>Business Analytics &amp; Reporting</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitor real-time shop performance, active principal outstanding, accrued interest balances, total closures, and portfolio health with interactive visual charts.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Purpose and Objectives */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-950">Our Purpose &amp; Objectives</h2>
          <ul className="space-y-3 text-slate-600 text-sm">
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Eliminate Mathematical Inaccuracies:</strong> Enforce integer-paise financial precision so every interest calculation matches statutory simple interest formulas without rounding drift.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Protect Business Continuity:</strong> Secure customer data with enterprise cloud backup in Google Cloud Mumbai (Asia-South1), multi-device heartbeat tracking, and local device security locks.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Streamline Counter Operations:</strong> Enable quick search by bill number, customer mobile, or party name, cutting counter transaction times from minutes to seconds.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Deliver Transparent Pricing:</strong> Provide honest annual subscription software plans without hidden transaction fees or lock-ins.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 4: Software Subscription Model */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 text-brand-950">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Subscription-Based Services</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            GS Pawn shop management is delivered as an annual Software-as-a-Service (SaaS) subscription. Subscriptions include continuous software updates, cloud database hosting, device session synchronization, and customer support.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-500">Standard Plan</span>
              <div className="text-lg font-bold text-brand-950 mt-1">Yearly Plan — ₹1,999 / year</div>
              <p className="text-xs text-slate-600 mt-1">
                Full pawn shop management tools with up to 3 simultaneous counter devices.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-accent-50/50 border border-accent-200">
              <span className="text-xs font-bold uppercase text-accent-700">Premium Plan</span>
              <div className="text-lg font-bold text-brand-950 mt-1">Yearly Premium Plan — ₹2,999 / year</div>
              <p className="text-xs text-slate-600 mt-1">
                All features with up to 9 devices, 90-day temporary staff passes, and live AI assistant support.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Confirmed Business Contact */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 space-y-4">
          <h2 className="text-xl font-bold text-white">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
            <div>
              <span className="text-slate-400 block text-xs">Business Name</span>
              <strong className="text-white text-base">GS Pawn shop management</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Official Email</span>
              <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-400 hover:underline">
                domnicsanjay2009@gmail.com
              </a>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Business Phone</span>
              <a href="tel:+919363200295" className="text-accent-400 hover:underline">
                +91 9363200295
              </a>
            </div>
            <div>
              <span className="text-slate-400 block text-xs">Operating Address</span>
              <span className="text-white">Ponneri, Thiruvallur, Tamil Nadu, India</span>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4 items-center justify-between text-xs">
            <span className="text-slate-400">
              Ready to explore our software?
            </span>
            <button
              onClick={() => onNavigate ? onNavigate('/') : window.location.href = '/'}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-bold transition-colors cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
