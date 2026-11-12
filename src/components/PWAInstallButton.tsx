import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall.ts';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { Modal } from './Modal.tsx';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // If already installed and running standalone, suppress button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Install on iOS
        </button>

        {showIOSGuide && <Modal label="Install on iPhone or iPad" onClose={() => setShowIOSGuide(false)}>
          <div className="flex items-center justify-between mb-4"><h2 className="section-title flex items-center gap-2"><Share size={18}/>Install on iPhone / iPad</h2><button className="icon-button" aria-label="Close install guide" onClick={() => setShowIOSGuide(false)}><X size={18}/></button></div>
          <ol className="list-decimal list-inside space-y-3 text-sm muted"><li>Tap Share in Safari's toolbar.</li><li>Select Add to Home Screen.</li><li>Tap Add. Open the app once online to cache the reference catalog.</li></ol>
          <p className="text-xs muted mt-4">Offline references are available after caching. WebUSB ADB is not supported by iOS Safari.</p><button className="primary-button mt-5" onClick={() => setShowIOSGuide(false)}>Got it</button>
        </Modal>}
      </>
    );
  }

  // Fallback desktop install affordance
  return (
    <button
      onClick={() => setShowGuide(true)}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
      title="PWA Offline Capable"
    >
      <Download className="w-3.5 h-3.5 text-slate-400" />
      Install PWA
      {showGuide && <span role="status" className="fixed right-4 top-20 z-50 max-w-sm rounded-xl border border-slate-300 bg-white dark:bg-slate-900 p-4 shadow-xl text-left">Use your browser’s Install app or Add to Home Screen menu. If unavailable, open this site directly over HTTPS in a supported browser.</span>}
    </button>
  );
};
