// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// C2 Kanban screen, r6 design (Sahil's C2 review, 04/10/2026):
// - Cards show a summary by default. Click one to expand it in place (several
//   can be open). Actions (Move, Open full details) live in the expanded card.
// - A view is what you see: filters, layout and card settings. Change any of
//   them and the view shows unsaved changes, with Save, Save as new view and
//   Reset. Views sit in a bar above the board; the Manage views side panel
//   renames, duplicates, shares and deletes them and sets what cards show.
// - Five columns, no catch-all. Move offers only the moves Hermes accepts.
// Every fact shown comes from the real API. Nothing is stored in the browser:
// unsaved view changes and opened cards reset on reload. Saved views live in
// the backend.
import { useEffect } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { readableLabel } from '../data/loaders.js'
import { WORK_CARD_WORDS } from '../lib/panel-words.js'
import { WorkTable } from './table.js'
import {
  STAGES, stageKeyOf, stageLabel, groupByStage, unplacedItems, dropStatusOf, movesFor, typeLabel, initialsOf,
  displayName, shortDate, cardFacts, cardSignals, CARD_FIELDS, CARD_FIELD_LABELS, LABEL_LIMIT, emptyFilters,
  filtersActive, filterOptions, applyFilters, ALL_WORK, defaultDefinition, definitionOf, viewBody,
  sameDefinition, describeDefinition, describeFilters, freeName,
} from './model.js'

const todayIso = () => new Date().toISOString().slice(0, 10)
const TYPE_ICONS = { epic: 'layers', task: 'square-check-big', bug: 'bug', spike: 'lightbulb' }
const typeIcon = (type) => TYPE_ICONS[type || 'task'] ?? 'square'
const domId = (prefix, ref) => `${prefix}-${String(ref).replace(/[^A-Za-z0-9_-]/g, '_')}`
const draftKey = (name) => name ?? ''
const statusText = (status) => {
  const key = stageKeyOf({ status })
  return key ? stageLabel(key) : readableLabel(status || 'unknown', 'Неизвестно')
}

function Avatar({ name }) {
  const initials = initialsOf(name)
  return jsx('span', { className: initials ? 'dy-kb-avatar' : 'dy-kb-avatar empty', title: name ? displayName(name) : 'Не назначен', 'aria-hidden': true, children: initials })
}

// The expanded part of a card: labelled sections, then the actions.
function CardBody({ id, item, facts, moves, moving, today, onMove, onOpenItem, onOpenRef, onNavigate }) {
  const linkRow = (card) => jsx('li', { children: jsxs('button', { type: 'button', className: 'dy-kb-link', 'data-link-ref': card.ref, 'data-done': card.done ? 'true' : undefined,
    title: `Открыть ${card.ref}`, onClick: () => onOpenRef(card.ref), children: [
      jsx('span', { className: 'dy-kb-key', children: card.ref }),
      jsx('span', { className: 'dy-kb-link-title', children: card.title || typeLabel(card.type) }),
      jsx('span', { className: 'dy-kb-link-status', children: statusText(card.status) }),
    ]}) }, card.ref)
  const section = (key, title, body) => jsxs('section', { className: 'dy-kb-section', 'data-card-section': key, children: [jsx('h5', { children: title }), body] }, key)
  const row = (label, value, extra = {}, key = label) => jsxs('div', { className: 'dy-kb-row', ...extra, children: [jsx('dt', { children: label }), jsx('dd', { children: value })] }, key)
  const goto = (label, onClick, text) => jsx('button', { type: 'button', className: 'dy-kb-goto', 'aria-label': `${label}: ${text}`, onClick, children: text })

  const planning = []
  // Each planning link opens that item on the project's Vision screen
  // ("plan:<kind>:<id>", the same entry the Roadmap's Open uses).
  if (facts.initiative) planning.push(row('Инициатива', goto('Инициатива', () => onNavigate(`plan:initiative:${facts.initiative.ref}`), facts.initiative.title || facts.initiative.ref)))
  facts.milestones.forEach((milestone, index) => planning.push(row('Веха', goto('Веха', () => onNavigate(`plan:milestone:${milestone.id}`), milestone.due ? `${milestone.name} · срок ${shortDate(milestone.due, today)}` : milestone.name), {}, `milestone:${index}`)))
  // v42: the goal this task works towards. A task with no goal says so.
  if (facts.goal) {
    planning.push(row('Цель', jsxs('span', { children: [
      goto('Цель', () => onNavigate(`plan:goal:${facts.goal.id}`), facts.goal.title),
    ] })))
  } else {
    planning.push(row('Цель', jsx('span', { className: 'dy-kb-via', children: 'Ещё не размещено' })))
  }

  const details = [row('Исполнитель', item.assignee ? displayName(item.assignee) : 'Не назначен')]
  if (facts.due) details.push(row('Срок', facts.overdue ? `${shortDate(facts.due, today)} · просрочено` : shortDate(facts.due, today), facts.overdue ? { 'data-overdue': 'true' } : {}))
  if (facts.labels.length) details.push(row('Метки', facts.labels.join(', ')))

  return jsxs('div', { className: 'dy-kb-card-body', id, 'data-card-body': item.ref, children: [
    facts.blockedBy.length ? section('blocked_by', 'Блокируется', jsx('ul', { className: 'dy-kb-links', children: facts.blockedBy.map(linkRow) })) : null,
    facts.blocks.length ? section('blocks', 'Блокирует', jsx('ul', { className: 'dy-kb-links', children: facts.blocks.map(linkRow) })) : null,
    planning.length ? section('planning', 'Планирование', jsx('dl', { children: planning })) : null,
    section('details', 'Детали', jsx('dl', { children: details })),
    jsxs('div', { className: 'dy-kb-card-actions', children: [
      moves.targets.length
        ? jsxs('select', { 'aria-label': `Переместить ${item.ref}`, 'data-card-move': item.ref, disabled: moving, value: '', onChange: (event) => onMove(item.ref, event.target.value), children: [
            jsx('option', { value: '', children: 'Переместить в…' }),
            ...moves.targets.map((target) => jsx('option', { value: target.status, children: target.label }, target.key)),
          ]})
        : moves.reason ? jsx('p', { className: 'dy-kb-move-none', 'data-card-move-none': item.ref, children: moves.reason }) : null,
      jsxs('button', { type: 'button', className: 'dockyard-button small', 'data-card-open': item.ref, onClick: () => onOpenItem(item), children: [jsx(Icon, { name: 'arrow-up-right' }), WORK_CARD_WORDS.openDetails] }),
    ]}),
  ]})
}

