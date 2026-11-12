import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface SecurityFinding { file: string; line: number; rule: string; message: string; }

// High-signal, deterministic source checks. This is a guardrail, not a penetration test or a replacement for dependency auditing.
const rules: { id: string; pattern: RegExp; message: string }[] = [
  { id: 'dynamic-code', pattern: /\beval\s*\(|\bnew\s+Function\s*\(/, message: 'Avoid dynamic code evaluation.' },
  { id: 'unsafe-html', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\s*\(/, message: 'Avoid unescaped HTML sinks; render text through React.' },
  { id: 'hardcoded-secret', pattern: /(?:password|passwd|secret|api_?key|access_?token|private_?key)\s*[:=]\s*['"][^'"]{8,}['"]/i, message: 'Possible hardcoded credential; load secrets from validated configuration.' },
  { id: 'tls-bypass', pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/, message: 'Do not disable TLS certificate validation.' },
  { id: 'wildcard-cors', pattern: /Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]/, message: 'Avoid wildcard CORS; use the explicit same-origin policy.' },
  { id: 'child-process', pattern: /(?:from\s*|require\s*\(\s*)['"]node:child_process['"]|(?:from\s*|require\s*\(\s*)['"]child_process['"]/, message: 'Application source should not spawn child processes.' },
  { id: 'sql-interpolation', pattern: /\.(?:prepare|exec|run|get|all)\s*\(\s*`[^`]*\$\{/, message: 'Use SQLite bind parameters instead of interpolating values into SQL.' },
];

export function scanSource(text: string, file = 'source.ts'): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const rule of rules) if (rule.pattern.test(line)) findings.push({ file, line: index + 1, rule: rule.id, message: rule.message });
  });
  return findings;
}

function collect(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...collect(path));
    else if (/\.(ts|tsx|js)$/.test(path) && !/\.test\./.test(path)) files.push(path);
  }
  return files;
}

function main() {
  const root = process.cwd();
  const files = [...collect(join(root, 'src')), join(root, 'server.ts'), join(root, 'public', 'sw.js')];
  const findings = files.flatMap(file => scanSource(readFileSync(file, 'utf8'), relative(root, file))).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  if (findings.length) {
    for (const finding of findings) console.error(`${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Deterministic source security check passed (${files.length} files). This does not certify the application as secure.`);
}

if (process.argv[1]?.endsWith('security_check.ts')) main();
