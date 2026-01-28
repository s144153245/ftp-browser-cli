/**
 * CLI argument parsing and validation.
 * Parses FTP host (positional), options, builds FTPConfig, validates, and handles help/version.
 */

import { access } from 'fs/promises';
import { constants } from 'fs';
import { resolve } from 'path';
import type { FTPConfig } from './types/index.js';
import { defaults, version } from './utils/constants.js';

export interface CLIOptions {
  config: FTPConfig;
  downloadDir: string;
  noColor: boolean;
}

const HELP_TEXT = `
FTP_Browser-CLI - Interactive FTP browser

Usage:
  ftp-browser [options] <host>
  ftp-browser <host> [options]

Arguments:
  host                    FTP server hostname (required)

Options:
  -u, --user <username>   FTP username (default: anonymous)
  -p, --password <pass>   FTP password (default: '')
  -P, --port <port>       FTP port (default: 21)
  -d, --download-dir <p>  Download directory (default: ./downloads)
  -s, --secure            Use FTPS
  --timeout <ms>          Connection timeout in ms (default: 10000)
  --no-color              Disable colored output
  -v, --version           Show version
  -h, --help              Show this help

Examples:
  ftp-browser 172.17.201.151
  ftp-browser ftp.example.com -u admin -p secret
  ftp-browser ftp.example.com --secure --port 990
`.trim();

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') break;
    if (arg === '-h' || arg === '--help') {
      args['help'] = true;
      continue;
    }
    if (arg === '-v' || arg === '--version') {
      args['version'] = true;
      continue;
    }
    if (arg === '-u' || arg === '--user') {
      args['user'] = argv[++i] ?? '';
      continue;
    }
    if (arg === '-p' || arg === '--password') {
      args['password'] = argv[++i] ?? '';
      continue;
    }
    if (arg === '-P' || arg === '--port') {
      args['port'] = argv[++i] ?? String(defaults.ftpPort);
      continue;
    }
    if (arg === '-d' || arg === '--download-dir') {
      args['download-dir'] = argv[++i] ?? defaults.downloadDir;
      continue;
    }
    if (arg === '-s' || arg === '--secure') {
      args['secure'] = true;
      continue;
    }
    if (arg === '--timeout') {
      args['timeout'] = argv[++i] ?? String(defaults.ftpTimeout);
      continue;
    }
    if (arg === '--no-color') {
      args['noColor'] = true;
      continue;
    }
    if (arg.startsWith('-')) continue;
    positional.push(arg);
  }

  args['_'] = positional as unknown as string;
  return args;
}

function showHelp(): void {
  console.log(HELP_TEXT);
}

function showVersion(): void {
  console.log(`${version.name} v${version.full}`);
}

/**
 * Verifies that the download directory exists and is writable.
 * Creates it if it does not exist (validation runs after mkdir in app if needed).
 * For validation we check writable; if not exist, we could allow it and create later.
 * Spec: "Download directory must be writable (check permissions)".
 */
async function checkDownloadDirWritable(dir: string): Promise<{ ok: boolean; error?: string }> {
  const resolved = resolve(process.cwd(), dir);
  try {
    await access(resolved, constants.W_OK);
    return { ok: true };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') {
      try {
        const { mkdir } = await import('fs/promises');
        await mkdir(resolved, { recursive: true });
        await access(resolved, constants.W_OK);
        return { ok: true };
      } catch (inner) {
        const msg = (inner as Error)?.message ?? 'Unknown error';
        return { ok: false, error: `Download dir not writable: ${msg}` };
      }
    }
    return { ok: false, error: `Download dir not writable: ${err?.message ?? 'Unknown error'}` };
  }
}

/**
 * Parses CLI arguments, validates them, and returns config + options.
 * Handles --help and --version by printing and exiting (caller should exit after).
 */
export async function parseCLI(argv: string[] = process.argv.slice(2)): Promise<CLIOptions | null> {
  const raw = parseArgs(argv);

  if (raw['help'] === true) {
    showHelp();
    process.exitCode = 0;
    return null;
  }
  if (raw['version'] === true) {
    showVersion();
    process.exitCode = 0;
    return null;
  }

  const positional = (raw['_'] as unknown) as string[];
  const host = typeof positional?.[0] === 'string' ? positional[0].trim() : '';

  if (!host) {
    console.error('Error: Host is required. Use -h for help.');
    process.exitCode = 1;
    return null;
  }

  const portStr = String(raw['port'] ?? defaults.ftpPort);
  const port = parseInt(portStr, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error('Error: Port must be a number between 1 and 65535.');
    process.exitCode = 1;
    return null;
  }

  const timeoutStr = String(raw['timeout'] ?? defaults.ftpTimeout);
  const timeout = parseInt(timeoutStr, 10);
  if (Number.isNaN(timeout) || timeout <= 0) {
    console.error('Error: Timeout must be a positive number.');
    process.exitCode = 1;
    return null;
  }

  const downloadDirRaw = String(raw['download-dir'] ?? defaults.downloadDir);
  const dirCheck = await checkDownloadDirWritable(downloadDirRaw);
  if (!dirCheck.ok) {
    console.error(`Error: ${dirCheck.error}`);
    process.exitCode = 1;
    return null;
  }
  const downloadDir = resolve(process.cwd(), downloadDirRaw);

  const config: FTPConfig = {
    host,
    port,
    user: String(raw['user'] ?? defaults.ftpUser),
    password: String(raw['password'] ?? defaults.ftpPassword),
    secure: Boolean(raw['secure']),
    timeout,
    passive: defaults.ftpPassive,
  };

  return {
    config,
    downloadDir,
    noColor: Boolean(raw['noColor']),
  };
}
