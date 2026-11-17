import { useState, useEffect } from 'react';
import { HistoryItem } from '../types';

const STORAGE_KEY = 'ai_handwriting_system_history_v1';

export function useAnalysisHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse history from localStorage', e);
    }
    // Default initial mock history so the dashboard looks rich on first visit
    return [
      {
        id: 'hist-001',
        timestamp: new Date(Date.now() - 3600000 * 3).toLocaleString(),
        module: 'htr',
        title: 'HTR Document Recognition',
        status: 'success',
        summary: '4 lines detected • Transcription: "A move to stop Mr. Gaitskell from nominating any more Labour life peers..."',
        data: { num_lines: 4, benchmark_cer: 4.82, benchmark_wer: 11.75 }
      },
      {
        id: 'hist-002',
        timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString(),
        module: 'personality',
        title: 'Graphology Feature Profiling',
        status: 'warning',
        summary: 'Slant: Moderate Right (8.5°) • Organization: 78% • Attention to detail: 82% (Experimental)',
        data: { features: { slant: 'Moderate Right', letter_size: 'Medium' } }
      },
      {
        id: 'hist-003',
        timestamp: new Date(Date.now() - 3600000 * 12).toLocaleString(),
        module: 'signature',
        title: 'Siamese Signature Comparison',
        status: 'success',
        summary: 'Genuine match • Distance: 0.34 (Threshold 0.52) • Similarity: 83.2%',
        data: { result: 'genuine', similarity: 0.832 }
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to persist history to localStorage', e);
    }
  }, [history]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 49)]); // keep last 50 items
    return newItem;
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  };

  const getStats = () => {
    return {
      total: history.length,
      htr: history.filter((h) => h.module === 'htr').length,
      signature: history.filter((h) => h.module === 'signature').length,
      personality: history.filter((h) => h.module === 'personality').length,
    };
  };

  return {
    history,
    addHistoryItem,
    clearHistory,
    stats: getStats(),
  };
}
