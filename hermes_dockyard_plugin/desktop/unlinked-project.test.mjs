// A project Hermes does not know ("unlinked") must never take a view down.
//
// Found on Sahil's live app (10/10/2026): two stewardship projects have no
// Hermes project behind them. f2a07d1/6b52f44 kept the fleet pages up, but
// picking one of them still showed "404 canonical project was not found" on
// Projects, Workflows and Backlog; the Dashboard tagged the missing link
// "Blocked" with an "Open work item" button and sorted it mid-table; and the
// project's own status strip said "On track".
//
// The practice backend makes projects genuinely unlinked (PUT
// /fixture/unlinked/<id>): every route then answers as it did live, the reads
// a test names and the ones it doesn't. Each test re-links what it unlinked,
// so the rest of the suite sees nothing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { readFileSync } from 'node:fs'
import { CONSOLE_TABS, PROJECT_VIEWS as VIEW_WORDS, SWITCHER_WORDS } from './src/lib/panel-words.js'
import { UNLINKED_LABEL, UNLINKED_TITLE, unlinkedNextStep } from './src/data/unlinked.js'
// The words a person reads are read from the source module that renders them,
// never spelled out here: the panel stays translatable without touching this test.
const sourceText = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const rendered = (text, pattern, what) => {
  const found = text.match(pattern)
  if (!found) throw new Error(`src no longer renders ${what}`)
  return found[1]
}
const esc = (word) => String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wordRe = (word) => new RegExp(esc(word))
const DASHBOARD_SRC = sourceText('./src/views/dashboard.js')
const UI_SRC = sourceText('./src/lib/ui.js')
const MEMORY_SRC = sourceText('./src/project/memory.js')
const UNLINKED_SRC = sourceText('./src/data/unlinked.js')
const ERROR_CARD = rendered(UI_SRC, /'data-state': 'error',[\s\S]*?jsx\('h2', \{ children: '([^']+)' \}/, 'the load-failure heading')
const NOTICE = UNLINKED_TITLE
const NEXT_STEP = unlinkedNextStep
const PROJECT_VIEWS = [VIEW_WORDS.overview, VIEW_WORDS.plan, VIEW_WORDS.board, VIEW_WORDS.planning, VIEW_WORDS.workflows, VIEW_WORDS.content, VIEW_WORDS.memory, VIEW_WORDS.activity, VIEW_WORDS.reports, VIEW_WORDS.settings]
const FLEET_SUMMARY = rendered(DASHBOARD_SRC, /className: 'dockyard-command-metrics', 'aria-label': '([^']+)'/, 'the fleet summary section')
const OPEN_ITEM_PREFIX = rendered(DASHBOARD_SRC, /'aria-label': `([^`$]+)\$\{item\.title\}`/, 'the attention row label')
const DETAIL_ASIDE = rendered(DASHBOARD_SRC, /className: 'dockyard-command-detail', 'aria-label': '([^']+)'/, 'the detail aside label')
const OPEN_TARGETS = DASHBOARD_SRC.match(/open: String\(item\?\.deep_link \?\? ''\)\.startsWith\('s2:work\/'\) \? '([^']+)' : '([^']+)'/)
if (!OPEN_TARGETS) throw new Error('src no longer labels the open action')
const OPEN_PROJECT = OPEN_TARGETS[2]
const BLOCKED_TAG = rendered(DASHBOARD_SRC, /blocked_item: \{ tag: '([^']+)'/, 'the blocked tag')
const BLOCKED_IMPACT = rendered(DASHBOARD_SRC, /blocked_item: \{ tag: '[^']+', tone: '[^']+', impact: '([^']+)'/, 'the blocked impact')
const OVERDUE_TAG = rendered(DASHBOARD_SRC, /overdue_item: \{ tag: '([^']+)'/, 'the overdue tag')
const EVIDENCE_TAG = rendered(DASHBOARD_SRC, /evidence_stale: \{ tag: '([^']+)'/, 'the stale-evidence tag')
const VIEW_ALL_ISSUES = rendered(DASHBOARD_SRC, /onClick: \(\) => setSubview\('issues'\), children: '([^']+)'/, 'the view-all-issues control')
const FILTER_GROUP = rendered(DASHBOARD_SRC, /className: 'dockyard-command-issue-filters', role: 'group', 'aria-label': '([^']+)'/, 'the issue filter group')
const BOT_TEAMS = rendered(DASHBOARD_SRC, /action: 'open-bot-teams',[\s\S]*?children: '([^']+)'/, 'the bot teams control')
const NO_WORK_ITEMS = rendered(DASHBOARD_SRC, /total \? `[^`]*` : '([^']+)' \}\)/, 'the empty work-items cell')
const NO_BLOCKERS = rendered(DASHBOARD_SRC, /overdue\) \? `[^`]*` : '([^']+)' \}\)/, 'the empty blockers cell')
const TRACK_UNLINKED = rendered(DASHBOARD_SRC, /status === 'unlinked'\)\.length\)\} ([^,]+),/, 'the health-bar unlinked segment')
const NAV_VIEWS = rendered(sourceText('./src/project/dashboard.js'), /className: 'dockyard-project-tabs', 'aria-label': '([^']+)'/, 'the project view bar')
// The chooser's data hook carries the screen name the panel shows for it,
// so the hook value is read from the shell that publishes it.
const ONE_PROJECT_TABS_SRC = rendered(sourceText('./src/shell/dashboard-page.js'), /const ONE_PROJECT_TABS = Object\.freeze\(\{ ([^}]+) \}\)/, 'the one-project screen names')
const CHOOSER = Object.fromEntries([...ONE_PROJECT_TABS_SRC.matchAll(/(\w+): '([^']+)'/g)].map((found) => [found[1], found[2]]))
const DELIVERY_SECTION = rendered(sourceText('./src/project/plan/plan-drawer.js'), /jsx\(Section, \{ title: '([^']+)', children: !item\.delivery/, 'the Delivery section title')
const MEMORY_UNLINKED = `${UNLINKED_TITLE}: ${rendered(MEMORY_SRC, /children: `\$\{UNLINKED_TITLE\}: ([^`]+)`/, 'the Memory unlinked line')}`
// The words each surface must NOT use: a link that is missing is not a host that went quiet.
const fragment = (sentence) => sentence.replace(/^[^:]*:\s*/, '').replace(/\.$/, '')
const WRONG = new RegExp([
  fragment(rendered(UNLINKED_SRC, /\n  return '([^']+)'\r?\n\}/, 'the unavailable host reason')),
  fragment(rendered(UNLINKED_SRC, /reason === 'archived'\) return '([^']+)'/, 'the archived reason')),
  fragment(rendered(MEMORY_SRC, /suggestions\.status === 'unavailable'[\s\S]*?children: '([^']+)'/, 'the Memory unavailable line')),
].map(esc).join('|'), 'i')
// The backend names this intervention (persistence/dockyard_service.py); the panel shows its words verbatim.
const BACKEND_NOTICE = 'Not linked to a Hermes project'

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const GHOST = 'payments-relaunch'
const FIXTURE_PROJECTS = ['payments-relaunch', 'mobile-client', 'atlas-mobile', 'legacy-integration']
// Words that only a failed load would put on screen.
const FAILURE = /canonical|could not|couldn't|unavailable|\b(404|500|503)\b|internal server error/i

