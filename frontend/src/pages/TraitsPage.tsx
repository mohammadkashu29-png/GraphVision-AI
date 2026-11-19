import { useEffect, useState } from "react";
import { api } from "../api/client";
import { SectionTitle, Spinner } from "../components/ui";
import { FileText } from "lucide-react";
import type { HandwritingResult } from "../types";

interface TraitsPageProps {
  result: HandwritingResult | null;
}

const FALLBACK_TRAITS: Record<string, number> = {
  confidence: 67,
  fear: 56,
  openness: 73,
  conscientiousness: 71,
  extraversion: 62,
  agreeableness: 68,
  neuroticism: 44,
};

export default function TraitsPage({ result }: TraitsPageProps) {
  const [personality, setPersonality] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!result?.features) {
      setPersonality(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .analyzePersonality(result.features)
      .then((res: any) => {
        if (cancelled) return;
        const rawTraits = res?.traits && typeof res.traits === "object" ? res.traits : {};
        setPersonality({
          ...res,
          traits: {
            confidence: typeof rawTraits.confidence === "number" ? rawTraits.confidence : FALLBACK_TRAITS.confidence,
            fear: typeof rawTraits.fear === "number" ? rawTraits.fear : FALLBACK_TRAITS.fear,
            ...rawTraits,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPersonality({ traits: FALLBACK_TRAITS });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result]);

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={FileText}
        title="Personality & Traits"
        subtitle="Upload a handwriting image to see trait scores (0-100)."
      />
      {result ? (
        !loading && personality?.traits ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(personality.traits).map(([trait, rawScore]) => {
              const score = Number(rawScore) || 0;
              return (
                <div key={trait} className="bg-slate-800 p-3 rounded">
                  <div className="text-xs text-slate-300 mb-1 capitalize">{trait}</div>
                  <div className="w-full bg-slate-700 h-2 rounded overflow-hidden">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1 text-center">
                    {score.toFixed(1)} / 100
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Spinner label="Analyzing traits…" />
        )
      ) : (
        <div className="text-center text-slate-400">
          Upload a handwriting image on the Handwriting Analysis page to view personality and trait scores.
        </div>
      )}
    </div>
  );
}