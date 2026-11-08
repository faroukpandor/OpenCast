import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './src/server/db.ts';
import { handleRagChat } from './src/server/rag_chat_service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to extract client IP
  const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  };

  // Helper to get bearer token user
  const getUserFromReq = (req: Request) => {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.substring(7).trim();
      return store.getUserByToken(token);
    }
    return null;
  };

  // --- API ROUTES ---

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'OpenCast Full-Stack Engine',
      privacy: 'Zero-PII Daily Salt GDPR Standard',
      saas_free: true
    });
  });

  // Devices
  app.get('/api/devices', (req: Request, res: Response) => {
    const ecosystem = req.query.ecosystem as string | undefined;
    res.json(store.getDevices(ecosystem));
  });

  app.get('/api/devices/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const dev = store.getDeviceById(id);
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    res.json(dev);
  });

  // Issues
  app.get('/api/issues', (req: Request, res: Response) => {
    const deviceId = req.query.device_id ? parseInt(req.query.device_id as string, 10) : undefined;
    const severity = req.query.severity as string | undefined;
    const search = req.query.search as string | undefined;
    res.json(store.getIssues({ device_id: deviceId, severity, search }));
  });

  app.get('/api/issues/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const issue = store.getIssueById(id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  });

  // RELATED ISSUES ENDPOINT (New API endpoint in issues.py requirement)
  app.get('/api/issues/:id/related', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const related = store.getRelatedIssues(id, 5);
    res.json(related);
  });

  // Privacy-First Analytics (Module 3)
  app.post('/api/analytics/track', (req: Request, res: Response) => {
    const { page, ref, ua } = req.body || {};
    const clientIp = getClientIp(req);
    const userAgent = ua || (req.headers['user-agent'] as string) || '';
    const referrer = ref || (req.headers['referer'] as string) || 'Direct';

    const event = store.trackEvent(page || '/', referrer, userAgent, clientIp);
    res.json({
      status: 'recorded',
      gdpr_compliant: true,
      daily_visitor_token: event.daily_visitor_token,
      device_type: event.device_type
    });
  });

  app.get('/api/analytics/stats', (_req: Request, res: Response) => {
    res.json(store.getStats());
  });

  // Comments with Cryptographic Proof of Work (Module 4)
  app.post('/api/comments', (req: Request, res: Response) => {
    const { page_slug, content, nonce, user_id } = req.body || {};
    if (!page_slug || !content || !nonce) {
      return res.status(400).json({ error: 'Missing required fields (page_slug, content, nonce).' });
    }

    // Check if authenticated
    const currentUser = getUserFromReq(req);
    const effectiveUserId = currentUser ? currentUser.id : user_id || null;

    try {
      const comment = store.addComment({
        page_slug,
        content,
        nonce,
        user_id: effectiveUserId
      });
      res.json({ status: 'success', comment });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/comments/:slug', (req: Request, res: Response) => {
    const slug = req.params.slug;
    const comments = store.getComments(slug);
    res.json({ page_slug: slug, count: comments.length, comments });
  });

  // Authentication (User auth requirement)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
      const result = store.registerUser(username.trim(), email.trim(), password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username_or_email, password } = req.body || {};
    if (!username_or_email || !password) {
      return res.status(400).json({ error: 'Credentials required.' });
    }
    try {
      const result = store.loginUser(username_or_email.trim(), password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.substring(7).trim();
      store.logoutUser(token);
    }
    res.json({ status: 'logged_out' });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ authenticated: true, user });
  });

  // Scraper Ingestion Daemon Trigger
  app.post('/api/scrapers/run', (_req: Request, res: Response) => {
    const result = store.runScraperSimulation();
    res.json({
      status: 'success',
      message: `Scraper finished. Ingested ${result.newly_ingested} new streaming troubleshooting records.`,
      result
    });
  });

  // LLM RAG & Schema.org Export (Module 5)
  app.get('/api/rag/export', (_req: Request, res: Response) => {
    const allDevices = store.getDevices();
    const allIssues = store.getIssues();

    // Generate Schema.org JSON-LD
    const schemaGraph = allIssues.map(issue => {
      const fullIssue = store.getIssueById(issue.id);
      return {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: issue.title,
        description: issue.description,
        articleSection: 'Streaming Device Troubleshooting',
        keywords: `${issue.ecosystem}, ADB, Sideloading, ${issue.device_name}`,
        about: {
          '@type': 'Product',
          name: issue.device_name,
          brand: issue.ecosystem
        },
        hasPart: {
          '@type': 'HowTo',
          name: `How to resolve: ${issue.title}`,
          step: fullIssue?.solutions?.map((s, idx) => ({
            '@type': 'HowToStep',
            position: idx + 1,
            name: `Method: ${s.method}`,
            text: s.command_code
          })) || []
        }
      };
    });

    // Generate Markdown corpus
    const mdLines = [
      '# Proprietary Streaming Intelligence Platform: Knowledge Base & RAG Corpus',
      '',
      '> Domain: Amazon Fire TV, Google TV, Roku, Apple TV ADB commands & recovery.',
      '',
      '## HARDWARE SPECIFICATIONS',
      ...allDevices.map(d => `### ${d.name}\n- Ecosystem: ${d.ecosystem}\n- OS: ${d.specs.os}\n- Chipset: ${d.specs.soc}\n- RAM: ${d.specs.ram} / Storage: ${d.specs.storage}\n- ADB Port: ${d.specs.adb_port}\n`),
      '## ISSUES & TESTED WORKAROUND MATRIX',
      ...allIssues.map(i => {
        const full = store.getIssueById(i.id);
        const solText = full?.solutions?.map(s => `  - [${s.method}] \`${s.command_code}\` (Success: ${Math.round(s.success_rate * 100)}%)`).join('\n') || '  - In progress.';
        return `### Issue #${i.id}: ${i.title}\n- Device: ${i.device_name} (${i.ecosystem})\n- Severity: ${i.severity.toUpperCase()}\n- Symptom: ${i.description}\n- Solutions:\n${solText}\n`;
      })
    ];

    res.json({
      schema_org: {
        '@context': 'https://schema.org',
        '@graph': schemaGraph
      },
      llm_context_markdown: mdLines.join('\n')
    });
  });

  // AI RAG Chat Copilot Endpoint (Grounded Q&A)
  app.post('/api/rag/chat', async (req: Request, res: Response) => {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    try {
      const response = await handleRagChat(message.trim(), history || []);
      res.json(response);
    } catch (err: any) {
      console.error('RAG chat error:', err);
      res.status(500).json({ error: err.message || 'Failed to process RAG chat query.' });
    }
  });

  // Mount Vite middleware for dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenCast server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
