import { describe, it, expect } from 'vitest';
import { generateCountLintScript } from '../../src/generators/count-lint-script.mjs';

describe('generateCountLintScript', () => {
  it('returns a string', () => {
    expect(typeof generateCountLintScript()).toBe('string');
  });

  it('starts with shebang', () => {
    expect(generateCountLintScript().startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('reads from stdin', () => {
    expect(generateCountLintScript()).toContain('process.stdin');
  });

  it('counts errorCount from ESLint output', () => {
    expect(generateCountLintScript()).toContain('errorCount');
  });

  it('counts warningCount from ESLint output', () => {
    expect(generateCountLintScript()).toContain('warningCount');
  });

  it('exits with code 1 on parse error', () => {
    expect(generateCountLintScript()).toContain('process.exit(1)');
  });

  it('returns the same content on repeated calls', () => {
    expect(generateCountLintScript()).toBe(generateCountLintScript());
  });
});
