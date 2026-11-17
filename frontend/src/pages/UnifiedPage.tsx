import React, { useState } from 'react';
import {
  Layers,
  FileText,
  ShieldCheck,
  Brain,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Check,
  Sliders,
  Sparkles,
  Copy,
  Download,
  ShieldAlert
} from 'lucide-react';
import { ImageDropzone } from '../components/ImageDropzone';
import { ApiService } from '../services/api';
import {
  HTRResponse,
  SignatureVerificationResponse,
  PersonalityResponse
} from '../types';

interface UnifiedPageProps {
  demoMode: boolean;
  onAnalysisComplete: (item: any) => void;
}

type TabType = 'text' | 'signature' | 'personality';

export const UnifiedPage: React.FC<UnifiedPageProps> = ({ demoMode, onAnalysisComplete }) => {
  const [handwritingFile, setHandwritingFile] = useState<File | null>(null);
  const [sigRefFile, setSigRefFile] = useState<File | null>(null);
  const [sigQuestFile, setSigQuestFile] = useState<File | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [htrResult, setHtrResult] = useState<HTRResponse | null>(null);
  const [personalityResult, setPersonalityResult] = useState<PersonalityResponse | null>(null);
  const [sigResult, setSigResult] = useState<SignatureVerificationResponse | null>(null);

  const handleRunUnifiedAnalysis = async () => {
    if (!handwritingFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Run HTR and Personality concurrently for the single handwriting image
      const [htrData, personalityData] = await Promise.all([
        ApiService.predictHTR(handwritingFile, demoMode),
        ApiService.analyzePersonality(handwritingFile, demoMode),
      ]);

      setHtrResult(htrData);
      setPersonalityResult(personalityData);

      // 2. If signature images are also provided, run signature verification
      let sigData = null;
      if (sigRefFile && sigQuestFile) {
        sigData = await ApiService.verifySignature(sigRefFile, sigQuestFile, demoMode);
        setSigResult(sigData);
      }

      onAnalysisComplete({
        module: 'unified',
        title: 'Complete Handwriting Multi-Task Run',
        status: 'success',
        summary: `HTR: ${htrData.num_lines} lines • Personality: ${personalityData.features.slant}`,
        data: { htr: htrData, personality: personalityData, signature: sigData }
      });
    } catch (err: any) {
      setError(err.message || 'Unified analysis encountered an error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Page Title & Explanation */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Complete Handwriting Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified Multimodal Inference Interface
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed max-w-3xl">
          Upload a single handwriting sample to execute Handwritten Text Recognition and Personality Analysis in a single unified workflow. Signature Verification can be simultaneously verified via an optional dual-signature comparison.
        </p>
      </div>

      {/* Upload Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Primary Handwriting Upload (Controls HTR, Personality) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 uppercase tracking-wider">
              1. Primary Handwriting Sample (Required)
            </span>
            <span className="text-brand-400 text-[11px] font-mono">Powers HTR, Feature Extraction & Traits</span>
          </div>

          <ImageDropzone
            label="Upload Handwriting Document or Snippet"
            sublabel="One image serves HTR line decomposition and personality feature extraction"
            selectedFile={handwritingFile}
            onFileSelect={(f) => {
              setHandwritingFile(f);
              setHtrResult(null);
              setPersonalityResult(null);
            }}
            samplePath="/samples/sample_htr.png"
            sampleLabel="Load IAM Sample"
            disabled={isProcessing}
          />
        </div>

        {/* Optional Signature Verification Dual Upload */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 uppercase tracking-wider">
              2. Signature Pair (Optional)
            </span>
            <span className="text-amber-400 text-[11px] font-mono">Requires 2 Images</span>
          </div>

          <p className="text-[11px] text-slate-400">
            Because signature verification compares a reference and a questioned sample, two signatures are required if you wish to run Module 3.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400">Ref Sig</span>
              <ImageDropzone
                label="Signature A"
                sublabel="Reference"
                selectedFile={sigRefFile}
                onFileSelect={setSigRefFile}
                samplePath="/samples/sample_signature1.png"
                sampleLabel="Sample A"
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400">Quest Sig</span>
              <ImageDropzone
                label="Signature B"
                sublabel="Questioned"
                selectedFile={sigQuestFile}
                onFileSelect={setSigQuestFile}
                samplePath="/samples/sample_signature2.png"
                sampleLabel="Sample B"
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Execute Unified Run Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="text-xs text-slate-400">
          <span className="text-slate-300 font-medium">Integration Note:</span> Executes asynchronous parallel requests across modular FastAPI routers.
        </div>

        <button
          onClick={handleRunUnifiedAnalysis}
          disabled={!handwritingFile || isProcessing}
          className={`px-6 py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
            !handwritingFile || isProcessing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white shadow-lg shadow-cyan-600/25'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Unified AI Pipeline...</span>
            </>
          ) : (
            <>
              <span>Run Complete Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Tab Results Interface */}
      {(htrResult || personalityResult || sigResult) && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          
          {/* Tabs Navigation Header */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'text'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>[Text Recognition]</span>
              {htrResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
            </button>

            <button
              onClick={() => setActiveTab('signature')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'signature'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>[Signature Verification]</span>
              {sigResult && <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>}
            </button>

            <button
              onClick={() => setActiveTab('personality')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'personality'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>[Handwriting Features &amp; Traits]</span>
              {personalityResult && <span className="w-1.5 h-1.5 rounded-full bg-pink-300"></span>}
            </button>
          </div>

          {/* Tab 1: Text Recognition */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {htrResult ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                        TrOCR Output • {htrResult.num_lines} Detected Lines
                      </span>
                      <span className="text-slate-500 font-mono">Benchmark CER: 4.82%</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {htrResult.transcription}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {htrResult.lines.map((l) => (
                      <div key={l.line_number} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-xs font-bold">
                          {l.line_number}
                        </span>
                        <p className="font-mono text-xs text-emerald-300 truncate">
                          {l.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
                  No text recognition results yet. Click "Run Complete Analysis" above.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Signature Verification */}
          {activeTab === 'signature' && (
            <div className="space-y-4">
              {sigResult ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  {!sigResult.model_connected && !sigResult.is_demo ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                      <span className="font-bold">Model not connected:</span> Signature verification model is not connected.
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <h4 className="text-sm font-semibold text-white">
                          Status: <span className={sigResult.result === 'genuine' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {sigResult.result === 'genuine' ? 'Genuine / Similar' : 'Potentially Forged / Different'}
                          </span>
                        </h4>
                        <span className="font-mono text-xs text-slate-400">
                          Match: {(sigResult.similarity * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Distance</span>
                          <span className="text-white text-base font-bold">{sigResult.distance}</span>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Decision Threshold</span>
                          <span className="text-amber-400 text-base font-bold">{sigResult.threshold}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
                  Dual signatures were not uploaded. To verify signatures, provide both Signature A and Signature B above.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Personality Features */}
          {activeTab === 'personality' && (
            <div className="space-y-4">
              {personalityResult ? (
                <div className="space-y-4">
                  {/* Disclaimer banner */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Experimental Graphology: Not a scientifically validated psychological assessment.</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Slant</span>
                      <span className="font-bold text-white mt-1 block">{personalityResult.features.slant}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Size</span>
                      <span className="font-bold text-white mt-1 block">{personalityResult.features.letter_size}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Spacing</span>
                      <span className="font-bold text-white mt-1 block">{personalityResult.features.spacing}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Baseline</span>
                      <span className="font-bold text-white mt-1 block">{personalityResult.features.baseline}</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Experimental Traits
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {personalityResult.experimental_associations.map((a) => (
                        <div key={a.trait} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-200">{a.trait}</span>
                            <span className="font-mono text-pink-400">{(a.score * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${a.score * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
                  No personality features extracted yet.
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
