import React, { useState, useEffect } from 'react';
import { FileJson, FileText, Download, Copy, Check, Sparkles } from 'lucide-react';

export const RagExportViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schema' | 'markdown'>('schema');
  const [schemaJson, setSchemaJson] = useState<string>('');
  const [markdownCorpus, setMarkdownCorpus] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/rag/export')
      .then(r => r.json())
      .then(data => {
        setSchemaJson(JSON.stringify(data.schema_org, null, 2));
        setMarkdownCorpus(data.llm_context_markdown);
      })
      .catch(err => console.error('Failed to load RAG export:', err));
  }, []);

  const handleCopy = () => {
    const textToCopy = activeTab === 'schema' ? schemaJson : markdownCorpus;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'schema' ? 'schema_org.json' : 'llm-context.md';
    const content = activeTab === 'schema' ? schemaJson : markdownCorpus;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400">
          <Sparkles className="w-4 h-4" />
          <span>The Knowledge Moat · AI Grounding & Search Indexing (Module 5)</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          LLM & SEO Generator
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Generates machine-readable structured data for search engine citation and a flat, high-density Markdown corpus optimized for vector database ingestion (ChromaDB, Pinecone, pgvector) without third-party SaaS scrapers.
        </p>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Segmented Tab Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'schema'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              schema_org.json (JSON-LD)
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'markdown'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              llm-context.md (RAG Corpus)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Content'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-5 shadow-inner">
        <pre className="font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
          {activeTab === 'schema' ? schemaJson : markdownCorpus}
        </pre>
      </div>
    </div>
  );
};
