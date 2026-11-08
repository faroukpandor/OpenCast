import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { DeviceCatalog } from './components/DeviceCatalog.tsx';
import { IssueExplorer } from './components/IssueExplorer.tsx';
import { WebAdbStudio } from './components/WebAdbStudio.tsx';
import { ApkInspectorStudio } from './components/ApkInspectorStudio.tsx';
import { UniversalSideloadArchitecture } from './components/UniversalSideloadArchitecture.tsx';
import { PowerUserPlaybook } from './components/PowerUserPlaybook.tsx';
import { PrivacyAnalyticsDashboard } from './components/PrivacyAnalyticsDashboard.tsx';
import { ScraperStudio } from './components/ScraperStudio.tsx';
import { CloudflareDeployGuide } from './components/CloudflareDeployGuide.tsx';
import { CodeExplorer } from './components/CodeExplorer.tsx';
import { RagExportViewer } from './components/RagExportViewer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { RelatedIssuesModal } from './components/RelatedIssuesModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FloatingChatWidget } from './components/FloatingChatWidget.tsx';
import { offlineStorage } from './utils/offline_cache.ts';
import { Device, Issue } from './server/db.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('hardware');
  const [devices, setDevices] = useState<Device[]>(() => offlineStorage.getDevices() || []);
  const [issues, setIssues] = useState<Issue[]>(() => offlineStorage.getIssues() || []);
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>('All');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; email: string } | null>(null);
  const [inspectRelatedIssueId, setInspectRelatedIssueId] = useState<number | null>(null);

  // Load data with offline-first caching
  const loadData = () => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDevices(data);
          offlineStorage.saveDevices(data);
        }
      })
      .catch(err => {
        console.warn('Network offline, using cached devices:', err);
        const cached = offlineStorage.getDevices();
        if (cached) setDevices(cached);
      });

    fetch('/api/issues')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setIssues(data);
          offlineStorage.saveIssues(data);
        }
      })
      .catch(err => {
        console.warn('Network offline, using cached issues:', err);
        const cached = offlineStorage.getIssues();
        if (cached) setIssues(cached);
      });
  };

  // Check auth and fire initial privacy analytics beacon
  useEffect(() => {
    loadData();

    // Fire Privacy Beacon (Zero-PII daily salted hashing)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        ref: document.referrer || 'Direct',
        ua: navigator.userAgent
      })
    }).catch(() => {});

    // Check token
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(() => localStorage.removeItem('auth_token'));
    }
  }, []);

  const handleLogout = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
  };

  const handleSelectDevice = (dev: Device) => {
    setActiveTab('issues');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Quick Kicker Strip */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-slate-900 dark:text-white">OpenCast</span>
            <span>·</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">The Open Streaming Platform</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">Zero-SaaS Architecture</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              FastAPI: Online
            </span>
            <span>·</span>
            <span>aiosqlite: Active</span>
            <span>·</span>
            <span>PoW Anti-Spam: Verified</span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'hardware' && (
          <DeviceCatalog
            devices={devices}
            onSelectDevice={handleSelectDevice}
            selectedEcosystem={selectedEcosystem}
            setSelectedEcosystem={setSelectedEcosystem}
          />
        )}

        {activeTab === 'issues' && (
          <IssueExplorer
            issues={issues}
            onOpenRelated={(id) => setInspectRelatedIssueId(id)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'webadb' && (
          <WebAdbStudio />
        )}

        {activeTab === 'apkinspector' && (
          <ApkInspectorStudio />
        )}

        {activeTab === 'sideload' && (
          <UniversalSideloadArchitecture />
        )}

        {activeTab === 'playbook' && (
          <PowerUserPlaybook />
        )}

        {activeTab === 'analytics' && (
          <PrivacyAnalyticsDashboard />
        )}

        {activeTab === 'scrapers' && (
          <ScraperStudio onIngestComplete={loadData} />
        )}

        {activeTab === 'cloudflare' && (
          <CloudflareDeployGuide />
        )}

        {activeTab === 'code' && (
          <CodeExplorer />
        )}

        {activeTab === 'rag' && (
          <RagExportViewer />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user, token) => setCurrentUser(user)}
      />

      <RelatedIssuesModal
        issueId={inspectRelatedIssueId}
        onClose={() => setInspectRelatedIssueId(null)}
        onSelectIssue={(id) => {
          setActiveTab('issues');
          setInspectRelatedIssueId(null);
        }}
      />

      <OfflineIndicator />
      <FloatingChatWidget />
    </div>
  );
}
