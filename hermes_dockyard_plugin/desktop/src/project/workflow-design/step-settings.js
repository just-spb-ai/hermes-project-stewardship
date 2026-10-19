// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows (Sahil's pick, 07/10/2026: loops shown as a frame): the canvas
// hooks. The step panel says, in plain words: Who does it, What to do,
// Repeat, Ask me first, Limits. Real fields (who, what, repeat, ask me first)
// save with the panel's own Save button through the screen's one save path;
// Limits is a stand-in kept in memory and tagged "Preview". A step that
// repeats is drawn inside a frame on the canvas, and its repeat settings live
// on that frame.
import { readStepSettings } from './standins.js'
import { writeStepSettings } from './standins.js'
import { CHECK_WORDS } from './standins.js'

const el = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}
const previewTag = () => el('span', 'dy-wfd-preview-tag', 'Предпросмотр')
const section = (title, { preview = false, help } = {}) => {
  const box = el('section', 'dy-wfx-section')
  const head = el('h5', '', title)
  if (preview) head.appendChild(previewTag())
  box.appendChild(head)
  if (help) box.appendChild(el('p', 'dy-wfx-help', help))
  return box
}
const labelled = (text, control) => {
  const label = el('label', 'dy-wf-field')
  label.append(el('span', '', text), control)
  return label
}

export const roundsWords = (n) => `До ${n} раундов, затем спросит вас`

// The step panel's extra sections for one step.
function panelExtras({ node, stored, members, settingsKey, onEditFrame }) {
  const current = readStepSettings(...settingsKey(node.node_id))
  const root = el('div', 'dy-wfx')
  if (node.human_gate) {
    // A sign-off step is done by you: the workflow waits here for your decision.
    const who = section('Кто делает')
    who.appendChild(el('p', 'dy-wfx-help', 'Вы. Процесс ждёт здесь, пока вы не одобрите или не вернёте его.'))
    root.appendChild(who)
    return { el: root, apply: (next) => next }
  }

  const who = section('Кто делает')
  const pick = el('select', 'dy-wfx-select'); pick.setAttribute('data-wfx-who', ''); pick.setAttribute('aria-label', 'Кто делает')
  const choices = ['', ...members]
  if (stored?.phase_team && !members.includes(stored.phase_team)) choices.push(stored.phase_team)
  for (const value of choices) { const o = el('option', '', value || 'Кого выберет проект'); o.value = value; pick.appendChild(o) }
  pick.value = stored?.phase_team ?? node.phase_team ?? ''
  who.appendChild(pick)

  const what = section('Что делать')
  const body = el('textarea', 'dy-wfx-textarea'); body.rows = 3; body.setAttribute('data-wfx-body', ''); body.setAttribute('aria-label', 'Что делать')
  body.placeholder = 'Инструкции, которые получает бот на этом шаге.'
  body.value = stored?.body ?? ''
  what.appendChild(body)
  root.append(who, what)

  // Repeat: a step that repeats is edited on its frame; one that does not
  // can be made to repeat here (3 rounds, changed on the frame). The first
  // step cannot repeat: the engine gates each round on a step before it.
  const repeats = Boolean(stored?.loop ?? node.loop)
  const roundsNow = Number((stored?.loop ?? node.loop)?.max_iterations ?? 3)
  let repeatBox = null
  const repeat = section('Повтор')
  if (repeats) {
    repeat.appendChild(el('p', 'dy-wfx-help', `${roundsWords(roundsNow)}. Настройки повтора — на рамке этого шага на холсте.`))
    const open = el('button', 'dy-btn', 'Изменить повторение'); open.type = 'button'; open.setAttribute('data-wfx-edit-frame', node.node_id)
    open.addEventListener('click', () => onEditFrame?.(node.node_id, open.getBoundingClientRect()))
    repeat.appendChild(open)
  } else if (!(node.depends_on ?? []).length) {
    const why = el('p', 'dy-wfx-help', "Этот шаг первый, поэтому он не может повторяться: каждый раунд ждёт предыдущий шаг.")
    why.setAttribute('data-wfx-no-repeat', '')
    repeat.appendChild(why)
  } else {
    repeatBox = el('input'); repeatBox.type = 'checkbox'; repeatBox.checked = false; repeatBox.setAttribute('data-wfx-repeat', '')
    const repeatLabel = el('label', 'dy-wfx-check'); repeatLabel.append(repeatBox, el('span', '', 'Повтор, если раунд застрял (до 3 раундов; меняется на рамке)'))
    repeat.appendChild(repeatLabel)
  }
  root.appendChild(repeat)

  // Saved with the workflow (08/10/2026): when its turn comes the step waits
  // for you instead of going to its bot.
  const ask = section('Сначала спроси меня', { help: 'Когда придёт его очередь, оно ждёт вас: переместите в «В работе», чтобы запустить.' })
  const askBox = el('input'); askBox.type = 'checkbox'; askBox.checked = Boolean(stored?.ask_first ?? node.ask_first); askBox.setAttribute('data-wfx-ask-first', '')
  const askLabel = el('label', 'dy-wfx-check'); askLabel.append(askBox, el('span', '', 'Спросить меня перед этим шагом'))
  ask.appendChild(askLabel)

  const limits = section('Ограничения', { preview: true, help: 'Боту пока не отправлено.' })
  const turns = el('input', 'dy-wfx-input'); turns.type = 'number'; turns.min = '1'; turns.value = current.limits.turns; turns.setAttribute('data-wfx-turns', '')
  const minutes = el('input', 'dy-wfx-input'); minutes.type = 'number'; minutes.min = '1'; minutes.value = current.limits.minutes; minutes.setAttribute('data-wfx-minutes', '')
  const skills = el('input', 'dy-wfx-input'); skills.value = current.limits.skills; skills.placeholder = 'напр. github-pr-workflow'; skills.setAttribute('data-wfx-skills', '')
  const pair = el('div', 'dy-wfx-pair'); pair.append(labelled('Не более ходов', turns), labelled('Не более минут', minutes))
  limits.append(pair, labelled('Инструменты (навыки)', skills))
  root.append(ask, limits)

  const apply = (next) => {
    writeStepSettings(...settingsKey(node.node_id), {
      check: current.check,
      limits: { turns: turns.value, minutes: minutes.value, skills: skills.value.trim() },
    })
    const patch = { body: body.value.trim() || null, ask_first: askBox.checked }
    if (repeatBox) patch.loop = repeatBox.checked ? { max_iterations: 3, until: { status: 'done' } } : null
    return { ...next, phase_team: pick.value || null, design_patch: patch }
  }
  return { el: root, apply }
}

