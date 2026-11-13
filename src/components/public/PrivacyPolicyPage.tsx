import React, { useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Database,
  Smartphone,
  Eye,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Shield,
  FileCheck
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PrivacyPolicyPageProps {
  onNavigate?: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Privacy Policy - GS Pawn shop management';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <PublicHeader currentPath="/privacy-policy" onNavigate={onNavigate} />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-brand-950 via-slate-900 to-slate-900 text-white py-14 sm:py-16 px-4 sm:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-600/20 border border-accent-500/30 text-accent-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data Protection &amp; Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            GS Pawn shop management • Version 2.0 • Effective Date: November 13, 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        
        {/* Intro Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-3">
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            At <strong>GS Pawn shop management</strong> ("we", "our", or "us"), we respect your privacy and are committed to protecting the confidential business records, pledge ledgers, and customer information managed through our software platform. This Privacy Policy details how we collect, store, synchronize, and safeguard data when you use our web application at <a href="https://pawnshopmanagement.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:underline font-mono">https://pawnshopmanagement.vercel.app/</a>.
          </p>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700 divide-y divide-slate-100">
          
          {/* Section 1: Information Collected */}
          <section className="space-y-3 pt-0">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">1</span>
              <span>Information We Collect</span>
            </h2>
            <p className="text-slate-600">
              We collect information strictly necessary to operate our counter software services:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Shop Owner Account Data:</strong> During registration, we collect Shop Name, Owner Full Name, Registered Email Address, Contact Mobile Number, and Physical Shop Address.
              </li>
              <li>
                <strong>Borrower / Customer Records Entered by Shop Owners:</strong> When you record a customer in your workspace, you enter customer identification (Customer Name, 10-digit mobile number, residential address) and optional customer portrait or identification document attachments.
              </li>
              <li>
                <strong>Pledge Collateral Records:</strong> Collateral classification (Gold, Silver, or Others), ornament description, gross weight, net weight, weight units (g, mg, tola, pavan), and standardized purity touch (24K/999, 22K/916, 18K/750, 925 Silver).
              </li>
              <li>
                <strong>Loan Terms &amp; Repayment History:</strong> Principal loan disbursement amount in exact integer paise, agreed statutory simple interest rate, duration (Daily, Weekly, Monthly, Yearly), issue date, target due date, partial repayments, payment mode allocations (Cash, UPI, Net Banking), and final redemption closure records.
              </li>
              <li>
                <strong>Authentication &amp; Session Identifiers:</strong> Authenticated Firebase User IDs (UIDs), login timestamps, session heartbeat intervals, and device browser user-agent tokens to enforce multi-device limits.
              </li>
              <li>
                <strong>Payment Gateway References:</strong> When paying for software subscriptions, we record Razorpay Order IDs, Payment IDs (`pay_...`), plan type, activation timestamp, and subscription expiry date. We do not collect or store banking passwords, UPI PINs, or credit card CVVs.
              </li>
            </ul>
          </section>

          {/* Section 2: How We Use Information */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">2</span>
              <span>How We Use Your Information</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>To provide, maintain, and secure the pawn shop management platform.</li>
              <li>To calculate mathematical simple interest allocations and remaining balances with integer-paise accuracy.</li>
              <li>To verify your identity upon login and enforce device session authorization.</li>
              <li>To process software subscription activations and renewals via Razorpay.</li>
              <li>To provide customer support and respond to technical or billing inquiries.</li>
              <li>We never sell, rent, commercialize, or share your customer ledgers with third-party marketers or advertisers.</li>
            </ul>
          </section>

          {/* Section 3: Cloud Infrastructure & Domestic Data Residency */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">3</span>
              <span>Data Storage &amp; Regional Infrastructure</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              All primary application databases (Cloud Firestore, Firebase Authentication, and Cloud Functions) are provisioned on Google Cloud Platform infrastructure hosted within the <strong>Asia-South1 (Mumbai, India)</strong> region. This ensures domestic Indian data residency, low network latency, and compliance with local digital record standards.
            </p>
          </section>

          {/* Section 4: Data Security & Access Controls */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>Security &amp; Tenant Isolation</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Multi-Tenant Data Isolation:</strong> Every record (customer, bill, payment, and closure) is strictly tagged with your unique `shopId`. Firestore database security rules prevent any shop owner from reading or modifying another shop's data.
              </li>
              <li>
                <strong>Encrypted Communications:</strong> All web traffic between your browser and our servers is encrypted using standard HTTPS / TLS 1.3 encryption.
              </li>
              <li>
                <strong>Device Protection:</strong> The application incorporates local app PIN / Password lock protection, biometric WebAuthn verification, and automatic counter inactivity timeouts to prevent unauthorized walk-up access.
              </li>
            </ul>
          </section>

          {/* Section 5: Third-Party Service Providers */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">5</span>
              <span>Third-Party Service Providers</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              We partner with trusted service providers to deliver our software:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Razorpay:</strong> Razorpay Software Private Limited processes online subscription payments. Payment data provided during checkout is governed by Razorpay's PCI-DSS compliant infrastructure and privacy policies.
              </li>
              <li>
                <strong>Google Cloud Firebase:</strong> Google LLC provides database hosting, user authentication, and cloud function runtime environments.
              </li>
              <li>
                <strong>Vercel:</strong> Vercel Inc. hosts the production web application front-end delivery and serverless API routing.
              </li>
            </ul>
          </section>

          {/* Section 6: Data Retention & Account Deletion Requests */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">6</span>
              <span>Data Retention &amp; Deletion Rights</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              We retain your shop records for as long as your workspace remains registered. If you choose to discontinue using GS Pawn shop management, you may request permanent deletion of your account and associated records:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>Send an official account closure request from your registered email to <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-600 hover:underline">domnicsanjay2009@gmail.com</a>.</li>
              <li>Upon verification of shop ownership, all customer profiles, pledge ledgers, payment histories, and uploaded media files will be permanently purged from our active Firestore database within thirty (30) business days.</li>
            </ul>
          </section>

          {/* Section 7: Inquiries and Contact Details */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-bold">7</span>
              <span>Privacy Inquiries &amp; Contact Information</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              If you have any questions, compliance inquiries, or concerns regarding this Privacy Policy or your data, please contact our administrative desk:
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <p><strong>Business Name:</strong> GS Pawn shop management</p>
              <p>
                <strong>Official Email:</strong>{' '}
                <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-600 hover:underline">
                  domnicsanjay2009@gmail.com
                </a>
              </p>
              <p>
                <strong>Business Phone:</strong>{' '}
                <a href="tel:+919363200295" className="text-accent-600 hover:underline font-mono">
                  +91 9363200295
                </a>
              </p>
              <p><strong>Address:</strong> Ponneri, Thiruvallur, Tamil Nadu, India</p>
              <p>
                <strong>Production Website:</strong>{' '}
                <a
                  href="https://pawnshopmanagement.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-600 hover:underline font-mono"
                >
                  https://pawnshopmanagement.vercel.app/
                </a>
              </p>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
