import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectProject } from '../../src/installer/detector.mjs';

function createTempDir() {
  const dir = join(tmpdir(), `qr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writePkg(dir, content = {}) {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test-app', ...content }));
}

describe('detectProject', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('package.json', () => {
    it('returns hasPackageJson: false when missing', () => {
      expect(detectProject(tmpDir).hasPackageJson).toBe(false);
    });

    it('returns hasPackageJson: true when present', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).hasPackageJson).toBe(true);
    });

    it('reads project name from package.json', () => {
      writePkg(tmpDir, { name: 'my-app' });
      expect(detectProject(tmpDir).name).toBe('my-app');
    });
  });

  describe('package manager detection', () => {
    it('defaults to npm', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).packageManager).toBe('npm');
    });

    it('detects pnpm from pnpm-lock.yaml', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectProject(tmpDir).packageManager).toBe('pnpm');
    });

    it('detects bun from bun.lock', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'bun.lock'), '');
      expect(detectProject(tmpDir).packageManager).toBe('bun');
    });

    it('detects yarn from yarn.lock', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'yarn.lock'), '');
      expect(detectProject(tmpDir).packageManager).toBe('yarn');
    });

    it('pnpm takes precedence over yarn', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'pnpm-lock.yaml'), '');
      writeFileSync(join(tmpDir, 'yarn.lock'), '');
      expect(detectProject(tmpDir).packageManager).toBe('pnpm');
    });
  });

  describe('TypeScript detection', () => {
    it('detects TypeScript from tsconfig.json', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'tsconfig.json'), '{}');
      expect(detectProject(tmpDir).isTypeScript).toBe(true);
    });

    it('detects TypeScript from devDependency', () => {
      writePkg(tmpDir, { devDependencies: { typescript: '^5.0.0' } });
      expect(detectProject(tmpDir).isTypeScript).toBe(true);
    });

    it('returns false when no TypeScript', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).isTypeScript).toBe(false);
    });
  });

  describe('test runner detection', () => {
    it('detects vitest', () => {
      writePkg(tmpDir, { devDependencies: { vitest: '^2.0.0' } });
      expect(detectProject(tmpDir).testRunner).toBe('vitest');
    });

    it('detects jest', () => {
      writePkg(tmpDir, { devDependencies: { jest: '^29.0.0' } });
      expect(detectProject(tmpDir).testRunner).toBe('jest');
    });

    it('detects mocha', () => {
      writePkg(tmpDir, { devDependencies: { mocha: '^10.0.0' } });
      expect(detectProject(tmpDir).testRunner).toBe('mocha');
    });

    it('vitest takes precedence over jest', () => {
      writePkg(tmpDir, { devDependencies: { vitest: '^2.0.0', jest: '^29.0.0' } });
      expect(detectProject(tmpDir).testRunner).toBe('vitest');
    });

    it('returns null when no test runner', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).testRunner).toBeNull();
    });
  });

  describe('coverage provider detection', () => {
    it('detects @vitest/coverage-v8', () => {
      writePkg(tmpDir, { devDependencies: { vitest: '^2.0.0', '@vitest/coverage-v8': '^2.0.0' } });
      expect(detectProject(tmpDir).coverageProvider).toBe('@vitest/coverage-v8');
    });

    it('detects @vitest/coverage-istanbul', () => {
      writePkg(tmpDir, {
        devDependencies: { vitest: '^2.0.0', '@vitest/coverage-istanbul': '^2.0.0' },
      });
      expect(detectProject(tmpDir).coverageProvider).toBe('@vitest/coverage-istanbul');
    });

    it('returns null when no coverage provider', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).coverageProvider).toBeNull();
    });
  });

  describe('ESLint detection', () => {
    it('detects ESLint from devDependency', () => {
      writePkg(tmpDir, { devDependencies: { eslint: '^9.0.0' } });
      expect(detectProject(tmpDir).hasEslint).toBe(true);
    });

    it('detects ESLint from eslint.config.mjs', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'eslint.config.mjs'), '');
      expect(detectProject(tmpDir).hasEslint).toBe(true);
    });

    it('detects ESLint from .eslintrc.json', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, '.eslintrc.json'), '{}');
      expect(detectProject(tmpDir).hasEslint).toBe(true);
    });

    it('returns false when no ESLint', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).hasEslint).toBe(false);
    });
  });

  describe('Stryker detection', () => {
    it('detects Stryker from @stryker-mutator/core dependency', () => {
      writePkg(tmpDir, { devDependencies: { '@stryker-mutator/core': '^8.0.0' } });
      expect(detectProject(tmpDir).hasStryker).toBe(true);
    });

    it('detects Stryker from stryker.config.mjs', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'stryker.config.mjs'), '');
      expect(detectProject(tmpDir).hasStryker).toBe(true);
    });

    it('detects Stryker from stryker.config.js', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, 'stryker.config.js'), '');
      expect(detectProject(tmpDir).hasStryker).toBe(true);
    });

    it('returns false when no Stryker', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).hasStryker).toBe(false);
    });
  });

  describe('source directory detection', () => {
    it('detects src/ directory', () => {
      writePkg(tmpDir);
      mkdirSync(join(tmpDir, 'src'));
      const result = detectProject(tmpDir);
      expect(result.hasSrcDir).toBe(true);
      expect(result.hasSrcDirName).toBe('src');
    });

    it('detects lib/ directory', () => {
      writePkg(tmpDir);
      mkdirSync(join(tmpDir, 'lib'));
      const result = detectProject(tmpDir);
      expect(result.hasSrcDir).toBe(true);
      expect(result.hasSrcDirName).toBe('lib');
    });

    it('returns hasSrcDir: false when no source directory', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).hasSrcDir).toBe(false);
    });
  });

  describe('CI platform detection', () => {
    it('detects GitHub from .github directory', () => {
      writePkg(tmpDir);
      mkdirSync(join(tmpDir, '.github'));
      expect(detectProject(tmpDir).ciPlatforms).toContain('github');
    });

    it('detects GitLab from .gitlab-ci.yml', () => {
      writePkg(tmpDir);
      writeFileSync(join(tmpDir, '.gitlab-ci.yml'), '');
      expect(detectProject(tmpDir).ciPlatforms).toContain('gitlab');
    });

    it('detects both platforms simultaneously', () => {
      writePkg(tmpDir);
      mkdirSync(join(tmpDir, '.github'));
      writeFileSync(join(tmpDir, '.gitlab-ci.yml'), '');
      const { ciPlatforms } = detectProject(tmpDir);
      expect(ciPlatforms).toContain('github');
      expect(ciPlatforms).toContain('gitlab');
    });

    it('returns empty array when no CI detected', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).ciPlatforms).toEqual([]);
    });
  });

  describe('lint extensions', () => {
    it('returns ts,tsx,js,jsx for TypeScript projects', () => {
      writePkg(tmpDir, { devDependencies: { typescript: '^5.0.0' } });
      expect(detectProject(tmpDir).lintExtensions).toBe('ts,tsx,js,jsx');
    });

    it('returns js,jsx for plain JavaScript projects', () => {
      writePkg(tmpDir);
      expect(detectProject(tmpDir).lintExtensions).toBe('js,jsx');
    });
  });
});
