// Archive and Restore in the Desktop, end to end through the REAL plugin
// bundle, proxy and backend (disposable data). Owner decisions 10/10/2026 and
// 11/10/2026 (Sahil picked option A: archived projects live in the project
// switcher):
// - with nothing archived, the switcher offers no archived entry;
// - Archive asks first, says the project is hidden everywhere and where to
//   restore it, then leaves the project for All projects;
// - an archived project is in no project list: not the switcher, not the
//   Dashboard;
// - the design-review choice is gone: ?review=1&archived=settings changes
//   nothing, and App settings has no archived section;
// - the switcher's menu offers "Archived projects (1)", whose list says what
//   Restore brings back; Restore asks first, then opens the project;
// - the project comes back exactly as it was: still switched off (the old
//   Restore switched every project on), same phase, pause time and settings.
// legacy-integration is the fixtures' switched-off project. If any step fails
// the test restores it through the API, so later tests in the shared backend
// see it as before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { FLEET_SUMMARY, fill, one, pairs, switcherWords, template } from './test-support/src-words.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const HEADERS = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'legacy-integration'

// The words this journey reads come from the modules that render them: the
// switcher's names from lib/panel-words.js (through lib/project-switcher.js),
// the archive/restore copy from project/panels.js, views/archived-projects.js
// and shell/dashboard-page.js.
const ARCHIVED = 'src/views/archived-projects.js'
const WORDS = switcherWords()
// Where the app says an archived project can be restored from.
const RESTORE_FROM = one(ARCHIVED, /export const RESTORE_FROM = '([^']+)'/)
const PHASE_WORDS = pairs(ARCHIVED, /(active|paused|frozen): '([^']+)'/)
const OFF = one(ARCHIVED, /enabled \? '[^']+' : '([^']+)'/)
// "switched off, active": the state a restored project comes back in.
const archivedState = (phase) => `${OFF}, ${PHASE_WORDS[phase] ?? phase}`
// The Restore button's own name, and the sentence its confirmation shows: the
// values are the project and the state it comes back in.
const RESTORE_ACTION = one(ARCHIVED, /role: 'group', 'aria-label': `([^`]+) \$\{row\.project_id\}`/)
const RESTORE_ASK = (project, state) => fill(ARCHIVED, /jsx\('span', \{ children: `([^`]*\$\{row\.project_id\}\?[^`]*)` \}\)/, project, state)
const ARCHIVED_MENU = one('src/lib/project-switcher.js', /export const ARCHIVED_MENU = '([^']+)'/)
const archivedCountLabel = (count) => fill('src/lib/project-switcher.js', /`([^`]*\(\$\{archivedCount\}\))`/, ARCHIVED_MENU, count)
const ARCHIVE_CONFIRM = template('src/project/panels.js', /pendingLifecycle === 'archive'\s*\?\s*`([^`]+)`/)
const archiveToast = () => fill('src/shell/dashboard-page.js', /emitToast\('success', `([^`]+)`\)/, PROJECT, RESTORE_FROM)
const restoreToast = (phase) => fill(ARCHIVED, /emitToast\('success', `([^`]+)`\)/, PROJECT, archivedState(phase))
const flat = (text) => text.replace(/\s+/g, ' ').trim()

async function api(path, method = 'GET') {
  const response = await fetch(`${API}${path}`, { method, headers: { ...HEADERS, 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${await response.text()}`)
  return response.json()
}

// Everything Restore must bring back; updated_at and the archive stamps are
// the only fields an archive and restore may change.
async function projectState() {
  const settings = await api(`/projects/${PROJECT}/settings`)
  const { updated_at: _updated, archived_at: archivedAt, archived_by: _by, ...kept } = settings
  return { archivedAt, kept }
}

const switcher = (page) => page.getByRole('button', { name: WORDS.context, exact: true })
const fleet = (page) => page.locator(`section[aria-label="${FLEET_SUMMARY}"]`)
const toast = (page, pattern) => page.locator('[data-toast-region] [role="status"]').filter({ hasText: pattern })

async function openSwitcher(page) {
  await switcher(page).click()
  await page.getByRole('listbox', { name: WORDS.list }).waitFor()
}

async function closeSwitcher(page) {
  await page.keyboard.press('Escape')
  await page.getByRole('listbox', { name: WORDS.list }).waitFor({ state: 'detached' })
}

