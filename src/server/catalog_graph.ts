import type { StreamingStore } from './db.ts';

export interface CatalogGraphNode { id: string; type: 'device' | 'issue' | 'solution' | 'shortcode' | 'source'; label: string; review_status?: 'reference' | 'unreviewed'; url?: string; }
export interface CatalogGraphEdge { from: string; to: string; relation: 'has_issue' | 'has_solution' | 'sourced_from' | 'targets'; evidence: 'extracted'; }
export interface CatalogGraph { version: 1; evidence_policy: 'Only explicit catalog/database relationships are exported; no inferred similarity edges.'; nodes: CatalogGraphNode[]; edges: CatalogGraphEdge[]; }

/** Deterministic, local graph export inspired by explicit-edge knowledge graphs. No model or external service is used. */
export function buildCatalogGraph(store: StreamingStore): CatalogGraph {
  const nodes: CatalogGraphNode[] = [];
  const edges: CatalogGraphEdge[] = [];
  const sources = new Map<string, string>();
  const sourceId = (url: string) => {
    let id = sources.get(url);
    if (!id) { id = `source:${nodes.length}`; sources.set(url, id); nodes.push({ id, type: 'source', label: url, url }); }
    return id;
  };

  for (const device of store.getDevices()) nodes.push({ id: `device:${device.id}`, type: 'device', label: device.name });
  for (const issue of store.getIssues()) {
    const id = `issue:${issue.id}`;
    nodes.push({ id, type: 'issue', label: issue.title, review_status: issue.review_status || 'reference' });
    edges.push({ from: `device:${issue.device_id}`, to: id, relation: 'has_issue', evidence: 'extracted' });
    if (issue.source_url) edges.push({ from: id, to: sourceId(issue.source_url), relation: 'sourced_from', evidence: 'extracted' });
    for (const solution of issue.solutions || []) {
      const solutionId = `solution:${solution.id}`;
      nodes.push({ id: solutionId, type: 'solution', label: solution.method, review_status: issue.review_status || 'reference' });
      edges.push({ from: id, to: solutionId, relation: 'has_solution', evidence: 'extracted' });
    }
  }
  for (const shortcode of store.getShortcodes()) {
    const id = `shortcode:${shortcode.code}`;
    nodes.push({ id, type: 'shortcode', label: shortcode.appName });
    edges.push({ from: id, to: sourceId(shortcode.targetUrl), relation: 'targets', evidence: 'extracted' });
  }
  return { version: 1, evidence_policy: 'Only explicit catalog/database relationships are exported; no inferred similarity edges.', nodes, edges };
}
