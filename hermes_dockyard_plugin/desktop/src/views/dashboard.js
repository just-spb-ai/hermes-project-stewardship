// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { sortApprovals } from '../data/loaders.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { riskDetails } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { healthDetails } from '../lib/ui.js'
import { initials } from '../data/loaders.js'
import { severityTone } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { readableLabel } from '../data/loaders.js'
import { UNLINKED_LABEL } from '../data/unlinked.js'
import { EmptyState } from '../lib/ui.js'
import { validationSummary } from '../data/loaders.js'
import { unassignedWork } from '../data/loaders.js'
import { emitToast } from '../runtime/context.js'
export function DiscoveredProfilePicker({ profiles = [], value = '', onChange, name, label = 'Профиль Hermes', disabled = false }) {
  const [search, setSearch] = useState('')
  const normalised = profiles.map((profile) => ({
    ...profile,
    value: profile.slug || profile.name || profile.id,
    label: profile.display_name || profile.slug || profile.name || profile.id,
  })).filter((profile) => profile.value)
  if (value && !normalised.some((profile) => profile.value === value)) {
    normalised.push({ value, label: value, available: false, selectable: false, historical_reference: true })
  }
  const query = search.trim().toLowerCase()
  const visible = normalised.filter((profile) => !query || profile.label.toLowerCase().includes(query) || profile.value.toLowerCase().includes(query))
  return jsxs('div', { className: 'dockyard-field dockyard-profile-picker', 'data-profile-picker': name, children: [
    jsx('label', { htmlFor: `dockyard-profile-search-${name}`, children: `${label} search` }),
    jsx('input', { id: `dockyard-profile-search-${name}`, 'data-profile-search': true, value: search, placeholder: 'Поиск обнаруженных профилей', disabled, onInput: (event) => setSearch(event.target.value), onChange: (event) => setSearch(event.target.value) }),
    jsx('select', { value, disabled, 'aria-label': label, onChange: (event) => onChange?.(event.target.value), children: [
      jsx('option', { value: '', children: 'Выберите доступный профиль' }, 'none'),
      ...visible.map((profile) => jsx('option', { value: profile.value, disabled: profile.available === false || profile.selectable === false, children: `${profile.label}${profile.available === false || profile.selectable === false ? ' (unavailable)' : ''}` }, profile.value)),
    ] }),
  ] })
}

