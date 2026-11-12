// Reuse the free Chromium binary and AL2023 libraries in the npm dependency.
// No apt, browser CDN, account, or API key is needed on Linux.
import { existsSync, mkdirSync, createReadStream } from 'node:fs';
import { createBrotliDecompress } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { extract } from 'tar-fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const libraryDirectory = join(tmpdir(),'al2023');
if (process.platform === 'linux' && !existsSync(join(libraryDirectory,'lib/libnspr4.so'))) {
  mkdirSync(libraryDirectory,{ recursive:true });
  await pipeline(createReadStream(join(process.cwd(),'node_modules/@sparticuz/chromium/bin/al2023.tar.br')).pipe(createBrotliDecompress()),extract(libraryDirectory));
}
