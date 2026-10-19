// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C5 Activity (06/10): a project's recorded events as a dated timeline
// instead of raw JSON (HANDOFF-BATCH-C: the "Recent outcomes" reference, with
// time, event, details and impact). Sahil picked the timeline over a table on
// 06/10. The words, colours and links come from lib/event-vocab.js, so this
// tab and the Overview card never disagree.
// "Impact" is what the event means for the project, from a fixed list per
// event type (an approval means work can start). The backend records no
// measured impact, so the screen never guesses one.
//
// The project load reads the latest 50 events. "Show older" reads up to 200,
// then 500: the events route serves no more than that and has no paging.
import { useEffect } from '../runtime/react.js'
import { useMemo } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { Icon } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { EVENT_FILTERS } from '../lib/event-vocab.js'
import { activityRows } from '../lib/event-vocab.js'
import { groupByDay } from '../lib/event-vocab.js'
import { matchesFilter } from '../lib/event-vocab.js'
import { timeAgo } from './attention.js'

const STEPS = [50, 200, 500]

const fullTime = (ts) => {
  const at = Date.parse(ts ?? '')
  return Number.isNaN(at) ? 'Время не записано' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(at)
}
const plural = (count, one, many) => `${number(count)} ${Number(count) === 1 ? one : many}`

function Impact({ row }) {
  return row.effect ? jsx(StatusTag, { tone: row.tone, label: row.effect.label }) : jsx('span', { className: 'dy-act-none', children: '—' })
}

function OpenButton({ row, onOpenItem }) {
  if (!row.target) return null
  return jsx('button', {
    type: 'button', className: 'dy-act-open', 'data-activity-open': row.key,
    onClick: () => onOpenItem?.(row),
    children: row.openLabel,
  })
}

function When({ row }) {
  return jsx('time', { dateTime: row.ts ?? undefined, title: fullTime(row.ts), children: row.time })
}

// A dated feed with an icon rail: one heading per day, newest first.
function Timeline({ groups, onOpenItem }) {
  return jsx('ol', { className: 'dy-act-timeline', 'data-activity-timeline': true, children: groups.map((group) =>
    jsxs('li', { className: 'dy-act-tday', 'data-activity-day': group.label, children: [
      jsx('h3', { children: group.label }),
      jsx('ol', { children: group.rows.map((row) => jsxs('li', { className: 'dy-act-entry', 'data-activity-row': row.key, 'data-event-type': row.type, 'data-tone': row.tone, children: [
        jsx('span', { className: 'dy-act-dot', 'data-tone': row.tone, children: jsx(Icon, { name: row.icon }) }),
        jsxs('div', { className: 'dy-act-body', children: [
          jsxs('p', { className: 'dy-act-line1', children: [jsx('strong', { children: row.label }), row.title ? jsx('span', { children: row.title }) : null] }),
          row.note ? jsx('p', { className: 'dy-act-note', children: row.note }) : null,
          jsxs('p', { className: 'dy-act-line2', children: [row.by, ' · ', jsx(When, { row })] }),
        ]}),
        jsxs('div', { className: 'dy-act-side', children: [jsx(Impact, { row }), jsx(OpenButton, { row, onOpenItem })] }),
      ]}, row.key)) }),
    ]}, group.key)) })
}

