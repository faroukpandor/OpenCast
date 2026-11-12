import { backupDatabase } from '../src/server/backup.ts';

const destination = process.argv[2];
if (!destination) {
  console.error('Usage: npm run db:backup -- ./backups/opencast-YYYY-MM-DD.sqlite');
  process.exit(1);
}
const source = process.env.DATABASE_PATH || './data/opencast.sqlite';
try {
  backupDatabase(source, destination);
  console.log(`Verified SQLite backup written to ${destination}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Backup failed.');
  process.exit(1);
}
