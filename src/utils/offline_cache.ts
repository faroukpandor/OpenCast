import type { Device, Issue, ShortcodeRecord } from '../types.ts';
import type { CatalogSnapshot } from './catalog_search.ts';
const KEY = 'opencast_catalog_v2';
const object = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
function validDevice(v: unknown): v is Device { return object(v) && Number.isSafeInteger(v.id) && text(v.name) && text(v.ecosystem) && text(v.release_date) && object(v.specs) && ['soc','ram','storage','os','wifi','hdr','audio'].every(k => text((v.specs as Record<string,unknown>)[k])) && typeof v.specs.adb_port === 'number'; }
function validIssue(v: unknown): v is Issue { return object(v) && Number.isSafeInteger(v.id) && Number.isSafeInteger(v.device_id) && text(v.title) && text(v.description) && ['low','medium','high','critical'].includes(String(v.severity)) && (v.solutions === undefined || Array.isArray(v.solutions) && v.solutions.every(s => object(s) && text(s.method) && text(s.command_code))); }
function validCode(v: unknown): v is ShortcodeRecord { return object(v) && text(v.code) && /^\d{5}$/.test(v.code) && text(v.appName) && text(v.targetUrl) && /^https:\/\//.test(v.targetUrl); }
export const offlineStorage = {
  getCatalog(): CatalogSnapshot | null {
    try { const data: unknown = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!object(data) || !Array.isArray(data.devices) || !Array.isArray(data.issues) || !Array.isArray(data.shortcodes) || !data.devices.every(validDevice) || !data.issues.every(validIssue) || !data.shortcodes.every(validCode)) return null; return { devices:data.devices,issues:data.issues,shortcodes:data.shortcodes }; } catch { return null; }
  },
  saveCatalog(catalog: CatalogSnapshot): boolean {
    try { localStorage.setItem(KEY,JSON.stringify({ ...catalog,savedAt:new Date().toISOString() })); return true; } catch { return false; }
  },
  getLastSync(): string | null { try { const data: unknown = JSON.parse(localStorage.getItem(KEY) || 'null'); return object(data) && text(data.savedAt) ? data.savedAt : null; } catch { return null; } }
};
