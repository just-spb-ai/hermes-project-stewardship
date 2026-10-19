// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Batch E5: notifications screen — filters, day groups, detail panel. Data
// comes from the real /notifications endpoints (E4); every action goes through
// the api() helper so busy states and toasts stay consistent. Sahil 05/10: the
// settings live only in App settings (NotificationSettings is shared from here).
import { useState } from '../runtime/react.js'
import { severityTone } from '../lib/ui.js'
import { api } from '../runtime/context.js'
import { formatWhen } from '../lib/ui.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { EmptyState } from '../lib/ui.js'
import { NOTIFICATIONS_CSS } from '../styles/notifications-css.js'

const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical']
const KIND_LABELS = {
  approval_required: 'Одобрения',
  health_change: 'Здоровье',
  alert: 'Оповещения',
  unassigned_work: 'Не назначен',
}
const STATE_LABELS = { new: 'Новое', seen: 'Просмотрено', resolved: 'Решено' }
const PAGE_SIZE = 50

const SEVERITY_LABELS = { info: 'Информация', low: 'Низкая', medium: 'Средняя', high: 'Высокая', critical: 'Критично' }

const severityLabel = (severity) => SEVERITY_LABELS[severity] ?? String(severity ?? '')

const kindLabel = (kind) => KIND_LABELS[kind] ?? 'Другое'

function dayBucket(createdAt) {
  const value = String(createdAt || '')
  const stamp = Date.parse(value)
  if (!Number.isFinite(stamp)) return 'Ранее'
  const day = new Date(stamp)
  day.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diff <= 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  return 'Ранее'
}

