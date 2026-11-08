import { hashDailyIp, classifyDeviceType } from '../utils/analytics_salt.ts';
import { verifyProofOfWork } from '../utils/crypto_pow.ts';
import { findRelatedIssues, IssueRecord } from '../utils/related_search.ts';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth_tokens.ts';

export interface Device {
  id: number;
  name: string;
  ecosystem: 'Amazon' | 'Google' | 'Roku' | 'Apple' | 'Nvidia' | 'LG' | 'Samsung' | 'Walmart';
  release_date: string;
  specs: {
    soc: string;
    ram: string;
    storage: string;
    os: string;
    adb_port: number;
    wifi: string;
    hdr: string;
    audio: string;
  };
  issues_count?: number;
}

export interface Solution {
  id: number;
  issue_id: number;
  method: 'ADB' | 'Settings' | 'Software' | 'Hardware';
  command_code: string;
  success_rate: number;
}

export interface Issue extends IssueRecord {
  device_name?: string;
  solutions?: Solution[];
  solutions_count?: number;
}

export interface CommentItem {
  id: number;
  page_slug: string;
  author_hash: string;
  author_name: string;
  user_id: number | null;
  content: string;
  proof_of_work_nonce: string;
  created_at: string;
}

export interface AnalyticsEvent {
  id: number;
  page_url: string;
  referrer: string;
  device_type: string;
  daily_visitor_token: string;
  timestamp: string;
}

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  salt: string;
  hash: string;
  token: string | null;
  created_at: string;
}

