/**
 * HPS Phase 4 rendered-browser acceptance.
 *
 * Boots the disposable phase4 host with the REAL candidate bundle (esbuild
 * from desktop/plugin.js) and drives the Desktop through rendered Chromium
 * journeys:
 *   1. objectives (on the Vision screen since design round f): create, edit,
 *      Evaluate now (selected objective only), archive, evidence read-back;
 *   2. reports: generate, open, Download Markdown with byte equality;
 *   3. saved views: save, recall (filters + layout), overwrite confirm,
 *      delete confirm, reload persistence, project isolation.
 *
 * Requires: chromium via the dashboard node_modules playwright.
 * Run: node phase4-rendered-browser.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// The switcher's three labels come from the module the panel itself imports
// (src/lib/panel-words.js - pure data, no imports, so a node test reads it
// directly). The Russian panel moved only the words: roles, hooks and wire
// values are unchanged (i18n(ru), 19/10/2026).
import { SWITCHER_WORDS } from './src/lib/panel-words.js'
const CONTEXT_LABEL = SWITCHER_WORDS.context
const FIND_LABEL = SWITCHER_WORDS.find
const PROJECTS_LABEL = SWITCHER_WORDS.list

// ---- the panel's words (i18n(ru), 19/10/2026) -------------------------------
// Only the visible strings moved: roles, data-* hooks and wire values did not.
const sourceOf = (file) => fs.readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), 'utf8')
const oneIn = (file, pattern, what) => {
  const found = pattern.exec(sourceOf(file))
  assert.ok(found, `${what} is published in ${file}`)
  return found[1]
}
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// A line a module builds: the literal parts are kept, each ${...} hole is a
// value the test knows, or a wildcard when the test passes null.
const sentence = (template, ...values) => new RegExp(template.split(/\$\{[^}]*\}/)
  .map((part, index) => escapeRegex(part) + (index < values.length ? (values[index] === null ? '[\\s\\S]*' : escapeRegex(String(values[index]))) : ''))
  .join(''))
// The outcome words and the board's own tab name are published by React-free
// modules, so the test imports them.
import { ALL_WORK, stageKeyOf, stageLabel } from './src/kanban/model.js'
import { OUTCOME_LABEL } from './src/lib/plan-vocab.js'
// The evaluation note, the archived row's label and the status a board filter
// shows: the modules that render them import React, so their own source is read.
const MEASURED_NOTE = (value) => sentence(oneIn('src/project/plan/plan-drawer.js', /result\.measured != null \? `([^`]+)` : ''/, 'the measured value'), value)
const ARCHIVED_LABEL = oneIn('src/project/plan/plan-data.js', /if \(item\.archived\) return \{ tone: 'neutral', label: '([^']+)' \}/, 'the archived label')
const STATUS_FILTER = stageLabel(stageKeyOf({ status: 'in_progress' }))
// The objective's evidence row says how many results passed; that word is
// published by the drawer the test cannot import.
const PASS_RATE_WORD = oneIn('src/project/plan/plan-drawer.js', /item\.passRate !== null \? `, ([^`]+)\$\{Math\.round/, 'the pass-rate word')

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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DASHBOARD = path.join(REPO, 'hermes_dockyard_plugin', 'dashboard');
const require = createRequire(path.join(DASHBOARD, 'package.json'));
const { chromium } = require('playwright');

const PORT = Number(process.env.PHASE4_PORT || 19501);
const BASE = `http://127.0.0.1:${PORT}`;

function buildBundle() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hps-p4-'));
  const sdk = path.join(outDir, 'sdk.js');
  const entry = path.join(outDir, 'entry.jsx');
  const bundle = path.join(outDir, 'bundle.js');
  fs.writeFileSync(sdk, 'export const host = { navigate() {} };\n');
  fs.writeFileSync(entry, [
    `import plugin from ${JSON.stringify(path.join(REPO, 'hermes_dockyard_plugin', 'desktop', 'plugin.js'))};`,
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    'const ctx = {',
    '  rest: async (p, init = {}) => {',
    "    const r = await fetch('/api' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json' },",
    "      body: init.method && init.method !== 'GET' ? JSON.stringify(init.body) : undefined });",
    "    if (!r.ok) { let detail = ''; try { detail = (await r.json())?.detail ?? ''; } catch {} throw Error(`${r.status}: ${detail}`); }",
    '    return r.json();',
    '  },',
    '  os: { writeClipboard: async () => true },',
    '  registerMany(xs) { this.items = xs },',
    '};',
    'plugin.register(ctx);',
    "const page = ctx.items.find((x) => x.area === 'routes');",
    "createRoot(document.getElementById('root')).render(page.render());",
  ].join('\n'));
  const nm = path.join(DASHBOARD, 'node_modules');
  execFileSync(process.execPath, [path.join(nm, 'esbuild', 'bin', 'esbuild'), 
    entry, '--bundle', '--format=esm', `--outfile=${bundle}`, '--jsx=automatic',
    `--alias:@hermes/plugin-sdk=${sdk}`,
    `--alias:react=${path.join(nm, 'react')}`,
    `--alias:react/jsx-runtime=${path.join(nm, 'react/jsx-runtime.js')}`,
    `--alias:react-dom/client=${path.join(nm, 'react-dom', 'client.js')}`,
    '--log-level=error',
  ], { cwd: DASHBOARD });
  return { outDir, bundle };
}

async function waitForHost() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch { /* not ready yet */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('phase4 host did not become ready');
}

