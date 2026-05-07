# quality-ratchet

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**quality-ratchet** is a zero-dependency CLI that installs a smart quality gate with a *ratchet mechanism* into any JavaScript or TypeScript project. It detects your stack automatically, presents the viable options, and generates the necessary files: a standalone gate script, a CI workflow, and npm scripts — all tailored to your project.

---

## How the Ratchet Works

A ratchet only moves in one direction. The quality gate works the same way:

1. **Baseline** — You generate a `baseline.json` that records the current metrics of your project (coverage percentage, lint error count, duplication rate, vulnerability count).
2. **Every PR/push** — The gate compares current metrics against the baseline.
3. **Regression = blocked** — If a metric got worse (e.g. coverage dropped, more lint errors), the CI job fails and the PR cannot be merged.
4. **Improvement = recorded** — If metrics improved, the gate reports it. You run `quality:baseline` to advance the ratchet to the new, better state.

The key insight: **you can never silently regress**. Every merge either holds the line or improves it.

---

## Quick Start

```bash
npx quality-ratchet init
```

Or target a specific directory:

```bash
npx quality-ratchet init --path ./my-project
```

Accept all defaults without interactive prompts:

```bash
npx quality-ratchet --yes
```

Preview what would be generated without writing any files:

```bash
npx quality-ratchet --dry-run
```

---

## Supported Stack

| Category       | Supported                                                  |
|----------------|------------------------------------------------------------|
| Language       | JavaScript, TypeScript                                     |
| Package manager| npm, pnpm, yarn, bun                                       |
| Test runner    | Vitest, Jest, Mocha                                        |
| Coverage       | @vitest/coverage-v8, @vitest/coverage-istanbul, jest       |
| Linter         | ESLint (any config format)                                 |
| CI platform    | GitHub Actions, GitLab CI                                  |

---

## Available Checks

| Check         | What it tracks                              | Blocking?                    |
|---------------|---------------------------------------------|------------------------------|
| `eslint`      | Error and warning count                     | Warn only (non-blocking)     |
| `coverage`    | Lines, branches, functions percentage       | Yes — drop blocks the PR     |
| `duplication` | Code duplication percentage (via jscpd)     | Yes — increase blocks the PR |
| `audit`       | Critical and high npm vulnerabilities       | Critical: zero-tolerance     |
| `pr-comment`  | Posts a Markdown report as a PR comment     | N/A (GitHub only)            |

---

## Generated Files

After running `quality-ratchet init`, the following files are created or updated in your project:

```
your-project/
├── scripts/
│   └── quality-gate.mjs          # Standalone gate script
├── .github/
│   └── workflows/
│       └── quality-gate.yml      # GitHub Actions workflow (if selected)
├── .gitlab-ci.yml                # GitLab CI config (if selected)
└── package.json                  # Scripts injected: quality:gate, quality:baseline, ...
```

### Injected npm scripts

| Script                  | What it does                                      |
|-------------------------|---------------------------------------------------|
| `quality:gate`          | Runs the gate in CI mode (Markdown output)        |
| `quality:gate:local`    | Runs the gate with human-readable terminal output |
| `quality:baseline`      | Runs all tools and saves a new baseline.json      |
| `duplication`           | Runs jscpd and saves report (if selected)         |

---

## Using the Baseline

### 1. Generate the initial baseline

After installation, run the tools once to create your starting point:

```bash
npm run quality:baseline
# or: pnpm quality:baseline / yarn quality:baseline / bun run quality:baseline
```

This runs ESLint, your test suite with coverage, jscpd, and/or npm audit — then saves all metric values to `baseline.json`.

### 2. Commit the baseline

```bash
git add baseline.json
git commit -m "chore: add quality gate baseline"
```

The baseline is tracked in version control so every branch has the same reference point.

### 3. Advance the ratchet when you improve

After a PR that genuinely improved metrics (e.g. added tests, fixed lint errors), update the baseline:

```bash
npm run quality:baseline
git add baseline.json
git commit -m "chore: advance quality baseline after coverage improvements"
```

---

## Running Locally

```bash
npm run quality:gate:local
```

Example output:

```
Quality Gate — my-project

Improvements:
  ✔ Coverage lines %: 84.2 %  (was 80.1 %  +4.10 ↑)

Unchanged:
  ─ ESLint errors: 0 errors
  ─ Duplication %: 3.2 %

Quality gate PASSED.
```

---

## How it Looks in CI (PR Comment)

When running on GitHub Actions with the `pr-comment` check enabled, the gate posts a sticky comment on every PR:

```
## ✅ Quality Gate PASSED

**Project:** `my-project`
**Generated:** 2026-05-07T10:00:00.000Z

### Metrics

| Metric              | Current  | Baseline | Delta   | Status |
|---------------------|----------|----------|---------|--------|
| ESLint errors       | 0 errors | 0 errors | +0.00 → | ➡️     |
| Coverage lines %    | 84.2 %   | 80.1 %   | +4.10 ↑ | ✅     |
| Coverage branches % | 78.5 %   | 78.5 %   | +0.00 → | ➡️     |
| Duplication %       | 3.2 %    | 3.5 %    | -0.30 ↓ | ✅     |

### ✅ Improvements Detected

- **Coverage lines %**: 84.2 % ↑ (was 80.1 %)
- **Duplication %**: 3.2 % (was 3.5 %)

> Run `npm run quality:baseline` to update the baseline with these improvements.

---
*Generated by [quality-ratchet](https://github.com/rafaelvieiras/quality-ratchet)*
```

When a regression is detected:

```
## ❌ Quality Gate FAILED

### ❌ Blocking Regressions

- **Coverage lines %**: 72.3 % ← was 80.1 %

> Fix these regressions before merging, then run `npm run quality:baseline` if the new values are intentional.
```

---

## Zero Dependencies

`quality-ratchet` uses only Node.js built-ins (`fs`, `path`, `readline`, `child_process`). The **generated** gate script is also standalone — it does not import anything from `quality-ratchet` at runtime.

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Make your changes and ensure the CLI still works: `node bin/quality-ratchet.mjs --dry-run`
4. Commit your changes: `git commit -m "feat: add my feature"`
5. Open a pull request

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/rafaelvieiras/quality-ratchet/issues).

---

## License

MIT — see [LICENSE](./LICENSE) for details.
