// Broad classification only. Raw user agents are never persisted.
export function classifyDeviceType(userAgent?: string): 'Streaming Device' | 'Mobile' | 'Tablet' | 'Desktop' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();

  if (
    ua.includes('aft') || // Amazon Fire TV identifier (AFTT, AFTMM, AFTN, etc.)
    ua.includes('firetv') ||
    ua.includes('firestick') ||
    ua.includes('chromecast') ||
    ua.includes('googletv') ||
    ua.includes('android tv') ||
    ua.includes('crkey') ||
    ua.includes('roku') ||
    ua.includes('appletv') ||
    ua.includes('smarttv') ||
    ua.includes('shield') ||
    ua.includes('mibox') ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('netcast')
  ) {
    return 'Streaming Device';
  }

  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'Tablet';
  }

  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
    return 'Mobile';
  }

  return 'Desktop';
}
