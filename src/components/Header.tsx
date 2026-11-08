import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  BarChart2, 
  Cloud, 
  User, 
  LogOut, 
  Code, 
  Download, 
  Radio, 
  Menu, 
  X,
  FileCheck
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { id: number; username: string; email: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout
}) => {
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const secondaryTabs = [
    { id: 'sideload', label: 'Universal Sideloading', icon: Download, badge: 'Direct Pipeline' },
    { id: 'analytics', label: 'Privacy Analytics', icon: BarChart2, badge: 'Zero-PII' },
    { id: 'scrapers', label: 'Scraper Daemon', icon: Radio, badge: 'Reddit & YT' },
    { id: 'cloudflare', label: 'Cloudflare & VPS Deploy', icon: Cloud, badge: '$0 / $5 mo' },
    { id: 'code', label: 'Full Monorepo Code', icon: Code, badge: 'Docker + FastAPI' },
  ];

  const isSecondaryActive = secondaryTabs.some(t => t.id === activeTab);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-4 md:gap-8 transition-colors">
      {/* Zone 1: Brand Wordmark (Single text element with glowing accent) */}
      <button
        onClick={() => { setActiveTab('hardware'); setMobileMenuOpen(false); }}
        className="text-left whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity flex items-center gap-2.5 group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Terminal className="w-4 h-4" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
            OpenCast
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900">
              v2.0
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-0.5 hidden sm:block">
            The Open Streaming Platform
          </p>
        </div>
      </button>

      {/* Zone 2: 4-5 Primary Clean Nav Links + More Tools Dropdown (Desktop) */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'hardware'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Hardware Spec DB
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'issues'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          ADB Solutions
        </button>

        <button
          onClick={() => setActiveTab('webadb')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'webadb'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 font-semibold border border-emerald-200 dark:border-emerald-800'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-500" />
          WebADB Studio
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        <button
          onClick={() => setActiveTab('apkinspector')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'apkinspector'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
          APK & Shortcodes
        </button>

        <button
          onClick={() => setActiveTab('playbook')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'playbook'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Power Playbook
        </button>

        {/* More Tools Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isSecondaryActive
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>Tools & Guides</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {toolsDropdownOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Engineering & Deployment
              </div>
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setToolsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Zone 3: Primary Action, PWA Install & Auth Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <PWAInstallButton />

        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              @{currentUser.username}
            </span>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In / Register</span>
            <span className="sm:hidden">Auth</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('rag')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-blue-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RAG Corpus</span>
          <span className="sm:hidden">RAG</span>
        </button>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-2xl lg:hidden flex flex-col gap-1 z-50">
          <button
            onClick={() => { setActiveTab('hardware'); setMobileMenuOpen(false); }}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              activeTab === 'hardware' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4" /> Hardware Spec DB
          </button>
          <button
            onClick={() => { setActiveTab('issues'); setMobileMenuOpen(false); }}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              activeTab === 'issues' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4" /> ADB Solutions
          </button>
          <button
            onClick={() => { setActiveTab('webadb'); setMobileMenuOpen(false); }}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              activeTab === 'webadb' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" /> WebADB Studio (Interactive)
          </button>
          <button
            onClick={() => { setActiveTab('apkinspector'); setMobileMenuOpen(false); }}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              activeTab === 'apkinspector' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <FileCheck className="w-4 h-4" /> APK & Shortcodes Inspector
          </button>
          <button
            onClick={() => { setActiveTab('playbook'); setMobileMenuOpen(false); }}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
              activeTab === 'playbook' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Power User Playbook
          </button>

          <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Engineering Tools
          </div>

          {secondaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`text-left px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between ${
                  activeTab === tab.id ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{tab.label}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{tab.badge}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
