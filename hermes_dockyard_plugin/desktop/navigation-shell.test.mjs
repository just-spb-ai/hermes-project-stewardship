import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureBrowser} from './browser-harness.mjs';
import {PROJECT_VIEWS} from './src/lib/panel-words.js';
import {all, fill, one, pickProject, switcherWords} from './test-support/src-words.mjs';
import {stageKeyOf, stageLabel} from './src/kanban/model.js';

// The words a person reads come from the module that renders them: the
// switcher's and the view bar's names (lib/panel-words.js), the Settings edit
// button (project/panels.js), the discard dialog's buttons
// (shell/dashboard-page.js) and the board's move words (kanban/board.js).
const WORDS=switcherWords();
const EDIT_SETTINGS=one('src/project/panels.js', /action: 'edit-project-settings'[\s\S]*?children: '([^']+)'/);
const CANCEL=one('src/shell/dashboard-page.js', /action: 'nav-cancel'[\s\S]*?children: '([^']+)'/);
const DISCARD=one('src/shell/dashboard-page.js', /action: 'nav-discard'[\s\S]*?children: '([^']+)'/);
const VISION=PROJECT_VIEWS.plan;
const MOVE_WORDS=all('src/kanban/board.js', /'aria-label': `([^`]+) \$\{item\.ref\}`, 'data-card-move'/);
assert.equal(new Set(MOVE_WORDS).size, 1, 'the board and the list name the move control the same way');
const MOVE_LABEL=(ref)=>`${MOVE_WORDS[0]} ${ref}`;
// The board names the status it moved to with the column's own words.
const MOVE_TOAST=(status)=>fill('src/kanban/board.js', /emitToast\('success', `([^`]*statusText\(status\)[^`]*)`/, stageLabel(stageKeyOf({status})));

test('searchable project context, requested discard target and retained project routes', async()=>fixtureBrowser(async(page)=>{
 const select=async(id)=>{await page.getByRole('button',{name:WORDS.context,exact:true}).click(); await page.getByRole('combobox',{name:WORDS.find}).fill(id); await page.getByRole('listbox',{name:WORDS.list}).getByRole('option',{name:id,exact:true}).click();};
 await select('payments-relaunch');
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="overview"].active').waitFor();
 await page.locator('[data-project-view="settings"]').click();
 await page.getByRole('button',{name:EDIT_SETTINGS}).click();
 await page.locator('[data-setting-field="mission"]').fill('Unsaved');
 await select('mobile-client');
 await page.locator('[data-project-switch-confirm]').getByRole('button',{name:CANCEL,exact:true}).click();
 assert.match(await page.getByRole('button',{name:WORDS.context,exact:true}).innerText(),/payments-relaunch/);
 await select('mobile-client');
 await page.locator('[data-project-switch-confirm]').getByRole('button',{name:DISCARD,exact:true}).click();
 await page.locator('[data-project-dashboard="mobile-client"]').waitFor();
 await page.locator('[data-project-view="board"]').click();
 await page.locator('[data-kanban-screen]').waitFor();
 // Design round f: one Vision tab replaced the Objectives and Initiatives
 // tabs and the milestone panel (Sahil 05/10 named it Vision).
 assert.equal(await page.locator('[data-project-view="objectives"], [data-project-view="initiative"]').count(), 0);
 assert.equal((await page.locator('[data-project-view="plan"]').innerText()).trim(), VISION);
 await page.locator('[data-project-view="plan"]').click();
 await page.locator('[data-plan-screen="mobile-client"] [data-plan-section="milestone"]').waitFor();
 await page.getByRole('heading',{name:VISION,exact:true}).waitFor();
}));

test('Open workflow library with unsaved changes asks first; Cancel keeps the tab (Quan M1)', async()=>fixtureBrowser(async(page)=>{
 const select=async(id)=>{await page.getByRole('button',{name:WORDS.context,exact:true}).click(); await page.getByRole('combobox',{name:WORDS.find}).fill(id); await page.getByRole('listbox',{name:WORDS.list}).getByRole('option',{name:id,exact:true}).click();};
 await select('payments-relaunch');
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="settings"]').click();
 await page.getByRole('button',{name:EDIT_SETTINGS}).click();
 await page.locator('[data-setting-field="mission"]').fill('Unsaved library edit');
 await page.locator('[data-project-view="workflows"]').click();
 await page.locator('[data-action="open-workflow-library"]').click();
 const prompt=page.locator('[data-project-switch-confirm]');
 await prompt.waitFor();
 assert.equal(await prompt.getAttribute('data-nav-target'),'tab:workflows');
 await prompt.getByRole('button',{name:CANCEL,exact:true}).click();
 assert.equal(await prompt.count(),0);
 await page.locator('[data-project-view="workflows"].active').waitFor();
 assert.equal(await page.locator('[data-action="open-workflow-library"]').count(),1,'still on the project Workflows view, not the library');
 await page.locator('[data-action="open-workflow-library"]').click();
 await prompt.getByRole('button',{name:DISCARD,exact:true}).click();
 await page.locator('[data-action="open-workflow-library"]').waitFor({state:'detached'});
}));

test('Kanban drag reads back, keyboard alternative and errors never claim success', async()=>fixtureBrowser(async(page,base)=>{
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.getByRole('button',{name:WORDS.context,exact:true}).waitFor();
 // Sahil 05/10: the app opens on All projects; the board needs a project.
 await pickProject(page,'payments-relaunch');
 const initiallySelected = await page.getByRole('button',{name:WORDS.context,exact:true}).innerText();
 assert.equal(initiallySelected, 'payments-relaunch');
 await page.locator('[data-tab="notifications"]').click();
 assert.equal(await page.getByRole('button',{name:WORDS.context,exact:true}).innerText(), initiallySelected);
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="board"]').click();
 await page.locator('[data-work-card="HDY-13"]').dragTo(page.locator('[data-board-column="active"]'));
 await page.getByText(MOVE_TOAST('in_progress'),{exact:true}).waitFor();
 await page.locator('[data-board-column="active"] [data-work-card="HDY-13"]').waitFor();
 // r6: Move lives in the expanded card (the keyboard alternative to dragging).
 await page.locator('[data-card-toggle="HDY-13"]').click();
 await page.getByRole('combobox',{name:MOVE_LABEL('HDY-13')}).selectOption('blocked');
 await page.locator('[data-board-column="blocked"] [data-work-card="HDY-13"]').waitFor();
 assert.deepEqual(errors,[]);
}));
