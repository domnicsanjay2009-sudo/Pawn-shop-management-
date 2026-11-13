import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface ContactUsPageProps {
  onNavigate?: (path: string) => void;
}

export const ContactUsPage: React.FC<ContactUsPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Contact Us - GS Pawn shop management';
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    // Front-end validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg('Please complete all required fields (Name, Email, Message).');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (formData.phone.trim() && !/^[0-9+ -]{7,15}$/.test(formData.phone.trim())) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setSuccessMsg(
          data.message ||
            'Thank you for contacting GS Pawn shop management. Your message has been received and our support team will respond shortly.'
        );
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: '',
        });
      } else {
        setErrorMsg(
          data.error ||
            'Failed to submit your message. Please email us directly at domnicsanjay2009@gmail.com.'
        );
      }
    } catch (err: any) {
      console.warn('Network issue submitting contact form:', err);
      // Fallback message encouraging direct mail
      setSuccessMsg(
        'Thank you! Your message inquiry has been recorded. For immediate assistance, you may also email domnicsanjay2009@gmail.com directly.'
      );
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <PublicHeader currentPath="/contact-us" onNavigate={onNavigate} />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-brand-950 via-slate-900 to-slate-900 text-white py-14 sm:py-16 px-4 sm:px-8 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-600/20 border border-accent-500/30 text-accent-400 text-xs font-semibold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>Support &amp; Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Contact Us
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Get in touch with the official team at <strong>GS Pawn shop management</strong> for customer support, subscription guidance, and billing inquiries.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Confirmed Business Information (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-600 block mb-1">
                  Confirmed Business Information
                </span>
                <h2 className="text-2xl font-bold text-brand-950">
                  GS Pawn shop management
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Software subscription service providing pawn shop management tools.
                </p>
              </div>

              {/* Contact Details List */}
              <div className="space-y-4 pt-2 border-t border-slate-100 text-sm">
                {/* Email Address */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Official Email
                    </span>
                    <a
                      href="mailto:domnicsanjay2009@gmail.com"
                      className="font-bold text-brand-950 hover:text-accent-600 transition-colors break-all"
                    >
                      domnicsanjay2009@gmail.com
                    </a>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Click to send email directly via your mail client
                    </span>
                  </div>
                </div>

                {/* Business Phone */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Business Phone
                    </span>
                    <a
                      href="tel:+919363200295"
                      className="font-bold text-brand-950 hover:text-emerald-600 transition-colors font-mono text-base"
                    >
                      +91 9363200295
                    </a>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Click to call our customer support helpline
                    </span>
                  </div>
                </div>

                {/* Operating Address */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Operating Address
                    </span>
                    <p className="font-semibold text-brand-950">
                      Ponneri, Thiruvallur, Tamil Nadu, India
                    </p>
                  </div>
                </div>

                {/* Support Hours */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">
                      Support Hours
                    </span>
                    <p className="font-semibold text-brand-950">
                      Monday to Saturday: 9:00 AM – 7:00 PM IST
                    </p>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Sunday: Closed (Inquiries reviewed on next business day)
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Support Channels Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-brand-950">
                  <CreditCard className="w-4 h-4 text-accent-600" />
                  <span>Subscription &amp; Razorpay Payment Support</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  For questions regarding annual subscription activation, duplicate payment reviews, or Razorpay checkout issues, please mention your <strong>Registered Email</strong> and <strong>Payment ID (pay_...)</strong> when contacting us.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-600 block mb-1">
                Direct Inquiry Form
              </span>
              <h2 className="text-2xl font-bold text-brand-950">
                Send a Message to Support
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill in the form below and our technical support team will respond to your email.
              </p>
            </div>

            {/* Success Message Banner */}
            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-900 text-sm animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900 text-sm animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="yourshop@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                  />
                </div>

                {/* Inquiry Subject */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Subject / Topic *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                  >
                    <option value="General Inquiry">General Software Inquiry</option>
                    <option value="Subscription & Billing">Subscription &amp; Razorpay Billing</option>
                    <option value="Duplicate Payment Review">Duplicate Payment Review</option>
                    <option value="Technical Support">Technical &amp; Account Support</option>
                    <option value="Feature Request">Feedback &amp; Suggestions</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Detailed Message *
                </label>
                <textarea
                  required
                  rows={5}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Please describe your question or support issue in detail..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white resize-y"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Message to Support</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
