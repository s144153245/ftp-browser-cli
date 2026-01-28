/**
 * Build offline installation package.
 * Prefers standalone executable (pkg). If missing, creates node-based package
 * (dist + node_modules + wrapper).
 */

import { cp, mkdir, readFile, rm, stat, writeFile, chmod, access } from 'fs/promises';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getVersionString, writeVersionFile } from './version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RELEASES = join(ROOT, 'releases');
const EXECUTABLE = join(RELEASES, 'ftp-browser-linux-x64');
const TEMPLATES = join(__dirname, 'templates');
const PKG_PREFIX = 'ftp-browser-cli-offline';
const DIST = join(ROOT, 'dist');

async function hasExecutable(): Promise<boolean> {
  try {
    await access(EXECUTABLE);
    return true;
  } catch {
    return false;
  }
}

async function getStagingDir(version: string): Promise<string> {
  const name = `${PKG_PREFIX}-${version}-x64`;
  const staging = join(ROOT, 'tmp-offline-pkg', name);
  await rm(join(ROOT, 'tmp-offline-pkg'), { recursive: true }).catch(() => {});
  await mkdir(join(staging, 'bin'), { recursive: true });
  return staging;
}

async function copyFilesStandalone(staging: string, version: string): Promise<void> {
  const binDir = join(staging, 'bin');
  await cp(EXECUTABLE, join(binDir, 'ftp-browser'));
  await copyCommon(staging, version);
}

const WRAPPER_SCRIPT = `#!/bin/bash
self="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
ROOT="$(cd "$(dirname "$self")/.." && pwd)"
exec node "$ROOT/app/dist/cli.js" "$@"
`;

async function copyFilesNodeBased(staging: string, version: string): Promise<void> {
  const binDir = join(staging, 'bin');
  const appDir = join(staging, 'app');
  await mkdir(join(appDir, 'dist'), { recursive: true });
  await cp(join(DIST, 'cli.js'), join(appDir, 'dist', 'cli.js'));
  await cp(join(ROOT, 'package.json'), join(appDir, 'package.json'));
  const lock = join(ROOT, 'package-lock.json');
  try {
    await access(lock);
    await cp(lock, join(appDir, 'package-lock.json'));
  } catch {}
  await execSync('npm install --omit=dev', { cwd: appDir, stdio: 'pipe' });
  await writeFile(join(binDir, 'ftp-browser'), WRAPPER_SCRIPT, 'utf-8');
  await writeFile(join(staging, '.node-based'), '1', 'utf-8');
  await copyCommon(staging, version);
}

async function copyCommon(staging: string, version: string): Promise<void> {
  await cp(join(TEMPLATES, 'install.sh'), join(staging, 'install.sh'));
  await cp(join(TEMPLATES, 'uninstall.sh'), join(staging, 'uninstall.sh'));
  const readme = await readFile(join(TEMPLATES, 'README.txt'), 'utf-8');
  await writeFile(join(staging, 'README.txt'), readme.replace(/<version>/g, version));
  await writeVersionFile(join(staging, 'VERSION'));
}

async function setScriptPermissions(staging: string): Promise<void> {
  await chmod(join(staging, 'install.sh'), 0o755);
  await chmod(join(staging, 'uninstall.sh'), 0o755);
  await chmod(join(staging, 'bin', 'ftp-browser'), 0o755);
}

async function createTarGz(staging: string, version: string): Promise<string> {
  const archiveName = `${PKG_PREFIX}-${version}-x64.tar.gz`;
  const archivePath = join(RELEASES, archiveName);
  await mkdir(RELEASES, { recursive: true });
  const base = dirname(staging);
  const pkgName = `${PKG_PREFIX}-${version}-x64`;
  execSync(`tar -czf "${archivePath}" -C "${base}" "${pkgName}"`, { stdio: 'inherit' });
  await rm(join(ROOT, 'tmp-offline-pkg'), { recursive: true }).catch(() => {});
  return archivePath;
}

async function main(): Promise<void> {
  console.log('Build offline package: starting...');
  await access(join(DIST, 'cli.js'));
  const version = await getVersionString();
  const staging = await getStagingDir(version);
  const useExecutable = await hasExecutable();
  if (useExecutable) {
    console.log('Build offline package: using standalone executable.');
    await copyFilesStandalone(staging, version);
    await setScriptPermissions(staging);
  } else {
    console.log('Build offline package: executable missing, using node-based package.');
    await copyFilesNodeBased(staging, version);
    await setScriptPermissions(staging);
  }
  const archivePath = await createTarGz(staging, version);
  const st = await stat(archivePath);
  const sizeMB = (st.size / (1024 * 1024)).toFixed(2);
  console.log(`Build offline package: done -> ${archivePath} (${sizeMB} MB)`);
}

main().catch((err) => {
  console.error('Build offline package failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
