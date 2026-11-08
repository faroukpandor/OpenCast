import React, { useState } from 'react';
import { 
  Gamepad2, 
  Volume2, 
  Tv, 
  Home, 
  ShieldCheck, 
  Zap, 
  Radio, 
  Copy, 
  Check, 
  Sparkles,
  Plane,
  Monitor
} from 'lucide-react';

interface PlaybookItem {
  id: string;
  category: string;
  title: string;
  description: string;
  whyItMatters: string;
  hardwareFit: string;
  command?: string;
  steps: string[];
}

export const PowerUserPlaybook: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const playbook: PlaybookItem[] = [
    {
      id: 'clean-launcher',
      category: 'Home Screen & Speed',
      title: 'Ad-Free Minimalist UI (Projectivy Launcher)',
      description: 'Replace Amazon and Google’s ad-heavy, autoplay trailer home screen with a clean, blazingly fast interface similar to Apple TV.',
      whyItMatters: 'Fire TV and Google TV use up to 40% of their 2GB RAM just rendering sponsored banners and video trailers. A clean launcher drops idle RAM usage by ~500MB and eliminates navigation lag.',
      hardwareFit: 'Fire TV 4K Max, Google TV 4K, onn. 4K Pro',
      command: 'adb shell pm disable-user --user 0 com.amazon.device.sale.service && adb shell appops set com.spocky.projengmenu SYSTEM_ALERT_WINDOW allow',
      steps: [
        'Sideload Projectivy Launcher APK.',
        'In Projectivy settings: Enable Accessibility Service to intercept the Home button.',
        'Run the ADB command to prevent Amazon from killing the launcher service.'
      ]
    },
    {
      id: 'smarttube-sponsorblock',
      category: 'Streaming Quality',
      title: 'Ad-Free 4K YouTube with SponsorBlock (SmartTube)',
      description: 'A native TV client for YouTube that automatically skips in-video sponsor segments, intros, subscribe reminders, and commercial breaks.',
      whyItMatters: 'Zero ad interruptions, supports 4K 60fps AV1/VP9 codecs, background playback with screen turned off, and volume normalization.',
      hardwareFit: 'All Fire TV, Android TV, and Google TV devices',
      command: 'curl -L -o smarttube.apk "https://github.com/yuliskov/SmartTube/releases/latest/download/smarttube_beta.apk" && adb install -r smarttube.apk',
      steps: [
        'Install SmartTube directly via ADB or Downloader shortcode.',
        'Enable SponsorBlock in Settings -> SponsorBlock -> Auto-skip sponsors.',
        'Sign in via QR code without sharing passwords.'
      ]
    },
    {
      id: 'audiophile-passthrough',
      category: 'Home Theater',
      title: 'Lossless Audio Passthrough & 24p Frame Rate Matching',
      description: 'Bitstream uncompressed Dolby TrueHD Atmos, DTS-HD Master Audio, and DTS:X to your AV receiver or soundbar without PCM downmixing.',
      whyItMatters: 'Most smart TVs degrade audio to lossy Dolby Digital Plus (640 kbps). Proper passthrough preserves full studio bitrates (up to 18,000 kbps) with zero audio/video sync drift.',
      hardwareFit: 'Fire TV 4K Max 2nd Gen, onn. 4K Pro, Apple TV 4K',
      steps: [
        'In Fire TV/Google TV Audio Settings: Select "Passthrough" or "Best Available".',
        'In Kodi / Plex: Enable Audio Passthrough -> Check TrueHD, DTS-HD, and Dolby Digital.',
        'Enable "Match Content Frame Rate" (23.976 fps) to prevent judder during 24fps cinema playback.'
      ]
    },
    {
      id: 'moonlight-gaming',
      category: 'Cloud & PC Gaming',
      title: 'Moonlight PC Game Streaming (4K 60fps / 120fps)',
      description: 'Stream games from your RTX/Radeon gaming PC or cloud rig directly to your living room TV with under 5ms latency.',
      whyItMatters: 'Turn a $35 streaming stick into a console capable of playing Cyberpunk 2077 or Elden Ring at max settings with HDR.',
      hardwareFit: 'Fire TV Stick 4K Max (Wi-Fi 6E), Chromecast with Google TV, onn. 4K Pro',
      steps: [
        'Install Sunshine (host) on your PC and Moonlight (client) on your streaming stick.',
        'Pair an Xbox Series X/S or PS5 DualSense controller via Bluetooth.',
        'Set video bitrate to 50 Mbps over 5GHz/6GHz Wi-Fi for imperceptible input lag.'
      ]
    },
    {
      id: 'retro-emulation',
      category: 'Emulation',
      title: 'Retro Gaming Console (NES to PS1/N64/Dreamcast)',
      description: 'Run RetroArch or Lemuroid directly on the stick to play classic games from Atari through PlayStation 1, N64, and Game Boy Advance.',
      whyItMatters: 'Modern quad-core Cortex-A55 chipsets run 16-bit and 32-bit emulators at full 60fps with save states and CRT shaders.',
      hardwareFit: 'Chromecast 4K, onn. 4K Pro (32GB internal flash is best)',
      steps: [
        'Install RetroArch or Lemuroid APK.',
        'Connect an OTG flash drive for storage or stream ROMs from your home NAS.',
        'Map controller buttons and enjoy 10,000+ classic games.'
      ]
    },
    {
      id: 'smart-home-pip',
      category: 'Smart Home & Security',
      title: 'Picture-in-Picture Security Cameras (RTSP / Home Assistant)',
      description: 'Overlay a live video feed from your doorbell or baby monitor in the corner of your screen while watching movies or live sports.',
      whyItMatters: 'Never pause your movie when the doorbell rings or to check on the driveway camera.',
      hardwareFit: 'Google TV, Fire TV, Apple TV',
      command: 'adb shell appops set com.alexx999.go2rtc SYSTEM_ALERT_WINDOW allow',
      steps: [
        'Run Home Assistant or go2rtc / Scrypted on your home server.',
        'Configure TinyCam Pro or Home Assistant Android TV client.',
        'Enable Picture-in-Picture (PiP) window permissions via ADB.'
      ]
    },
    {
      id: 'travel-vpn',
      category: 'Travel & Mobility',
      title: 'Portable Travel Stick with WireGuard / Tailscale',
      description: 'Carry your configured stick on business trips and vacations. Automatically tunnels back to your home network over encrypted WireGuard.',
      whyItMatters: 'Bypasses hotel Wi-Fi geoblocks, prevents hotel networks from sniffing your traffic, and lets you access your home Plex server seamlessly.',
      hardwareFit: 'Fire TV Stick 4K Max, Chromecast 4K',
      steps: [
        'Install WireGuard or Tailscale Android TV client.',
        'Authenticate to your personal Tailscale tailnet or WireGuard home server.',
        'Connect stick to any hotel HDMI port and stream securely as if you were on your home couch.'
      ]
    },
    {
      id: 'ota-killswitch',
      category: 'System Defense',
      title: 'OTA Update Killswitch (Prevent Unwanted Firmware Locks)',
      description: 'Stop Amazon or Google from silently pushing background firmware updates that disable sideloading, launchers, or ADB debugging.',
      whyItMatters: 'Amazon regularly pushes silent OTA updates (like FireOS 7.6.6.9 and 8.1.0.4) specifically designed to kill custom launcher managers.',
      hardwareFit: 'Amazon Fire TV (all generations)',
      command: 'adb shell pm disable-user --user 0 com.amazon.device.software.ota && adb shell pm disable-user --user 0 com.amazon.device.software.ota.override',
      steps: [
        'Connect via ADB over Wi-Fi (`adb connect <FIRETV_IP>:5555`).',
        'Execute the OTA disable commands to freeze your firmware at its current stable version.',
        'Re-enable anytime with `pm enable com.amazon.device.software.ota` if an official update is desired.'
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
          <Sparkles className="w-4 h-4" />
          <span>Beyond Live TV · The Complete Power User Playbook</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          What Else Can You Do With This Setup?
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Sideloading free TV and streaming apps is just the beginning. Modern streaming hardware (Fire TV 4K Max, Chromecast 4K, onn. 4K Pro) packs quad-core processors, hardware AV1 decoders, and low-latency Bluetooth. Here is how power users transform a $30–$50 dongle into an ad-free home theater, gaming console, and secure travel rig.
        </p>
      </div>

      {/* Grid of Playbook Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {playbook.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {item.hardwareFit}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {item.title}
              </h2>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {item.description}
              </p>

              {/* Why It Matters Callout */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                <strong className="text-slate-900 dark:text-slate-200 font-semibold block mb-0.5">
                  Why Power Users Do This:
                </strong>
                {item.whyItMatters}
              </div>

              {/* Implementation Steps */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                  Setup Steps:
                </span>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                  {item.steps.map((s, idx) => (
                    <li key={idx} className="leading-relaxed">{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Optional One-Click ADB Command */}
            {item.command && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>ADB Execution Script:</span>
                  <button
                    onClick={() => handleCopy(item.id, item.command!)}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800">
                  {item.command}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
