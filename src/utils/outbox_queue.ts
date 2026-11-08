export interface QueuedComment { id: string; page_slug: string; content: string; timestamp: string; error?: string; }
const KEY='opencast_offline_outbox';
let flushing=false;
export const outboxManager = {
  getQueue(): QueuedComment[] {
    try { const value: unknown=JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.filter(v => v && typeof v.id==='string' && /^[0-9a-f-]{36}$/i.test(v.id) && typeof v.content==='string' && v.content.length<=2000 && /^issue-[1-9]\d{0,8}$/.test(v.page_slug)).slice(0,50) : []; } catch { return []; }
  },
  privateSave(items: QueuedComment[]) { localStorage.setItem(KEY,JSON.stringify(items)); window.dispatchEvent(new Event('outbox-updated')); },
  enqueue(comment: Omit<QueuedComment,'id'|'timestamp'>,id=crypto.randomUUID()) {
    const queue=this.getQueue(); const existing=queue.find(i => i.id===id); if(existing) return existing;
    if(queue.length>=50) throw new Error('Offline queue is full. Sync or remove pending reports first.');
    const item={ ...comment,id,timestamp:new Date().toISOString() }; this.privateSave([...queue,item]); return item;
  },
  remove(id: string) { this.privateSave(this.getQueue().filter(i => i.id!==id)); },
  async flush(submit: (item: QueuedComment) => Promise<void>): Promise<{ synced: number; remaining: number }> {
    if(flushing) return { synced:0,remaining:this.getQueue().length };
    flushing=true; let synced=0;
    try {
      for(const item of this.getQueue()) {
        if(item.error) continue;
        try { await submit(item); this.remove(item.id); synced++; }
        catch(e) {
          const status=(e as { status?: number }).status;
          if(status && status>=400 && status<500) {
            // Keep rejected drafts visible and editable, even if their page is not mounted.
            const message=status===429 ? 'Rate limited. Edit and retry later.' : (e as Error).message;
            this.privateSave(this.getQueue().map(i => i.id===item.id ? { ...i,error:message } : i));
            window.dispatchEvent(new CustomEvent('outbox-rejected',{ detail:{ item,message } }));
          } else break;
        }
      }
      return { synced,remaining:this.getQueue().length };
    } finally { flushing=false; }
  }
};
