import type { Device, Issue, Solution } from '../types.ts';

// Reference catalog. Firmware behavior must be validated on the target device.
export const seedDevices: Device[] = [
    {
      id: 1,
      name: "Amazon Fire TV Stick 4K Max (2nd Gen)",
      ecosystem: "Amazon",
      release_date: "2023-10-18",
      specs: {
        soc: "MediaTek MT8696T Quad-core 2.0 GHz",
        ram: "2 GB LPDDR4",
        storage: "16 GB eMMC",
        os: "FireOS 8 (Android 11 base)",
        adb_port: 5555,
        wifi: "Wi-Fi 6E (802.11ax tri-band)",
        hdr: "Dolby Vision, HDR10+, HDR10, HLG",
        audio: "Dolby Atmos, 7.1 surround sound"
      }
    },
    {
      id: 2,
      name: "Chromecast with Google TV (4K)",
      ecosystem: "Google",
      release_date: "2020-09-30",
      specs: {
        soc: "Amlogic S905X3 Quad-core 1.9 GHz",
        ram: "2 GB",
        storage: "8 GB (4.4 GB user usable)",
        os: "Google TV (Android 12)",
        adb_port: 5555,
        wifi: "Wi-Fi 5 (802.11ac dual-band)",
        hdr: "Dolby Vision, HDR10, HDR10+",
        audio: "Dolby Digital, Dolby Digital Plus, Dolby Atmos"
      }
    },
    {
      id: 3,
      name: "Nvidia Shield TV Pro (Flagship)",
      ecosystem: "Nvidia",
      release_date: "2019-10-28",
      specs: {
        soc: "NVIDIA Tegra X1+ (256-core GPU)",
        ram: "3 GB DDR4",
        storage: "16 GB (Dual USB 3.0 expansion)",
        os: "Android TV 11 (Shield Experience 9.1+)",
        adb_port: 5555,
        wifi: "Gigabit Ethernet + Wi-Fi 5 MIMO",
        hdr: "Dolby Vision Profile 7/8, HDR10",
        audio: "Lossless Dolby TrueHD Atmos, DTS-HD MA, DTS:X"
      }
    },
    {
      id: 4,
      name: "Walmart onn. Google TV 4K Pro Streaming Box",
      ecosystem: "Google",
      release_date: "2024-05-06",
      specs: {
        soc: "Amlogic S905X4 Quad-core 2.0 GHz",
        ram: "3 GB DDR4",
        storage: "32 GB",
        os: "Google TV (Android 12)",
        adb_port: 5555,
        wifi: "Wi-Fi 6",
        hdr: "Dolby Vision, HDR10",
        audio: "Dolby Atmos built-in speaker"
      }
    },
    {
      id: 5,
      name: "Apple TV 4K (3rd Gen - 128GB Gigabit)",
      ecosystem: "Apple",
      release_date: "2022-11-04",
      specs: {
        soc: "Apple A15 Bionic (5-core CPU, 16-core NPU)",
        ram: "4 GB LPDDR4X",
        storage: "128 GB NVMe High Speed",
        os: "tvOS 17.5+ / 18.0",
        adb_port: 0,
        wifi: "Gigabit Ethernet + Wi-Fi 6 MIMO + Thread/Matter",
        hdr: "Dolby Vision, HDR10+, Frame Rate Matching",
        audio: "Spatial Audio, Dolby Atmos, lossless 24-bit/48kHz"
      }
    },
    {
      id: 6,
      name: "LG C3 / G3 OLED TV (webOS)",
      ecosystem: "LG",
      release_date: "2023-03-15",
      specs: {
        soc: "LG α9 Gen6 AI Processor 4K",
        ram: "Not published; varies by model",
        storage: "Not published; varies by model",
        os: "webOS 23; homebrew support depends on firmware",
        adb_port: 0,
        wifi: "Wi-Fi 6 Dual-Band + Ethernet",
        hdr: "Dolby Vision 4K 120Hz, HDR10, HLG",
        audio: "eARC, Dolby Atmos, DTS Passthrough"
      }
    },
    {
      id: 7,
      name: "Samsung QN90C Neo QLED (Tizen OS)",
      ecosystem: "Samsung",
      release_date: "2023-04-10",
      specs: {
        soc: "Samsung Neural Quantum Processor 4K",
        ram: "Not published; varies by model",
        storage: "Not published; varies by model",
        os: "Tizen 7.0; developer support varies by model",
        adb_port: 0,
        wifi: "Wi-Fi 5 + Ethernet",
        hdr: "HDR10+, Quantum HDR 32X, HLG",
        audio: "Dolby Atmos, Q-Symphony, eARC"
      }
    },
    {
      id: 8,
      name: "Roku Ultra (4802R 2024 Edition)",
      ecosystem: "Roku",
      release_date: "2024-03-20",
      specs: {
        soc: "Realtek RTD1319 Quad-core ARM Cortex-A55",
        ram: "2 GB",
        storage: "4 GB internal (USB expansion)",
        os: "Roku OS 13.0",
        adb_port: 0,
        wifi: "Wi-Fi 5 Dual-band MIMO + Ethernet",
        hdr: "Dolby Vision, HDR10+",
        audio: "Dolby Atmos bitstream pass-through"
      }
    }
  ];

