// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C1 Overview: what the project header strip says (signed by Sahil 16/09,
// built 05/10). Pure functions, no React, so node tests can run them.
//
// Nothing here scores a project. Every state comes from facts the backend
// already works out, through routes that already exist:
//   /portfolio   this project's delivery status, with the Dashboard's own
//                rule (at_risk / stalled / idle / on_track), its counts, and
//                the fleet groups: decisions waiting and interventions.
//   /dashboard   enabled, phase and work counts (already on the page).
//   /projects/{id}/milestones   open milestones. The portfolio counts the
//                overdue ones but does not list them, so the rows come from
//                here, with the same rule (open, due date passed).
// Evidence health stays separate from delivery status (rule P6.1): it never
// changes the banner, it only adds a row when the evidence is out of date.

export const STALLED_AFTER_DAYS = 14

const PHASE_LABEL = { paused: 'На паузе', frozen: 'Заморожен', disabled: 'Выключено', archived: 'В архиве' }

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

function joinAnd(parts) {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

// "2h ago" style recency. Unparseable or missing input gives null, never 0.
export function timeAgo(value, now = new Date()) {
  const at = Date.parse(value ?? '')
  if (Number.isNaN(at)) return null
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 60) return `${days}d ago`
  return `${Math.floor(days / 30)} months ago`
}

// The newest moment anything happened: the portfolio's last work change or
// the newest recorded project event, whichever is later.
export function lastActivity({ portfolioRow, events = [] }) {
  const stamps = [portfolioRow?.last_activity, ...events.map((event) => event?.ts ?? event?.created_at)]
    .map((value) => ({ value, at: Date.parse(value ?? '') }))
    .filter((entry) => !Number.isNaN(entry.at))
  if (stamps.length === 0) return null
  return stamps.reduce((newest, entry) => (entry.at > newest.at ? entry : newest)).value
}

// Delivery counts for the thin progress strip. Same buckets as the Dashboard
// (/dashboard work counts): active = in progress + in review.
export function deliveryCounts(work) {
  const counts = {
    done: Number(work?.done ?? 0),
    active: Number(work?.active ?? 0),
    blocked: Number(work?.blocked ?? 0),
    backlog: Number(work?.backlog ?? 0),
  }
  const total = counts.done + counts.active + counts.blocked + counts.backlog
  const percent = total > 0 ? Math.round((counts.done / total) * 100) : null
  return { ...counts, total, percent }
}

function overdueMilestones(milestones, now) {
  return (milestones ?? []).filter((milestone) => {
    if (!milestone || milestone.closed || milestone.archived_at) return false
    const due = Date.parse(milestone.due ?? '')
    return !Number.isNaN(due) && due < now.getTime()
  })
}

