#!/usr/bin/env node
/**
 * quality-ratchet — Smart quality gate installer with ratchet mechanism
 * https://github.com/rafaelvieiras/quality-ratchet
 *
 * Usage:
 *   npx quality-ratchet [init] [--path <dir>] [--yes] [--dry-run]
 *   npx quality-ratchet help
 */

import { run } from '../src/installer/index.mjs';

const args = process.argv.slice(2);

run(args).catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err.message ?? err);
  process.exit(1);
});
