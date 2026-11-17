import React from 'react';
import {
  BookOpen,
  Database,
  Cpu,
  Layers,
  FileText,
  ShieldCheck,
  Brain,
  ArrowDown,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  const steps = [
    {
      num: 1,
      title: 'Image Acquisition',
      desc: 'High-resolution scanning or mobile photography capture of handwritten documents, signatures, and cursive text specimens under varying ambient illumination.'
    },
    {
      num: 2,
      title: 'Preprocessing & Normalization',
      desc: 'Grayscale transformation, Otsu adaptive global binarization, noise attenuation via bilateral smoothing, and skew correction via horizontal projection profile variance maximization.'
    },
    {
      num: 3,
      title: 'Line Segmentation',
      desc: 'Horizontal Projection Profile (HPP) valley detection decomposes paragraphs into isolated horizontal line bounding boxes and base64 image strips suitable for line-level vision transformers.'
    },
    {
      num: 4,
      title: 'Geometric Feature Extraction',
      desc: 'Mathematical computation of handwriting stroke features: orientation slant via central moments, connected-component x-height, inter-word whitespace gaps, and baseline linear regression variance.'
    },
    {
      num: 5,
      title: 'Handwritten Text Recognition (HTR)',
      desc: 'Vision Encoder-Decoder (TrOCR) pipeline leveraging pre-trained vision transformers and autoregressive language modeling fine-tuned on the standardized IAM Handwriting Database.'
    },
    {
      num: 6,
      title: 'Signature Verification',
      desc: 'Twin Siamese Neural Network with shared weights evaluating pairwise Euclidean latent distance between a known reference signature and a questioned sample on the CEDAR dataset.'
    },
    {
      num: 7,
      title: 'Experimental Personality Analysis',
      desc: 'Algorithmic mapping of extracted physical features (slant, baseline slope, spacing, pressure) to historical graphological rules. Strictly designated as experimental and non-clinical.'
    },
    {
      num: 8,
      title: 'Evaluation Protocols',
      desc: 'Character Error Rate (CER), Word Error Rate (WER) on IAM split; Equal Error Rate (EER) and Area Under ROC curve (AUC) on CEDAR signatures; Empirical validation of OpenCV handwriting feature consistency.'
    },
    {
      num: 9,
      title: 'System Integration',
      desc: 'Unified RESTful backend service built in FastAPI orchestrating asynchronous endpoints with modular interfaces, connected to a modern React-TypeScript research dashboard.'
    }
  ];

  return (
    <div className="space-y-10 py-2">
      
      {/* Title Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Academic Methodology &amp; Architecture
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive Research Specifications, Dataset Partitions &amp; Pipeline Design
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Flowchart Diagram */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">
          System Integration Architecture
        </h2>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          
          {/* Main 3-Branch Pipeline */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-center space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-lg bg-slate-800 font-mono text-xs font-semibold text-slate-200 border border-slate-700">
              INPUT IMAGE (Handwriting Sample)
            </div>
            <div className="flex justify-center text-slate-500">
              <ArrowDown className="w-4 h-4 text-brand-400" />
            </div>
            <div className="inline-block px-4 py-1.5 rounded-lg bg-slate-800 font-mono text-xs font-semibold text-cyan-300 border border-slate-700">
              PREPROCESSING (Otsu Binarization &amp; Deskew)
            </div>
            <div className="flex justify-center text-slate-500">
              <ArrowDown className="w-4 h-4 text-brand-400" />
            </div>
            <div className="inline-block px-4 py-1.5 rounded-lg bg-slate-800 font-mono text-xs font-semibold text-indigo-300 border border-slate-700">
              FEATURE / LINE EXTRACTION (HPP Segmentation &amp; Moments)
            </div>

            {/* 2-Branch Fanout */}
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              
              {/* Branch 1 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold block">
                    Branch 01
                  </span>
                  <h4 className="font-semibold text-white text-xs mt-1">HTR (TrOCR)</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Vision Transformer Encoder-Decoder</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 font-mono text-xs text-emerald-300 font-medium">
                  → Digital Transcription
                </div>
              </div>

              {/* Branch 2 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-pink-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-pink-400 font-semibold block">
                    Branch 02
                  </span>
                  <h4 className="font-semibold text-white text-xs mt-1">Personality Analysis & Feature Extraction</h4>
                  <p className="text-[11px] text-slate-400 mt-1">OpenCV Feature Extraction & Heuristic Rules</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 font-mono text-xs text-pink-300 font-medium">
                  → Quantitative Metrics & Traits
                </div>
              </div>

            </div>
          </div>

          {/* Signature Verification Separate 2-Image Branch */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold block">
              Distinct Pairwise Verification Pipeline (2-Image Branch)
            </span>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                Signature A (Ref) + Signature B (Quest)
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 hidden sm:block" />
              <ArrowDown className="w-4 h-4 text-amber-400 sm:hidden" />
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                Siamese Neural Network (Twin Shared-Weight CNN)
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 hidden sm:block" />
              <ArrowDown className="w-4 h-4 text-amber-400 sm:hidden" />
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                Genuine / Forged (Distance vs Threshold)
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Datasets Section (Crucial Requirement) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-400" />
          <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">
            Dataset Partitioning &amp; Module Specialization
          </h2>
        </div>

        {/* Mandatory Methodology Note */}
        <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-200 text-xs flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-brand-300 text-sm">
              Dataset Heterogeneity Methodology Note
            </h4>
            <p className="leading-relaxed text-slate-200">
              "Because the four tasks represent different machine-learning problems, benchmark datasets are used per module and the models are integrated at the application/system level."
            </p>
            <p className="text-slate-400 text-[11px] pt-1">
              <strong>Academic Integrity Clarification:</strong> IAM, CEDAR, and personality feature evaluation corpora are NOT a single unified dataset. Each module is evaluated against its respective established domain benchmark.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* IAM Dataset */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">IAM Handwriting Database</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                HTR Module
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Used for training and evaluating handwritten text recognition models. Contains 1,539 pages of scanned handwritten English text by 657 different writers, partitioned into standard line splits.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Test samples: 2,915 lines</div>
              <div className="text-emerald-400">Project Benchmark: CER 4.82%, WER 11.75%</div>
            </div>
          </div>

          {/* CEDAR Dataset */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono">CEDAR Signature Dataset</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                Signature Module
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standard benchmark for offline signature verification. Comprises 24 genuine signatures and 24 skilled forgeries from each of 55 distinct subjects, totaling 2,640 signatures.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Evaluated on: Genuine &amp; Skilled Forgeries</div>
              <div className="text-amber-400">Siamese contrastive distance metric</div>
            </div>
          </div>

        </div>
      </section>

      {/* Sequential Methodology Phases */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">
          Nine Sequential Methodology Phases
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3.5"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-brand-400 border border-slate-700 flex items-center justify-center font-bold text-xs font-mono flex-shrink-0">
                {s.num}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-200">
                  {s.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