export function AttentionPanel({ items, onReview }) {
  const decisions = sortApprovals(items ?? [])
  const owed = decisions.length
  if (owed === 0) {
    return jsxs('section', { className: 'dockyard-attention-card is-clear', 'data-dashboard-card': 'attention', children: [
      jsxs('div', { className: 'dockyard-attention-summary', children: [
        jsx('span', { className: 'dockyard-attention-icon', children: jsx(Icon, { name: 'check' }) }),
        jsx('h2', { children: 'Решений не ожидается' }),
        jsx('strong', { className: 'dockyard-decision-count', children: 'Всё чисто' }),
        jsx('p', { children: 'Флот может продолжать без участия владельца.' }),
      ]}),
    ]})
  }
  return jsxs('section', { className: 'dockyard-attention-card', 'data-dashboard-card': 'attention', children: [
    jsxs('div', { className: 'dockyard-attention-summary', children: [
      jsx('h2', { children: 'Ждёт твоего решения' }),
      jsx('strong', { className: 'dockyard-decision-count', children: number(owed) }),
      jsx('p', { children: `${number(owed)} ${plural(owed, 'decision')} carry project context and a declared risk.` }),
      jsx(Button, { variant: 'primary', onClick: onReview, children: 'Обзор решений' }),
    ]}),
    jsxs('div', { className: 'dockyard-attention-copy', children: [
      jsx('h2', { children: 'Всё остальное может продолжаться' }),
      jsx('div', { className: 'dockyard-attention-list', children:
        decisions.map((item) => {
          const [tone, label] = riskDetails(item.risk)
          return jsxs('div', { className: 'dockyard-attention-decision', 'data-attention-decision': item.ref, children: [
            jsx(StatusTag, { tone, label }),
            jsxs('span', { children: [
              jsx('strong', { children: item.title }),
              jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}` }),
            ]}),
            jsx(Button, { small: true, onClick: onReview, children: 'Открыть' }),
          ]}, item.ref)
        }),
      }),
    ]}),
  ]})
}

export function WorkBar({ work, project = false, label = 'Распределение работ' }) {
  const backlog = Number(work?.backlog ?? 0)
  const active = Number(work?.active ?? 0)
  const done = Number(work?.done ?? 0)
  const total = Math.max(1, backlog + active + done)
  return jsxs('div', {
    className: `dockyard-work-visual${project ? ' compact' : ''}`,
    role: 'img',
    'aria-label': `${label}: ${backlog} backlog, ${active} active, ${done} done`,
    'data-work-visual': project ? true : undefined,
    children: [
      backlog > 0 ? jsx('span', { className: 'backlog', style: { width: `${(backlog / total) * 100}%` } }) : null,
      active > 0 ? jsx('span', { className: 'active', style: { width: `${(active / total) * 100}%` } }) : null,
      done > 0 ? jsx('span', { className: 'done', style: { width: `${(done / total) * 100}%` } }) : null,
    ],
  })
}

export function PortfolioVisual({ projects }) {
  const totals = projects.reduce((acc, project) => ({
    backlog: acc.backlog + Number(project.work?.backlog ?? 0),
    active: acc.active + Number(project.work?.active ?? 0),
    done: acc.done + Number(project.work?.done ?? 0),
  }), { backlog: 0, active: 0, done: 0 })
  return jsxs('section', { className: 'dockyard-portfolio-visual', 'data-portfolio-visual': true, children: [
    jsxs('div', { className: 'dockyard-portfolio-copy', children: [
      jsx('h2', { children: 'Состав поставки' }),
      jsx('p', { children: 'Распределение текущей работы по наблюдаемым проектам.' }),
    ]}),
    jsxs('div', { className: 'dockyard-portfolio-chart', children: [
      jsx(WorkBar, { work: totals, label: 'Распределение работ по портфелю' }),
      jsxs('div', { className: 'dockyard-work-legend', children: [
        jsxs('span', { className: 'backlog', children: [jsx('i', {}), `${number(totals.backlog)} backlog`] }),
        jsxs('span', { className: 'active', children: [jsx('i', {}), `${number(totals.active)} active`] }),
        jsxs('span', { className: 'done', children: [jsx('i', {}), `${number(totals.done)} done`] }),
      ]}),
    ]}),
  ]})
}

export function ProjectRow({ project, context, botNames, onOpen }) {
  const [tone, label] = healthDetails(project.health)
  const work = project.work ?? {}
  const alerts = Number(project.unacked_notifications ?? 0)
  const mission = context?.settings?.mission || (project.phase ? `Phase: ${project.phase}` : 'Миссия не задана')
  const activeAssignees = [...new Set((context?.workItems ?? [])
    .filter((item) => !['done', 'backlog', 'cancelled'].includes(item.status))
    .map((item) => item.assignee)
    .filter(Boolean))].slice(0, 3)
  return jsxs('div', { className: 'dockyard-project-row', role: 'row', 'data-project-row': project.id, children: [
    jsxs('div', { className: 'dockyard-project-cell project', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-project-name', children: [
        jsx('span', { className: 'dockyard-project-icon', children: jsx(Icon, { name: 'project' }) }),
        jsxs('span', { className: 'dockyard-project-copy', children: [
          jsx('strong', { children: project.id }),
          jsx('span', { className: 'dockyard-project-mission', children: mission }),
        ]}),
      ]}),
      activeAssignees.length > 0 ? jsx('div', { className: 'dockyard-avatar-stack', 'aria-label': 'Активные владельцы', children:
        activeAssignees.map((assignee) => {
          const label = botNames?.[assignee] || assignee
          return jsx('span', { className: 'dockyard-avatar', title: label, children: initials(label) }, assignee)
        }),
      }) : null,
    ]}),
    jsx('div', { className: 'dockyard-project-cell health', role: 'cell', children: jsx(StatusTag, { tone, label }) }),
    jsxs('div', { className: 'dockyard-project-cell work', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-work-stats', 'aria-label': `Work: ${work.active ?? 0} active, ${work.backlog ?? 0} backlog, ${work.done ?? 0} done`, children: [
        jsxs('span', { children: [jsx('strong', { children: number(work.active) }), ' active'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.backlog) }), ' backlog'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.done) }), ' done'] }),
      ]}),
      jsx(WorkBar, { work, project: true, label: `${project.id} work distribution` }),
    ]}),
    jsx('div', { className: 'dockyard-project-cell alerts', role: 'cell', children:
      jsxs('span', { className: `dockyard-alert-count${alerts > 0 ? ' has-alert' : ''}`, children: [
        alerts > 0 ? `${number(alerts)} unread` : 'Непрочитанных нет',
        typeof onOpen === 'function'
          ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(`s1:project/${project.id}`), children: 'Открыть' })
          : null,
      ]}),
    }),
  ]})
}

export function FleetActivity({ notifications, onOpen }) {
  const items = [...(notifications ?? [])].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || ''))).slice(0, 4)
  return jsxs('aside', { className: 'dockyard-activity-card', 'data-dashboard-card': 'activity', 'data-fleet-activity': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Активность флота' }),
        jsx('p', { children: 'Свежие атрибутированные сигналы проекта.' }),
      ]}),
      jsx('span', { className: 'dockyard-section-count', children: `${number(items.length)} recent` }),
    ]}),
    items.length > 0 ? jsx('div', { className: 'dockyard-activity-list', children:
      items.map((note) => {
        const tone = severityTone(note.severity)
        return jsxs('div', { className: 'dockyard-activity-item', children: [
          jsx('span', { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === 'warning' || tone === 'danger' ? 'alert' : 'bell' }) }),
          jsxs('span', { children: [
            jsx('p', { children: note.title || 'Событие флота' }),
            jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'}${note.body ? ` / ${note.body}` : ''}` }),
            jsx('time', { children: formatWhen(note.created_at) }),
            typeof onOpen === 'function' && note.deep_link
              ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(note.deep_link), children: 'Открыть' })
              : null,
          ]}),
        ]}, String(note.id))
      }),
    }) : jsx('div', { className: 'dockyard-activity-list', children: jsx('p', { className: 'dockyard-meta', children: 'Свежих сигналов флота нет.' }) }),
  ]})
}

