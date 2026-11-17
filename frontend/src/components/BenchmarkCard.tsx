import React from 'react';
import { Award, Info, Database, Layers } from 'lucide-react';

export const BenchmarkCard: React.FC = () => {
  return (
    <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Current Project Benchmark
            </h4>
            <p className="text-[11px] text-slate-400">
              Handwritten Text Recognition (HTR) Baseline
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
          Model: TrOCR
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">CER</span>
          <span className="text-xl font-bold font-mono text-emerald-400">4.82%</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Char Error Rate</span>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">WER</span>
          <span className="text-xl font-bold font-mono text-cyan-400">11.75%</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">Word Error Rate</span>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">Test Samples</span>
          <span className="text-xl font-bold font-mono text-slate-200">2,915</span>
          <span className="text-[9px] text-slate-500 block mt-0.5">IAM Test Split</span>
        </div>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Benchmark Notice:</strong> These metrics reflect the official evaluation benchmark achieved by the fine-tuned TrOCR model on the standardized <strong>IAM Handwriting Database test split (2,915 samples)</strong>. They represent a baseline benchmark and do not imply guaranteed CER/WER values for arbitrarily uploaded unconstrained user images.
        </p>
      </div>
    </div>
  );
};
