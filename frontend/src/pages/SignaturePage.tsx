import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';
import { ImageDropzone } from '../components/ImageDropzone';
import { WorkflowDiagram } from '../components/WorkflowDiagram';
import { ApiService } from '../services/api';
import { SignatureVerificationResponse } from '../types';

interface SignaturePageProps {
  demoMode: boolean;
  onAnalysisComplete: (item: any) => void;
}

export const SignaturePage: React.FC<SignaturePageProps> = ({ demoMode, onAnalysisComplete }) => {
  const [sig1File, setSig1File] = useState<File | null>(null);
  const [sig2File, setSig2File] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignatureVerificationResponse | null>(null);

  const handleVerify = async () => {
    if (!sig1File || !sig2File) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiService.verifySignature(sig1File, sig2File, demoMode);
      setResult(data);
      onAnalysisComplete({
        module: 'signature',
        title: 'Signature Verification',
        status: data.result === 'genuine' ? 'success' : data.result === 'forged' ? 'warning' : 'disconnected',
        summary: data.result === 'genuine'
          ? `Verified Genuine • Distance: ${data.distance} (Threshold ${data.threshold}) • ${(data.similarity * 100).toFixed(1)}% match`
          : data.result === 'forged'
          ? `Potentially Forged • Distance: ${data.distance} (Threshold ${data.threshold})`
          : 'Signature verification model is not connected.',
        data: data
      });
    } catch (err: any) {
      setError(err.message || 'Signature verification request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Title & Description */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Signature Verification
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Siamese Neural Network (Twin CNN) Pairwise Comparison
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed max-w-3xl">
          Compare two signature images to determine whether they originate from the same signer (genuine) or exhibit structural deviations characteristic of a potential forgery.
        </p>
      </div>

      {/* Siamese Workflow Diagram */}
      <WorkflowDiagram type="signature" />

      {/* Side-by-Side Dual Image Upload */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Dual Signature Input (Required)
          </h2>
          <span className="text-xs text-slate-400 font-mono">Reference + Questioned</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Signature 1 */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                Signature 1 (Reference)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Known Genuine</span>
            </div>

            <ImageDropzone
              label="Upload Reference Signature"
              sublabel="Known genuine signature template"
              selectedFile={sig1File}
              onFileSelect={(f) => {
                setSig1File(f);
                setResult(null);
                setError(null);
              }}
              samplePath="/samples/sample_signature1.png"
              sampleLabel="Load Ref Sample"
              disabled={isLoading}
            />
          </div>

          {/* Signature 2 */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Signature 2 (Questioned)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">To Verify</span>
            </div>

            <ImageDropzone
              label="Upload Questioned Signature"
              sublabel="Signature to test for authenticity"
              selectedFile={sig2File}
              onFileSelect={(f) => {
                setSig2File(f);
                setResult(null);
                setError(null);
              }}
              samplePath="/samples/sample_signature2.png"
              sampleLabel="Load Test Sample"
              disabled={isLoading}
            />
          </div>

        </div>

        {/* Verification Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">
            <span className="text-slate-300 font-medium">Evaluation Criterion:</span> CEDAR Siamese distance metric against decision boundary.
          </div>

          <button
            onClick={handleVerify}
            disabled={!sig1File || !sig2File || isLoading}
            className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
              !sig1File || !sig2File || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Siamese Distance...</span>
              </>
            ) : (
              <>
                <span>Verify Signatures</span>
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
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          
          {/* Disconnected State */}
          {!result.model_connected && !result.is_demo ? (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-amber-300">
                    Signature verification model is not connected.
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Connect Siamese Neural Network model weights trained on the CEDAR Signature Dataset to enable production inference.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs text-slate-300 leading-relaxed">
                <code className="block p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  # Mount Siamese weights in backend/models/signature_model.py<br/>
                  export SIGNATURE_MODEL_CONNECTED=true<br/>
                  export SIGNATURE_MODEL_PATH="checkpoints/cedar_siamese.pth"
                </code>
                <p className="mt-2 text-slate-400 text-[11px]">
                  💡 <em>Toggle <strong>Demo Mode</strong> in the top navigation bar to preview heuristic similarity distance for demonstration.</em>
                </p>
              </div>
            </div>
          ) : (
            /* Connected or Demo Verification Result */
            <div className="space-y-5">
              
              {/* Main Decision Banner */}
              <div
                className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  result.result === 'genuine'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  {result.result === 'genuine' ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block opacity-75">
                      Verification Classification
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold mt-0.5">
                      {result.result === 'genuine' ? 'Genuine / Similar' : 'Potentially Forged / Different'}
                    </h3>
                    <p className="text-xs opacity-80 mt-1">
                      {result.result === 'genuine'
                        ? 'Euclidean feature distance falls comfortably within the genuine threshold.'
                        : 'Euclidean feature distance exceeds the authentic signature threshold boundary.'}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-mono uppercase block opacity-75">Similarity Score</span>
                  <span className="text-2xl sm:text-3xl font-bold font-mono">
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Similarity Distance</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">
                    {result.distance}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Pairwise L2 latent distance
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Decision Threshold</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                    {result.threshold}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    CEDAR calibrated threshold
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Confidence / Match</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Normalized confidence
                  </span>
                </div>

              </div>

              {/* Threshold Distance Visualization Bar */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Decision Boundary Spectrum
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Distance: {result.distance} / Threshold: {result.threshold}
                  </span>
                </div>

                <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  {/* Threshold marker line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 shadow"
                    style={{ left: `${(result.threshold / 1.0) * 100}%` }}
                    title={`Threshold: ${result.threshold}`}
                  />
                  {/* Current distance fill */}
                  <div
                    className={`h-full transition-all duration-700 ${
                      result.distance < result.threshold
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, (result.distance / 1.0) * 100))}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.0 (Identical)</span>
                  <span className="text-amber-400">Threshold ({result.threshold})</span>
                  <span>1.0 (Divergent)</span>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
