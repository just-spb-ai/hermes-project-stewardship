// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows design round (07/10/2026): pieces both options use. Anything that
// writes to the stand-in store is tagged "Preview".
import { useState } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { useDialogFocusManager } from '../../lib/ui.js'
import { readWorkflowSettings } from './standins.js'
import { writeWorkflowSettings } from './standins.js'
import { CHECK_WORDS } from './standins.js'

export const PreviewTag = ({ children = 'Предпросмотр' }) => jsx('span', { className: 'dy-wfd-preview-tag', children })
export const PracticeAiNote = () => jsxs('p', { className: 'dy-wfd-ai-note', 'data-wfd-practice-ai': true, children: [
  jsx(PreviewTag, { children: 'Практика ИИ' }), ' Готовые ответы для этой проверки; модель не вызывается.',
] })

// Steps in the order they run (each step after the steps it waits for).
export function runOrder(nodes) {
  const byId = new Map(nodes.map((n) => [n.id ?? n.node_id, n]))
  const seen = new Set(); const out = []
  const visit = (id) => {
    if (seen.has(id) || !byId.has(id)) return
    seen.add(id)
    for (const dep of byId.get(id).depends_on ?? []) visit(dep)
    out.push(byId.get(id))
  }
  for (const n of nodes) visit(n.id ?? n.node_id)
  return out
}

// `roleOf` (optional) names who a step goes to before any bot is picked: a
// built-in template's steps say "the worker" or "the checker".
export function stepNotes(node, nodes, roleOf = null) {
  const notes = []
  if (node.human_gate) notes.push('ваше подписание')
  if (node.loop) notes.push(`повтор, до ${node.loop.max_iterations} раундов`)
  if (node.when) notes.push(`только если «${nodes.find((n) => (n.id ?? n.node_id) === node.when.node)?.title ?? node.when.node}» ${node.when.status === 'blocked' ? 'застревает' : 'выполнено'}`)
  if (node.phase_team) notes.push(`выполняет ${node.phase_team}`)
  else if (roleOf && !node.human_gate && roleOf(node)) notes.push(roleOf(node) === 'checker' ? 'проверяющий' : 'исполнитель')
  return notes
}

export function StepsPreview({ nodes, roleOf = null }) {
  const ordered = runOrder(nodes)
  return jsx('ol', { className: 'dy-wfd-steps', 'data-wfd-steps': ordered.length, children: ordered.map((node) => jsxs('li', { children: [
    jsx('strong', { children: node.title }),
    ...stepNotes(node, nodes, roleOf).map((note) => jsx('span', { className: 'dy-wfd-step-note', children: note }, note)),
  ] }, node.id ?? node.node_id)) })
}

