// Roadmap state vocabulary, split out of roadmap.js to keep each hand-edited
// module under the ~800-line rule (Batch L waivers pushed it over).
import { jsx } from '../runtime/react.js'

// Derived states, exactly as the backend computes them. Unknown is unknown:
// never rendered as met, and never as zero.
export const STATE_LABEL = {
  not_started: 'Не начато', in_progress: 'В работе', met: 'Достигнуто',
  at_risk: 'Под угрозой', unknown: 'Неизвестно', reached: 'Достигнут', not_reached: 'Не достигнуто',
  waived: 'Больше не требуется',
}

export const words = (value) => String(value ?? '').replace(/_/g, ' ')
export const chip = (text, tone = '') => jsx('span', { className: `dy-rm-chip${tone ? ` ${tone}` : ''}`, children: text })

// v43: a waived item shows its reason, so the decision is never anonymous.
export const waivedChip = (row) => (row.waived
  ? chip(`Больше не требуется — ${row.waived.reason}`, 'waived')
  : null)

export const milestoneStateWords = (row) => (
  `${STATE_LABEL[row.state] ?? words(row.state)}${row.overdue ? ' · просрочено' : ''}${row.closed ? ' · закрыто' : ''}`)
export const objectiveStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · проверка: ${STATE_LABEL[check] ?? words(check)}` : ''
  return `${STATE_LABEL[row.state] ?? words(row.state)}${checkText}`
}
export const goalStateWords = (row) => {
  const check = row.check?.state
  const checkText = check && check !== 'no_check' ? ` · проверка: ${STATE_LABEL[check] ?? words(check)}` : ''
  const tasks = row.task_count ? ` · задач: ${row.task_count}` : ' · задач нет'
  return `${STATE_LABEL[row.state] ?? words(row.state)}${tasks}${checkText}`
}
