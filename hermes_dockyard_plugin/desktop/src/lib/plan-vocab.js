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

// Milestone forecast: a count-based scenario from completed-item history,
// never a delivery promise.
export function forecastLine(fc) {
  if (!fc) return 'Прогноз недоступен.'
  if (fc.state === 'complete') return 'Прогноз: завершено.'
  if (fc.state === 'insufficient_history') {
    return `Forecast: insufficient history (${fc.sample_size ?? 0} completions in the last ${fc.assumptions?.window_weeks ?? 4} complete weeks; needs ${fc.assumptions?.min_sample ?? 8}).`
  }
  if (fc.state === 'not_comparable') return 'Прогноз: история работ несопоставима.'
  const range = fc.range_weeks ?? {}
  const upper = range.upper_open_ended ? 'открытый (наблюдалась неделя нулевого оборота)' : `${range.upper} weeks`
  return `Forecast: ~${fc.central_weeks} weeks central (range ${range.lower}–${upper}); ${fc.sample_size} completions. A count-based scenario, not a delivery promise.`
}

export function riskLine(risk) {
  if (risk.kind === 'dependency_blocker' && risk.item) return `${risk.item} blocked by ${(risk.blockers ?? []).join(', ')} — owner ${risk.owner || 'unassigned'}`
  if (risk.kind === 'overdue_item' && risk.item) return `${risk.item} overdue — owner ${risk.owner || 'unassigned'}`
  if (risk.kind === 'milestone_overdue') return `Milestone past its due date with ${risk.remaining} item(s) remaining.`
  return risk.kind
}
