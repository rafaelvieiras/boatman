import { describe, it, expect } from 'vitest';
import { generateGithubWorkflow } from '../../src/generators/workflow-github.mjs';

function makeConfig(checks = [], overrides = {}) {
  return {
    checks: new Set(checks),
    packageManager: 'npm',
    testRunner: 'vitest',
    testCoverageScript: null,
    lintScript: null,
    lintExtensions: 'ts,tsx',
    hasPrComment: false,
    mainBranches: ['main'],
    ...overrides,
  };
}

describe('generateGithubWorkflow', () => {
  it('returns a YAML string with workflow name', () => {
    const result = generateGithubWorkflow(makeConfig());
    expect(typeof result).toBe('string');
    expect(result).toContain('name: Quality Gate');
  });

  it('includes specified branch names', () => {
    const result = generateGithubWorkflow(makeConfig([], { mainBranches: ['main', 'develop'] }));
    expect(result).toContain('- main');
    expect(result).toContain('- develop');
  });

  describe('eslint check', () => {
    it('includes ESLint step when enabled', () => {
      const result = generateGithubWorkflow(makeConfig(['eslint']));
      expect(result).toContain('ESLint');
    });

    it('excludes ESLint step when disabled', () => {
      const result = generateGithubWorkflow(makeConfig());
      expect(result).not.toContain('Run ESLint');
    });
  });

  describe('coverage check', () => {
    it('includes coverage step when enabled', () => {
      const result = generateGithubWorkflow(makeConfig(['coverage']));
      expect(result).toContain('coverage');
    });

    it('uses provided testCoverageScript', () => {
      const result = generateGithubWorkflow(makeConfig(['coverage'], { testCoverageScript: 'test:cov' }));
      expect(result).toContain('test:cov');
    });
  });

  describe('mutation check', () => {
    it('includes Stryker step when enabled', () => {
      const result = generateGithubWorkflow(makeConfig(['mutation']));
      expect(result).toContain('Stryker');
      expect(result).toContain('stryker run');
    });

    it('excludes Stryker step when disabled', () => {
      const result = generateGithubWorkflow(makeConfig());
      expect(result).not.toContain('stryker run');
    });

    it('creates reports/mutation directory', () => {
      const result = generateGithubWorkflow(makeConfig(['mutation']));
      expect(result).toContain('reports/mutation');
    });
  });

  describe('audit check', () => {
    it('includes audit step when enabled', () => {
      const result = generateGithubWorkflow(makeConfig(['audit']));
      expect(result).toContain('audit');
    });
  });

  describe('complexity check', () => {
    it('includes complexity step when enabled', () => {
      const result = generateGithubWorkflow(makeConfig(['complexity']));
      expect(result).toContain('complexity scan');
    });

    it('outputs to reports/complexity.json', () => {
      const result = generateGithubWorkflow(makeConfig(['complexity']));
      expect(result).toContain('reports/complexity.json');
    });

    it('uses ESLint with complexity rules', () => {
      const result = generateGithubWorkflow(makeConfig(['complexity']));
      expect(result).toContain('"complexity"');
      expect(result).toContain('"max-lines-per-function"');
    });

    it('passes lintExtensions to --ext flag', () => {
      const result = generateGithubWorkflow(makeConfig(['complexity'], { lintExtensions: 'ts,tsx,js' }));
      expect(result).toContain('--ext ts,tsx,js');
    });

    it('excludes complexity step when disabled', () => {
      const result = generateGithubWorkflow(makeConfig());
      expect(result).not.toContain('complexity scan');
      expect(result).not.toContain('complexity.json');
    });
  });

  describe('PR comment', () => {
    it('includes PR comment step when hasPrComment is true', () => {
      const result = generateGithubWorkflow(makeConfig([], { hasPrComment: true }));
      expect(result).toContain('Comment on PR');
    });

    it('excludes PR comment step when hasPrComment is false', () => {
      const result = generateGithubWorkflow(makeConfig());
      expect(result).not.toContain('Comment on PR');
    });
  });

  describe('package manager', () => {
    it('uses pnpm install for pnpm', () => {
      const result = generateGithubWorkflow(makeConfig([], { packageManager: 'pnpm' }));
      expect(result).toContain('pnpm install');
    });

    it('uses bun install for bun', () => {
      const result = generateGithubWorkflow(makeConfig([], { packageManager: 'bun' }));
      expect(result).toContain('bun install');
    });

    it('uses yarn install for yarn', () => {
      const result = generateGithubWorkflow(makeConfig([], { packageManager: 'yarn' }));
      expect(result).toContain('yarn install');
    });

    it('uses npm ci for npm', () => {
      const result = generateGithubWorkflow(makeConfig());
      expect(result).toContain('npm ci');
    });
  });

  it('always includes artifact upload step', () => {
    const result = generateGithubWorkflow(makeConfig());
    expect(result).toContain('upload-artifact');
  });
});
