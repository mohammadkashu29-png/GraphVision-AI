import React from 'react';
import {
  FileText,
  UserCheck,
  ShieldCheck,
  Brain,
  Layers,
  ArrowUpRight,
  Clock,
  Sparkles,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  BarChart3
} from 'lucide-react';
import { PageId } from '../components/Sidebar';
import { WorkflowDiagram } from '../components/WorkflowDiagram';
import { BenchmarkCard } from '../components/BenchmarkCard';
import { HistoryItem, SystemStatus } from '../types';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  stats: {
    total: number;
    htr: number;

    signature: number;
    personality: number;
  };
  recentHistory: HistoryItem[];
  systemStatus: SystemStatus | null;
  demoMode: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  stats,
  recentHistory,
  systemStatus,
  demoMode,
}) => {
  return (
    <div className="space-y-8 py-2">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              AI Research Laboratory Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Prototype v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multimodal evaluation suite for handwriting models and feature pipelines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('unified')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Layers className="w-4 h-4" />
            <span>Complete Unified Run</span>
          </button>
        </div>
      </div>

      {/* Analysis Metrics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Total analyses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Analyses</span>
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Session cumulative</span>
        </div>

        {/* HTR analyses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium text-slate-300">HTR Runs</span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
            {stats.htr}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">TrOCR line splits</span>
        </div>



        {/* Signature verifications */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium text-slate-300">Signatures</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-2">
            {stats.signature}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Siamese comparisons</span>
        </div>

        {/* Personality analyses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-pink-400">
            <span className="text-xs font-medium text-slate-300">Personality</span>
            <Brain className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-pink-400 font-mono mt-2">
            {stats.personality}
          </div>
          <span className="text-[10px] text-amber-400/80 block mt-1">Experimental heuristics</span>
        </div>

      </div>

      {/* Four Large Module Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Launch Analysis Engines
          </h2>
          <span className="text-xs text-slate-500 font-mono">Select individual module</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Button 1: HTR */}
          <button
            onClick={() => onNavigate('htr')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-white mt-4 group-hover:text-emerald-300 transition-colors">
                Handwritten Text Recognition
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Automatic line detection and TrOCR transformer-based transcription pipeline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>IAM Dataset</span>
              <span className="text-emerald-400 font-medium">CER 4.82%</span>
            </div>
          </button>



          {/* Button 3: Signature Verification */}
          <button
            onClick={() => onNavigate('signature')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-white mt-4 group-hover:text-amber-300 transition-colors">
                Signature Verification
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Dual signature pairwise comparison using twin Siamese contrastive distance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>CEDAR Dataset</span>
              <span className="text-amber-400 font-medium">Siamese CNN</span>
            </div>
          </button>

          {/* Button 4: Personality Analysis */}
          <button
            onClick={() => onNavigate('personality')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-white mt-4 group-hover:text-pink-300 transition-colors">
                Personality Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Slant, baseline, and spacing extraction with experimental graphology rules.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Experimental</span>
              <span className="text-pink-400 font-medium">5 Graphology Traits</span>
            </div>
          </button>

        </div>
      </div>

      {/* Benchmark Card & Workflow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <BenchmarkCard />
        </div>
        <div className="lg:col-span-7">
          <WorkflowDiagram type="general" />
        </div>
      </div>

      {/* Recent Analysis Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            <h2 className="text-base font-bold text-white">Recent Analyses</h2>
          </div>
          <button
            onClick={() => onNavigate('results')}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            View Full History
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {recentHistory.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500">{item.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase font-mono ${
                      item.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.module}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200 mt-2 truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span className="capitalize">{item.status}</span>
                <button
                  onClick={() => {
                    onNavigate(item.module === 'unified' ? 'unified' : item.module);
                  }}
                  className="text-brand-400 hover:text-brand-300 font-medium"
                >
                  Inspect →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
