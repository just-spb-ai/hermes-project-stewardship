import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { chromium } from './browser-harness.mjs'

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

// The Dashboard heading (dashboard.js), the project screen's name and the
// switch dialog's buttons (dashboard-page.js) and the settings edit action
// (panels.js): all three import React, so their own source is read.
const COMMAND_CENTER = oneIn('src/views/dashboard.js', /className: 'dockyard-command',[\s\S]{0,300}?jsx\('h1', \{ children: '([^']+)' \}/, 'the Dashboard heading')
const PROJECT_SCREEN = oneIn('src/shell/dashboard-page.js', /ONE_PROJECT_TABS = Object\.freeze\(\{ project: '([^']+)'/, "the project screen's name")
const EDIT_CONFIG = oneIn('src/project/panels.js', /action: 'edit-project-settings'[\s\S]{0,200}?children: '([^']+)'/, 'the Edit configuration button')
const NAV_CANCEL = oneIn('src/shell/dashboard-page.js', /action: 'nav-cancel'[\s\S]{0,200}?children: '([^']+)'/, 'the Cancel button')
const NAV_DISCARD = oneIn('src/shell/dashboard-page.js', /action: 'nav-discard'[\s\S]{0,200}?children: '([^']+)'/, 'the Discard button')
// The Dashboard's four metric cards, by the labels the module renders. The
// data-metric hook is derived from the label (dashboard.js: label -> slug), so
// with Russian labels it carries no Latin letters and says nothing; the labels
// themselves are the words the module publishes.
const METRIC_LABELS = [...sourceOf('src/views/dashboard.js').matchAll(/metric\('([^']+)'/g)].map((match) => match[1])
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const API = process.env.STEWARD_API_URL || 'http://127.0.0.1:19500/api/plugins/hermes-project-stewardship'
// Sahil 05/10: the Onboard tab became the "Onboard existing project" button beside New project.
const tabs = ['dashboard','project','roadmap','backlog','workflows','inbox','notifications','settings']
test('Phase 3 rendered Desktop: scope isolation, dirty switching, keyboard and narrow layout', {timeout:120000}, async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const picker=page.getByRole('button',{name:CONTEXT_LABEL,exact:true});
 const select=async(id)=>{await picker.click();await page.getByRole('combobox',{name:FIND_LABEL}).fill(id);await page.getByRole('listbox',{name:PROJECTS_LABEL}).getByRole('option',{name:id,exact:true}).click()};
 try {
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:COMMAND_CENTER,exact:true}).waitFor();
  assert.deepEqual(await page.locator('[data-tab]').evaluateAll(els=>els.map(e=>e.dataset.tab)),tabs);
  assert.equal(await picker.count(),1);
  // Dashboard metric strip is rendered from real backend data (restored check).
  assert.deepEqual(await page.locator('[data-metric] .dockyard-command-metric-label').evaluateAll(els=>els.map(e=>e.textContent.trim())),METRIC_LABELS);
  // The metric must reflect the real number of seeded fixture projects (not a
  // hard-coded count), so the check stays true when a batch adds a fixture project.
  const seeded = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/projects`, { headers: { 'x-hermes-session-token': 'demo-session-token' } })
    return (await res.json()).projects.length
  }, API)
  assert.equal(await page.locator('[data-metric]').filter({hasText:METRIC_LABELS[0]}).locator('strong').innerText(), String(seeded));
  assert.match(await page.locator('body').innerText(),/payments-relaunch/);
  assert.equal(await page.locator('[data-tab="dashboard"]').getAttribute('aria-selected'),'true');
  await page.locator('[data-tab="dashboard"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.tab),'project');
  // Sahil 05/10: the app opens on All projects, so Projects asks for one first.
  await page.locator(`[data-project-chooser="${PROJECT_SCREEN}"]`).waitFor();
  assert.equal(await page.locator('[data-tab="project"]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-tab="dashboard"]').getAttribute('aria-selected'),'false');
  await select('payments-relaunch');
  await page.locator('[data-project-dashboard="payments-relaunch"]').waitFor();
  // Delay a genuine earlier response; do not synthesize project data.
  await page.route('**/projects/mobile-client/settings',async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,700));await route.fulfill({response})});
  await select('mobile-client');await select('payments-relaunch');
  await page.waitForTimeout(1000);
  await page.locator('[data-project-dashboard="payments-relaunch"]').waitFor();
  await page.locator('[data-project-view="settings"]').click();
  await page.getByRole('button',{name:new RegExp(escapeRegex(EDIT_CONFIG))}).click();
  await page.locator('[data-setting-field="mission"]').fill('Unsaved browser verification change');
  await select('mobile-client');
  await page.locator('[data-project-switch-confirm]').getByRole('button',{name:NAV_CANCEL,exact:true}).click();
  assert.match(await picker.innerText(),/payments-relaunch/);
  assert.equal(await page.locator('[data-setting-field="mission"]').inputValue(),'Unsaved browser verification change');
  await select('mobile-client');
  await page.locator('[data-project-switch-confirm]').getByRole('button',{name:NAV_DISCARD,exact:true}).click();
  await page.locator('[data-project-dashboard="mobile-client"]').waitFor();
  assert.match(await picker.innerText(),/mobile-client/);
  const root=page.locator('.dockyard-root');
  const styles=await root.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,font:s.fontFamily}});
  assert.notEqual(styles.bg,'rgba(0, 0, 0, 0)');assert.notEqual(styles.color,'rgba(0, 0, 0, 0)');assert.ok(!styles.font.includes('Times New Roman'));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  assert.ok((await root.boundingBox()).width<=390,'root must fit a 390px viewport');
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth+1),true);
  assert.ok(await page.locator('[data-tab="dashboard"]').isVisible());
  assert.ok(await picker.isVisible(),'project picker must stay reachable at narrow width');
  await select('payments-relaunch');await page.locator('[data-tab="dashboard"]').click();
  await page.getByRole('heading',{name:COMMAND_CENTER,exact:true}).waitFor();
  assert.ok(await page.locator('[data-project-row="payments-relaunch"]').count());
  assert.deepEqual(errors,[]);
 } finally {await browser.close()}
})
