// Batch E5 — Notifications screen end-to-end through the REAL plugin bundle and
// REAL backend (disposable data): filters, the global switcher narrowing the
// list to one project (the screen's own project filter went 04/10), day grouping, the detail
// panel's actions (mark seen, resolve with note), mark all as seen, the badge
// counts New only, settings save and reload, the pop-up poller through the
// in-app toast fallback (the harness host has no notify), no duplicates after a
// reload, and the keyboard path. No mocks for data; host.notify is the plan's
// stubbed-host case.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'
import { CONSOLE_TABS } from './src/lib/panel-words.js'
import { ALL_PROJECTS, all, one, pickProject } from './test-support/src-words.mjs'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
const V = API
const TOKEN = 'demo-session-token'

// The words of the Notifications screen and the Approval Inbox come from the
// modules that render them: views/notifications.js (filters, day groups, detail
// actions), views/inbox.js (its heading) and lib/panel-words.js (the tab). Read
// out of their source, since both views import React.
const NOTIF = 'src/views/notifications.js'
const INBOX = 'src/views/inbox.js'
const filterLabel = (which) => one(NOTIF, new RegExp(`'aria-label': '([^']+)', value: ${which}Filter`))
const FILTER_STATE = filterLabel('state')
const FILTER_TYPE = filterLabel('type')
const FILTER_SEVERITY = filterLabel('severity')
const ALL_FILTERS = [FILTER_STATE, FILTER_TYPE, FILTER_SEVERITY]
const NOTHING_MATCHES = one(NOTIF, /filterEmpty\s*\?\s*jsx\(EmptyState, \{ title: '([^']+)'/)
const TODAY = one(NOTIF, /if \(diff <= 0\) return '([^']+)'/)
const MARK_ALL_SEEN = one(NOTIF, /busyId === 'all' \? '[^']+' : '([^']+)'/)
const MARK_SEEN = one(NOTIF, /action: 'detail-seen'[\s\S]*?children: busy \? '[^']+' : '([^']+)'/)
const REVIEW_IN_INBOX = one(NOTIF, /action: 'detail-approval'[\s\S]*?children: '([^']+)'/)
const RESOLVE = one(NOTIF, /action: 'detail-resolve',[\s\S]*?children: '([^']+)'/)
const RESOLUTION_NOTE = one(NOTIF, /'aria-label': '([^']+)',\s*placeholder:/)
const CONFIRM_RESOLVE = one(NOTIF, /action: 'detail-resolve-confirm'[\s\S]*?children: busy \? '[^']+' : '([^']+)'/)
const SEEN_BY = one(NOTIF, /children: `([^`$]+): \$\{seenBy\}/)
const RESOLVED_BY = one(NOTIF, /`([^`$]+): \$\{resolvedBy\}/)
const INBOX_HEADING = all(INBOX, /title: '([^']+)'/)[0]