class InMemoryStreamingStore {
  devices: Device[] = [
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
        ram: "3 GB",
        storage: "8 GB internal",
        os: "webOS 23 (Homebrew Channel supported)",
        adb_port: 9922,
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
        ram: "2.5 GB",
        storage: "8 GB internal",
        os: "Tizen OS 7.0 (SDB Developer Mode)",
        adb_port: 26101,
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
        adb_port: 8060,
        wifi: "Wi-Fi 5 Dual-band MIMO + Ethernet",
        hdr: "Dolby Vision, HDR10+",
        audio: "Dolby Atmos bitstream pass-through"
      }
    }
  ];

  issues: Issue[] = [
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
      description: "Users attempting to install Elephant TV, SmartTube, or Kodi via shortcode services encounter SSL handshake timeouts on strict FireOS 8 firmware.",
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

  solutions: Solution[] = [
    {
      id: 1,
      issue_id: 1,
      method: "ADB",
      command_code: "adb shell settings put global verifier_verify_adb_installs 0 && adb install -r -d target_app.apk",
      success_rate: 0.98
    },
    {
      id: 2,
      issue_id: 1,
      method: "Settings",
      command_code: "Settings -> My Fire TV -> Developer Options -> Install unknown apps -> Enable for Package Loader",
      success_rate: 0.91
    },
    {
      id: 3,
      issue_id: 2,
      method: "ADB",
      command_code: "adb shell pm disable-user --user 0 com.amazon.device.sale.service && adb shell appops set com.spocky.projengmenu SYSTEM_ALERT_WINDOW allow",
      success_rate: 0.94
    },
    {
      id: 4,
      issue_id: 3,
      method: "ADB",
      command_code: "curl -L -o elephant.apk 'https://example.org/elephant.apk' && adb install -r elephant.apk",
      success_rate: 0.99
    },
    {
      id: 5,
      issue_id: 3,
      method: "Settings",
      command_code: "Loader Browser -> Settings -> Enable JavaScript -> Clear Cache -> Re-enter shortcode",
      success_rate: 0.88
    },
    {
      id: 6,
      issue_id: 4,
      method: "Settings",
      command_code: "Settings -> System -> About -> Click 'Android TV OS build' 7 times -> System -> Developer options -> USB debugging ON",
      success_rate: 0.96
    },
    {
      id: 7,
      issue_id: 4,
      method: "ADB",
      command_code: "adb shell appops set com.apk.installer REQUEST_INSTALL_PACKAGES allow",
      success_rate: 0.95
    },
    {
      id: 8,
      issue_id: 5,
      method: "ADB",
      command_code: "adb shell pm trim-caches 1000M && adb shell rm -rf /sdcard/Download/*",
      success_rate: 0.97
    },
    {
      id: 9,
      issue_id: 6,
      method: "ADB",
      command_code: "adb shell appops set com.plexapp.mediaserver.smb MANAGE_EXTERNAL_STORAGE allow && adb shell appops set org.xbmc.kodi MANAGE_EXTERNAL_STORAGE allow",
      success_rate: 0.96
    },
    {
      id: 10,
      issue_id: 7,
      method: "ADB",
      command_code: "adb shell appops set flar2.homebutton SYSTEM_ALERT_WINDOW allow && adb shell pm grant flar2.homebutton android.permission.WRITE_SECURE_SETTINGS",
      success_rate: 0.95
    },
    {
      id: 11,
      issue_id: 8,
      method: "Software",
      command_code: "curl -L https://webosbrew.org/install | sh && ares-extend-dev -d my_lg_tv",
      success_rate: 0.93
    },
    {
      id: 12,
      issue_id: 9,
      method: "Settings",
      command_code: "Remote: Home 3x, Up 2x, Right, Left, Right, Left, Right. Record IP & pass -> Access http://ROKU_IP to upload zip",
      success_rate: 0.91
    }
  ];

  comments: CommentItem[] = [
    {
      id: 1,
      page_slug: "issue-1",
      author_hash: "a4f89d31c0e2",
      author_name: "Farouk (Lead Architect)",
      user_id: 1,
      content: "The `verifier_verify_adb_installs 0` command completely bypassed the verification crash on our Fire TV Stick 4K Max 2nd Gen running RS8104. Verified working.",
      proof_of_work_nonce: "2d4",
      created_at: new Date(Date.now() - 48000000).toISOString()
    },
    {
      id: 2,
      page_slug: "issue-3",
      author_hash: "7b19ce40ef21",
      author_name: "StreamingDev_99",
      user_id: null,
      content: "Can confirm that typing direct APK URLs into the package loader works when third-party shortcodes fail. Installing Elephant TV or SmartTube is 100% fine if Unknown Sources is enabled.",
      proof_of_work_nonce: "18f",
      created_at: new Date(Date.now() - 24000000).toISOString()
    }
  ];

  analyticsEvents: AnalyticsEvent[] = [
    {
      id: 1,
      page_url: "/",
      referrer: "Direct",
      device_type: "Desktop",
      daily_visitor_token: "d41d8cd98f00b204",
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      page_url: "/issues/1",
      referrer: "https://reddit.com/r/firetv",
      device_type: "Streaming Device",
      daily_visitor_token: "e99a18c428cb38d5",
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 3,
      page_url: "/issues/3",
      referrer: "https://news.ycombinator.com",
      device_type: "Mobile",
      daily_visitor_token: "c4ca4238a0b92382",
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ];

  users: UserRecord[] = [];

  constructor() {
    // Seed default admin user for instant testing: username: "engineer", password: "password123"
    const { salt, hash } = hashPassword('password123');
    this.users.push({
      id: 1,
      username: 'engineer',
      email: 'engineer@opencast.local',
      salt,
      hash,
      token: 'demo-engineer-token-777',
      created_at: new Date().toISOString()
    });
  }

  getDevices(ecosystem?: string) {
    let result = this.devices;
    if (ecosystem && ecosystem !== 'All') {
      result = result.filter(d => d.ecosystem.toLowerCase() === ecosystem.toLowerCase());
    }
    return result.map(d => ({
      ...d,
      issues_count: this.issues.filter(i => i.device_id === d.id).length
    }));
  }

  getDeviceById(id: number) {
    const dev = this.devices.find(d => d.id === id);
    if (!dev) return null;
    const devIssues = this.issues.filter(i => i.device_id === id);
    return {
      ...dev,
      issues: devIssues
    };
  }

  getIssues(options?: { device_id?: number; severity?: string; search?: string }) {
    let list = [...this.issues];
    if (options?.device_id) {
      list = list.filter(i => i.device_id === options.device_id);
    }
    if (options?.severity && options.severity !== 'all') {
      list = list.filter(i => i.severity === options.severity);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return list.map(i => ({
      ...i,
      solutions: this.solutions.filter(s => s.issue_id === i.id),
      solutions_count: this.solutions.filter(s => s.issue_id === i.id).length
    }));
  }

  getIssueById(id: number) {
    const issue = this.issues.find(i => i.id === id);
    if (!issue) return null;
    const sols = this.solutions.filter(s => s.issue_id === id);
    return {
      ...issue,
      solutions: sols
    };
  }

  getRelatedIssues(issueId: number, limit: number = 5) {
    const target = this.issues.find(i => i.id === issueId);
    if (!target) return [];
    return findRelatedIssues(target, this.issues, limit);
  }

  addComment(data: { page_slug: string; content: string; nonce: string; user_id?: number | null }) {
    // 1. Verify Proof of Work
    const pow = verifyProofOfWork(data.content, data.nonce, '000');
    if (!pow.valid) {
      throw new Error("Invalid Proof-of-Work nonce. SHA-256(content + nonce) must begin with '000'.");
    }

    let authorName = "Anonymous Engineer";
    if (data.user_id) {
      const u = this.users.find(usr => usr.id === data.user_id);
      if (u) authorName = u.username;
    }

    const authorHash = pow.hash.substring(3, 15);
    const comment: CommentItem = {
      id: this.comments.length + 1,
      page_slug: data.page_slug,
      author_hash: authorHash,
      author_name: authorName,
      user_id: data.user_id || null,
      content: data.content,
      proof_of_work_nonce: data.nonce,
      created_at: new Date().toISOString()
    };
    this.comments.unshift(comment);
    return comment;
  }

  getComments(pageSlug: string) {
    return this.comments.filter(c => c.page_slug === pageSlug);
  }

  trackEvent(pageUrl: string, referrer?: string, userAgent?: string, clientIp: string = '127.0.0.1') {
    const dailyToken = hashDailyIp(clientIp);
    const deviceType = classifyDeviceType(userAgent);
    const event: AnalyticsEvent = {
      id: this.analyticsEvents.length + 1,
      page_url: pageUrl || '/',
      referrer: referrer || 'Direct',
      device_type: deviceType,
      daily_visitor_token: dailyToken,
      timestamp: new Date().toISOString()
    };
    this.analyticsEvents.unshift(event);
    return event;
  }

  getStats() {
    const totalViews = this.analyticsEvents.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const viewsToday = this.analyticsEvents.filter(e => e.timestamp.startsWith(todayStr)).length;

    const pageCounts: Record<string, number> = {};
    const referrerCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const uniqueTokensToday = new Set<string>();

    for (const event of this.analyticsEvents) {
      pageCounts[event.page_url] = (pageCounts[event.page_url] || 0) + 1;
      referrerCounts[event.referrer] = (referrerCounts[event.referrer] || 0) + 1;
      deviceCounts[event.device_type] = (deviceCounts[event.device_type] || 0) + 1;
      if (event.timestamp.startsWith(todayStr)) {
        uniqueTokensToday.add(event.daily_visitor_token);
      }
    }

    const topPages = Object.entries(pageCounts)
      .map(([page, hits]) => ({ page, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8);

    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, hits]) => ({ referrer, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8);

    return {
      total_views: totalViews,
      views_today: viewsToday,
      unique_visitors_today: uniqueTokensToday.size,
      top_pages: topPages,
      top_referrers: topReferrers,
      device_breakdown: deviceCounts,
      privacy_guarantee: "100% GDPR Compliant (No IP addresses stored, daily rotating cryptographic salt)"
    };
  }

  registerUser(username: string, email: string, password: string) {
    if (this.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username already taken.");
    }
    if (this.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered.");
    }

    const { salt, hash } = hashPassword(password);
    const token = generateToken();
    const newUser: UserRecord = {
      id: this.users.length + 1,
      username,
      email,
      salt,
      hash,
      token,
      created_at: new Date().toISOString()
    };
    this.users.push(newUser);
    return { token, user: { id: newUser.id, username: newUser.username, email: newUser.email } };
  }

  loginUser(usernameOrEmail: string, password: string) {
    const user = this.users.find(
      u => u.username.toLowerCase() === usernameOrEmail.toLowerCase() || u.email.toLowerCase() === usernameOrEmail.toLowerCase()
    );
    if (!user || !verifyPassword(password, user.salt, user.hash)) {
      throw new Error("Invalid username/email or password.");
    }
    const token = generateToken();
    user.token = token;
    return { token, user: { id: user.id, username: user.username, email: user.email } };
  }

  getUserByToken(token: string) {
    const user = this.users.find(u => u.token === token);
    if (!user) return null;
    return { id: user.id, username: user.username, email: user.email };
  }

  logoutUser(token: string) {
    const user = this.users.find(u => u.token === token);
    if (user) user.token = null;
    return true;
  }

  runScraperSimulation() {
    const candidateTitles = [
      {
        title: "FireOS 8.1.0.5 disables Local ADB debugging on reboot",
        description: "Recent push requires toggling Developer Options OFF and ON to restart adbd daemon on port 5555.",
        device_id: 1,
        severity: "high" as const,
        ecosystem: "Amazon"
      },
      {
        title: "Audio Passthrough DTS-HD dropouts on Google TV Android 12",
        description: "HDMI eARC multichannel bitstream drops to stereo when refresh rate switching is active in Kodi.",
        device_id: 2,
        severity: "medium" as const,
        ecosystem: "Google"
      },
      {
        title: "Downloader APK sideloading HTTP 403 on third-party repositories",
        description: "Cloudflare managed challenge on APK mirrors causes Downloader browser to stall on verification screen.",
        device_id: 1,
        severity: "medium" as const,
        ecosystem: "Amazon"
      }
    ];

    const added: Issue[] = [];
    for (const item of candidateTitles) {
      if (!this.issues.some(i => i.title === item.title)) {
        const newIssue: Issue = {
          id: this.issues.length + 1,
          device_id: item.device_id,
          title: item.title,
          description: item.description,
          severity: item.severity,
          ecosystem: item.ecosystem,
          device_name: this.devices.find(d => d.id === item.device_id)?.name,
          created_at: new Date().toISOString()
        };
        this.issues.unshift(newIssue);
        added.push(newIssue);

        // Add auto solution
        this.solutions.push({
          id: this.solutions.length + 1,
          issue_id: newIssue.id,
          method: "ADB",
          command_code: "adb connect <DEVICE_IP>:5555 && adb install -r -d target.apk",
          success_rate: 0.94
        });
      }
    }
    return { newly_ingested: added.length, issues: added };
  }
}

export const store = new InMemoryStreamingStore();
