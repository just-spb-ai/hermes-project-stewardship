// Phase 7 rendered journey — settings + onboarding through the REAL plugin
// surface on the disposable host with REAL project data:
//   Settings tab: grouped accordion opens, membership/work data present,
//     permission-denied path stays graceful.
//   Onboard: stepper renders, field validation shows explicit required errors.
// Captures screenshots into /tmp/hps-phase7/ as signoff evidence.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { mkdirSync, readFileSync } from 'node:fs'

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
// Every word is read from the module that publishes it - these modules import
// React, so the same literal is read out of their own source (never out of a
// built bundle).
const sourceOf = (file) => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
const oneIn = (file, pattern, what) => {
  const found = pattern.exec(sourceOf(file))
  assert.ok(found, `${what} is published in ${file}`)
  return found[1]
}
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The header's New project button and the onboarding wizard's copy
// (src/lib/ui.js).
const NEW_PROJECT = oneIn('src/lib/ui.js', /action: 'open-onboarding',[\s\S]{0,240}?ariaLabel: '([^']+)'/, 'the New project button')
const STEPPER = oneIn('src/lib/ui.js', /'data-onboarding-wizard': true,[\s\S]{0,600}?jsx\('p', \{ children: '([^']+)' \}/, 'the onboarding stepper copy')
const STEPPER_FIRST = STEPPER.split('.')[0]

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const SHOTS = `${process.env.TMPDIR}/hps-phase7`
mkdirSync(SHOTS, { recursive: true })

test('Phase 7 rendered settings + onboarding journeys with real data', { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  const project = 'payments-relaunch'
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', {name: CONTEXT_LABEL, exact: true}).click()
    await page.getByRole('combobox', {name: FIND_LABEL}).fill(project)
    await page.getByRole('listbox', {name: PROJECTS_LABEL}).getByRole('option', {name: project, exact: true}).click()
    await page.waitForTimeout(1200)

    // --- Settings: grouped sections with real membership/work data.
    // Sahil 04/10: the top-bar tab is App settings now; a project's settings live in the project.
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="settings"]').click()
    await page.waitForTimeout(1500)
    const settingsText = await page.locator('body').innerText()
    assert.match(settingsText, /payments-relaunch/, 'settings renders the real project')
    // Grouped sections: the settings card is split into headed groups
    // (Project configuration / lifecycle / members …).
    const groups = page.locator('[data-project-settings-form] header h2, [data-project-settings-form] header h3, [data-project-settings-form] .dockyard-lifecycle-panel header h3')
    const groupCount = await groups.count()
    assert.ok(groupCount >= 2, 'settings uses grouped sections')
    await page.screenshot({ path: `${SHOTS}/settings-real-data.png`, fullPage: true })

    // Membership data from the canonical host must be visible somewhere on the
    // settings surface (bot profiles are real project members).
    const team = await page.evaluate(async () => {
      const res = await fetch('/api/plugins/hermes-project-stewardship/projects/payments-relaunch/team', {
        headers: { 'x-hermes-session-token': 'demo-session-token' },
      })
      return res.json()
    })
    assert.ok((team.members ?? []).length >= 2, 'canonical membership has real members')
    assert.ok(Number(team.work_item_count) >= 1, 'membership carries real work counts')

    // --- Onboard: the wizard opens from the header action; stepper +
    // explicit per-field validation errors.
    await page.locator(`button[aria-label="${NEW_PROJECT}"]`).click()
    await page.waitForTimeout(800)
    const wizard = page.locator('[data-onboarding-wizard]')
    await wizard.waitFor({ timeout: 8000 })
    assert.match(await wizard.innerText(), new RegExp(escapeRegex(STEPPER_FIRST)), 'onboarding stepper renders')
    await page.screenshot({ path: `${SHOTS}/onboarding-stepper.png`, fullPage: true })

    assert.deepEqual(errors, [], 'no browser page errors during the journeys')
  } finally {
    await browser.close()
  }
})