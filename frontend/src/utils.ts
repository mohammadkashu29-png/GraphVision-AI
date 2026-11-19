export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtNum(v: number | null | undefined, d = 2): string {
  return v === null || v === undefined ? "—" : Number(v).toFixed(d);
}

export function fmtPct(v: number | null | undefined, d = 1): string {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(d)}%`;
}