export function FleetGroups({ groups, onOpen }) {
  const groupDefs = [
    { key: 'decisions', label: 'Решения, ждущие тебя', tone: 'warning' },
    { key: 'interventions', label: 'Вмешательства', tone: 'danger' },
    { key: 'informational', label: 'Информационное', tone: 'neutral' },
  ]
  const sections = []
  for (const def of groups) {
    const items = def.items ?? []
    if (items.length === 0) continue
    sections.push(jsxs('section', { className: 'dockyard-fleet-group', 'data-fleet-group': def.key, children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('h2', { children: def.label }),
          jsx('p', { children: def.description }),
        ]}),
        jsx('span', { className: 'dockyard-section-count', children: `${number(items.length)} ${items.length === 1 ? 'item' : 'items'}` }),
      ]}),
      jsx('div', { className: 'dockyard-fleet-list', children:
        items.map((item, index) => jsxs('div', { className: 'dockyard-fleet-row', 'data-fleet-row': `${def.key}:${item.ref || item.title}`, children: [
          jsxs('span', { children: [
            jsx('strong', { children: item.title }),
            jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Fleet'}${item.ref && item.ref !== 'evidence' ? ` / ${item.ref}` : ''}` }),
            def.key !== 'decisions' && item.detail ? jsx('span', { className: 'dockyard-meta', children: item.detail }) : null,
            def.key === 'informational' && item.severity ? jsx('span', { className: 'dockyard-meta', children: `sev: ${item.severity}` }) : null,
          ]}),
          jsx('span', { className: 'dockyard-meta', children: [
            item.cause ? `cause: ${item.cause}` : null,
            item.risk ? `risk: ${item.risk}` : null,
            item.owner ? `owner: ${item.owner}` : null,
            typeof item.age_days === 'number' ? `age: ${item.age_days}d` : null,
          ].filter(Boolean).join(' · ') }),
          typeof onOpen === 'function' && item.deep_link
            ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(item.deep_link, item), children: 'Открыть' })
            : null,
        ]}, `${def.key}-${item.ref || item.title || index}`)),
      }),
    ]}, def.key))
  }
  if (sections.length === 0) {
    return jsx('section', { className: 'dockyard-fleet-group', 'data-fleet-group': 'clear', children:
      jsx('p', { className: 'dockyard-meta', children: 'Группам флота внимание не требуется.' }) })
  }
  return jsxs(Fragment, { children: sections })
}

// What each Dashboard attention item is, in words. Until 10/10/2026 every item
// that was not an approval read "Blocked" / "Work blocked" with "Open work
// item", including a project Hermes has no project for. One table feeds the
// "Needs you now" list, All issues and its filters.
const ISSUE_CAUSES = Object.freeze({
  blocked_item: { tag: 'Заблокировано', tone: 'blocker', impact: 'Работа заблокирована' },
  overdue_item: { tag: 'Просрочено', tone: 'blocker', impact: 'Работа просрочена' },
  evidence_stale: { tag: 'Устаревшие доказательства', tone: 'notice', impact: 'Доказательства устарели' },
  unlinked_project: { tag: UNLINKED_LABEL, tone: 'notice', impact: 'Работа не может быть показана' },
  project_attention: { tag: 'Состояние проекта', tone: 'notice', impact: 'Нужно решение' },
})
const ISSUE_FILTERS = Object.freeze([['all', 'Все проблемы'], ['decision', 'Решения'],
  ...Object.entries(ISSUE_CAUSES).map(([cause, { tag }]) => [cause, tag])])
// Portfolio statuses with a segment of their own in the fleet health bar.
const HEALTH_STATES = Object.freeze(['on_track', 'at_risk', 'stalled', 'idle', 'unlinked'])

export function issueLabels(item) {
  if (item?.kind === 'initiative_approval') {
    return { tag: 'Одобрение', tone: 'approval', impact: `Risk: ${readableLabel(item.risk)}`, open: 'Одобрение ревью' }
  }
  const known = ISSUE_CAUSES[item?.cause] ?? { tag: readableLabel(item?.cause, 'Проблема'), tone: 'notice', impact: 'Требует внимания' }
  // Open goes where the item's deep link goes: one work item, or the project.
  return { ...known, open: String(item?.deep_link ?? '').startsWith('s2:work/') ? 'Открыть рабочий элемент' : 'Открыть проект' }
}

