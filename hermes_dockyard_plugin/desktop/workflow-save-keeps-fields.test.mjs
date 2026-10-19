// Workflows data-loss regressions (06/10/2026, HPS-Audit WORKFLOWS-R1.md).
//   Bug 1: every canvas save path (+ Step, + Gate, moving a step, linking two
//   steps, the step editor, Auto layout) rebuilt each step from a fixed list
//   of fields, so a single edit wiped a step's loop, its condition and its
//   instructions. Each path must keep every field it does not change.
//   Bug 2: the side form posted a one-step version whenever its name matched
//   an existing workflow, which replaced the whole workflow. It only creates.
// Real disposable backend (run-browser-suite.mjs). The proof is the stored
// version read back from the API, not what the screen shows.
import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { rememberedProject, restoreRememberedProject } from './test-support/project-scope.mjs'

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
// Every word is read from the module that publishes it. React-free modules are
// imported; for the ones that import React the same literal is read out of that
// module's own source (never out of a built bundle).
const sourceOf = (file) => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
const oneIn = (file, pattern, what) => {
  const found = pattern.exec(sourceOf(file))
  assert.ok(found, `${what} is published in ${file}`)
  return found[1]
}
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// A line a module builds: the literal parts are kept and each ${...} hole is a
// value the test knows, or a wildcard when the test passes null.
const sentence = (template, ...values) => new RegExp(template.split(/\$\{[^}]*\}/)
  .map((part, index) => escapeRegex(part) + (index < values.length ? (values[index] === null ? '[\\s\\S]*' : escapeRegex(String(values[index]))) : ''))
  .join(''))

// The step panel's labels come from the hooks the canvas builds; the New
// workflow dialog's "that name is taken" line from its own module.
import { canvasDesignHooks } from './src/project/workflow-design/step-settings.js'
const STEP = canvasDesignHooks({ draft: false, members: [], storedNode: (id) => ({ id, title: id }), settingsKey: (id) => ['keep-fields', id], onEditFrame: () => {} })
const STEP_NAME = STEP.labels.title
const SAVE_VERSION = STEP.labels.save
const NAME_TAKEN = new RegExp(oneIn('src/project/workflow-design/start-dialog.js', /takenNames\.includes\(clean\) \? `([^`]+)`/, 'the name-taken error').split(/\$\{[^}]*\}/).map(escapeRegex).join('.*'))

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

const BASE = process.env.STEWARD_DESKTOP_URL
const API = process.env.STEWARD_API_URL
const TOKEN = { 'x-hermes-session-token': 'demo-session-token' }
const PROJECT = 'payments-relaunch'

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, { method, headers: { ...TOKEN, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}
const versionsOf = async (name) => (await api(`/projects/${PROJECT}/workflows`)).workflows.filter((row) => row.name === name)
async function until(check, message) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  assert.fail(message)
}

// Instructions on three steps, a step that loops, a step that only runs on a
// condition, and a human gate. The canvas manages none of body, loop or when.
const RICH = [
  { id: 'build', title: 'Build it', depends_on: [], body: 'Write the feature from the brief' },
  { id: 'test', title: 'Test it', depends_on: ['build'], body: 'Run the suite and report failures', loop: { max_iterations: 5, until: { status: 'done' } } },
  { id: 'fix', title: 'Fix failures', depends_on: ['test'], body: 'Fix what the tests reported', when: { node: 'test', status: 'blocked' } },
  { id: 'ship', title: 'Approve release', depends_on: ['test'], human_gate: true },
]
const UNMANAGED = { build: ['body'], test: ['body', 'loop'], fix: ['body', 'when'] }
const byId = (version) => Object.fromEntries(version.definition.nodes.map((node) => [node.id, node]))
const nodeIn = (page, name, id) => page.locator(`[data-workflow-canvas="${name}"] g.dy-wf-node[data-node-id="${id}"]`)

async function openWorkflow(page, name, runsInFlight) {
  await page.goto(BASE)
  await pickProject(page, PROJECT)
  await page.locator('[data-tab="project"]').click()
  await page.locator('[data-project-view="workflows"]').click()
  await page.locator(`[data-workflow-library-item="${name}"]`).click()
  await nodeIn(page, name, 'build').waitFor()
  // The screen rebuilds the canvas each time a workflow's runs arrive, and
  // opening one fetches them twice (WORKFLOWS-R1.md finding 13, fixed
  // separately). Act only once no runs request is pending and the step has
  // stayed the same element for 300 ms, so these tests measure saving and not
  // that rebuild. Under load the rebuild raced the drag (gate ee2b720 run 1).
  const step = `[data-workflow-canvas="${name}"] g.dy-wf-node[data-node-id="build"]`
  await until(async () => runsInFlight.size === 0 && page.evaluate((selector) => {
    const element = document.querySelector(selector)
    const watch = window.__settle ?? (window.__settle = {})
    if (!element || watch.element !== element) { watch.element = element; watch.since = performance.now(); return false }
    return performance.now() - watch.since >= 300
  }, step), 'the canvas never settled after opening the workflow')
}

async function withRichWorkflow(slug, run) {
  assert.ok(BASE && API, 'Run via run-browser-suite.mjs')
  const name = `keep-${slug}-${Date.now()}`
  await api(`/projects/${PROJECT}/workflows`, 'POST', { name, nodes: RICH })
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(8000)
    const runsInFlight = new Set()
    const isRuns = (request) => request.url().includes(`/workflows/${name}/runs`)
    page.on('request', (request) => { if (isRuns(request)) runsInFlight.add(request) })
    page.on('requestfinished', (request) => runsInFlight.delete(request))
    page.on('requestfailed', (request) => runsInFlight.delete(request))
    await openWorkflow(page, name, runsInFlight)
    await run(page, name)
  } finally { await browser.close() }
}

let remembered = null
before(async () => { if (API) remembered = await rememberedProject(API, TOKEN) })
after(async () => { if (API) await restoreRememberedProject(API, TOKEN, remembered) })

const SAVE_PATHS = [
  { label: 'the + Step button', slug: 'step',
    act: (page) => page.locator('[data-action="wf-add-step"]').click(),
    applied: (nodes) => Boolean(nodes['step-5']) },
  { label: 'the + Gate button', slug: 'gate',
    act: (page) => page.locator('[data-action="wf-add-gate"]').click(),
    applied: (nodes) => nodes['gate-5']?.human_gate === true },
  { label: 'moving a step', slug: 'move',
    act: async (page, name) => {
      // Raw mouse moves do not scroll, and the canvas starts below the fold at
      // 900 px tall: centre it first, or the press lands outside the window.
      await page.locator(`[data-workflow-canvas="${name}"]`).evaluate((el) => el.scrollIntoView({ block: 'center' }))
      const box = await nodeIn(page, name, 'build').boundingBox()
      await page.mouse.move(box.x + 40, box.y + 20)
      await page.mouse.down()
      await page.mouse.move(box.x + 40, box.y + 140, { steps: 15 })
      await page.mouse.up()
    },
    applied: (nodes) => nodes.build.canvas_position != null },
  { label: 'linking two steps', slug: 'link',
    act: async (page, name) => {
      await page.locator(`[data-workflow-canvas="${name}"]`).evaluate((el) => el.scrollIntoView({ block: 'center' }))
      const from = await page.locator(`[data-workflow-canvas="${name}"] [data-connect-from="build"]`).boundingBox()
      const to = await nodeIn(page, name, 'ship').boundingBox()
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
      await page.mouse.down()
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
      await page.mouse.up()
    },
    applied: (nodes) => nodes.ship.depends_on.includes('build') },
  { label: 'the step editor', slug: 'edit',
    act: async (page, name) => {
      // One click selects a step; a double-click opens it (07/10/2026).
      await nodeIn(page, name, 'fix').dblclick()
      await page.getByLabel(STEP_NAME).fill('Fix what failed')
      await page.getByRole('button', { name: SAVE_VERSION, exact: true }).click()
    },
    applied: (nodes) => nodes.fix.title === 'Fix what failed' },
  { label: 'the Auto layout button', slug: 'layout',
    act: (page) => page.locator('[data-action="wf-auto-layout"]').click(),
    applied: () => true },
]

for (const path of SAVE_PATHS) {
  test(`Workflows: ${path.label} keeps each step's loop, condition and instructions`, { timeout: 90000 }, async () => {
    await withRichWorkflow(path.slug, async (page, name) => {
      const before = (await versionsOf(name)).length
      await path.act(page, name)
      await until(async () => (await versionsOf(name)).length > before, `${path.label} did not save a new version`)
      const nodes = byId((await versionsOf(name)).at(-1))
      assert.ok(path.applied(nodes), `${path.label} saved a version without its own change`)
      const lost = []
      for (const [id, fields] of Object.entries(UNMANAGED)) {
        const original = RICH.find((node) => node.id === id)
        for (const field of fields) {
          const stored = nodes[id]?.[field] ?? null
          if (JSON.stringify(stored) !== JSON.stringify(original[field])) lost.push(`${id}.${field} is now ${JSON.stringify(stored)}`)
        }
      }
      assert.deepEqual(lost, [], `${path.label} changed fields it does not manage`)
    })
  })
}

