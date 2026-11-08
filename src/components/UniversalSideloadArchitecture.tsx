import React, { useState } from 'react';
import { 
  Download, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Copy, 
  Check, 
  Layers, 
  Zap, 
  Smartphone,
  Server
} from 'lucide-react';

export const UniversalSideloadArchitecture: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const sideloadSteps = [
    {
      step: "01",
      title: "Bootstrap the Package Loader",
      desc: "Install a standard lightweight web fetcher from your streaming device's default store (or transfer via local USB OTG storage / wireless ADB).",
      detail: "The application acts as a clean file retrieval bridge, allowing remote download of application packages directly into the TV's user cache directory."
    },
    {
      step: "02",
      title: "Grant Package Installation Privileges",
      desc: "Navigate to Device Settings -> Developer Options -> Install Unknown Apps -> Toggle Enabled.",
      detail: "This activates the Android 'REQUEST_INSTALL_PACKAGES' permission or OS sideloading profile, allowing the loader to spawn the OS PackageInstaller session."
    },
    {
      step: "03",
      title: "Resolve Direct URL or Numeric Shortcode",
      desc: "Input a direct HTTPS endpoint or OpenCast numeric shortcode (e.g. 10001) into the loader address bar.",
      detail: "The device queries the OpenCast shortcode engine, receives an instant 302 redirect directly to the verified binary on decentralized edge storage, bypassing bloated landing pages."
    },
    {
      step: "04",
      title: "Execute Native OS Package Installation",
      desc: "The OS installer validates APK signatures, displays requested permissions, and writes the app to user space.",
      detail: "On modern firmware with strict signature checks, wireless ADB commands can be executed to disable verification errors if installing custom development builds."
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Overview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 backdrop-blur shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-4">
            <Zap className="w-3.5 h-3.5" />
            Universal Sideloading Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Direct TV Package Installation & Shortcode Pipeline
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Streaming platforms frequently lock down app ecosystems with proprietary storefronts and restrictive policies. 
            Understanding the underlying operating system package architecture empowers users to install verified open-source utilities, 
            lossless media players, custom launchers, and emulation frontends directly—free of third-party middlemen, forced redirects, or intrusive tracking.
          </p>
        </div>
      </div>

      {/* 4-Step Technical Workflow */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          The 4-Step Package Delivery Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sideloadSteps.map((st) => (
            <div 
              key={st.step}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                    STAGE {st.step}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1.5">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                  {st.desc}
                </p>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                {st.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Operating System Restrictions & Verified Overrides */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-4 w-full">
            <div>
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Modern Firmware Lockdowns & Cryptographic Safeguards
              </h3>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                Recent OEM firmware updates introduce strict security policies that reject third-party packages with 
                errors like <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px]">INSTALL_FAILED_VERIFICATION_FAILURE</code>, 
                disable Developer Options by default, or terminate custom launchers. OpenCast provides direct, verified override commands:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">1. Unhide Developer Options</span>
                  <button 
                    onClick={() => handleCopy("Settings -> My Fire TV / System -> About -> Click Device Name 7 Times")}
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {copiedCmd === "Settings -> My Fire TV / System -> About -> Click Device Name 7 Times" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select <span className="font-medium">About</span> in System Settings and tap the remote <strong>Select</strong> button 7 consecutive times until "You are now a developer!" appears.
                </p>
              </div>

              <div className="rounded-lg bg-white dark:bg-slate-900 p-3.5 border border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">2. Disable Install Verification</span>
                  <button 
                    onClick={() => handleCopy("adb shell settings put global verifier_verify_adb_installs 0")}
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {copiedCmd === "adb shell settings put global verifier_verify_adb_installs 0" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-slate-950 text-emerald-400 p-2 rounded">
                  adb shell settings put global verifier_verify_adb_installs 0
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison: Legacy Ad-Laden Gateways vs OpenCast Direct Architecture */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            Architectural Comparison: Legacy Ad-Laden Portals vs. OpenCast
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-500">
                <th className="py-3 px-5">Architectural Dimension</th>
                <th className="py-3 px-5 text-slate-500">Legacy Ad-Laden Portals</th>
                <th className="py-3 px-5 text-blue-600 dark:text-blue-400 font-bold">OpenCast Platform</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Third-Party SaaS & Tracking</td>
                <td className="py-3 px-5 text-red-500 font-medium">Google Analytics, ad trackers, popups</td>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-medium">Zero-PII Daily Salted Hashing, Zero SaaS</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Shortcode Resolution</td>
                <td className="py-3 px-5">Delayed 5-second countdown with banner ads</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-medium">Sub-millisecond direct 302 edge redirect</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Anti-Spam & Comments</td>
                <td className="py-3 px-5">Commercial reCAPTCHA tracking users</td>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-medium">Cryptographic Proof-of-Work (SHA-256)</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Package Security Verification</td>
                <td className="py-3 px-5">None (user trusts link blind)</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-medium">Automated SHA-256 checksum & threat auditor</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Wireless WebADB Studio</td>
                <td className="py-3 px-5">Not supported (text blog instructions only)</td>
                <td className="py-3 px-5 text-emerald-600 dark:text-emerald-400 font-medium">Interactive in-browser terminal & 1-click presets</td>
              </tr>
              <tr>
                <td className="py-3 px-5 font-medium text-slate-900 dark:text-white">Self-Hosting & Ownership</td>
                <td className="py-3 px-5">Closed-source commercial website</td>
                <td className="py-3 px-5 text-blue-600 dark:text-blue-400 font-medium">100% Open-Source Monorepo on $5 VPS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
