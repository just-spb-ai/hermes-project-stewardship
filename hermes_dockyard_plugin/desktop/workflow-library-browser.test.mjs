import {test} from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {fixtureBrowser} from './browser-harness.mjs';

// The switcher's three labels come from the module the panel itself imports
// (src/lib/panel-words.js - pure data, no imports, so a node test reads it
// directly). The Russian panel moved only the words: roles, hooks and wire
// values are unchanged (i18n(ru), 19/10/2026).
import { SWITCHER_WORDS } from './src/lib/panel-words.js'
const CONTEXT_LABEL = SWITCHER_WORDS.context
const FIND_LABEL = SWITCHER_WORDS.find
const PROJECTS_LABEL = SWITCHER_WORDS.list

// src/views/workflow-library.js imports React, so a Node test cannot import it:
// the words the library screen renders (the empty state, the row's actions, the
// scope tag) are read out of its own source instead of being spelled out again
// here - never out of the built bundle (i18n(ru), 19/10/2026).
const LIBRARY_SOURCE = readFileSync(new URL('./src/views/workflow-library.js', import.meta.url), 'utf8')
const libraryWord = (pattern, what) => {
  const found = pattern.exec(LIBRARY_SOURCE)
  assert.ok(found, `${what} was read from src/views/workflow-library.js`)
  return found[1]
}
const EMPTY_TITLE = libraryWord(/jsx\(EmptyState, \{ title: '([^']+)'/, 'the empty state title')
const ARCHIVE_BUTTON = libraryWord(/action: 'library-archive',[\s\S]*?children: '([^']+)'/, "the archive button's word")
const RESTORE_BUTTON = libraryWord(/action: 'library-restore',[\s\S]*?children: '([^']+)'/, "the restore button's word")
const DELETE_BUTTON = libraryWord(/action: 'library-delete',[\s\S]*?children: '([^']+)'/, "the delete button's word")
const GLOBAL_TAG = libraryWord(/label: row\.scope === 'global' \? '([^']+)'/, 'the global scope tag')

// test-support/project-scope.mjs is shared with other suites and still spells
// the switcher's English labels, so this file drives the switcher itself: the
// same roles, the same data-project-option hook, and the same wait that the
// chosen scope shows up on the trigger. '*' is the wire value for All projects.
async function pickProject(page, id) {
  await page.getByRole('button', { name: CONTEXT_LABEL, exact: true }).click()
  if (id !== '*') await page.getByRole('combobox', { name: FIND_LABEL }).fill(id)
  await page.locator(`[role="listbox"] [data-project-option="${id}"]`).click()
  await page.locator(`.dy-sw-trigger[data-scope="${id}"]`).waitFor()
}

// W3/W4 rendered journeys: the library screen and per-project enablement run
// through the real plugin bundle against the disposable phase4 host. The host's
// /workflow-library + enablement routes mirror the W2 API contract the plugin
// drives; nothing here invents workflow state.

test('W3 library: create global workflow, filter by scope, archive and restore', async()=>fixtureBrowser(async(page)=>{
 // Option A: Project > Workflows keeps a library entry point (Open library in
 // the screen's header since 07/10/2026) that lands on the top Workflows tab,
 // and the top tab opens the library directly.
 // Sahil 05/10: the app opens on All projects; pick the project first.
 await pickProject(page,'payments-relaunch');
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="workflows"]').click();
 await page.locator('[data-wfd-head] [data-action="open-workflow-library"]').waitFor();
 await page.locator('[data-wfd-head] [data-action="open-workflow-library"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 assert.equal(await page.locator('[data-tab="workflows"]').getAttribute('aria-selected'),'true');
 await page.locator('[data-tab="dashboard"]').click();
 await page.locator('[data-tab="workflows"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 // Empty state before any workflow exists.
 await page.getByRole('heading',{name:EMPTY_TITLE}).waitFor();
 // New workflow is the builder's dialog (Sahil 08/10/2026): where it lives first, then a way in.
 await page.locator('[data-action="library-create"]').click();
 await page.locator('[data-wfd-scope="global"]').click();
 await page.locator('[data-wfd-way="blank"]').click();
 await page.locator('[data-wfd-name]').fill('release-cadence');
 await page.locator('[data-wfd-first-step]').fill('Cut release');
 await page.locator('[data-action="wfd-create"]').click();
 const row=page.locator('[data-library-row="release-cadence"]');
 await row.waitFor();
 assert.equal(await row.getAttribute('data-library-scope'),'global');
 assert.match(await row.innerText(),new RegExp(GLOBAL_TAG));
 // Scope filter hides dedicated/global rows correctly.
 await page.locator('[data-action="library-scope-global"]').click();
 await row.waitFor();
 await page.locator('[data-action="library-scope-project"]').click();
 await page.getByRole('heading',{name:EMPTY_TITLE}).waitFor();
 await page.locator('[data-action="library-scope-all"]').click();
 await row.waitFor();
 // Search narrows to matching names only.
 await page.locator('[data-library-search]').fill('no-such-workflow');
 await page.getByRole('heading',{name:EMPTY_TITLE}).waitFor();
 await page.locator('[data-library-search]').fill('');
 await row.waitFor();
 // Archive then restore through the same row.
 await row.getByRole('button',{name:ARCHIVE_BUTTON}).click();
 await row.getByRole('button',{name:RESTORE_BUTTON}).waitFor();
 await row.getByRole('button',{name:RESTORE_BUTTON}).click();
 await row.getByRole('button',{name:ARCHIVE_BUTTON}).waitFor();
 // Delete removes the row for good.
 await row.getByRole('button',{name:DELETE_BUTTON}).click();
 await page.getByRole('heading',{name:EMPTY_TITLE}).waitFor();
}));

test('W4 toggle drives enablement: off refuses a run, on starts it, and errors surface', async()=>fixtureBrowser(async(page)=>{
 // Enablement is per project, so the library shows the toggle once a project
 // is picked (Sahil 05/10: every screen follows the switcher).
 await pickProject(page,'payments-relaunch');
 await page.locator('[data-tab="workflows"]').click();
 await page.locator('[data-workflow-library-screen]').waitFor();
 await page.locator('[data-action="library-create"]').click();
 await page.locator('[data-wfd-scope="global"]').click();
 await page.locator('[data-wfd-way="blank"]').click();
 await page.locator('[data-wfd-name]').fill('nightly-audit');
 await page.locator('[data-wfd-first-step]').fill('Audit the queue');
 await page.locator('[data-action="wfd-create"]').click();
 const row=page.locator('[data-library-row="nightly-audit"]');
 await row.waitFor();
 // Off by default (D-W1): the toggle reflects the persisted enablement and a
 // start is refused until the project turns it on. The refusal is stated in
 // the UI, never silently swallowed.
 const toggle=page.locator('[data-wf-enablement="global:nightly-audit"]');
 await toggle.waitFor();
 assert.equal(await toggle.getAttribute('aria-checked'),'false');
 const runStart=page.locator('[data-wf-run-start="global:nightly-audit"]');
 await runStart.click();
 await page.locator('[data-wf-run-refused="global:nightly-audit"]').waitFor();
 assert.match(await page.locator('[data-wf-run-refused="global:nightly-audit"]').innerText(),/refused|disabled|off/i);
 await toggle.click();
 await page.waitForFunction(() => document.querySelector('[data-wf-enablement="global:nightly-audit"]')?.getAttribute('aria-checked') === 'true');
 assert.equal(await toggle.getAttribute('aria-checked'),'true');
}));