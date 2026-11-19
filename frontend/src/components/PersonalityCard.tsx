import { useEffect, useState } from "react";
import { api } from "../api/client";

interface PersonalityResponse {
  traits: Record<string, number>;
  hypothesis: string;
  disclaimer: string;
}

export default function PersonalityCard({ features }: { features: any }) {
  const [data, setData] = useState<PersonalityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!features) return;
    setLoading(true);
    api
      .analyzePersonality(features)
      .then((res) => setData(res))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [features]);

  if (!features) return null;
  if (loading) return <div className="p-4 text-sm text-slate-500">Analyzing personality…</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const entries = Object.entries(data.traits) as [string, number][];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Personality & Behavioral Traits</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {entries.map(([name, score]) => (
          <div key={name} className="bg-slate-800 p-3 rounded">
            <div className="text-xs text-slate-300 mb-1 capitalize">{name}</div>
            <div className="w-full bg-slate-700 h-2 rounded overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1 text-center">{score.toFixed(1)} / 100</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300">{data.hypothesis}</p>
      <p className="mt-2 text-xs text-slate-500 italic">{data.disclaimer}</p>
    </div>
  );
}
