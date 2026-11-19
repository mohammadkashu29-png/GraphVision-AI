import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3, BookOpen, History as HistoryIcon, LayoutDashboard, Menu,
  PanelLeftClose, PanelLeftOpen, PenTool, ScanLine, Sparkles, X,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/handwriting", label: "Handwriting Analysis", icon: PenTool },
  { to: "/verify", label: "Signature Verification", icon: ScanLine },
  { to: "/model", label: "Model Performance", icon: BarChart3 },
  { to: "/methodology", label: "Methodology", icon: BookOpen },
  { to: "/history", label: "Analysis History", icon: HistoryIcon },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current = NAV.find((n) => n.to === location.pathname) ?? NAV[0];

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
          <Sparkles size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">GraphVision AI</div>
            <div className="text-[10px] text-slate-500 truncate">Handwriting & Signature Intelligence</div>
          </div>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors border ${
                isActive
                  ? "bg-violet-500/10 border-violet-500/20 text-violet-200"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`
            }
            title={label}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-white/5 text-[10px] text-slate-500 shrink-0">
        {!collapsed && <>GraphVision AI v1.0 · B.Tech Capstone<br />Measurements only — no personality claims</>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-white/5 bg-[#0B1220]/95 backdrop-blur transition-all duration-300 ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {sidebar}
      </aside>
      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#0B1220] border-r border-white/5">
            <button
              className="absolute top-4 right-3 text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className={`min-h-screen transition-all duration-300 ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 lg:px-8 border-b border-white/5 bg-[#070B14]/80 backdrop-blur">
          <button className="lg:hidden text-slate-300 hover:text-white" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <button
            className="hidden lg:block text-slate-400 hover:text-white transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">{current.label}</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Handwriting Analysis & Signature Verification System
            </p>
          </div>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