// One card. The summary is a single button: click (or Enter/Space) expands it.
function Card({ item, facts, fields, open, moves, moving, today, onToggle, onDragStart, onDragEnd, ...bodyProps }) {
  const signals = cardSignals(facts, fields, today)
  const labels = fields.labels ? facts.labels : []
  const shownLabels = labels.slice(0, LABEL_LIMIT)
  const hiddenLabels = labels.slice(LABEL_LIMIT)
  const planningText = fields.planning ? [facts.initiative ? (facts.initiative.title || facts.initiative.ref) : null, facts.milestones[0]?.name].filter(Boolean).join(' · ') : ''
  const bodyId = domId('dy-kb-body', item.ref)
  const summaryId = domId('dy-kb-sum', item.ref)
  const hasSummary = signals.length > 0 || shownLabels.length > 0 || Boolean(planningText)
  return jsxs('article', { className: 'dockyard-work-card', 'data-work-card': item.ref, 'data-open': open ? 'true' : 'false', 'data-type': item.type || 'task',
    draggable: moves.targets.length > 0 && !moving, onDragStart, onDragEnd, children: [
    jsxs('button', { type: 'button', className: 'dy-kb-card-toggle', 'data-card-toggle': item.ref, 'aria-expanded': open, 'aria-controls': open ? bodyId : undefined,
      'aria-label': `${typeLabel(item.type)} ${item.ref}: ${item.title}${fields.assignee ? `, ${item.assignee ? `исполнитель: ${displayName(item.assignee)}` : 'без исполнителя'}` : ''}`,
      'aria-describedby': hasSummary ? summaryId : undefined, onClick: () => onToggle(item.ref, !open), children: [
      jsxs('span', { className: 'dy-kb-card-top', children: [
        jsxs('span', { className: 'dy-kb-type', 'data-type': item.type || 'task', title: typeLabel(item.type), children: [jsx(Icon, { name: typeIcon(item.type) }), jsx('span', { children: typeLabel(item.type) })] }),
        jsx('span', { className: 'dy-kb-key', children: item.ref }),
        fields.assignee ? jsx(Avatar, { name: item.assignee }) : null,
        jsx('span', { className: 'dy-kb-chevron', 'aria-hidden': true, children: jsx(Icon, { name: 'chevron-down' }) }),
      ]}),
      jsx('span', { className: 'dy-kb-title', children: item.title }),
      hasSummary ? jsxs('span', { className: 'dy-kb-summary', id: summaryId, children: [
        ...signals.map((signal) => jsxs('span', { className: 'dy-kb-signal', 'data-signal': signal.kind, children: [jsx(Icon, { name: signal.icon }), jsx('span', { children: signal.text })] }, signal.kind)),
        ...shownLabels.map((label) => jsx('span', { className: 'dy-kb-label', 'data-card-label': label, children: label }, `label:${label}`)),
        hiddenLabels.length ? jsx('span', { className: 'dy-kb-label', 'data-card-label-more': hiddenLabels.length, title: hiddenLabels.join(', '), children: `+${hiddenLabels.length}` }, 'label-more') : null,
        planningText ? jsxs('span', { className: 'dy-kb-signal dy-kb-planning', 'data-signal': 'planning', children: [jsx(Icon, { name: 'target' }), jsx('span', { children: planningText })] }, 'planning') : null,
      ]}) : null,
    ]}),
    open ? jsx(CardBody, { id: bodyId, item, facts, moves, moving, today, ...bodyProps }) : null,
  ]})
}

