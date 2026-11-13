import React, { useState } from 'react';
import { ShieldCheck, Menu, X, ArrowRight, Phone, Mail } from 'lucide-react';

interface PublicHeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ currentPath = '/', onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about-us' },
    { label: 'Contact Us', path: '/contact-us' },
    { label: 'Terms & Conditions', path: '/terms-and-conditions' },
    { label: 'Refund Policy', path: '/refund-policy' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brand-950/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top micro-bar with verified business contact */}
      <div className="bg-slate-900/90 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800/60 hidden sm:flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <span className="font-semibold text-accent-400">GS Pawn shop management</span>
          <span className="text-slate-400 hidden md:inline">Ponneri, Thiruvallur, Tamil Nadu, India</span>
        </div>
        <div className="flex items-center space-x-5">
          <a
            href="tel:+919363200295"
            className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <Phone className="w-3 h-3 text-accent-400" />
            <span>+91 9363200295</span>
          </a>
          <a
            href="mailto:domnicsanjay2009@gmail.com"
            className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <Mail className="w-3 h-3 text-accent-400" />
            <span>domnicsanjay2009@gmail.com</span>
          </a>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={() => handleNav('/')}
          className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-600 to-accent-500 flex items-center justify-center shadow-md shadow-accent-600/30 group-hover:scale-105 transition-transform shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              GS Pawn shop <span className="text-accent-400 font-light">management</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Software Subscription Service
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
          {navLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right CTA */}
        <div className="hidden sm:flex items-center space-x-3">
          <button
            onClick={() => handleNav('/')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold shadow-md shadow-accent-600/20 transition-all cursor-pointer"
          >
            <span>Open Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center space-x-2">
          <button
            onClick={() => handleNav('/')}
            className="sm:hidden px-3 py-1.5 rounded-lg bg-accent-600 text-white text-xs font-bold"
          >
            App
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-brand-950 border-b border-slate-800 px-6 py-4 space-y-2 animate-fadeIn">
          {navLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-600/20 text-accent-400 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="tel:+919363200295"
              className="flex items-center space-x-2 text-xs text-slate-300 py-1"
            >
              <Phone className="w-3.5 h-3.5 text-accent-400" />
              <span>+91 9363200295</span>
            </a>
            <a
              href="mailto:domnicsanjay2009@gmail.com"
              className="flex items-center space-x-2 text-xs text-slate-300 py-1"
            >
              <Mail className="w-3.5 h-3.5 text-accent-400" />
              <span>domnicsanjay2009@gmail.com</span>
            </a>
            <button
              onClick={() => handleNav('/')}
              className="w-full mt-2 py-2.5 bg-accent-600 text-white text-xs font-bold rounded-xl text-center"
            >
              Launch Software Application
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
