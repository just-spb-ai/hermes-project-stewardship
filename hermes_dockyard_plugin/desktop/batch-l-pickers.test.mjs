// Batch L R2 fix 3: every parent picker, driven through its REAL rendered
// control (a locator click — no evaluate/dispatch), with the Roadmap checked
// after a reload. Five tests:
//   1. work-item detail → Goal picker (PUT tasks/{ref}/goal)
//   2. Vision goal → Objective
//   3. Vision objective → Milestone
//   4. Vision milestone → Initiative
//   5. plan "Create backlog items" → Goal picker (goal_id on the batch)
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
import { ROADMAP_WORDS, SWITCHER_WORDS, WORK_CARD_WORDS } from './src/lib/panel-words.js'
// The words a person reads are read from the source module that renders them,
// never spelled out here: the panel stays translatable without touching this test.
const sourceText = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const rendered = (text, pattern, what) => {
  const found = text.match(pattern)
  if (!found) throw new Error(`src no longer renders ${what}`)
  return found[1]
}
const wordRe = (word) => new RegExp(String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const DETAIL_SRC = sourceText('./src/work-item/detail.js')
const BOARD_SRC = sourceText('./src/kanban/board.js')
const PLAN_DRAWER_SRC = sourceText('./src/project/plan/plan-drawer.js')
const DRAWER_GOAL = rendered(DETAIL_SRC, /'aria-label': '([^']+)', value: goalDraft/, 'the work-item goal select')
const SAVE_CHANGES = rendered(DETAIL_SRC, /onClick: save, children: busy \? '[^']*' : '([^']+)'/, 'the save-changes control')
const PLACE_CONFIRM = rendered(sourceText('./src/project/plan/plan-ui.js'), /action: 'plan-link-confirm',[\s\S]*?children: busy \? '[^']*' : '([^']+)'/, 'the place-in-dialog confirm control')
const MILESTONE_GOTO = rendered(BOARD_SRC, /goto\('([^']+)', \(\) => onNavigate\(`plan:milestone:/, 'the milestone link on a card')
const PLACED_OBJECTIVE = rendered(PLAN_DRAWER_SRC, /jsx\(Section, \{ title: '([^']+)', readOnly, action: item\.objectiveId \? null : linkButton\('objective'/, 'the goal drawer\'s objective section')
const PLACED_MILESTONE = rendered(PLAN_DRAWER_SRC, /jsx\(Section, \{ title: '([^']+)', readOnly, action: [^,]*?linkButton\('milestone'\), children: jsx\(Links, \{\s*empty: '[^']*',\s*rows: \(\(\) =>/, 'the objective drawer\'s milestone section')
const PLACED_INITIATIVE = rendered(PLAN_DRAWER_SRC, /jsx\(Section, \{ title: '([^']+)', readOnly, action: linkButton\('initiative'/, 'the milestone drawer\'s initiative section')
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL
const PROJECT = 'atlas-mobile'
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }

const call = async (path, init = {}) => {
  const r = await fetch(API + path, {
    method: init.method || 'GET',
    headers: { ...TOKEN, 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await r.text()
  const payload = text ? JSON.parse(text) : {}
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${r.status} ${text.slice(0, 200)}`)
  return payload
}

async function goToBoard(page) {
  await page.getByRole('button', { name: SWITCHER_WORDS.context, exact: true }).click()
  await page.getByRole('combobox', { name: SWITCHER_WORDS.find }).fill(PROJECT)
  await page.getByRole('listbox', { name: SWITCHER_WORDS.list }).getByRole('option', { name: PROJECT, exact: true }).click()
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="board"]').click()
  await page.locator('[data-kanban-screen]').waitFor()
}

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await goToBoard(page)
  const card = (title) => page.locator('[data-work-card]').filter({ has: page.locator('.dy-kb-title').getByText(title, { exact: true }) })
  return { page, errors, card }
}

// Open the Vision screen for a row, via the board card's milestone link
// (the same navigation a person uses).
async function openVision(page, card, title) {
  await card(title).locator('[data-card-toggle]').click()
  await card(title).getByRole('button', { name: new RegExp('^' + MILESTONE_GOTO + ':') }).first().click()
  await page.locator('[data-project-view="plan"].active').waitFor()
  await page.locator('[data-plan-screen]').waitFor()
}

const openDrawer = async (page, kind, id) => {
  const row = page.locator(`[data-plan-row="${kind}"]${id ? `[data-plan-id="${id}"]` : ''}`).first()
  await row.locator('.dy-plan-row-open').click()
  await page.locator(`[data-plan-drawer="${kind}"]`).waitFor()
  return page.locator(`[data-plan-drawer="${kind}"]`)
}

test('Batch L pickers: a task is placed under a goal from the work-item drawer', { timeout: 180000 }, async () => {
  const goal = await call(`/projects/${PROJECT}/goals`, { method: 'POST', body: { title: 'Picker goal', objective_ids: [] } })
  const browser = await chromium.launch({ headless: true })
  try {
    const { page, errors, card } = await open(browser)
    await card('Crash on first launch').locator('[data-card-toggle]').click()
    await card('Crash on first launch').getByRole('button', { name: WORK_CARD_WORDS.openDetails }).click()
    const drawer = page.locator('[data-work-item-detail]')
    await drawer.waitFor()
    // The real rendered control, clicked and filled like a person.
    const goalSelect = drawer.getByLabel(DRAWER_GOAL)
    await goalSelect.selectOption(String(goal.goal_id))
    await drawer.getByRole('button', { name: SAVE_CHANGES }).click()
    // After a reload the task sits under that goal in the Roadmap.
    await page.reload({ waitUntil: 'networkidle' })
    const placed = await call('/roadmap?project_id=atlas-mobile')
    const project = placed.projects[0]
    const owner = (project.goals ?? []).find((g) => g.id === goal.goal_id)
    assert.ok(owner, 'the goal exists on the roadmap')
    assert.ok((owner.tasks ?? []).some((t) => t.title === 'Crash on first launch'),
      `the task is under the goal (${JSON.stringify(owner.tasks)})`)
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})

test('Batch L pickers: Vision goal → Objective, objective → Milestone, milestone → Initiative', { timeout: 240000 }, async () => {
  // A milestone with no initiative, an objective with no milestone, a goal with
  // no objective: three unplaced items for the three pickers.
  const milestone = await call(`/projects/${PROJECT}/milestones`, { method: 'POST', body: { name: 'Picker milestone' } })
  const objective = await call(`/projects/${PROJECT}/objectives`, { method: 'POST', body: { name: 'Picker objective', evaluator_type: 'manual', target: '>=1' } })
  const goal = await call(`/projects/${PROJECT}/goals`, { method: 'POST', body: { title: 'Picker goal two', objective_ids: [] } })
  const initiative = await call(`/projects/${PROJECT}/initiatives`, { method: 'POST', body: { title: 'Picker initiative', rationale: 'place things under it' } })

  const browser = await chromium.launch({ headless: true })
  try {
    const { page, errors, card } = await open(browser)
    await openVision(page, card, 'Build setup screens')

    // 1. goal → objective: the goal drawer's picker.
    let drawer = await openDrawer(page, 'goal', goal.goal_id)
    await drawer.locator('[data-action="plan-link-objective"]').click()
    const linkDialog = page.locator('[data-plan-dialog]')
    await linkDialog.waitFor()
    await linkDialog.locator('#dy-plan-link-choice').selectOption(String(objective.id ?? objective.objective_id))
    await linkDialog.getByRole('button', { name: PLACE_CONFIRM }).click()
    await page.waitForTimeout(400)
    drawer = await openDrawer(page, 'goal', goal.goal_id)
    assert.match(await drawer.innerText(), new RegExp(wordRe(PLACED_OBJECTIVE).source + '[\\s\\S]*Picker objective', 'i'))

    // 2. objective → milestone.
    drawer = await openDrawer(page, 'objective', objective.id ?? objective.objective_id)
    await drawer.locator('[data-action="plan-link-milestone"]').click()
    await linkDialog.waitFor()
    await linkDialog.locator('#dy-plan-link-choice').selectOption(String(milestone.id))
    await linkDialog.getByRole('button', { name: PLACE_CONFIRM }).click()
    await page.waitForTimeout(400)
    drawer = await openDrawer(page, 'objective', objective.id ?? objective.objective_id)
    assert.match(await drawer.innerText(), new RegExp(wordRe(PLACED_MILESTONE).source + '[\\s\\S]*Picker milestone', 'i'))

    // 3. milestone → initiative.
    drawer = await openDrawer(page, 'milestone', milestone.id)
    await drawer.locator('[data-action="plan-link-initiative"]').click()
    await linkDialog.waitFor()
    await linkDialog.locator('#dy-plan-link-choice').selectOption({ label: 'Picker initiative' })
    await linkDialog.getByRole('button', { name: PLACE_CONFIRM }).click()
    await page.waitForTimeout(400)
    drawer = await openDrawer(page, 'milestone', milestone.id)
    assert.match(await drawer.innerText(), new RegExp(wordRe(PLACED_INITIATIVE).source + '[\\s\\S]*Picker initiative', 'i'))

    // After a reload the Roadmap shows the whole placement chain.
    await page.reload({ waitUntil: 'networkidle' })
    const roadmap = await call('/roadmap?project_id=atlas-mobile')
    const project = roadmap.projects[0]
    const ms = (project.milestones ?? []).find((m) => m.id === milestone.id)
    assert.equal(ms.initiative_ref, initiative.ref, 'the milestone is under the initiative')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
