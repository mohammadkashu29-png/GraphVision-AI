import React from 'react';

interface PersonalityResult {
  prediction: string;
  confidence: number;
  top3: { class: string; probability: number }[];
}

export default function PersonalityResultCard({ data }: { data: PersonalityResult }) {
  return (
    <div className="mt-6 p-4 bg-slate-800 rounded">
      <h3 className="text-lg font-semibold text-slate-100 mb-2">
        Personality Prediction
      </h3>
      <p className="text-slate-300 mb-2">
        <strong>Best guess:</strong> {data.prediction} ({(data.confidence * 100).toFixed(1)}%)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.top3.map((item, idx) => (
          <div key={idx} className="bg-slate-700 p-2 rounded">
            <div className="text-xs text-slate-300 mb-1 capitalize">{item.class}</div>
            <div className="w-full bg-slate-600 h-2 rounded overflow-hidden mb-1">
              <div
                className="h-full bg-violet-500"
                style={{ width: `${Math.min(Math.max(item.probability * 100, 0), 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 text-center">
              {(item.probability * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