// Manage views: a side panel over the right of the board (the board stays usable).
function ViewsPanel({ views, currentName, working, edited, startNew, busy, error, openerRef, onClose, onSelect, onCreate, onSaveCurrent, onReset,
  onRename, onDuplicate, onShare, onDelete, onFields, onClearFilters }) {
  const panelRef = useRef(null)
  const [newOpen, setNewOpen] = useState(Boolean(startNew))
  const [newName, setNewName] = useState(() => freeName('Новый вид', [ALL_WORK, ...views.map((saved) => saved.name)]))
  const [newShared, setNewShared] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [renameText, setRenameText] = useState('')
  const [confirming, setConfirming] = useState(null)
  const current = views.find((saved) => saved.name === currentName) ?? null
  const names = [ALL_WORK, ...views.map((saved) => saved.name)]

  useEffect(() => { setNewOpen(Boolean(startNew)) }, [startNew])
  useEffect(() => {
    const target = newOpen ? panelRef.current?.querySelector('[data-view-new-name]') : panelRef.current?.querySelector('h2')
    target?.focus()
  }, [newOpen])
  const close = () => { onClose(); openerRef.current?.focus() }
  const onKeyDown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }

  const trimmed = newName.trim()
  const newProblem = !trimmed ? 'Дайте виду имя.' : names.includes(trimmed) ? `Вид с именем «${trimmed}» уже есть.` : null
  const renameProblem = (from) => {
    const text = renameText.trim()
    if (!text) return 'Дайте виду имя.'
    if (text !== from && names.includes(text)) return `Вид с именем «${text}» уже есть.`
    return null
  }

  const newForm = newOpen ? jsxs('form', { className: 'dy-kb-panel-section dy-kb-new-view', 'data-view-new-form': true,
    onSubmit: (event) => { event.preventDefault(); if (!newProblem && !busy) onCreate(trimmed, newShared).then((ok) => { if (ok) setNewOpen(false) }) }, children: [
    jsx('h3', { children: 'Новый вид' }),
    jsxs('label', { className: 'dy-kb-field', children: [jsx('span', { children: 'Имя' }),
      jsx('input', { type: 'text', 'data-view-new-name': true, value: newName, maxLength: 80, onChange: (event) => setNewName(event.target.value) })] }),
    jsxs('fieldset', { className: 'dy-kb-choice', children: [jsx('legend', { children: 'Кому видно' }),
      ...[[false, 'Только я'], [true, 'Все в этом проекте']].map(([value, label]) => jsxs('label', { children: [
        jsx('input', { type: 'radio', name: 'dy-kb-new-shared', 'data-view-new-shared': String(value), checked: newShared === value, onChange: () => setNewShared(value) }),
        jsx('span', { children: label })] }, String(value)))] }),
    jsxs('p', { className: 'dy-kb-panel-meta', children: ['Сохраняет то, что видите сейчас: ', describeDefinition(working), '.'] }),
    newProblem && trimmed ? jsx('p', { className: 'dy-kb-panel-problem', role: 'alert', children: newProblem }) : null,
    jsxs('div', { className: 'dy-kb-panel-buttons', children: [
      jsx('button', { type: 'submit', className: 'dockyard-button small primary', 'data-view-create': true, disabled: Boolean(newProblem) || busy, children: 'Создать вид' }),
      jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setNewOpen(false), children: 'Отмена' }),
    ]}),
  ]}) : jsx('div', { className: 'dy-kb-panel-section', children: jsxs('button', { type: 'button', className: 'dockyard-button small', 'data-view-new-open': true, onClick: () => setNewOpen(true), children: [jsx(Icon, { name: 'plus' }), 'Новое представление из того, что видите'] }) })

  const viewRow = (saved) => {
    const name = saved ? saved.name : ALL_WORK
    const isCurrent = (saved ? saved.name : null) === currentName
    const definition = saved ? definitionOf(saved) : defaultDefinition()
    const mine = saved ? saved.mine !== false : false
    const badge = !saved ? 'Встроенный' : saved.shared ? 'Общий' : 'Только я'
    let actions
    if (saved && renaming === name) {
      const problem = renameProblem(name)
      actions = jsxs('form', { className: 'dy-kb-rename', onSubmit: (event) => { event.preventDefault(); if (!problem && !busy) onRename(saved, renameText.trim()).then((ok) => { if (ok) setRenaming(null) }) }, children: [
        jsx('input', { type: 'text', 'aria-label': `Новое имя для ${name}`, 'data-view-rename-input': name, value: renameText, maxLength: 80, autoFocus: true, onChange: (event) => setRenameText(event.target.value) }),
        jsx('button', { type: 'submit', className: 'dockyard-button small primary', disabled: Boolean(problem) || busy, children: 'Сохранить имя' }),
        jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setRenaming(null), children: 'Отмена' }),
        problem && renameText.trim() ? jsx('p', { className: 'dy-kb-panel-problem', role: 'alert', children: problem }) : null,
      ]})
    } else if (saved && confirming === name) {
      actions = jsxs('div', { className: 'dy-kb-confirm', role: 'alert', children: [
        jsx('span', { children: `Удалить «${name}»? Это нельзя отменить.` }),
        jsx('button', { type: 'button', className: 'dockyard-button small danger', 'data-view-delete-confirm': name, disabled: busy, onClick: () => onDelete(saved).then(() => setConfirming(null)), children: 'Удалить' }),
        jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setConfirming(null), children: 'Отмена' }),
      ]})
    } else {
      const small = (label, icon, onClick, extra = {}) => jsxs('button', { type: 'button', className: 'dy-kb-icon-button', title: label, 'aria-label': `${label} ${name}`, disabled: busy, onClick, ...extra, children: [jsx(Icon, { name: icon }), jsx('span', { children: label })] }, label)
      actions = jsxs('div', { className: 'dy-kb-row-actions', children: [
        isCurrent ? null : small('Открыть', 'eye', () => onSelect(saved ? saved.name : null), { 'data-view-open': name }),
        saved && mine ? small('Переименовать', 'pencil', () => { setRenaming(name); setRenameText(name); setConfirming(null) }, { 'data-view-rename': name }) : null,
        saved ? small('Дублировать', 'copy', () => onDuplicate(saved), { 'data-view-duplicate': name }) : null,
        saved && mine ? small(saved.shared ? 'Сделать только моим' : 'Поделиться с проектом', saved.shared ? 'user' : 'send', () => onShare(saved, !saved.shared), { 'data-view-share': name }) : null,
        saved && mine ? small('Удалить', 'trash-2', () => { setConfirming(name); setRenaming(null) }, { 'data-view-delete': name }) : null,
        saved && !mine ? jsx('span', { className: 'dy-kb-panel-meta', children: saved.owner ? `Общий вид от ${displayName(saved.owner)}. Продублируйте, чтобы сделать свой.` : 'Общий вид. Продублируйте, чтобы сделать свой.' }) : null,
      ]})
    }
    return jsxs('li', { className: 'dy-kb-view-row', 'data-view-row': name, 'data-current': isCurrent ? 'true' : undefined, children: [
      jsxs('div', { className: 'dy-kb-view-row-head', children: [
        jsx('strong', { children: name }),
        jsx('span', { className: 'dy-kb-badge', children: badge }),
        isCurrent ? jsx('span', { className: 'dy-kb-badge current', children: 'Показан' }) : null,
      ]}),
      jsx('p', { className: 'dy-kb-panel-meta', children: describeDefinition(definition) }),
      actions,
    ]}, name)
  }

  const fields = working.fields
  const adjust = jsxs('section', { className: 'dy-kb-panel-section', 'data-view-adjust': currentName ?? ALL_WORK, children: [
    jsx('h3', { children: `Настроить «${currentName ?? ALL_WORK}»` }),
    jsxs('fieldset', { className: 'dy-kb-choice', children: [jsx('legend', { children: 'Показывать на карточках' }),
      ...CARD_FIELDS.map((key) => jsxs('label', { children: [
        jsx('input', { type: 'checkbox', 'data-card-field': key, checked: Boolean(fields[key]), onChange: () => onFields({ ...fields, [key]: !fields[key] }) }),
        jsx('span', { children: CARD_FIELD_LABELS[key] })] }, key))] }),
    jsxs('div', { className: 'dy-kb-filter-summary', children: [
      jsx('span', { children: describeFilters(working.filters) || 'Без фильтров: вся работа.' }),
      filtersActive(working.filters) ? jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-clear-filters': true, onClick: onClearFilters, children: 'Сбросить фильтры' }) : null,
    ]}),
    jsx('p', { className: 'dy-kb-panel-meta', children: 'Раскладка и размер карточек — на панели инструментов. Каждое изменение сразу видно на доске.' }),
    edited ? jsxs('div', { className: 'dy-kb-panel-buttons', children: [
      current && current.mine !== false ? jsx('button', { type: 'button', className: 'dockyard-button small primary', 'data-view-save': true, disabled: busy, onClick: onSaveCurrent, children: 'Сохранить изменения' }) : null,
      jsx('button', { type: 'button', className: 'dockyard-button small', disabled: busy, onClick: () => setNewOpen(true), children: 'Сохранить как новый вид' }),
      jsx('button', { type: 'button', className: 'dockyard-button small', disabled: busy, onClick: onReset, children: 'Сброс' }),
    ]}) : null,
  ]})

  return jsxs('aside', { className: 'dy-kb-panel', ref: panelRef, 'data-views-panel': true, 'aria-labelledby': 'dy-kb-panel-title', onKeyDown, children: [
    jsxs('header', { children: [
      jsx('h2', { id: 'dy-kb-panel-title', tabIndex: -1, children: 'Управление видами' }),
      jsx('button', { type: 'button', className: 'dy-kb-collapse', 'aria-label': 'Закрыть управление представлениями', 'data-views-close': true, onClick: close, children: jsx(Icon, { name: 'x' }) }),
    ]}),
    jsx('p', { className: 'dy-kb-panel-meta', 'data-views-note': true, children: 'Вид меняет только то, что показывает эта доска. Он никогда не запускает автоматизацию, не назначает работу и не меняет права.' }),
    error ? jsx('p', { className: 'dy-kb-note', role: 'alert', 'data-views-error': true, children: error }) : null,
    newForm,
    jsxs('section', { className: 'dy-kb-panel-section', children: [
      jsx('h3', { children: 'Виды' }),
      jsx('ul', { className: 'dy-kb-view-rows', children: [viewRow(null), ...views.map(viewRow)] }),
    ]}),
    adjust,
  ]})
}

