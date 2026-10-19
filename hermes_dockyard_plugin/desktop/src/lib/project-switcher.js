// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Sahil 04/10 (demo feedback d): one global project switcher, with "All
// projects"; the Roadmap and Notifications pickers go. Design round 05/10:
// Sahil chose direction A, a breadcrumb "Project Stewardship / [Project]" with a search
// popover (the palette and project-row directions were removed). Its menu
// ends with "New project" then "Onboard existing project" (Sahil 05/10), the
// same two ways in as the top bar's buttons.
// The labels "Project context", "Find project" and "Projects" are kept so the
// existing journeys keep driving the switcher.
import { useEffect } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Icon } from './ui.js'
import { pluralRu } from './ui.js'
import { SWITCHER_WORDS } from './panel-words.js'

// The "All projects" choice. "*" can never be a project id (the backend
// stores the same value for the app to reopen on).
export const ALL_PROJECTS = '*'

const HEALTH = Object.freeze({
  critical: ['danger', 'Критично'],
  frozen: ['danger', 'Заморожен'],
  attention: ['danger', 'Требует внимания'],
  degraded: ['warning', 'Деградация'],
  watch: ['warning', 'Наблюдение'],
  healthy: ['success', 'Здоров'],
})
// Unknown health shows nothing: an empty grey dot reads as a status it is not.
export const healthOf = (project) => HEALTH[project?.health] ?? [null, '']
export const projectName = (project) => project?.name || project?.id || ''
const initials = (label) => String(label).split(/[^A-Za-z0-9]+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]).join('').toUpperCase() || '?'
// The phase and work-count words a project row shows. "active" is the ordinary
// phase and shows nothing; an unusual one reads with the same vocabulary as the
// project attention strip. Published so a screen or a test reads one table.
export const PHASE_WORD = Object.freeze({
  discovery: 'Исследование', paused: 'На паузе', frozen: 'Заморожен', disabled: 'Выключено', archived: 'В архиве',
})
// The one way to the archived list: its footer action names itself.
export const ARCHIVED_MENU = 'Архивные проекты'
export const META_WORDS = Object.freeze({
  inProgress: (count) => `${count} в работе`,
  blocked: (count) => `${count} заблокировано`,
  backlog: (count) => `${count} в бэклоге`,
  everyProject: (count) => `Все проекты · ${count} ${pluralRu(count, 'проект', 'проекта', 'проектов')}`,
})

export function projectMeta(project) {
  const work = project?.work ?? {}
  const parts = []
  // "active" is the ordinary phase; only an unusual phase (paused, discovery...) is worth saying.
  if (project?.phase && String(project.phase).toLowerCase() !== 'active') {
    const phase = String(project.phase).toLowerCase()
    parts.push(PHASE_WORD[phase] ?? String(project.phase).replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()))
  }
  if (Number(work.active) > 0) parts.push(META_WORDS.inProgress(work.active))
  if (Number(work.blocked) > 0) parts.push(META_WORDS.blocked(work.blocked))
  if (!Number(work.active) && !Number(work.blocked) && Number(work.backlog) > 0) parts.push(META_WORDS.backlog(work.backlog))
  return parts.join(' · ')
}

// Initials are drawn by CSS (attr()), not written as text: a project's name
// reads exactly ("atlas-mobile", not "AM atlas-mobile") for screen readers,
// copy and the journeys that read the switcher.
export function ProjectAvatar({ project, all = false, size = '' }) {
  return jsx('span', {
    className: `dy-sw-avatar${size ? ` ${size}` : ''}`,
    'data-all': all ? 'true' : undefined,
    'data-initials': all ? undefined : initials(projectName(project)),
    'aria-hidden': true,
    children: all ? jsx(Icon, { name: 'layers' }) : null,
  })
}

// Search + keyboard state for the popover.
function useSwitcherList(projects, scope) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const needle = query.trim().toLowerCase()
  const entries = [
    ...(!needle || 'all projects'.includes(needle) ? [{ id: ALL_PROJECTS, all: true }] : []),
    ...projects
      .filter((project) => `${projectName(project)} ${project.id}`.toLowerCase().includes(needle))
      .map((project) => ({ id: project.id, project })),
  ]
  // Opening puts the cursor on the current choice, so Enter keeps it.
  const openAt = () => {
    setQuery('')
    const ids = [ALL_PROJECTS, ...projects.map((project) => project.id)]
    setActive(Math.max(0, ids.indexOf(scope)))
  }
  const onKeyDown = (event, pick, close) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'Enter') { event.preventDefault(); if (entries[active]) pick(entries[active].id); return }
    if (['ArrowDown', 'ArrowUp', 'Главная', 'End'].includes(event.key)) {
      event.preventDefault()
      const last = Math.max(0, entries.length - 1)
      setActive(event.key === 'Home' ? 0 : event.key === 'End' ? last
        : Math.max(0, Math.min(last, active + (event.key === 'ArrowDown' ? 1 : -1))))
    }
  }
  return { query, setQuery: (value) => { setQuery(value); setActive(0) }, active, setActive, entries, openAt, onKeyDown }
}

