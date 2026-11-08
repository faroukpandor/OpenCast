import React, { useEffect, useState } from 'react';
import { X, Sparkles, ArrowRight, Tag, ShieldAlert } from 'lucide-react';
import { Issue } from '../server/db.ts';

interface RelatedIssueItem {
  id: number;
  title: string;
  score?: number;
  severity: string;
  matched_keywords?: string[];
}

interface RelatedIssuesModalProps {
  issueId: number | null;
  onClose: () => void;
  onSelectIssue: (id: number) => void;
}

export const RelatedIssuesModal: React.FC<RelatedIssuesModalProps> = ({
  issueId,
  onClose,
  onSelectIssue
}) => {
  const [related, setRelated] = useState<RelatedIssueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [targetIssue, setTargetIssue] = useState<Issue | null>(null);

  useEffect(() => {
    if (!issueId) return;
    setLoading(true);

    // Fetch target issue and related items
    Promise.all([
      fetch(`/api/issues/${issueId}`).then(r => r.json()),
      fetch(`/api/issues/${issueId}/related`).then(r => r.json())
    ])
      .then(([issueData, relatedData]) => {
        setTargetIssue(issueData);
        setRelated(relatedData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load related issues:', err);
        setLoading(false);
      });
  }, [issueId]);

  if (!issueId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Text Keyword Search & Relevance Matching</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Related Streaming Issues
            </h3>
            {targetIssue && (
              <p className="text-xs text-slate-500 font-mono">
                Querying similarity for Issue #{targetIssue.id}: "{targetIssue.title.substring(0, 50)}..."
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Scanning SQLite issues corpus & computing keyword frequencies...
          </div>
        ) : related.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            No related issues found with overlapping keywords in this cluster.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 font-mono">
              Found {related.length} relevant issue{related.length === 1 ? '' : 's'} (max 5 returned):
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {related.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectIssue(item.id);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        Issue #{item.id}
                      </span>
                      {item.score && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          Relevance Score: {item.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {item.title}
                    </h4>

                    {/* Matched Keywords Tags */}
                    {item.matched_keywords && item.matched_keywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-mono">
                          Matched: {item.matched_keywords.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium mt-1">
                    Inspect <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Endpoint: /api/issues/{'{id}'}/related</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
