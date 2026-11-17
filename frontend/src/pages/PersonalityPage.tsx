import React, { useState } from 'react';
import {
  Brain,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sliders,
  Sparkles,
  ShieldAlert,
  Info,
  Compass,
  Maximize2,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import { ImageDropzone } from '../components/ImageDropzone';
import { ApiService } from '../services/api';
import { PersonalityResponse } from '../types';

interface PersonalityPageProps {
  demoMode: boolean;
  onAnalysisComplete: (item: any) => void;
}

export const PersonalityPage: React.FC<PersonalityPageProps> = ({ demoMode, onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PersonalityResponse | null>(null);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiService.analyzePersonality(selectedFile, demoMode);
      setResult(data);
      onAnalysisComplete({
        module: 'personality',
        title: 'Personality Analysis',
        status: 'warning',
        summary: `Slant: ${data.features.slant} • Size: ${data.features.letter_size} • Spacing: ${data.features.spacing} (Experimental)`,
        data: data
      });
    } catch (err: any) {
      setError(err.message || 'Error occurred during handwriting feature analysis');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Title & Description */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Handwriting Personality Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Experimental Graphology-Inspired Feature Mapping Pipeline
            </p>
          </div>
        </div>

        {/* Workflow breadcrumb */}
        <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="text-slate-300 font-medium">Handwriting Image</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-slate-300 font-medium">Preprocessing</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-slate-300 font-medium">Handwriting Feature Extraction</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-slate-300 font-medium">Feature Analysis</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-slate-300 font-medium">Experimental Personality Association</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-pink-300 font-semibold">Results</span>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
            Academic &amp; Scientific Validation Disclaimer
          </h4>
          <p className="leading-relaxed text-slate-300">
            "This module provides experimental associations based on handwriting characteristics and graphology-inspired rules. These results are not scientifically validated psychological or personality assessments and should not be treated as a diagnosis, psychological evaluation, or factual determination of personality."
          </p>
        </div>
      </div>

      {/* Upload and execution */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            Upload Handwriting Sample
          </span>
          <span className="text-slate-500 font-mono">PNG, JPG, JPEG</span>
        </div>

        <ImageDropzone
          label="Upload Handwriting Sample for Feature Profiling"
          sublabel="Scanned cursive or block handwriting sample"
          selectedFile={selectedFile}
          onFileSelect={(f) => {
            setSelectedFile(f);
            setResult(null);
            setError(null);
          }}
          samplePath="/samples/sample_personality.png"
          sampleLabel="Load Sample Paragraph"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Extracts slant moments, horizontal white-space gaps, and baseline linear regression</span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isLoading}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
              !selectedFile || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting Geometric Features...</span>
              </>
            ) : (
              <>
                <span>Analyze Features &amp; Traits</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Results Display */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          
          {/* 1. Extracted Handwriting Features Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-pink-400" />
              Extracted Handwriting Physical Characteristics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              {/* Slant */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Slant</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {result.features.slant}
                </span>
                {result.raw_metrics?.slant_angle_degrees !== undefined && (
                  <span className="text-[10px] text-pink-400 font-mono mt-1 block">
                    {result.raw_metrics.slant_angle_degrees}° from normal
                  </span>
                )}
              </div>

              {/* Letter Size */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Letter Size</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {result.features.letter_size}
                </span>
                {result.raw_metrics?.estimated_char_height_px !== undefined && (
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    ~{result.raw_metrics.estimated_char_height_px} px x-height
                  </span>
                )}
              </div>

              {/* Spacing */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Spacing</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {result.features.spacing}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  Inter-word &amp; letter gaps
                </span>
              </div>

              {/* Baseline */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Baseline</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {result.features.baseline}
                </span>
                {result.raw_metrics?.baseline_slope_deg !== undefined && (
                  <span className="text-[10px] text-cyan-400 font-mono mt-1 block">
                    {result.raw_metrics.baseline_slope_deg}° slope
                  </span>
                )}
              </div>

              {/* Consistency */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Consistency</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {result.features.consistency}
                </span>
                {result.raw_metrics?.consistency_score !== undefined && (
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                    {(result.raw_metrics.consistency_score * 100).toFixed(0)}% regularity
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* 2. Experimental Personality Associations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-pink-300">
                  Experimental Personality Associations
                </h3>
                <p className="text-xs text-slate-400">
                  Rule-based mappings derived from extracted geometric features (Strictly Experimental)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Non-Clinical / Graphology
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.experimental_associations.map((assoc) => (
                <div
                  key={assoc.trait}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{assoc.trait}</span>
                    <span className="text-base font-mono font-bold text-pink-400">
                      {(assoc.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${assoc.score * 100}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {assoc.interpretation}
                  </p>

                  {assoc.derived_from && (
                    <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                      Feature link: {assoc.derived_from}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explicit Bottom Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
            <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> As required by academic evaluation standards, these personality associations represent graphological heuristic conventions and are not presented as psychological fact.
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
