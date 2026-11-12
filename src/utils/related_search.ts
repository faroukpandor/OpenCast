export interface IssueRecord {
  id: number;
  device_id: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
  ecosystem?: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'which',
  'what', 'when', 'where', 'there', 'some', 'them', 'they', 'their', 'about',
  'into', 'after', 'will', 'also', 'than', 'then', 'very', 'just', 'more',
  'only', 'over', 'such', 'how', 'any', 'can', 'not', 'are', 'was', 'were',
  'has', 'had', 'does', 'did', 'doing', 'out', 'off', 'down', 'up', 'all',
  'each', 'few', 'other', 'both', 'our', 'own', 'same', 'too', 'who'
]);

/**
 * Tokenizes text into normalized unique keywords, removing punctuation and stop words.
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Finds up to `limit` issues related to a target issue based on keyword overlap
 * and domain relevance (e.g., matching adb, sideload, bootloop, audio, launcher terms).
 */
export function findRelatedIssues(
  targetIssue: IssueRecord,
  allIssues: (IssueRecord & Record<string, any>)[],
  limit: number = 5
): Array<IssueRecord & Record<string, any> & { score: number; matchedKeywords: string[] }> {
  const targetKeywords = extractKeywords(`${targetIssue.title} ${targetIssue.description}`);
  if (targetKeywords.length === 0) return [];

  const results: Array<IssueRecord & Record<string, any> & { score: number; matchedKeywords: string[] }> = [];

  for (const candidate of allIssues) {
    if (candidate.id === targetIssue.id) continue;

    const candidateTitleWords = new Set(extractKeywords(candidate.title));
    const candidateDescWords = new Set(extractKeywords(candidate.description));

    let score = 0;
    const matched: string[] = [];

    for (const kw of targetKeywords) {
      // Title matches carry higher weight
      if (candidateTitleWords.has(kw)) {
        score += 3;
        matched.push(kw);
      } else if (candidateDescWords.has(kw)) {
        score += 1;
        matched.push(kw);
      }
    }

    // Boost score if same device or ecosystem
    if (candidate.device_id === targetIssue.device_id) {
      score += 1.5;
    }
    if (candidate.ecosystem && targetIssue.ecosystem && candidate.ecosystem === targetIssue.ecosystem) {
      score += 1.0;
    }

    if (score > 0) {
      results.push({
        ...candidate,
        score,
        matchedKeywords: matched
      });
    }
  }

  // Sort descending by score, tiebreak by severity
  const severityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
  });

  return results.slice(0, limit);
}

/**
 * Searches issues matching a raw text query using keyword tokenization.
 */
export function searchIssuesByQuery(
  query: string,
  allIssues: (IssueRecord & Record<string, any>)[],
  limit: number = 5
): Array<IssueRecord & Record<string, any> & { score: number; matchedKeywords: string[] }> {
  return findRelatedIssues({
    id: -1,
    device_id: 0,
    title: query,
    description: query,
    severity: 'medium'
  }, allIssues, limit);
}
