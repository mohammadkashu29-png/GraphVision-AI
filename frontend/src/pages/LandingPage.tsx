import React from 'react';
import {
  FileText,
  UserCheck,
  ShieldCheck,
  Brain,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Database,
  Cpu,
  BookOpen,
  Award
} from 'lucide-react';
import { PageId } from '../components/Sidebar';
import { WorkflowDiagram } from '../components/WorkflowDiagram';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-12 py-4">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12 lg:p-16 text-center glow-card">
        {/* Background glow orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Final-Year B.Tech Capstone Project</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-cyan-400 to-teal-300">Handwriting Analysis</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            An integrated system for handwritten text recognition, signature verification, and experimental personality handwriting analysis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>Start Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('unified')}
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-medium text-sm border border-slate-700 transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-brand-400" />
              <span>Explore Unified Suite</span>
            </button>
          </div>
        </div>
      </section>

      {/* System Workflow Visualization */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">System Architecture &amp; Workflow</h2>
            <p className="text-xs text-slate-400">Sequential pipeline from raw document acquisition to multi-task inference</p>
          </div>
          <button
            onClick={() => onNavigate('methodology')}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
          >
            <span>Full Methodology</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <WorkflowDiagram type="general" />
      </section>

      {/* Four Core Module Cards */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Four Integrated Research Modules</h2>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated deep-learning architectures trained on standardized benchmark datasets
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: HTR */}
          <div
            onClick={() => onNavigate('htr')}
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850/80 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-medium uppercase tracking-wider block">
                Module 01 • TrOCR
              </span>
              <h3 className="text-base font-semibold text-white mt-1 group-hover:text-emerald-300 transition-colors">
                Handwritten Text Recognition
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Convert handwritten text into digital text.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-slate-500">IAM Benchmark</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium group-hover:translate-x-1 transition-transform">
                Launch <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>


          

          {/* Card 3: Signature Verification */}
          <div
            onClick={() => onNavigate('signature')}
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850/80 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-medium uppercase tracking-wider block">
                Module 03 • Siamese Net
              </span>
              <h3 className="text-base font-semibold text-white mt-1 group-hover:text-amber-300 transition-colors">
                Signature Verification
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Compare signatures and determine whether they are genuine or potentially forged.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-slate-500">CEDAR Dataset</span>
              <span className="flex items-center gap-1 text-amber-400 font-medium group-hover:translate-x-1 transition-transform">
                Launch <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 4: Personality Analysis */}
          <div
            onClick={() => onNavigate('personality')}
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/40 hover:bg-slate-850/80 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-pink-400 font-medium uppercase tracking-wider block">
                Module 04 • Graphology
              </span>
              <h3 className="text-base font-semibold text-white mt-1 group-hover:text-pink-300 transition-colors">
                Personality Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Analyze handwriting characteristics using an experimental graphology-based approach.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px] text-amber-400/80">Experimental</span>
              <span className="flex items-center gap-1 text-pink-400 font-medium group-hover:translate-x-1 transition-transform">
                Launch <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Dataset & Methodology Academic Note */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400">
            <Database className="w-4 h-4" />
            <span>Academic Rigor &amp; Dataset Separation</span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            "Because the four tasks represent different machine-learning problems, benchmark datasets are used per module and the models are integrated at the application/system level."
          </p>
        </div>
        <button
          onClick={() => onNavigate('methodology')}
          className="whitespace-nowrap px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          View Dataset Documentation
        </button>
      </section>

    </div>
  );
};
