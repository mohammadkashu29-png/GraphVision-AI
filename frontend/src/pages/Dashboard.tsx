import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlignJustify, ArrowLeftRight, ArrowRight, CheckCircle2, Cpu,
  Database, Droplets, FileScan, Grip, LayoutDashboard, Minus, MoveHorizontal,
  MoveVertical, PenTool, ScanLine, ShieldCheck, Sigma, TrendingUp, XCircle,
} from "lucide-react";
import { api } from "../api/client";
import { Badge, Card, ErrorNote, SectionTitle, StatCard } from "../components/ui";
import type { ModelStatus, Stats } from "../types";
import { fmtDateTime } from "../utils";

const FEATURE_OVERVIEW = [
  { name: "Ink Density", formula: "D = Nf / Nt", icon: Droplets },
  { name: "Writing Height", formula: "H = ymax − ymin", icon: MoveVertical },
  { name: "Writing Width", formula: "W = xmax − xmin", icon: MoveHorizontal },
  { name: "Stroke Width", formula: "S ≈ 2 · d̄", icon: Minus },
  { name: "Word Spaces", formula: "V(x) low-ink runs", icon: Grip },
  { name: "Average Gap", formula: "Gavg = mean(Gᵢ)", icon: ArrowLeftRight },
  { name: "Baseline Angle", formula: "θ = tan⁻¹(m)", icon: TrendingUp },
  { name: "Handwriting Lines", formula: "P(y) peak detection", icon: AlignJustify },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
    api.modelStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent p-6 lg:p-8">
        <Badge tone="violet">AI Research Platform · B.Tech Capstone</Badge>
        <h1 className="mt-3 text-2xl lg:text-3xl font-extrabold text-white">
          GraphVision AI
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
          A computer-vision pipeline for preprocessing handwriting images and extracting eight quantitative
          features, plus a Siamese CNN for signature similarity verification. All measurements are
          image characteristics — this system makes no personality or psychological claims.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="indigo">OpenCV pipeline</Badge>
          <Badge tone="indigo">Siamese CNN · 128-D embeddings</Badge>
          <Badge tone="indigo">Contrastive loss (margin 1.0)</Badge>
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      {/* Action cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/handwriting" className="group">
          <Card className="h-full transition-all duration-200 group-hover:border-violet-500/40 group-hover:shadow-lg group-hover:shadow-violet-500/10 group-hover:-translate-y-0.5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                <PenTool size={22} className="text-violet-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  Handwriting Image Analysis
                  <ArrowRight size={15} className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Upload a handwritten image, watch the CV preprocessing pipeline, and extract eight
                  measurable visual characteristics with charts and CSV/PDF reports.
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/verify" className="group">
          <Card className="h-full transition-all duration-200 group-hover:border-indigo-500/40 group-hover:shadow-lg group-hover:shadow-indigo-500/10 group-hover:-translate-y-0.5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <ScanLine size={22} className="text-indigo-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  Signature Verification
                  <ArrowRight size={15} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Upload two signature images and compare their 128-D Siamese embeddings via Euclidean
                  distance against the validation-selected threshold.
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Live stats — start at zero, grow with actual usage */}
      <div>
        <SectionTitle icon={Activity} title="Application Statistics" subtitle="Derived from actual application activity" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileScan} label="Handwriting images analyzed" value={stats?.handwriting_analyses ?? "…"} tone="violet" />
          <StatCard icon={ShieldCheck} label="Signature comparisons performed" value={stats?.signature_comparisons ?? "…"} tone="indigo" />
          <StatCard icon={CheckCircle2} label="Predicted genuine pairs" value={stats?.genuine_detected ?? "…"} tone="emerald" />
          <StatCard icon={XCircle} label="Predicted potential forgeries" value={stats?.forged_detected ?? "…"} tone="rose" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent history */}
        <div>
          <SectionTitle icon={LayoutDashboard} title="Recent Analysis History" />
          <Card className="p-0 overflow-hidden">
            {stats && stats.recent.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No analyses yet — run your first handwriting analysis or signature comparison.
              </div>
            )}
            {stats?.recent.map((r) => (
              <div key={`${r.type}-${r.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <img src={r.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-200 truncate">{r.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.subtitle}</div>
                </div>
                <div className="text-right shrink-0">
                  <Badge tone={r.type === "handwriting" ? "violet" : "indigo"}>{r.type}</Badge>
                  <div className="text-[10px] text-slate-500 mt-1">{fmtDateTime(r.created_at)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* System & model status */}
        <div>
          <SectionTitle icon={Cpu} title="Model & System Status" />
          <Card className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2"><Database size={15} /> Backend API & Database</span>
              {stats ? <Badge tone="emerald"><CheckCircle2 size={12} /> Operational</Badge> : <Badge tone="amber">Checking…</Badge>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2"><Cpu size={15} /> Compute device</span>
              <Badge tone="slate">{status?.device ?? "—"}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2"><Sigma size={15} /> Siamese checkpoint</span>
              {status?.model_loaded
                ? <Badge tone="emerald"><CheckCircle2 size={12} /> Loaded</Badge>
                : <Badge tone="amber">Not loaded — setup required</Badge>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-2"><TrendingUp size={15} /> Decision threshold (τ)</span>
              <Badge tone="slate">{status?.config?.decision_threshold ?? "not configured"}</Badge>
            </div>
            {status && !status.model_loaded && (
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-white/5">
                Signature verification stays disabled until trained weights are provided — the app never
                simulates inference. See <span className="text-violet-300">Model Performance → Setup</span> or the README.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Feature overview */}
      <div>
        <SectionTitle icon={Sigma} title="Feature Extraction Overview"
          subtitle="Eight quantitative image characteristics (F = [D, H, W, S, Ng, Gavg, θ, L])" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURE_OVERVIEW.map((f) => (
            <Card key={f.name} className="text-center">
              <f.icon size={20} className="mx-auto text-violet-300" />
              <div className="mt-2 text-sm font-semibold text-slate-100">{f.name}</div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">{f.formula}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
