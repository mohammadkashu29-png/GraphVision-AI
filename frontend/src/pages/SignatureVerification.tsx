import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, ScanLine, Settings, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../api/client";
import UploadZone from "../components/UploadZone";
import { Badge, Card, ErrorNote, InfoBanner, SectionTitle, Spinner } from "../components/ui";
import type { ModelStatus, VerifyResult } from "../types";
import { fmtNum } from "../utils";

function DistanceGauge({ distance, threshold }: { distance: number; threshold: number }) {
  const max = Math.max(threshold * 1.4, distance * 1.1, 0.001);
  const pos = Math.min(distance / max, 1) * 100;
  const thrPos = (threshold / max) * 100;
  return (
    <div>
      <div className="relative h-4 rounded-full bg-slate-800 overflow-visible">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-500/25" style={{ width: `${thrPos}%` }} />
        <div className="absolute inset-y-0 bg-rose-500/25 rounded-r-full" style={{ left: `${thrPos}%`, right: 0 }} />
        <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-slate-300" style={{ left: `${thrPos}%` }} title="threshold" />
        <div
          className="absolute -top-1.5 w-2.5 h-7 rounded bg-white shadow-lg border border-slate-400"
          style={{ left: `calc(${pos}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        <span>0 (identical embeddings)</span>
        <span className="text-emerald-400">d &lt; τ → Same</span>
        <span className="text-rose-400">d ≥ τ → Different</span>
        <span>{max.toFixed(3)}</span>
      </div>
    </div>
  );
}

export default function SignatureVerification() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.modelStatus().then(setStatus).catch((e) => setError(e.message));
  }, []);

  const setA = (f: File) => { setFileA(f); setPreviewA(URL.createObjectURL(f)); setResult(null); };
  const setB = (f: File) => { setFileB(f); setPreviewB(URL.createObjectURL(f)); setResult(null); };
  const clearA = () => { setFileA(null); setPreviewA(null); setResult(null); };
  const clearB = () => { setFileB(null); setPreviewB(null); setResult(null); };

  const verify = async () => {
    if (!fileA || !fileB) {
      setError("Please upload both Signature A and Signature B before verifying.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await api.verifySignatures(fileA, fileB));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionTitle icon={ScanLine} title="AI Signature Verification"
        subtitle="Siamese CNN · shared encoder (32→64→128 filters) · 128-D embeddings · Euclidean distance · contrastive loss (margin 1.0)" />

      {/* Model status */}
      {status && !status.model_loaded && (
        <Card className="border-amber-500/30 bg-amber-500/[0.06]">
          <div className="flex items-start gap-3">
            <Settings size={20} className="text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="text-sm font-semibold text-amber-200">Siamese CNN model not loaded — setup required</div>
              {status.error && <div className="text-xs text-amber-300/80">{status.error}</div>}
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {status.setup_instructions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <div className="text-[11px] text-slate-500">
                The decision threshold is never invented by this app — it must come from a validation-selected
                value stored in <span className="font-mono">model_config.json</span>. Verification stays disabled
                until real trained weights are present.
              </div>
            </div>
          </div>
        </Card>
      )}
      {status?.model_loaded && status.config && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="emerald"><ShieldCheck size={12} /> Model loaded ({status.device})</Badge>
          <Badge tone="slate">Input {status.config.img_height}×{status.config.img_width} px</Badge>
          <Badge tone="slate">Embedding dim: {status.config.embedding_dim}</Badge>
          <Badge tone="violet">Decision threshold τ = {status.config.decision_threshold}</Badge>
          <Badge tone="slate">Margin: {status.config.contrastive_margin}</Badge>
        </div>
      )}

      {/* Uploads */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-semibold text-slate-100 mb-3">Signature A</div>
          <UploadZone label="Upload Signature A" preview={previewA} onFile={setA} onClear={clearA} disabled={loading} />
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-100 mb-3">Signature B</div>
          <UploadZone label="Upload Signature B" preview={previewB} onFile={setB} onClear={clearB} disabled={loading} />
        </Card>
      </div>

      <div className="flex justify-center">
        <button
          onClick={verify}
          disabled={loading || !fileA || !fileB || !status?.model_loaded}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {loading ? "Running Siamese inference…" : "Verify Signatures"}
        </button>
      </div>

      {loading && <Card><Spinner label="Preprocessing signatures → shared encoder → embeddings → Euclidean distance…" /></Card>}
      {error && <ErrorNote message={error} />}

      {result && !loading && (
        <Card className={result.predicted_same ? "border-emerald-500/30" : "border-rose-500/30"}>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <img src={result.image_a_url} alt="Signature A" className="w-40 h-28 object-contain rounded-lg border border-white/10 bg-slate-900" />
                <div className="text-[11px] text-slate-400 mt-1">Signature A</div>
              </div>
              <div className="text-center">
                <img src={result.image_b_url} alt="Signature B" className="w-40 h-28 object-contain rounded-lg border border-white/10 bg-slate-900" />
                <div className="text-[11px] text-slate-400 mt-1">Signature B</div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border ${
                result.predicted_same
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}>
                {result.predicted_same ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {result.label}
              </div>
              <DistanceGauge distance={result.distance} threshold={result.threshold} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Euclidean distance", value: fmtNum(result.distance, 4) },
                  { label: "Threshold (τ)", value: fmtNum(result.threshold, 4) },
                  { label: "Embedding dim", value: result.embedding_dim },
                  { label: "Processing time", value: `${result.processing_time_ms.toFixed(1)} ms` },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2">
                    <div className="text-[10px] text-slate-500">{m.label}</div>
                    <div className="text-sm font-semibold text-slate-100">{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock size={11} /> Verification #{result.verification_id} · {result.created_at}
              </div>
              <InfoBanner tone="rose">
                <AlertTriangle size={13} className="inline mr-1" />
                {result.disclaimer}
              </InfoBanner>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
