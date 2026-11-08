import { Device, Issue } from '../server/db.ts';

const CACHE_KEYS = {
  DEVICES: 'sih_offline_devices',
  ISSUES: 'sih_offline_issues',
  COMMENTS_PREFIX: 'sih_offline_comments_',
  LAST_SYNC: 'sih_offline_last_sync'
};

export const offlineStorage = {
  saveDevices(devices: Device[]) {
    try {
      localStorage.setItem(CACHE_KEYS.DEVICES, JSON.stringify(devices));
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save devices to offline storage:', e);
    }
  },

  getDevices(): Device[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEYS.DEVICES);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveIssues(issues: Issue[]) {
    try {
      localStorage.setItem(CACHE_KEYS.ISSUES, JSON.stringify(issues));
    } catch (e) {
      console.warn('Failed to save issues to offline storage:', e);
    }
  },

  getIssues(): Issue[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEYS.ISSUES);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getLastSync(): string | null {
    try {
      return localStorage.getItem(CACHE_KEYS.LAST_SYNC);
    } catch {
      return null;
    }
  }
};
