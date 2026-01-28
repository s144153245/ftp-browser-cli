/**
 * Production build script.
 * Bundles TypeScript/React to dist/cli.js using esbuild.
 */

import { build } from 'esbuild';
import { rm, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const ENTRY = join(ROOT, 'src', 'index.tsx');
const OUT = join(DIST, 'cli.js');
const STUB_DEVTOOLS = join(__dirname, 'stubs', 'react-devtools-core.js');

const NODE_BUILTINS = require('module').builtinModules as string[];

interface BuildOptions {
  minify: boolean;
  sourcemap: boolean;
}

async function cleanDist(): Promise<void> {
  try {
    await rm(DIST, { recursive: true });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code !== 'ENOENT') throw e;
  }
  await mkdir(DIST, { recursive: true });
}

async function runBuild(opts: BuildOptions): Promise<void> {
  await build({
    entryPoints: [ENTRY],
    outfile: OUT,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    minify: opts.minify,
    sourcemap: opts.sourcemap,
    jsx: 'automatic',
    logLevel: 'info',
    alias: { 'react-devtools-core': STUB_DEVTOOLS },
    external: [...NODE_BUILTINS],
    packages: 'external',
  });
}

async function main(): Promise<void> {
  const isDev = process.env.BUILD_ENV === 'development';
  const minify = !isDev;
  const sourcemap = isDev;

  console.log('Build: cleaning dist/...');
  await cleanDist();

  console.log(`Build: bundling (minify=${minify}, sourcemap=${sourcemap})...`);
  await runBuild({ minify, sourcemap });

  console.log(`Build: done -> ${OUT}`);
}

main().catch((err) => {
  console.error('Build failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