async function setLinked(ids, linked) {
  const origin = new URL(BASE).origin
  for (const id of ids) {
    const response = await fetch(`${origin}/fixture/unlinked/${encodeURIComponent(id)}`, { method: linked ? 'DELETE' : 'PUT' })
    assert.ok(response.ok, `fixture ${linked ? 're-link' : 'unlink'} ${id} -> ${response.status}`)
  }
}

// The suite preload forgets the remembered project once per file; each test
// here needs that starting point, so it forgets it again.
async function forgetScope() {
  const response = await fetch(`${API}/settings/last-project`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token' },
    body: JSON.stringify({ project_id: null }),
  })
  assert.ok(response.ok, `PUT /settings/last-project -> ${response.status}`)
}

async function withUnlinked(ids, body) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  await forgetScope()
  await setLinked(ids, false)
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(8000)
    trackRequests(page)
    await body(page)
  } finally {
    await browser.close()
    await setLinked(ids, true)
  }
}

// Wait until no request has been in flight for a moment. (waitForLoadState
// ('networkidle') returns at once after the first load, so it cannot tell
// that a tab's own reads have finished.)
function trackRequests(page) {
  let inflight = 0
  let last = Date.now()
  page.on('request', () => { inflight += 1; last = Date.now() })
  const done = () => { inflight = Math.max(0, inflight - 1); last = Date.now() }
  page.on('requestfinished', done)
  page.on('requestfailed', done)
  page.quiet = async (idleMs = 400, maxMs = 8000) => {
    const start = Date.now()
    while (Date.now() - start < maxMs) {
      if (inflight === 0 && Date.now() - last >= idleMs) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`requests never settled (${inflight} still in flight)`)
  }
}

