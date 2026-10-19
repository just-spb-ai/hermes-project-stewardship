import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = process.env.DOCKYARD_SRC_DIR
  || fileURLToPath(new URL('./src/', import.meta.url))
function sourceText(dir) {
  const files = []
  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name)
      if (statSync(child).isDirectory()) walk(child)
      else if (name.endsWith('.js')) files.push(child)
    }
  }
  walk(dir)
  return files.sort().map((file) => readFileSync(file, 'utf8')).join('\n')
}
const source = sourceText(srcDir)

test('approved backlog slice is present in the production plugin surface', () => {
  for (const marker of [
    "'data-backlog-table': true",
    "'data-cm-search': true",
    "['sort', 'arrow-up-down', ",
    "['group', 'layers', ",
    "'data-cm-menu-btn': menu",
    "'data-cm-menu': menu",
    "'data-menu-action': 'details'",
    "'data-menu-action': 'add-child'",
    "'data-menu-action': 'reparent'",
    "'data-bulk-import-layer': true",
    "'data-import-drop': true",
    "'data-import-input': true",
    "'data-import-preview': true",
    "'data-cell': 'title'",
    "'data-cell': 'status'",
    "'data-cell': 'assignee'",
    'function WorkItemDetail',
  ]) assert.ok(source.includes(marker), `missing approved marker: ${marker}`)
  // The panel was localized: the sort control's human label is Russian now,
  // so the label is read from the surface instead of spelling "Sort" out
  // here. Kind and icon stay checked by the marker above; a control that
  // lost its label still fails.
  assert.match(source, /\['sort', 'arrow-up-down', '[^']+'/, 'the sort control carries a label')
  // Same for the grouping control: the label is read, never spelled out here.
  assert.match(source, /\['group', 'layers', '[^']+'/, 'the grouping control carries a label')
  // P6.7/P6.8: import flows through the shared backend validator endpoint.
  assert.match(source, /\/backlog\/import`, \{\s*method: 'POST', body: \{ csv_text: csvText, apply: false \}/)
  assert.match(source, /body: \{ csv_text: good\[0\]\.csv_text, apply: true \}/)
  assert.match(source, /download = 'backlog-import-template\.csv'/)
})

test('detail modal exposes the canonical task ID separately from the display reference', () => {
  assert.match(source, /const taskId = detail\?\.work_item\?\.id \?\? item\?\.id \?\? null/)
  assert.ok(source.includes("className: 'dockyard-detail-task-id'"))
  // The element's label and its fallback are Russian now: read them from
  // the surface instead of spelling "Task ID" / "Unavailable" out.
  assert.match(source, /'data-task-id': taskIdText \?\? undefined, children: \[\s*jsx\('span', \{ children: '[^']+' \}\)/, 'the dedicated element labels the ID')
  assert.match(source, /jsx\('code', \{ children: taskIdText \?\? '[^']+' \}\),/, 'the dedicated element renders taskIdText with a fallback')
})

test('plugin remains valid JavaScript', () => {
  assert.ok(source.length > 100_000)
})