export function ProjectActivityPanel({ project, view, onOpenItem }) {
  // `older` holds a longer read the person asked for; a project reload
  // (after any action) brings fresh latest events and drops it.
  const [older, setOlder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  useEffect(() => { setOlder(null); setError('') }, [view.events, project.id])
  const events = older?.events ?? view.events ?? []
  const limit = older?.limit ?? STEPS[0]
  const rows = useMemo(() => activityRows(events, { initiatives: view.initiatives, workItems: view.workItems }),
    [events, view.initiatives, view.workItems])
  const shown = rows.filter((row) => matchesFilter(row, { kind, query }))
  const groups = groupByDay(shown)
  const eventCount = (list) => list.reduce((sum, row) => sum + row.count, 0)
  const next = STEPS.find((step) => step > limit)
  const full = events.length >= limit
  const filtered = kind !== 'all' || query.trim() !== ''
  const showOlder = async () => {
    setLoading(true)
    setError('')
    try {
      const encoded = encodeURIComponent(project.id)
      const data = await api(`/projects/${encoded}/events?limit=${next}`, { quiet: true })
      setOlder({ limit: next, events: data?.events ?? [] })
    } catch {
      setError('Не удалось загрузить более старые события. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }
  const total = eventCount(rows)
  let footnote = `Все ${plural(total, 'событие', 'событий')}, записанные для этого проекта.`
  if (full && next) footnote = `Последние ${plural(total, 'событие', 'событий')}.`
  else if (full) footnote = `Последние ${plural(total, 'событие', 'событий')} — больше приложение прочитать не может.`

  return jsxs('section', { className: 'dockyard-feature-card dy-act', 'data-activity': project.id, children: [
    jsxs('header', { className: 'dy-act-head', children: [
      jsx('h2', { children: 'Активность проекта' }),
      jsx('span', { className: 'dy-act-count', 'data-activity-count': true, children: filtered ? `${number(eventCount(shown))} из ${plural(total, 'событие', 'событий')}` : plural(total, 'событие', 'событий') }),
    ]}),
    rows.length === 0 ? jsxs('div', { className: 'dy-act-empty', 'data-activity-empty': 'none', children: [
      jsx('p', { children: jsx('strong', { children: 'События пока не записаны.' }) }),
      jsx('p', { children: 'События появляются здесь, когда кто-то предлагает, одобряет или отклоняет инициативу, назначает работу, либо когда проходит проверка сопровождения.' }),
    ]}) : jsxs('div', { className: 'dy-act-tools', children: [
      jsx('div', { className: 'dy-act-chips', role: 'group', 'aria-label': 'Показать', children: EVENT_FILTERS.map(([key, label]) => {
        const count = key === 'all' ? total : eventCount(rows.filter((row) => row.kind === key))
        return jsxs('button', {
          type: 'button', className: 'dy-act-chip', 'aria-pressed': kind === key, 'data-activity-filter': key,
          onClick: () => setKind(key),
          children: [label, jsx('span', { children: number(count) })],
        }, key)
      }) }),
      jsx('input', {
        type: 'search', className: 'dy-act-search', 'data-activity-search': true,
        'aria-label': 'Поиск по активности', placeholder: 'Поиск событий, людей или ссылок',
        value: query, onChange: (event) => setQuery(event.target.value),
      }),
    ]}),
    rows.length > 0 && shown.length === 0 ? jsxs('div', { className: 'dy-act-empty', 'data-activity-empty': 'filtered', children: [
      jsx('p', { children: 'Нет событий по этим фильтрам.' }),
      jsx('button', { type: 'button', className: 'dy-act-open', 'data-activity-clear': true, onClick: () => { setKind('all'); setQuery('') }, children: 'Сбросить фильтры' }),
    ]}) : null,
    shown.length > 0 ? jsx(Timeline, { groups, onOpenItem }) : null,
    rows.length > 0 ? jsxs('footer', { className: 'dy-act-foot', children: [
      jsx('span', { children: footnote }),
      full && next ? jsx('button', {
        type: 'button', className: 'dy-act-open', 'data-activity-older': next, disabled: loading,
        onClick: showOlder, children: loading ? 'Загрузка…' : 'Показать более старые события',
      }) : null,
      error ? jsx('span', { className: 'dy-act-error', role: 'alert', children: error }) : null,
    ]}) : null,
  ]})
}

// The Overview's "Recent activity" card with the same words as the tab, the
// latest four rows, and "View all" (the reference panel has it).
export function RecentActivityCard({ view, onViewAll }) {
  const rows = activityRows(view.events ?? [], { initiatives: view.initiatives, workItems: view.workItems }).slice(0, 4)
  return jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-activity': 'words', children: [
    jsxs('header', { children: [
      jsx('h2', { children: 'Недавняя активность' }),
      jsx('button', { type: 'button', className: 'dy-act-viewall', 'data-activity-view-all': true, onClick: onViewAll, children: 'Показать все' }),
    ]}),
    jsx('p', { children: 'Что происходило в проекте в последнее время.' }),
    rows.length > 0 ? jsx('div', { className: 'dockyard-overview-list activity', children: rows.map((row) => {
      const words = row.title ? `${row.label} · ${row.title}` : row.label
      return jsxs('article', { 'data-activity-row': row.key, children: [
        jsxs('span', { children: [
          jsx('strong', { title: words, children: words }),
          jsx('small', { title: fullTime(row.ts), children: [row.by, timeAgo(row.ts) ?? 'время не записано'].join(' · ') }),
        ]}),
        // A small card: no placeholder dash when the event has no impact.
        row.effect ? jsx(Impact, { row }) : null,
      ]}, row.key)
    }) })
      : jsx('p', { className: 'dockyard-meta', children: 'События пока не записаны.' }),
  ]})
}
