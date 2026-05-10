import { describe, it, expect } from 'vitest';
import { generateGitlabWorkflow } from '../../src/generators/workflow-gitlab.mjs';

function makeConfig(checks = [], overrides = {}) {
  return {
    checks: new Set(checks),
    packageManager: 'npm',
    testRunner: 'vitest',
    testCoverageScript: null,
    lintScript: null,
    ...overrides,
  };
}

describe('generateGitlabWorkflow', () => {
  it('returns a YAML string with stages', () => {
    const result = generateGitlabWorkflow(makeConfig());
    expect(typeof result).toBe('string');
    expect(result).toContain('stages:');
  });

  it('always includes quality-gate job', () => {
    const result = generateGitlabWorkflow(makeConfig());
    expect(result).toContain('quality-gate:');
  });

  describe('lint job', () => {
    it('includes lint job when eslint check enabled', () => {
      const result = generateGitlabWorkflow(makeConfig(['eslint']));
      expect(result).toContain('lint:');
    });

    it('excludes lint job when eslint check disabled', () => {
      const result = generateGitlabWorkflow(makeConfig());
      expect(result).not.toContain('\nlint:');
    });
  });

  describe('test job', () => {
    it('includes test job when coverage check enabled', () => {
      const result = generateGitlabWorkflow(makeConfig(['coverage']));
      expect(result).toContain('\ntest:');
    });
  });

  describe('mutation job', () => {
    it('includes mutation job when mutation check enabled', () => {
      const result = generateGitlabWorkflow(makeConfig(['mutation']));
      expect(result).toContain('mutation:');
      expect(result).toContain('stryker run');
    });

    it('excludes mutation job when mutation check disabled', () => {
      const result = generateGitlabWorkflow(makeConfig());
      expect(result).not.toContain('mutation:');
    });

    it('adds mutation to quality-gate needs', () => {
      const result = generateGitlabWorkflow(makeConfig(['mutation']));
      expect(result).toContain('- mutation');
    });

    it('saves mutation report as artifact', () => {
      const result = generateGitlabWorkflow(makeConfig(['mutation']));
      expect(result).toContain('reports/mutation/');
    });
  });

  describe('audit job', () => {
    it('includes audit job when audit check enabled', () => {
      const result = generateGitlabWorkflow(makeConfig(['audit']));
      expect(result).toContain('audit:');
    });
  });

  describe('quality-gate needs', () => {
    it('has no needs when no checks enabled', () => {
      const result = generateGitlabWorkflow(makeConfig());
      expect(result).not.toContain('needs:');
    });

    it('lists all enabled checks as needs', () => {
      const result = generateGitlabWorkflow(makeConfig(['eslint', 'coverage', 'mutation']));
      expect(result).toContain('- lint');
      expect(result).toContain('- test');
      expect(result).toContain('- mutation');
    });
  });

  describe('package manager', () => {
    it('uses pnpm for pnpm projects', () => {
      const result = generateGitlabWorkflow(makeConfig([], { packageManager: 'pnpm' }));
      expect(result).toContain('pnpm');
    });

    it('uses yarn for yarn projects', () => {
      const result = generateGitlabWorkflow(makeConfig([], { packageManager: 'yarn' }));
      expect(result).toContain('yarn install');
    });
  });
});
