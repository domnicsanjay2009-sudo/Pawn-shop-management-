import React, { useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Lock,
  Phone,
  Mail,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface TermsAndConditionsPageProps {
  onNavigate?: (path: string) => void;
}

export const TermsAndConditionsPage: React.FC<TermsAndConditionsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Terms and Conditions - GS Pawn shop management';
    window.scrollTo(0, 0);
  }, []);

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <PublicHeader currentPath="/terms-and-conditions" onNavigate={onNavigate} />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-brand-950 via-slate-900 to-slate-900 text-white py-14 sm:py-16 px-4 sm:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-600/20 border border-accent-500/30 text-accent-400 text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Terms and Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            GS Pawn shop management • Version 2.0 • Effective Date: November 13, 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        {/* Notice Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900 text-xs sm:text-sm leading-relaxed">
          <p>
            Please read these Terms and Conditions carefully before registering, subscribing to, or accessing the <strong>GS Pawn shop management</strong> software platform. By creating an account or subscribing to our services, you agree to be legally bound by these terms.
          </p>
        </div>

        {/* 26 Structured Sections */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-8 text-sm leading-relaxed text-slate-700 divide-y divide-slate-100">
          
          {/* Section 1 */}
          <section className="space-y-2 pt-0">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">1. Introduction</h2>
            <p>
              These Terms and Conditions constitute a legally binding agreement between you (referred to as the "User", "Shop Owner", or "Subscriber") and <strong>GS Pawn shop management</strong> (referred to as "we", "us", or "our"), governing your access to and use of our web application, software tools, and related services hosted at <a href="https://pawnshopmanagement.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-accent-600 hover:underline font-mono">https://pawnshopmanagement.vercel.app/</a>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">2. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, registering an account, or subscribing to GS Pawn shop management, you acknowledge that you have read, understood, and agree to be bound by all provisions of these Terms and Conditions, our Privacy Policy, and our Refund Policy. If you do not agree to these terms, you must immediately cease using the platform.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">3. Description of Software Services</h2>
            <p>
              GS Pawn shop management is a specialized Software-as-a-Service (SaaS) application providing digital ledger management, pledge bill generation, customer records organization, simple interest mathematical calculations, and business reporting tools designed specifically for independent pawn shops, pawnbrokers, and jewellery loan counters.
            </p>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium">
              <strong>Important Clarification:</strong> GS Pawn shop management is strictly a software management tool. We do not provide money loans, financial credit, banking facilities, or pawn collateral holding services. All financial transactions, pledge contracts, interest rates, and loan disbursements are executed solely between the pawn shop owner and their customers.
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">4. User Registration</h2>
            <p>
              To access the software, shop owners must register an account by providing accurate and complete information, including Shop Name, Owner Name, Registered Email Address, Contact Phone Number, and Physical Shop Address. Each registered user must verify their email address via the verification link transmitted by our authentication system prior to workspace activation.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">5. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your authentication credentials, login passwords, counter PINs, and device lock settings. You must notify us immediately at <a href="mailto:domnicsanjay2009@gmail.com" className="text-accent-600 hover:underline">domnicsanjay2009@gmail.com</a> if you suspect any unauthorized access or breach of your account security.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">6. User Responsibilities</h2>
            <p>
              Users agree to use GS Pawn shop management exclusively for lawful pawnbroking business management in compliance with all applicable local, state, and national laws, pawnbrokers licensing regulations, and consumer protection standards. You are solely responsible for ensuring the accuracy and validity of all customer details, weights, pledged ornament descriptions, interest rates, and payment entries input into the application.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">7. Subscription Plans</h2>
            <p>
              GS Pawn shop management offers annual software subscription plans tailored to independent counter needs:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Yearly Plan:</strong> Includes unlimited pledge bills, customer records, payment tracking, redemption closures, business analytics, and simultaneous access on up to three (3) counter devices.
              </li>
              <li>
                <strong>Yearly Premium Plan:</strong> Includes all Yearly Plan features, plus expanded capacity for up to nine (9) simultaneous devices, 90-day temporary staff pass delegation, and priority AI customer care assistant support.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">8. Subscription Pricing</h2>
            <p>
              All published subscription prices are stated in Indian Rupees (INR):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
              <li><strong>Yearly Plan:</strong> ₹1,999 (Rupees One Thousand Nine Hundred Ninety-Nine only) per year.</li>
              <li><strong>Yearly Premium Plan:</strong> ₹2,999 (Rupees Two Thousand Nine Hundred Ninety-Nine only) per year.</li>
            </ul>
            <p className="text-xs text-slate-500">
              Pricing is transparent with no hidden setup fees. Any future adjustments in subscription pricing will be announced with prior notice and will only take effect on subsequent subscription renewals.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">9. Payment Processing</h2>
            <p>
              Subscription payments are processed securely through our verified payment gateway partner, <strong>Razorpay</strong>. We do not collect, process, or store credit card numbers, debit card PINs, CVV codes, or net banking passwords. Accepted payment methods include UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, Debit Cards, and Credit Cards supported by Razorpay.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">10. Subscription Activation</h2>
            <p>
              Software subscriptions are activated strictly upon successful payment verification confirmed by Razorpay webhook and server-side cryptographic signature validation on our trusted backend. Subscriptions will not be activated upon unverified bank debits without gateway confirmation.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">11. Subscription Duration</h2>
            <p>
              Each subscription plan is valid for a period of exactly 365 calendar days from the timestamp of confirmed activation. You may renew your subscription within 30 days of the expiration date to maintain uninterrupted access.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">12. Subscription Cancellation</h2>
            <p>
              Users may request cancellation of their subscription service at any time by contacting customer support. Cancelling a subscription does not immediately terminate an already paid subscription; your workspace access remains active until the end of your existing 365-day paid period. Cancellation does not provide an automatic refund entitlement.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">13. Refund Policy Reference</h2>
            <p>
              All refunds, duplicate payment investigations, and failed payment reversals are governed strictly by our published{' '}
              <button
                onClick={() => handleNav('/refund-policy')}
                className="text-accent-600 font-semibold hover:underline cursor-pointer"
              >
                Refund Policy
              </button>
              . Once a software subscription has been successfully activated, fees are generally non-refundable.
            </p>
          </section>

          {/* Section 14 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">14. Data Storage and Security</h2>
            <p>
              All application data is hosted securely on Google Cloud Firebase infrastructure with primary data residency in the Asia-South1 (Mumbai, India) region. Data in transit is secured with SSL/TLS 1.3 encryption. Access is strictly controlled through Firestore multi-tenant security rules based on authenticated Firebase user IDs.
            </p>
          </section>

          {/* Section 15 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">15. Customer Data Responsibilities</h2>
            <p>
              You retain sole ownership of all customer profiles, contact numbers, and pledge records you enter into your workspace. You are responsible for ensuring that customer personal data is collected with appropriate borrower consent under applicable Indian data privacy regulations.
            </p>
          </section>

          {/* Section 16 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">16. Service Availability</h2>
            <p>
              We endeavor to maintain high service availability (targeting 99.9% uptime). However, service interruptions may occasionally occur due to scheduled maintenance, cloud infrastructure updates, telecommunication outages, or circumstances beyond our reasonable control.
            </p>
          </section>

          {/* Section 17 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">17. Maintenance and Updates</h2>
            <p>
              We routinely deploy software improvements, calculation engine enhancements, security updates, and bug fixes. These updates are provided automatically to active subscribers at no additional cost.
            </p>
          </section>

          {/* Section 18 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">18. Acceptable Use</h2>
            <p>
              You agree not to: (a) reverse-engineer, decompile, or copy the software; (b) share account credentials with unauthorized third parties; (c) enter fraudulent, misleading, or fictitious financial records; (d) introduce malware, bots, or malicious scripts; or (e) use the platform for any illegal lending or extortion activities.
            </p>
          </section>

          {/* Section 19 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">19. Account Suspension</h2>
            <p>
              We reserve the right to temporarily suspend account access if we detect fraudulent activity, security vulnerabilities, abuse of multi-device session limits, or severe violations of these Terms and Conditions.
            </p>
          </section>

          {/* Section 20 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">20. Account Termination</h2>
            <p>
              You may terminate your account at any time by contacting support. Upon verified request for permanent account closure, all associated shop records, pledge ledgers, and customer files will be permanently purged from our active databases within thirty (30) business days.
            </p>
          </section>

          {/* Section 21 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">21. Intellectual Property</h2>
            <p>
              The GS Pawn shop management name, logos, software source code, user interface designs, mathematical calculation algorithms, documentation, and graphics are the exclusive intellectual property of GS Pawn shop management. You are granted a limited, non-exclusive, non-transferable license to use the software during your active subscription period.
            </p>
          </section>

          {/* Section 22 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">22. Third-Party Integrations</h2>
            <p>
              Our platform interfaces with reputable third-party infrastructure providers, notably Razorpay (for payment gateway operations) and Google Cloud / Firebase (for hosting and database storage). While we select dependable partners, we cannot be held liable for third-party gateway downtime or service degradations.
            </p>
          </section>

          {/* Section 23 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">23. Limitation of Liability</h2>
            <p>
              The software is provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by applicable law, GS Pawn shop management shall not be liable for any indirect, incidental, punitive, or consequential damages, loss of business profits, data corruption, or hardware failure resulting from the use or inability to use the software.
            </p>
          </section>

          {/* Section 24 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">24. Changes to Terms</h2>
            <p>
              We may periodically revise these Terms and Conditions to reflect regulatory updates, feature improvements, or operational changes. The latest version will always be published on this page with an updated effective date. Continued use of the software after changes are published constitutes your acceptance of the revised terms.
            </p>
          </section>

          {/* Section 25 */}
          <section className="space-y-2 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">25. Governing Law &amp; Dispute Jurisdiction</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any legal disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in Thiruvallur / Chennai, Tamil Nadu, India.
            </p>
          </section>

          {/* Section 26 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-brand-950">26. Contact Information</h2>
            <p>
              For legal inquiries, contract clarifications, or subscription support, please reach out to our official administrative desk:
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
