import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Download,
  Check,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  Activity,
  ArrowRight,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import { ImageDropzone } from '../components/ImageDropzone';
import { BenchmarkCard } from '../components/BenchmarkCard';
import { ApiService } from '../services/api';
import { HTRResponse } from '../types';

interface HTRPageProps {
  demoMode: boolean;
  onAnalysisComplete: (item: any) => void;
}

export const HTRPage: React.FC<HTRPageProps> = ({ demoMode, onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HTRResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunRecognition = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiService.predictHTR(selectedFile, demoMode);
      setResult(data);
      onAnalysisComplete({
        module: 'htr',
        title: 'Handwritten Text Recognition',
        status: 'success',
        summary: `${data.num_lines} lines transcribed: "${data.transcription.slice(0, 60)}..."`,
        data: data
      });
    } catch (err: any) {
      setError(err.message || 'Error occurred during HTR processing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.transcription) return;
    navigator.clipboard.writeText(result.transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.transcription) return;
    const blob = new Blob([result.transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `htr-transcription-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Page Title & Academic Description */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Handwritten Text Recognition
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Transformer-based Optical Character Recognition (TrOCR) Pipeline
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed max-w-3xl">
          Upload a handwritten document or image. The system automatically detects individual handwriting lines and uses a TrOCR-based recognition pipeline to generate digital text.
        </p>
      </div>

      {/* Grid: Upload & Controls + Benchmark Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 uppercase tracking-wider">
                Document Upload
              </span>
              <span className="text-slate-500 font-mono">PNG, JPG, JPEG</span>
            </div>

            <ImageDropzone
              label="Upload Handwriting Document"
              sublabel="Drag and drop scanned page or handwriting note"
              selectedFile={selectedFile}
              onFileSelect={(f) => {
                setSelectedFile(f);
                setResult(null);
                setError(null);
              }}
              samplePath="/samples/sample_htr.png"
              sampleLabel="Load IAM Sample Document"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Line segmentation runs automatically before TrOCR inference</span>
              </div>

              <button
                onClick={handleRunRecognition}
                disabled={!selectedFile || isLoading}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                  !selectedFile || isLoading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Lines &amp; OCR...</span>
                  </>
                ) : (
                  <>
                    <span>Run HTR Recognition</span>
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
        </div>

        {/* Right Column: Benchmark Evaluation Info */}
        <div className="lg:col-span-5 space-y-4">
          <BenchmarkCard />
        </div>

      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-slate-800">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Recognition Results &amp; Line Decomposition
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {result.num_lines} Lines Detected
            </span>
          </div>

          {/* 1. Preprocessing Status Panel */}
          {result.preprocessing_info && (
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Preprocessing Pipeline Telemetry
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Resolution</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {result.preprocessing_info.width} × {result.preprocessing_info.height}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Deskew Angle</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {result.preprocessing_info.skew_angle}°
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Otsu Threshold</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {result.preprocessing_info.otsu_threshold} / 255
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Ink Density</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {(result.preprocessing_info.ink_density * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Lines Segmented</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {result.preprocessing_info.lines_detected}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Detected Lines Separately & Recognition per Line */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Detected Lines &amp; Line-by-Line TrOCR Outputs
            </h3>

            <div className="space-y-3">
              {result.lines.map((line) => (
                <div
                  key={line.line_number}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex items-center gap-2 md:w-28 flex-shrink-0">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-mono font-bold">
                      {line.line_number}
                    </span>
                    <span className="text-xs text-slate-400">Line #{line.line_number}</span>
                  </div>

                  {/* Line image crop */}
                  {line.line_image_data && (
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 md:max-w-xs overflow-hidden flex items-center justify-center">
                      <img
                        src={line.line_image_data}
                        alt={`Segmented Line ${line.line_number}`}
                        className="max-h-12 w-auto object-contain rounded"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Recognized Line Text
                    </span>
                    <p className="font-mono text-sm text-emerald-300 font-medium mt-0.5">
                      {line.text || <span className="text-slate-500 italic">No text recognized</span>}
                    </p>
                  </div>

                  {line.confidence !== undefined && (
                    <div className="text-right text-[11px] font-mono text-slate-400 flex-shrink-0">
                      <span>Conf: {(line.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Final Combined Transcription */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Final Combined Transcription
                </h3>
                <p className="text-[11px] text-slate-400">
                  Concatenated output from all detected handwriting line tokens
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download Text</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm sm:text-base text-slate-100 leading-relaxed whitespace-pre-wrap select-all">
              {result.transcription}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
