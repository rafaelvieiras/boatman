import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detects the project stack from a given root directory.
 *
 * @param {string} rootDir - Absolute path to the project root.
 * @returns {object} Detected project metadata.
 */
export function detectProject(rootDir) {
  const exists = (rel) => existsSync(join(rootDir, rel));
  const readJson = (rel) => {
    try {
      return JSON.parse(readFileSync(join(rootDir, rel), 'utf8'));
    } catch {
      return null;
    }
  };

  // --- package.json ---
  const packageJson = readJson('package.json');
  const hasPackageJson = packageJson !== null;
  const allDeps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  };
  const hasDep = (name) => name in allDeps;

  // --- Project name ---
  const name = packageJson?.name ?? null;

  // --- Package manager ---
  let packageManager = 'npm';
  if (exists('pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (exists('bun.lockb') || exists('bun.lock')) packageManager = 'bun';
  else if (exists('yarn.lock')) packageManager = 'yarn';

  // --- TypeScript ---
  const isTypeScript = exists('tsconfig.json') || hasDep('typescript');

  // --- Test runner ---
  let testRunner = null;
  if (hasDep('vitest')) testRunner = 'vitest';
  else if (hasDep('jest') || hasDep('@jest/core')) testRunner = 'jest';
  else if (hasDep('mocha')) testRunner = 'mocha';

  // --- Coverage provider ---
  let coverageProvider = null;
  if (testRunner === 'vitest') {
    if (hasDep('@vitest/coverage-v8')) coverageProvider = '@vitest/coverage-v8';
    else if (hasDep('@vitest/coverage-istanbul')) coverageProvider = '@vitest/coverage-istanbul';
  } else if (testRunner === 'jest') {
    // jest has built-in coverage
    coverageProvider = 'jest';
  }

  // --- Coverage report path ---
  let coverageReportPath = 'coverage/coverage-summary.json';
  if (testRunner === 'vitest') {
    coverageReportPath = 'reports/coverage/coverage-summary.json';
  }

  // --- ESLint ---
  const eslintConfigCandidates = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    'eslint.config.ts',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc',
  ];
  const eslintConfig = eslintConfigCandidates.find((f) => exists(f)) ?? null;
  const hasEslint = eslintConfig !== null || hasDep('eslint');

  // --- Source directory ---
  const srcDirCandidates = ['src', 'lib', 'app'];
  const hasSrcDirName = srcDirCandidates.find((d) => exists(d)) ?? null;
  const hasSrcDir = hasSrcDirName !== null;

  // --- CI platforms ---
  const ciPlatforms = [];
  if (exists('.github')) ciPlatforms.push('github');
  if (exists('.gitlab-ci.yml') || exists('.gitlab')) ciPlatforms.push('gitlab');

  // --- JSCPD ---
  const hasJscpd = hasDep('jscpd');

  // --- Lint extensions ---
  const lintExtensions = isTypeScript ? 'ts,tsx,js,jsx' : 'js,jsx';

  // --- Existing scripts ---
  const scripts = packageJson?.scripts ?? {};
  const findScript = (...keywords) => {
    for (const [key, val] of Object.entries(scripts)) {
      if (keywords.some((kw) => key.includes(kw) || val.includes(kw))) {
        return key;
      }
    }
    return null;
  };

  const testCoverageScript =
    findScript('coverage') ??
    findScript('test:cov') ??
    findScript('test:coverage') ??
    null;

  const lintScript =
    findScript('lint') ??
    null;

  return {
    root: rootDir,
    name,
    hasPackageJson,
    packageManager,
    isTypeScript,
    testRunner,
    coverageProvider,
    coverageReportPath,
    hasEslint,
    eslintConfig,
    hasSrcDir,
    hasSrcDirName,
    ciPlatforms,
    hasJscpd,
    packageJson,
    testCoverageScript,
    lintScript,
    lintExtensions,
  };
}
