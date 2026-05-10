import { describe, it, expect } from 'vitest';
import { generateGateScript } from '../../src/generators/gate-script.mjs';

function makeConfig(checks = [], overrides = {}) {
  return {
    checks: new Set(checks),
    coverageReportPath: 'reports/coverage/coverage-summary.json',
    packageManager: 'npm',
    testRunner: 'vitest',
    lintExtensions: 'ts,tsx',
    hasSrcDir: true,
    srcDirName: 'src',
    projectName: 'test-project',
    isTypeScript: false,
    ...overrides,
  };
}

describe('generateGateScript', () => {
  it('returns a string starting with shebang', () => {
    const result = generateGateScript(makeConfig());
    expect(typeof result).toBe('string');
    expect(result.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('embeds project name', () => {
    const result = generateGateScript(makeConfig([], { projectName: 'my-app' }));
    expect(result).toContain('my-app');
  });

  describe('eslint check', () => {
    it('includes eslint metrics when enabled', () => {
      const result = generateGateScript(makeConfig(['eslint']));
      expect(result).toContain('eslint_errors');
      expect(result).toContain('eslint_warnings');
    });

    it('excludes eslint metrics when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('eslint_errors');
    });
  });

  describe('coverage check', () => {
    it('includes coverage metrics when enabled', () => {
      const result = generateGateScript(makeConfig(['coverage']));
      expect(result).toContain('coverage_lines');
      expect(result).toContain('coverage_branches');
      expect(result).toContain('coverage_functions');
    });

    it('uses the provided coverage report path', () => {
      const result = generateGateScript(makeConfig(['coverage'], { coverageReportPath: 'custom/path.json' }));
      expect(result).toContain('custom/path.json');
    });

    it('excludes coverage metrics when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('coverage_lines');
    });
  });

  describe('duplication check', () => {
    it('includes duplication metric when enabled', () => {
      const result = generateGateScript(makeConfig(['duplication']));
      expect(result).toContain('duplicate_percent');
      expect(result).toContain('jscpd-report.json');
    });

    it('excludes duplication metric when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('duplicate_percent');
    });
  });

  describe('audit check', () => {
    it('includes audit metrics when enabled', () => {
      const result = generateGateScript(makeConfig(['audit']));
      expect(result).toContain('audit_critical');
      expect(result).toContain('audit_high');
    });

    it('excludes audit metrics when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('audit_critical');
    });
  });

  describe('mutation check', () => {
    it('includes mutation_score metric when enabled', () => {
      const result = generateGateScript(makeConfig(['mutation']));
      expect(result).toContain('mutation_score');
    });

    it('reads from reports/mutation/mutation.json', () => {
      const result = generateGateScript(makeConfig(['mutation']));
      expect(result).toContain('reports/mutation/mutation.json');
    });

    it('calculates kill rate from mutant statuses', () => {
      const result = generateGateScript(makeConfig(['mutation']));
      expect(result).toContain('Killed');
      expect(result).toContain('Timeout');
    });

    it('excludes mutation code when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('mutation_score');
      expect(result).not.toContain('mutation.json');
    });
  });

  describe('complexity check', () => {
    it('includes complexity_violations metric when enabled', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain('complexity_violations');
    });

    it('includes long_function_violations metric when enabled', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain('long_function_violations');
    });

    it('reads from reports/complexity.json', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain('reports/complexity.json');
    });

    it('counts violations by ruleId complexity', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain("msg.ruleId === 'complexity'");
    });

    it('counts violations by ruleId max-lines-per-function', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain("msg.ruleId === 'max-lines-per-function'");
    });

    it('runs complexity scan in baseline when enabled', () => {
      const result = generateGateScript(makeConfig(['complexity']));
      expect(result).toContain('complexity scan');
      expect(result).toContain('complexity.json');
    });

    it('excludes complexity code when disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('complexity_violations');
      expect(result).not.toContain('complexity.json');
    });
  });

  describe('baseline generation', () => {
    it('includes commit field in generated baseline', () => {
      const result = generateGateScript(makeConfig());
      expect(result).toContain('commit:');
      expect(result).toContain('git rev-parse --short HEAD');
    });

    it('runs stryker in baseline when mutation check enabled', () => {
      const result = generateGateScript(makeConfig(['mutation']));
      expect(result).toContain('stryker run');
    });

    it('does not run stryker in baseline when mutation check disabled', () => {
      const result = generateGateScript(makeConfig());
      expect(result).not.toContain('stryker run');
    });
  });

  it('generates valid output with all checks enabled', () => {
    const result = generateGateScript(
      makeConfig(['eslint', 'coverage', 'duplication', 'audit', 'mutation', 'complexity'])
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(2000);
  });
});
