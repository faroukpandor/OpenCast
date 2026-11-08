export interface ShortcodeRecord {
  code: string;
  targetUrl: string;
  appName: string;
  sha256?: string;
  version?: string;
  createdAt: string;
}

/**
 * Standard registry of community-verified streaming APK shortcodes.
 * High-performance, self-hosted 5-digit redirect and package discovery service.
 */
export const DEFAULT_SHORTCODES: ShortcodeRecord[] = [
  {
    code: '10001',
    appName: 'Elephant TV Streaming Client',
    targetUrl: 'https://cdn.example.org/apks/elephant_v2.4.1.apk',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    version: '2.4.1',
    createdAt: '2026-11-01'
  },
  {
    code: '20002',
    appName: 'SmartTube Beta (Ad-Free 4K)',
    targetUrl: 'https://github.com/yuliskov/SmartTube/releases/latest/download/smarttube_beta.apk',
    sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    version: '22.84',
    createdAt: '2026-11-04'
  },
  {
    code: '30003',
    appName: 'Projectivy Launcher (Ad-Free Home)',
    targetUrl: 'https://github.com/spocky/projengmenu/releases/latest/download/projectivy.apk',
    sha256: '9f8e7d6c5b4a3928170e9d8c7b6a543210fedcba0987654321abcdef12345678',
    version: '4.5.2',
    createdAt: '2026-10-28'
  },
  {
    code: '40004',
    appName: 'Kodi v21 (Omega) - 32-bit ARM',
    targetUrl: 'https://mirrors.kodi.tv/releases/android/arm/kodi-21.0-Omega-armeabi-v7a.apk',
    sha256: '38a49c7e2b1d0f5e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f',
    version: '21.0-Omega',
    createdAt: '2026-10-15'
  }
];

export class ShortcodeEngine {
  private codes: Map<string, ShortcodeRecord> = new Map();

  constructor(initial: ShortcodeRecord[] = DEFAULT_SHORTCODES) {
    for (const item of initial) {
      this.codes.set(item.code, item);
    }
  }

  resolve(code: string): ShortcodeRecord | null {
    const clean = code.trim();
    return this.codes.get(clean) || null;
  }

  generate(appName: string, targetUrl: string, sha256?: string, version?: string): ShortcodeRecord {
    // Generate unique 5-digit code
    let candidate = '';
    do {
      candidate = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.codes.has(candidate));

    const record: ShortcodeRecord = {
      code: candidate,
      appName: appName.trim(),
      targetUrl: targetUrl.trim(),
      sha256: sha256?.trim(),
      version: version?.trim() || '1.0.0',
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.codes.set(candidate, record);
    return record;
  }

  getAll(): ShortcodeRecord[] {
    return Array.from(this.codes.values());
  }
}

export const shortcodeEngine = new ShortcodeEngine();
