// Reads a word the panel displays out of the Desktop source module that
// publishes it. A test never spells a displayed word out a second time, and
// never reads one out of the built bundle (plugin.js).
//
// A pure module (no React) is imported directly by a test. These helpers are
// for the modules that import React: a node test cannot load those (there is
// no 'react' on its module path), so the word is read out of the module's own
// source text instead.
//
// Owned by the W1 journeys (navigation, roadmap, kanban, settings, app
// settings, archive, remember-last-project, plugin-off, memory, overview,
// notifications). Other journeys read their own words.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SWITCHER_WORDS } from '../src/lib/panel-words.js'

const cache = new Map()

// The text of one source module, e.g. source('src/lib/ui.js'). The path is
// relative to the desktop/ directory this file lives in.
export function source(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8'))
  return cache.get(file)
}

// The capture group of `pattern` in `file`. The pattern must match exactly
// once: a moved or reworded line fails loudly here, where the test can name
// it, instead of quietly matching something else.
export function one(file, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const found = [...source(file).matchAll(new RegExp(pattern.source, flags))]
  if (found.length !== 1) throw new Error(`${file}: expected one match for ${pattern} (found ${found.length})`)
  if (found[0].length < 2) throw new Error(`${file}: ${pattern} has no capture group`)
  return found[0][1]
}

// The same, but the `pattern` may match more than once and every capture group
// comes back (in order). An empty list fails: a reader that finds nothing has
// stopped checking anything.
export function all(file, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const found = [...source(file).matchAll(new RegExp(pattern.source, flags))].map((match) => match[1])
  if (!found.length) throw new Error(`${file}: nothing matched ${pattern}`)
  return found
}

// A template the UI fills in: every `${...}` becomes a wildcard, so a test can
// match the rendered text without knowing how the value is rendered. The
// literals around the holes are kept (escaping regex punctuation), so a
// reworded sentence still fails.
export function template(file, pattern) {
  const shape = one(file, pattern).split(/\$\{[^}]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`^${shape.join('.*')}$`)
}

// A template's literal parts joined the way the UI renders them: the values
// are what the test knows (a status, a project id, a phase).
export function fill(file, pattern, ...values) {
  const parts = one(file, pattern).split(/\$\{[^}]*\}/)
  if (parts.length !== values.length + 1) {
    throw new Error(`${file}: ${pattern} has ${parts.length - 1} holes, ${values.length} values given`)
  }
  return parts.reduce((text, part, index) => text + (index ? String(values[index - 1]) : '') + part, '')
}

// Every `key: 'word'` pair one pattern finds in a module, as an object.
export function pairs(file, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const found = [...source(file).matchAll(new RegExp(pattern.source, flags))]
  if (!found.length) throw new Error(`${file}: nothing matched ${pattern}`)
  return Object.fromEntries(found.map((match) => [match[1], match[2]]))
}

export const escape = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ---- the global project switcher ------------------------------------------
// lib/panel-words.js publishes the switcher's own names (the UI imports them
// too); the two entries that are still written inside lib/project-switcher.js
// are read out of its source, since a test cannot import that module (React).
let switcher = null
export function switcherWords() {
  if (!switcher) {
    const file = 'src/lib/project-switcher.js'
    switcher = Object.freeze({
      ...SWITCHER_WORDS,
      all: one(file, /'aria-label': entry\.all \? '([^']+)'/),
      choose: SWITCHER_WORDS.empty,
    })
  }
  return switcher
}

// The switcher's "All projects" choice: the value the backend stores for it.
export const ALL_PROJECTS = '*'

// Choosing a project the way a person does, through the global switcher: the
// same steps as test-support/project-scope.mjs pickProject, with the controls
// found by the names the switcher publishes.
export async function pickProject(page, id) {
  const words = switcherWords()
  await page.getByRole('button', { name: words.context, exact: true }).click()
  if (id !== ALL_PROJECTS) await page.getByRole('combobox', { name: words.find }).fill(id)
  await page.locator(`[role="listbox"] [data-project-option="${id}"]`).click()
  await page.locator(`.dy-sw-trigger[data-scope="${id}"]`).waitFor()
}

// The Dashboard region the journeys wait for once the app has loaded.
export const FLEET_SUMMARY = one('src/views/dashboard.js', /dockyard-command-metrics', 'aria-label': '([^']+)'/)