async function apiCalls() {
  const response = await fetch(`${BASE}/api/__calls`);
  return (await response.json()).calls;
}

test('phase 4 real Desktop journeys: objectives, reports, saved views', { timeout: 240000 }, async (t) => {
  const { outDir, bundle } = buildBundle();
  const host = spawn(process.execPath, [path.join(HERE, 'phase4-host.mjs')], {
    env: { ...process.env, PHASE4_PORT: String(PORT), PHASE4_BUNDLE: bundle },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pageErrors = [];
  let browser;
  try {
    await waitForHost();
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const context = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    const selectProject = async (projectId) => {
      await page.getByRole('button', {name: CONTEXT_LABEL, exact: true}).click();
      await page.getByRole('combobox', {name: FIND_LABEL}).fill(projectId);
      await page.getByRole('listbox', {name: PROJECTS_LABEL}).getByRole('option', {name: projectId, exact: true}).click();
      await page.locator('[data-project-view="board"]').click();
      await page.waitForTimeout(400);
    };

    // ---------------------------------------------------------------- objectives
    await t.test('objectives on Vision: create → edit → evaluate now → archive', async () => {
      await page.goto(`${BASE}/desktop`, { waitUntil: 'load' });
      await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 });
      // Sahil 05/10: Project Stewardship opens on All projects; pick the project first.
      await pickProject(page, 'payments-relaunch');
      await page.click('[data-tab="project"]');
      // Design round f: objectives live on the project's Vision screen.
      await page.click('[data-project-view="plan"]');
      const objectiveRow = (id) => page.locator(`[data-plan-row="objective"][data-plan-id="${id}"]`);
      const drawer = page.locator('[data-plan-drawer="objective"]');
      await objectiveRow(1).waitFor({ timeout: 20000 });

      // Evaluate now, from the objective's details: only that objective runs.
      await objectiveRow(1).locator('.dy-plan-row-open').click();
      await page.locator('[data-plan-drawer="objective"][data-plan-drawer-id="1"]').waitFor();
      await drawer.locator('[data-action="plan-evaluate"]').click();
      await page.locator('[data-plan-evaluation]').waitFor({ timeout: 15000 });
      const note = await page.locator('[data-plan-evaluation]').textContent();
      assert.match(note, new RegExp(escapeRegex(OUTCOME_LABEL.passed)), `evaluation result not rendered: ${note}`);
      assert.match(note, MEASURED_NOTE(1), `measured value missing: ${note}`);

      const callsAfterEvaluate = await apiCalls();
      const evaluations = callsAfterEvaluate.filter((call) => /\/objectives\/\d+\/evaluate$/.test(call.path) && call.method === 'POST');
      assert.equal(evaluations.length, 1, 'evaluate must run exactly once');
      assert.match(evaluations[0].path, /\/objectives\/1\/evaluate$/, 'evaluate must target the selected objective only');
      assert.equal(evaluations.filter((call) => /\/objectives\/2\/evaluate$/.test(call.path)).length, 0, 'other objectives must not be evaluated');

      // Evidence read-back reflects the new evaluation (it was Unknown before).
      await page.waitForFunction((word) => new RegExp(word).test(document.querySelector('[data-plan-row="objective"][data-plan-id="1"]')?.textContent ?? ''), escapeRegex(OUTCOME_LABEL.passed), { timeout: 10000 })
        .catch(() => assert.fail('refreshed evidence did not show the evaluation outcome'));

      // Create a new objective through the "+ New" form.
      await page.click('[data-plan-menu="new"]');
      await page.click('[data-plan-menu-item="objective"]');
      await page.fill('[data-plan-dialog="create-objective"] [data-plan-field="title"]', 'Latency budget under 300ms');
      await page.fill('[data-plan-dialog="create-objective"] [data-plan-field="target"]', '<=300');
      await page.click('[data-action="plan-create-objective"]');
      await objectiveRow(100).waitFor({ timeout: 15000 });
      let calls = await apiCalls();
      const created = calls.find((call) => call.method === 'POST' && /\/objectives$/.test(call.path));
      assert.equal(created?.body?.name, 'Latency budget under 300ms', 'objective create payload was not sent');

      // Edit the new objective from its details.
      await objectiveRow(100).locator('.dy-plan-row-open').click();
      await page.locator('[data-plan-drawer="objective"][data-plan-drawer-id="100"]').waitFor();
      await drawer.locator('[data-action="plan-edit"]').click();
      await page.fill('[data-plan-dialog="edit-objective"] [data-plan-field="title"]', 'Latency budget under 250ms');
      await page.click('[data-action="plan-edit-objective"]');
      await page.waitForSelector('[data-plan-dialog]', { state: 'detached', timeout: 10000 });
      calls = await apiCalls();
      const patched = calls.find((call) => call.method === 'PATCH' && /\/objectives\/100$/.test(call.path));
      assert.equal(patched?.body?.name, 'Latency budget under 250ms', 'objective edit payload was not sent');

      // Archive objective 2 with confirmation, from its row menu.
      await objectiveRow(2).locator('[data-plan-menu="row-objective"]').click();
      await page.click('[data-plan-menu-item="archive"]');
      await page.waitForSelector('[data-destructive-confirm="plan-archive"]', { timeout: 10000 });
      await page.click('[data-destructive-confirm="plan-archive"] [data-action="confirm-destructive-action"]');
      await page.waitForSelector('[data-destructive-confirm="plan-archive"]', { state: 'detached', timeout: 10000 });
      calls = await apiCalls();
      assert(calls.some((call) => call.method === 'POST' && /\/objectives\/2\/archive$/.test(call.path)), 'archive was not sent');
      // Archived items sit under "Show finished and archived", evidence intact.
      await objectiveRow(2).waitFor({ state: 'detached', timeout: 10000 });
      await page.check('[data-plan-show-archived]');
      assert.match(await objectiveRow(2).textContent(), new RegExp(escapeRegex(ARCHIVED_LABEL)), 'archived objective state did not render');
      await objectiveRow(2).locator('.dy-plan-row-open').click();
      await page.locator('[data-plan-drawer="objective"][data-plan-drawer-id="2"]').waitFor();
      assert.match(await drawer.locator('.dy-plan-facts').textContent(), new RegExp(escapeRegex(PASS_RATE_WORD)), 'archived objective lost its historical evidence');
      await page.uncheck('[data-plan-show-archived]');
    });

    // ------------------------------------------------------------------ reports
    await t.test('reports: open + Download Markdown byte equality', async () => {
      await page.click('[data-project-view="reports"]');
      await page.waitForSelector('[data-report-history="RPT-1"]', { timeout: 20000 });
      await page.click('[data-report-history="RPT-1"]');
      await page.waitForSelector('[data-action="download-report"]', { timeout: 10000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.click('[data-action="download-report"]'),
      ]);
      const suggested = download.suggestedFilename();
      assert.match(suggested, /^[A-Za-z0-9._-]+\.md$/, `unsafe download filename: ${suggested}`);
      assert.match(suggested, /RPT-1/, 'download filename must identify the report');
      const filePath = await download.path();
      const downloaded = fs.readFileSync(filePath);

      const apiReport = await (await fetch(`${BASE}/api/projects/payments-relaunch/reports/RPT-1`)).json();
      const expected = Buffer.from(apiReport.content, 'utf8');
      assert(downloaded.equals(expected), 'downloaded bytes must equal the API report content byte-for-byte');
      assert(downloaded.toString('utf8').includes('✅'), 'unicode content was lost in the download');
      assert(downloaded.toString('utf8').includes('Généré'), 'accented content was lost in the download');
    });

    // -------------------------------------------------------------- saved views
    // r6 (Sahil's C2 review, 04/10): views sit in a bar above the board. Changing
    // the layout or filters marks the view edited, with Save, Save as new view and
    // Reset; the Manage views panel renames, shares and deletes. Saving changes to
    // your own view no longer asks first (the edited strip is the explicit step);
    // deleting still does. Same journey as before.
    await t.test('saved views: save → recall → overwrite → delete → reload → isolation', async () => {
      const viewPuts = async () => (await apiCalls()).filter((call) => call.method === 'PUT' && /\/views$/.test(call.path));
      const tabs = () => page.locator('[data-view-tab]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-view-tab')));
      await page.click('[data-tab="project"]');
      await page.click('[data-project-view="board"]');
      await page.waitForSelector('[data-kanban-screen]', { timeout: 20000 });
      await page.waitForSelector('[data-view-tab="Release focus"]', { timeout: 10000 });
      const putsBefore = (await viewPuts()).length;

      // Recall applies the stored filter to the board, and the board names the view.
      await page.click('[data-view-tab="Release focus"]');
      await page.waitForSelector('[data-kanban-screen][data-view="Release focus"]', { timeout: 10000 });
      assert.equal(await page.locator('[data-view-tab="Release focus"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('[data-kanban-status-filter]').innerText(), new RegExp(escapeRegex(STATUS_FILTER)), 'the stored status filter is shown');
      await page.waitForSelector('[data-work-card="HDY-12"]', { timeout: 10000 });
      const boardText = await page.locator('.dockyard-board-wrap').textContent();
      assert.match(boardText, /HDY-12/, 'recalled view must keep matching items visible');
      assert(!/HDY-13/.test(boardText), 'recalled view must hide non-matching items');

      // Save as a new view with the List layout: what you see is what is saved.
      await page.click('[data-kanban-layout="list"]');
      await page.waitForSelector('[data-view-edited="Release focus"]', { timeout: 10000 });
      await page.click('[data-view-save-as]');
      await page.fill('[data-view-new-name]', 'Release table');
      await page.click('[data-view-create]');
      await page.waitForSelector('[data-view-tab="Release table"][aria-pressed="true"]', { timeout: 10000 });
      let puts = (await viewPuts()).slice(putsBefore);
      assert.equal(puts.length, 1, 'saving a new view must PUT once');
      assert.deepEqual(puts[0].body, { name: 'Release table', layout: 'table', shared: false, filters: {
        display: { density: 'compact', fields: ['assignee', 'links', 'due', 'labels'] }, status: ['in_progress'] } }, 'view save payload drifted');
      await page.click('[data-views-close]');

      // Recall it: the List layout and the stored status filter both apply.
      await page.waitForSelector('[data-work-table]', { timeout: 10000 });
      const tableText = await page.locator('[data-work-table]').textContent();
      assert.match(tableText, /HDY-12/, 'the List must show the matching item');
      assert(!/HDY-13|HDY-14/.test(tableText), 'the List must not show other statuses');

      // Overwrite: change the view, then Save. The stored definition is replaced.
      await page.click('[data-kanban-layout="board"]');
      await page.waitForSelector('[data-view-edited="Release table"]', { timeout: 10000 });
      await page.click('[data-view-edited] [data-view-save]');
      await page.waitForSelector('[data-view-edited]', { state: 'detached', timeout: 10000 });
      puts = (await viewPuts()).slice(putsBefore);
      assert.equal(puts.length, 2, 'overwrite must PUT the updated definition');
      assert.deepEqual([puts[1].body.name, puts[1].body.layout, puts[1].body.filters.status], ['Release table', 'board', ['in_progress']], 'overwritten view was not updated');
      assert.equal(puts.some((call) => call.body.name === 'Release focus'), false, 'the original view is unchanged');

      // Reload persistence: the view lives in the backend, so it survives a full reload.
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('[data-tab="project"]', { timeout: 20000 });
      // This fixture host does not remember the pick, so the reload opens All projects.
      await pickProject(page, 'payments-relaunch');
      await page.click('[data-tab="project"]');
      await page.click('[data-project-view="board"]');
      await page.waitForSelector('[data-view-tab="Release table"]', { timeout: 20000 });
      assert.equal(await page.locator(`[data-view-tab="${ALL_WORK}"]`).getAttribute('aria-pressed'), 'true', 'a reload starts on All work');

      // Project isolation: the views never leak into the other project.
      await selectProject('mobile-client');
      await page.waitForSelector('[data-project-dashboard="mobile-client"] [data-kanban-screen]', { timeout: 15000 });
      assert.deepEqual(await tabs(), [ALL_WORK], 'saved views leaked across projects');
      await selectProject('payments-relaunch');
      await page.waitForSelector('[data-view-tab="Release table"]', { timeout: 15000 });

      // Delete asks first; deleting the current view falls back to All work.
      const viewDeletes = async () => (await apiCalls()).filter((call) => call.method === 'DELETE' && /\/views\//.test(call.path)).length;
      const deletesBefore = await viewDeletes();
      await page.click('[data-view-tab="Release table"]');
      await page.click('[data-views-manage]');
      await page.click('[data-view-row="Release table"] [data-view-delete]');
      await page.waitForSelector('[data-view-delete-confirm="Release table"]', { timeout: 10000 });
      assert.equal(await viewDeletes(), deletesBefore, 'nothing is deleted before the confirmation');
      await page.click('[data-view-delete-confirm="Release table"]');
      await page.waitForSelector('[data-view-row="Release table"]', { state: 'detached', timeout: 10000 });
      const calls = await apiCalls();
      assert(calls.some((call) => call.method === 'DELETE' && /\/views\/Release%20table$/.test(call.path)), 'delete was not sent');
      assert.deepEqual(await tabs(), [ALL_WORK, 'Release focus'], 'deleted view still listed');
      assert.equal(await page.locator(`[data-view-tab="${ALL_WORK}"]`).getAttribute('aria-pressed'), 'true', 'stale selection was not cleared after delete');
    });

    assert.deepEqual(pageErrors, [], `page errors during journeys: ${pageErrors.join(' | ')}`);
  } finally {
    if (browser) await browser.close();
    host.kill('SIGTERM');
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
