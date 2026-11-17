import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { HTRPage } from './pages/HTRPage';

import { SignaturePage } from './pages/SignaturePage';
import { PersonalityPage } from './pages/PersonalityPage';
import { UnifiedPage } from './pages/UnifiedPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ResultsPage } from './pages/ResultsPage';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { ApiService } from './services/api';
import { SystemStatus } from './types';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const { history, addHistoryItem, clearHistory, stats } = useAnalysisHistory();

  // Periodic heartbeat check for FastAPI backend
  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const data = await ApiService.getSystemStatus();
        if (isMounted) {
          setBackendOnline(true);
          setSystemStatus(data);
        }
      } catch (e) {
        if (isMounted) {
          setBackendOnline(false);
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        backendOnline={backendOnline}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Layout Area: Persistent Sidebar + Page Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Persistent Sidebar (Desktop) / Slide-over (Mobile) */}
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 max-w-7xl mx-auto w-full">
          {currentPage === 'landing' && (
            <LandingPage onNavigate={setCurrentPage} />
          )}

          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentPage}
              stats={stats}
              recentHistory={history}
              systemStatus={systemStatus}
              demoMode={demoMode}
            />
          )}

          {currentPage === 'htr' && (
            <HTRPage
              demoMode={demoMode}
              onAnalysisComplete={addHistoryItem}
            />
          )}

          

          {currentPage === 'signature' && (
            <SignaturePage
              demoMode={demoMode}
              onAnalysisComplete={addHistoryItem}
            />
          )}

          {currentPage === 'personality' && (
            <PersonalityPage
              demoMode={demoMode}
              onAnalysisComplete={addHistoryItem}
            />
          )}

          {currentPage === 'unified' && (
            <UnifiedPage
              demoMode={demoMode}
              onAnalysisComplete={addHistoryItem}
            />
          )}

          {currentPage === 'methodology' && (
            <MethodologyPage />
          )}

          {currentPage === 'results' && (
            <ResultsPage
              history={history}
              clearHistory={clearHistory}
              systemStatus={systemStatus}
            />
          )}
        </main>

      </div>

    </div>
  );
}

export default App;
