import React, { useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface RefundPolicyPageProps {
  onNavigate?: (path: string) => void;
}

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Refund Policy - GS Pawn shop management';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <PublicHeader currentPath="/refund-policy" onNavigate={onNavigate} />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-brand-950 via-slate-900 to-slate-900 text-white py-14 sm:py-16 px-4 sm:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-600/20 border border-accent-500/30 text-accent-400 text-xs font-semibold uppercase tracking-wider">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Billing &amp; Cancellation Policy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            GS Pawn shop management • Effective Date: November 13, 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        
        {/* Policy Summary Callout */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2.5 text-brand-950 font-bold text-base">
            <CreditCard className="w-5 h-5 text-accent-600" />
            <span>Policy Overview &amp; Transparency Statement</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            At <strong>GS Pawn shop management</strong>, we are committed to complete transparency regarding our software subscription fees, payment processing, duplicate charge reviews, and cancellation procedures. This Refund Policy outlines the exact terms and rules governing payment transactions processed through our Razorpay integration.
          </p>
        </div>

        {/* Core Approved Business Decisions */}
        <div className="space-y-6">

          {/* 6.1 Activated Subscriptions */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-200">
                6.1
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-950">
                Activated Subscriptions — No Refunds
              </h2>
            </div>
            
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl text-rose-950 text-xs sm:text-sm font-semibold">
              Decision: NO REFUNDS after successful subscription activation.
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Once a software subscription (Yearly Plan or Yearly Premium Plan) has been successfully activated following verified payment, <strong>subscription fees are strictly non-refundable</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Cancelling a subscription does not automatically create a refund entitlement.</li>
                <li>The subscriber continues to enjoy full, uninterrupted access to their paid subscription features and counter tools until the published expiry date of the 365-day paid period.</li>
                <li>Because instant digital provisioning, database allocation, and cloud resources are deployed immediately upon activation, no pro-rated or partial refunds are provided for unused portions of the term.</li>
              </ul>
            </div>
          </section>

          {/* 6.2 Duplicate Payments */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                6.2
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-950">
                Duplicate Payments — Case-by-Case Review
              </h2>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-950 text-xs sm:text-sm font-semibold">
              Decision: CASE-BY-CASE REVIEW upon verification.
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                If a customer believes they have been inadvertently charged more than once for the same subscription period due to network lag, accidental double-clicks, or browser refreshes during payment:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>The customer must contact our official support team promptly.</li>
                <li>The customer must provide their registered email address, payment reference, Razorpay transaction ID (`pay_...`), and relevant payment timestamp.</li>
                <li>Our billing team will cross-check the transaction references against actual Razorpay settlement logs and bank reconciliation reports.</li>
                <li>If a genuine duplicate payment is confirmed, GS Pawn shop management will determine the appropriate correction or process a refund for the duplicate transaction back to the original payment source.</li>
                <li>Refund approvals are not promised automatically prior to thorough database and gateway verification.</li>
              </ul>
            </div>
          </section>

          {/* 6.3 Failed Payments */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-accent-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                6.3
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-950">
                Failed Payments — Payment Provider Reversal Process
              </h2>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-blue-950 text-xs sm:text-sm font-semibold">
              Decision: AUTOMATIC PAYMENT PROVIDER REVERSAL / REFUND PROCESS applies.
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                In situations where a payment attempt fails, drops due to network connectivity issues, or times out, but the subscription amount is debited from your bank account, card, or UPI app:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>Automatic Reversal:</strong> The payment provider's (Razorpay / user's issuing bank) standard automated reversal and refund protocol will apply. Under standard Indian banking rules, such funds are routinely reconciled and credited back to the original source account within 5 to 7 business banking days.
                </li>
                <li>
                  <strong>Verification Required:</strong> Payment status must be verified against Razorpay's actual transaction database. A subscription is <em>never</em> marked active merely because a user reports an account debit without a corresponding successful gateway transaction confirmation.
                </li>
                <li>
                  <strong>Do Not Re-Attempt Repeatedly:</strong> Users should avoid initiating repeated checkout attempts while an earlier debit is still undergoing bank reconciliation.
                </li>
                <li>
                  <strong>Support Assistance:</strong> If the debited amount is not automatically reversed within the applicable payment provider timeline, customers should contact our support team with their UPI / bank UTR reference number for investigation.
                </li>
              </ul>
            </div>
          </section>

          {/* 6.4 Subscription Cancellation */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                6.4
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-950">
                Subscription Cancellation — Access Continues Until End of Paid Term
              </h2>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-purple-950 text-xs sm:text-sm font-semibold">
              Decision: ACCESS CONTINUES UNTIL THE END OF THE PAID PERIOD.
            </div>

            <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Shop owners may request subscription cancellation at any time:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Cancellation does not immediately terminate an already paid subscription.</li>
                <li>Your account and software access remain fully functional until the scheduled subscription expiry date.</li>
                <li>Cancellation does not automatically create an entitlement to a cash or pro-rated refund for the remaining days of the paid year.</li>
                <li>Subscriptions do not automatically debit your account without explicit user checkout initiation.</li>
              </ul>
            </div>
          </section>

          {/* 6.5 Refund Request Procedure */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                6.5
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-brand-950">
                Refund &amp; Review Request Procedure
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              To request an investigation regarding a suspected duplicate payment or payment discrepancy, follow this standard procedure:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h4 className="font-bold text-brand-950 text-xs">Contact Official Support</h4>
                <p className="text-[11px] text-slate-500">
                  Email us at <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-600 hover:underline">domnicsanjay2009@gmail.com</a> or call <a href="tel:+919363200295" className="text-accent-600 hover:underline">+91 9363200295</a>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h4 className="font-bold text-brand-950 text-xs">Registered Email Address</h4>
                <p className="text-[11px] text-slate-500">
                  Provide the exact registered email ID used to create your shop account.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h4 className="font-bold text-brand-950 text-xs">Transaction ID &amp; Date</h4>
                <p className="text-[11px] text-slate-500">
                  Supply the exact date, time, and debited amount (₹1,999 or ₹2,999).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">4</span>
                <h4 className="font-bold text-brand-950 text-xs">Razorpay Payment ID</h4>
                <p className="text-[11px] text-slate-500">
                  Provide the Razorpay reference number (e.g. `pay_...` or Order ID) from your receipt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">5</span>
                <h4 className="font-bold text-brand-950 text-xs">Explain the Issue</h4>
                <p className="text-[11px] text-slate-500">
                  Clearly describe the circumstances (e.g., duplicate charge, bank debit without activation).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-brand-950 text-white flex items-center justify-center text-xs font-bold">6</span>
                <h4 className="font-bold text-brand-950 text-xs">Support Resolution</h4>
                <p className="text-[11px] text-slate-500">
                  Our team reviews gateway logs and responds with status within 24 to 48 business hours.
                </p>
              </div>
            </div>
          </section>

          {/* 6.6 Policy Transparency & Business Contact */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-slate-800 text-accent-400 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700">
                6.6
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Policy Transparency &amp; Contact Information
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              This policy is permanently published, maintained, and accessible to customers prior to initiating any subscription payment on our checkout interface.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block text-[11px]">Business Name</span>
                <strong className="text-white text-sm">GS Pawn shop management</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Official Support Email</span>
                <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-400 hover:underline">
                  domnicsanjay2009@gmail.com
                </a>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Official Support Phone</span>
                <a href="tel:+919363200295" className="text-accent-400 hover:underline font-mono">
                  +91 9363200295
                </a>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Address</span>
                <span className="text-white">Ponneri, Thiruvallur, Tamil Nadu, India</span>
              </div>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
