import React, { useState } from 'react';
import { Cloud, Check, Copy, ArrowRight, ShieldCheck, Terminal, Globe, Server } from 'lucide-react';

export const CloudflareDeployGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
          <Cloud className="w-4 h-4" />
          <span>Zero-Cost Production Deployment Manual</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          How to Deploy to Free Cloudflare Pages
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Cloudflare Pages provides a <strong>100% free tier</strong> featuring <strong>unlimited bandwidth</strong>, 500 builds per month, free custom domain SSL certificates, and instant global edge caching. Follow this guide to deploy your Astro SSG frontend and connect your self-hosted FastAPI backend.
        </p>
      </div>

      {/* Free Tier Cheatsheet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-400 font-mono">Monthly Cost</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">$0.00 / mo</div>
          <div className="text-[11px] text-slate-500 mt-1">Free tier permanent</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-400 font-mono">Bandwidth</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1">Unlimited</div>
          <div className="text-[11px] text-slate-500 mt-1">Zero egress fees</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-400 font-mono">Builds Included</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1">500 / month</div>
          <div className="text-[11px] text-slate-500 mt-1">Auto preview deploys</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-400 font-mono">SSL & Custom Domain</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono mt-1">Free</div>
          <div className="text-[11px] text-slate-500 mt-1">Automatic renewals</div>
        </div>
      </div>

      {/* Deployment Method 1: Git-Backed Auto-Deploy */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Method A: One-Click Git Integration (Recommended)
          </h2>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
            Automated CI/CD
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">1. Create a Free Cloudflare Account</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Navigate to <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer" className="text-blue-500 underline">dash.cloudflare.com/sign-up</a> and create an account. No credit card is required.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">2. Push your repo to GitHub or GitLab</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Commit this repository with <code className="font-mono text-slate-700 dark:text-slate-300">streaming-intel-hub</code> to your personal GitHub repository.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">3. Configure Cloudflare Pages Project</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              In the Cloudflare dashboard, go to <strong>Compute & AI &rarr; Workers & Pages &rarr; Create Application &rarr; Pages &rarr; Connect to Git</strong>.
            </p>
            <div className="p-3 rounded-lg bg-slate-950 text-xs font-mono text-slate-200 space-y-1.5 border border-slate-800">
              <div className="text-slate-400">// Cloudflare Build Settings (Exact Config)</div>
              <div><strong>Framework preset:</strong> <span className="text-emerald-400">Astro</span></div>
              <div><strong>Root directory:</strong> <span className="text-blue-400">frontend</span> (or streaming-intel-hub/frontend)</div>
              <div><strong>Build command:</strong> <span className="text-amber-400">npm run build</span></div>
              <div><strong>Build output directory:</strong> <span className="text-emerald-400">dist</span></div>
              <div><strong>Node.js version:</strong> <span className="text-slate-300">20 or 22</span> (set env var: <code className="text-pink-400">NODE_VERSION=20</code>)</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">4. Click 'Save and Deploy'</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cloudflare builds the site in ~45 seconds and provides an immediate URL (e.g., <code className="font-mono text-blue-500">https://streaming-intel-hub.pages.dev</code>). Every Git commit triggers a live zero-downtime rebuild.
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Method 2: Wrangler CLI */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Method B: Instant Wrangler CLI Deploy (10 Seconds)
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          If you want to deploy directly from your local terminal without linking GitHub:
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
              <span>1. Build the Astro SSG files:</span>
              <button
                onClick={() => copyText('build_cmd', 'cd frontend && npm install && npm run build')}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'build_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
cd frontend && npm install && npm run build
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
              <span>2. Deploy directory with Wrangler CLI:</span>
              <button
                onClick={() => copyText('wrangler_cmd', 'npx wrangler pages deploy dist --project-name=streaming-intel-hub')}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'wrangler_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
npx wrangler pages deploy dist --project-name=streaming-intel-hub
            </pre>
          </div>
        </div>
      </div>

      {/* Backend & Domain Architecture */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Connecting Your Self-Hosted FastAPI Backend
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The static frontend sits on Cloudflare Pages, while the FastAPI backend and SQLite database run on your $5 VPS (or Oracle Free Tier VM).
        </p>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs">
          <div className="font-semibold text-slate-900 dark:text-white">Cloudflare DNS Setup:</div>
          <p className="text-slate-600 dark:text-slate-400">
            In your Cloudflare dashboard under <strong>DNS &rarr; Records</strong>, add an <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">A record</code>:
          </p>
          <div className="font-mono p-2.5 bg-slate-950 text-slate-200 rounded border border-slate-800">
            Type: A | Name: api | Content: YOUR_VPS_IP | Proxy status: Proxied (Orange Cloud)
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The orange cloud enables free DDoS mitigation and SSL encryption on your API subdomain. In your frontend <code className="font-mono">track.js</code> and <code className="font-mono">comments.js</code>, configure <code className="font-mono text-blue-400">window.STREAMING_INTEL_API = 'https://api.yourdomain.com'</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