async function settle(page) {
  await page.quiet()
}

// Nothing on screen may read as a failed load: no error card, and no alert or
// inline error that names a failure or the missing link. The missing link is
// explained once, by the notice (role="status"); a view that shows it as its
// own error failed on the link instead of handling it.
async function assertNoFailure(page, where) {
  assert.equal(await page.getByRole('heading', { name: ERROR_CARD }).count(), 0, `${where}: error card`)
  const shown = await page.evaluate(() => [...document.querySelectorAll('[role="alert"], .dockyard-inline-error, [data-state="error"]')]
    .filter((node) => !node.closest('[data-unlinked-notice]')).map((node) => node.innerText))
  const failed = shown.filter((text) => FAILURE.test(text) || text.includes(NOTICE))
  assert.deepEqual(failed, [], `${where}: failure shown`)
}

async function assertNotice(page, id, where) {
  const notice = page.locator(`[data-unlinked-notice="${id}"]`).first()
  await notice.waitFor()
  const text = await notice.innerText()
  assert.match(text, new RegExp(NOTICE), `${where}: notice title`)
  assert.ok(text.includes(NEXT_STEP(id)), `${where}: notice says how to link it (got: ${text})`)
}

async function openTab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click()
}

async function chooseProject(page, screen, id) {
  await page.locator(`[data-project-chooser="${screen}"] [data-choose-project="${id}"]`).click()
}

test('every view of an unlinked project explains the missing link instead of failing', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await page.locator(`section[aria-label="${FLEET_SUMMARY}"]`).waitFor()
    await openTab(page, CONSOLE_TABS.project)
    await chooseProject(page, CHOOSER.project, GHOST)
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await settle(page)
    await assertNoFailure(page, 'Projects')
    await assertNotice(page, GHOST, 'Projects')
    // The project's own status strip: the missing link, never "On track".
    const strip = page.locator('[data-attention-state]').first()
    assert.equal(await strip.getAttribute('data-attention-state'), 'unlinked')
    assert.equal(await strip.locator('strong').first().innerText(), UNLINKED_LABEL)
    const views = page.getByRole('navigation', { name: NAV_VIEWS })
    for (const view of PROJECT_VIEWS) {
      const button = views.getByRole('button', { name: view, exact: true })
      await button.click()
      await settle(page)
      assert.match(await button.getAttribute('class') ?? '', /\bactive\b/, `Projects > ${view} did not open`)
      await assertNoFailure(page, `Projects > ${view}`)
    }
    await openTab(page, CONSOLE_TABS.backlog)
    await settle(page)
    await assertNoFailure(page, 'Backlog')
    await assertNotice(page, GHOST, 'Backlog')
    // Work cannot be created in a project Hermes does not know.
    assert.equal(await page.locator('[data-action="open-create-backlog-item"]').isDisabled(), true)
    assert.equal(await page.locator('[data-action="open-bulk-import"]').isDisabled(), true)
    await openTab(page, CONSOLE_TABS.workflows)
    await page.locator('[data-workflow-library-screen]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Workflows')
    await openTab(page, CONSOLE_TABS.roadmap)
    await page.locator('[data-roadmap-screen]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Roadmap')
  })
})

