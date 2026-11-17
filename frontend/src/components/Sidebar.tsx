import React from 'react';
import {
  LayoutDashboard,
  FileText,
  UserCheck,
  ShieldCheck,
  Brain,
  Layers,
  BookOpen,
  History,
  X,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export type PageId =
  | 'landing'
  | 'dashboard'
  | 'htr'

  | 'signature'
  | 'personality'
  | 'unified'
  | 'methodology'
  | 'results';

interface SidebarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const navItems = [
    {
      id: 'dashboard' as PageId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Main',
      badgeColor: 'bg-brand-500/10 text-brand-400 border-brand-500/20'
    },
    {
      id: 'htr' as PageId,
      label: 'Text Recognition (HTR)',
      icon: FileText,
      badge: 'TrOCR',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    
    {
      id: 'signature' as PageId,
      label: 'Signature Verification',
      icon: ShieldCheck,
      badge: 'Siamese',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'personality' as PageId,
      label: 'Personality Analysis',
      icon: Brain,
      badge: 'Experimental',
      badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    },
    {
      id: 'unified' as PageId,
      label: 'Complete Analysis',
      icon: Layers,
      badge: 'Unified',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'methodology' as PageId,
      label: 'Methodology & Datasets',
      icon: BookOpen,
      badge: 'Academic',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'results' as PageId,
      label: 'Results & History',
      icon: History,
      badge: 'Logs',
      badgeColor: 'bg-slate-700/60 text-slate-300 border-slate-600'
    },
  ];

  const handleNavClick = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-20 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header / Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white text-sm">
              AI
            </div>
            <span className="font-semibold text-slate-100 text-sm">Navigation</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Capstone Tag */}
        <div className="p-4 border-b border-slate-800/80 hidden md:block">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider block">
              Capstone Architecture
            </span>
            <h2 className="text-xs font-medium text-slate-200 mt-0.5">
              Multimodal Handwriting Suite
            </h2>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>FastAPI Backend Ready</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => handleNavClick('landing')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              currentPage === 'landing'
                ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-brand-400"></span>
              Overview & Landing
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <div className="pt-2 pb-1">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Core Modules
            </p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : `${item.badgeColor}`
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Academic Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-500">
          <p className="font-medium text-slate-400">B.Tech Capstone Project</p>
          <p className="text-[10px] mt-0.5">IAM • CEDAR • Graphology</p>
          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex justify-between items-center">
            <span>v2.4 Prototype</span>
            <span className="text-emerald-400 font-mono">Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
};
