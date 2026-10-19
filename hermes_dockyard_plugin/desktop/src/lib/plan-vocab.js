// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// One vocabulary for the planning screens (the Roadmap, the project Vision
// screen and the milestone panel), so no two screens name a state, a link or
// a forecast differently.
export const ICON = Object.freeze({ project: 'P', initiative: 'I', milestone: 'M', work: 'W', objective: 'O', goal: 'G' })
export const KIND_LABEL = Object.freeze({ initiative: 'Инициатива', milestone: 'Веха', objective: 'Задача-цель', goal: 'Цель' })
export const BUCKETS = Object.freeze([['planned', 'Запланировано'], ['building', 'Сборка'], ['ready_for_review', 'Готово к проверке'], ['complete', 'Завершить']])
// Initiative states (domain/constants.py InitiativeStatus, plus changes_requested).
// Only a withdrawal sets 'cancelled' (design round f, Option B), so it reads
// "Withdrawn".
export const STATUS_LABEL = Object.freeze({
  proposed: 'Предложено', pending_approval: 'Ждёт одобрения', changes_requested: 'Запрошены правки',
  approved: 'Одобрено', executing: 'В работе', completed: 'Завершить', regressed: 'Откат',
  rejected: 'Отклонено', cancelled: 'Отозвано',
})
export const STATUS_TONE = Object.freeze({
  proposed: 'info', pending_approval: 'warning', changes_requested: 'warning', approved: 'info', executing: 'info',
  completed: 'success', regressed: 'danger', rejected: 'neutral', cancelled: 'neutral',
})
// The states the backend counts against the open-initiative limit.
export const OPEN_STATUSES = Object.freeze(['proposed', 'pending_approval', 'changes_requested', 'approved', 'executing'])
// What a person can do next, by state (the backend enforces the same sets):
// withdraw a proposal before approval; mark approved or in-progress work complete.
export const WITHDRAWABLE_STATUSES = Object.freeze(['proposed', 'pending_approval', 'changes_requested'])
export const COMPLETABLE_STATUSES = Object.freeze(['approved', 'executing'])
// Finished or closed initiatives: shown only with "Show finished and archived".
export const CLOSED_STATUSES = Object.freeze(['completed', 'regressed', 'rejected', 'cancelled'])
export const GOAL_LABEL = Object.freeze({ met: 'Достигнуто', at_risk: 'Под угрозой', unknown: 'Неизвестные доказательства', unproven: 'Не доказано' })
export const GOAL_TONE = Object.freeze({ met: 'success', at_risk: 'danger', unknown: 'neutral', unproven: 'neutral' })
export const OUTCOME_LABEL = Object.freeze({ passed: 'Пройдено', failed: 'Провалено', stale: 'Устарело', unknown: 'Неизвестно', not_applicable: 'Не применимо' })
export const OUTCOME_TONE = Object.freeze({ passed: 'success', failed: 'danger', stale: 'warning', unknown: 'neutral', not_applicable: 'neutral' })
export const REL_LABEL = Object.freeze({ delivers: 'delivers', depends_on: 'depends on', supports: 'supports', measures: 'measures', unblocks: 'unblocks' })
// The relationships the backend accepts for each kind of initiative link.
export const RELATIONSHIPS = Object.freeze({ milestone: Object.freeze(['delivers', 'depends_on']), objective: Object.freeze(['supports', 'measures', 'unblocks']) })

// The words a forecast or a risk line shows, in one place: a translation is
// one edit here. ("нед." keeps the unit short, so no plural agreement is
// needed for a computed number of weeks.)
const OWNER_LABEL = 'владелец'
const UNASSIGNED = 'не назначен'
export const PLAN_WORDS = Object.freeze({
  weeks: 'нед.',
  owner: OWNER_LABEL,
  unassigned: UNASSIGNED,
  blockedBy: (item, blockers, owner) => `${item} заблокирован: ${blockers} — ${OWNER_LABEL} ${owner || UNASSIGNED}`,
  overdue: (item, owner) => `${item} просрочен — ${OWNER_LABEL} ${owner || UNASSIGNED}`,
  milestoneOverdue: (remaining) => `Веха просрочена, осталось элементов: ${remaining}.`,
})

// Milestone forecast: a count-based scenario from completed-item history,
// never a delivery promise.
export function forecastLine(fc) {
  if (!fc) return 'Прогноз недоступен.'
  if (fc.state === 'complete') return 'Прогноз: завершено.'
  if (fc.state === 'insufficient_history') {
    return `Прогноз: недостаточно истории (завершений за последние ${fc.assumptions?.window_weeks ?? 4} полных недель: ${fc.sample_size ?? 0}; нужно ${fc.assumptions?.min_sample ?? 8}).`
  }
  if (fc.state === 'not_comparable') return 'Прогноз: история работ несопоставима.'
  const range = fc.range_weeks ?? {}
  const upper = range.upper_open_ended ? '«открытый» (наблюдалась неделя нулевого оборота)' : `${range.upper} ${PLAN_WORDS.weeks}`
  return `Прогноз: ~${fc.central_weeks} ${PLAN_WORDS.weeks} в среднем (диапазон ${range.lower}–${upper}); завершений: ${fc.sample_size}. Сценарный расчёт по количеству, а не обещание поставки.`
}

export function riskLine(risk) {
  if (risk.kind === 'dependency_blocker' && risk.item) return PLAN_WORDS.blockedBy(risk.item, (risk.blockers ?? []).join(', '), risk.owner)
  if (risk.kind === 'overdue_item' && risk.item) return PLAN_WORDS.overdue(risk.item, risk.owner)
  if (risk.kind === 'milestone_overdue') return PLAN_WORDS.milestoneOverdue(risk.remaining)
  return risk.kind
}