test('Archive hides a project everywhere; the switcher lists it; Restore brings it back exactly and opens it', { timeout: 120000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  assert.deepEqual((await api('/projects/archived')).projects, [], 'the test starts with nothing archived')
  const before = await projectState()
  assert.equal(before.kept.enabled, false, 'legacy-integration is the fixtures\' switched-off project')
  const remembered = await rememberedProject(API, HEADERS)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    // The old design-review link: it changes nothing now.
    await page.goto(`${BASE}?review=1&archived=settings`, { waitUntil: 'networkidle' })
    await fleet(page).waitFor()
    assert.equal(await page.locator('[data-archive-review], [data-review-choice]').count(), 0, 'no design-review bar')

    // Nothing archived: no archived entry in the switcher.
    await openSwitcher(page)
    assert.equal(await page.locator('[data-switcher-archived]').count(), 0, 'no archived entry while nothing is archived')
    await closeSwitcher(page)

    // Archive from Project > Settings: it asks first and says where to restore.
    await openSwitcher(page)
    await page.getByRole('combobox', { name: WORDS.find }).fill(PROJECT)
    await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).click()
    await page.locator(`.dy-sw-trigger[data-scope="${PROJECT}"]`).waitFor()
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="settings"]').click()
    await page.locator('[data-lifecycle-action="archive"]').click()
    const confirmText = await page.locator('[data-lifecycle-confirm-text="archive"]').innerText()
    // The sentence the panel publishes, with this project's own state filled in.
    assert.match(flat(confirmText), ARCHIVE_CONFIRM)
    assert.ok(confirmText.includes(RESTORE_FROM), confirmText)
    assert.ok(confirmText.includes(before.kept.phase), confirmText)
    assert.equal((await projectState()).archivedAt, null, 'nothing changes before the confirmation')
    await page.locator('[data-action="confirm-lifecycle-action"]').click()

    // It leaves the project for All projects and says where to restore it.
    await page.locator('.dy-sw-trigger[data-scope="*"]').waitFor()
    await toast(page, archiveToast()).waitFor()
    await fleet(page).waitFor()
    assert.ok((await projectState()).archivedAt, 'the backend archived it')
    await page.waitForLoadState('networkidle')
    assert.doesNotMatch(await page.locator('#dockyard-panel').innerText(), new RegExp(PROJECT), 'the Dashboard does not show the archived project')

    // App settings has no archived section, whatever the address says.
    await page.locator('[data-tab="settings"]').click()
    await page.locator('[data-app-setting="appearance"]').waitFor()
    assert.equal(await page.locator('[data-app-setting="archived"]').count(), 0, 'App settings has no archived section')
    assert.equal(await page.locator('[data-archive-review], [data-review-choice]').count(), 0, 'no design-review bar in App settings')
    await page.locator('[data-tab="dashboard"]').click()
    await fleet(page).waitFor()

    // The switcher offers the archived list (so its lists have refreshed), and
    // no longer offers the project.
    await openSwitcher(page)
    assert.equal((await page.locator('[data-switcher-archived]').innerText()).trim(), archivedCountLabel(1))
    assert.equal(await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).count(), 0, 'the switcher does not offer the archived project')
    await page.locator('[data-switcher-archived]').click()
    const row = page.locator(`[data-archived-dialog] [data-archived-project="${PROJECT}"]`)
    await row.waitFor()
    assert.ok((await row.innerText()).includes(archivedState(before.kept.phase)), await row.innerText())

    // Restore asks first, then opens the project, exactly as it was.
    await row.locator(`[data-restore-project="${PROJECT}"]`).click()
    const ask = await row.getByRole('group', { name: `${RESTORE_ACTION} ${PROJECT}` }).innerText()
    assert.ok(ask.includes(RESTORE_ASK(PROJECT, archivedState(before.kept.phase))), ask)
    assert.ok((await projectState()).archivedAt, 'nothing changes before the confirmation')
    await row.locator('[data-action="confirm-restore"]').click()
    await page.locator('[data-archived-dialog]').waitFor({ state: 'detached' })
    await page.locator(`.dy-sw-trigger[data-scope="${PROJECT}"]`).waitFor()
    await page.locator('[data-tab="project"][aria-selected="true"]').waitFor()
    await toast(page, restoreToast(before.kept.phase)).waitFor()
    assert.deepEqual(await projectState(), before, 'Restore brought back exactly what was archived')

    // Listed again once the lists refresh (Restore opens the project at once,
    // and the refresh lands a moment later); the archived entry goes with the
    // last archived project.
    await openSwitcher(page)
    await page.locator(`[role="listbox"] [data-project-option="${PROJECT}"]`).waitFor()
    await page.locator('[data-switcher-archived]').waitFor({ state: 'detached' })
    await closeSwitcher(page)
    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
    if ((await projectState()).archivedAt) await api(`/projects/${PROJECT}/restore`, 'POST')
    await restoreRememberedProject(API, HEADERS, remembered)
  }
})
