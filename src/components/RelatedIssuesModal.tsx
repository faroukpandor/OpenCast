import React, { useEffect, useState } from 'react';
import { X,ArrowRight } from 'lucide-react';
import type { Issue } from '../types.ts';
import { api } from '../utils/api.ts';
import { Modal } from './Modal.tsx';
export const RelatedIssuesModal: React.FC<{ issueId: number | null; onClose: () => void; onSelectIssue: (id: number) => void }> = ({ issueId,onClose,onSelectIssue }) => {
  const [items,setItems] = useState<Issue[]>([]); const [loading,setLoading] = useState(false); const [error,setError] = useState('');
  useEffect(() => { if(!issueId) return; const controller=new AbortController(); setLoading(true); setError(''); setItems([]); api<Issue[]>(`/api/issues/${issueId}/related`,{ signal:controller.signal }).then(setItems).catch(e => { if(e.name!=='AbortError') setError(e.message); }).finally(() => { if(!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); },[issueId]);
  if(!issueId) return null;
  return <Modal label="Related issues" onClose={onClose}><div className="flex justify-between items-center mb-5"><h2 className="text-lg font-bold">Related issues</h2><button className="icon-button" onClick={onClose} aria-label="Close related issues"><X size={20}/></button></div>{loading ? <p className="muted text-sm" role="status">Searching the catalog…</p> : error ? <p role="alert" className="text-sm text-red-500">{error}</p> : !items.length ? <p className="muted text-sm">No related reports found.</p> : <div className="space-y-3">{items.map(i => <button key={i.id} className="w-full panel p-4 text-left hover:border-blue-500" onClick={() => onSelectIssue(i.id)}><span className="eyebrow">#{i.id} · {i.severity}</span><h3 className="text-sm font-semibold mt-2 flex justify-between gap-3">{i.title}<ArrowRight size={16} className="shrink-0"/></h3></button>)}</div>}<p className="text-xs muted mt-5">Ranked by shared keywords, device, and ecosystem. Similarity is not a guarantee of the same root cause.</p></Modal>;
};
