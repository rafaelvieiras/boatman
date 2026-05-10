import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Injects quality-gate scripts into the target project's package.json.
 *
 * @param {string}   rootDir        - Absolute path to the target project root.
 * @param {string[]} checks         - Active checks array.
 * @param {string}   packageManager - 'npm' | 'pnpm' | 'yarn' | 'bun'
 * @param {boolean}  dryRun         - If true, do not write any files.
 * @param {string}   [srcDirName]   - Source directory name (for jscpd command).
 * @returns {{ added: string[], updated: string[], packageJson: object|null }}
 */
export async function injectPackageScripts(rootDir, checks, packageManager, dryRun, srcDirName = 'src') {
  const pkgPath = join(rootDir, 'package.json');

  let pkgJson;
  try {
    pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    return { added: [], updated: [], packageJson: null };
  }

  if (!pkgJson.scripts || typeof pkgJson.scripts !== 'object') {
    pkgJson.scripts = {};
  }

  const checksSet = new Set(checks);
  const added = [];
  const updated = [];

  /**
   * Set a script key, recording whether it was added or updated.
   */
  function setScript(key, value) {
    if (pkgJson.scripts[key] === undefined) {
      pkgJson.scripts[key] = value;
      added.push(key);
    } else if (pkgJson.scripts[key] !== value) {
      pkgJson.scripts[key] = value;
      updated.push(key);
    }
    // else: already set to the same value — no-op
  }

  // Core quality gate scripts (always added)
  setScript('quality:gate',        'node scripts/quality-gate.mjs');
  setScript('quality:gate:local',  'node scripts/quality-gate.mjs --local');
  setScript('quality:baseline',    'node scripts/quality-gate.mjs --generate-baseline');

  // Duplication helper script
  if (checksSet.has('duplication')) {
    setScript('duplication', `jscpd ${srcDirName} --reporters json --output reports/`);
  }

  // Mutation testing script
  if (checksSet.has('mutation')) {
    setScript('quality:mutation', 'npx stryker run');
  }

  if (!dryRun) {
    writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  }

  return { added, updated, packageJson: pkgJson };
}
