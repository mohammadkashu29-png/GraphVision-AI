import type {
  HTRResult, HTRStatus, EvalResults, FeaturesHistoryEntry, HandwritingResult, HistoryItem,
  ModelStatus, Stats, VerifyResult,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (body.detail?.message) message = body.detail.message;
    } catch { /* keep default */ }
    throw new Error(message);
  }
  return res.json();
}

function withFile(file: File, field: string): FormData {
  const fd = new FormData();
  fd.append(field, file);
  return fd;
}

export const api = {
  recognizeHandwriting: (file: File) =>
    request<HTRResult>("/api/htr/recognize", { method: "POST", body: withFile(file, "file") }),
  htrStatus: () => request<HTRStatus>("/api/htr/status"),
  stats: () => request<Stats>("/api/stats"),
  modelStatus: () => request<ModelStatus>("/api/model/status"),
  modelEvaluation: () =>
    request<{ available: boolean; evaluation?: EvalResults; message?: string }>("/api/model/evaluation"),
  analyzeHandwriting: (file: File) =>
    request<HandwritingResult>("/api/handwriting/analyze", { method: "POST", body: withFile(file, "file") }),
  analyzePersonalityImage: (file: File) =>
    request<any>("/api/analyze-personality", {
      method: "POST",
      body: (() => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
      })(),
    }),
  featuresHistory: (limit = 10) =>
    request<{ samples: FeaturesHistoryEntry[] }>(`/api/handwriting/features-history?limit=${limit}`),
  verifySignatures: (a: File, b: File) => {
    const fd = new FormData();
    fd.append("signature_a", a);
    fd.append("signature_b", b);
    return request<VerifyResult>("/api/signature/verify", { method: "POST", body: fd });
  },
  history: (type?: "handwriting" | "signature") =>
    request<{ items: HistoryItem[] }>(`/api/history${type ? `?type=${type}` : ""}`),
  historyDetail: (type: "handwriting" | "signature", id: number) =>
    request<any>(`/api/history/${type}/${id}`),
  deleteHistory: (type: "handwriting" | "signature", id: number) =>
    request<{ deleted: boolean }>(`/api/history/${type}/${id}`, { method: "DELETE" }),
};
