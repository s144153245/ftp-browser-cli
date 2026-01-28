/**
 * Build standalone executable using pkg.
 * Output: releases/ftp-browser-linux-x64
 */

import { execSync } from 'child_process';
import { chmod, access, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RELEASES = join(ROOT, 'releases');
const EXECUTABLE = join(RELEASES, 'ftp-browser-linux-x64');
const TARGET = 'node18-linux-x64';

async function runPkg(): Promise<void> {
  await mkdir(RELEASES, { recursive: true });
  console.log('Build executable: running pkg...');
  execSync(`npx pkg . -o "${EXECUTABLE}" -t ${TARGET}`, {
    stdio: 'inherit',
    cwd: ROOT,
  });
}

async function setExecutablePermissions(): Promise<void> {
  await chmod(EXECUTABLE, 0o755);
  console.log('Build executable: chmod +x applied.');
}

async function verifyOutput(): Promise<void> {
  await access(EXECUTABLE);
  const { stat } = await import('fs/promises');
  const st = await stat(EXECUTABLE);
  const sizeMB = (st.size / (1024 * 1024)).toFixed(2);
  console.log(`Build executable: done -> ${EXECUTABLE} (${sizeMB} MB)`);
}

async function main(): Promise<void> {
  await runPkg();
  await setExecutablePermissions();
  await verifyOutput();
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Build executable failed:', msg);
  if (/top-level await|Babel parse|yoga-layout/i.test(msg)) {
    console.error('\nNote: pkg fails with deps that use top-level await (e.g. yoga-layout).');
    console.error('Use "npm run build:package" to create a node-based offline package instead.');
  }
  process.exit(1);
});
