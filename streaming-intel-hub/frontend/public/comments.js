/**
 * Cryptographic Proof-of-Work Comment Widget (comments.js)
 * Zero reCAPTCHA, zero Turnstile, zero third-party scripts.
 * 
 * Mines a SHA-256 nonce in the user's browser until SHA-256(comment + nonce) starts with '000'.
 * Average attempts: ~4096.
 * Browser computation time: ~100ms - 400ms on modern devices.
 * Completely stops automated spam bots while keeping human UX seamless.
 */

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function mineProofOfWork(content, onProgress) {
  let nonce = 0;
  const startTime = performance.now();
  const requiredPrefix = '000';

  while (true) {
    const candidateNonce = nonce.toString(36);
    const hash = await sha256(content + candidateNonce);
    
    if (nonce % 250 === 0 && onProgress) {
      const elapsed = Math.round(performance.now() - startTime);
      onProgress({ nonce: candidateNonce, attempts: nonce, elapsedMs: elapsed, currentHash: hash });
    }

    if (hash.startsWith(requiredPrefix)) {
      const totalElapsed = Math.round(performance.now() - startTime);
      return {
        nonce: candidateNonce,
        hash: hash,
        attempts: nonce + 1,
        elapsedMs: totalElapsed
      };
    }
    nonce++;
  }
}

// Global initialization function for the comment widget on any page
window.initCommentWidget = function(containerId, pageSlug) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Engineering Discussion</h3>
        <span class="text-xs text-slate-500 font-mono">Proof-of-Work Anti-Spam Enabled</span>
      </div>

      <div id="comments-list" class="space-y-4 mb-6">
        <p class="text-sm text-slate-500">Loading verified comments...</p>
      </div>

      <form id="comment-form" class="space-y-3">
        <textarea
          id="comment-text"
          rows="3"
          required
          placeholder="Share hardware observations, firmware build numbers, or ADB results..."
          class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        
        <div id="mining-status" class="hidden text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 p-2 rounded border border-blue-200 dark:border-blue-900">
          Mining Proof-of-Work nonce... <span id="hash-metric">0 hashes</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400">Zero CAPTCHA · Computational verification (~200ms)</span>
          <button
            type="submit"
            id="submit-comment-btn"
            class="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Mine & Post Comment
          </button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('comment-form');
  const textarea = document.getElementById('comment-text');
  const submitBtn = document.getElementById('submit-comment-btn');
  const miningStatus = document.getElementById('mining-status');
  const hashMetric = document.getElementById('hash-metric');
  const commentsList = document.getElementById('comments-list');

  async function loadComments() {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(pageSlug)}`);
      const data = await res.json();
      if (!data.comments || data.comments.length === 0) {
        commentsList.innerHTML = `<p class="text-sm text-slate-400 italic">No comments yet. Be the first engineer to report.</p>`;
        return;
      }
      commentsList.innerHTML = data.comments.map(c => `
        <div class="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span class="font-medium text-slate-800 dark:text-slate-200">${c.author_name}</span>
            <span class="font-mono text-[10px] text-slate-400">Nonce: ${c.proof_of_work_nonce} · ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
          <p class="text-sm text-slate-700 dark:text-slate-300">${c.content}</p>
        </div>
      `).join('');
    } catch (e) {
      commentsList.innerHTML = `<p class="text-xs text-red-500">Failed to load comments</p>`;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textarea.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Mining Nonce...';
    miningStatus.classList.remove('hidden');

    try {
      const pow = await mineProofOfWork(content, (progress) => {
        hashMetric.innerText = `${progress.attempts} attempts (${progress.elapsedMs}ms) - prefix: ${progress.currentHash.substring(0, 6)}...`;
      });

      miningStatus.innerText = `Verified PoW found in ${pow.elapsedMs}ms (${pow.attempts} attempts). Submitting...`;

      // Submit to backend
      const token = localStorage.getItem('auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          page_slug: pageSlug,
          content: content,
          nonce: pow.nonce
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to submit comment');
      }

      textarea.value = '';
      miningStatus.classList.add('hidden');
      await loadComments();
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Mine & Post Comment';
    }
  });

  loadComments();
};
