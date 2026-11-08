import { GoogleGenAI } from '@google/genai';
import { store, Device, Issue, Solution } from './db.ts';
import { shortcodeEngine } from '../utils/shortcode_resolver.ts';
import { searchIssuesByQuery } from '../utils/related_search.ts';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  isAiGenerated: boolean;
}

/**
 * Builds the flat grounded RAG knowledge context from OpenCast's database.
 */
export function buildRagContext(): string {
  const devices = store.getDevices();
  const issues = store.getIssues();
  const shortcodes = shortcodeEngine.getAll();

  const deviceText = devices.map(d => 
    `• Device: ${d.name} (${d.ecosystem}) | OS: ${d.specs.os} | SoC: ${d.specs.soc} | RAM: ${d.specs.ram} | Storage: ${d.specs.storage} | ADB Port: ${d.specs.adb_port} | WiFi: ${d.specs.wifi} | Audio: ${d.specs.audio}`
  ).join('\n');

  const issueText = issues.map(i => {
    const full = store.getIssueById(i.id);
    const solList = full?.solutions?.map(s => 
      `    - [${s.method}] Command/Step: \`${s.command_code}\` (Success Rate: ${Math.round(s.success_rate * 100)}%)`
    ).join('\n') || '    - Pending investigation.';
    return `• Issue #${i.id}: "${i.title}"\n  Device: ${i.device_name} | Ecosystem: ${i.ecosystem} | Severity: ${i.severity.toUpperCase()}\n  Symptom: ${i.description}\n  Verified Solutions:\n${solList}`;
  }).join('\n\n');

  const shortcodeText = shortcodes.map(s => 
    `• Shortcode: #${s.code} -> ${s.appName} (v${s.version}) | URL: ${s.targetUrl} | SHA-256: ${s.sha256 || 'N/A'}`
  ).join('\n');

  return `
=== OPENCAST HARDWARE SPECIFICATION MATRIX ===
${deviceText}

=== OPENCAST VERIFIED ISSUES & ADB SOLUTIONS ===
${issueText}

=== OPENCAST 5-DIGIT SHORTCODES & VERIFIED PACKAGES ===
${shortcodeText}

=== POWER USER ARCHITECTURE PLAYBOOK ===
1. Custom Launcher Remap: Use Projectivy Launcher + accessibility service. Bypass Amazon Launcher killswitch with \`pm disable-user --user 0 com.amazon.device.sale.service\`.
2. FireOS 8 Sideload Verification Bypass: Run \`settings put global verifier_verify_adb_installs 0\` then \`adb install -r -d package.apk\`.
3. Lossless Home Cinema Audio: Kodi / Plex audio passthrough requires enabling Passthrough in Audio settings and selecting IEC or RAW for Dolby TrueHD Atmos and DTS-HD MA.
4. Chromecast 4K Storage Cleanup: Prevent bootloop by running \`pm trim-caches 1000M\` and deleting downloaded APK temporary caches in \`/sdcard/Download/\`.
5. Moonlight Game Streaming: Set bitrate to 50-80 Mbps, enable HEVC/AV1, and connect via 5GHz Wi-Fi 6 or Gigabit Ethernet.
6. Universal Sideload Pipeline: (1) Enable Developer Options (tap Build 7 times), (2) Allow Unknown Sources in Settings, (3) Use numeric shortcodes or direct URLs in loader, (4) Verify SHA-256 integrity.
`.trim();
}

import { resolveFailProofAnswer } from '../utils/failproof_rag.ts';

/**
 * Deterministic local RAG fallback answer generator using 100% free local resources.
 * Executes instantly without any external network dependency or paid APIs.
 */
export function generateLocalRagAnswer(query: string): ChatResponse {
  const fallback = resolveFailProofAnswer(query);
  return {
    answer: fallback.answer,
    sources: fallback.sources,
    isAiGenerated: false
  };
}

/**
 * Primary RAG Q&A handler using Gemini API with server-side knowledge base injection,
 * with graceful fallback to local RAG when no API key is provided.
 */
export async function handleRagChat(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Graceful local RAG response without external network dependence
    return generateLocalRagAnswer(message);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const ragContext = buildRagContext();

    const systemInstruction = `
You are the OpenCast AI Copilot: an elite TV OS systems engineer and streaming hardware specialist.
You assist users with troubleshooting, wireless ADB terminal commands, sideloading pipelines, launcher replacements, and audio/video configurations across FireOS, Google TV/Android TV, Apple tvOS, Roku OS, and webOS.

Strict Guidelines:
1. Ground your answers in the following OpenCast Knowledge Base.
2. Whenever an ADB command or setting path is available, format it clearly in markdown code blocks (\`\`\`bash ... \`\`\`).
3. Be concise, technical, and actionable. Avoid unnecessary fluff or conversational padding.
4. Do NOT mention any third-party commercial competitors or legacy ad-laden websites. Keep all identity focused on OpenCast.
5. Highlight relevant device specifics (SoC, RAM, OS version, ADB ports).

=== OPENCAST KNOWLEDGE BASE ===
${ragContext}
`.trim();

    // Format chat history
    const contents: any[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI response timed out, switching to fail-proof fallback')), 3500);
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: {
        systemInstruction
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const answer = response.text || 'No response generated.';
    const sources: string[] = ['OpenCast RAG Knowledge Base', 'Gemini Flash Grounding'];

    return {
      answer,
      sources,
      isAiGenerated: true
    };
  } catch (err: any) {
    console.warn('Gemini API call failed, using local RAG fallback:', err?.message || err);
    return generateLocalRagAnswer(message);
  }
}
