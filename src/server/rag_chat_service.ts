import type { StreamingStore } from './db.ts';
import { searchCatalog } from '../utils/catalog_search.ts';
import { buildCatalogGraph } from './catalog_graph.ts';
import type { ChatMessage, ChatResponse } from '../types.ts';
export type { ChatMessage, ChatResponse } from '../types.ts';

export function buildRagContext(store: StreamingStore): string {
  return ['# OpenCast reference catalog', 'These are reference notes, not certified fixes. Do not invent validation results or checksums.',
    ...store.getDevices().map(d => `## Device ${d.id}: ${d.name}\nOS: ${d.specs.os}; SoC: ${d.specs.soc}; RAM: ${d.specs.ram}; Storage: ${d.specs.storage}.`),
    ...store.getIssues().map(i => `## Issue ${i.id}: ${i.title}\nDevice: ${i.device_name}; Severity: ${i.severity}; Review: ${i.review_status}.\n${i.description}\n${i.source_url ? `Source: ${i.source_url}\n` : ''}${i.solutions?.map(s => `- ${s.method}: ${s.command_code}`).join('\n') || 'No reviewed solution.'}`),
    ...store.getShortcodes().map(s => `## Shortcode ${s.code}: ${s.appName}\nUpstream: ${s.targetUrl}\nChecksum: ${s.sha256 || 'not independently verified'}`)
  ].join('\n\n');
}
export function generateLocalRagAnswer(query: string, store: StreamingStore): ChatResponse {
  return searchCatalog(query,{ devices: store.getDevices(), issues: store.getIssues(), shortcodes: store.getShortcodes() });
}
/** Free, deterministic retrieval. No external model, API key, or usage charges. */
export async function handleRagChat(message: string, _history: ChatMessage[] = [], store: StreamingStore): Promise<ChatResponse> {
  return generateLocalRagAnswer(message,store);
}
export function buildRagExport(store: StreamingStore) {
  return { schema_org: { '@context': 'https://schema.org', '@graph': store.getIssues().map(i => ({ '@type': 'TechArticle', headline: i.title, description: i.description, about: { '@type': 'Product', name: i.device_name }, creativeWorkStatus: i.review_status, ...(i.source_url ? { isBasedOn: i.source_url } : {}), hasPart: { '@type': 'HowTo', name: `Reference steps for ${i.title}`, step: i.solutions?.map((s,index) => ({ '@type': 'HowToStep', position: index+1, name: s.method, text: s.command_code })) || [] } })) }, llm_context_markdown: buildRagContext(store), knowledge_graph: buildCatalogGraph(store) };
}
