import { unzipSync } from 'fflate';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
export const MAX_APK_BYTES = 150 * 1024 * 1024;
export interface ApkSecurityReport {
  fileName: string; fileSize: number; computedSha256: string; packageName?: string; versionName?: string;
  targetSdk?: number; minSdk?: number; flags: string[];
  permissions: { name: string; isHighPrivilege: boolean; description: string }[];
  checksumMatch: boolean | null; manifestParsed: boolean;
}
const privilegeNotes: Record<string,string> = {
  REQUEST_INSTALL_PACKAGES: 'Can request installation of other packages.', SYSTEM_ALERT_WINDOW: 'Can draw over other apps.',
  WRITE_SECURE_SETTINGS: 'Can change protected system settings; normally requires privileged access.',
  BIND_ACCESSIBILITY_SERVICE: 'Accessibility services can observe screen content and actions.',
  READ_SMS: 'Can read text messages.', SEND_SMS: 'Can send text messages.', READ_CONTACTS: 'Can read contacts.',
  RECORD_AUDIO: 'Can record microphone audio.', ACCESS_FINE_LOCATION: 'Can request precise location.',
  MANAGE_EXTERNAL_STORAGE: 'Can request broad shared-storage access.'
};
export async function hashFile(file: Blob, onProgress?: (fraction: number) => void): Promise<string> {
  const hasher = sha256.create();
  // Stream in bounded chunks instead of allocating multiple copies of a large APK.
  for (let offset = 0; offset < file.size; offset += 1024 * 1024) {
    hasher.update(new Uint8Array(await file.slice(offset,offset+1024*1024).arrayBuffer()));
    onProgress?.(Math.min(1,(offset+1024*1024)/file.size));
  }
  return bytesToHex(hasher.digest());
}
// Parse Android's binary XML string pool and start-element attributes, without executing APK code.
export function parseBinaryManifest(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (bytes.length < 8 || view.getUint16(0,true) !== 0x0003) throw new Error('Not an Android binary manifest.');
  const strings: string[] = []; const attributes: Record<string,Record<string,string>> = {};
  let packageName: string | undefined; let versionName: string | undefined; let minSdk: number | undefined; let targetSdk: number | undefined; const permissions: string[] = [];
  const u16 = (o: number) => { if (o+2 > bytes.length) throw new Error('Truncated manifest.'); return view.getUint16(o,true); };
  const u32 = (o: number) => { if (o+4 > bytes.length) throw new Error('Truncated manifest.'); return view.getUint32(o,true); };
  const str = (index: number) => index === 0xffffffff ? '' : strings[index] || '';
  for (let offset = 8; offset < bytes.length;) {
    const type = u16(offset); const headerSize = u16(offset+2); const size = u32(offset+4);
    if (headerSize < 8 || size < headerSize || offset+size > bytes.length) throw new Error('Invalid manifest chunk.');
    if (type === 1) {
      const count = u32(offset+8); const flags = u32(offset+16); const dataStart = u32(offset+20); const utf8 = !!(flags & 0x100);
      if (count > 100000 || headerSize < 28 || dataStart < headerSize+count*4 || dataStart >= size) throw new Error('Invalid manifest string pool.');
      for (let i=0;i<count;i++) {
        const stringOffset=u32(offset+headerSize+i*4); const pos=offset+dataStart+stringOffset;
        if (stringOffset >= size-dataStart || pos >= offset+size) throw new Error('String offset outside manifest.');
        if (utf8) {
          let n = bytes[pos]; let p = pos+1; if (n & 0x80) { if(p >= offset+size) throw new Error('Truncated string length.'); n = ((n & 0x7f)<<8) | bytes[p++]; }
          if(p >= offset+size) throw new Error('Truncated string length.'); let length = bytes[p++]; if (length & 0x80) { if(p >= offset+size) throw new Error('Truncated string length.'); length = ((length & 0x7f)<<8) | bytes[p++]; }
          if(p+length > offset+size) throw new Error('String exceeds manifest bounds.');
          strings.push(new TextDecoder('utf-8',{ fatal:true }).decode(bytes.subarray(p,p+length)));
        } else {
          let length = u16(pos); let p = pos+2;
          if (length & 0x8000) { length = ((length & 0x7fff)<<16) | u16(p); p += 2; }
          if (length > 100000 || p+length*2 > offset+size) throw new Error('UTF-16 string exceeds manifest bounds.');
          strings.push(new TextDecoder('utf-16le',{ fatal:true }).decode(bytes.subarray(p,p+length*2)));
        }
      }
    } else if (type === 0x0102) {
      const ext = offset+headerSize; const name = str(u32(ext+4)); const attrStart = u16(ext+8); const attrSize = u16(ext+10) || 20; const count = u16(ext+12); if(attrStart < 16 || attrSize < 20 || attrStart+count*attrSize > size-headerSize) throw new Error('Invalid attribute bounds.');
      const values: Record<string,string> = {};
      for (let i=0;i<count;i++) {
        const a = ext+attrStart+i*attrSize; if (a+20 > offset+size) throw new Error('Truncated attributes.');
        const key = str(u32(a+4)); const raw = u32(a+8); const dataType = bytes[a+15]; const data = u32(a+16);
        const value = dataType === 3 ? str(raw) : dataType === 0x10 ? String(data) : raw !== 0xffffffff ? str(raw) : String(data);
        values[key] = value;
        if (name === 'manifest' && key === 'package') packageName = value;
        if (name === 'manifest' && key === 'versionName') versionName = value;
        if (name === 'uses-permission' && key === 'name') permissions.push(value);
        if (name === 'uses-sdk' && key === 'minSdkVersion') minSdk = Number(value);
        if (name === 'uses-sdk' && key === 'targetSdkVersion') targetSdk = Number(value);
      }
      attributes[name] = values;
    }
    offset += size;
  }
  return { packageName, versionName, minSdk, targetSdk, permissions: [...new Set(permissions)], attributes };
}
export async function inspectApk(file: File, expectedHash = '', onProgress?: (n: number) => void): Promise<ApkSecurityReport> {
  const expected = expectedHash.trim().toLowerCase();
  if (expected && !/^[a-f0-9]{64}$/.test(expected)) throw new Error('Expected SHA-256 must contain exactly 64 hexadecimal characters.');
  if (!file.size || file.size > MAX_APK_BYTES) throw new Error('Choose a non-empty APK no larger than 150 MB.');
  if (!file.name.toLowerCase().endsWith('.apk')) throw new Error('Choose an .apk file.');
  const computedSha256 = await hashFile(file,onProgress);
  let manifest: ReturnType<typeof parseBinaryManifest> | undefined; let manifestParsed = false; const flags: string[] = [];
  try {
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()),{ filter: f => f.name === 'AndroidManifest.xml' && f.originalSize <= 2*1024*1024 && f.size <= 2*1024*1024 });
    if (!archive['AndroidManifest.xml'] || archive['AndroidManifest.xml'].length > 2*1024*1024) throw new Error('Missing or oversized AndroidManifest.xml.');
    manifest = parseBinaryManifest(archive['AndroidManifest.xml']); manifestParsed = true;
  } catch { flags.push('Could not read a valid Android manifest. This may not be a valid APK.'); }
  const checksumMatch = expected ? expected === computedSha256 : null;
  if (checksumMatch === false) flags.push('Checksum does not match the expected publisher checksum. Do not install this file.');
  if (!expected) flags.push('No publisher checksum supplied. A checksum alone does not establish trust.');
  const permissions = (manifest?.permissions || []).map(name => { const short = name.split('.').pop() || name; return { name, isHighPrivilege: short in privilegeNotes, description: privilegeNotes[short] || 'Standard or custom Android permission.' }; });
  for (const p of permissions.filter(p => p.isHighPrivilege)) flags.push(`Review sensitive permission: ${p.name}.`);
  return { fileName: file.name, fileSize: file.size, computedSha256, packageName: manifest?.packageName, versionName: manifest?.versionName, minSdk: manifest?.minSdk, targetSdk: manifest?.targetSdk, permissions, flags, checksumMatch, manifestParsed };
}