function SwitcherSearch({ idPrefix, list, onPick, onClose }) {
  return jsxs('label', { className: 'dy-sw-search', children: [
    jsx(Icon, { name: 'search' }),
    jsx('input', {
      autoFocus: true,
      role: 'combobox',
      'aria-label': SWITCHER_WORDS.find,
      'aria-expanded': true,
      'aria-controls': `${idPrefix}-options`,
      'aria-autocomplete': 'list',
      'aria-activedescendant': list.entries[list.active] ? `${idPrefix}-option-${list.active}` : undefined,
      placeholder: SWITCHER_WORDS.find,
      value: list.query,
      onChange: (event) => list.setQuery(event.target.value),
      onKeyDown: (event) => list.onKeyDown(event, onPick, onClose),
    }),
  ] })
}

function SwitcherOptions({ idPrefix, list, scope, projects, onPick }) {
  const activeId = `${idPrefix}-option-${list.active}`
  useEffect(() => { document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' }) }, [activeId])
  if (!list.entries.length) return jsx('p', { role: 'status', className: 'dy-sw-empty', children: 'Нет подходящих проектов' })
  return jsx('div', { role: 'listbox', id: `${idPrefix}-options`, 'aria-label': SWITCHER_WORDS.list, className: 'dy-sw-options', children:
    list.entries.map((entry, index) => {
      const project = entry.project
      const [tone, healthLabel] = entry.all ? ['neutral', ''] : healthOf(project)
      const meta = entry.all ? META_WORDS.everyProject(projects.length) : projectMeta(project)
      return jsxs('div', {
        role: 'option',
        id: `${idPrefix}-option-${index}`,
        'aria-selected': entry.id === scope,
        'aria-label': entry.all ? 'Все проекты' : projectName(project),
        className: 'dy-sw-option',
        'data-active': index === list.active ? 'true' : undefined,
        'data-project-option': entry.id,
        onMouseDown: (event) => event.preventDefault(),
        onMouseMove: () => { if (index !== list.active) list.setActive(index) },
        onClick: () => onPick(entry.id),
        children: [
          jsx(ProjectAvatar, { project, all: entry.all }),
          jsxs('span', { className: 'dy-sw-option-copy', children: [
            jsx('strong', { children: entry.all ? 'Все проекты' : projectName(project) }),
            meta ? jsx('span', { children: meta }) : null,
          ] }),
          entry.all || !tone ? null : jsx('span', { className: `dy-sw-dot ${tone}`, title: healthLabel, 'aria-hidden': true }),
          jsx('span', { className: 'dy-sw-check', 'aria-hidden': true, children: entry.id === scope ? jsx(Icon, { name: 'check' }) : null }),
        ],
      }, entry.id)
    }) })
}

function TriggerLabel({ projects, scope }) {
  const current = scope && scope !== ALL_PROJECTS ? projects.find((project) => project.id === scope) : null
  const label = scope === ALL_PROJECTS ? 'Все проекты' : current ? projectName(current) : (scope || SWITCHER_WORDS.empty)
  return [
    jsx(ProjectAvatar, { project: current ?? { id: label }, all: scope === ALL_PROJECTS }, 'avatar'),
    jsx('span', { className: 'dy-sw-trigger-name', children: label }, 'name'),
  ]
}

// The ways into a new project, at the foot of the switcher's menu. Both open
// the onboarding wizard (Sahil 05/10: "Onboard existing project" comes after
// "New project").
function SwitcherFoot({ onNewProject, onOnboardExisting, onOpenArchived, archivedCount = 0, close }) {
  // close() puts focus back on the switcher's button before the wizard opens,
  // so closing the wizard returns there (this menu item is gone by then).
  const action = (marker, icon, label, run) => jsxs('button', {
    type: 'button', className: 'dy-sw-foot-action', [marker]: 'true',
    onMouseDown: (event) => event.preventDefault(),
    onClick: () => { close(); run() },
    children: [jsx(Icon, { name: icon }), label],
  }, marker)
  const actions = [
    onNewProject ? action('data-switcher-new-project', 'plus', 'Новый проект', onNewProject) : null,
    onOnboardExisting ? action('data-switcher-onboard-existing', 'folder-open', 'Подключить существующий проект', onOnboardExisting) : null,
    // Archived projects are hidden everywhere else; this is the way to them (11/10/2026).
    onOpenArchived && archivedCount > 0
      ? action('data-switcher-archived', 'archive', `${ARCHIVED_MENU} (${archivedCount})`, onOpenArchived) : null,
  ].filter(Boolean)
  return actions.length ? jsx('div', { className: 'dy-sw-foot', children: actions }) : null
}

// The breadcrumb next to the brand, with a search popover underneath.
export function ProjectSwitcher({ projects, scope, onChange, onNewProject, onOnboardExisting, onOpenArchived, archivedCount = 0 }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef(null)
  const list = useSwitcherList(projects, scope)
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pick = (id) => { onChange(id); close() }
  return jsxs('div', {
    className: 'dy-sw',
    onBlur: (event) => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false) },
    children: [
      jsx('span', { className: 'dy-sw-slash', 'aria-hidden': true, children: '/' }),
      jsxs('button', {
        ref: trigger,
        type: 'button',
        className: 'dy-sw-trigger',
        'aria-label': SWITCHER_WORDS.context,
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'data-scope': scope ?? '',
        onClick: () => { if (!open) list.openAt(); setOpen(!open) },
        children: [...TriggerLabel({ projects, scope }), jsx('span', { className: 'dy-sw-caret', children: jsx(Icon, { name: 'arrow-up-down' }) }, 'caret')],
      }),
      open ? jsxs('div', { className: 'dy-sw-popover', role: 'dialog', 'aria-label': 'Сменить проект', children: [
        jsx(SwitcherSearch, { idPrefix: 'dy-sw', list, onPick: pick, onClose: () => close() }),
        jsx(SwitcherOptions, { idPrefix: 'dy-sw', list, scope, projects, onPick: pick }),
        jsx(SwitcherFoot, { onNewProject, onOnboardExisting, onOpenArchived, archivedCount, close }),
      ] }) : null,
    ],
  })
}

