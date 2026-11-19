import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import HandwritingAnalysis from "./pages/HandwritingAnalysis";
import TraitsPage from "./pages/TraitsPage";
import type { HandwritingResult } from "./types";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SignatureVerification from "./pages/SignatureVerification";
import ModelPerformance from "./pages/ModelPerformance";
import Methodology from "./pages/Methodology";
import History from "./pages/History";

export default function App() {
  // Shared state for the handwriting analysis result
  const [sharedResult, setSharedResult] = useState<HandwritingResult | null>(null);

  return (
    <Routes>
      <Route element={<Layout />}> 
        <Route path="/" element={<Dashboard />} />
        <Route path="/handwriting" element={<HandwritingAnalysis onAnalysisComplete={setSharedResult} />} />
        <Route path="/verify" element={<SignatureVerification />} />
        <Route path="/model" element={<ModelPerformance />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/history" element={<History />} />
        <Route path="/traits" element={<TraitsPage result={sharedResult} />} />
      </Route>
    </Routes>
  );
}
