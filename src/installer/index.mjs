import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from './detector.mjs';
import { confirm, select, multiselect, close } from './prompts.mjs';
import { generateGateScript } from '../generators/gate-script.mjs';
import { generateGithubWorkflow } from '../generators/workflow-github.mjs';
import { generateGitlabWorkflow } from '../generators/workflow-gitlab.mjs';
import { injectPackageScripts } from '../generators/pkg-scripts.mjs';
import { generateCountLintScript } from '../generators/count-lint-script.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ANSI
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function readVersion() {
  try {
    // Walk up from src/installer/ to find package.json
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function parseArgs(argv) {
  const args = {
    command: 'init',
    path: process.cwd(),
    yes: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === 'init') args.command = 'init';
    else if (arg === 'help' || arg === '--help' || arg === '-h') args.command = 'help';
    else if (arg === '--path' || arg === '-p') {
      args.path = resolve(argv[++i] ?? process.cwd());
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function printBanner(version) {
  console.log('');
  console.log(`${BOLD}${CYAN}  ╔═══════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}  ║       quality-ratchet  v${version.padEnd(13)}║${RESET}`);
  console.log(`${BOLD}${CYAN}  ║  Smart quality gate with ratchet  🔒  ║${RESET}`);
  console.log(`${BOLD}${CYAN}  ╚═══════════════════════════════════════╝${RESET}`);
  console.log('');
}

function printHelp() {
  console.log(`${BOLD}quality-ratchet${RESET} — Smart quality gate installer with ratchet mechanism\n`);
  console.log(`${BOLD}Usage:${RESET}`);
  console.log(`  npx quality-ratchet [init] [options]\n`);
  console.log(`${BOLD}Commands:${RESET}`);
  console.log(`  init          Run the interactive installer (default)`);
  console.log(`  help          Show this help message\n`);
  console.log(`${BOLD}Options:${RESET}`);
  console.log(`  --path <dir>  Target project directory (default: current directory)`);
  console.log(`  --yes, -y     Accept all defaults without prompting`);
  console.log(`  --dry-run     Show what would be generated without writing files\n`);
  console.log(`${BOLD}Examples:${RESET}`);
  console.log(`  npx quality-ratchet`);
  console.log(`  npx quality-ratchet init --path ./my-project`);
  console.log(`  npx quality-ratchet --yes --dry-run\n`);
}

function printStack(project) {
  console.log(`${BOLD}  Detected project stack:${RESET}`);
  const pm = project.packageManager;
  console.log(`    📦 Package manager : ${CYAN}${pm}${RESET}`);
  console.log(`    🔷 TypeScript      : ${project.isTypeScript ? `${GREEN}yes${RESET}` : `${DIM}no${RESET}`}`);
  console.log(`    🧪 Test runner     : ${project.testRunner ? `${CYAN}${project.testRunner}${RESET}` : `${DIM}none detected${RESET}`}`);
  console.log(`    📊 Coverage        : ${project.coverageProvider ? `${CYAN}${project.coverageProvider}${RESET}` : `${DIM}none detected${RESET}`}`);
  console.log(`    🔍 ESLint          : ${project.hasEslint ? `${GREEN}yes${RESET}` : `${DIM}no${RESET}`}`);
  console.log(`    🧬 Stryker         : ${project.hasStryker ? `${GREEN}yes${RESET}` : `${DIM}no${RESET}`}`);
  console.log(`    📁 Source dir      : ${project.hasSrcDir ? `${CYAN}${project.hasSrcDirName}/${RESET}` : `${DIM}not found${RESET}`}`);
  if (project.ciPlatforms.length > 0) {
    console.log(`    ⚙️  CI detected     : ${CYAN}${project.ciPlatforms.join(', ')}${RESET}`);
  }
  console.log('');
}

function ensureDir(dirPath, dryRun) {
  if (!dryRun) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content, dryRun) {
  if (dryRun) {
    console.log(`  ${DIM}[dry-run] Would write: ${filePath}${RESET}`);
    console.log(`  ${DIM}--- content preview (first 5 lines) ---${RESET}`);
    const lines = content.split('\n').slice(0, 5);
    lines.forEach((l) => console.log(`  ${DIM}${l}${RESET}`));
    if (content.split('\n').length > 5) console.log(`  ${DIM}... (${content.split('\n').length} lines total)${RESET}`);
    console.log('');
  } else {
    writeFileSync(filePath, content, 'utf8');
    console.log(`  ${GREEN}✔${RESET} ${filePath}`);
  }
}

function printNextSteps(project, selectedChecks, selectedPlatforms, dryRun) {
  console.log(`\n${BOLD}${GREEN}  Done!${RESET} Next steps:\n`);

  if (dryRun) {
    console.log(`  ${YELLOW}(dry-run mode — no files were written)${RESET}\n`);
  }

  if (!project.hasJscpd && selectedChecks.includes('duplication')) {
    const pm = project.packageManager;
    const installCmd =
      pm === 'pnpm' ? 'pnpm add -D jscpd' :
      pm === 'yarn' ? 'yarn add -D jscpd' :
      pm === 'bun'  ? 'bun add -d jscpd' :
      'npm install -D jscpd';
    console.log(`  → Install jscpd (needed for duplication check):`);
    console.log(`     ${CYAN}${installCmd}${RESET}\n`);
  }

  if (!project.hasStryker && selectedChecks.includes('mutation')) {
    const pm = project.packageManager;
    const installCmd =
      pm === 'pnpm' ? 'pnpm add -D @stryker-mutator/core' :
      pm === 'yarn' ? 'yarn add -D @stryker-mutator/core' :
      pm === 'bun'  ? 'bun add -d @stryker-mutator/core' :
      'npm install -D @stryker-mutator/core';
    console.log(`  → Install Stryker (needed for mutation testing):`);
    console.log(`     ${CYAN}${installCmd}${RESET}`);
    console.log(`     ${DIM}Then configure stryker.config.mjs for your project.${RESET}\n`);
  }

  console.log(`  ${BOLD}Generate your initial baseline:${RESET}`);
  const pm = project.packageManager;
  const runCmd = pm === 'npm' ? 'npm run' : pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'bun run';
  console.log(`     ${CYAN}${runCmd} quality:baseline${RESET}`);
  console.log(`     ${DIM}# Then commit the generated baseline.json${RESET}\n`);

  console.log(`  ${BOLD}Run quality gate locally:${RESET}`);
  console.log(`     ${CYAN}${runCmd} quality:gate:local${RESET}\n`);

  if (selectedPlatforms.length > 0) {
    console.log(`  ${BOLD}CI is ready!${RESET} Push a PR to see the quality gate in action.\n`);
  }

  console.log(`  ${DIM}Tip: commit baseline.json to track quality improvements over time.${RESET}\n`);
}

/**
 * Main installer entry point.
 *
 * @param {string[]} args - CLI arguments (process.argv.slice(2))
 */
export async function run(args) {
  const opts = parseArgs(args);
  const version = readVersion();

  if (opts.command === 'help') {
    printBanner(version);
    printHelp();
    return;
  }

  printBanner(version);

  if (opts.dryRun) {
    console.log(`  ${YELLOW}⚠  dry-run mode — no files will be written${RESET}\n`);
  }

  // 1. Detect project
  console.log(`${BOLD}  Analysing project at:${RESET} ${CYAN}${opts.path}${RESET}\n`);
  const project = detectProject(opts.path);

  if (!project.hasPackageJson) {
    console.log(`  ${RED}✘${RESET} No package.json found at ${opts.path}`);
    console.log(`  ${DIM}quality-ratchet only supports JavaScript/TypeScript projects.${RESET}\n`);
    close();
    return;
  }

  // 2. Show stack
  printStack(project);

  // 3. CI platform selection
  let selectedPlatforms;
  const ciChoices = [
    { label: 'GitHub Actions', value: 'github' },
    { label: 'GitLab CI', value: 'gitlab' },
    { label: 'Both', value: 'both' },
    { label: 'None (local script only)', value: 'none' },
  ];

  if (opts.yes) {
    // Default: generate for detected platforms, or GitHub if none detected
    if (project.ciPlatforms.length > 0) {
      selectedPlatforms = [...project.ciPlatforms];
    } else {
      selectedPlatforms = ['github'];
    }
  } else {
    let defaultChoice;
    if (project.ciPlatforms.includes('github') && project.ciPlatforms.includes('gitlab')) {
      defaultChoice = 'both';
    } else if (project.ciPlatforms.includes('github')) {
      defaultChoice = 'github';
    } else if (project.ciPlatforms.includes('gitlab')) {
      defaultChoice = 'gitlab';
    } else {
      defaultChoice = 'github';
    }

    // Find the index for default
    const defaultIdx = ciChoices.findIndex((c) => c.value === defaultChoice);
    const ciChoicesWithDefault = ciChoices.map((c, i) => ({
      ...c,
      label: i === defaultIdx ? `${c.label} ${DIM}(recommended)${RESET}` : c.label,
    }));

    const ciAnswer = await select('Which CI platform(s) should the workflow be generated for?', ciChoicesWithDefault);
    if (ciAnswer === 'both') selectedPlatforms = ['github', 'gitlab'];
    else if (ciAnswer === 'none') selectedPlatforms = [];
    else selectedPlatforms = [ciAnswer];
  }

  const hasGithub = selectedPlatforms.includes('github');

  // 4. Checks multiselect
  const checksChoices = [
    {
      label: 'ESLint errors & warnings',
      description: 'Track lint quality over time',
      value: 'eslint',
      available: project.hasEslint,
      default: project.hasEslint,
    },
    {
      label: 'Coverage (lines, branches, functions)',
      description: 'Prevent coverage regressions',
      value: 'coverage',
      available: project.coverageProvider !== null,
      default: project.coverageProvider !== null,
    },
    {
      label: 'Code duplication (jscpd)',
      description: 'Detect copy-paste code increases',
      value: 'duplication',
      available: true,
      default: true,
    },
    {
      label: 'npm audit (critical & high vulnerabilities)',
      description: 'Block merges with critical security issues',
      value: 'audit',
      available: project.packageManager !== 'bun',
      default: project.packageManager !== 'bun',
    },
    {
      label: 'Mutation testing (Stryker)',
      description: 'Track mutation score over time',
      value: 'mutation',
      available: project.hasStryker,
      default: project.hasStryker,
    },
    {
      label: 'PR comment with quality report',
      description: 'Post a Markdown summary on GitHub PRs',
      value: 'pr-comment',
      available: hasGithub,
      default: hasGithub,
    },
  ];

  let selectedChecks;
  if (opts.yes) {
    selectedChecks = checksChoices.filter((c) => c.available && c.default !== false).map((c) => c.value);
  } else {
    selectedChecks = await multiselect('Which checks should the quality gate include?', checksChoices);
  }

  const checksSet = new Set(selectedChecks);
  const hasPrComment = checksSet.has('pr-comment');
  // Remove pr-comment from the checks set passed to generators (it's a CI feature, not a gate metric)
  checksSet.delete('pr-comment');

  // 5. Confirm before writing
  if (!opts.yes) {
    console.log(`\n${BOLD}  Summary:${RESET}`);
    console.log(`    • Checks    : ${[...checksSet].join(', ') || '(none)'}`);
    console.log(`    • CI        : ${selectedPlatforms.join(', ') || '(none)'}`);
    console.log(`    • PR comment: ${hasPrComment ? 'yes' : 'no'}`);
    console.log('');

    const ok = await confirm('Generate and write files now?', true);
    if (!ok) {
      console.log(`\n  ${YELLOW}Aborted. No files were written.${RESET}\n`);
      close();
      return;
    }
  }

  console.log(`\n${BOLD}  Generating files...${RESET}\n`);

  const srcDirName = project.hasSrcDirName ?? 'src';
  const gateConfig = {
    checks: checksSet,
    coverageReportPath: project.coverageReportPath,
    packageManager: project.packageManager,
    testRunner: project.testRunner,
    lintExtensions: project.lintExtensions,
    hasSrcDir: project.hasSrcDir,
    srcDirName,
    projectName: project.name ?? 'project',
    isTypeScript: project.isTypeScript,
  };

  // 6. Generate gate script
  const gateScriptContent = generateGateScript(gateConfig);
  ensureDir(join(opts.path, 'scripts'), opts.dryRun);
  writeFile(join(opts.path, 'scripts', 'quality-gate.mjs'), gateScriptContent, opts.dryRun);

  // Generate count-lint helper (always — useful companion for ESLint)
  const countLintContent = generateCountLintScript();
  writeFile(join(opts.path, 'scripts', 'count-lint.mjs'), countLintContent, opts.dryRun);

  // Ensure reports dir exists as a placeholder
  ensureDir(join(opts.path, 'reports'), opts.dryRun);

  // 7. Generate CI workflows
  if (hasGithub) {
    const workflowConfig = {
      checks: checksSet,
      packageManager: project.packageManager,
      testRunner: project.testRunner,
      testCoverageScript: project.testCoverageScript,
      lintScript: project.lintScript,
      lintExtensions: project.lintExtensions,
      hasPrComment,
      mainBranches: ['main', 'master'],
    };
    const githubWorkflow = generateGithubWorkflow(workflowConfig);
    ensureDir(join(opts.path, '.github', 'workflows'), opts.dryRun);
    writeFile(join(opts.path, '.github', 'workflows', 'quality-gate.yml'), githubWorkflow, opts.dryRun);
  }

  if (selectedPlatforms.includes('gitlab')) {
    const gitlabConfig = {
      checks: checksSet,
      packageManager: project.packageManager,
      testRunner: project.testRunner,
      testCoverageScript: project.testCoverageScript,
      lintScript: project.lintScript,
    };
    const gitlabWorkflow = generateGitlabWorkflow(gitlabConfig);
    writeFile(join(opts.path, '.gitlab-ci.yml'), gitlabWorkflow, opts.dryRun);
  }

  // 8. Inject package.json scripts
  const scriptResult = await injectPackageScripts(
    opts.path,
    [...checksSet],
    project.packageManager,
    opts.dryRun,
    srcDirName,
  );

  if (opts.dryRun) {
    console.log(`\n  ${DIM}[dry-run] Scripts that would be added to package.json:${RESET}`);
    for (const [k, v] of Object.entries(scriptResult.packageJson?.scripts ?? {})) {
      if (scriptResult.added.includes(k) || scriptResult.updated.includes(k)) {
        const tag = scriptResult.added.includes(k) ? `${GREEN}[add]${RESET}` : `${YELLOW}[update]${RESET}`;
        console.log(`    ${tag} "${k}": "${v}"`);
      }
    }
  } else {
    if (scriptResult.added.length > 0) {
      console.log(`  ${GREEN}✔${RESET} package.json scripts added: ${scriptResult.added.join(', ')}`);
    }
    if (scriptResult.updated.length > 0) {
      console.log(`  ${YELLOW}~${RESET} package.json scripts updated: ${scriptResult.updated.join(', ')}`);
    }
  }

  // 9. Dependency hints
  if (checksSet.has('duplication') && !project.hasJscpd && !opts.dryRun) {
    console.log(`\n  ${YELLOW}⚠${RESET}  jscpd not found in devDependencies.`);
    console.log(`  ${DIM}You'll need to install it manually (see next steps below).${RESET}`);
  }
  if (checksSet.has('mutation') && !project.hasStryker && !opts.dryRun) {
    console.log(`\n  ${YELLOW}⚠${RESET}  Stryker not found in devDependencies.`);
    console.log(`  ${DIM}You'll need to install and configure it manually (see next steps below).${RESET}`);
  }

  close();
  printNextSteps(project, selectedChecks, selectedPlatforms, opts.dryRun);
}
