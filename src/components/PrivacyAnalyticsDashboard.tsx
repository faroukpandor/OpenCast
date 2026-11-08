import React, { useState, useEffect } from 'react';
import { ShieldCheck, BarChart3, Globe, Smartphone, Tv, Laptop, RefreshCw, Send, Check } from 'lucide-react';

export const PrivacyAnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testPage, setTestPage] = useState<string>('/issues/fireos-8-adb');
  const [beaconStatus, setBeaconStatus] = useState<string | null>(null);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/analytics/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load stats:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSendBeacon = async () => {
    setBeaconStatus('Transmitting anonymous beacon...');
    try {
      const res = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: testPage,
          ref: 'https://reddit.com/r/firetv',
          ua: navigator.userAgent
        })
      });
      const data = await res.json();
      setBeaconStatus(`Recorded! Daily Salt Token: ${data.daily_visitor_token} · Type: ${data.device_type}`);
      fetchStats();
      setTimeout(() => setBeaconStatus(null), 4000);
    } catch (err: any) {
      setBeaconStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header and GDPR Guarantee */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-SaaS · Mathematical GDPR Compliance</span>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Privacy-First Analytics Engine
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Eliminates all third-party tracking (No Google Analytics, No Cloudflare Web Analytics, No Cookies). Raw IP addresses are immediately stripped in memory and hashed with a rotating daily salt to guarantee zero persistent PII.
          </p>
        </div>

        {/* How It Works Diagram */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-2">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Cryptographic Anonymization Pipeline:
          </div>
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="p-1.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 line-through">
              Raw IP (198.51.100.42)
            </span>
            <span className="text-slate-400">&rarr;</span>
            <span className="p-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              SHA256(IP + Today's Salt + Secret)
            </span>
            <span className="text-slate-400">&rarr;</span>
            <span className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-bold">
              Stored Token: "e99a18c428cb38d5"
            </span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            *At 00:00 UTC, the daily salt changes automatically, rendering cross-day user tracking mathematically impossible.
          </p>
        </div>
      </div>

      {/* KPI Numbers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <span className="text-xs text-slate-500 font-mono uppercase">Total Page Views</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {stats?.total_views ?? '--'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">All-time anonymous hits</span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <span className="text-xs text-slate-500 font-mono uppercase">Views Today</span>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
            {stats?.views_today ?? '--'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Current 24h rolling cycle</span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
          <span className="text-xs text-slate-500 font-mono uppercase">Unique Visitors Today</span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats?.unique_visitors_today ?? stats?.views_today ?? '--'}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">Unique salted hashes</span>
        </div>
      </div>

      {/* Breakdowns: Top Pages & Device Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Top Pages Visited</span>
            <span className="text-xs text-slate-400 font-mono">Hits</span>
          </h3>
          <div className="space-y-2">
            {stats?.top_pages?.map((p: any) => (
              <div key={p.page} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                  {p.page}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {p.hits}
                </span>
              </div>
            )) || <p className="text-xs text-slate-400">No page data yet.</p>}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Client Device Distribution
          </h3>
          <div className="space-y-3">
            {stats?.device_breakdown && Object.entries(stats.device_breakdown).map(([dev, count]: any) => (
              <div key={dev} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    {dev === 'Streaming Device' ? <Tv className="w-3.5 h-3.5 text-blue-500" /> :
                     dev === 'Mobile' ? <Smartphone className="w-3.5 h-3.5 text-purple-500" /> :
                     <Laptop className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{dev}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, (count / (stats.total_views || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Beacon Transmitter Test Tool */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-600" />
          Test Real-time /track Beacon (Zero-PII Simulator)
        </h3>
        <p className="text-xs text-slate-500">
          Fire a live test telemetry ping to verify that your IP is anonymized on the fly without storing any cookies or personal data.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={testPage}
            onChange={(e) => setTestPage(e.target.value)}
            placeholder="/issues/example-test"
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            onClick={handleSendBeacon}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            Send Test /track Beacon
          </button>
        </div>

        {beaconStatus && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono border border-emerald-200 dark:border-emerald-900">
            {beaconStatus}
          </div>
        )}
      </div>
    </div>
  );
};
