import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, ExternalLink, ShieldAlert, CreditCard } from 'lucide-react';

interface PublicFooterProps {
  onNavigate?: (path: string) => void;
  compact?: boolean;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate, compact = false }) => {
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const currentYear = new Date().getFullYear();

  if (compact) {
    return (
      <footer className="w-full bg-brand-950 border-t border-slate-800 text-slate-400 py-6 px-4 sm:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <span className="font-bold text-white">GS Pawn shop management</span>
            <span className="mx-2 text-slate-600">•</span>
            <span>Ponneri, Thiruvallur, Tamil Nadu, India</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <button
              onClick={() => handleNav('/about-us')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => handleNav('/contact-us')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Contact Us
            </button>
            <button
              onClick={() => handleNav('/terms-and-conditions')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <button
              onClick={() => handleNav('/refund-policy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Refund Policy
            </button>
            <button
              onClick={() => handleNav('/privacy-policy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>

          <div className="text-slate-500">
            &copy; {currentYear} GS Pawn shop management.
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-[#050811] border-t border-slate-800 text-slate-400 pt-12 pb-8 px-4 sm:px-8 text-xs relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {/* Col 1: Business Overview */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center text-white font-bold shadow-md shadow-accent-600/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">GS Pawn shop management</h3>
              <p className="text-[11px] text-accent-400">Software Subscription Service</p>
            </div>
          </div>
          <p className="text-slate-400 leading-relaxed text-xs">
            GS Pawn shop management is a specialized software subscription service providing digital ledger, pledge tracking, customer records, and interest calculation tools for pawn shops.
          </p>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-accent-400" />
            <span>Secure Razorpay Gateway Integration</span>
          </div>
        </div>

        {/* Col 2: Official Contact Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Contact Us</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-accent-400 shrink-0 mt-0.5" />
              <span>Ponneri, Thiruvallur, Tamil Nadu, India</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-accent-400 shrink-0" />
              <a
                href="tel:+919363200295"
                className="hover:text-white transition-colors font-medium text-slate-300"
              >
                +91 9363200295
              </a>
            </li>
            <li className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-accent-400 shrink-0" />
              <a
                href="mailto:domnicsanjay2009@gmail.com"
                className="hover:text-white transition-colors font-medium text-slate-300 break-all"
              >
                domnicsanjay2009@gmail.com
              </a>
            </li>
            <li className="text-[11px] text-slate-500 pt-1">
              Support Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST
            </li>
          </ul>
        </div>

        {/* Col 3: Legal & Regulatory Policies */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Legal &amp; Policies</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => handleNav('/about-us')}
                className="hover:text-accent-400 transition-colors cursor-pointer text-left"
              >
                About Us
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('/contact-us')}
                className="hover:text-accent-400 transition-colors cursor-pointer text-left"
              >
                Contact Us
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('/terms-and-conditions')}
                className="hover:text-accent-400 transition-colors cursor-pointer text-left"
              >
                Terms and Conditions
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('/refund-policy')}
                className="hover:text-accent-400 transition-colors cursor-pointer text-left font-medium text-accent-400/90"
              >
                Refund Policy
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('/privacy-policy')}
                className="hover:text-accent-400 transition-colors cursor-pointer text-left"
              >
                Privacy Policy
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Subscription & Compliance Statement */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Software Subscriptions</h4>
          <p className="text-slate-400 leading-relaxed text-xs">
            Annual subscription access provides complete pawn shop record management, customer tracking, pledge settlements, and multi-device access.
          </p>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Technology Provider Disclaimer</span>
            </div>
            <p className="leading-normal">
              GS Pawn shop management is strictly a software management tool. We do not provide loans, credit, or financial services.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
        <div>
          &copy; {currentYear} GS Pawn shop management. All rights reserved.
        </div>
        <div className="text-center sm:text-right">
          Official Domain:{' '}
          <a
            href="https://pawnshopmanagement.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors font-mono"
          >
            pawnshopmanagement.vercel.app
          </a>
        </div>
      </div>
    </footer>
  );
};
