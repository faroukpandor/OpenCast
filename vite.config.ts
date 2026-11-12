import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
function offlinePrecache(): Plugin {
  return { name:'opencast-offline-precache',apply:'build',closeBundle() {
    const dir=resolve('dist');
    const files=readdirSync(dir+'/assets').map(f=>'/assets/'+f).concat(['/','/index.html','/manifest.json','/icon.svg','/icon-192.png','/icon-512.png']);
    const hash=createHash('sha256');
    for (const file of files) hash.update(file).update(readFileSync(resolve(dir,file === '/' ? 'index.html' : file.slice(1))));
    execFileSync(process.execPath,['--check',dir+'/sw.js']);
    const source=readFileSync(dir+'/sw.js','utf8');
    writeFileSync(dir+'/sw.js',source.replace('__BUILD_CACHE__',`opencast-${hash.digest('hex').slice(0,12)}`).replace('__PRECACHE__',JSON.stringify(files)));
    execFileSync(process.execPath,['--check',dir+'/sw.js']);
  } };
}
export default defineConfig({
  plugins: [react(),tailwindcss(),offlinePrecache()],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app','localhost','127.0.0.1'] },
  build: { target: 'es2022', sourcemap: false },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] }
});
