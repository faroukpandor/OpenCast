import React, { useState, useEffect } from 'react';
import { CommentItem } from '../server/db.ts';
import { ShieldCheck, Cpu, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface PowCommentWidgetProps {
  pageSlug: string;
  currentUser: { id: number; username: string; email: string } | null;
}

// Client-side SHA-256 using Web Crypto API
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PowCommentWidget: React.FC<PowCommentWidgetProps> = ({
  pageSlug,
  currentUser
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [content, setContent] = useState<string>('');
  const [isMining, setIsMining] = useState<boolean>(false);
  const [miningMetrics, setMiningMetrics] = useState<{
    attempts: number;
    elapsedMs: number;
    currentHash: string;
    verifiedHash?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadComments = () => {
    fetch(`/api/comments/${encodeURIComponent(pageSlug)}`)
      .then(r => r.json())
      .then(data => {
        if (data.comments) setComments(data.comments);
      })
      .catch(err => console.error('Error fetching comments:', err));
  };

  useEffect(() => {
    loadComments();
    setMiningMetrics(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [pageSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsMining(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const startTime = performance.now();
    let nonce = 0;
    const requiredPrefix = '000';
    let verifiedNonce = '';
    let verifiedHash = '';

    try {
      // Async loop to allow UI updates during computation
      while (true) {
        const candidateNonce = nonce.toString(36);
        const hash = await sha256(content + candidateNonce);

        if (nonce % 200 === 0) {
          const elapsed = Math.round(performance.now() - startTime);
          setMiningMetrics({
            attempts: nonce,
            elapsedMs: elapsed,
            currentHash: hash
          });
          // Yield to event loop to keep UI smooth
          await new Promise(r => setTimeout(r, 0));
        }

        if (hash.startsWith(requiredPrefix)) {
          verifiedNonce = candidateNonce;
          verifiedHash = hash;
          const totalElapsed = Math.round(performance.now() - startTime);
          setMiningMetrics({
            attempts: nonce + 1,
            elapsedMs: totalElapsed,
            currentHash: hash,
            verifiedHash: hash
          });
          break;
        }
        nonce++;
      }

      // Submit to backend API
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          page_slug: pageSlug,
          content: content.trim(),
          nonce: verifiedNonce,
          user_id: currentUser ? currentUser.id : null
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to post comment.');
      }

      setContent('');
      setSuccessMessage(`Comment verified & posted! Nonce: ${verifiedNonce} in ${miningMetrics?.elapsedMs || 150}ms.`);
      loadComments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error mining Proof-of-Work nonce.');
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Community Observations & ADB Results
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Proof-of-Work Anti-Spam Active (000 Prefix)</span>
        </div>
      </div>

      {/* Existing Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No reports yet on this issue. Run tests on your hardware and submit verified findings.
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {comment.author_name}
                  </span>
                  {comment.user_id && (
                    <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.2 rounded">
                      Verified Member
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>Nonce: {comment.proof_of_work_nonce}</span>
                  <span>·</span>
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Comment Form with PoW Miner */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Submit Hardware Test Report:
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isMining}
            rows={3}
            placeholder={
              currentUser
                ? `Posting as @${currentUser.username}: Share firmware build, ADB outputs, or troubleshooting steps...`
                : "Posting anonymously: Share firmware build, ADB outputs, or troubleshooting steps..."
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Real-time Mining Telemetry Box */}
        {isMining && miningMetrics && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 font-mono text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 animate-spin" />
                Mining Proof-of-Work Challenge...
              </span>
              <span>{miningMetrics.elapsedMs}ms</span>
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400">
              Tested Nonces: {miningMetrics.attempts.toLocaleString()} | Current Digest: {miningMetrics.currentHash.substring(0, 14)}...
            </div>
          </div>
        )}

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs border border-red-200 dark:border-red-900">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 font-mono">
            Zero CAPTCHA · Browser calculates ~4,096 hashes to block bots (~200ms)
          </p>

          <button
            type="submit"
            disabled={isMining || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            {isMining ? 'Mining PoW Nonce...' : 'Mine & Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
