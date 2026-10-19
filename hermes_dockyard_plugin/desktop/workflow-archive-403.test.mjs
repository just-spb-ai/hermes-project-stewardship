// W0 product defects against the shipped Desktop bundle and disposable backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './browser-harness.mjs';
import { createBlankWorkflow } from './test-support/workflow-create.mjs';

const BASE = process.env.STEWARD_DESKTOP_URL;

// The switcher's three labels come from the module the panel itself imports
// (src/lib/panel-words.js - pure data, no imports, so a node test reads it
// directly). The Russian panel moved only the words: roles, hooks and wire
// values are unchanged (i18n(ru), 19/10/2026).
import { SWITCHER_WORDS } from './src/lib/panel-words.js'
// The 403's own words: runtime/context.js maps the host's stringified detail
// onto this message, keeping the wire capability (project_archive) verbatim.
// A node test cannot load that module (React), so it reads it from source.
import { escape, one } from './test-support/src-words.mjs'
const ARCHIVE_403 = one('src/runtime/context.js', /\? '([^']*project_archive[^']*)'/)
const CONTEXT_LABEL = SWITCHER_WORDS.context
const FIND_LABEL = SWITCHER_WORDS.find
const PROJECTS_LABEL = SWITCHER_WORDS.list

async function projectWorkflows(page) {
  await page.goto(BASE);
  // Wait for the switcher to be on screen before driving it: the app's first
  // paint can still be settling when the page's load event fires.
  const trigger = page.getByRole('button', { name: CONTEXT_LABEL, exact: true });
  await trigger.waitFor();
  await trigger.click();
  await page.getByRole('combobox', { name: FIND_LABEL }).fill('payments-relaunch');
  await page.getByRole('listbox', { name: PROJECTS_LABEL }).getByRole('option', { name: 'payments-relaunch', exact: true }).click();
  // Option A: project workflows live under Project > Workflows.
  await page.locator('[data-tab="project"]').click();
  await page.locator('[data-project-view="workflows"]').click();
  await page.locator('[data-executable-workflows="payments-relaunch"]').waitFor();
}

// New workflow -> Start blank (the old side form went with the builder, 07/10/2026).
const createWorkflow = (page, name) => createBlankWorkflow(page, name, 'Build release');

test('W0-P1: 403 on archive shows intelligible permission error and keeps action retryable', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await projectWorkflows(page);
    const name = 'w0-403-' + Date.now();
    await createWorkflow(page, name);
    // Reproduce the exact structured-detail 403 shape that W0 captured. The
    // browser bridge stringifies an object detail as "403: [object Object]".
    await page.route(`**/api/plugins/hermes-project-stewardship/projects/payments-relaunch/workflows/${name}/archive`, route =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: { required_capability: 'project_archive' } }) }));
    await page.locator('[data-action="archive-workflow"]').click();
    const alert = page.locator('[data-executable-workflows] [role="alert"]');
    await alert.waitFor();
    const text = await alert.innerText();
    assert.match(text, new RegExp(escape(ARCHIVE_403)));
    assert.match(text, /project_archive/);
    assert.doesNotMatch(text, /\[object Object\]/);
    assert.equal(await page.locator('[data-action="archive-workflow"]').isEnabled(), true);
  } finally { await browser.close(); }
});
