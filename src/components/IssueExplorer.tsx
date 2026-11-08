import React, { useState } from 'react';
import { Issue, Solution } from '../server/db.ts';
import { Terminal, ShieldAlert, Sparkles, Copy, Check, Search, Filter, MessageSquare, ArrowUpRight } from 'lucide-react';
import { PowCommentWidget } from './PowCommentWidget.tsx';

interface IssueExplorerProps {
  issues: Issue[];
  onOpenRelated: (issueId: number) => void;
  currentUser: { id: number; username: string; email: string } | null;
}

export const IssueExplorer: React.FC<IssueExplorerProps> = ({
  issues,
  onOpenRelated,
  currentUser
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState<number>(issues[0]?.id || 1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchQuery ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const activeIssue = issues.find(i => i.id === selectedIssueId) || issues[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords (e.g., adb, sideload, fireos, bootloop)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Severity:</span>
          {['all', 'critical', 'high', 'medium'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 text-xs rounded-md font-mono uppercase transition-colors ${
                severityFilter === sev
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Split View: Issues List on Left, Active Issue & Solutions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Issues Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
          {filteredIssues.map((issue) => {
            const isSelected = issue.id === activeIssue?.id;
            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssueId(issue.id)}
                className={`cursor-pointer rounded-xl p-4 border transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    issue.severity === 'critical' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800' :
                    issue.severity === 'high' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' :
                    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="text-slate-400 text-[11px] truncate max-w-[160px]">
                    {issue.device_name}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {issue.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {issue.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Issue Details, Solutions & Comments (7 cols) */}
        {activeIssue && (
          <div className="lg:col-span-7 space-y-6">
            {/* Active Issue Header Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                    activeIssue.severity === 'critical' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400' :
                    activeIssue.severity === 'high' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
                    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                  }`}>
                    {activeIssue.severity} Severity
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeIssue.device_name} ({activeIssue.ecosystem})
                  </span>
                </div>

                {/* Related Issues Endpoint Action */}
                <button
                  onClick={() => onOpenRelated(activeIssue.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-blue-200 dark:border-blue-900"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Find Related Issues (API)
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {activeIssue.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeIssue.description}
                </p>
              </div>

              {/* Verified Solutions List */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                  Verified Engineering Solutions
                </h3>

                {activeIssue.solutions && activeIssue.solutions.length > 0 ? (
                  activeIssue.solutions.map((sol) => (
                    <div
                      key={sol.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          Method: {sol.method}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(sol.success_rate * 100)}% Success Verified
                        </span>
                      </div>

                      <div className="relative group">
                        <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 dark:bg-black font-mono text-xs overflow-x-auto border border-slate-800 pr-12">
                          {sol.command_code}
                        </pre>
                        <button
                          onClick={() => handleCopy(sol.command_code)}
                          title="Copy command"
                          className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          {copiedCode === sol.command_code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No verified solutions yet. Submit via comments below.</p>
                )}
              </div>
            </div>

            {/* Proof-of-Work Comment Section */}
            <PowCommentWidget
              pageSlug={`issue-${activeIssue.id}`}
              currentUser={currentUser}
            />
          </div>
        )}
      </div>
    </div>
  );
};
