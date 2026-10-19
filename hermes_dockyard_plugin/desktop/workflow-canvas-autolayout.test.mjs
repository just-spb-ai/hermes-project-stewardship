// W0 product defects against the shipped Desktop bundle and disposable backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './browser-harness.mjs';
import { createBlankWorkflow, openStep } from './test-support/workflow-create.mjs';
// The step panel's own labels, read from the module that publishes them
// (src/project/workflow-design/step-settings.js). That module is React-free,
// so the test imports it and reads the words instead of spelling the Russian
// out a second time (i18n(ru), 19/10/2026).
import { canvasDesignHooks } from './src/project/workflow-design/step-settings.js';

const BASE = process.env.STEWARD_DESKTOP_URL;
const STEP_PANEL = canvasDesignHooks({ draft: false, members: [], storedNode: (id) => ({ id, title: id }), settingsKey: (id) => ['p', 'w', id], onEditFrame: () => {} });
const STEP_NAME = STEP_PANEL.labels.title;
const SAVE_VERSION = STEP_PANEL.labels.save;

// The switcher's three labels come from the module the panel itself imports
// (src/lib/panel-words.js - pure data, no imports, so a node test reads it
// directly). The Russian panel moved only the words: roles, hooks and wire
// values are unchanged (i18n(ru), 19/10/2026).
import { SWITCHER_WORDS } from './src/lib/panel-words.js'
const CONTEXT_LABEL = SWITCHER_WORDS.context
const FIND_LABEL = SWITCHER_WORDS.find
const PROJECTS_LABEL = SWITCHER_WORDS.list

async function projectWorkflows(page) {
  await page.goto(BASE);
  await page.getByRole('button', { name: CONTEXT_LABEL, exact: true }).click();
  await page.getByRole('combobox', { name: FIND_LABEL }).fill('payments-relaunch');
  await page.getByRole('listbox', { name: PROJECTS_LABEL }).getByRole('option', { name: 'payments-relaunch', exact: true }).click();
  // Option A: project workflows live under Project > Workflows.
  await page.locator('[data-tab="project"]').click();
  await page.locator('[data-project-view="workflows"]').click();
  await page.locator('[data-executable-workflows="payments-relaunch"]').waitFor();
}

// New workflow -> Start blank (the old side form went with the builder, 07/10/2026).
const createWorkflow = (page, name) => createBlankWorkflow(page, name, 'Build release');

test('W0-P2: after auto-layout node editor saves a new version without detaching', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(8000);
    await projectWorkflows(page);
    const name = 'w0-edit-' + Date.now();
    await createWorkflow(page, name);
    await page.locator('[data-action="wf-add-gate"]').click();
    await page.locator(`[data-workflow-canvas="${name}"] [data-node-id="gate-2"]`).waitFor();
    await page.locator('[data-action="wf-validate"]').click();
    // Each run names itself (<workflow>-<time>); the old Run key box went with the side form.
    await page.locator('[data-action="start-workflow"]').last().click();
    await page.locator(`[data-workflow-live-run^="${name}-"]`).waitFor();
    await page.locator('[data-action="archive-workflow"]').click();
    await page.locator('[data-action="restore-workflow"]').waitFor();
    await page.locator('[data-action="restore-workflow"]').click();
    await page.locator('[data-action="archive-workflow"]').waitFor();
    await page.locator('[data-action="wf-auto-layout"]').click();
    await openStep(page, name, 'step-1');
    await page.getByLabel(STEP_NAME).fill('Edited via canvas');
    await page.getByRole('button', { name: SAVE_VERSION, exact: true }).click();
    // Definition versions live in a collapsed <details>; attached is the
    // correct DOM state, then expand before asserting the persisted title.
    await page.locator(`[data-workflow-definition-version]`).last().waitFor({ state: 'attached' });
    const definitions = page.locator(`[data-workflow-definitions="${name}"]`);
    await definitions.locator('summary').click();
    // Wait inside the versions panel: since 07/10/2026 an edit made on a run's
    // view switches the canvas to the plan, whose (hidden) list view also holds
    // the new title, so a page-wide last() match is no longer the panel.
    await definitions.getByText('Edited via canvas', { exact: false }).last().waitFor();
    assert.match(await definitions.innerText(), /Edited via canvas/);
    await page.locator('[data-action="wf-validate"]').click();
    assert.ok(await page.locator('[data-wf-validate-result]').isVisible());
  } finally { await browser.close(); }
});
