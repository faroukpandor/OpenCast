import type { Device, Issue, ShortcodeRecord, ChatResponse, Solution } from '../types.ts';
import { searchIssuesByQuery } from './related_search.ts';
export interface CatalogSnapshot { devices: Device[]; issues: Issue[]; shortcodes: ShortcodeRecord[]; }

/** Deterministic, free catalog retrieval shared by the server and offline browser. */
export function searchCatalog(query: string, catalog: CatalogSnapshot): ChatResponse {
  const code = query.match(/\b\d{5}\b/)?.[0];
  const shortcode = code ? catalog.shortcodes.find(s => s.code === code) : undefined;
  if (shortcode) return {
    answer: `### ${shortcode.appName}\n\nUpstream: ${shortcode.targetUrl}\n\n${shortcode.sha256 ? `Administrator-recorded SHA-256: \`${shortcode.sha256}\`. Compare it with your downloaded file in the APK inspector.` : 'No independently verified checksum is recorded. Obtain a checksum from the upstream publisher before installing.'} Open the source and review the release before downloading.`,
    sources: [`Shortcode ${shortcode.code}`,shortcode.targetUrl], isAiGenerated: false
  };
  const device = catalog.devices.find(d => query.toLowerCase().includes(d.name.toLowerCase()));
  if (device) return { answer: `### ${device.name}\n\n- OS: ${device.specs.os}\n- SoC: ${device.specs.soc}\n- RAM: ${device.specs.ram}\n- Storage: ${device.specs.storage}\n\nThese are catalog specifications; confirm the exact model and firmware on your device.`, sources: [`Device #${device.id}`], isAiGenerated: false };
  const matches = searchIssuesByQuery(query,catalog.issues,3).filter(i => i.matchedKeywords.length > 0);
  if (!matches.length) return { answer: '### OpenCast knowledge search\n\nNo matching reference entry was found. Try a device model or a specific symptom such as “storage”, “launcher”, or “ADB”. This is a catalog search, not a generative AI service; it does not certify fixes or validate downloaded packages.', sources: ['OpenCast reference catalog'], isAiGenerated: false };
  return { answer: matches.map(i => `### ${i.title}\n\n${i.review_status === 'unreviewed' ? 'Unreviewed community report. ' : ''}${i.description}\n\n${i.solutions?.map((s: Solution) => `**${s.method} reference**\n\`\`\`bash\n${s.command_code}\n\`\`\``).join('\n\n') || 'No reviewed solution yet.'}\n\n${i.source_url ? `Source: ${i.source_url}\n` : ''}Review the command and back up your device before applying it. Firmware behavior varies.`).join('\n\n'), sources: matches.map(i => i.source_url || `Issue #${i.id}: ${i.title}`), isAiGenerated: false };
}
