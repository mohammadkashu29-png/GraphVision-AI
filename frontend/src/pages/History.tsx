import { useCallback, useEffect, useState } from "react";
import { Download, FileText, History as HistoryIcon, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { Badge, Card, ErrorNote, SectionTitle, Spinner } from "../components/ui";
import type { HistoryItem } from "../types";
import { fmtDateTime, fmtNum } from "../utils";

type Tab = "all" | "handwriting" | "signature";

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.history().then((r) => setItems(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (type: "handwriting" | "signature", id: number) => {
    try {
      setDetail(await api.historyDetail(type, id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (type: "handwriting" | "signature", id: number) => {
    if (!window.confirm("Delete this entry permanently?")) return;
    await api.deleteHistory(type, id).catch((e) => setError(e.message));
    load();
  };

  const filtered = items.filter((i) => tab === "all" || i.type === tab);
  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" }, { key: "handwriting", label: "Handwriting" }, { key: "signature", label: "Signatures" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle icon={HistoryIcon} title="Analysis History"
        subtitle="Persisted in SQLite — survives page reloads and backend restarts" />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-xs font-medium border transition-colors ${
              tab === t.key
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-white/10 text-slate-400 hover:text-slate-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}
      {loading && <Card><Spinner /></Card>}

      {!loading && filtered.length === 0 && (
        <Card className="text-center py-10 text-sm text-slate-500">
          No history yet. Completed analyses and verifications appear here automatically.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <Card key={`${item.type}-${item.id}`} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <img src={item.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover bg-slate-900 border border-white/10 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-100 truncate">{item.title}</div>
                <div className="text-[11px] text-slate-500">{fmtDateTime(item.created_at)}</div>
                <div className="mt-1">
                  <Badge tone={item.type === "handwriting" ? "violet" : "indigo"}>
                    {item.type === "handwriting" ? "Handwriting analysis" : "Signature verification"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5">
              {item.type === "handwriting" ? (
                <>
                  <div>Ink density: <span className="font-mono text-violet-300">{fmtNum(item.summary.ink_density, 4)}</span></div>
                  <div>Word spaces: <span className="font-mono text-violet-300">{item.summary.word_spaces ?? "—"}</span> · Lines: <span className="font-mono text-violet-300">{item.summary.handwriting_lines ?? "—"}</span></div>
                </>
              ) : (
                <>
                  <div>{item.summary.predicted_same ? "Predicted Same / Genuine Pair" : "Predicted Different / Potential Forgery"}</div>
                  <div>d = <span className="font-mono text-indigo-300">{fmtNum(item.summary.distance, 4)}</span> · τ = <span className="font-mono text-slate-300">{fmtNum(item.summary.threshold, 4)}</span></div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-auto">
              <button onClick={() => open(item.type, item.id)}
                className="flex-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] text-violet-200 hover:bg-violet-500/20 transition-colors">
                Open
              </button>
              <button onClick={() => remove(item.type, item.id)}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0B1220] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{detail.filename ?? `${detail.filename_a} vs ${detail.filename_b}`}</h3>
                <div className="text-[11px] text-slate-500">{fmtDateTime(detail.created_at)} · {detail.type}</div>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {detail.type === "handwriting" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Original</div>
                    <img src={detail.original_image_url} className="w-full rounded-lg border border-white/10" alt="Original" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Processed</div>
                    <img src={detail.processed_image_url} className="w-full rounded-lg border border-white/10 bg-slate-900" alt="Processed" />
                  </div>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {(detail.feature_rows ?? []).map((r: any) => (
                      <tr key={r.key} className="border-b border-white/5">
                        <td className="py-2 text-slate-200">{r.name}</td>
                        <td className="py-2 font-mono text-violet-300 text-right">{r.value === null ? "—" : r.value} <span className="text-slate-500">{r.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2">
                  <a href={detail.csv_url} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 hover:bg-violet-500/20">
                    <Download size={13} /> CSV
                  </a>
                  <a href={detail.pdf_url} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 hover:bg-indigo-500/20">
                    <FileText size={13} /> PDF report
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Signature A</div>
                    <img src={detail.image_a_url} className="w-full rounded-lg border border-white/10 bg-slate-900" alt="Signature A" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Signature B</div>
                    <img src={detail.image_b_url} className="w-full rounded-lg border border-white/10 bg-slate-900" alt="Signature B" />
                  </div>
                </div>
                <div className={`inline-flex rounded-xl px-4 py-2 text-sm font-semibold border ${
                  detail.predicted_same
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}>
                  {detail.label}
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2"><div className="text-[10px] text-slate-500">Distance</div><div className="font-mono text-slate-100">{fmtNum(detail.distance, 4)}</div></div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2"><div className="text-[10px] text-slate-500">Threshold τ</div><div className="font-mono text-slate-100">{fmtNum(detail.threshold, 4)}</div></div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2"><div className="text-[10px] text-slate-500">Time</div><div className="font-mono text-slate-100">{fmtNum(detail.processing_time_ms, 1)} ms</div></div>
                </div>
                <div className="text-[11px] text-slate-500">Automated similarity is not definitive proof of authenticity.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
