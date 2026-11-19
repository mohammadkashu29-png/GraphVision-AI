import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const tooltipStyle = {
  backgroundColor: "#0B1220",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon: Icon, title, subtitle }: { icon?: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-violet-300" />
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  violet: "from-violet-500/20 to-violet-500/5 text-violet-300",
  indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-300",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-300",
  slate: "from-slate-500/20 to-slate-500/5 text-slate-300",
};

export function StatCard({ icon: Icon, label, value, tone = "violet" }: {
  icon: LucideIcon; label: string; value: ReactNode; tone?: keyof typeof TONES;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white leading-tight">{value}</div>
        <div className="text-xs text-slate-400 truncate">{label}</div>
      </div>
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  slate: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
      {label && <div className="text-sm text-slate-400">{label}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {message}
    </div>
  );
}

export function InfoBanner({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "indigo" | "rose" }) {
  const map = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };
  return <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${map[tone]}`}>{children}</div>;
}