// The words on a screen that follows the switcher while it is on one project.
// The nouns a caller passes are the genitive plural forms ("N элементов в
// других проектах"), one per screen, published here so shell/dashboard-page.js
// and any test read the same list.
export const SCOPE_NOUNS = Object.freeze({
  needsYou: 'элементов, которые ждут вас',
  items: 'элементов',
  approvals: 'одобрений',
  notifications: 'уведомлений',
})
export const SCOPE_WORDS = Object.freeze({
  showingOnly: (name) => `Показан только ${name}.`,
  inOtherProjects: (count, noun) => `${count} ${noun} в других проектах.`,
  showAll: 'Показать все проекты',
})

// Shown on screens that follow the switcher while it is on one project.
export function ScopeNote({ name, hidden = 0, noun = SCOPE_NOUNS.items, onShowAll }) {
  return jsxs('div', { className: 'dy-scope-note', role: 'note', 'data-scope-note': 'true', children: [
    jsx(Icon, { name: 'filter' }),
    jsxs('span', { children: [
      jsx('strong', { children: SCOPE_WORDS.showingOnly(name) }),
      hidden > 0 ? ` ${SCOPE_WORDS.inOtherProjects(hidden, noun)}` : '',
    ] }),
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-show-all-projects': 'true', onClick: onShowAll, children: SCOPE_WORDS.showAll }),
  ] })
}

// Screens that work on one project ask for one while "All projects" is on.
export const CHOOSER_WORDS = Object.freeze({
  title: (screen) => `${screen}: выберите проект`,
  body: (screen) => `${screen} работает с одним проектом за раз. Переключатель стоит на «Все проекты», поэтому выберите проект здесь или в переключателе.`,
})

export function ProjectChooser({ projects, screen, onPick, onNewProject, onOnboardExisting }) {
  return jsxs('section', { className: 'dy-chooser', 'data-project-chooser': screen, children: [
    jsxs('header', { children: [
      jsx('h1', { children: CHOOSER_WORDS.title(screen) }),
      jsx('p', { children: CHOOSER_WORDS.body(screen) }),
    ] }),
    projects.length
      ? jsx('ul', { className: 'dy-chooser-list', children: projects.map((project) => {
          const [tone, healthLabel] = healthOf(project)
          return jsx('li', { children: jsxs('button', {
            type: 'button', className: 'dy-chooser-item', 'data-choose-project': project.id, onClick: () => onPick(project.id),
            children: [
              jsx(ProjectAvatar, { project, size: 'lg' }),
              jsxs('span', { className: 'dy-sw-option-copy', children: [
                jsx('strong', { children: projectName(project) }),
                jsx('span', { children: projectMeta(project) || 'Работы пока нет' }),
              ] }),
              tone ? jsxs('span', { className: `dy-sw-health ${tone}`, children: [jsx('span', { className: 'dy-sw-dot', 'aria-hidden': true }), healthLabel] }) : null,
              jsx('span', { className: 'dy-chooser-go', 'aria-hidden': true, children: jsx(Icon, { name: 'chevron' }) }),
            ],
          }) }, project.id)
        }) })
      : jsxs('div', { className: 'dy-chooser-empty', children: [
          jsx('p', { children: 'Проектов пока нет.' }),
          onNewProject ? jsx('button', { type: 'button', className: 'dockyard-button primary', onClick: onNewProject, children: 'Новый проект' }) : null,
          onOnboardExisting ? jsx('button', { type: 'button', className: 'dockyard-button', onClick: onOnboardExisting, children: 'Подключить существующий проект' }) : null,
        ] }),
  ] })
}
