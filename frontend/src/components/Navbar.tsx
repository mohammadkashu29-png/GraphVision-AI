import React from 'react';
import { Menu, Activity, ShieldCheck, Sparkles, Server, CheckCircle2, AlertCircle } from 'lucide-react';

interface NavbarProps {
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  backendOnline: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  demoMode,
  setDemoMode,
  backendOnline,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Mobile hamburger & System Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 font-bold text-base">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm sm:text-base tracking-tight">
                  Handwriting AI System
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  B.Tech Capstone
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unified Recognition, Verification & Personality Analysis
              </p>
            </div>
          </div>
        </div>

        {/* Right: Backend Status & Demo Mode Switch */}
        <div className="flex items-center gap-4">
          
          {/* Backend Connection Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">FastAPI API:</span>
            {backendOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Offline
              </span>
            )}
          </div>

          {/* Demo Mode Toggle with Clear Warning */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="flex flex-col text-right">
              <span className="text-xs font-medium text-slate-200 flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Demo Mode
              </span>
              <span className="text-[10px] text-slate-400">
                {demoMode ? 'Simulated Fallback' : 'Strict Real Model'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => setDemoMode(!demoMode)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                demoMode ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  demoMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

        </div>

      </div>

      {/* Demo Mode Notice Banner if enabled */}
      {demoMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>
            <strong>DEMO MODE ACTIVE:</strong> Showing simulated responses for demonstration purposes when unattached ML checkpoints are unavailable.
          </span>
        </div>
      )}
    </header>
  );
};
