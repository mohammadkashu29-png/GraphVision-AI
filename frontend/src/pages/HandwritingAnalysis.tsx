import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import HTRRecognition from "../components/HTRRecognition";
import UploadZone from "../components/UploadZone";
import { SectionTitle, Card, Badge, Spinner, ErrorNote, InfoBanner, tooltipStyle } from "../components/ui";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Download, FileSpreadsheet, FileText,
} from "lucide-react";
// Add imports for personality prediction
import PersonalityResultCard from "../components/PersonalityResultCard";
import type { PersonalityResult } from "../types";

// In the JSX, after the feature visualisation (or after the Handwriting result), add a section to display personality prediction

import type { FeaturesHistoryEntry, HandwritingResult } from "../types";
import { fmtDateTime } from "../utils";

const STAGES = [
  { key: "original", label: "1 · Original Image" },
  { key: "grayscale", label: "2 · Grayscale" },
  { key: "binary", label: "3 · Binary (Otsu)" },
  { key: "processed", label: "4 · Processed Handwriting" },
] as const;

function FeatureVisual({ k, value, imageW, imageH }: { k: string; value: number | null; imageW: number; imageH: number }) {
  if (value === null || value === undefined) {
    return <div className="h-16 flex items-center text-[11px] text-slate-500">Not computed (insufficient data)</div>;
  }

  switch (k) {
    case "ink_density": {
      const pct = Math.min(value, 1);
      const c = 2 * Math.PI * 24;
      return (
        <svg width="72" height="64" viewBox="0 0 64 64" className="mx-auto">
          <circle cx="32" cy="32" r="24" fill="none" stroke="#1e293b" strokeWidth="7" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="#8b5cf6" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 32 32)" />
          <text x="32" y="36" textAnchor="middle" fill="#e2e8f0" fontSize="11">{(pct * 100).toFixed(1)}%</text>
        </svg>
      );
    }
    case "writing_height":
    case "writing_width": {
      const pct = Math.min(value / (k === "writing_height" ? imageH : imageW), 1);
      return (
        <div className="h-16 flex flex-col justify-center gap-2 px-2">
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="text-[10px] text-slate-500">{(pct * 100).toFixed(0)}% of image {k === "writing_height" ? "height" : "width"}</div>
        </div>
      );
    }
    case "stroke_width": {
      return (
        <svg width="100%" height="64" viewBox="0 0 160 64" className="px-2" preserveAspectRatio="none">
          <line x1="10" y1="32" x2="150" y2="32" stroke="#1e293b" strokeWidth={Math.max(value * 3 + 6, 8)} strokeLinecap="round" />
          <line x1="10" y1="32" x2="150" y2="32" stroke="#818cf8" strokeWidth={Math.max(value * 3, 2)} strokeLinecap="round" />
        </svg>
      );
    }
    case "word_spaces": {
      const n = Math.min(Math.round(value), 40);
      return (
        <>
          <div className="h-16 flex flex-wrap items-center content-center gap-1 px-1">
            {Array.from({ length: n }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            ))}
          </div>
        </>
      );
    }
    case "average_gap": {
      const pct = Math.min(value / 60, 1);
      return (
        <div className="h-16 flex flex-col justify-center gap-2 px-2">
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="text-[10px] text-slate-500">relative to 60 px scale</div>
        </div>
      );
    }
    case "baseline_angle": {
      return (
        <svg width="100%" height="64" viewBox="0 0 160 64" className="px-2">
          <line x1="10" y1="46" x2="150" y2="46" stroke="#334155" strokeDasharray="4 3" />
          <line x1="10" y1="46" x2="150" y2="46" stroke="#f472b6" strokeWidth="3" transform={`rotate(${-value} 80 46)`} />
        </svg>
      );
    }
    case "handwriting_lines": {
      const n = Math.min(Math.round(value), 12);
      return (
        <div className="h-16 flex flex-col justify-center gap-1.5 px-6">
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="h-1 rounded bg-indigo-400" style={{ width: `${70 + ((i * 13) % 25)}%` }} />
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function MiniBars({ data, color }: { data: { name: string; value: number | null }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} />
        <YAxis hide />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HandwritingAnalysisProps {
  onAnalysisComplete?: (result: HandwritingResult | null) => void;
}

export default function HandwritingAnalysis({ onAnalysisComplete }: HandwritingAnalysisProps) {
  const [personality, setPersonality] = useState<PersonalityResult | null>(null);
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [personalityError, setPersonalityError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [historyFeatures, setHistoryFeatures] = useState<FeaturesHistoryEntry[]>([]);
  const [result, setResult] = useState<HandwritingResult | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  function loadHistory() {
    api.featuresHistory(10)
      .then((r) => setHistoryFeatures(r.samples))
      .catch(() => {});
  }

  const analyze = async (f: File) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.analyzeHandwriting(f);
      setResult(r);
      // Request personality prediction using the same image file
      setPersonalityLoading(true);
      api.analyzePersonalityImage(f)
        .then(setPersonality)
        .catch((e: any) => setPersonalityError(e.message))
        .finally(() => setPersonalityLoading(false));
      onAnalysisComplete?.(r);
      loadHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onFile = (f: File) => {
    setPreview(URL.createObjectURL(f));
    analyze(f);
  };

  const clearAll = () => {
    setResult(null);
    onAnalysisComplete?.(null);
    setPreview(null);
    setError(null);
    setPersonality(null);
    setPersonalityError(null);
  };

  // Cross-sample comparison data (current sample + recent history)
  const sampleEntries = result
    ? [
        { id: -1, features: result.features, current: true },
        ...historyFeatures.filter((e) => e.id !== result.analysis_id).slice(0, 9).map((e) => ({ ...e, current: false })),
      ]
    : [];
  const FEATURE_KEYS = [
    "ink_density", "writing_height", "writing_width", "stroke_width",
    "word_spaces", "average_gap", "baseline_angle", "handwriting_lines",
  ];

  return (
    <div className="space-y-8">
      <HTRRecognition />
      <SectionTitle
        icon={FileSpreadsheet}
        title="Handwriting Image Analysis"
        subtitle="Grayscale → Otsu → ruling-line handling → noise filtering → eight quantitative features"
      />

      {/* Upload */}
      <Card>
        <div className="grid md:grid-cols-2 gap-5 items-start">
          <UploadZone label="Upload handwritten image" onFile={onFile} onClear={clearAll} preview={preview} disabled={loading} />
          <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <p className="font-semibold text-slate-200 text-sm">What happens on upload</p>
            <p>1 · Grayscale conversion → 2 · Otsu thresholding (ink as foreground) → 3 · Morphological detection & removal of horizontal ruling lines → 4 · Connected-component noise filtering → 5 · Eight-feature extraction.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone="violet">PNG / JPG / JPEG</Badge>
              <Badge tone="slate">Max 10 MB</Badge>
              <Badge tone="slate">Processed at original resolution</Badge>
            </div>
          </div>
        </div>
      </Card>

      {loading && (
        <Card>
          <Spinner label="Preprocessing image and extracting features…" />
        </Card>
      )}
      {error && <ErrorNote message={error} />}

      {/* Personality UI */}
      {personalityLoading && <div className="p-4 text-sm text-slate-500">Analyzing personality…</div>}
      {personalityError && <div className="p-4 text-sm text-red-500">Error: {personalityError}</div>}
      {personality && <PersonalityResultCard data={personality} />}

      {result && !loading && (
        <>
          {/* Preprocessing metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge tone="violet">Otsu threshold: {result.preprocessing.otsu_threshold}</Badge>
            <Badge tone="slate">Ruling-line pixels removed: {result.preprocessing.ruling_line_pixels_removed}</Badge>
            <Badge tone="slate">Noise components removed: {result.preprocessing.components_removed} / {result.preprocessing.components_total}</Badge>
            <Badge tone="slate">Min component area: {result.preprocessing.min_component_area} px</Badge>
            <Badge tone="slate">{result.width}×{result.height} px</Badge>
            <Badge tone="indigo">{result.processing_time_ms.toFixed(1)} ms</Badge>
          </div>

          {/* Pipeline stages */}
          <div>
            <SectionTitle title="Preprocessing Pipeline" subtitle="Original → Grayscale → Binary → Processed handwriting (ink shown as white foreground)" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STAGES.map((s, i) => (
                <Card key={s.key} className="p-3">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300 mb-2">
                    <span>{s.label}</span>
                    {i < STAGES.length - 1 && <ArrowRight size={11} className="ml-auto text-violet-400" />}
                  </div>
                  <img src={result.stages[s.key]} alt={s.label} className="w-full rounded-lg border border-white/10 bg-slate-900" />
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <Card className="p-3">
                <div className="text-xs font-medium text-slate-300 mb-1">Original vs. Processed (side-by-side)</div>
                <div className="grid grid-cols-2 gap-2">
                  <img src={result.stages.original} alt="Original" className="rounded-lg border border-white/10" />
                  <img src={result.stages.processed} alt="Processed" className="rounded-lg border border-white/10 bg-slate-900" />
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs font-medium text-slate-300 mb-1">Binary foreground</div>
                <img src={result.stages.binary} alt="Binary" className="rounded-lg border border-white/10 bg-slate-900 max-h-40 object-contain w-full" />
              </Card>
            </div>
          </div>

          {/* Feature cards */}
          <div>
            <SectionTitle title="Extracted Features" subtitle="Eight quantitative measurements — image characteristics only, not psychological indicators" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.feature_rows.map((row) => (
                <Card key={row.key} className="flex flex-col gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{row.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{row.formula}</div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">
                      {row.value === null || row.value === undefined ? "—" : row.value}
                    </span>
                    <span className="text-xs text-slate-400">{row.unit}</span>
                  </div>
                  <FeatureVisual k={row.key} value={row.value} imageW={result.width} imageH={result.height} />
                  <p className="text-[11px] leading-snug text-slate-400">{row.explanation}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Visual Analytics */}
          <div>
            <SectionTitle title="Visual Analytics" subtitle="Projection profiles, gap distribution, and cross-sample comparison" />
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <div className="text-xs font-medium text-slate-300 mb-1">Vertical Projection V(x) — candidate word gaps</div>
                <div className="text-[11px] text-slate-500 mb-2">{result.features.word_spaces} candidate word spaces detected</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={result.charts.vertical_projection}>
                    <XAxis dataKey="x" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area dataKey="v" stroke="#8b5cf6" fill="#8b5cf633" type="monotone" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <div className="text-xs font-medium text-slate-300 mb-1">Horizontal Projection P(y) — line detection</div>
                <div className="text-[11px] text-slate-500 mb-2">{result.features.handwriting_lines} handwriting line(s) detected</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={result.charts.horizontal_projection}>
                    <XAxis dataKey="x" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area dataKey="v" stroke="#818cf8" fill="#818cf833" type="monotone" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <div className="text-xs font-medium text-slate-300 mb-1">Candidate Word-Space Distribution (gap widths)</div>
                <div className="text-[11px] text-slate-500 mb-2">
                  Average gap: {result.features.average_gap} px · {result.charts.gap_widths.length} gap(s)
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={result.charts.gap_widths.map((g, i) => ({ name: `#${i + 1}`, px: g }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="px" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <div className="text-xs font-medium text-slate-300 mb-1">Stroke Width — distance-transform distribution</div>
                <div className="text-[11px] text-slate-500 mb-2">S ≈ 2 · d̄ = {result.features.stroke_width} px</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={result.charts.stroke_distance_histogram}>
                    <XAxis dataKey="bin" tick={{ fontSize: 8, fill: "#64748b" }} interval={3} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>

          {/* Feature Comparison */}
          <div>
            <SectionTitle title="Eight-Feature Comparison Across Analyses" subtitle="" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURE_KEYS.map((k) => {
                const row = result.feature_rows.find((r) => r.key === k)!;
                const data = sampleEntries.map((e) => ({
                  name: e.current ? "Current" : `#${e.id}`,
                  value: (e.features as any)[k],
                }));
                return (
                  <div key={k}>
                    <div className="text-[11px] font-medium text-slate-300 text-center truncate">{row.name}</div>
                    <MiniBars data={data} color="#8b5cf6" />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