export function NotificationsView({ view, scopeProjectId = null, onRefresh, onAcknowledged: onChanged, onOpen, onOpenSettings }) {
  const [stateFilter, setStateFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  // Sahil 04/10 (demo feedback d): the global switcher picks the project;
  // this screen's own project picker is gone. Fleet-wide notes show under All.
  const projectFilter = scopeProjectId ?? 'all'
  const [selectedId, setSelectedId] = useState(null)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Rows the user marked seen / resolved this session: applied over the view
  // data so the list stays honest even when the parent's refresh path is slow
  // or (in embedded runtimes) static.
  const [localStates, setLocalStates] = useState({})

  const all = (view.notifications ?? []).slice().map((note) => {
    const override = localStates[note.id]
    if (!override) return note
    if (override === 'seen') return { ...note, state: 'seen', acked: true }
    return { ...note, state: 'resolved', resolved_at: note.resolved_at ?? new Date().toISOString(), resolved_by: note.resolved_by ?? 'desktop', resolution: 'manual' }
  })
  const filtered = all.filter((note) => {
    if (stateFilter !== 'all' && (note.state ?? (note.acked ? 'seen' : 'new')) !== stateFilter) return false
    if (typeFilter !== 'all') {
      if (typeFilter === 'other' && KIND_LABELS[note.kind]) return false
      if (typeFilter !== 'other' && note.kind !== typeFilter) return false
    }
    if (severityFilter !== 'all' && String(note.severity || 'info').toLowerCase() !== severityFilter) return false
    if (projectFilter !== 'all' && (note.project || 'Флот') !== projectFilter) return false
    return true
  })
  filtered.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
  const shown = filtered.slice(0, visible)
  const selected = filtered.find((note) => note.id === selectedId) ?? null
  const newCount = all.filter((note) => (note.state ?? (note.acked ? 'seen' : 'new')) === 'new').length

  const markSeen = async (note) => {
    setBusyId(note.id)
    setActionError(null)
    try {
      await api(`/notifications/${note.id}/ack`, { method: 'POST', body: { actor_id: 'desktop' } })
      setLocalStates((current) => ({ ...current, [note.id]: 'seen' }))
      onChanged?.(note.id)
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }
  const resolve = async (note) => {
    setBusyId(note.id)
    setActionError(null)
    try {
      await api(`/notifications/${note.id}/resolve`, {
        method: 'POST',
        body: { actor_id: 'desktop', note: resolveNote },
      })
      setResolveOpen(false)
      setResolveNote('')
      setLocalStates((current) => ({ ...current, [note.id]: 'resolved' }))
      onChanged?.(note.id)
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }
  const markAllSeen = async () => {
    setBusyId('all')
    setActionError(null)
    try {
      await api('/notifications/ack-all', {
        method: 'POST',
        body: {
          actor_id: 'desktop',
          ...(projectFilter !== 'all' ? { project_id: projectFilter } : {}),
          ...(typeFilter !== 'all' && KIND_LABELS[typeFilter] ? { kind: typeFilter } : {}),
          ...(severityFilter !== 'all' ? { severity: severityFilter } : {}),
        },
      })
      onRefresh?.()
    } catch (failure) {
      setActionError(String(failure?.message ?? failure))
    }
    setBusyId(null)
  }

  const groups = []
  for (const note of shown) {
    const bucket = dayBucket(note.created_at)
    let group = groups.find((g) => g.title === bucket)
    if (!group) { group = { title: bucket, items: [] }; groups.push(group) }
    group.items.push(note)
  }

  const filterEmpty = all.length > 0 && filtered.length === 0
  return jsxs(Fragment, { children: [
    jsx('style', { 'data-dy-notifications': 'true', children: NOTIFICATIONS_CSS }),
    jsx(PageHead, {
      title: 'Уведомления',
      description: 'События флота: одобрения, здоровье и оповещения — с их историей.',
      status: newCount > 0 ? `${number(newCount)} новых` : null,
      onRefresh,
    }),
    jsxs('div', { className: 'dy-notif-toolbar', children: [
      jsxs('div', { className: 'dy-notif-filters', role: 'group', 'aria-label': 'Фильтры уведомлений', children: [
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Фильтр по состоянию', value: stateFilter, onChange: (e) => { setStateFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            ['all', 'new', 'seen', 'resolved'].map((value) => jsx('option', { value, children: value === 'all' ? 'Все состояния' : STATE_LABELS[value] }, value)) }) }),
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Фильтр по типу', value: typeFilter, onChange: (e) => { setTypeFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            [['all', 'Все типы'], ['approval_required', 'Одобрения'], ['health_change', 'Здоровье'], ['alert', 'Оповещения'], ['unassigned_work', 'Не назначен'], ['other', 'Другое']].map(([value, label]) => jsx('option', { value, children: label }, value)) }) }),
        jsx('label', { className: 'dy-notif-filter', children:
          jsx('select', { 'aria-label': 'Фильтр по важности', value: severityFilter, onChange: (e) => { setSeverityFilter(e.target.value); setVisible(PAGE_SIZE) }, children:
            [['all', 'Все важности'], ...SEVERITIES.map((s) => [s, severityLabel(s)])].map(([value, label]) => jsx('option', { value, children: label }, value)) }) }),
      ]}),
      jsx('span', { className: 'dy-notif-spacer' }),
      jsx(Button, {
        action: 'ack-all',
        small: true,
        disabled: busyId === 'all' || filtered.length === 0,
        onClick: markAllSeen,
        children: busyId === 'all' ? 'Отмечаем…' : 'Отметить все как прочитанные',
      }),
    ]}),
    filterEmpty
      ? jsx(EmptyState, { title: 'Ничего не соответствует фильтрам', description: 'Ослабьте или сбросьте фильтры, чтобы увидеть больше истории.', icon: 'bell' })
      : all.length === 0
        ? jsx(EmptyState, { title: 'Уведомлений пока нет', description: 'События флота появятся здесь, когда работа меняет состояние или требует внимания.', icon: 'bell' })
        : jsxs('div', { className: 'dy-notif-layout', 'data-panel': selected ? 'open' : 'none', children: [
          jsxs('div', { children: [
            groups.map((group) => jsxs('section', { className: 'dockyard-feed-group', children: [
              jsxs('div', { className: 'dockyard-feed-head', children: [
                jsx('h2', { className: 'dy-notif-day', children: group.title }),
                jsx('span', { className: 'dockyard-section-count', children: number(group.items.length) }),
              ]}),
              group.items.map((note) => jsx(NotificationRow, {
                note,
                busy: busyId === note.id,
                selected: note.id === selectedId,
                onSelect: () => { setSelectedId(note.id === selectedId ? null : note.id); setResolveOpen(false) },
                onSeen: () => markSeen(note),
                onOpen,
              }, String(note.id))),
            ]}, group.title)),
            filtered.length > visible
              ? jsx(Button, { action: 'load-more', className: 'dy-notif-more', onClick: () => setVisible((v) => v + PAGE_SIZE), children: 'Показать ещё' })
              : null,
          ]}),
          selected
            ? jsx(NotificationDetail, {
              note: selected,
              busy: busyId === selected.id,
              resolveOpen,
              onResolveToggle: () => setResolveOpen((open) => !open),
              resolveNote,
              onResolveNote: setResolveNote,
              onResolve: () => resolve(selected),
              onSeen: () => markSeen(selected),
              onOpen,
            })
            : null,
        ]}),
    jsxs('p', { className: 'dy-notif-settings-link', 'data-notification-settings-link': true, children: [
      jsx('span', { children: 'Настройки уведомлений — в настройках приложения.' }),
      jsx(Button, { small: true, action: 'open-app-settings', onClick: onOpenSettings, children: 'Открыть настройки приложения' }),
    ]}),
    actionError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Действие не выполнено: ${actionError}` }) : null,
  ]})
}

export function NotificationRow({ note, busy, selected, onSelect, onSeen, onOpen }) {
  const tone = severityTone(note.severity)
  const state = note.state ?? (note.acked ? 'seen' : 'new')
  const when = formatWhen(note.created_at)
  return jsxs('article', {
    className: 'dockyard-notification-row',
    'data-notification-id': String(note.id),
    'data-notification-state': state,
    'data-selected': selected ? 'true' : 'false',
    children: [
      jsx('button', {
        type: 'button',
        className: 'dockyard-notification-main dy-notif-row-btn',
        'aria-expanded': selected ? 'true' : 'false',
        onClick: onSelect,
        children: jsxs('span', { className: 'dy-notif-row-inner', children: [
          jsx('span', { className: `dockyard-notification-marker ${tone}`, 'aria-hidden': 'true', children: jsx(Icon, { name: tone === 'danger' || tone === 'warning' ? 'alert' : 'bell' }) }),
          jsxs('span', { children: [
            jsxs('span', { className: 'dy-notif-row-titleline', children: [
              jsx('strong', { children: note.title ?? 'Уведомление флота' }),
              jsx(StatusTag, { tone: state === 'new' ? 'info' : 'neutral', label: STATE_LABELS[state] ?? state }),
            ]}),
            jsx('p', { children: note.body ?? '' }),
            jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Флот'} · ${kindLabel(note.kind)} · ${severityLabel(note.severity)}${when ? ` · ${when}` : ''}` }),
          ]}),
        ]}),
      }),
      jsxs('div', { className: 'dockyard-notification-action', children: [
        typeof onOpen === 'function' && note.deep_link
          ? jsx(Button, { action: 'open', small: true, onClick: () => onOpen(note.deep_link), children: 'Открыть' })
          : null,
        state === 'new'
          ? jsx(Button, { action: 'mark-seen', small: true, disabled: busy, onClick: onSeen, children: busy ? 'Отмечаем…' : 'Отметить прочитанным' })
          : null,
      ]}),
    ],
  })
}

