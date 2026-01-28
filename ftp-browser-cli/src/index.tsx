#!/usr/bin/env node
/**
 * Entry point: parse CLI, validate, TTY check, render app, cleanup.
 */

import React from 'react';
import { render } from 'ink';
import { parseCLI } from './cli.js';
import { RootApp } from './app.js';

async function main(): Promise<void> {
  const opts = await parseCLI();
  if (!opts) {
    process.exit(process.exitCode ?? 0);
    return;
  }

  if (!process.stdout.isTTY) {
    console.error('Error: This application requires an interactive terminal (TTY).');
    process.exit(1);
  }

  console.clear();

  const { waitUntilExit } = render(
    React.createElement(RootApp, {
      config: opts.config,
      downloadDir: opts.downloadDir,
    })
  );

  await waitUntilExit();
  console.log('\n\x1b[32mGoodbye.\x1b[0m\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
