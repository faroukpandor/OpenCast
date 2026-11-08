import React, { useState, useRef, useEffect } from 'react';
import { searchCatalog, type CatalogSnapshot } from '../utils/catalog_search.ts';
import { offlineStorage } from '../utils/offline_cache.ts';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Terminal, 
  RotateCcw, 
  ChevronDown, 
  ShieldCheck,
  Cpu,
  Layers,
  Zap
} from 'lucide-react';


interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: string[];
  isAiGenerated?: boolean;
  timestamp: string;
}

export const FloatingChatWidget: React.FC<{ catalog: CatalogSnapshot }> = ({ catalog }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I am your **OpenCast Troubleshooting Copilot**.\n\nSearch streaming hardware specs, ADB references, package links, and troubleshooting notes. Answers come only from this catalog; no paid AI service is used.",
      sources: ['OpenCast reference catalog'],
      isAiGenerated: false,
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.parentElement?.scrollTo({ top: messagesEndRef.current.parentElement.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleCopy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { return; }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.filter(m => m.id !== 'welcome').slice(-6).map(m => ({
        role: m.role,
        text: m.text
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          history: historyPayload
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.answer || 'No response returned from knowledge base.',
        sources: data.sources || ['OpenCast RAG Engine'],
        isAiGenerated: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch {
      const cached = offlineStorage.getCatalog() || catalog;
      const result = searchCatalog(query,cached);
      const available = cached.devices.length || cached.issues.length;
      setMessages(prev => [...prev, { id: `local_${Date.now()}`, role: 'model', text: available ? `### Search from the browser’s cached catalog\n\nThe server is unavailable. These results may be older than the live catalog.\n\n${result.answer}` : 'The server is unavailable and no catalog has been cached on this browser. Connect once to load references, then retry.', sources: available ? result.sources : [], isAiGenerated: false, timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "FireOS 8 package verification reference",
    "How to install Projectivy Launcher without ads?",
    "What 5-digit shortcodes exist?",
    "How to fix TrueHD audio passthrough on Shield Pro?",
    "Prevent storage bootloop on Chromecast 4K"
  ];

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={index} className="my-2.5 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-xs">
            <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                {lang || 'bash / command'}
              </span>
              <button
                onClick={() => handleCopy(code)}
                className="hover:text-white transition-colors flex items-center gap-1"
                title="Copy Command"
              >
                {copiedCode === code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto text-emerald-400 whitespace-pre-wrap selection:bg-blue-600/30">
              {code}
            </pre>
          </div>
        );
      }

      // Format headings, markdown bold, and inline code as React text (never HTML).
      const paragraphs = part.split('\n\n');
      return (
        <div key={index} className="space-y-1.5">
          {paragraphs.map((p, pIdx) => {
            if (!p.trim()) return null;
            if (p.startsWith('### ')) return <h4 key={pIdx} className="font-bold text-sm leading-sn">{p.slice(4)}</h4>;
            return (
              <p key={pIdx} className="leading-relaxed">
                {p.split(/(\*\*.*?\*\*|`.*?`)/g).map((sub, sIdx) => {
                  if (sub.startsWith('**') && sub.endsWith('**')) {
                    return <strong key={sIdx} className="font-semibold text-slate-900 dark:text-white">{sub.slice(2, -2)}</strong>;
                  }
                  if (sub.startsWith('`') && sub.endsWith('`')) {
                    return <code key={sIdx} className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">{sub.slice(1, -1)}</code>;
                  }
                  return sub;
                })}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Always visible on bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Open troubleshooting assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-600"></span>
          </div>
          <span className="text-xs font-bold tracking-tight">OpenCast Copilot</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 text-blue-100 font-medium">
            Local RAG
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div role="region" aria-label="OpenCast catalog assistant" className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-slideUp transition-all">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                  OpenCast Copilot
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Catalog search · verify device-specific guidance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                title="Reset conversation" aria-label="Reset conversation"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat" aria-label="Minimize chat"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          {messages.length <= 2 && (
            <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto no-scrollbar">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Questions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] text-left px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm shadow-blue-500/10'
                      : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/80 dark:border-slate-700/60'
                  }`}>
                    <div className="text-xs leading-relaxed space-y-2">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Sources Badge */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <Layers className="w-3 h-3 text-blue-500" />
                        <span>Sources:</span>
                        {msg.sources.map((s, idx) => (
                          <span key={idx} className="bg-slate-200 dark:bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={`text-[9px] mt-1 text-right ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 p-3.5 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-slate-400 ml-1">Searching the reference catalog...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                aria-label="Ask the catalog"
                type="text"
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about ADB commands, shortcodes, launchers..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all shadow-sm shadow-blue-500/20"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Free local knowledge search
              </span>
              <span>Verify device-specific guidance</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
