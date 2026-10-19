// A Hermes profile without the plugin's backend (a second profile,
// 10/10/2026): the sidebar still offers Project Stewardship, and every call to
// the backend gets the host's 404 {"detail": "Plugin not found"}. The page used
// to show the red error card with "404: Plugin not found". Owner decision
// 11/10/2026: show a plain "not switched on for this profile" state with how to
// switch it on, and load normally once it is on.
//
// The host's answer is replayed in the browser for every plugin route, as the
// real host gives it, so no backend state changes.
//
// The words a person reads are not spelled out here: the modules that render
// them publish them (data/plugin-off.js for the "switched off" panel, lib/ui.js
// for the error card), and this journey reads them, so the panel stays
// translatable without touching the test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { PLUGIN_OFF_TITLE, PLUGIN_OFF_COMMAND, PLUGIN_OFF_NEXT_STEP } from './src/data/plugin-off.js'
import { FLEET_SUMMARY, all, one } from './test-support/src-words.mjs'

const BASE = process.env.STEWARD_DESKTOP_URL
const ROUTES = '**/api/plugins/hermes-project-stewardship/**'
const TITLE = PLUGIN_OFF_TITLE
const COMMAND = PLUGIN_OFF_COMMAND
const retry = all('src/lib/ui.js', /action: 'retry'[^}]*children: '([^']+)'/)
assert.equal(new Set(retry).size, 1, 'the one retry button word')
const TRY_AGAIN = retry[0]
// The error card's own heading, for any failure that is not the plugin being off.
const ERROR_CARD = one('src/lib/ui.js', /data-state': 'error'[\s\S]*?jsx\('h2', \{ children: '([^']+)' \}\)/)
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const pluginNotFound = (route) => route.fulfill({
  status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Plugin not found' }),
})

test('a profile without the plugin says how to switch it on, then loads once it is on', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(8000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.route(ROUTES, pluginNotFound)
    await page.goto(BASE)

    const panel = page.locator('[data-state="plugin-off"]')
    await panel.waitFor()
    assert.equal(await page.getByRole('heading', { name: TITLE }).count(), 1)
    assert.equal(await page.locator('[data-plugin-off-command]').innerText(), COMMAND)
    assert.match(await panel.innerText(), new RegExp(escape(PLUGIN_OFF_NEXT_STEP)))
    // None of the failure words: no red card, no status code, no host message.
    assert.equal(await page.getByRole('heading', { name: ERROR_CARD }).count(), 0)
    assert.doesNotMatch(await page.locator('body').innerText(), new RegExp(`\\b404\\b|Plugin not found|${escape(ERROR_CARD)}`))

    // Switched on: Try again loads the real page.
    await page.unroute(ROUTES, pluginNotFound)
    await page.getByRole('button', { name: TRY_AGAIN }).click()
    await page.locator(`section[aria-label="${FLEET_SUMMARY}"]`).waitFor()
    assert.equal(await panel.count(), 0)
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('any other failure still shows the error card', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(8000)
    // A 404 with another reason is not the plugin being off.
    await page.route(ROUTES, (route) => route.fulfill({
      status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not Found' }),
    }))
    await page.goto(BASE)
    await page.getByRole('heading', { name: ERROR_CARD }).waitFor()
    assert.equal(await page.locator('[data-state="plugin-off"]').count(), 0)
  } finally {
    await browser.close()
  }
})
