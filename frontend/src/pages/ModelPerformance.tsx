import { useEffect, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, BookOpenCheck, Cpu, Settings, Target } from "lucide-react";
import { api } from "../api/client";
import { Badge, Card, ErrorNote, InfoBanner, SectionTitle, StatCard, tooltipStyle } from "../components/ui";
import type { EvalResults, ModelStatus } from "../types";
import { fmtNum, fmtPct } from "../utils";

const METRICS = [
  { key: "accuracy", label: "Accuracy" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
  { key: "f1", label: "F1-score" },
  { key: "far", label: "FAR (False Acceptance)" },
  { key: "frr", label: "FRR (False Rejection)" },
  { key: "eer", label: "EER (Equal Error Rate)" },
  { key: "roc_auc", label: "ROC-AUC" },
] as const;

// TODO(verify before publishing): values below were transcribed from the author's paper draft by an
// earlier assistant; they have NOT been re-checked against the source. Confirm or remove.
const PAPER_TABLE1: [string, string, string, string][] = [
  ["Ink density", "0.1258", "0.0897", "0.1489"],
  ["Writing height (px)", "106.67", "60", "141"],
  ["Writing width (px)", "516.67", "388", "682"],
  ["Estimated stroke width (px)", "2.4499", "2.1416", "2.6199"],
  ["Candidate word spaces", "19.33", "6", "34"],
  ["Average gap (px)", "23.8017", "17", "34.1111"],
  ["Baseline-related angle (°)", "13.0975", "12.5244", "13.6705"],
  ["Detected handwriting lines", "3.00", "1", "5"],
];

export default function ModelPerformance() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [evaluation, setEvaluation] = useState<EvalResults | null>(null);
  const [evalAvailable, setEvalAvailable] = useState(false);
  const [evalMessage, setEvalMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.modelStatus().then(setStatus).catch((e) => setError(e.message));
    api.modelEvaluation()
      .then((r) => { setEvalAvailable(r.available); setEvaluation(r.evaluation ?? null); setEvalMessage(r.message ?? null); })
      .catch((e) => setError(e.message));
  }, []);

  const rocData = evaluation?.roc_curve.fpr.map((f, i) => ({
    fpr: f, tpr: evaluation.roc_curve.tpr[i], diag: f,
  })) ?? [];
  const lossData = evaluation?.loss_curves.train.map((v, i) => ({
    epoch: i + 1, train: v, validation: evaluation.loss_curves.validation[i] ?? null,
  })) ?? [];

  return (
    <div className="space-y-10">
      <SectionTitle icon={BarChart3} title="Model Performance & Evaluation"
        subtitle="Signature verification metrics come only from saved evaluation results — handwriting metrics are paper-reported" />

      {error && <ErrorNote message={error} />}

      {/* ============ Siamese CNN evaluation ============ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">Signature Verification — Siamese CNN</h2>
          <Badge tone={evalAvailable ? "emerald" : "amber"}>
            {evalAvailable ? "Saved evaluation results loaded" : "No evaluation results available"}
          </Badge>
        </div>

        {(!status?.model_loaded || !evalAvailable) && (
          <Card className="border-amber-500/30 bg-amber-500/[0.06] space-y-3">
            <div className="flex items-start gap-3">
              <Settings size={20} className="text-amber-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-200">Metrics will appear here after training & evaluation</div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  To keep this a scientifically honest demo, no performance numbers are hardcoded. Run the
                  training script against your CEDAR dataset — it trains the Siamese CNN with writer-disjoint
                  splits, selects the decision threshold on validation pairs, evaluates on held-out test
                  writers, and writes <span className="font-mono text-amber-200">eval_results.json</span> that
                  this page renders.
                </p>
                <div className="mt-2 rounded-lg bg-slate-900/80 border border-white/10 px-3 py-2 font-mono text-[11px] text-slate-300">
                  python training/train_siamese.py --cedar /path/to/CEDAR --epochs 30
                </div>
                {evalMessage && <div className="mt-2 text-[11px] text-slate-500">{evalMessage}</div>}
              </div>
            </div>
          </Card>
        )}

        {status?.model_loaded && evalAvailable && evaluation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {METRICS.map((m) => (
                <StatCard key={m.key} icon={Target} label={m.label}
                  value={m.key === "roc_auc" ? fmtNum(evaluation.roc_auc, 4) : fmtPct(evaluation[m.key] as number)}
                  tone={["far", "frr", "eer"].includes(m.key) ? "rose" : "emerald"} />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge tone="violet">Threshold τ = {fmtNum(evaluation.threshold, 4)}</Badge>
              <Badge tone="slate">{evaluation.threshold_selection}</Badge>
              <Badge tone="slate">Test pairs: {evaluation.test_pairs}</Badge>
              {evaluation.splits && (
                <Badge tone="slate">
                  Writer-disjoint: {evaluation.splits.train_writers} train / {evaluation.splits.val_writers} val / {evaluation.splits.test_writers} test
                </Badge>
              )}
              {evaluation.device && <Badge tone="indigo"><Cpu size={12} /> {evaluation.device}</Badge>}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <div className="text-xs font-medium text-slate-300 mb-3">Confusion Matrix (test set)</div>
                <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-xs">
                  <div />
                  <div className="text-slate-400 font-medium">Predicted Same</div>
                  <div className="text-slate-400 font-medium">Predicted Different</div>
                  <div className="text-slate-400 font-medium text-right pr-2 self-center">Actual Genuine</div>
                  <div className="rounded-lg py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-lg">{evaluation.confusion_matrix.tp}</div>
                  <div className="rounded-lg py-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-lg">{evaluation.confusion_matrix.fn}</div>
                  <div className="text-slate-400 font-medium text-right pr-2 self-center">Actual Forgery</div>
                  <div className="rounded-lg py-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-lg">{evaluation.confusion_matrix.fp}</div>
                  <div className="rounded-lg py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-lg">{evaluation.confusion_matrix.tn}</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3">
                  FAR = forgeries accepted as genuine = FP/(FP+TN) · FRR = genuines rejected = FN/(FN+TP).
                  Predictions are model-based similarity decisions, not definitive authenticity judgments.
                </p>
              </Card>
              <Card>
                <div className="text-xs font-medium text-slate-300 mb-3">ROC Curve</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={rocData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#64748b" }} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="tpr" name="ROC (TPR vs FPR)" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                    <Line type="linear" dataKey="diag" name="Random" stroke="#475569" dot={false} strokeWidth={1} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card className="lg:col-span-2">
                <div className="text-xs font-medium text-slate-300 mb-3">Training & Validation Loss (contrastive loss, margin 1.0)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={lossData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={48} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="train" name="Train loss" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="validation" name="Validation loss" stroke="#34d399" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <InfoBanner tone="indigo">
              <AlertTriangle size={13} className="inline mr-1" />
              These metrics describe similarity prediction between signature pairs. Automated similarity is
              <b> not definitive proof of authenticity</b>, and results depend on the training dataset size and
              writer-disjoint generalization. A single split and seed is not enough to claim generalization.
            </InfoBanner>
          </div>
        )}
      </div>

      {/* ============ Handwriting feature extraction evaluation (paper-reported) ============ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">Handwriting Feature Extraction Evaluation</h2>
          <Badge tone="violet">Reported in the research paper</Badge>
        </div>
        <InfoBanner tone="indigo">
          <BookOpenCheck size={13} className="inline mr-1" />
          The two evaluations below are <b>independent</b>: word-space detection was evaluated on a 50-sample
          IAM-based set (paper-reported), while Siamese CNN metrics above come from CEDAR signature-pair
          evaluation. They measure different things and must not be compared directly.
        </InfoBanner>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <StatCard icon={Target} label="Exact word-space count agreement (26 / 50 samples)" value="52%" tone="violet" />
          <StatCard icon={Target} label="Mean Absolute Error (spaces / sample)" value="0.68" tone="indigo" />
          <StatCard icon={BookOpenCheck} label="Evaluation dataset" value="50 IAM-based samples" tone="slate" />
          <StatCard icon={BookOpenCheck} label="Separate descriptive feature set" value="3 images" tone="slate" />
        </div>

        <Card className="mt-4 p-0 overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-slate-100 border-b border-white/5">
            Descriptive Statistics — Three-Image Set (Paper Table I)
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/5">
                <th className="px-4 py-2 font-medium">Feature</th>
                <th className="px-4 py-2 font-medium">Mean</th>
                <th className="px-4 py-2 font-medium">Min.</th>
                <th className="px-4 py-2 font-medium">Max.</th>
              </tr>
            </thead>
            <tbody>
              {PAPER_TABLE1.map((row) => (
                <tr key={row[0]} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2 text-slate-200">{row[0]}</td>
                  <td className="px-4 py-2 font-mono text-violet-300">{row[1]}</td>
                  <td className="px-4 py-2 font-mono text-slate-400">{row[2]}</td>
                  <td className="px-4 py-2 font-mono text-slate-400">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-[11px] text-slate-500 mt-2">
          The exact-match rate evaluates the <b>number</b> of gaps, not the precise localization of each word
          boundary, and should not be interpreted as a full word-segmentation accuracy measure. These values
          describe only the evaluated samples and are not population-level estimates.
        </p>
      </div>
    </div>
  );
}