export function NotificationDetail({ note, busy, resolveOpen, onResolveToggle, resolveNote, onResolveNote, onResolve, onSeen, onOpen }) {
  const state = note.state ?? (note.acked ? 'seen' : 'new')
  const resolvedBy = note.resolved_by
  const seenBy = note.acked_by
  return jsxs('aside', { className: 'dy-notif-detail', 'data-notification-detail': String(note.id), 'aria-label': 'Детали уведомления', children: [
    jsxs('h3', { children: [note.title ?? 'Уведомление флота', ' ', jsx(StatusTag, { tone: state === 'new' ? 'info' : 'neutral', label: STATE_LABELS[state] ?? state }) ]}),
    jsx('p', { children: note.body ?? '' }),
    jsx('span', { className: 'dockyard-meta', children: `Проект: ${note.project || 'Флот'}` }),
    jsx('span', { className: 'dockyard-meta', children: `Тип: ${kindLabel(note.kind)} · Важность: ${severityLabel(note.severity)}` }),
    jsx('span', { className: 'dockyard-meta', children: `Создано: ${formatWhen(note.created_at)}` }),
    seenBy ? jsx('span', { className: 'dockyard-meta', children: `Просмотрено: ${seenBy}${note.acked_at ? ` · ${formatWhen(note.acked_at)}` : ''}` }) : null,
    resolvedBy ? jsxs('span', { className: 'dockyard-meta', children: [
      `Закрыто: ${resolvedBy}${note.resolved_at ? ` · ${formatWhen(note.resolved_at)}` : ''}`,
      note.resolution ? ` (${note.resolution})` : '',
      note.resolution_note ? ` — «${note.resolution_note}»` : '',
    ]}) : null,
    jsxs('div', { className: 'dy-notif-detail-actions', children: [
      typeof onOpen === 'function' && note.deep_link
        ? jsx(Button, { action: 'detail-open', small: true, onClick: () => onOpen(note.deep_link), children: 'Открыть элемент' })
        : null,
      state === 'new'
        ? jsx(Button, { action: 'detail-seen', small: true, disabled: busy, onClick: onSeen, children: busy ? 'Отмечаем…' : 'Отметить прочитанным' })
        : null,
      state !== 'resolved'
        ? jsx(Button, { action: 'detail-resolve', small: true, disabled: busy, onClick: onResolveToggle, 'aria-expanded': resolveOpen ? 'true' : 'false', children: 'Закрыть' })
        : null,
      note.kind === 'approval_required' && note.ref
        ? jsx(Button, { action: 'detail-approval', small: true, onClick: () => onOpen?.(note.project ? `s4:project/${note.project}` : 's4:approval-inbox'), children: 'Проверить во «Входящих одобрениях»' })
        : null,
    ]}),
    resolveOpen && state !== 'resolved'
      ? jsxs(Fragment, { children: [
        jsx('textarea', {
          className: 'dy-notif-resolve-note',
          'aria-label': 'Заметка о решении',
          placeholder: 'Заметка о решении (необязательно)',
          value: resolveNote,
          maxLength: 2000,
          onChange: (e) => onResolveNote(e.target.value),
        }),
        jsx(Button, { action: 'detail-resolve-confirm', variant: 'primary', small: true, disabled: busy, onClick: onResolve, children: busy ? 'Закрываем…' : 'Подтвердить решение' }),
      ]})
      : null,
  ]})
}

