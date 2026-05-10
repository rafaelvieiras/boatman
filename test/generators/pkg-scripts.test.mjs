import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { injectPackageScripts } from '../../src/generators/pkg-scripts.mjs';

function createTempDir() {
  const dir = join(tmpdir(), `qr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writePkg(dir, scripts = {}) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', scripts }));
}

function readPkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

describe('injectPackageScripts', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
    writePkg(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('core scripts', () => {
    it('adds quality:gate, quality:gate:local and quality:baseline', async () => {
      const result = await injectPackageScripts(tmpDir, [], 'npm', false);
      expect(result.added).toContain('quality:gate');
      expect(result.added).toContain('quality:gate:local');
      expect(result.added).toContain('quality:baseline');
    });

    it('writes scripts to package.json', async () => {
      await injectPackageScripts(tmpDir, [], 'npm', false);
      const pkg = readPkg(tmpDir);
      expect(pkg.scripts['quality:gate']).toBe('node scripts/quality-gate.mjs');
      expect(pkg.scripts['quality:gate:local']).toBe('node scripts/quality-gate.mjs --local');
      expect(pkg.scripts['quality:baseline']).toBe('node scripts/quality-gate.mjs --generate-baseline');
    });
  });

  describe('duplication check', () => {
    it('adds duplication script with srcDirName', async () => {
      await injectPackageScripts(tmpDir, ['duplication'], 'npm', false, 'src');
      const pkg = readPkg(tmpDir);
      expect(pkg.scripts.duplication).toContain('jscpd src');
    });

    it('does not add duplication script when not in checks', async () => {
      await injectPackageScripts(tmpDir, [], 'npm', false);
      const pkg = readPkg(tmpDir);
      expect(pkg.scripts.duplication).toBeUndefined();
    });
  });

  describe('mutation check', () => {
    it('adds quality:mutation script when mutation check enabled', async () => {
      const result = await injectPackageScripts(tmpDir, ['mutation'], 'npm', false);
      expect(result.added).toContain('quality:mutation');
    });

    it('quality:mutation runs stryker', async () => {
      await injectPackageScripts(tmpDir, ['mutation'], 'npm', false);
      const pkg = readPkg(tmpDir);
      expect(pkg.scripts['quality:mutation']).toContain('stryker run');
    });

    it('does not add quality:mutation when mutation not in checks', async () => {
      await injectPackageScripts(tmpDir, [], 'npm', false);
      const pkg = readPkg(tmpDir);
      expect(pkg.scripts['quality:mutation']).toBeUndefined();
    });
  });

  describe('dry-run mode', () => {
    it('does not modify package.json when dryRun is true', async () => {
      const original = readFileSync(join(tmpDir, 'package.json'), 'utf8');
      await injectPackageScripts(tmpDir, ['duplication', 'mutation'], 'npm', true);
      const after = readFileSync(join(tmpDir, 'package.json'), 'utf8');
      expect(after).toBe(original);
    });

    it('still returns the expected packageJson object in dry-run', async () => {
      const result = await injectPackageScripts(tmpDir, [], 'npm', true);
      expect(result.packageJson).not.toBeNull();
      expect(result.added.length).toBeGreaterThan(0);
    });
  });

  describe('idempotency', () => {
    it('reports added on first run, empty added on second run', async () => {
      const first = await injectPackageScripts(tmpDir, [], 'npm', false);
      const second = await injectPackageScripts(tmpDir, [], 'npm', false);
      expect(first.added.length).toBeGreaterThan(0);
      expect(second.added.length).toBe(0);
      expect(second.updated.length).toBe(0);
    });

    it('reports updated when existing script has different value', async () => {
      writePkg(tmpDir, { 'quality:gate': 'old-command' });
      const result = await injectPackageScripts(tmpDir, [], 'npm', false);
      expect(result.updated).toContain('quality:gate');
    });
  });

  describe('missing package.json', () => {
    it('returns null packageJson when file does not exist', async () => {
      rmSync(join(tmpDir, 'package.json'));
      const result = await injectPackageScripts(tmpDir, [], 'npm', false);
      expect(result.packageJson).toBeNull();
      expect(result.added).toEqual([]);
    });
  });
});
