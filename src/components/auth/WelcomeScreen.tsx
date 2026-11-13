import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { PublicFooter } from '../public/PublicFooter';

interface WelcomeScreenProps {
  onOpenLogin: () => void;
  onNavigate?: (path: string) => void;
}

const MOTIVATIONAL_LINES = [
  "Empowering trusted, transparent financial partnerships.",
  "Precision ledger and automated pledge accounting made effortless.",
  "Security, speed, and real-time business clarity at your fingertips.",
  "Built with enterprise-grade protection for your precious shop records.",
  "Manage gold, silver, and party ledgers with complete peace of mind."
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenLogin, onNavigate }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLineIndex((prev) => (prev + 1) % MOTIVATIONAL_LINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <div className="relative z-10 flex items-center justify-between p-6 sm:px-12 pt-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-600 to-accent-500 flex items-center justify-center shadow-lg shadow-accent-600/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              GS Pawn shop <span className="text-accent-400 font-light">management</span>
            </h1>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Software Subscription Service
            </p>
          </div>
        </div>

        {/* Quick public navigation */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-slate-400">
          <button
            onClick={() => onNavigate ? onNavigate('/about-us') : (window.location.href = '/about-us')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            About Us
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('/contact-us') : (window.location.href = '/contact-us')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Contact Us
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('/refund-policy') : (window.location.href = '/refund-policy')}
            className="text-accent-400 hover:text-accent-300 font-medium transition-colors cursor-pointer"
          >
            Refund Policy
          </button>
        </div>
      </div>

      {/* Center Welcome Card */}
      <div className="relative z-10 max-w-xl mx-auto my-auto text-center py-12 px-4">
        {/* Fixed Heading */}
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Hi, Welcome
        </h2>

        {/* Rotating Encouraging Line */}
        <div className="h-16 flex items-center justify-center">
          <p
            key={currentLineIndex}
            className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-md transition-all duration-500 animate-fadeIn"
          >
            {MOTIVATIONAL_LINES[currentLineIndex]}
          </p>
        </div>

        {/* Only Primary Action Button: "Secure Login" */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={onOpenLogin}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-accent-600 rounded-xl shadow-xl shadow-accent-600/25 hover:bg-accent-500 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <span>Secure Login</span>
            <ArrowRight className="w-5 h-5 ml-2.5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Full Public Footer with all 5 mandatory policy links and confirmed business details */}
      <div className="relative z-10">
        <PublicFooter onNavigate={onNavigate} compact={false} />
      </div>
    </div>
  );
};
