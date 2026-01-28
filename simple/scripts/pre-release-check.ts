/**
 * Pre-release verification script.
 * Verifies required files, typecheck, build, executable, package structure.
 */

import { access, readFile, stat } from 'fs/promises';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getVersionString } from './version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const RELEASES = join(ROOT, 'releases');
const BUNDLE = join(DIST, 'cli.js');
const EXECUTABLE = join(RELEASES, 'ftp-browser-linux-x64');

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function pass(name: string, detail?: string): void {
  results.push({ name, ok: true, detail });
}

function fail(name: string, detail?: string): void {
  results.push({ name, ok: false, detail });
}

async function checkRequiredFiles(): Promise<void> {
  const required = [
    'package.json',
    'src/index.tsx',
    'scripts/build.ts',
    'scripts/build-executable.ts',
    'scripts/build-offline-package.ts',
    'scripts/version.ts',
    'scripts/templates/install.sh',
    'scripts/templates/uninstall.sh',
    'scripts/templates/README.txt',
  ];
  let missing = 0;
  for (const p of required) {
    try {
      await access(join(ROOT, p));
    } catch {
      fail('Required files', `Missing: ${p}`);
      missing++;
    }
  }
  if (missing === 0) pass('Required files', `${required.length} files present`);
}

async function checkTypecheck(): Promise<void> {
  try {
    execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
    pass('Type check', 'tsc --noEmit OK');
  } catch (e) {
    fail('Type check', (e as Error).message?.split('\n').slice(-2).join(' ') || 'Failed');
  }
}

async function checkBuild(): Promise<void> {
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
    await access(BUNDLE);
    const st = await stat(BUNDLE);
    const kb = (st.size / 1024).toFixed(1);
    pass('Build', `dist/cli.js ${kb} KB`);
  } catch (e) {
    fail('Build', (e as Error).message?.split('\n').slice(-2).join(' ') || 'Failed');
  }
}

async function checkExecutable(): Promise<void> {
  try {
    await access(EXECUTABLE);
    execSync(`"${EXECUTABLE}" --version`, { stdio: 'pipe' });
    const st = await stat(EXECUTABLE);
    const mb = (st.size / (1024 * 1024)).toFixed(2);
    pass('Executable', `runs OK, ${mb} MB`);
  } catch {
    try {
      await access(EXECUTABLE);
      fail('Executable', '--version run failed');
    } catch {
      pass('Executable', 'Skipped (node-based package used when missing)');
    }
  }
}

async function checkPackageStructure(): Promise<void> {
  const version = await getVersionString();
  const archive = join(RELEASES, `ftp-browser-cli-offline-${version}-x64.tar.gz`);
  try {
    await access(archive);
    pass('Offline package', archive);
  } catch {
    fail('Offline package', 'Not found (run npm run build:package)');
  }
}

async function checkFileSizes(): Promise<void> {
  try {
    await access(BUNDLE);
    const st = await stat(BUNDLE);
    const kb = st.size / 1024;
    if (kb < 10) fail('File sizes', 'dist/cli.js suspiciously small');
    else pass('File sizes', `dist/cli.js ${kb.toFixed(1)} KB`);
  } catch {
    fail('File sizes', 'dist/cli.js missing');
  }
}

function printResults(): void {
  console.log('\nPre-release checklist\n');
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  for (const r of results) {
    const icon = r.ok ? '\u2713' : '\u2717';
    const msg = r.detail ? `${r.name}: ${r.detail}` : r.name;
    console.log(`  ${icon} ${msg}`);
  }
  console.log(`\n${ok}/${total} checks passed.\n`);
  if (ok < total) process.exit(1);
}

async function main(): Promise<void> {
  await checkRequiredFiles();
  await checkTypecheck();
  await checkBuild();
  await checkExecutable();
  await checkPackageStructure();
  await checkFileSizes();
  printResults();
}

main().catch((e) => {
  console.error('Pre-release check failed:', e);
  process.exit(1);
});
