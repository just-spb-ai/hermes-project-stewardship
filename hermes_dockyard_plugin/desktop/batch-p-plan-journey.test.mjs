// Batch P rendered journey: plan synthesis → document → backlog (NEW-3/D-P2),
// undo/redo, duplicate, marquee (P1 signed behaviours), through the real
// disposable backend with the shipped plugin bundle.
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { CANVAS_WORDS } from './src/lib/canvas-words.js'
import { SWITCHER_WORDS } from './src/lib/panel-words.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const { chromium } = await import('./browser-harness.mjs')
const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL

test('Batch P rendered journey: undo/duplicate/marquee + plan doc + backlog confirm', { timeout: 240000 }, async () => {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  let browser
  let page
  const errors = []
  try {
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
    page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'load' })
    await page.waitForSelector('[data-tab="dashboard"]', { timeout: 20000 })
    await page.getByRole('button', { name: SWITCHER_WORDS.context, exact: true }).click()
    await page.getByRole('combobox', { name: SWITCHER_WORDS.find }).fill('mobile-client')
    await page.getByRole('listbox', { name: SWITCHER_WORDS.list }).getByRole('option', { name: 'mobile-client', exact: true }).click()
    await page.waitForTimeout(500)
    await page.locator('[data-tab="project"]').click()
    await page.waitForSelector('[data-project-view="planning"]', { timeout: 20000 })
    await page.locator('[data-project-view="planning"]').click()
    const canvas = page.locator('[data-planning-canvas="mobile-client"]')
    await canvas.waitFor()
    // Two scratch objects + connector, save.
    await canvas.locator('[data-canvas-draft]').fill('Undo target note')
    await canvas.getByRole('button', { name: CANVAS_WORDS.addObject }).click()
    await canvas.locator('[data-canvas-draft]').fill('Plan seed requirement')
    await canvas.getByRole('button', { name: CANVAS_WORDS.addObject }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2)
    // Undo removes the second add; redo restores it.
    await canvas.getByRole('button', { name: CANVAS_WORDS.undo, exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 1)
    await canvas.getByRole('button', { name: CANVAS_WORDS.redo, exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 2)
    // Duplicate the selection through the toolbar.
    await canvas.locator('[data-canvas-object]').first().click()
    await canvas.getByRole('button', { name: CANVAS_WORDS.duplicate, exact: true }).click()
    assert.equal(await canvas.locator('[data-canvas-object]').count(), 3)
    // Marquee multi-select on empty stage.
    const stage = canvas.locator('[data-pc-stage]')
    const stageBox = await stage.boundingBox()
    // Shift+drag = selection box (plain drag moves the board).
    await page.keyboard.down('Shift')
    await page.mouse.move(stageBox.x + 5, stageBox.y + 5)
    await page.mouse.down()
    await page.mouse.move(stageBox.x + stageBox.width - 5, stageBox.y + Math.min(300, stageBox.height - 5), { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    const marqueeSelected = await canvas.locator('.dy-pc-obj.marquee-selected').count()
    assert.ok(marqueeSelected >= 1, 'marquee selected at least one card')
    await canvas.getByRole('button', { name: CANVAS_WORDS.saveCanvas }).click()
    await page.waitForTimeout(300)
    assert.match(await canvas.innerText(), new RegExp(CANVAS_WORDS.canvasSaved))
    // Curate → answer → proposal lands (fake provider synthesises a plan).
    await canvas.getByRole('button', { name: CANVAS_WORDS.curate }).click()
    await page.waitForTimeout(400)
    const questionVisible = await canvas.locator('[data-canvas-question]').count()
    if (questionVisible) {
      await canvas.locator('[data-canvas-question] textarea').fill('The plan must keep the safe import preview.')
      await canvas.getByRole('button', { name: CANVAS_WORDS.answer }).click()
      await page.waitForTimeout(400)
    }
    const proposalCount = await canvas.locator('[data-canvas-proposal]').count()
    assert.ok(proposalCount >= 1, 'at least one proposal drafted')
    // Approve every pending proposal; a technical_plan approval enables Plan.
    const approvals = canvas.getByRole('button', { name: CANVAS_WORDS.approve, exact: true })
    while (await approvals.count()) {
      await approvals.first().click()
      await page.waitForTimeout(300)
    }
    // Plan from the approved technical_plan proposal.
    const planButton = canvas.getByRole('button', { name: CANVAS_WORDS.planFromProposal })
    // Not optional: without an approved technical plan the P2 steps below never run.
    assert.ok(await planButton.count() >= 1, 'an approved technical_plan proposal offers Plan from proposal')
    {
      await planButton.first().click()
      await page.waitForTimeout(500)
      const planCard = canvas.locator('[data-canvas-plan]')
      await planCard.waitFor({ timeout: 10000 })
      assert.match(await planCard.innerText(), new RegExp(CANVAS_WORDS.planReady))
      // Save the implementation document to the Content tab (D-P2).
      await planCard.getByRole('button', { name: CANVAS_WORDS.saveDocToContent }).click()
      await page.waitForTimeout(500)
      assert.match(await canvas.innerText(), new RegExp(CANVAS_WORDS.documentSavedNotice))
      // Saving is one-shot: the button locks so a second click cannot upload a duplicate.
      const savedDoc = planCard.getByRole('button', { name: CANVAS_WORDS.docSavedToContent })
      assert.equal(await savedDoc.isDisabled(), true, 'saved doc button must lock')
      // Backlog creation is explicit and confirm-gated. Not optional: the step must run.
      const backlogButton = planCard.getByRole('button', { name: CANVAS_WORDS.createBacklogItems })
      assert.equal(await backlogButton.isEnabled(), true, 'backlog button must unlock once the doc is saved')
      await backlogButton.click()
      const confirmCard = canvas.locator('[data-canvas-backlog-confirm]')
      await confirmCard.waitFor({ timeout: 10000 })
      assert.equal(await backlogButton.isDisabled(), true, 'backlog button locks while the confirm is open')
      await confirmCard.getByRole('button', { name: CANVAS_WORDS.confirmCreate }).click()
      await page.waitForTimeout(500)
      assert.match(await canvas.innerText(), new RegExp(CANVAS_WORDS.backlogCreatedNotice))
      const doneButton = planCard.getByRole('button', { name: CANVAS_WORDS.backlogItemsCreated })
      assert.equal(await doneButton.isDisabled(), true, 'a created backlog cannot be created twice')
    }
    assert.deepEqual(errors, [], errors.join('\n'))
  } catch (failure) {
    const shot = path.join(os.tmpdir(), 'batchp-journey-failure.png')
    try { await page.screenshot({ path: shot, fullPage: true }); console.error(`failure screenshot: ${shot}`) } catch {}
    throw failure
  } finally {
    await browser?.close()
  }
})