// The hooks for one mounted canvas.
//   storedNode(id): the saved (or draft) step, with fields the canvas lacks.
//   settingsKey(id): [project, workflow, id] for the preview settings.
export function canvasDesignHooks({ draft, members, storedNode, settingsKey, onEditFrame }) {
  // Card notes must fit beside the status word on a 208px card (~20
  // characters), so a step is named by a short title, its id, or its title's
  // first word.
  const shortName = (id) => {
    const t = storedNode(id)?.title ?? id
    if (t.length <= 10) return t
    return id.length <= 10 ? id : t.split(/\s+/)[0]
  }
  // members may be a getter: the team arrives after the canvas mounts.
  const team = () => (typeof members === 'function' ? members() : members) ?? []
  return {
    labels: { heading: 'Этот шаг', title: 'Имя шага', deps: 'Идёт после (ID шагов)', team: '', save: draft ? 'Применить к черновику' : 'Сохранить версию' },
    compactFacts: true,
    panelExtras: (node) => panelExtras({ node, stored: storedNode(node.node_id), members: team(), settingsKey, onEditFrame }),
    cardNote: (node) => {
      if (node.loop) return '↻ Повтор'
      if (node.when) return `Если «${shortName(node.when.node)}» ${node.when.status === 'blocked' ? 'застревает' : 'выполнено'}`
      // "Sign-off", not "Your sign-off": the gate's status ("awaiting
      // decision") is the longest on the card and they share the line.
      if (node.human_gate) return 'Подписание'
      if (node.ask_first) return 'Спрашивает тебя первым'
      return null
    },
    frames: (nodes) => nodes.filter((n) => n.loop).map((n) => {
      const check = readStepSettings(...settingsKey(n.node_id)).check
      return {
        id: n.node_id,
        nodeIds: [n.node_id],
        label: `↻ ${roundsWords(Number(n.loop.max_iterations))}`,
        sublabel: check.by !== 'none' ? `Проверяет: ${CHECK_WORDS[check.by]} (предпросмотр)` : null,
        onOpen: (rect) => onEditFrame?.(n.node_id, rect),
      }
    }),
  }
}
