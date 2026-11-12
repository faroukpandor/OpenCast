import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Create a consistent SQLite snapshot with VACUUM INTO, then verify the copy. Never overwrites an existing file. */
export function backupDatabase(sourcePath: string, destinationPath: string): void {
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination) throw new Error('Backup destination must differ from the live database.');
  if (!existsSync(source)) throw new Error(`Database not found: ${source}`);
  if (existsSync(destination)) throw new Error(`Backup destination already exists: ${destination}`);
  mkdirSync(dirname(destination), { recursive: true });

  const live = new DatabaseSync(source);
  try { live.exec('PRAGMA busy_timeout=5000;'); live.prepare('VACUUM INTO ?').run(destination); }
  finally { live.close(); }

  const copy = new DatabaseSync(destination, { readOnly: true });
  try {
    const result = copy.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    if (result?.integrity_check !== 'ok') throw new Error('Backup integrity check failed.');
  } finally { copy.close(); }
}
