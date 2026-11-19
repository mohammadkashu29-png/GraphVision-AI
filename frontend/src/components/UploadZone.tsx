import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

const ALLOWED_EXT = [".png", ".jpg", ".jpeg"];
const MAX_MB = 10;

export default function UploadZone({ label, hint, preview, onFile, onClear, disabled }: {
  label: string;
  hint?: string;
  preview?: string | null;
  onFile: (f: File) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (f?: File | null) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXT.includes(ext) && !f.type.startsWith("image/")) {
      setError("Unsupported file. Please upload a PNG, JPG or JPEG image.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    onFile(f);
  };

  return (
    <div>
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
          drag ? "border-violet-400 bg-violet-500/10" : "border-slate-700 bg-white/[0.02] hover:border-violet-500/50"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
      >
        {preview ? (
          <div className="p-3 relative">
            <img src={preview} alt={label} className="max-h-48 w-full object-contain rounded-lg bg-slate-900" />
            {onClear && (
              <button
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-900/80 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <UploadCloud size={28} className="text-violet-400" />
            <div className="text-sm font-medium text-slate-200">{label}</div>
            <div className="text-xs text-slate-500">{hint ?? "Drag & drop or click to browse — PNG, JPG, JPEG (max 10 MB)"}</div>
          </div>
        )}
        <input
          ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" disabled={disabled}
          onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
    </div>
  );
}