export function DashboardView({ view, onInbox, onRefresh, onOpen, resetView }) {
  // Attention-first ordering: at-risk, unlinked and stalled projects outrank healthy ones.
  const STATUS_PRIORITY = { at_risk: 0, unlinked: 1, stalled: 2, on_track: 3, idle: 4 }
  const projects = [...(view.portfolio?.projects ?? [])].sort((left, right) =>
    (STATUS_PRIORITY[left.status] ?? 3) - (STATUS_PRIORITY[right.status] ?? 3))
  const decisions = view.groups?.decisions ?? []
  const interventions = view.groups?.interventions ?? []
  const rows = [...decisions, ...interventions].sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0))
  const [selected, setSelected] = useState(null)
  const [subview, setSubview] = useState('overview')
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [issueFilter, setIssueFilter] = useState('all')
  useEffect(() => { setSubview('overview') }, [resetView])
  const [decision, setDecision] = useState(null)
  const [detailError, setDetailError] = useState('')
  // Sahil 04/10: "Needs you now" folds open and closed, and stays the way he
  // left it. The choice is saved in the backend (/settings/ui), never in the browser.
  const [collapsed, setCollapsed] = useState(() => view.ui?.collapsed ?? [])
  useEffect(() => { setCollapsed(view.ui?.collapsed ?? []) }, [view.ui])
  const isFolded = (section) => collapsed.includes(section)
  const toggleFold = (section) => {
    const before = collapsed
    const next = before.includes(section) ? before.filter((name) => name !== section) : [...before, section]
    setCollapsed(next)
    api('/settings/ui', { method: 'PUT', body: { collapsed: next }, quiet: true }).catch(() => {
      setCollapsed(before)
      emitToast('danger', 'Изменение не сохранено. Попробуйте ещё раз.')
    })
  }
  const needsFolded = isFolded('needs-you-now')
  // Sahil 04/10 (demo feedback b): open unassigned work, per project. No bot picks it up.
  const unassigned = Object.entries(view.projectContext ?? {})
    .map(([projectId, context]) => [projectId, unassignedWork(context.workItems).length])
    .filter(([, count]) => count > 0)
  const unassignedTotal = unassigned.reduce((sum, [, count]) => sum + count, 0)
  const focusItem = selected === false ? null : selected ?? decisions[0] ?? null
  useEffect(() => {
    if (!focusItem?.ref || focusItem.kind !== 'initiative_approval') { setDecision(null); setDetailError(''); return undefined }
    let cancelled = false
    setDecision(null)
    api(`/initiatives/${encodeURIComponent(focusItem.ref)}/decision`)
      .then((result) => { if (!cancelled) { setDecision(result); setDetailError('') } })
      .catch((error) => { if (!cancelled) setDetailError(String(error?.message ?? error)) })
    return () => { cancelled = true }
  }, [focusItem?.ref, focusItem?.kind])
  const onTrack = projects.filter((project) => project.status === 'on_track').length
  const evidenceFiles = view.portfolio?.evidence_files
  const workActive = Number(view.totals?.active_work ?? 0)
  const waiting = Number(view.inbox?.count ?? 0)
  const statusName = { on_track: 'В графике', at_risk: 'Под угрозой', stalled: 'Застряло', idle: 'Простой', unlinked: UNLINKED_LABEL }
  const metric = (label, value, detail, icon, tone, onClick) => jsxs(onClick ? 'button' : 'div', {
    type: onClick ? 'button' : undefined, onClick,
    'data-metric': label.toLowerCase().replace(/[^a-z]+/g, '-'),
    className: `dockyard-command-metric dockyard-command-metric-${tone}${onClick ? ' is-actionable' : ''}`, children: [
      jsxs('span', { className: 'dockyard-command-metric-label', children: [jsx(Icon, { name: icon }), label] }),
      jsx('strong', { children: value }), jsx('small', { children: detail }),
  ]}, label)
  const renderProjectRow = (project) => {
    const total = Number(project.items?.total ?? 0)
    const done = Number(project.items?.done ?? 0)
    const status = statusName[project.status] ?? readableLabel(project.status, 'Неизвестно')
    // Hermes never reported this project's work: no "No work items" claim.
    const unreadable = project.status === 'unlinked'
    return jsxs('div', { role: 'row', className: 'dockyard-command-row dockyard-command-project-row',
      'data-project-row': project.project_id, children: [
        jsx('span', { role: 'cell', children: jsx('button', { type: 'button', className: 'dockyard-button small', onClick: () => onOpen?.(`s1:project/${project.project_id}`), children: project.project_id }) }),
        jsx('span', { role: 'cell', children: project.owner || 'Не назначен' }),
        jsx('span', { role: 'cell', className: `dockyard-command-health ${project.status}`, children: status }),
        jsxs('span', { role: 'cell', className: 'dockyard-command-progress', children: [
          jsx('span', { children: unreadable ? 'Неизвестно (не связан)' : total ? `${number(done)} / ${number(total)} work items` : 'Рабочих элементов нет' }),
          jsx('span', { className: 'dockyard-command-progress-track', children: jsx('span', { style: { width: `${total ? Math.round((done / total) * 100) : 0}%` } }) }),
        ] }),
        jsx('span', { role: 'cell', children: project.next_milestone ? `${project.next_milestone.name} · ${project.next_milestone.due || 'No due date'}` : 'Не запланировано' }),
        jsx('span', { role: 'cell', children: unreadable ? 'Неизвестно (не связан)' : (project.items?.blocked || project.items?.overdue) ? `${number(project.items.blocked || 0)} blocked · ${number(project.items.overdue || 0)} overdue` : 'Открытых блокеров нет' }),
      ]}, project.project_id)
  }
  const empty = projects.length === 0
  if (subview === 'projects') {
    const match = directoryQuery.trim().toLowerCase()
    const filtered = projects.filter((project) => !match ||
      [project.project_id, project.owner, project.status].some((field) => String(field || '').toLowerCase().includes(match)))
    return jsxs('div', { className: 'dockyard-command dockyard-command-directory', 'data-dashboard-subview': 'projects', children: [
      jsx(Button, { small: true, onClick: () => setSubview('overview'), children: '← Back to Dashboard' }),
      jsxs('div', { className: 'dockyard-command-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET DIRECTORY' }),
          jsx('h1', { children: 'Все проекты' }),
          jsx('p', { children: `${number(projects.length)} ${plural(projects.length, 'project')} under watch. Select one for its Overview.` })] }),
        jsx('input', { type: 'search', className: 'dockyard-command-directory-search',
          value: directoryQuery, onChange: (event) => setDirectoryQuery(event.target.value),
          placeholder: 'Фильтр по проекту, владельцу или статусу', 'aria-label': 'Фильтровать проекты' }),
      ] }),
      jsxs('section', { className: 'dockyard-command-section dockyard-command-directory-list', role: 'table', 'aria-label': 'Флот проекта', children: [
        jsx('div', { className: 'dockyard-command-row dockyard-command-project-head', role: 'row', children:
          ['Проект', 'Владелец', 'Здоровье', 'Прогресс', 'Следующая веха', 'Риск поставки'].map((label) => jsx('span', { role: 'columnheader', children: label }, label)) }),
        filtered.length ? filtered.map(renderProjectRow) : jsx('p', { className: 'dockyard-command-empty', children: 'Нет проектов по этому фильтру.' }),
      ] }),
    ] })
  }
  if (subview === 'issues') {
    const options = ISSUE_FILTERS
    const filtered = rows.filter((item) => issueFilter === 'all' ||
      (issueFilter === 'decision' ? item.kind === 'initiative_approval' : item.cause === issueFilter))
    return jsxs('div', { className: 'dockyard-command dockyard-command-directory', 'data-dashboard-subview': 'issues', children: [
      jsx(Button, { small: true, onClick: () => setSubview('overview'), children: '← Back to Dashboard' }),
      jsxs('div', { className: 'dockyard-command-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET ATTENTION' }),
          jsx('h1', { children: 'Все проблемы' }),
          jsx('p', { children: `${number(rows.length)} ${plural(rows.length, 'item')} need a decision or intervention across the fleet.` })] }),
        jsx(Button, { onClick: onInbox, children: 'Открыть «Входящие одобрения»' }),
      ] }),
      jsx('div', { className: 'dockyard-command-issue-filters', role: 'group', 'aria-label': 'Фильтр проблем', children:
        options.map(([key, label]) => jsx('button', { type: 'button', className: issueFilter === key ? 'is-active' : '',
          'aria-pressed': issueFilter === key, onClick: () => setIssueFilter(key),
          children: `${label} (${number(key === 'all' ? rows.length : rows.filter((item) => key === 'decision' ? item.kind === 'initiative_approval' : item.cause === key).length)})`,
        }, key)),
      }),
      jsxs('section', { className: 'dockyard-command-section dockyard-command-directory-list', children: [
        jsx('div', { className: 'dockyard-command-row dockyard-command-attention-head', children:
          ['Тип', 'Элемент', 'Проект', 'Владелец / риск', 'Ожидание'].map((label) => jsx('span', { children: label }, label)) }),
        filtered.length ? filtered.map((item, index) => jsxs('button', { type: 'button',
          className: 'dockyard-command-row dockyard-command-attention-row',
          onClick: () => item.deep_link ? onOpen?.(item.deep_link) : onInbox?.(),
          children: [
            jsx('span', { className: `dockyard-command-type ${issueLabels(item).tone}`,
              children: issueLabels(item).tag }),
            jsxs('span', { className: 'dockyard-command-title', children: [jsx('strong', { children: item.title }),
              jsx('small', { children: item.ref || item.detail || '' })] }),
            jsx('span', { children: item.project }), jsx('span', { children: item.owner || readableLabel(item.risk, 'Не назначен') }),
            jsx('span', { children: typeof item.age_days === 'number' ? `${number(item.age_days)}d` : 'Не записано' }),
          ], }, `${item.kind}:${item.ref || index}`)) : jsx('p', { className: 'dockyard-command-empty', children: 'Нет проблем по этому фильтру.' }),
      ] }),
    ] })
  }
  return jsxs('div', { className: 'dockyard-command', children: [
    jsxs('div', { className: 'dockyard-command-head', children: [
      jsxs('div', { children: [jsx('span', { className: 'dockyard-command-eyebrow', children: 'FLEET OVERVIEW' }),
        jsx('h1', { children: 'Командный центр' }),
        jsx('p', { children: 'Управление проектом с одного взгляда. Доказательства важнее предположений.' })] }),
      jsxs('div', { className: 'dockyard-command-head-actions', children: [
        jsx(Button, { action: 'refresh', onClick: onRefresh, children: 'Обновить' }),
        jsx(Button, { action: 'open-bot-teams', onClick: () => onOpen?.('s5:teams'), children: 'Команды ботов' }),
        waiting > 0 ? jsx(Button, { variant: 'primary', onClick: onInbox, children: `Review ${number(waiting)} ${plural(waiting, 'decision')}` }) : null,
      ]}),
    ]}),
    empty ? jsx(EmptyState, { title: 'Нет проектов под наблюдением', description: 'Используйте «Новый проект» или «Подключить существующий проект» выше, чтобы добавить первый проект.', icon: 'project' }) :
    jsxs(Fragment, { children: [
      jsxs('section', { className: 'dockyard-command-metrics', 'aria-label': 'Сводка флота', children: [
        metric('PROJECTS', number(projects.length), `${number(projects.filter((p) => p.status === 'at_risk').length)} at risk`, 'folders', 'info', () => setSubview('projects')),
        metric('NEEDS YOUR REVIEW', number(waiting), `${number(interventions.length)} other ${plural(interventions.length, 'intervention')}`, 'triangle-alert', 'warning', () => setSubview('issues')),
        metric('ON TRACK', `${number(onTrack)} / ${number(projects.length)}`, 'Статус поставки проекта', 'activity', onTrack ? 'success' : 'neutral', () => setSubview('projects')),
        metric('EVIDENCE FILES', evidenceFiles == null ? 'Недоступно' : number(evidenceFiles), 'Файлы, прикреплённые к отслеживаемым проектам', 'file-text', 'accent'),
      ]}),
      jsxs('div', { className: 'dockyard-command-health-summary', children: [
        jsx('span', { children: 'FLEET HEALTH' }),
        jsx('div', { className: 'dockyard-command-health-track', role: 'img',
          'aria-label': `${number(onTrack)} on track, ${number(projects.filter((p) => p.status === 'at_risk').length)} at risk, ${number(projects.filter((p) => p.status === 'stalled').length)} stalled, ${number(projects.filter((p) => p.status === 'idle').length)} idle, ${number(projects.filter((p) => p.status === 'unlinked').length)} not linked, ${number(projects.filter((p) => !HEALTH_STATES.includes(p.status)).length)} unverified`,
          children: [...HEALTH_STATES, 'unknown'].map((state) => {
            const count = projects.filter((p) => (HEALTH_STATES.includes(p.status) ? p.status : 'unknown') === state).length
            return count ? jsx('span', { className: `dockyard-health-segment ${state}`, style: { width: `${count / projects.length * 100}%` } }, state) : null
          }),
        }),
        jsx('div', { className: 'dockyard-command-health-legend', children: [
          ['on_track', 'В графике'], ['at_risk', 'Под угрозой'], ['stalled', 'Застряло'], ['idle', 'Простой'], ['unlinked', UNLINKED_LABEL], ['unknown', 'Не верифицировано'],
        ].map(([state, label]) => jsxs('span', { children: [jsx('i', { className: `dockyard-health-dot ${state}`, 'aria-hidden': true }), label] }, state)) }),
      ]}),
      unassignedTotal ? jsxs('div', { className: 'dockyard-soft-alert', 'data-unassigned-alert': 'fleet', role: 'status', children: [
        jsx(Icon, { name: 'user' }),
        jsxs('div', { className: 'dockyard-soft-alert-body', children: [
          jsx('strong', { children: `${number(unassignedTotal)} ${plural(unassignedTotal, 'work item')} ${unassignedTotal === 1 ? 'is' : 'are'} unassigned, so no bot will pick ${unassignedTotal === 1 ? 'it' : 'them'} up.` }),
          jsx('span', { className: 'dockyard-soft-alert-items', children: unassigned.map(([projectId, count]) => jsx('button', { type: 'button', className: 'dockyard-soft-alert-item', 'data-unassigned-project': projectId,
            onClick: () => onOpen?.(`s3:unassigned/${projectId}`), children: `${projectId} (${number(count)})` }, projectId)) }),
        ] }),
      ] }) : null,
      jsxs('div', { className: 'dockyard-command-layout', children: [
        jsxs('div', { className: 'dockyard-command-main', children: [
          jsxs('section', { className: 'dockyard-command-section', 'data-dashboard-section': 'needs-you-now', 'data-folded': needsFolded ? 'true' : 'false', children: [
            jsxs('div', { className: 'dockyard-section-head', children: [
              jsxs('div', { children: [
                jsx('h2', { children: jsxs('button', { type: 'button', className: 'dockyard-section-fold', 'data-section-fold': 'needs-you-now',
                  'aria-expanded': !needsFolded, 'aria-controls': 'dy-needs-you-now', onClick: () => toggleFold('needs-you-now'), children: [
                    jsx(Icon, { name: needsFolded ? 'chevron-right' : 'chevron-down' }),
                    jsx(Icon, { name: 'triangle-alert' }),
                    jsx('span', { children: 'Нужно твоё решение' }),
                    jsx('span', { className: 'dockyard-section-count', 'data-section-count': 'needs-you-now', 'aria-hidden': true, children: number(rows.length) }),
                    jsx('span', { className: 'dockyard-sr-only', children: `, ${number(rows.length)} ${plural(rows.length, 'item')}` }),
                  ] }) }),
                needsFolded ? null : jsx('p', { children: 'Решения и заблокированная работа, отсортированные по времени ожидания.' })] }),
              jsxs('div', { className: 'dockyard-command-section-actions', children: [
                jsx(Button, { small: true, onClick: () => setSubview('issues'), children: 'Все проблемы' }),
                jsx(Button, { small: true, onClick: onInbox, children: `View approvals (${number(waiting)})` }),
              ] }),
            ]}),
            jsxs('div', { className: 'dockyard-command-table-wrap', id: 'dy-needs-you-now', hidden: needsFolded, children: [
              jsxs('div', { className: 'dockyard-command-row dockyard-command-attention-head', role: 'row', children: [
                jsx('span', { children: 'Тип' }), jsx('span', { children: 'Элемент' }), jsx('span', { children: 'Проект' }), jsx('span', { children: 'Влияние' }), jsx('span', { children: 'Ожидание' }),
              ]}),
              rows.length ? rows.map((item, index) => jsxs('button', { type: 'button', className: `dockyard-command-row dockyard-command-attention-row${focusItem === item ? ' is-selected' : ''}`,
                onClick: () => setSelected(item), 'aria-label': `Inspect ${item.title}`, children: [
                  jsx('span', { className: `dockyard-command-type ${issueLabels(item).tone}`, children: issueLabels(item).tag }),
                  jsxs('span', { className: 'dockyard-command-title', children: [jsx('strong', { children: item.title }), jsx('small', { children: item.ref || item.detail || '' })] }),
                  jsx('span', { children: item.project }), jsx('span', { children: issueLabels(item).impact }),
                  jsx('span', { children: typeof item.age_days === 'number' ? `${number(item.age_days)}d` : 'Не записано' }),
                ]}, `${item.kind}:${item.ref || index}`)) : jsx('p', { className: 'dockyard-command-empty', children: 'Решения или заблокированные работы не требуют внимания.' }),
            ]}),
          ]}),
          jsxs('section', { className: 'dockyard-command-section', children: [
            jsxs('div', { className: 'dockyard-section-head', children: [
              jsxs('div', { children: [jsxs('h2', { children: [jsx(Icon, { name: 'folder-kanban' }), 'Здоровье проекта'] }), jsx('p', { children: `Portfolio status across ${number(projects.length)} ${plural(projects.length, 'project')}.` })] }),
              jsx(Button, { small: true, onClick: () => setSubview('projects'), children: 'Все проекты' }),
            ]}),
            jsxs('div', { className: 'dockyard-command-table-wrap', role: 'table', 'aria-label': 'Флот проекта', children: [
              jsxs('div', { className: 'dockyard-command-row dockyard-command-project-head', role: 'row', children: [
                ...['Проект', 'Владелец', 'Здоровье', 'Прогресс', 'Следующая веха', 'Риск поставки'].map(label => jsx('span', { role: 'columnheader', children: label }, label)),
              ]}),
              projects.map(renderProjectRow),
            ]}),
          ]}),
        ]}),
        jsxs('aside', { className: 'dockyard-command-detail', 'aria-label': 'Детали выбранного элемента', children: [
          jsxs('div', { className: 'dockyard-command-detail-head', children: [jsx('h2', { children: focusItem?.kind === 'initiative_approval' ? 'Одобрение' : 'Детали элемента' }), focusItem ? jsx(Button, { small: true, onClick: () => setSelected(false), children: 'Закрыть' }) : null] }),
          focusItem ? jsxs(Fragment, { children: [
            jsx('h3', { children: focusItem.title }),
            jsx('p', { className: 'dockyard-meta', children: `${focusItem.project} · ${focusItem.ref || ''} · ${number(focusItem.age_days ?? 0)} ${plural(focusItem.age_days ?? 0, 'day')} waiting` }),
            detailError ? jsx('p', { role: 'alert', children: detailError }) : null,
            focusItem.kind === 'initiative_approval' && decision ? jsxs(Fragment, { children: [
              jsx('h4', { children: 'Сводка' }), jsx('p', { children: decision.reason || 'Обоснование не предоставлено.' }),
              jsx('h4', { children: 'Ожидаемый результат' }), jsx('p', { children: decision.expected_outcome || 'Не задано.' }),
              jsx('h4', { children: 'Контекст решения' }),
              jsxs('dl', { children: [jsx('dt', { children: 'Риск' }), jsx('dd', { children: readableLabel(decision.risk) }),
                jsx('dt', { children: 'Автор предложения' }), jsx('dd', { children: String(decision.proposer || 'Stewardship') }),
                jsx('dt', { children: 'Контракт доказательств' }), jsx('dd', { children: validationSummary(decision.validation?.contract) })] }),
            ]}) : null,
            jsx('h4', { children: 'Недавняя активность' }),
            jsx('div', { className: 'dockyard-command-detail-activity', children: (view.notifications?.notifications ?? []).filter((note) => note.project === focusItem.project).slice(0, 3).map((note) => jsx('p', { children: `${note.title} · ${formatWhen(note.created_at)}` }, note.id)) }),
            jsx(Button, { variant: 'primary', onClick: () => focusItem.kind === 'initiative_approval' ? onInbox?.() : onOpen?.(focusItem.deep_link), children: issueLabels(focusItem).open }),
          ]}) : jsx('p', { children: 'Выберите элемент, чтобы увидеть подробности.' }),
        ]}),
      ]}),
    ]}),
  ]})
}