const HELD = 'kanban-view'

export function KanbanScreen({ project, view, onRefresh, setWorkNotice, onOpenItem, onNavigate, appliedView, setAppliedView }) {
  const [overrides, setOverrides] = useState({})
  const [collapsed, setCollapsed] = useState({})
  const [dragged, setDragged] = useState(null)
  const [moving, setMoving] = useState(false)
  const [deps, setDeps] = useState({ status: 'loading', data: null })
  const [roadmap, setRoadmap] = useState({ status: 'loading', data: null })
  const [viewList, setViewList] = useState(view.views ?? [])
  const [panel, setPanel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [viewError, setViewError] = useState(null)
  const moveLock = useRef(false)
  const boardRef = useRef(null)
  const focusAfter = useRef(null)
  const focusCard = useRef(null)
  const manageRef = useRef(null)
  const encoded = encodeURIComponent(project.id)
  const today = todayIso()

  // The current view and any unsaved changes are held by the dashboard, so they
  // survive a switch to another project tab and back (never stored in the browser).
  const fresh = { kind: HELD, projectId: project.id, currentName: null, drafts: {} }
  const held = appliedView?.kind === HELD && appliedView.projectId === project.id ? appliedView : fresh
  const updateHeld = (change) => setAppliedView((previous) => {
    const base = previous?.kind === HELD && previous.projectId === project.id ? previous : fresh
    return { ...base, ...change(base) }
  })

  useEffect(() => { setViewList(view.views ?? []) }, [view.views])
  useEffect(() => {
    let live = true
    api(`/projects/${encoded}/work-dependencies`)
      .then((result) => { if (live) setDeps({ status: 'ok', data: result?.dependencies ?? {} }) })
      .catch(() => { if (live) setDeps({ status: 'error', data: null }) })
    return () => { live = false }
  }, [project.id, view.workItems])
  useEffect(() => {
    let live = true
    api(`/roadmap?project_id=${encoded}`)
      .then((result) => { if (live) setRoadmap({ status: 'ok', data: (result?.projects ?? [])[0] ?? null }) })
      .catch(() => { if (live) setRoadmap({ status: 'error', data: null }) })
    return () => { live = false }
  }, [project.id, view.initiatives])
  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    boardRef.current?.querySelector(`[data-board-${target.to}="${target.key}"]`)?.focus()
  }, [collapsed])
  // After a move, keyboard focus follows the card to its new column, unless that
  // column is collapsed or the List is showing (then focus stays where it is).
  useEffect(() => {
    const pending = focusCard.current
    if (!pending) return
    if (collapsed[pending.stage] || working.layout === 'list') { focusCard.current = null; return }
    const target = boardRef.current?.querySelector(`[data-board-column="${pending.stage}"] [data-card-toggle="${CSS.escape(pending.ref)}"]`)
    if (target) { focusCard.current = null; target.focus() }
  })

  const currentSaved = held.currentName ? viewList.find((saved) => saved.name === held.currentName) ?? null : null
  const currentName = currentSaved ? currentSaved.name : null
  const savedDefinition = currentSaved ? definitionOf(currentSaved) : defaultDefinition()
  const draft = held.drafts[draftKey(currentName)]
  const working = draft ?? savedDefinition
  const edited = Boolean(draft) && !sameDefinition(draft, savedDefinition)
  const editedNames = new Set([null, ...viewList.map((saved) => saved.name)].filter((name) => {
    const pending = held.drafts[draftKey(name)]
    const saved = name ? viewList.find((candidate) => candidate.name === name) : null
    return pending && !sameDefinition(pending, saved ? definitionOf(saved) : defaultDefinition())
  }))

  const setWorking = (next) => updateHeld((base) => ({ drafts: { ...base.drafts, [draftKey(currentName)]: next } }))
  const setFilters = (filters) => setWorking({ ...working, filters })
  const dropDraft = (name) => updateHeld((base) => { const drafts = { ...base.drafts }; delete drafts[draftKey(name)]; return { drafts } })
  const selectView = (name) => { setOverrides({}); updateHeld(() => ({ currentName: name })) }

  const allItems = view.workItems ?? []
  const factData = { deps: deps.data ?? {}, initiatives: view.initiatives ?? [], milestones: view.milestones ?? [], roadmapProject: roadmap.data }
  const factsByRef = Object.fromEntries(allItems.map((item) => [item.ref, cardFacts(item, factData, today)]))
  const items = applyFilters(allItems, working.filters, factsByRef)
  const grouped = groupByStage(items)
  const options = filterOptions(allItems)
  const liveCount = STAGES.reduce((total, stage) => total + grouped[stage.key].length, 0)
  const unplaced = unplacedItems(allItems)
  const movesOf = (item) => movesFor(item, deps.status === 'ok' ? factsByRef[item.ref]?.openBlockers ?? 0 : 0)
  const isOpen = (ref) => overrides[ref] ?? working.density === 'detailed'

  const transitionStatus = async (ref, status) => {
    if (!project || !ref || !status || moveLock.current || !allItems.some((item) => item.ref === ref)) return
    moveLock.current = true
    setMoving(true)
    setDragged(null)
    setWorkNotice(null)
    try {
      // The plugin proxy supplies configured DOCKYARD_ACTOR_ID attribution.
      await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: 'POST', body: { status } })
      const readback = await api(`/projects/${encoded}/work-items`)
      if (!(readback.work_items ?? []).some((item) => item.ref === ref && item.status === status)) throw new Error('Hermes не подтвердил новую колонку')
      focusCard.current = { ref, stage: stageKeyOf({ status }) }
      onRefresh?.()
      emitToast('success', `Рабочий элемент перемещён в статус ${statusText(status)}.`)
    } catch (failure) {
      setWorkNotice(`Не удалось переместить ${ref}: ${String(failure?.message ?? failure)}. Доска показывает то, что есть у Hermes сейчас.`)
      onRefresh?.()
    } finally {
      moveLock.current = false
      setMoving(false)
    }
  }

  // ---- views: backend calls -------------------------------------------------------
  const putView = (name, definition, shared) => api(`/projects/${encoded}/views`, { method: 'PUT', body: viewBody(name, definition, shared) })
  const upsertLocal = (name, definition, shared) => setViewList((list) => {
    const body = viewBody(name, definition, shared)
    const entry = { ...(list.find((saved) => saved.name === name) ?? { mine: true }), name, layout: body.layout, filters: body.filters, shared: body.shared }
    return list.some((saved) => saved.name === name) ? list.map((saved) => saved.name === name ? entry : saved) : [...list, entry]
  })
  const runView = async (label, work) => {
    setBusy(true)
    setViewError(null)
    try {
      await work()
      onRefresh?.()
      return true
    } catch (failure) {
      setViewError(`${label}: ${String(failure?.message ?? failure)}`)
      return false
    } finally {
      setBusy(false)
    }
  }
  const saveCurrent = () => currentSaved && runView(`Не удалось сохранить «${currentSaved.name}»`, async () => {
    await putView(currentSaved.name, working, currentSaved.shared)
    upsertLocal(currentSaved.name, working, currentSaved.shared)
    dropDraft(currentSaved.name)
    emitToast('success', `«${currentSaved.name}» сохранён.`)
  })
  const createView = (name, shared) => runView(`Не удалось создать «${name}»`, async () => {
    await putView(name, working, shared)
    upsertLocal(name, working, shared)
    dropDraft(currentName)
    selectView(name)
    emitToast('success', `«${name}» создан.`)
  })
  const renameView = (saved, name) => name === saved.name ? Promise.resolve(true) : runView(`Не удалось переименовать «${saved.name}»`, async () => {
    const definition = definitionOf(saved)
    await putView(name, definition, saved.shared)
    upsertLocal(name, definition, saved.shared)
    try {
      await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}`, { method: 'DELETE' })
    } catch (failure) {
      throw new Error(`сохранено как «${name}», но старый вид не удалось убрать (${String(failure?.message ?? failure)})`)
    }
    setViewList((list) => list.filter((candidate) => candidate.name !== saved.name))
    updateHeld((base) => {
      const drafts = { ...base.drafts }
      if (drafts[saved.name]) { drafts[name] = drafts[saved.name]; delete drafts[saved.name] }
      return { drafts, currentName: base.currentName === saved.name ? name : base.currentName }
    })
    emitToast('success', `Переименовано в «${name}».`)
  })
  const duplicateView = (saved) => runView(`Не удалось продублировать «${saved.name}»`, async () => {
    const name = freeName(`${saved.name} — копия`, [ALL_WORK, ...viewList.map((candidate) => candidate.name)])
    await putView(name, definitionOf(saved), false)
    upsertLocal(name, definitionOf(saved), false)
    emitToast('success', `Продублировано как «${name}» (видно только вам).`)
  })
  const shareView = (saved, shared) => runView(`Не удалось изменить, кто видит «${saved.name}»`, async () => {
    await putView(saved.name, definitionOf(saved), shared)
    upsertLocal(saved.name, definitionOf(saved), shared)
    emitToast('success', shared ? `«${saved.name}» теперь общий для проекта.` : `«${saved.name}» теперь виден только вам.`)
  })
  const deleteView = (saved) => runView(`Не удалось удалить «${saved.name}»`, async () => {
    await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}`, { method: 'DELETE' })
    setViewList((list) => list.filter((candidate) => candidate.name !== saved.name))
    updateHeld((base) => {
      const drafts = { ...base.drafts }
      delete drafts[saved.name]
      return { drafts, currentName: base.currentName === saved.name ? null : base.currentName }
    })
    emitToast('success', `«${saved.name}» удалён.`)
  })
  const resetView = () => { dropDraft(currentName); setOverrides({}) }
  const openPanel = (mode) => { setViewError(null); setPanel({ mode, at: Date.now() }) }

  // ---- views bar ------------------------------------------------------------------
  const viewTab = (saved) => {
    const name = saved ? saved.name : null
    const label = saved ? saved.name : ALL_WORK
    const active = name === currentName
    return jsxs('button', { type: 'button', className: 'dy-kb-viewtab', 'data-view-tab': label, 'aria-pressed': active, title: saved ? describeDefinition(definitionOf(saved)) : 'Всё — на доске', onClick: () => selectView(name), children: [
      jsx('span', { className: 'dy-kb-viewtab-name', children: label }),
      editedNames.has(name) ? jsx('span', { className: 'dy-kb-dot', 'aria-label': 'несохранённые изменения', role: 'img' }) : null,
    ]}, label)
  }
  const viewsBar = jsxs('div', { className: 'dy-kb-viewsbar', children: [
    jsxs('nav', { className: 'dy-kb-viewtabs', 'aria-label': 'Виды', children: [
      viewTab(null),
      ...viewList.map(viewTab),
      jsxs('button', { type: 'button', className: 'dy-kb-viewtab dy-kb-viewtab-new', 'data-view-new': true, onClick: () => openPanel('new'), children: [jsx(Icon, { name: 'plus' }), jsx('span', { children: 'Новый вид' })] }, 'new'),
    ]}),
    jsxs('div', { className: 'dy-kb-views-right', children: [
      jsxs('button', { type: 'button', className: 'dy-kb-control dy-kb-button', ref: manageRef, 'data-views-manage': true, 'aria-expanded': Boolean(panel), onClick: () => (panel ? setPanel(null) : openPanel('manage')), children: [jsx(Icon, { name: 'list-filter' }), 'Управление видами'] }),
    ]}),
  ]})

  // ---- toolbar --------------------------------------------------------------------
  const { filters } = working
  const segmented = (label, key, value, choices, onPick) => jsx('div', { className: 'dy-kb-segmented', role: 'group', 'aria-label': label, children:
    choices.map(([choice, text]) => jsx('button', { type: 'button', [`data-kanban-${key}`]: choice, 'aria-pressed': value === choice, onClick: () => onPick(choice), children: text }, choice)) })
  const toolbar = jsxs('div', { className: 'dy-kb-toolbar', 'data-kanban-toolbar': true, children: [
    jsxs('label', { className: 'dy-kb-control dy-kb-search', children: [
      jsx(Icon, { name: 'search' }),
      jsx('input', { type: 'search', 'aria-label': 'Поиск рабочих элементов', placeholder: 'Поиск по номеру или заголовку', value: filters.query, onChange: (event) => setFilters({ ...filters, query: event.target.value }) }),
    ]}),
    ...[['assignee', 'Фильтр по исполнителю', 'Все исполнители', options.assignees], ['type', 'Фильтр по типу', 'Все типы', options.types], ['label', 'Фильтр по метке', 'Все метки', options.labels]].map(([key, label, all, values]) =>
      jsx('label', { className: 'dy-kb-control', children: jsxs('select', { 'aria-label': label, 'data-kanban-filter': key, value: filters[key], onChange: (event) => setFilters({ ...filters, [key]: event.target.value }), children: [
        jsx('option', { value: '', children: all }),
        ...values.map((value) => jsx('option', { value, children: key === 'type' ? typeLabel(value) : key === 'assignee' ? displayName(value) : value }, value)),
      ]}) }, key)),
    filters.statuses.length ? jsxs('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-status-filter': true, onClick: () => setFilters({ ...filters, statuses: [] }),
      'aria-label': 'Убрать фильтр по статусу', children: [`Статус: ${filters.statuses.map(statusText).join(', ')}`, jsx(Icon, { name: 'x' })] }) : null,
    jsx('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-clear': true, disabled: !filtersActive(filters), onClick: () => setFilters(emptyFilters()), children: 'Сбросить фильтры' }),
    jsx('span', { className: 'dy-kb-toolbar-gap', 'aria-hidden': true }),
    segmented('Раскладка', 'layout', working.layout, [['board', 'Доска'], ['list', 'Список']], (layout) => setWorking({ ...working, layout })),
    // Sahil 05/10: "Expanded" did not say what it did. One button opens (or closes) every card.
    working.layout === 'board' ? jsx('button', { type: 'button', className: 'dy-kb-control dy-kb-button', 'data-kanban-open-all': true, 'aria-pressed': working.density === 'detailed',
      title: "Показывать подробности всех карточек, не открывая каждую", onClick: () => { setOverrides({}); setWorking({ ...working, density: working.density === 'detailed' ? 'compact' : 'detailed' }) },
      children: 'Открыть все карточки' }) : null,
    jsx('span', { className: 'dy-kb-count', 'data-kanban-count': true, role: 'status', children: `${number(liveCount)} ${plural(liveCount, 'рабочий элемент', 'рабочих элементов')}` }),
  ]})

  // How to move a card; drag is never the only way (kept from C's board).
  const help = working.layout === 'board'
    ? jsx('p', { className: 'dy-kb-help', 'data-kanban-help': true, children: 'Перетащите карточку в другую колонку или откройте карточку и выберите «Переместить в». Предлагаются только те переходы, которые принимает Hermes.' })
    : null

  const editedStrip = edited ? jsxs('div', { className: 'dy-kb-edited', 'data-view-edited': currentName ?? ALL_WORK, role: 'status', children: [
    jsx('span', { className: 'dy-kb-dot', 'aria-hidden': true }),
    jsx('span', { className: 'dy-kb-edited-text', children: currentSaved ? `Несохранённые изменения в «${currentSaved.name}».` : 'Вы изменили «Всю работу». Сохраните как представление, чтобы оставить это.' }),
    currentSaved && currentSaved.mine !== false ? jsx('button', { type: 'button', className: 'dockyard-button small primary', 'data-view-save': true, disabled: busy, onClick: saveCurrent, children: 'Сохранить' }) : null,
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-save-as': true, disabled: busy, onClick: () => openPanel('new'), children: 'Сохранить как новый вид' }),
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-view-reset': true, onClick: resetView, children: 'Сброс' }),
  ]}) : null

  const notes = [
    deps.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'dependencies', role: 'status', children: 'Зависимости недоступны. «Заблокировано» и «Блокирует» не показаны.' }, 'deps') : null,
    roadmap.status === 'error' ? jsx('p', { className: 'dy-kb-note', 'data-kanban-note': 'objectives', role: 'status', children: 'Задачи-цели недоступны. Они не показаны.' }, 'roadmap') : null,
    // Never hide work: an item whose status no column lists is named here.
    unplaced.length ? jsxs('div', { className: 'dy-kb-note', 'data-kanban-note': 'unplaced', role: 'status', children: [
      jsx('span', { children: `${number(unplaced.length)} ${plural(unplaced.length, 'рабочий элемент', 'рабочих элементов')} не на доске: Hermes дал ${unplaced.length === 1 ? 'ему статус, который не показывает ни одна колонка' : 'им статусы, которые не показывает ни одна колонка'}. ` }),
      ...unplaced.map((item) => jsx('button', { type: 'button', className: 'dy-kb-goto', onClick: () => onOpenItem(item), children: `${item.ref} (${item.status})` }, item.ref)),
    ]}, 'unplaced') : null,
  ]

  const noMatch = allItems.length > 0 && liveCount === 0 && filtersActive(filters)
  const empty = noMatch
    ? jsxs('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'filters', children: ['Нет работы по этим фильтрам. ', jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => setFilters(emptyFilters()), children: 'Сбросить фильтры' })] }, 'empty')
    : allItems.length === 0
      ? jsx('p', { className: 'dy-kb-empty', 'data-kanban-empty': 'none', children: 'В этом проекте пока нет рабочих элементов. Добавьте работу на вкладке «Бэклог».' }, 'empty')
      : null

  // ---- board ----------------------------------------------------------------------
  const openRef = (ref) => {
    const target = allItems.find((item) => item.ref === ref)
    if (target) onOpenItem(target)
    else setWorkNotice(`Рабочего элемента ${ref} нет в данных доски этого проекта.`)
  }
  const toggleColumn = (key) => {
    const willCollapse = !collapsed[key]
    focusAfter.current = { key, to: willCollapse ? 'strip' : 'collapse' }
    setCollapsed((current) => ({ ...current, [key]: willCollapse }))
  }
  const card = (item, stageKey) => {
    const moves = movesOf(item)
    return jsx(Card, { item, facts: factsByRef[item.ref], fields: working.fields, open: isOpen(item.ref), moves, moving, today,
      onToggle: (ref, open) => setOverrides((current) => ({ ...current, [ref]: open })),
      onDragStart: (event) => { event.dataTransfer.setData('text/plain', item.ref); event.dataTransfer.effectAllowed = 'move'; setDragged({ ref: item.ref, project: project.id, from: stageKey, targets: moves.targets.map((target) => target.key) }) },
      onDragEnd: () => setDragged(null),
      onMove: transitionStatus, onOpenItem, onOpenRef: openRef, onNavigate,
    }, item.ref)
  }
  const column = (stage) => {
    const stageItems = grouped[stage.key]
    const isCollapsed = Boolean(collapsed[stage.key])
    const canDrop = Boolean(dragged) && dragged.project === project.id && !moving && dragged.targets.includes(stage.key)
    const refused = Boolean(dragged) && !canDrop && dragged.from !== stage.key
    return jsxs('section', { className: 'dockyard-board-column', 'data-board-column': stage.key, 'data-collapsed': isCollapsed ? 'true' : 'false',
      'data-drop-ready': canDrop ? 'true' : undefined, 'data-drop-refused': refused ? 'true' : undefined,
      onDragOver: (event) => { if (canDrop) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } },
      onDrop: (event) => { event.preventDefault(); if (canDrop) transitionStatus(dragged.ref, dropStatusOf(stage.key)); setDragged(null) },
      children: isCollapsed
        ? [jsxs('button', { type: 'button', className: 'dy-kb-strip', 'data-board-strip': stage.key, 'aria-expanded': false,
            'aria-label': `Развернуть ${stage.label}, ${number(stageItems.length)} ${plural(stageItems.length, 'рабочий элемент', 'рабочих элементов')}`, onClick: () => toggleColumn(stage.key), children: [
            jsx('span', { className: 'dy-kb-strip-count', children: number(stageItems.length) }),
            jsx('span', { className: 'dy-kb-strip-label', children: stage.label }),
          ]}, 'strip')]
        : [
            jsxs('header', { children: [
              jsx('button', { type: 'button', className: 'dy-kb-collapse', 'data-board-collapse': stage.key, 'aria-expanded': true, 'aria-label': `Свернуть ${stage.label}`, onClick: () => toggleColumn(stage.key), children: jsx(Icon, { name: 'chevrons-left' }) }),
              jsx('h3', { title: stage.hint, children: stage.label }),
              jsx('span', { children: number(stageItems.length) }),
            ]}, 'header'),
            jsx('div', { className: 'dockyard-board-cards', children: stageItems.length > 0 ? stageItems.map((item) => card(item, stage.key)) : jsx('p', { className: 'dockyard-meta', children: refused ? "Нельзя переместить сюда." : 'Здесь пусто.' }) }, 'cards'),
          ],
    }, stage.key)
  }
  const board = jsx('div', { className: 'dockyard-board', ref: boardRef, role: 'region', 'aria-label': 'Канбан-доска', 'data-kanban-board': true, children: STAGES.map(column) }, 'board')

  // ---- list (C's columns; card settings only change cards) --------------------------
  const refsCell = (cards) => jsx('div', { className: 'dy-kb-cell-refs', children: cards.map((linked) => jsx('button', { type: 'button', className: 'dy-kb-goto', 'data-done': linked.done ? 'true' : undefined, title: statusText(linked.status), onClick: () => openRef(linked.ref), children: `${linked.ref} ${linked.title}` }, linked.ref)) })
  const moveCell = (item) => {
    const moves = movesOf(item)
    return moves.targets.length
      ? jsxs('select', { 'aria-label': `Переместить ${item.ref}`, 'data-card-move': item.ref, disabled: moving, value: '', onChange: (event) => transitionStatus(item.ref, event.target.value), children: [
          jsx('option', { value: '', children: 'Переместить в…' }),
          ...moves.targets.map((target) => jsx('option', { value: target.status, children: target.label }, target.key)),
        ]})
      : jsx('span', { className: 'dy-kb-panel-meta', title: moves.reason ?? '', children: '—' })
  }
  const facts = (item) => factsByRef[item.ref]
  const listColumns = [
    { key: 'ref', heading: 'Номер', cell: (item) => jsx('button', { type: 'button', className: 'dy-kb-goto', onClick: () => onOpenItem(item), children: item.ref }) },
    { key: 'title', heading: 'Заголовок', cell: (item) => item.title },
    { key: 'type', heading: 'Тип', cell: (item) => typeLabel(item.type) },
    { key: 'status', heading: 'Состояние', cell: (item) => statusText(item.status) },
    { key: 'assignee', heading: 'Исполнитель', cell: (item) => item.assignee ? displayName(item.assignee) : 'Не назначен' },
    { key: 'blocked_by', heading: 'Блокируется', cell: (item) => refsCell(facts(item).blockedBy) },
    { key: 'blocks', heading: 'Блокирует', cell: (item) => refsCell(facts(item).blocks) },
    { key: 'initiative', heading: 'Инициатива', cell: (item) => facts(item).initiative ? (facts(item).initiative.title || facts(item).initiative.ref) : '' },
    { key: 'milestone', heading: 'Веха', cell: (item) => facts(item).milestones.map((milestone) => milestone.name).join(', ') },
    { key: 'goal', heading: 'Цель', cell: (item) => facts(item).goal ? facts(item).goal.title : '' },
    { key: 'due', heading: 'Срок', cell: (item) => facts(item).due ? `${shortDate(facts(item).due, today)}${facts(item).overdue ? ' · просрочено' : ''}` : '' },
    { key: 'move', heading: 'Переместить', cell: moveCell },
  ]
  const list = jsx('div', { className: 'dy-kb-list', children: jsx(WorkTable, { columns: listColumns, className: 'dy-kb-table',
    groups: STAGES.map((stage) => ({ key: stage.key, label: stage.label, items: grouped[stage.key] })).filter((group) => group.items.length > 0),
    emptyText: 'Рабочих элементов для списка нет.' }) }, 'list')

  // Milestones are managed with the project's Objectives (Sahil 05/10), not on the board.
  const body = [jsxs('div', { className: 'dy-kb-controls', children: [toolbar, editedStrip, help] }, 'controls'), ...notes, empty, working.layout === 'list' ? list : board]

  return jsxs('div', { className: 'dockyard-board-wrap', 'data-kanban-screen': true, 'data-view': currentName ?? ALL_WORK, 'data-panel-open': panel ? 'true' : undefined, children: [
    viewsBar,
    ...body,
    panel ? jsx(ViewsPanel, { views: viewList, currentName, working, edited, startNew: panel.mode === 'new' ? panel.at : 0, busy, error: viewError, openerRef: manageRef,
      onClose: () => setPanel(null), onSelect: selectView, onCreate: createView, onSaveCurrent: saveCurrent, onReset: resetView,
      onRename: renameView, onDuplicate: duplicateView, onShare: shareView, onDelete: deleteView,
      onFields: (next) => setWorking({ ...working, fields: next }), onClearFilters: () => setFilters(emptyFilters()) }, 'panel') : null,
  ]})
}
