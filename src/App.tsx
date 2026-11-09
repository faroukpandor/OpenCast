import { useState, useEffect, useCallback } from 'react';
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
import { AccountModal } from './components/AccountModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { RelatedIssuesModal } from './components/RelatedIssuesModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FloatingChatWidget } from './components/FloatingChatWidget.tsx';
import { offlineStorage } from './utils/offline_cache.ts';
import { api, post } from './utils/api.ts';
import type { Device, Issue, User, ShortcodeRecord, PublicConfig } from './types.ts';
export const TABS = ['hardware','issues','webadb','apkinspector','sideload','playbook','analytics','scrapers','cloudflare','code','rag'] as const;
const readTab = () => { const tab = location.hash.slice(1); return (TABS as readonly string[]).includes(tab) ? tab : 'hardware'; };
export default function App() {
  const [initialCatalog] = useState(() => offlineStorage.getCatalog());
  const [activeTab,setTab] = useState(readTab); const [devices,setDevices] = useState<Device[]>(initialCatalog?.devices || []); const [issues,setIssues] = useState<Issue[]>(initialCatalog?.issues || []); const [shortcodes,setShortcodes] = useState<ShortcodeRecord[]>(initialCatalog?.shortcodes || []);
  const [ecosystem,setEcosystem] = useState('All'); const [deviceFilter,setDeviceFilter] = useState<number | undefined>(); const [selectedIssue,setSelectedIssue] = useState<number | undefined>();
  const [authOpen,setAuthOpen] = useState(false); const [accountOpen,setAccountOpen] = useState(false); const [publicConfig,setPublicConfig] = useState<PublicConfig | null>(null); const [currentUser,setCurrentUser] = useState<User | null>(null); const [relatedId,setRelatedId] = useState<number | null>(null);
  const [loadError,setLoadError] = useState(''); const [loading,setLoading] = useState(true); const [health,setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const setActiveTab = useCallback((tab: string) => { if ((TABS as readonly string[]).includes(tab)) { location.hash=tab; setTab(tab); } },[]);
  const loadData = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { const [d,i,c] = await Promise.all([api<Device[]>('/api/devices'),api<Issue[]>('/api/issues'),api<ShortcodeRecord[]>('/api/shortcodes')]); setDevices(d); setIssues(i); setShortcodes(c); const cached=offlineStorage.saveCatalog({ devices:d,issues:i,shortcodes:c }); setHealth('online'); if(!cached) setLoadError('Live data is connected, but browser storage is full or unavailable. Offline caching could not be saved.'); }
    catch { setHealth('offline'); setLoadError('Live data is unavailable. Cached reference data is shown when available.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(() => { const onHash = () => setTab(readTab()); window.addEventListener('hashchange',onHash); return () => window.removeEventListener('hashchange',onHash); },[]);
  useEffect(() => { void loadData(); api<{ user: User }>('/api/auth/me').then(r => setCurrentUser(r.user)).catch(() => setCurrentUser(null)); api<PublicConfig>('/api/config').then(setPublicConfig).catch(() => {}); },[loadData]);
  useEffect(() => {
    if (!['1','true'].includes(localStorage.getItem('opencast_analytics_consent') || '')) return;
    void post('/api/analytics/track',{ page: location.pathname,ref: document.referrer,consent: true }).catch(() => {});
  },[]);
  const logout = async () => { try { await post('/api/auth/logout'); } catch { /* Local UI can still sign out; cookie expiry remains bounded. */ } setCurrentUser(null); };
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans"><a href="#main-content" className="skip-link">Skip to content</a><Header activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onOpenAuth={() => setAuthOpen(true)} onOpenAccount={() => setAccountOpen(true)} onLogout={logout}/><main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"><div className="mb-6 flex flex-wrap justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs text-slate-500"><span><strong className="text-slate-900 dark:text-white">OpenCast</strong> · Open tools. Your hardware.</span><span className="flex items-center gap-2 font-mono"><span className={`status-dot ${health === 'online' ? 'bg-emerald-500' : health === 'offline' ? 'bg-amber-500' : 'bg-slate-400'}`}/>{health === 'online' ? 'API connected · SQLite' : health === 'offline' ? 'Cached / offline mode' : 'Connecting to API…'}</span></div>{loadError && <div role="status" className="notice mb-5">{loadError} <button className="underline" onClick={loadData}>Retry</button></div>}{loading && !devices.length ? <div className="panel p-12 text-center text-sm text-slate-500" role="status">Loading the reference catalog…</div> : <>
        {activeTab === 'hardware' && <DeviceCatalog devices={devices} onSelectDevice={d => { setDeviceFilter(d.id); setSelectedIssue(undefined); setActiveTab('issues'); }} selectedEcosystem={ecosystem} setSelectedEcosystem={setEcosystem}/>}
        {activeTab === 'issues' && <IssueExplorer issues={issues} onOpenRelated={setRelatedId} currentUser={currentUser} deviceFilter={deviceFilter} onClearDevice={() => setDeviceFilter(undefined)} selectedIssueId={selectedIssue} onSelectIssue={setSelectedIssue} onCatalogChanged={loadData}/>}
        {activeTab === 'webadb' && <WebAdbStudio/>}
        {activeTab === 'apkinspector' && <ApkInspectorStudio currentUser={currentUser} shortcodes={shortcodes} onShortcodesChanged={setShortcodes}/>}
        {activeTab === 'sideload' && <UniversalSideloadArchitecture/>}
        {activeTab === 'playbook' && <PowerUserPlaybook/>}
        {activeTab === 'analytics' && <PrivacyAnalyticsDashboard config={publicConfig} currentUser={currentUser} onOpenAccount={() => setAccountOpen(true)}/>}
        {activeTab === 'scrapers' && <ScraperStudio config={publicConfig} onIngestComplete={loadData} currentUser={currentUser} onOpenAuth={() => setAuthOpen(true)}/>}
        {activeTab === 'cloudflare' && <CloudflareDeployGuide/>}
        {activeTab === 'code' && <CodeExplorer/>}
        {activeTab === 'rag' && <RagExportViewer/>}
      </>}
    </main><footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">OpenCast · Self-hosted streaming tools · Reference guidance is not a substitute for manufacturer documentation.</footer>{authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onAuthSuccess={setCurrentUser} privacyContact={publicConfig?.privacyContact} operatorName={publicConfig?.operatorName}/>}{accountOpen && currentUser && <AccountModal user={currentUser} onClose={() => setAccountOpen(false)} onUserChanged={setCurrentUser} onSignedOut={() => { setCurrentUser(null); setAccountOpen(false); }}/>}<RelatedIssuesModal issueId={relatedId} onClose={() => setRelatedId(null)} onSelectIssue={id => { setSelectedIssue(id); setDeviceFilter(undefined); setActiveTab('issues'); setRelatedId(null); }}/><OfflineIndicator/><FloatingChatWidget catalog={{ devices,issues,shortcodes }}/></div>;
}
