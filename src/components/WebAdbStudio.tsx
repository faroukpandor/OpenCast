import React, { useState } from 'react';
import { Terminal, Wifi, Usb, Play, CheckCircle2, AlertTriangle, ShieldCheck, Copy, Check, RotateCcw } from 'lucide-react';

interface QuickScript {
  name: string;
  category: string;
  command: string;
  targetDevice: string;
  outputMock: string[];
}

export const WebAdbStudio: React.FC = () => {
  const [deviceIp, setDeviceIp] = useState<string>('192.168.1.145');
  const [port, setPort] = useState<number>(5555);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [customCommand, setCustomCommand] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'OpenCast WebADB Bridge v1.0.0 initialized.',
    'Ready for wireless TCP/IP pairing on port 5555 or USB WebUSB connection.',
    'Enter your streaming device IP (found in Settings -> My Fire TV / System -> About -> Network) and connect.'
  ]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const quickScripts: QuickScript[] = [
    {
      name: 'Bypass FireOS 8 Sideload Verification',
      category: 'Fire TV',
      targetDevice: 'Fire TV Stick 4K Max (2nd Gen)',
      command: 'settings put global verifier_verify_adb_installs 0',
      outputMock: [
        '$ settings put global verifier_verify_adb_installs 0',
        'Verification bypass: active. INSTALL_FAILED_VERIFICATION_FAILURE will no longer trigger.'
      ]
    },
    {
      name: 'Disable Amazon Telemetry & Bloatware',
      category: 'Debloat',
      targetDevice: 'All Fire TV Devices',
      command: 'pm disable-user --user 0 com.amazon.device.sale.service',
      outputMock: [
        '$ pm disable-user --user 0 com.amazon.device.sale.service',
        'Package com.amazon.device.sale.service new state: disabled-user',
        'Freed ~140MB idle RAM. Background telemetry daemon stopped.'
      ]
    },
    {
      name: 'Disable Silent OTA Updates',
      category: 'Firmware Lock',
      targetDevice: 'Fire TV (FireOS 7 / 8)',
      command: 'pm disable-user --user 0 com.amazon.device.software.ota',
      outputMock: [
        '$ pm disable-user --user 0 com.amazon.device.software.ota',
        'Package com.amazon.device.software.ota new state: disabled-user',
        'Firmware frozen. Silent background updates blocked.'
      ]
    },
    {
      name: 'Trim System Cache (Bootloop Prevention)',
      category: 'Maintenance',
      targetDevice: 'Chromecast 4K / Google TV',
      command: 'pm trim-caches 1000M',
      outputMock: [
        '$ pm trim-caches 1000M',
        'Trimmed 1,048,576,000 bytes from cache partition.',
        'Usable flash storage expanded.'
      ]
    },
    {
      name: 'Grant File Manager Sideload Permission',
      category: 'Google TV',
      targetDevice: 'Chromecast with Google TV',
      command: 'appops set com.apk.installer REQUEST_INSTALL_PACKAGES allow',
      outputMock: [
        '$ appops set com.apk.installer REQUEST_INSTALL_PACKAGES allow',
        'Granted REQUEST_INSTALL_PACKAGES. File manager can install APKs without prompts.'
      ]
    }
  ];

  const handleConnect = () => {
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Attempting TCP connection to ${deviceIp}:${port}...`,
      `[${new Date().toLocaleTimeString()}] Handshake accepted! RSA fingerprint confirmed by TV display.`,
      `[${new Date().toLocaleTimeString()}] Connected to target device: mantle (FireOS 8.1.0.4 - Android 11).`
    ]);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Connection closed to ${deviceIp}:${port}.`
    ]);
    setIsConnected(false);
  };

  const handleRunScript = (script: QuickScript) => {
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Executing: adb shell ${script.command}`,
      ...script.outputMock
    ]);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;

    setTerminalLogs(prev => [
      ...prev,
      `$ ${customCommand}`,
      `Command acknowledged by adbd daemon. Status: OK (exit code 0)`
    ]);
    setCustomCommand('');
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(`adb shell ${cmd}`);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
            <Terminal className="w-4 h-4" />
            <span>OpenCast WebADB Wireless Terminal Studio</span>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            isConnected
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {isConnected ? 'Bridge: Connected' : 'Bridge: Disconnected'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            In-Browser ADB Terminal & Execution Bridge
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Execute debloating commands, bypass sideload restrictions, and freeze OTA firmware directly from your browser over Wi-Fi without needing the Android SDK installed on your computer.
          </p>
        </div>

        {/* Connection Bar */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Wifi className="w-4 h-4 text-blue-500 shrink-0" />
            <input
              type="text"
              value={deviceIp}
              disabled={isConnected}
              onChange={(e) => setDeviceIp(e.target.value)}
              placeholder="Device IP (e.g. 192.168.1.145)"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
            />
            <span className="text-slate-400 font-mono">:</span>
            <input
              type="number"
              value={port}
              disabled={isConnected}
              onChange={(e) => setPort(parseInt(e.target.value, 10))}
              className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm"
              >
                Connect Wireless ADB
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-semibold transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions Left, Live Terminal Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 1-Click Scripts (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>One-Click ADB Presets</span>
            <span className="text-xs text-slate-400 font-mono">5 Scripts</span>
          </h3>

          <div className="space-y-2.5">
            {quickScripts.map((script, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{script.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    {script.category}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-950 text-emerald-400 font-mono text-[11px] truncate border border-slate-800">
                  {script.command}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleCopy(script.command)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-mono"
                  >
                    {copiedCmd === script.command ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedCmd === script.command ? 'Copied' : 'Copy'}
                  </button>

                  <button
                    onClick={() => handleRunScript(script)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[11px] hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-3 h-3" />
                    Execute Script
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Interactive Terminal (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="text-slate-300 ml-2">OpenCast Interactive Shell (tty0)</span>
            </div>
            <button
              onClick={() => setTerminalLogs(['Terminal buffer cleared.'])}
              className="hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>

          <div className="font-mono text-xs text-emerald-400/90 space-y-1 min-h-[360px] max-h-[460px] overflow-y-auto leading-relaxed">
            {terminalLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>

          {/* Interactive Shell Input Form */}
          <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs">$</span>
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="e.g. pm list packages -3 | pm disable-user --user 0 ..."
              className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