export function NotificationSettings({ settings, busy, error, onSave }) {
  const value = settings ?? {}
  const channels = value.channels ?? {}
  const desktop = channels.desktop ?? {}
  // Checks round 1 (Sahil 08/10, pick 2 = A): Discord alerts, off by default.
  const discord = channels.discord ?? {}
  const discordOn = discord.enabled === true
  const quiet = value.quiet_hours ?? {}
  const bypass = value.bypass_quiet_hours ?? ['approval_required']
  const approvalsBypass = bypass.includes('approval_required')
  return jsxs('aside', { className: 'dy-notif-settings', 'data-notification-settings': 'true', 'aria-label': 'Настройки уведомлений', children: [
    jsx('h3', { children: 'Настройки уведомлений' }),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-min-severity', children: 'Минимальная важность' }),
      jsx('select', { id: 'dy-notif-min-severity', value: channels.in_app?.min_severity ?? 'low', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, in_app: { ...(channels.in_app ?? {}), min_severity: e.target.value } } }), children:
        SEVERITIES.map((s) => jsx('option', { value: s, children: severityLabel(s) }, s)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-popups-enabled', children: 'Всплывающие окна' }),
      jsx('select', { id: 'dy-notif-popups-enabled', value: desktop.enabled === false ? 'off' : 'on', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, desktop: { ...desktop, enabled: e.target.value === 'on' } } }), children:
        [['on', 'Вкл'], ['off', 'Выкл']].map(([v, label]) => jsx('option', { value: v, children: label }, v)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-popups-severity', children: 'Минимальная важность для всплывающих' }),
      jsx('select', { id: 'dy-notif-popups-severity', value: desktop.min_severity ?? 'high', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, desktop: { ...desktop, min_severity: e.target.value } } }), children:
        SEVERITIES.map((s) => jsx('option', { value: s, children: severityLabel(s) }, s)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-discord-enabled', children: 'Оповещения в Telegram' }),
      jsx('select', { id: 'dy-notif-discord-enabled', value: discordOn ? 'on' : 'off', disabled: busy, onChange: (e) => onSave({ channels: { ...channels, discord: { ...discord, enabled: e.target.value === 'on' } } }), children:
        [['off', 'Выкл'], ['on', 'Вкл']].map(([v, label]) => jsx('option', { value: v, children: label }, v)) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-discord-severity', children: 'Минимальная важность для Telegram' }),
      jsx('select', { id: 'dy-notif-discord-severity', value: discord.min_severity ?? 'high', disabled: busy || !discordOn, onChange: (e) => onSave({ channels: { ...channels, discord: { ...discord, min_severity: e.target.value } } }), children:
        SEVERITIES.map((s) => jsx('option', { value: s, children: severityLabel(s) }, s)) }),
    ]}),
    jsx('p', { className: 'dy-notif-override-link', 'data-discord-note': true, children: 'Оповещения в Telegram отправляются плановым заданием на этом компьютере после его настройки. До этого ничего не отправляется.' }),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('label', { htmlFor: 'dy-notif-quiet-start', children: 'Тихие часы' }),
      jsx('input', { id: 'dy-notif-quiet-start', type: 'time', value: quiet.start ?? '', disabled: busy, onChange: (e) => onSave({ quiet_hours: { ...(quiet || {}), start: e.target.value, end: quiet.end ?? '' } }) }),
      jsx('span', { children: '→' }),
      jsx('input', { 'aria-label': 'Конец тихих часов', type: 'time', value: quiet.end ?? '', disabled: busy, onChange: (e) => onSave({ quiet_hours: { ...(quiet || {}), start: quiet.start ?? '', end: e.target.value } }) }),
    ]}),
    jsxs('div', { className: 'dy-notif-setting', children: [
      jsx('input', { id: 'dy-notif-bypass', type: 'checkbox', checked: approvalsBypass, disabled: busy, onChange: (e) => {
        const next = e.target.checked
          ? Array.from(new Set([...bypass, 'approval_required']))
          : bypass.filter((k) => k !== 'approval_required')
        onSave({ bypass_quiet_hours: next })
      } }),
      jsx('label', { htmlFor: 'dy-notif-bypass', children: 'Одобрения игнорируют тихие часы' }),
    ]}),
    jsx('p', { className: 'dy-notif-override-link', children: 'Переопределения для проекта: выберите проект, затем «Проекты \u2192 Настройки».' }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Не удалось сохранить: ${error}` }) : null,
  ]})
}
