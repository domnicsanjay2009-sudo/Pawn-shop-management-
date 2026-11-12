import React from 'react';
import { ShieldCheck, X, FileText, Lock, Database, PhoneCall, CheckCircle2, AlertCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-accent-600/30 text-accent-400 flex items-center justify-center border border-accent-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Privacy Policy & Compliance</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Pawn Shop Management Application • Version 1.2 • Effective Date: November 12, 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed divide-y divide-slate-100">
          {/* Section 1 & 2 */}
          <div className="space-y-3 pt-0">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">1</span>
              <span>Application Overview & Purpose</span>
            </h3>
            <p>
              The Pawn Shop Management Web Application is a specialized business ledger and counter management software designed for independent pawn shops, gold loan operators, and jewellery lenders. The system enables licensed pawn shop owners to digitally manage customer pledges, calculate simple interest based on statutory durations, record regular and partial payments, and issue final closing receipts.
            </p>
            <p>
              This Privacy Policy details the exact data collection, storage, operational security, and retention policies enforced across the platform.
            </p>
          </div>

          {/* Section 3 & 4 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">2</span>
              <span>Customer Records & Pledge Information</span>
            </h3>
            <p>
              To maintain accurate records compliant with local pawnbroking trade practices, shop owners enter basic borrower information and collateral pledges into their private workspace:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Customer Identification:</strong> Customer name, 10-digit mobile contact number, street address, and optional customer portrait or identification documents.</li>
              <li><strong>Collateral Specifications:</strong> Pledge item category (Gold, Silver, or Others), ornament description, gross weight, net weight, weight units (g, mg, tola, pavan), and standardized purity touch.</li>
              <li><strong>Financial Loan Terms:</strong> Principal disbursed amount (recorded in exact paise), agreed interest rate, interest duration (Daily, Weekly, Monthly, Yearly), loan issue date, and target due date.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">3</span>
              <span>Payment & Financial Transaction Management</span>
            </h3>
            <p>
              Every payment recorded through the platform follows an immutable accounting ledger model. Under standard rules, received funds settle accrued interest first before reducing the remaining principal balance.
            </p>
            <p>
              Multi-mode split payments (Cash, GPay/PhonePe, and Net Banking) are supported. Each transaction atomically records individual mode allocations, timestamp, receiving shop identifier, and authenticated staff reference. Historical payment records cannot be arbitrarily modified or deleted.
            </p>
          </div>

          {/* Section 6 & 7 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">4</span>
              <span>Data Storage Infrastructure & Account Security</span>
            </h3>
            <p>
              All primary application data is stored using Google Cloud Firebase (Cloud Firestore, Firebase Authentication, and Cloud Functions) deployed in the Asia-South1 (Mumbai, India) region to ensure low network latency and domestic data residency.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Identity Security:</strong> Account identity is permanently anchored to unique Firebase Authentication UIDs. Email addresses serve only as contact references and require mandatory verification before change.</li>
              <li><strong>Session Management:</strong> Active counter sessions persist up to 24 hours via secure browser local persistence and undergo periodic heartbeat monitoring.</li>
              <li><strong>Local App Lock:</strong> Devices are further secured with local PIN or Password locks and biometric WebAuthn platform authentication with automatic 2-minute inactivity protection.</li>
            </ul>
          </div>

          {/* Section 8 & 9 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">5</span>
              <span>Subscription Processing & Device Registry</span>
            </h3>
            <p>
              Subscription purchases (Yearly and Yearly Premium) are processed via Razorpay's secure payment gateway. The application does not collect, process, or store credit card numbers, debit card PINs, UPI PINs, or banking passwords. All payment transactions are verified through server-side webhooks and HMAC-SHA256 signature checks.
            </p>
            <p>
              Device registration tracks hardware device types, operating systems, and browsers solely to enforce active device limits per subscription plan and provide remote revocation controls against lost or unauthorized devices.
            </p>
          </div>

          {/* Section 10, 11 & 12 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">6</span>
              <span>Data Isolation, Synchronization & Retention</span>
            </h3>
            <p>
              Strict shop-level data isolation is enforced at the database level by Cloud Firestore Security Rules. No shop owner or external party can read, query, or mutate customer records, pledge bills, or payments belonging to another shop.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Offline Resilience:</strong> In-memory caching and local storage maintain continuity during temporary network drops; synchronization commits safely to the cloud upon reconnection.</li>
              <li><strong>Retention Practice:</strong> Active and closed bills remain in the shop's ledger indefinitely as required by financial auditing laws until the account holder requests formal deletion.</li>
              <li><strong>Backup & Disaster Recovery:</strong> Managed by Google Cloud's distributed infrastructure with multi-zone automated backups.</li>
            </ul>
          </div>

          {/* Section 13, 14 & 15 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">7</span>
              <span>Confidentiality & Security Controls</span>
            </h3>
            <p>
              Customer records are treated as strictly confidential proprietary assets of the subscribing shop. The platform does not sell, rent, monetize, or share customer contact lists, pledge valuations, or loan volumes with third-party advertisers or lead brokers.
            </p>
            <p>
              All transit communications are encrypted with TLS 1.3 / HTTPS. Firestore documents are protected with server-evaluated permissions preventing direct client-side deletions of historical financial records.
            </p>
          </div>

          {/* Section 16, 17, 18 & 19 */}
          <div className="space-y-3 pt-6">
            <h3 className="text-base font-bold text-brand-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-accent-600 flex items-center justify-center text-xs font-black">8</span>
              <span>Third Parties, Account Deletion & Support</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Third-Party Services:</strong> Google Cloud Firebase (hosting, auth, database, cloud functions) and Razorpay (payment processing).</li>
              <li><strong>Account Closure & Deletion:</strong> Shop owners may request complete termination of their workspace and deletion of customer data by contacting the platform administrator via the in-app Customer Care Chat. Data purge is completed within 30 days following closure verification.</li>
              <li><strong>Policy Updates:</strong> Material modifications to this privacy policy will be announced through an in-app notice banner with the updated effective date.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            For privacy inquiries or compliance questions, please use the in-app <strong>Customer Care & AI Chat</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
