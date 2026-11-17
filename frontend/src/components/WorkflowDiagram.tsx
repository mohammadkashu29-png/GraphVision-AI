import React from 'react';
import { ArrowDown, ArrowRight, Image as ImageIcon, Cpu, Sparkles, CheckCircle2, SplitSquareVertical } from 'lucide-react';

interface WorkflowDiagramProps {
  type?: 'general' | 'htr' | 'signature' | 'personality';
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ type = 'general' }) => {
  if (type === 'signature') {
    return (
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 text-xs">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <SplitSquareVertical className="w-4 h-4 text-brand-400" />
          Siamese Verification Pipeline
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="px-3 py-2 bg-slate-800/90 rounded-xl border border-slate-700 font-medium text-slate-200">
              Signature 1 (Reference)
            </div>
            <div className="px-3 py-2 bg-slate-800/90 rounded-xl border border-slate-700 font-medium text-slate-200">
              Signature 2 (Questioned)
            </div>
          </div>

          <div className="hidden sm:flex text-slate-500">
            <ArrowRight className="w-5 h-5 text-brand-400 animate-pulse" />
          </div>
          <div className="sm:hidden text-slate-500">
            <ArrowDown className="w-4 h-4 text-brand-400" />
          </div>

          <div className="px-4 py-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20 text-brand-300 font-medium">
            Feature Extraction &amp; Alignment
            <span className="block text-[10px] text-slate-400 font-normal">Otsu • Grayscale • Deskew</span>
          </div>

          <div className="hidden sm:flex text-slate-500">
            <ArrowRight className="w-5 h-5 text-brand-400 animate-pulse" />
          </div>
          <div className="sm:hidden text-slate-500">
            <ArrowDown className="w-4 h-4 text-brand-400" />
          </div>

          <div className="px-4 py-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-300 font-medium">
            Siamese Neural Network
            <span className="block text-[10px] text-slate-400 font-normal">Euclidean Distance vs. Threshold</span>
          </div>

          <div className="hidden sm:flex text-slate-500">
            <ArrowRight className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="sm:hidden text-slate-500">
            <ArrowDown className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="px-4 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-300 font-semibold">
            Genuine / Forged
            <span className="block text-[10px] text-slate-400 font-normal">CEDAR Metric Baseline</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 text-xs">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-brand-400" />
          System Pipeline Architecture
        </span>
        <span className="text-[10px] text-slate-500 font-mono">End-to-End Processing</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
        {/* Step 1 */}
        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-center">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-1.5 font-bold">
            1
          </div>
          <div className="font-semibold text-slate-200">Handwriting Image</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Scanned or Photograph</div>
        </div>

        {/* Step 2 */}
        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-center">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-1.5 font-bold">
            2
          </div>
          <div className="font-semibold text-slate-200">Preprocessing</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Otsu • Deskew • Noise Cut</div>
        </div>

        {/* Step 3 */}
        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-center">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-1.5 font-bold">
            3
          </div>
          <div className="font-semibold text-slate-200">Line &amp; Feature Cut</div>
          <div className="text-[10px] text-slate-400 mt-0.5">HPP Valleys • Moments</div>
        </div>

        {/* Step 4 */}
        <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/30 text-center shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center mx-auto mb-1.5 font-bold">
            4
          </div>
          <div className="font-semibold text-brand-300">AI / ML Modules</div>
          <div className="text-[10px] text-brand-200/80 mt-0.5">TrOCR • Siamese • Graphology</div>
        </div>

        {/* Step 5 */}
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-center">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1.5 font-bold">
            5
          </div>
          <div className="font-semibold text-emerald-300">Analysis Results</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Cards • Metrics • Exports</div>
        </div>
      </div>
    </div>
  );
};
