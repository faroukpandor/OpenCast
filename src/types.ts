export interface Device {
  id: number;
  name: string;
  ecosystem: string;
  release_date: string;
  specs: { soc: string; ram: string; storage: string; os: string; adb_port: number; wifi: string; hdr: string; audio: string };
  issues_count?: number;
}
export interface Solution { id: number; issue_id: number; method: 'ADB' | 'Settings' | 'Software' | 'Hardware'; command_code: string; }
export interface Issue {
  id: number; device_id: number; title: string; description: string;
  severity: 'low' | 'medium' | 'high' | 'critical'; ecosystem?: string; device_name?: string;
  created_at?: string; solutions?: Solution[]; solutions_count?: number; source_url?: string | null;
  review_status?: 'reference' | 'unreviewed';
}
export interface User { id: number; username: string; email: string; role: 'admin' | 'member'; mfa_enabled?: boolean; }
export interface CommentItem {
  id: number; page_slug: string; author_hash: string; author_name: string; user_id: number | null;
  content: string; proof_of_work_nonce: string; created_at: string; client_id?: string;
}
export interface AnalyticsStats {
  total_views: number; views_today: number; unique_visitors_today: number;
  top_pages: { page: string; hits: number }[]; top_referrers: { referrer: string; hits: number }[];
  device_breakdown: Record<string, number>; retention_days: number;
}
export interface ShortcodeRecord { code: string; targetUrl: string; appName: string; sha256?: string; version?: string; createdAt: string; }
export interface ChatMessage { role: 'user' | 'model'; text: string; }
export interface ChatResponse { answer: string; sources: string[]; isAiGenerated: boolean; }

export interface PublicConfig { registration: boolean; scraperConfigured: boolean; redditConfigured: boolean; analyticsRetentionDays: number; privacyContact: string | null; operatorName: string | null; }
