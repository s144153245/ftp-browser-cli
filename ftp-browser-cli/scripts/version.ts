/**
 * Version management for build and offline package.
 * Reads version from package.json and writes VERSION file.
 */

import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGE_JSON = join(ROOT, 'package.json');
const VERSION_FILE = join(ROOT, 'VERSION');

export interface VersionInfo {
  version: string;
  name: string;
}

/**
 * Read version and name from package.json.
 */
export async function getVersionFromPackage(): Promise<VersionInfo> {
  const raw = await readFile(PACKAGE_JSON, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: string; name?: string };
  const version = typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  const name = typeof pkg.name === 'string' ? pkg.name : 'ftp-browser';
  return { version, name };
}

/**
 * Write VERSION file (one line: version string).
 */
export async function writeVersionFile(outPath: string = VERSION_FILE): Promise<void> {
  const { version } = await getVersionFromPackage();
  await writeFile(outPath, `${version}\n`, 'utf-8');
}

/**
 * Get version string for use in file names (e.g. 1.0.0).
 */
export async function getVersionString(): Promise<string> {
  const { version } = await getVersionFromPackage();
  return version;
}
