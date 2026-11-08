export interface QueuedComment {
  id: string;
  page_slug: string;
  content: string;
  nonce: string;
  timestamp: string;
}

const OUTBOX_STORAGE_KEY = 'opencast_offline_outbox';

export const outboxManager = {
  getQueue(): QueuedComment[] {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueue(comment: Omit<QueuedComment, 'id' | 'timestamp'>): QueuedComment {
    const queue = this.getQueue();
    const item: QueuedComment = {
      ...comment,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    queue.push(item);
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save to outbox:', e);
    }
    return item;
  },

  clearQueue(): void {
    try {
      localStorage.removeItem(OUTBOX_STORAGE_KEY);
    } catch {}
  },

  async flush(
    submitFn: (item: QueuedComment) => Promise<boolean>
  ): Promise<{ synced: number; remaining: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const remaining: QueuedComment[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const success = await submitFn(item);
        if (success) {
          synced++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(remaining));
    } catch {}

    return { synced, remaining: remaining.length };
  }
};
