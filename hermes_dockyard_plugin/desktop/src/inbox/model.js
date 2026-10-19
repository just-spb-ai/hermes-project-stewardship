// Approval Inbox model — pure functions over the real proxy payloads.
//
// Two item kinds arrive on GET /inbox and stay distinct everywhere:
//   initiative_approval — a decidable pending decision
//   project_attention   — a frozen/disabled project: listed, never decidable
// Tabs: All / Urgent / Today / Earlier ('Earlier', never 'Later').
// Age comes from age_days when the backend supplies it, else created_at.

export const TAB_KEYS = ['all', 'urgent', 'today', 'earlier']
export const TAB_LABELS = { all: 'Все', urgent: 'Срочно', today: 'Сегодня', earlier: 'Ранее' }

const highRisk = (item) => ['high', 'critical'].includes(String(item?.risk ?? '').toLowerCase())

export const isAttention = (item) => item?.kind === 'project_attention'

const sameDay = (iso, now) => {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return false
  return then.getUTCFullYear() === now.getUTCFullYear()
    && then.getUTCMonth() === now.getUTCMonth()
    && then.getUTCDate() === now.getUTCDate()
}

const earlierThanToday = (iso, now) => {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return false
  return then.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

// counts: {all, urgent, today, earlier}
// Urgent counts high-risk decisions AND attention rows (a frozen flagship
// project is urgent even though not decidable there).
export function countTabs(items, now = new Date()) {
  const counts = { all: 0, urgent: 0, today: 0, earlier: 0 }
  for (const item of items ?? []) {
    counts.all += 1
    const risky = isAttention(item) ? true : highRisk(item)
    if (risky) counts.urgent += 1
    if (sameDay(item?.created_at, now)) counts.today += 1
    if (earlierThanToday(item?.created_at, now)) counts.earlier += 1
  }
  return counts
}

// Tab filtering. Urgent keeps high-risk decisions AND high-risk attention
// rows (a frozen flagship project is urgent even though not decidable).
// Attention rows only ever carry created_at in the proxy payload, so Today
// and Earlier treat them exactly like decisions.
export function filterByTab(items, tab, now = new Date()) {
  const all = items ?? []
  if (tab === 'all') return all
  if (tab === 'urgent') return all.filter((item) => isAttention(item) || highRisk(item))
  if (tab === 'today') return all.filter((item) => sameDay(item.created_at, now))
  if (tab === 'earlier') return all.filter((item) => earlierThanToday(item.created_at, now))
  return []
}

// The words a row shows, in one place: a translation is one edit here, and
// the unit test (inbox-model.test.mjs) reads them instead of spelling the copy
// out a second time.
export const AGE_WORDS = Object.freeze({
  today: 'сегодня',
  day: (count) => `${count} день назад`,
  days: (count) => `${count} дн. назад`,
})
export const ROW_WORDS = Object.freeze({ project: 'проект', initiative: 'инициатива' })
export const RISK_WORD = Object.freeze({ low: 'низкий', medium: 'средний', high: 'высокий', critical: 'критический' })
export const riskPhrase = (risk) => `риск: ${RISK_WORD[String(risk ?? '').toLowerCase()] ?? risk}`

// 'сегодня' | '1 день назад' | 'N дн. назад' | '' — honest about missing data.
const daysOld = (days) => (days <= 0 ? AGE_WORDS.today : days === 1 ? AGE_WORDS.day(1) : AGE_WORDS.days(days))

export function ageLabel(item, now = new Date()) {
  if (item?.age_days != null && Number.isFinite(Number(item.age_days))) {
    return daysOld(Number(item.age_days))
  }
  if (!item?.created_at) return ''
  const then = new Date(item.created_at)
  if (Number.isNaN(then.getTime())) return ''
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    - Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())) / 86400000)
  return daysOld(days)
}

// Evidence count for the row badge: steps + tests contract items.
export function evidenceCount(item) {
  const contract = item?.detail?.validation_contract
  if (!contract) return 0
  let count = 0
  if (Array.isArray(contract.steps)) count += contract.steps.length
  if (contract.tests) count += 1
  if (Array.isArray(contract.evidence)) count += contract.evidence.length
  return count
}

// {project, meta, risk} for the list row meta line.
export function rowSummary(item, now = new Date()) {
  const risk = String(item?.risk ?? '').toLowerCase()
  const attention = isAttention(item)
  const age = ageLabel(item, now)
  const meta = [attention ? ROW_WORDS.project : ROW_WORDS.initiative, risk ? riskPhrase(risk) : '', age].filter(Boolean).join(' · ')
  return { project: item?.project ?? '', meta, risk }
}

const stamp = (entry, kind) => ({
  kind,
  at: entry?.created_at ?? entry?.at ?? null,
  actor: entry?.actor ?? entry?.display_name ?? '',
  body: entry?.body ?? '',
  decision: entry?.decision ?? undefined,
  summary: entry?.summary ?? undefined,
})

// Activity timeline: comments + receipts + events merged, ordered by time.
// kind: 'comment' | 'receipt' | 'event' — receipt entries win display.
export function mergeActivity(payload = {}) {
  const merged = [
    ...(payload.comments ?? []).map((e) => stamp(e, 'comment')),
    ...(payload.receipts ?? []).map((e) => stamp(e, 'receipt')),
    ...(payload.events ?? []).map((e) => stamp(e, 'event')),
  ].filter((entry) => entry.at)
  merged.sort((a, b) => new Date(a.at) - new Date(b.at))
  return merged
}

// The words the honest attention panel puts in front of a person, in one
// place: a translation is one edit here, and the tests read the same list
// instead of spelling the copy out a second time.
export const PANEL_WORDS = {
  title: 'Проект требует внимания',
  frozen: 'заморожен или отключён, поэтому его ожидающую работу здесь решить нельзя.',
  next: 'Откройте проект, чтобы увидеть, что его блокирует.',
}

// Copy for the honest attention panel. Never pretends to be decidable.
export function attentionPanel(item) {
  return {
    title: PANEL_WORDS.title,
    description: `${item?.project ?? 'Этот проект'} ${PANEL_WORDS.frozen} ${PANEL_WORDS.next}`,
    project: item?.project ?? '',
    deeplink: item?.deep_link ?? null,
    decidable: false,
  }
}