import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ANSI helpers
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

/**
 * Close the readline interface.
 */
export function close() {
  rl.close();
}

/**
 * Ask a yes/no question.
 *
 * @param {string} question
 * @param {boolean} [defaultYes=true]
 * @returns {Promise<boolean>}
 */
export async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? `${BOLD}Y${RESET}/n` : `y/${BOLD}N${RESET}`;
  const answer = await ask(`${CYAN}?${RESET} ${question} [${hint}]: `);
  const trimmed = answer.trim().toLowerCase();
  if (trimmed === '') return defaultYes;
  return trimmed === 'y' || trimmed === 'yes';
}

/**
 * Ask the user to pick one option from a numbered list.
 *
 * @param {string} question
 * @param {Array<{label: string, description?: string, value: *}>} choices
 * @returns {Promise<*>}
 */
export async function select(question, choices) {
  console.log(`\n${CYAN}?${RESET} ${BOLD}${question}${RESET}`);
  for (let i = 0; i < choices.length; i++) {
    const { label, description } = choices[i];
    const num = `${YELLOW}${i + 1}${RESET}`;
    const desc = description ? ` ${DIM}— ${description}${RESET}` : '';
    console.log(`  ${num}. ${label}${desc}`);
  }

  while (true) {
    const answer = await ask(`\n  Enter a number [1-${choices.length}]: `);
    const idx = parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < choices.length) {
      console.log(`  ${GREEN}✔${RESET} ${choices[idx].label}\n`);
      return choices[idx].value;
    }
    console.log(`  ${YELLOW}Please enter a number between 1 and ${choices.length}.${RESET}`);
  }
}

/**
 * Ask the user to pick multiple options from a list.
 *
 * Items with `available: false` are shown as disabled and cannot be selected.
 * Items with `default !== false` that are available start pre-selected.
 *
 * @param {string} question
 * @param {Array<{label: string, description?: string, value: *, default?: boolean, available?: boolean}>} choices
 * @returns {Promise<*[]>}
 */
export async function multiselect(question, choices) {
  // Build initial selection state
  const selected = choices.map((c) => {
    const available = c.available !== false;
    const defaultOn = c.default !== false;
    return available && defaultOn;
  });

  const renderList = () => {
    console.log(`\n${CYAN}?${RESET} ${BOLD}${question}${RESET}`);
    console.log(`  ${DIM}Enter numbers separated by commas to toggle, then press Enter to confirm.${RESET}\n`);
    for (let i = 0; i < choices.length; i++) {
      const c = choices[i];
      const available = c.available !== false;
      const icon = selected[i] ? `${GREEN}◉${RESET}` : '○';
      const num = `${YELLOW}${i + 1}${RESET}`;
      const label = available ? c.label : `${DIM}${c.label}${RESET}`;
      const desc = c.description
        ? available
          ? ` ${DIM}— ${c.description}${RESET}`
          : ` ${DIM}— ${c.description} (not available)${RESET}`
        : '';
      console.log(`  ${num}. ${icon} ${label}${desc}`);
    }
  };

  while (true) {
    renderList();
    const answer = await ask('\n  Toggle (e.g. 1,3) or Enter to confirm: ');
    const trimmed = answer.trim();

    if (trimmed === '') {
      // Confirm selection
      const values = choices
        .filter((_, i) => selected[i])
        .map((c) => c.value);
      console.log(
        `  ${GREEN}✔${RESET} Selected: ${values.length > 0 ? values.join(', ') : '(none)'}\n`
      );
      return values;
    }

    // Parse toggled indices
    const tokens = trimmed.split(',').map((t) => t.trim());
    for (const token of tokens) {
      const idx = parseInt(token, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= choices.length) {
        console.log(`  ${YELLOW}Invalid choice: ${token}${RESET}`);
        continue;
      }
      const available = choices[idx].available !== false;
      if (!available) {
        console.log(`  ${YELLOW}"${choices[idx].label}" is not available for this project.${RESET}`);
        continue;
      }
      selected[idx] = !selected[idx];
    }
  }
}