// The banner and the drawer for one project. Returns
//   { available, state, tone, label, summary, items: [...] }
// where tone is one of success | info | warning | danger | neutral and each
// item names its cause, where it came from and where Open goes.
export function projectAttention({ project, portfolio, milestones = [], now = new Date() }) {
  const id = project?.id
  const row = (portfolio?.projects ?? []).find((entry) => entry?.project_id === id) ?? null
  if (!id || !row) {
    return {
      available: false, state: 'unknown', tone: 'neutral', label: 'Статус недоступен',
      summary: 'проверка внимания не загрузилась. Обновите и попробуйте снова.', items: [],
    }
  }
  const groups = portfolio.groups ?? {}
  const items = []
  for (const decision of groups.decisions ?? []) {
    if (decision?.project !== id) continue
    // Signed 16/09: an approval item is amber in the drawer (the banner
    // state it causes, "Needs review", is blue).
    items.push({
      key: `approval:${decision.ref}`, kind: 'approval', tone: 'warning', label: 'Одобрение ожидается',
      title: decision.title || decision.ref, ref: decision.ref,
      note: `Initiative waiting for your decision${decision.risk ? ` (${decision.risk} risk)` : ''}.`,
      ageDays: decision.age_days, owner: null,
      next: 'Решение принимается во «Входящих одобрениях», где показан отпечаток.',
      target: { kind: 'deep_link', link: decision.deep_link || `s6:initiative/${decision.ref}` },
      openLabel: 'Открыть во «Входящих одобрениях»',
    })
  }
  for (const entry of groups.interventions ?? []) {
    if (entry?.project !== id) continue
    const base = { ref: entry.ref, ageDays: entry.age_days, owner: entry.owner ?? null, next: entry.next_action ?? null }
    if (entry.cause === 'blocked_item') {
      items.push({ ...base, key: `blocked:${entry.ref}`, kind: 'blocked', tone: 'danger', label: 'Заблокировано',
        title: `${entry.ref} · ${entry.title}`, note: entry.detail || 'Заблокировано без записанной причины.',
        target: { kind: 'work', ref: entry.ref }, openLabel: 'Открыть рабочий элемент' })
    } else if (entry.cause === 'overdue_item') {
      items.push({ ...base, key: `overdue:${entry.ref}`, kind: 'overdue', tone: 'warning', label: 'Просрочено',
        title: `${entry.ref} · ${entry.title}`, note: entry.detail || 'Просрочено и не выполнено.',
        target: { kind: 'work', ref: entry.ref }, openLabel: 'Открыть рабочий элемент' })
    } else if (entry.cause === 'evidence_stale') {
      items.push({ ...base, key: 'evidence', kind: 'evidence', tone: 'warning', label: 'Доказательства устарели',
        title: entry.title || 'Последняя проверка здоровья устарела', note: entry.detail || '',
        target: { kind: 'view', view: 'overview' }, openLabel: 'Открыть оценку' })
    } else if (entry.cause === 'unlinked_project') {
      // Hermes has no project for it (10/10/2026): its work cannot be read.
      items.push({ ...base, key: 'unlinked', kind: 'unlinked', tone: 'warning', label: 'Не связан',
        title: entry.title || 'Не привязан к проекту Hermes', note: entry.detail || '',
        target: { kind: 'view', view: 'settings' }, openLabel: 'Настройки проекта' })
    } else if (entry.cause === 'project_attention') {
      const switchedOff = project.enabled === false || row.enabled === false
      items.push({ ...base, key: 'project', kind: 'project', tone: 'neutral',
        label: switchedOff ? 'Выключено' : (PHASE_LABEL[project.phase ?? row.phase] ?? 'Состояние проекта'),
        title: switchedOff ? 'Этот проект выключен' : `This project is ${project.phase ?? row.phase}`,
        note: switchedOff ? 'Для него ничего не запускается, пока кто-нибудь не включит его снова.' : 'Его состояние жизненного цикла требует решения.',
        target: { kind: 'view', view: 'settings' }, openLabel: 'Настройки проекта' })
    }
  }
  for (const milestone of overdueMilestones(milestones, now)) {
    items.push({
      key: `milestone:${milestone.id}`, kind: 'milestone', tone: 'warning', label: 'Веха просрочена',
      title: milestone.name, ref: milestone.id,
      note: `Due ${milestone.due} and still open${Number.isFinite(Number(milestone.total)) ? ` (${Number(milestone.done ?? 0)} of ${Number(milestone.total)} done)` : ''}.`,
      ageDays: Math.max(0, Math.floor((now.getTime() - Date.parse(milestone.due)) / 86400000)), owner: null,
      next: 'Пересмотрите дату или закройте веху.',
      target: { kind: 'plan', entry: `plan:milestone:${milestone.id}` }, openLabel: 'Открыть в «Видении»',
    })
  }
  if (row.status === 'stalled') {
    items.push({
      key: 'stalled', kind: 'stalled', tone: 'warning', label: 'Застряло',
      title: `No work has moved for ${STALLED_AFTER_DAYS} days or more`,
      note: 'Есть открытая работа, но ничего в ней не изменилось.', ageDays: null, owner: null,
      next: 'Проверьте доску и перепланируйте.', target: { kind: 'view', view: 'board' }, openLabel: 'Открыть канбан',
    })
  }

  // Order inside the drawer: most severe first, then oldest first.
  const rank = { danger: 0, warning: 1, info: 2, neutral: 3, success: 4 }
  items.sort((left, right) => (rank[left.tone] - rank[right.tone]) || ((right.ageDays ?? 0) - (left.ageDays ?? 0)))

  const enabled = project.enabled ?? row.enabled
  const phase = project.phase ?? row.phase
  let state
  if (enabled === false) state = ['disabled', 'neutral', 'Выключено']
  else if (phase && phase !== 'active') state = [phase, 'neutral', PHASE_LABEL[phase] ?? phase]
  else if (row.status === 'unlinked') state = ['unlinked', 'warning', 'Не связан']
  else if (Number(row.items?.blocked ?? 0) > 0) state = ['blocked', 'danger', 'Заблокировано']
  else if (row.status === 'at_risk') state = ['at_risk', 'warning', 'Под угрозой']
  else if (row.status === 'stalled') state = ['stalled', 'warning', 'Застряло']
  else if (items.some((item) => item.kind === 'approval')) state = ['review', 'info', 'Нужна проверка']
  else if (row.status === 'idle') state = ['idle', 'neutral', 'Простой']
  else state = ['on_track', 'success', 'В графике']

  const count = (kind) => items.filter((item) => item.kind === kind).length
  const countable = [
    ['blocked', 'blocked item'], ['overdue', 'overdue item'], ['milestone', 'overdue milestone'], ['approval', 'approval'],
  ].filter(([kind]) => count(kind) > 0)
  const sentences = []
  if (state[0] === 'unlinked') sentences.push('У Hermes нет для него проекта, поэтому его работа не может быть показана')
  if (countable.length > 0) {
    const total = countable.reduce((sum, [kind]) => sum + count(kind), 0)
    sentences.push(`${joinAnd(countable.map(([kind, word]) => plural(count(kind), word)))} ${total === 1 ? 'needs' : 'need'} you`)
  }
  if (count('stalled') > 0) sentences.push(`no work has moved for ${STALLED_AFTER_DAYS} days or more`)
  const evidence = items.find((item) => item.kind === 'evidence')
  if (evidence) sentences.push(String(evidence.title).replace(/^Evidence/, 'evidence'))
  if (count('project') > 0 && sentences.length === 0) sentences.push(state[0] === 'disabled' ? 'nothing runs until it is enabled' : 'its lifecycle state needs a decision')
  let summary = sentences.join(' · ')
  if (!summary) {
    summary = state[0] === 'idle' ? 'nothing is in progress and no milestone is open'
      : PHASE_LABEL[state[0]] ? `the project is ${state[0]}`
        : 'nothing needs you right now'
  }
  return { available: true, state: state[0], tone: state[1], label: state[2], summary, items }
}