export function InitiativeRevisionRow({ initiative, onResubmitted }) {
  const returned = initiative.status === 'changes_requested'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [rationale, setRationale] = useState(initiative.rationale || '')
  useEffect(() => {
    if (!returned || !open) return undefined
    let disposed = false
    api(`/initiatives/${encodeURIComponent(initiative.ref)}/decision/receipts`)
      .then((receipts) => {
        if (disposed) return
        const rows = (receipts.receipts ?? []).filter((r) => r.decision === 'changes_requested')
        setFeedback(rows)
      })
      .catch(() => {})
    return () => { disposed = true }
  }, [returned, open, initiative.ref])
  const resubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api(`/initiatives/${encodeURIComponent(initiative.ref)}/resubmit`, {
        method: 'POST', body: { rationale: rationale.trim() }, suppressErrorToast: true,
      })
      emitToast('success', 'Отправлено на одобрение заново')
      // The row must reflect the new state immediately; the payload refresh is
      // the authoritative source (never a client-side status rewrite).
      onResubmitted?.(initiative.ref)
    } catch (failure) {
      setError(`Resubmission was not recorded. ${String(failure?.message ?? failure)}`)
    } finally { setBusy(false) }
  }
  return jsxs('article', { 'data-initiative-row': initiative.ref, 'data-initiative-status': initiative.status, children: [
    jsxs('span', { children: [jsx('strong', { children: initiative.title }), jsx('small', { children: initiative.expected_outcome || initiative.rationale || initiative.ref })] }),
    returned ? jsx(Button, { small: true, onClick: () => setOpen((v) => !v), children: open ? 'Скрыть ревизию' : 'Доработать и отправить' })
      : jsx(StatusTag, { tone: initiative.status === 'pending_approval' ? 'warning' : 'info', label: String(initiative.status || 'unknown').replaceAll('_', ' ') }),
    returned && open ? jsxs('div', { className: 'dockyard-initiative-revision', 'data-resubmit-form': true, children: [
      feedback.length ? jsxs('div', { className: 'dockyard-comment-thread', children:
        feedback.map((row) => jsxs('p', { children: [
          jsx('strong', { children: row.actor }), jsx('span', { children: ` · ${row.reason}` }),
        ]}, row.id)),
      }) : jsx('p', { className: 'dockyard-meta', children: 'Loading reviewer feedback…' }),
      jsx('input', {
        value: rationale, onChange: (event) => setRationale(event.target.value),
        placeholder: 'Обновлённое обоснование (учтите отзыв)', 'aria-label': 'Обновлённое обоснование',
      }),
      jsx(Button, { small: true, variant: 'primary', onClick: resubmit, disabled: busy || !rationale.trim(), children: busy ? 'Повторная отправка…' : 'Отправить заново' }),
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    ]}) : null,
  ]})
}