// Use a template: the built-in templates in their groups, then the ones saved
// in the library. A pick is { source: 'builtin' | 'library', item }.
const stepCount = (n) => `шагов: ${n}`
const matches = (words, ...fields) => !words || fields.some((f) => String(f ?? '').toLowerCase().includes(words))
// The templates sit on tabs, one group at a time (Sahil 08/10/2026: tabs, not
// one long list whose heading changed as it scrolled). Each tab shows its
// count. Typing searches every tab at once: the tabs then count the matches
// and none is open; picking a tab ends the search. The panel keeps one height,
// so the dialog does not jump from tab to tab.
export function TemplatePicker({ builtins, groups, saved, value, onPick }) {
  const tabs = [
    ...groups.map((group) => ({ id: group.id, label: group.tab ?? group.title, title: group.title, items: builtins.filter((t) => t.group === group.id) })),
    { id: 'library', label: 'Сохранено', title: 'Сохранено в библиотеке' },
  ]
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(() => (value ? (value.source === 'library' ? 'library' : value.item.group) : tabs[0].id))
  const words = filter.trim().toLowerCase()
  const builtinHit = (t) => matches(words, t.title, t.summary, t.based_on, t.name)
  const savedHit = (t) => matches(words, t.name)
  const countOf = (tab) => (tab.id === 'library' ? (saved === null ? null : (saved ?? []).filter(savedHit).length) : tab.items.filter(builtinHit).length)
  const labelOf = (groupId) => tabs.find((tab) => tab.id === groupId)?.label ?? ''
  const isPicked = (source, name) => value?.source === source && value.item.name === name
  const current = words ? null : (tabs.find((tab) => tab.id === open) ?? tabs[0])
  const choose = (id) => { setFilter(''); setOpen(id) }
  // Arrow keys, Home and End move between tabs (and open them).
  const onTabKey = (event) => {
    const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')]
    const at = Math.max(0, buttons.indexOf(document.activeElement))
    const next = { ArrowRight: (at + 1) % tabs.length, ArrowLeft: (at - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    choose(tabs[next].id)
    buttons[next]?.focus()
  }
  const item = (source, t, withGroup) => {
    const nodes = source === 'builtin' ? t.nodes : t.definition?.nodes ?? []
    const where = withGroup ? `${source === 'builtin' ? labelOf(t.group) : 'Сохранено'} · ` : ''
    return jsxs('button', {
      type: 'button', role: 'radio', 'aria-checked': isPicked(source, t.name), [source === 'builtin' ? 'data-wfd-builtin' : 'data-wfd-template']: t.name,
      className: `dy-wfd-tpl-item${isPicked(source, t.name) ? ' active' : ''}`, onClick: () => onPick({ source, item: t }),
      children: [
        jsxs('span', { className: 'dy-wfd-template-head', children: [jsx('strong', { children: source === 'builtin' ? t.title : t.name }), jsx('small', { children: `${where}${stepCount(nodes.length)}` })] }),
        jsx('span', { className: 'dy-wfd-tpl-summary', children: source === 'builtin' ? t.summary : runOrder(nodes).map((n) => n.title).join(' → ') }),
      ],
    }, `${source}:${t.name}`)
  }
  let items = []
  let note = null
  if (words) {
    items = [...builtins.filter(builtinHit).map((t) => item('builtin', t, true)), ...(saved ?? []).filter(savedHit).map((t) => item('library', t, true))]
    if (!items.length) note = jsx('span', { className: 'dockyard-meta', role: 'status', children: `Нет шаблонов по запросу «${filter.trim()}».` })
  } else if (current.id === 'library') {
    if (saved === null) note = jsx('span', { className: 'dockyard-meta', role: 'status', children: 'Загрузка сохранённых шаблонов…' })
    else if (!saved.length) note = jsx('span', { className: 'dockyard-meta', 'data-wfd-no-templates': true, children: 'Пока ничего не сохранено. Чтобы сделать процесс шаблоном, сохраните его для всех проектов в библиотеке.' })
    else items = saved.map((t) => item('library', t, false))
  } else {
    items = current.items.map((t) => item('builtin', t, false))
  }
  return jsxs('div', { className: 'dy-wfd-tpl', children: [
    jsxs('label', { className: 'dy-wfd-field', children: [
      jsx('span', { children: 'Найти шаблон' }),
      jsx('input', { type: 'search', value: filter, 'data-wfd-template-filter': true, placeholder: 'Поиск по всем шаблонам, напр. баг, релиз, исследование', onChange: (e) => setFilter(e.target.value) }),
    ] }),
    jsx('div', { className: 'dy-wfd-tpl-tabs', role: 'tablist', 'aria-label': 'Группы шаблонов', onKeyDown: onTabKey, children: tabs.map((tab, index) => {
      const selected = current?.id === tab.id
      const count = countOf(tab)
      return jsxs('button', {
        type: 'button', role: 'tab', id: `wfd-tpl-tab-${tab.id}`, title: tab.title, 'data-wfd-template-tab': tab.id,
        'aria-selected': selected ? 'true' : 'false', 'aria-controls': 'wfd-tpl-panel', tabIndex: selected || (!current && index === 0) ? 0 : -1,
        className: `dy-wfd-tpl-tab${selected ? ' active' : ''}`, onClick: () => choose(tab.id),
        children: [jsx('span', { children: tab.label }), jsx('span', { className: 'dy-wfd-tpl-count', children: count === null ? '…' : String(count) })],
      }, tab.id)
    }) }),
    jsxs('div', {
      id: 'wfd-tpl-panel', className: 'dy-wfd-tpl-panel', 'data-wfd-template-panel': current ? current.id : 'matches',
      role: current ? 'tabpanel' : 'region', 'aria-labelledby': current ? `wfd-tpl-tab-${current.id}` : undefined, 'aria-label': current ? undefined : `Шаблоны по запросу «${filter.trim()}»`,
      children: [
        items.length ? jsx('div', { className: 'dy-wfd-tpl-list', role: 'radiogroup', 'aria-label': current ? current.title : 'Подходящие шаблоны', children: items }) : null,
        note,
      ],
    }),
  ] })
}

export function ImportResult({ result }) {
  if (!result) return null
  if (result.kind === 'invalid') return jsx('p', { className: 'dy-wfd-error', role: 'alert', 'data-wfd-import-error': true, children: result.reason })
  if (result.kind === 'dockyard') return jsxs('div', { className: 'dy-wfd-import-ok', role: 'status', 'data-wfd-import': 'dockyard', children: [
    jsx('p', { children: `Процесс Project Stewardship${result.name ? ` ("${result.name}")` : ''}: шагов ${result.nodes.length}. Импортируется точно.` }),
    ...result.warnings.map((w) => jsx('p', { className: 'dockyard-meta', children: w }, w)),
    jsx(StepsPreview, { nodes: result.nodes }),
  ] })
  return jsxs('div', { className: 'dy-wfd-import-ok', role: 'status', 'data-wfd-import': 'other', children: [
    jsx(PracticeAiNote, {}),
    jsx('p', { children: `Это похоже на ${result.format}. ИИ набросал по нему шагов: ${result.nodes.length}.` }),
    jsx('p', { className: 'dockyard-meta', children: `Не удалось перенести: ${result.notCarried.join('; ')}.` }),
    jsx(StepsPreview, { nodes: result.nodes }),
  ] })
}

// The AI's answer: its plan in words, the steps and its questions.
// `readOnly`: a plan that is no longer a live suggestion (applied, replaced,
// or the one a workflow was created from) shows its answers but changes nothing.
export function AiPlan({ draft, onAnswer, readOnly = false }) {
  return jsxs('div', { className: 'dy-wfd-ai-plan', 'data-wfd-ai-plan': draft.name, children: [
    jsx('h4', { children: "Вот мой план" }),
    jsx('ol', { className: 'dy-wfd-ai-explain', children: draft.explain.map((line) => jsx('li', { children: line }, line)) }),
    jsx('h4', { children: 'Шаги' }),
    jsx(StepsPreview, { nodes: draft.nodes }),
    draft.questions.length ? jsx('h4', { children: 'Вопросы к тебе' }) : null,
    ...draft.questions.map((q) => jsxs('div', { className: 'dy-wfd-question', role: 'group', 'aria-label': q.text, 'data-wfd-question': q.id, children: [
      jsx('span', { children: q.text }),
      jsx('span', { className: 'dy-wfd-chips', children: q.options.map((o) => jsx('button', { type: 'button', 'aria-pressed': q.current === o.value, 'data-wfd-answer': `${q.id}:${o.value}`, disabled: readOnly, onClick: () => onAnswer(q.id, o.value), children: o.label }, String(o.value))) }),
    ] }, q.id)),
  ] })
}

const TRIGGERS = [['manual', 'Вручную: я нажимаю «Старт»'], ['schedule', 'По расписанию'], ['event', 'Когда что-то происходит']]
const SCHEDULES = [['weekdays', 'По будням'], ['daily', 'Каждый день'], ['mondays', 'Каждый понедельник']]
const EVENTS = [['task-done', 'Задача в этом проекте завершается'], ['task-blocked', 'Задача в этом проекте застревает'], ['run-done', 'Запуск этого процесса завершается']]

export function WorkflowSettingsDialog({ project, workflow, title, members, onClose }) {
  const saved = readWorkflowSettings(project, workflow)
  const [trigger, setTrigger] = useState(saved.trigger)
  const [improve, setImprove] = useState(saved.improve)
  const [error, setError] = useState(null)
  useDialogFocusManager('[data-wfd-settings]')
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const save = () => {
    const runs = Number(improve.afterRuns)
    if (improve.on && !(Number.isInteger(runs) && runs >= 1 && runs <= 50)) { setError('Через сколько запусков: целое число от 1 до 50.'); return }
    if (trigger.kind === 'schedule' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(trigger.time)) { setError('Время: 24-часовой формат, напр. 09:00.'); return }
    writeWorkflowSettings(project, workflow, { trigger, improve: { ...improve, afterRuns: runs || 5 } })
    onClose()
  }
  const radio = (value, words) => jsxs('label', { className: 'dy-wfd-radio', children: [
    jsx('input', { type: 'radio', name: 'wfd-trigger', value, checked: trigger.kind === value, 'data-wfd-trigger': value, onChange: () => setTrigger({ ...trigger, kind: value }) }),
    jsx('span', { children: words }),
  ] }, value)
  return jsx('section', { className: 'dockyard-modal-layer', 'data-wfd-settings': workflow, onClick: (event) => { if (event.target === event.currentTarget) onClose() }, children:
    jsxs('div', { className: 'dockyard-modal dy-wfd-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'wfd-settings-title', children: [
      jsxs('div', { className: 'dockyard-modal-head', children: [
        jsxs('div', { children: [jsx('h2', { id: 'wfd-settings-title', children: 'Настройки процесса' }), jsx('p', { children: title })] }),
        jsx(Button, { small: true, action: 'wfd-settings-close', ariaLabel: 'Закрыть настройки', onClick: onClose, children: '×' }),
      ] }),
      jsxs('fieldset', { className: 'dy-wfd-fieldset', children: [
        jsxs('legend', { children: ['Когда запускается ', jsx(PreviewTag, {})] }),
        ...TRIGGERS.map(([value, words]) => radio(value, words)),
        trigger.kind === 'schedule' ? jsxs('div', { className: 'dy-wfd-row', children: [
          jsxs('label', { children: [jsx('span', { children: 'Как часто' }), jsx('select', { value: trigger.schedule, 'data-wfd-schedule': true, onChange: (e) => setTrigger({ ...trigger, schedule: e.target.value }), children: SCHEDULES.map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }),
          jsxs('label', { children: [jsx('span', { children: 'В (время UK)' }), jsx('input', { value: trigger.time, 'data-wfd-time': true, inputMode: 'numeric', onChange: (e) => setTrigger({ ...trigger, time: e.target.value }) })] }),
        ] }) : null,
        trigger.kind === 'event' ? jsxs('label', { className: 'dy-wfd-row', children: [jsx('span', { children: 'Когда' }), jsx('select', { value: trigger.event, 'data-wfd-event': true, onChange: (e) => setTrigger({ ...trigger, event: e.target.value }), children: EVENTS.map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }) : null,
      ] }),
      jsxs('fieldset', { className: 'dy-wfd-fieldset', children: [
        jsxs('legend', { children: ['Улучшение со временем ', jsx(PreviewTag, {})] }),
        jsxs('label', { className: 'dy-wfd-radio', children: [
          jsx('input', { type: 'checkbox', checked: improve.on, 'data-wfd-improve': true, onChange: (e) => setImprove({ ...improve, on: e.target.checked }) }),
          jsx('span', { children: 'После нескольких запусков бот-ревьюер предлагает изменения' }),
        ] }),
        improve.on ? jsxs('div', { className: 'dy-wfd-row', children: [
          jsxs('label', { children: [jsx('span', { children: 'После стольких запусков' }), jsx('input', { type: 'number', min: 1, max: 50, value: improve.afterRuns, 'data-wfd-improve-runs': true, onChange: (e) => setImprove({ ...improve, afterRuns: e.target.value }) })] }),
          jsxs('label', { children: [jsx('span', { children: 'Проверяющий' }), jsx('select', { value: improve.reviewer, 'data-wfd-improve-reviewer': true, onChange: (e) => setImprove({ ...improve, reviewer: e.target.value }), children: [jsx('option', { value: '', children: 'Кого выберет проект' }, ''), ...members.map((m) => jsx('option', { value: m, children: m }, m))] })] }),
        ] }) : null,
        jsx('p', { className: 'dockyard-meta', children: 'Ничего не изменится, пока вы не одобрите предложение.' }),
      ] }),
      error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
      jsxs('div', { className: 'dockyard-modal-actions', children: [
        jsx(Button, { action: 'wfd-settings-cancel', onClick: onClose, children: 'Отмена' }),
        jsx(Button, { action: 'wfd-settings-save', variant: 'primary', onClick: save, children: 'Сохранить настройки' }),
      ] }),
    ] }) })
}

// The repeat settings, opened from a frame (or the step panel) and anchored
// next to it. Rounds are real (saved with the workflow); the check is a
// preview.
export function RepeatPopover({ node, anchor, check: savedCheck, onSave, onStop, onClose, draft }) {
  const [rounds, setRounds] = useState(String(node.loop?.max_iterations ?? 3))
  const [check, setCheck] = useState(savedCheck)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager('[data-wfd-repeat]')
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Below the frame's label when it fits clear of the bottom of the window
  // (where the review bar and status messages sit), otherwise above it.
  const width = 300
  const height = check.by === 'judge' ? 360 : 310
  const viewW = globalThis.innerWidth ?? 1024
  const viewH = globalThis.innerHeight ?? 768
  const left = Math.max(8, Math.min((anchor?.left ?? 40), viewW - width - 8))
  const below = (anchor?.bottom ?? 120) + 6
  const top = below + height <= viewH - 90 ? below : Math.max(8, (anchor?.top ?? 120) - 6 - height)
  const run = async (action) => {
    setBusy(true); setError(null)
    try { await action(); onClose() } catch (failure) { setError(`Не удалось сохранить: ${String(failure?.message ?? failure).replace(/^\d{3}:\s*/, '')}`); setBusy(false) }
  }
  const save = () => {
    const n = Number(rounds)
    if (!(Number.isInteger(n) && n >= 1 && n <= 10)) { setError('Раундов должно быть целое число от 1 до 10.'); return }
    run(() => onSave({ rounds: n, check }))
  }
  return jsxs('div', { className: 'dy-wfd-repeat', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'wfd-repeat-title', 'data-wfd-repeat': node.node_id ?? node.id, style: { left: `${left}px`, top: `${top}px`, width: `${width}px` }, children: [
    jsx('h3', { id: 'wfd-repeat-title', children: `Повтор: «${node.title}»` }),
    jsxs('label', { children: [jsx('span', { children: 'Не более столько раундов, затем оно спросит вас' }), jsx('input', { type: 'number', min: 1, max: 10, value: rounds, 'aria-invalid': error ? 'true' : 'false', 'data-wfd-repeat-rounds': true, onChange: (e) => setRounds(e.target.value) })] }),
    jsxs('label', { children: [jsxs('span', { children: ["Как проверяется ", jsx(PreviewTag, {})] }), jsx('select', { value: check.by, 'data-wfd-repeat-check': true, onChange: (e) => setCheck({ ...check, by: e.target.value }), children: Object.entries(CHECK_WORDS).map(([v, w]) => jsx('option', { value: v, children: w }, v)) })] }),
    check.by === 'judge' ? jsxs('label', { children: [jsx('span', { children: 'Готово, когда' }), jsx('input', { value: check.doneWhen, placeholder: 'напр. все тесты проходят', 'data-wfd-repeat-done-when': true, onChange: (e) => setCheck({ ...check, doneWhen: e.target.value }) })] }) : null,
    jsx('p', { className: 'dockyard-meta', children: 'Застрявший раунд начнётся заново; после последнего — спросит тебя.' }),
    error ? jsx('p', { className: 'dy-wfd-error', role: 'alert', children: error }) : null,
    jsxs('div', { className: 'dy-wfd-repeat-actions', children: [
      jsx(Button, { small: true, variant: 'primary', action: 'wfd-repeat-save', disabled: busy, onClick: save, children: busy ? 'Сохранение…' : (draft ? 'Применить к черновику' : 'Сохранить версию') }),
      jsx(Button, { small: true, action: 'wfd-repeat-stop', disabled: busy, onClick: () => run(onStop), children: 'Прекратить повтор' }),
      jsx(Button, { small: true, action: 'wfd-repeat-cancel', disabled: busy, onClick: onClose, children: 'Отмена' }),
    ] }),
  ] })
}
