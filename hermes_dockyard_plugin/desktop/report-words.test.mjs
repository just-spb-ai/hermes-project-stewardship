// C7 Reports: new reports name events with the Activity tab's words.
// The backend cannot import this JavaScript, so
// src/hermes_project_stewardship/persistence/report_words.py keeps its own
// copy of the fixed labels. The two sides must cover the same event types;
// the words themselves are each side's own (19/10/2026: the tab is Russian,
// a saved report is English, and neither one dictates the other's wording).
// This test fails if a type is known to one side and not the other.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describeEvent, KNOWN_EVENT_TYPES, EVENT_WORDS } from './src/lib/event-vocab.js'

const python = readFileSync(fileURLToPath(new URL('../../src/hermes_project_stewardship/persistence/report_words.py', import.meta.url)), 'utf8')
const start = python.indexOf('EVENT_WORDS = {')
const block = python.slice(start, python.indexOf('\n}', start))
const backendWords = Object.fromEntries([...block.matchAll(/^ {4}"([a-z_.]+)": "([^"]+)",$/gm)].map((match) => [match[1], match[2]]))
const resubmitted = /^RESUBMITTED_WORDS = "([^"]+)"$/m.exec(python)?.[1]
// report_words.actor's own word for an event nobody signed ("System").
const systemWord = /sender != "system" else "([^"]+)"\)/.exec(python)?.[1]

test('the backend has words for every event type the Activity tab names, and no others', () => {
  assert.ok(start >= 0 && Object.keys(backendWords).length >= 17, 'the backend word list was read')
  assert.deepEqual(Object.keys(backendWords).sort(), [...KNOWN_EVENT_TYPES].sort())
})

test('every type both sides know is named by each side, in its own words', () => {
  for (const [type, words] of Object.entries(backendWords)) {
    const label = describeEvent({ event_type: type, payload: {} }).label
    assert.ok(label && label.trim(), `${type}: the Activity tab names it`)
    assert.ok(words && words.trim(), `${type}: the backend names it`)
    assert.notEqual(label, type, `${type}: the tab reads as words, never as the code name`)
  }
  assert.ok(resubmitted && resubmitted.trim(), 'the backend has a word for a resubmitted proposal')
  const plain = describeEvent({ event_type: 'initiative.approval_required', payload: {} }).label
  const again = describeEvent({ event_type: 'initiative.approval_required', payload: { resubmitted: true } }).label
  assert.ok(again && again !== plain, 'a resubmitted proposal reads differently')
})

// The shared cases: tests/test_report_words.py checks the backend against
// the same file, so a word changed on one side fails until the other follows.
const cases = JSON.parse(readFileSync(fileURLToPath(new URL('./test-support/report-event-cases.json', import.meta.url)), 'utf8'))

test('every shared case: the subject, the detail and "by" are the backend\'s, the name is the tab\'s own', () => {
  assert.ok(cases.length >= 20, 'the shared cases were read')
  for (const { event, label, title, by } of cases) {
    const row = describeEvent(event)
    assert.ok(row.label && row.label.trim(), `${event.event_type}: the tab names it`)
    assert.ok(label && label.trim(), `${event.event_type}: the backend names it`)
    // A person who signed the event keeps the backend's own name verbatim; an
    // event nobody signed is named by each side's own word for the system (the
    // backend's in a saved report, EVENT_WORDS.system in the Russian tab).
    assert.ok(systemWord, 'the backend word for an unsigned event was read')
    assert.equal(row.by, by === systemWord ? EVENT_WORDS.system : by, `${event.event_type}: who did it is the backend's word`)
    if (title) {
      assert.ok(row.title && row.title.trim(), `${event.event_type}: the tab shows a subject line too`)
      // A line built from the event's own values must still name them: the health
      // change reads 'None → Not verified' on one side, 'None → Не проверено' on the other.
      if (title.includes(' → ')) assert.ok(row.title.includes(' → '), `${event.event_type}: both ends of the change are named`)
    } else {
      assert.equal(row.title ?? '', '', `${event.event_type}: no subject line, on either side`)
    }
  }
})

test('an unknown type and the "by" line follow the same rules on both sides', () => {
  // report_words.sentence and report_words.actor are pinned to these same
  // answers in tests/test_report_words.py.
  assert.equal(describeEvent({ event_type: 'milestone.created', payload: {} }).label, 'Milestone created')
  assert.equal(describeEvent({ event_type: 'project.content_uploaded', payload: {} }).label, 'Project content uploaded')
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'system', payload: {} }).by, EVENT_WORDS.system)
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'system', payload: { actor: 'sahil' } }).by, 'sahil')
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'octacon', payload: {} }).by, 'octacon')
})