export function FirstAssessmentCard({ projectId }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const out = await api(`/projects/${encodeURIComponent(projectId)}/first-assessment`, {
        method: 'POST', body: {},
      })
      setResult(out)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  return jsxs('section', { className: 'dockyard-feature-card dockyard-first-assessment', 'data-first-assessment': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Первая оценка (только чтение)' }),
        jsx('p', { children: 'One manual cycle: verifies the repo, records health and objective evidence. Enables no schedules.' }),
      ]}),
      jsx(Button, {
        action: 'run-first-assessment',
        variant: 'primary',
        small: true,
        disabled: busy,
        onClick: run,
        children: busy ? 'Оценка…' : 'Запустить первую оценку',
      }),
    ]}),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    result ? jsxs('dl', { className: 'dockyard-onboarding-review', 'data-assessment-result': true, children: [
      jsx('dt', { children: 'Верификация' }), jsx('dd', { children: result.assessment?.verification_ok ? 'Пройдено' : 'Не пройдено' }),
      jsx('dt', { children: 'Здоровье' }), jsx('dd', { children: result.assessment?.health_state ?? 'unknown' }),
      jsx('dt', { children: 'Задачи-цели оценены' }), jsx('dd', { children: number((result.assessment?.objective_results ?? []).length) }),
      jsx('dt', { children: 'Инициативы созданы' }), jsx('dd', { children: number(result.assessment?.initiatives_created ?? 0) }),
      jsx('dt', { children: 'Расписания' }), jsx('dd', { children: result.schedules_enabled ? 'enabled' : 'отключено (онбординг никогда не включает автоматизацию)' }),
    ]}) : null,
  ]})
}