test('the Dashboard calls a missing link "Not linked", lists it near the top and can filter to it', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await page.locator(`section[aria-label="${FLEET_SUMMARY}"]`).waitFor()
    await settle(page)
    // Needs you now: the right tag and impact, and an Open that goes to the project.
    const row = page.getByRole('button', { name: `${OPEN_ITEM_PREFIX}${BACKEND_NOTICE}`, exact: true })
    await row.waitFor()
    assert.equal(await row.locator('.dockyard-command-type').innerText(), UNLINKED_LABEL)
    assert.ok(!(await row.innerText()).includes(BLOCKED_IMPACT), 'a missing link is not blocked work')
    // Every other row is tagged by its own cause: nothing but blocked work says "Blocked".
    const rows = page.locator('#dy-needs-you-now .dockyard-command-attention-row')
    for (let index = 0; index < await rows.count(); index += 1) {
      const tag = await rows.nth(index).locator('.dockyard-command-type').innerText()
      const label = await rows.nth(index).getAttribute('aria-label')
      if (tag === BLOCKED_TAG) assert.ok(!new RegExp([UNLINKED_LABEL, OVERDUE_TAG, EVIDENCE_TAG].map(esc).join('|'), 'i').test(label), `${label} tagged ${BLOCKED_TAG}`)
    }
    await row.click()
    const open = page.locator(`aside[aria-label="${DETAIL_ASIDE}"] .dockyard-button.primary`)
    assert.equal(await open.innerText(), OPEN_PROJECT)
    // Fleet health: its own state, near the top of the table, in the bar and legend.
    const healthRows = page.locator('[data-project-row]')
    const order = await healthRows.evaluateAll((nodes) => nodes.map((node) => [node.getAttribute('data-project-row'), node.querySelector('.dockyard-command-health')?.className ?? '']))
    const ghostAt = order.findIndex(([id]) => id === GHOST)
    assert.ok(ghostAt >= 0, `no health row for ${GHOST}: ${JSON.stringify(order)}`)
    assert.match(order[ghostAt][1], /\bunlinked\b/)
    const healthyFirst = order.findIndex(([, cls]) => /\b(on_track|idle)\b/.test(cls))
    assert.ok(healthyFirst === -1 || ghostAt < healthyFirst, `unlinked sorted below healthy rows: ${JSON.stringify(order)}`)
    const ghostRow = page.locator(`[data-project-row="${GHOST}"]`)
    assert.equal(await ghostRow.locator('.dockyard-command-health').innerText(), UNLINKED_LABEL)
    // Hermes never said there was no work or no blocker: do not claim it.
    assert.doesNotMatch(await ghostRow.innerText(), new RegExp([NO_WORK_ITEMS, NO_BLOCKERS].map(esc).join('|')))
    assert.match(await page.locator('.dockyard-command-health-track').getAttribute('aria-label'), wordRe('1 ' + TRACK_UNLINKED))
    await page.locator('.dockyard-command-health-legend').getByText(UNLINKED_LABEL, { exact: true }).waitFor()
    assert.equal(await page.locator('.dockyard-health-segment.unlinked').count(), 1)
    // All issues: a filter of its own.
    await page.getByRole('button', { name: VIEW_ALL_ISSUES }).click()
    const filter = page.getByRole('group', { name: FILTER_GROUP }).getByRole('button', { name: `${UNLINKED_LABEL} (1)` })
    await filter.click()
    const listed = page.locator('.dockyard-command-directory-list .dockyard-command-attention-row')
    assert.equal(await listed.count(), 1)
    assert.equal(await listed.first().locator('.dockyard-command-type').innerText(), UNLINKED_LABEL)
    // Open goes to the project, which explains the link.
    await listed.first().click()
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await assertNotice(page, GHOST, 'Dashboard > Open')
  })
})

test('with every project unlinked, as on the live app, every tab still loads', async () => {
  await withUnlinked(FIXTURE_PROJECTS, async (page) => {
    await page.goto(BASE)
    await page.locator(`section[aria-label="${FLEET_SUMMARY}"]`).waitFor()
    await settle(page)
    await assertNoFailure(page, 'Dashboard')
    // Bot teams reads the first project's team, which Hermes does not know.
    await page.getByRole('button', { name: BOT_TEAMS }).click()
    await page.locator('[data-bot-teams]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Bot teams')
    await assertNotice(page, await page.locator('[data-unlinked-notice]').first().getAttribute('data-unlinked-notice'), 'Bot teams')
    for (const [tab, ready] of [[CONSOLE_TABS.project, `[data-project-chooser="${CHOOSER.project}"]`], [CONSOLE_TABS.backlog, `[data-project-chooser="${CHOOSER.backlog}"]`],
      [CONSOLE_TABS.workflows, '[data-workflow-library-screen]'], [CONSOLE_TABS.roadmap, '[data-roadmap-screen]']]) {
      await openTab(page, tab)
      await page.locator(ready).waitFor()
      await settle(page)
      await assertNoFailure(page, tab)
    }
    await openTab(page, CONSOLE_TABS.project)
    await chooseProject(page, CHOOSER.project, 'atlas-mobile')
    await page.locator('[data-project-dashboard="atlas-mobile"]').waitFor()
    await settle(page)
    await assertNoFailure(page, 'Projects > atlas-mobile')
    await assertNotice(page, 'atlas-mobile', 'Projects > atlas-mobile')
    // Approval Inbox and Notifications carry a count in their names.
    for (const tab of [CONSOLE_TABS.backlog, CONSOLE_TABS.workflows, new RegExp('^' + esc(CONSOLE_TABS.inbox)), new RegExp('^' + esc(CONSOLE_TABS.notifications))]) {
      await (typeof tab === 'string' ? openTab(page, tab) : page.getByRole('tab', { name: tab }).click())
      await settle(page)
      await assertNoFailure(page, tab)
    }
  })
})