export const seedIssues: Issue[] = [
    {
      id: 1,
      device_id: 1,
      title: "FireOS 8 blocks ADB package installer for third-party APKs",
      description: "Firmware update RS8104 enforces strict verification when installing via adb install, throwing INSTALL_FAILED_VERIFICATION_FAILURE.",
      severity: "high",
      ecosystem: "Amazon",
      device_name: "Amazon Fire TV Stick 4K Max (2nd Gen)",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 2,
      device_id: 1,
      title: "Custom launcher disabled by Fire TV Home background update",
      description: "Operating system silently terminates custom home screens (Projectivy, FLauncher) after OTA background patch to the home launcher package.",
      severity: "critical",
      ecosystem: "Amazon",
      device_name: "Amazon Fire TV Stick 4K Max (2nd Gen)",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 3,
      device_id: 1,
      title: "Universal numeric shortcode fails to fetch direct APK redirect",
      description: "Users attempting to install SmartTube or Kodi via shortcode services encounter SSL handshake timeouts on strict FireOS 8 firmware.",
      severity: "medium",
      ecosystem: "Amazon",
      device_name: "Amazon Fire TV Stick 4K Max (2nd Gen)",
      created_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
    },
    {
      id: 4,
      device_id: 2,
      title: "Google TV 4K sideload APK permission denied in file manager",
      description: "Android 12 hides Developer Options and revokes REQUEST_INSTALL_PACKAGES for non-Play Store file managers.",
      severity: "medium",
      ecosystem: "Google",
      device_name: "Chromecast with Google TV (4K)",
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 5,
      device_id: 2,
      title: "Chromecast 4K storage full bootloop warning",
      description: "With only 4.4GB usable internal flash, cached APK downloads and app logs trigger storage exhaustion and bootloops.",
      severity: "high",
      ecosystem: "Google",
      device_name: "Chromecast with Google TV (4K)",
      created_at: new Date(Date.now() - 43200000).toISOString()
    },
    {
      id: 6,
      device_id: 3,
      title: "Nvidia Shield Android 11 external storage permissions break Plex & Kodi",
      description: "Scattered scoped storage enforcement in Shield Experience 9 breaks direct access to external USB hard drives for local media indexing.",
      severity: "high",
      ecosystem: "Nvidia",
      device_name: "Nvidia Shield TV Pro (Flagship)",
      created_at: new Date(Date.now() - 38000000).toISOString()
    },
    {
      id: 7,
      device_id: 4,
      title: "Walmart onn. 4K Pro microphone button remapping",
      description: "Remapping the dedicated Live TV button to launch Projectivy or SmartTube via Button Mapper ADB permissions.",
      severity: "low",
      ecosystem: "Google",
      device_name: "Walmart onn. Google TV 4K Pro Streaming Box",
      created_at: new Date(Date.now() - 36000000).toISOString()
    },
    {
      id: 8,
      device_id: 6,
      title: "LG webOS Homebrew Channel auto-renewal timer expiration",
      description: "Developer Mode on webOS expires every 1000 hours, disabling root shell and Homebrew packages unless keep-alive script is active.",
      severity: "medium",
      ecosystem: "LG",
      device_name: "LG C3 / G3 OLED TV (webOS)",
      created_at: new Date(Date.now() - 28000000).toISOString()
    },
    {
      id: 9,
      device_id: 8,
      title: "Roku Developer Mode secret installer access",
      description: "Roku does not run Android APKs; developer zip sideloading requires the secret hardware remote sequence.",
      severity: "medium",
      ecosystem: "Roku",
      device_name: "Roku Ultra (4802R 2024 Edition)",
      created_at: new Date(Date.now() - 20000000).toISOString()
    }
  ];

export const seedSolutions: Solution[] = [
    {
      id: 1,
      issue_id: 1,
      method: "ADB",
      command_code: "adb shell getprop ro.build.version.release && adb shell settings get global package_verifier_enable",
    },
    {
      id: 2,
      issue_id: 1,
      method: "Settings",
      command_code: "Settings -> My Fire TV -> Developer Options -> Install unknown apps -> Enable for Package Loader",
    },
    {
      id: 3,
      issue_id: 2,
      method: "ADB",
      command_code: "Use the custom launcher’s setup guide to enable its accessibility service. Keep the system launcher available as a fallback.",
    },
    {
      id: 4,
      issue_id: 3,
      method: "ADB",
      command_code: "Download only from the upstream publisher, verify its checksum, then adb install target_app.apk",
    },
    {
      id: 5,
      issue_id: 3,
      method: "Settings",
      command_code: "Loader Browser -> Settings -> Enable JavaScript -> Clear Cache -> Re-enter shortcode",
    },
    {
      id: 6,
      issue_id: 4,
      method: "Settings",
      command_code: "For USB ADB: Settings -> System -> About -> select Android TV OS build seven times -> Developer options -> USB debugging. For APK installation, use the per-source Install unknown apps setting instead.",
    },
    {
      id: 7,
      issue_id: 4,
      method: "ADB",
      command_code: "Settings -> Apps -> Special app access -> Install unknown apps -> grant only to a trusted file manager; revoke after installation.",
    },
    {
      id: 8,
      issue_id: 5,
      method: "ADB",
      command_code: "adb shell df -h /data && adb shell pm trim-caches 1G",
    },
    {
      id: 9,
      issue_id: 6,
      method: "ADB",
      command_code: "Use the media app's own folder picker to grant access to the external drive. Scoped-storage behavior varies by app and firmware; do not force app operations.",
    },
    {
      id: 10,
      issue_id: 7,
      method: "ADB",
      command_code: "Follow the button-remapping app's official setup guide. Grant only permissions it explains and supports; protected settings may require desktop ADB and are not universally grantable.",
    },
    {
      id: 11,
      issue_id: 8,
      method: "Software",
      command_code: "Check firmware compatibility and follow the webOS Homebrew project's official instructions. Developer-session renewal depends on the current tooling; do not pipe an unreviewed remote script into a shell.",
    },
    {
      id: 12,
      issue_id: 9,
      method: "Settings",
      command_code: "Remote: Home 3x, Up 2x, Right, Left, Right, Left, Right. Record IP & pass -> Access http://ROKU_IP to upload zip",
    }
  ];