// WORKFLOWS-R1.md bug 2 (06/10/2026): creating with a taken name posted a one-step version over
// the existing workflow. The side form went with the builder (07/10/2026); the New workflow
// dialog must hold the same line.
test('Workflows: New workflow never overwrites an existing workflow, and a new name still creates one', { timeout: 90000 }, async () => {
  await withRichWorkflow('form', async (page, name) => {
    const versionPosts = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith(`/workflows/${name}/versions`)) versionPosts.push(request.url())
    })
    const before = (await versionsOf(name)).length
    await page.locator('[data-action="wfd-new-workflow"]').click()
    await page.locator('[data-wfd-scope="project"]').click()
    await page.locator('[data-wfd-way="blank"]').click()
    await page.locator('[data-wfd-name]').fill(name)
    await page.locator('[data-wfd-first-step]').fill('Another phase')
    await page.locator('[data-action="wfd-create"]').click()
    await page.waitForTimeout(1500)
    const after = await versionsOf(name)
    assert.equal(after.at(-1).definition.nodes.length, RICH.length, `New workflow replaced the workflow's ${RICH.length} steps with ${after.at(-1).definition.nodes.length}`)
    assert.deepEqual(versionPosts, [], 'New workflow posted a version over an existing workflow')
    assert.equal(after.length, before, 'New workflow saved a version over an existing workflow')
    assert.match(await page.locator('[data-wfd-name-error]').innerText(), NAME_TAKEN)
    const fresh = `${name}-new`
    await page.locator('[data-wfd-name]').fill(fresh)
    await page.locator('[data-action="wfd-create"]').click()
    await until(async () => (await versionsOf(fresh)).length === 1, 'a new name did not create a workflow')
    assert.equal((await versionsOf(fresh))[0].definition.nodes[0].title, 'Another phase')
  })
})
