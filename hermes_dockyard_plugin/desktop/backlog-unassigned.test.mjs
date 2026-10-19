// Sahil's demo feedback (04/10, point b; wording 05/10): work may be unassigned,
// and the app says so gently. End-to-end through the REAL plugin bundle, proxy and backend
// (disposable data), project payments-relaunch:
// - the create form offers "Unassigned" as a deliberate choice (still a choice:
//   the form will not submit until one is made) and explains what it means;
// - the Backlog names unassigned work; each name opens the item to fix it;
// - the details drawer and the Backlog's assignee cell can both unassign;
// - a notification says so, and resolves itself when the item is assigned;
// - the Dashboard counts it per project and opens that Backlog filtered.
// The test leaves its item assigned, so later tests see no alert.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { readFileSync } from 'node:fs'
import { CONSOLE_TABS, SWITCHER_WORDS } from './src/lib/panel-words.js'
// The words a person reads are read from the source module that renders them,
// never spelled out here: the panel stays translatable without touching this test.
const sourceText = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const rendered = (text, pattern, what) => {
  const found = text.match(pattern)
  if (!found) throw new Error(`src no longer renders ${what}`)
  return found[1]
}
const wordRe = (word) => new RegExp(String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const BOARD_SRC = sourceText('./src/views/backlog-board.js')
const DETAIL_SRC = sourceText('./src/work-item/detail.js')
const CHOOSE_ASSIGNEE = rendered(BOARD_SRC, /jsx\('option', \{ value: '', children: '([^']+)' \}, 'choose'\)/, 'the create-form assignee placeholder')
const UNSET_ASSIGNEE = rendered(BOARD_SRC, /jsx\('option', \{ value: UNASSIGNED, children: '([^']+)' \}, 'unassigned'\)/, 'the create-form unassigned option')
const NO_BOT_NOTE = rendered(BOARD_SRC, /'data-create-help': 'unassigned', children: '([^']+)'/, 'the unassigned create-form note')
const ALERT_PARTS = BOARD_SRC.match(/number\(unassigned\.length\)\} \$\{pluralRu\(unassigned\.length, '([^']+)', '([^']+)', '([^']+)'\)\}([^`]+)`/)
if (!ALERT_PARTS) throw new Error('src no longer renders the unassigned alert')
const UNASSIGNED_ALERT_SINGULAR = `1 ${ALERT_PARTS[1]}${ALERT_PARTS[4]}`
const UNASSIGNED_ALERT_TAIL = ALERT_PARTS[4].trim()
const ASSIGNEE_SELECT = rendered(DETAIL_SRC, /'aria-label': '([^']+)', value: draft\?\.assignee \?\? ''/, 'the drawer assignee select')
const UNSET_OPTION = rendered(DETAIL_SRC, /value: draft\?\.assignee \?\? ''[\s\S]*?jsx\('option', \{ value: '', children: '([^']+)' \}/, 'the drawer unassigned option')

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'payments-relaunch'
const TITLE = 'Write the refund runbook'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
const itemByTitle = async () => (await api(`/projects/${PROJECT}/work-items`)).work_items.find((item) => item.title === TITLE)
const unassignedNotes = async (ref) => (await api('/notifications?kind=unassigned_work')).notifications.filter((note) => note.ref === ref)
async function until(check, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

test('Unassigned: chosen on purpose, named on the Backlog and Dashboard, fixed from the drawer or the cell, notified and resolved', async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  let ref = null
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: SWITCHER_WORDS.context, exact: true }).click()
    await page.getByRole('combobox', { name: SWITCHER_WORDS.find }).fill(PROJECT)
    await page.getByRole('listbox', { name: SWITCHER_WORDS.list }).getByRole('option', { name: PROJECT, exact: true }).click()
    await page.locator('[data-tab="backlog"]').click()
    await page.locator(`[data-backlog-board="${PROJECT}"]`).waitFor()
    assert.equal(await page.locator('[data-unassigned-alert]').count(), 0, 'no alert while every open item is assigned')

    // Create: "Unassigned" is a choice you make; the form says what it means.
    await page.locator('[data-action="open-create-backlog-item"]').click()
    const owner = page.locator('[data-create-field="assignee"]')
    assert.deepEqual((await owner.locator('option').allInnerTexts()).slice(0, 2), [CHOOSE_ASSIGNEE, UNSET_ASSIGNEE])
    await page.locator('[data-create-field="title"]').fill(TITLE)
    await page.locator('[data-create-field="reason"]').fill('Support asks for it every week')
    assert.ok(await page.locator('[data-action="submit-create-backlog-item"]').isDisabled(), 'no silent default: an assignee choice is still needed')
    await owner.selectOption('__unassigned__')
    assert.match(await page.locator('[data-create-help="unassigned"]').innerText(), wordRe(NO_BOT_NOTE))
    await page.locator('[data-action="submit-create-backlog-item"]').click()
    await until(async () => Boolean(await itemByTitle()), 'the item was not created')
    const created = await itemByTitle()
    ref = created.ref
    assert.equal(created.assignee ?? null, null, 'created unassigned')
    await until(async () => (await unassignedNotes(ref)).length === 1, 'no notification for the new unassigned item')

    // The Backlog names it; the name opens the item; the drawer assigns it.
    const alert = page.locator(`[data-unassigned-alert="${PROJECT}"]`)
    await alert.waitFor()
    assert.match(await alert.innerText(), wordRe(UNASSIGNED_ALERT_SINGULAR))
    await alert.locator(`[data-unassigned-item="${ref}"]`).click()
    const drawer = page.locator(`[data-work-item-detail="${ref}"]`)
    await drawer.waitFor()
    assert.equal(await drawer.locator(`select[aria-label="${ASSIGNEE_SELECT}"] option`).first().innerText(), UNSET_OPTION)
    const bot = await drawer.locator(`select[aria-label="${ASSIGNEE_SELECT}"] option:not([disabled])`).nth(1).getAttribute('value')
    await drawer.locator(`select[aria-label="${ASSIGNEE_SELECT}"]`).selectOption(bot)
    await drawer.locator('[data-action="save-work-item"]').click()
    await until(async () => (await itemByTitle()).assignee === bot, 'the drawer did not assign it')
    await until(async () => (await unassignedNotes(ref)).every((note) => note.state === 'resolved'), 'assigning the item did not resolve its notification')
    assert.match((await unassignedNotes(ref))[0].resolution_note, new RegExp(`assigned: ${ref}`))
    await drawer.locator('[data-action="close-work-item-detail"]').click().catch(() => {})
    await alert.waitFor({ state: 'detached' })

    // The assignee cell can unassign it again: the alert and a new notification come back.
    await page.locator(`[data-backlog-item="${ref}"] [data-cell="assignee"]`).click()
    await page.locator(`[data-backlog-item="${ref}"] [data-cell-input="assignee"]`).selectOption('')
    await until(async () => ((await itemByTitle()).assignee ?? null) === null, 'the cell did not unassign it')
    await alert.waitFor()
    await until(async () => (await unassignedNotes(ref)).some((note) => note.state !== 'resolved'), 'unassigning raised no notification')

    // The Dashboard counts it per project and opens that Backlog, showing unassigned work.
    await page.locator('[data-tab="dashboard"]').click()
    const fleet = page.locator('[data-unassigned-alert="fleet"]')
    await fleet.waitFor()
    assert.match(await fleet.innerText(), wordRe(UNASSIGNED_ALERT_TAIL))
    await fleet.locator(`[data-unassigned-project="${PROJECT}"]`).click()
    await page.locator(`[data-backlog-board="${PROJECT}"]`).waitFor()
    assert.equal(await page.locator('[data-filter-field="assignee"]').inputValue(), '__unassigned__', 'the Backlog opens on unassigned work')
    assert.equal(await page.locator(`[data-backlog-item="${ref}"]`).count(), 1)
    assert.deepEqual(errors, [])
  } finally {
    if (ref) {
      // Leave it assigned: later tests expect no alert.
      await api(`/projects/${PROJECT}/work-items/${encodeURIComponent(ref)}/assign`, 'POST', { assignee_id: 'quan-bot' }).catch((error) => console.log(`# cleanup: ${error.message}`))
    }
    await browser.close()
  }
})
