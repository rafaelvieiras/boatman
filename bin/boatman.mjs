#!/usr/bin/env node
/**
 * boatman — Smart quality gate installer with ratchet mechanism
 * https://github.com/rafaelvieiras/boatman
 *
 * Usage:
 *   npx boatman [init] [--path <dir>] [--yes] [--dry-run]
 *   npx boatman help
 */

import { run } from '../src/installer/index.mjs';

const args = process.argv.slice(2);

run(args).catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err.message ?? err);
  process.exit(1);
});