test('an action that needs Hermes says the project is not linked, in words', async () => {
  await withUnlinked([GHOST], async (page) => {
    await page.goto(BASE)
    await openTab(page, CONSOLE_TABS.project)
    await chooseProject(page, CHOOSER.project, GHOST)
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    await page.getByRole('navigation', { name: NAV_VIEWS }).getByRole('button', { name: VIEW_WORDS.reports, exact: true }).click()
    await page.locator('[data-action="generate-report"]').click()
    const toast = page.locator('[data-toast-region]')
    await page.waitForFunction(() => (document.querySelector('[data-toast-region]')?.textContent ?? '').trim().length > 0)
    const said = await toast.innerText()
    assert.match(said, new RegExp(NOTICE), `the toast said: ${said}`)
    assert.ok(said.includes(NEXT_STEP(GHOST)) || said.includes('to link it'), `the toast says how to link it: ${said}`)
    assert.doesNotMatch(said, /canonical|\b(404|500)\b|could not confirm/i)
  })
})

// Found by the real-data dry run (10/10/2026), past the views above: the
// Roadmap, the Vision drawer and Memory explained a missing link as "the work
// host did not respond" / "unavailable right now". Hermes did respond: it has
// no such project. Every roadmap row is opened, and every Vision entry.
test('Roadmap, Vision and Memory say "Not linked", never "did not respond"', async () => {
  await withUnlinked([GHOST], async (page) => {
    const WRONG = /did not respond|unavailable right now/i
    await page.goto(BASE)
    await openTab(page, CONSOLE_TABS.project)
    await chooseProject(page, CHOOSER.project, GHOST)
    await page.locator(`[data-project-dashboard="${GHOST}"]`).waitFor()
    const views = page.getByRole('navigation', { name: NAV_VIEWS })
    await views.getByRole('button', { name: VIEW_WORDS.memory, exact: true }).click()
    await settle(page)
    const memory = await page.locator(`[data-project-dashboard="${GHOST}"]`).innerText()
    assert.doesNotMatch(memory, WRONG, 'Memory')
    assert.match(memory, wordRe(MEMORY_UNLINKED))
    await views.getByRole('button', { name: VIEW_WORDS.plan, exact: true }).click()
    await settle(page)
    const entries = page.locator('[data-plan-id]')
    let drawers = 0
    for (let index = 0; index < Math.min(await entries.count(), 8); index += 1) {
      await entries.nth(index).click()
      await settle(page)
      const drawer = page.locator('[data-plan-drawer]')
      if (await drawer.count() === 0) continue
      const words = await drawer.innerText()
      if (new RegExp(esc(DELIVERY_SECTION), 'i').test(words)) drawers += 1
      assert.doesNotMatch(words, WRONG, `Vision drawer ${index}`)
      await page.locator('[data-plan-drawer-close]').click()
    }
    assert.ok(drawers > 0, 'opened at least one Vision item with a Delivery section')
    await openTab(page, CONSOLE_TABS.roadmap)
    await page.locator('[data-roadmap-screen]').waitFor()
    await settle(page)
    const closed = page.locator('[data-rm-row][data-rm-expandable="true"][data-rm-open="false"] [data-rm-disclosure]')
    for (let guard = 0; guard < 40 && await closed.count() > 0; guard += 1) {
      await closed.first().click()
      await settle(page)
    }
    const roadmap = await page.locator('[data-roadmap-screen]').innerText()
    assert.doesNotMatch(roadmap, WRONG, 'Roadmap')
    assert.match(roadmap, wordRe(UNLINKED_LABEL))
    assert.ok(await page.locator('[data-rm-items-row]').count() > 0, 'opened a milestone and its work items')
  })
})