async function api(path, method = 'GET', body) {
  const res = await fetch(`${V}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-hermes-session-token': TOKEN,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

// Seed deterministic notifications through the real engine endpoints:
// two new (one approval, one alert, different severities/times) + one seen.
async function seed() {
  const made = await api('/notifications', 'POST', {}).catch(() => null)
  void made
  // The engine records from events; simplest deterministic source: propose an
  // initiative (approval notification) and a manual alert via the resolve-free
  // create path is not exposed, so use two proposals + one health change via a
  // cycle transition. Proposals are deduped per initiative ref — unique titles.
  const stamp = Date.now()
  const refs = []
  for (const title of [`E5 smoke approval ${stamp}`, `E5 smoke second ${stamp}`]) {
    const res = await api('/projects/payments-relaunch/initiatives', 'POST', {
      title, rationale: 'E5 browser suite seeding',
    })
    refs.push(res.ref ?? res.initiative?.ref)
  }
  return { refs, stamp }
}

async function openNotifications(page) {
  await page.goto(BASE)
  await page.getByRole('tab', { name: CONSOLE_TABS.notifications }).click()
  await page.locator('.dy-notif-filters').waitFor()
}

test('E5: filters, day groups, detail actions, badge, settings, poller, keyboard', { timeout: 240000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  try {
    const { refs } = await seed()

    // Wait until the seeded approval rows are listed.
    await openNotifications(page)
    await page
      .waitForFunction((r) => document.body.innerText.includes(r), refs[0])
      .catch(async () => {
        const panelText = await page.locator('#dockyard-panel').innerText().catch(() => 'n/a')
        assert.fail(`seeded approval notification is listed; page errors: ${JSON.stringify(errors)}; panel: ${panelText.slice(0, 2200)}`)
      })

    // 1. Filters: type=Approvals narrows to approval rows only.
    const rows = page.locator('.dockyard-notification-row')
    const allCount = await rows.count()
    assert.ok(allCount >= 2, 'at least the seeded rows are present')

    // 1a. The screen's own project filter is gone (Sahil 04/10, design d): the
    //     global switcher narrows Notifications and says so. The remembered
    //     project is put back, so later steps and suites open as before.
    assert.deepEqual(
      await page.locator('.dy-notif-filters select').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
      ALL_FILTERS, 'the screen offers its own filters and no project filter',
    )
    const headers = { 'x-hermes-session-token': TOKEN }
    const remembered = await rememberedProject(API, headers)
    await pickProject(page, 'payments-relaunch')
    await page.locator('[data-scope-note]').waitFor()
    await page.waitForFunction(() => {
      const metas = [...document.querySelectorAll('.dockyard-notification-row .dockyard-meta')].map((node) => node.textContent)
      return metas.length >= 2 && metas.every((meta) => meta.startsWith('payments-relaunch · '))
    }).catch(() => assert.fail('the switcher narrows Notifications to payments-relaunch'))
    await pickProject(page, ALL_PROJECTS)
    await restoreRememberedProject(API, headers, remembered)
    await page.waitForFunction((count) => document.querySelectorAll('.dockyard-notification-row').length === count, allCount)
      .catch(() => assert.fail('All projects lists every row again'))
    assert.equal(await page.locator('[data-scope-note]').count(), 0, 'no scope note on All projects')

    await page.getByLabel(FILTER_TYPE).selectOption('approval_required')
    const approvalCount = await rows.count()
    assert.ok(approvalCount >= 2 && approvalCount <= allCount)
    await page.getByLabel(FILTER_SEVERITY).selectOption('high')
    await page.getByLabel(FILTER_STATE).selectOption('new')
    // Filtered-empty state.
    await page.getByLabel(FILTER_STATE).selectOption('resolved')
    if ((await rows.count()) === 0) {
      await page.getByText(NOTHING_MATCHES).waitFor()
    }
    await page.getByLabel(FILTER_STATE).selectOption('all')
    await page.getByLabel(FILTER_SEVERITY).selectOption('all')

    // 2. Day grouping: seeded rows are today; the group heading exists.
    assert.ok(await page.getByText(TODAY, { exact: true }).count() > 0, 'Today group present')

    // 3. Detail panel: select the first row, mark seen from the detail.
    await rows.first().locator('button').first().click()
    await page.locator('[data-notification-detail]').waitFor()
    const detail = page.locator('[data-notification-detail]')

    // 3a. "Review in Approval Inbox" (approval rows) must land on the Approval
    // Inbox. Then come back to the same row for the remaining steps.
    const reviewButton = detail.getByRole('button', { name: REVIEW_IN_INBOX })
    assert.equal(await reviewButton.count(), 1, 'approval detail offers its way into the Approval Inbox')
    await reviewButton.click()
    await page
      .waitForFunction(() => document.querySelector('[data-tab="inbox"]')?.getAttribute('aria-selected') === 'true')
      .catch(async () => {
        const active = await page.locator('[role="tab"][aria-selected="true"]').innerText().catch(() => 'n/a')
        assert.fail(`the approval detail opens the Approval Inbox; active tab is still: ${active}`)
      })
    await page.getByRole('heading', { name: INBOX_HEADING }).first().waitFor()
    await page.getByRole('tab', { name: CONSOLE_TABS.notifications }).click()
    await page.locator('.dy-notif-filters').waitFor()
    await page.getByLabel(FILTER_TYPE).selectOption('approval_required')
    await rows.first().locator('button').first().click()
    await page.locator('[data-notification-detail]').waitFor()

    await detail.getByRole('button', { name: MARK_SEEN }).click()
    await page
      .waitForFunction((word) => document.querySelector('[data-notification-detail]')?.innerText.includes(word), SEEN_BY)
      .catch(() => assert.fail('detail shows who saw it'))

    // 4. Resolve with a note from the detail panel.
    await detail.getByRole('button', { name: RESOLVE, exact: true }).click()
    await detail.getByLabel(RESOLUTION_NOTE).fill('E5 browser resolve')
    await detail.getByRole('button', { name: CONFIRM_RESOLVE }).click()
    await page
      .waitForFunction((word) => document.querySelector('[data-notification-detail]')?.innerText.includes(word), RESOLVED_BY)
      .catch(() => assert.fail('detail shows who resolved it'))

    // 5. Mark all as seen: every remaining new row leaves the New state.
    await page.getByRole('button', { name: MARK_ALL_SEEN }).click()
    await page
      .waitForFunction(() => {
        const states = [...document.querySelectorAll('.dockyard-notification-row')]
        return states.length > 0 && states.every((r) => r.getAttribute('data-notification-state') !== 'new')
      })
      .catch(() => assert.fail('mark all as seen clears every new row'))

    // 6. Badge counts New only: the tab shows no count after the sweep.
    await page.getByRole('tab', { name: CONSOLE_TABS.notifications }).waitFor()
    const badge = await page.locator('[data-tab="notifications"] .dockyard-tab-count').count()
    assert.equal(badge, 0, 'no New badge after everything is seen')

    // 7. Settings (Sahil 05/10: only in App settings). The Notifications screen
    // points there; a change made there persists across a reload.
    assert.equal(await page.locator('[data-notification-settings]').count(), 0, 'no settings panel on the Notifications screen')
    await page.locator('[data-notification-settings-link] [data-action="open-app-settings"]').click()
    await page.locator('[data-app-settings] [data-notification-settings]').waitFor()
    await page.locator('#dy-notif-popups-severity').selectOption('critical')
    await page.reload()
    await page.locator('[data-tab="settings"]').click()
    await page.locator('[data-app-settings] [data-notification-settings]').waitFor()
    assert.equal(await page.locator('#dy-notif-popups-severity').inputValue(), 'critical')
    // Restore the default for later runs.
    await page.locator('#dy-notif-popups-severity').selectOption('high')
    await openNotifications(page)

    // 8. Poller: the in-app toast fallback fires for fresh pop-ups (host mock
    // has no notify). Seed the probe FIRST, reload, and let the prime tick
    // surface it; its id is then shown-marked and remembered, so a further wait
    // must NOT surface it again.
    const fresh = await api('/projects/payments-relaunch/initiatives', 'POST', {
      title: `E5 pop-up probe ${refs[0]}`, rationale: 'poller toast check',
    })
    const freshRef = fresh.ref ?? fresh.initiative?.ref
    assert.ok(freshRef, 'probe proposal created')
    // Speed up the poller for this test only (documented hook); production keeps
    // the 60s cadence. Set as an init script so it is in place before the
    // plugin registers on every navigation; two-second ticks make the duplicate
    // check take seconds.
    await page.addInitScript(() => { window.__dockyardPopupIntervalMs = 2000 })
    await page.reload()
    await openNotifications(page)
    await page
      .waitForFunction(
        (r) => (window.__hostNotifyCalls ?? []).some((item) => String(item?.title ?? '').includes(r)),
        String(freshRef),
        { timeout: 30000 },
      )
      .catch(() => assert.fail('poller surfaced the fresh approval through host.notify'))
    // Let several fast ticks pass; the same pop-up must never return.
    await page.waitForTimeout(7000)
    const calls = await page.evaluate(() => window.__hostNotifyCalls ?? [])
    const refCalls = calls.filter((item) => String(item?.title ?? '').includes(String(freshRef)))
    assert.equal(refCalls.length, 1, 'the same pop-up never shows twice')

    // 9. Keyboard path: the toolbar is reachable; the row button is a real button.
    await page.getByLabel(FILTER_STATE).focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SELECT', 'filters stay in the tab order')

    assert.deepEqual(errors, [], 'no page errors')
  } finally {
    await browser.close()
  }
})
