import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, FileCode, Hash, Download, ArrowRight, Copy, Check } from 'lucide-react';
import { analyzeApkSignature, ApkSecurityReport } from '../utils/apk_inspector.ts';
import { shortcodeEngine, ShortcodeRecord } from '../utils/shortcode_resolver.ts';

export const ApkInspectorStudio: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('elephant');
  const [shortcodeInput, setShortcodeInput] = useState<string>('10001');
  const [resolvedShortcode, setResolvedShortcode] = useState<ShortcodeRecord | null>(() => shortcodeEngine.resolve('10001'));
  const [customAppName, setCustomAppName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<ShortcodeRecord | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const presets: Record<string, { fileName: string; size: number; hash: string; permissions: string[] }> = {
    elephant: {
      fileName: 'elephant_tv_v2.4.1.apk',
      size: 38 * 1024 * 1024,
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      permissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.WAKE_LOCK']
    },
    smarttube: {
      fileName: 'smarttube_beta_v22.84.apk',
      size: 26 * 1024 * 1024,
      hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      permissions: ['android.permission.INTERNET', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.REQUEST_INSTALL_PACKAGES']
    },
    projectivy: {
      fileName: 'projectivy_launcher_v4.5.2.apk',
      size: 14 * 1024 * 1024,
      hash: '9f8e7d6c5b4a3928170e9d8c7b6a543210fedcba0987654321abcdef12345678',
      permissions: ['android.permission.BIND_ACCESSIBILITY_SERVICE', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.RECEIVE_BOOT_COMPLETED']
    },
    untrusted: {
      fileName: 'free_movies_cracked_vip.apk',
      size: 182 * 1024 * 1024,
      hash: '4d8a1c920f3e6b7a5d8c1e2b4f9a0c3e7d5b1a8f9c2e4a6b8d0f1c3e5a7b9d2e',
      permissions: ['android.permission.SEND_SMS', 'android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW']
    }
  };

  const activePreset = presets[selectedPreset];
  const report: ApkSecurityReport = analyzeApkSignature(
    activePreset.fileName,
    activePreset.size,
    activePreset.hash,
    activePreset.permissions
  );

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    const res = shortcodeEngine.resolve(shortcodeInput);
    setResolvedShortcode(res);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName || !customUrl) return;
    const gen = shortcodeEngine.generate(customAppName, customUrl);
    setGeneratedCode(gen);
    setCustomAppName('');
    setCustomUrl('');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Cryptographic APK Integrity & Shortcode Infrastructure</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          APK Security Inspector & Shortcode Resolver
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Verify cryptographic SHA-256 signatures before sideloading to prevent malicious adware and tampered packages. Generate and resolve self-hosted 5-digit shortcodes with sub-millisecond edge redirects and zero third-party tracking.
        </p>

        {/* Sample Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-mono">Sample APKs:</span>
          {Object.keys(presets).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedPreset(key)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all font-mono ${
                selectedPreset === key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {key === 'untrusted' ? '⚠️ Untrusted Clone' : key}
            </button>
          ))}
        </div>
      </div>

      {/* APK Security Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Security Verdict & Hash (7 cols) */}
        <div className="md:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-500" />
              {report.fileName}
            </h3>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              report.isOfficialMatch
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                : report.suspiciousFlags.length > 0
                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
            }`}>
              {report.isOfficialMatch ? 'Official Release' : report.suspiciousFlags.length > 0 ? 'High Risk' : 'Community Build'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="text-slate-400 text-[11px]">SHA-256 Checksum:</div>
            <div className="text-slate-800 dark:text-slate-200 break-all select-all text-[11px]">
              {report.computedSha256}
            </div>
            {report.officialMatchName && (
              <div className="text-emerald-600 dark:text-emerald-400 text-[11px] pt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Match: {report.officialMatchName}</span>
              </div>
            )}
          </div>

          {/* Suspicious Flags Callout */}
          {report.suspiciousFlags.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Security Anomalies Detected:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {report.suspiciousFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Declared Permissions */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Declared Android Permissions:
            </span>
            <div className="space-y-1.5">
              {report.permissions.map((p, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between font-mono font-semibold">
                    <span className={p.isHighPrivilege ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}>
                      {p.name}
                    </span>
                    {p.isHighPrivilege && (
                      <span className="text-[10px] text-amber-500 font-sans">Elevated Privilege</span>
                    )}
                  </div>
                  <p className="text-slate-500 mt-0.5 font-sans">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Self-Hosted Shortcode Resolver (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Resolve Code */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" />
              5-Digit Universal Shortcode Lookup
            </h3>

            <form onSubmit={handleResolve} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={shortcodeInput}
                  onChange={(e) => setShortcodeInput(e.target.value)}
                  placeholder="10001"
                  className="w-28 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-center font-bold"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex-1"
                >
                  Resolve Shortcode
                </button>
              </div>
            </form>

            {resolvedShortcode ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">{resolvedShortcode.appName}</div>
                <div className="text-[11px] font-mono text-blue-500 truncate">{resolvedShortcode.targetUrl}</div>
                <div className="text-[10px] text-slate-400 font-mono">v{resolvedShortcode.version} · Created: {resolvedShortcode.createdAt}</div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No shortcode found for #{shortcodeInput}</p>
            )}
          </div>

          {/* Generate Custom Code */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              Generate Universal 5-Digit Shortcode
            </h3>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Application Name</label>
                <input
                  type="text"
                  required
                  value={customAppName}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  placeholder="My Custom Kodi Build"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Direct APK Download URL</label>
                <input
                  type="url"
                  required
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://myrepo.org/build.apk"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Generate 5-Digit Code
              </button>
            </form>

            {generatedCode && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1 text-xs">
                <div className="text-emerald-800 dark:text-emerald-300 font-bold">Generated Universal Shortcode:</div>
                <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                  {generatedCode.code}
                </div>
                <div className="text-[11px] text-slate-500">
                  Enter {generatedCode.code} directly into your TV package loader to retrieve your build.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
