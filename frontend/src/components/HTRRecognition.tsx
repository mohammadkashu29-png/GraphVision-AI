import { useEffect, useState } from "react";
import { FileText, Loader2, UploadCloud, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import type { HTRResult, HTRStatus } from "../types";

export default function HTRRecognition() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<HTRResult | null>(null);
  const [status, setStatus] = useState<HTRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.htrStatus().then(setStatus).catch((e) => setError(`Cannot reach HTR service: ${e.message}`));
  }, []);

  const chooseFile = (next: File | undefined) => {
    if (!next) return;
    if (!["image/png", "image/jpeg"].includes(next.type)) {
      setError("Please choose a PNG or JPEG image.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setResult(null);
    setError(null);
  };

  const runRecognition = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.recognizeHandwriting(file);
      setResult(response);
              try {
          const statusResp = await api.htrStatus();
          setStatus(statusResp);
        } catch (_) {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handwriting recognition failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy text. Select the transcription and copy it manually.");
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold"><FileText size={18} className="text-cyan-300" /> Handwritten Text Recognition</div>
          <p className="text-xs text-slate-400 mt-1">Transcribe handwriting using the pretrained Qwen2.5-VL-3B-Instruct (Cloud GPU) model.</p>
        </div>
        <span className={`text-[11px] rounded-full px-2.5 py-1 border ${status?.loaded ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-amber-500/30 text-amber-300 bg-amber-500/10"}`}>
          {status?.loaded ? `Model loaded · ${status.device}` : status && !status.available ? "Dependency missing" : status ? "Model loads on first request" : "Checking service…"}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-center">
        <label className="min-h-36 rounded-xl border border-dashed border-slate-600 hover:border-cyan-400/60 flex flex-col items-center justify-center gap-2 p-4 cursor-pointer text-center">
          {preview ? <img src={preview} alt="Handwriting selected for recognition" className="max-h-40 max-w-full object-contain rounded" /> : <>
            <UploadCloud size={26} className="text-cyan-300" />
            <span className="text-sm text-slate-200">Choose handwriting image</span>
            <span className="text-xs text-slate-500">PNG / JPG · Maximum 10 MB</span>
          </>}
          <input className="hidden" type="file" accept="image/png,image/jpeg" onChange={(e) => chooseFile(e.target.files?.[0])} />
        </label>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">For best results, upload a clear, well-lit image containing a short handwritten line or paragraph. Qwen2.5-VL-3B-Instruct (Cloud GPU) is designed for handwritten text-line recognition; long full-page images may need to be cropped into lines.</p>
          <button onClick={runRecognition} disabled={!file || loading || status?.available === false} className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Recognising… first run may download the model</> : "Recognise handwriting"}
          </button>
        </div>
      </div>

      {loading && <div className="text-xs text-cyan-200 bg-cyan-500/10 rounded-lg p-3">The first request downloads and initialises the Qwen2.5‑VL‑3B‑Instruct (Cloud GPU) model. This can take several minutes depending on your internet connection and available memory.</div>}
      {error && <div className="flex gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3"><AlertTriangle size={15} className="shrink-0" />{error}</div>}
      {result && <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-200 flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-400" /> Recognised text</div>
          <button onClick={copyText} className="text-xs flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200"><Copy size={13} />{copied ? "Copied" : "Copy text"}</button>
        </div>
        <div className="whitespace-pre-wrap rounded-xl bg-slate-950 border border-slate-700 p-4 text-sm leading-relaxed text-slate-100 min-h-20">{result.text || "No text could be recognised from this image."}</div>
        <div className="text-[11px] text-slate-500">{result.model_id} · {result.device} · {(result?.processing_time_ms ?? 0).toFixed(0)} ms · {result.image_width}×{result.image_height} px</div>
        <p className="text-[11px] text-amber-300/80">{result.disclaimer}</p>
      </div>}
      {status?.error && <p className="text-[11px] text-amber-300">HTR setup: {status.error}</p>}
    </section>
  );
}
