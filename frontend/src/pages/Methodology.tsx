import { ArrowRight, BookOpen, FlaskConical, Layers, ShieldAlert } from "lucide-react";
import { Badge, Card, InfoBanner, SectionTitle } from "../components/ui";

const HW_PIPELINE = [
  "Input: handwriting image", "Grayscale conversion", "Otsu thresholding (binary foreground)",
  "Morphological opening → horizontal structures", "Ruling-line detection & removal",
  "Connected-component noise filtering", "Feature extraction (8 features)",
  "Feature vector F = [D, H, W, S, Ng, Gavg, θ, L]", "CSV report",
];

const SIG_PIPELINE = [
  "CEDAR dataset (55 writers × 24 genuine + 24 forged)", "Writer-disjoint train / val / test split",
  "Pair generation: genuine–genuine = 1, genuine–forgery = 0",
  "Shared CNN encoder (32 → 64 → 128 filters, ReLU, MaxPool)",
  "FC embedding head → 128-D embeddings", "Euclidean distance ‖eₐ − e_b‖₂",
  "Contrastive loss (margin 1.0)", "Threshold decision: d < τ ⇒ same/genuine, else different",
];

const FORMULAS = [
  { name: "Ink Density", f: "D = Nf / Nt", n: "Foreground pixels over total pixels (Eq. 1)" },
  { name: "Writing Dimensions", f: "H = ymax − ymin,   W = xmax − xmin", n: "Bounding box of handwriting region (Eq. 2–3)" },
  { name: "Estimated Stroke Width", f: "S ≈ 2 · d̄", n: "Distance-transform approximation (Eq. 4)" },
  { name: "Vertical Projection", f: "V(x) = Σy B(x, y)", n: "Candidate word-gap detection (Eq. 5)" },
  { name: "Average Gap", f: "Gavg = (1/n) Σ Gᵢ", n: "Mean candidate gap width (Eq. 6)" },
  { name: "Baseline-Related Angle", f: "y = mx + c,   θ = tan⁻¹(m)", n: "Line-position trend fit (Eq. 7)" },
  { name: "Horizontal Projection", f: "P(y) = Σx B(x, y)", n: "Handwriting-line peak detection (Eq. 8)" },
  { name: "Feature Vector", f: "F = [D, H, W, S, Ng, Gavg, θ, L]", n: "Exported per image (Eq. 9)" },
];

const STACK = ["Python", "OpenCV", "NumPy", "Pandas", "SciPy", "PyTorch", "Scikit-learn", "React", "FastAPI"];
const EXTRA_STACK = ["TypeScript", "Tailwind CSS", "Recharts", "SQLite", "ReportLab"];

const LIMITATIONS = [
  "Pixel-based measurements depend on image resolution, scale, illumination, and preprocessing.",
  "Ruling-line removal may also remove or distort handwriting strokes that overlap ruling lines.",
  "Candidate word gaps may not correspond to actual word boundaries.",
  "The baseline-related angle is a preliminary line-position trend estimate, not a validated letter-baseline or slant measurement.",
  "Image quality (lighting, blur, shadows) affects binarization and connected-component analysis.",
  "Evaluation sets are small; results are preliminary and not population-level estimates.",
  "Writer identities in the descriptive set have not been independently verified.",
  "Signature results from a single writer-disjoint split and seed are preliminary; genuine-vs-forged pairs may be separable by acquisition artefacts, so controls are needed before claiming generalization.",
];

function Pipeline({ steps, accent }: { steps: string[]; accent: "violet" | "indigo" }) {
  const cls = accent === "violet"
    ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium ${cls}`}>{s}</span>
          {i < steps.length - 1 && <ArrowRight size={13} className="text-slate-500 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function Methodology() {
  return (
    <div className="space-y-10">
      <SectionTitle icon={BookOpen} title="Research & Methodology"
        subtitle="Technical methodology as implemented" />

      <Card>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Layers size={16} className="text-violet-300" /> Module 1 — Handwriting Image Analysis Pipeline
        </h3>
        <Pipeline steps={HW_PIPELINE} accent="violet" />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Layers size={16} className="text-indigo-300" /> Module 2 — Signature Verification Pipeline
        </h3>
        <Pipeline steps={SIG_PIPELINE} accent="indigo" />
      </Card>

      <div>
        <SectionTitle icon={FlaskConical} title="Feature Definitions" subtitle="Mathematical definitions" />
        <div className="grid sm:grid-cols-2 gap-4">
          {FORMULAS.map((x) => (
            <Card key={x.name}>
              <div className="text-sm font-semibold text-slate-100">{x.name}</div>
              <div className="mt-1 font-mono text-sm text-violet-300">{x.f}</div>
              <div className="mt-1 text-[11px] text-slate-500">{x.n}</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <SectionTitle icon={BookOpen} title="Datasets" />
          <Card className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div>
              <div className="font-semibold text-slate-100 mb-1">CEDAR (signature verification)</div>
              55 writer folders, each containing 24 genuine signatures (<span className="font-mono">original_W_N.png</span>)
              and 24 forgeries (<span className="font-mono">forgeries_W_N.png</span>). Training, validation and test
              splits are <b>writer-disjoint</b> — no writer appears in more than one split — so evaluation
              measures generalization to unseen writers.
            </div>
          </Card>
        </div>
        <div>
          <SectionTitle icon={Layers} title="Technology Stack" />
          <Card>
            <div className="flex flex-wrap gap-2 mb-3">
              {STACK.map((s) => <Badge key={s} tone="violet">{s}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {EXTRA_STACK.map((s) => <Badge key={s} tone="slate">{s}</Badge>)}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              All computer-vision processing and Siamese inference run on the FastAPI backend — the frontend
              never simulates CV algorithms or model outputs.
            </p>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle icon={ShieldAlert} title="Limitations & Scientific Scope" />
        <Card className="space-y-4">
          <ul className="space-y-2">
            {LIMITATIONS.map((l, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-amber-400 mt-0.5">•</span>{l}
              </li>
            ))}
          </ul>
          <InfoBanner tone="rose">
            <b>Scientific scope:</b> the eight handwriting features are measurable image characteristics — they
            are <b>not validated indicators</b> of personality, intelligence, emotional state, or any
            psychological characteristic. The system does not perform personality prediction. Any future
            handwriting–personality study would require consented participants, validated psychological
            questionnaires, writer-independent evaluation, and independent replication.
          </InfoBanner>
          <InfoBanner tone="amber">
            <b>Signature decisions:</b> outputs are model-based similarity predictions ("predicted same /
            predicted different"). They are <b>never</b> labeled as definitively authentic or fraudulent, and
            automated similarity is not definitive proof of authenticity.
          </InfoBanner>
        </Card>
      </div>
    </div>
  );
}
