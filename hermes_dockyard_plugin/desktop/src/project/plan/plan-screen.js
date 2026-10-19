// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Design round f: the Vision screen, one per project.
// Sahil 04/10 (feedback f): "one planning screen per project" where a person
// creates, edits, deletes and reviews initiatives, milestones, objectives and
// goals together; the global Roadmap stays read-only across projects.
// Sahil 05/10: layout A (Outline), four sections one under the other with
// details in a drawer; the tab is called "Vision" (the whiteboards keep
// "Planning"). The view key stays 'plan' so existing deep links still land.
// Option B (05/10): withdraw an initiative before approval, delete an
// archived milestone or goal, and keep finished initiatives behind
// "Show finished and archived".
import { useCallback } from '../../runtime/react.js'
import { useEffect } from '../../runtime/react.js'
import { useMemo } from '../../runtime/react.js'
import { useState } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { StatusTag } from '../../lib/ui.js'
import { number } from '../../lib/ui.js'
import { COMPLETABLE_STATUSES } from '../../lib/plan-vocab.js'
import { KIND_LABEL } from '../../lib/plan-vocab.js'
import { OPEN_STATUSES } from '../../lib/plan-vocab.js'
import { WITHDRAWABLE_STATUSES } from '../../lib/plan-vocab.js'
import { ApprovalDetail } from '../../work-item/approvals.js'
import { findItem } from './plan-data.js'
import { isClosed } from './plan-data.js'
import { isLinkable } from './plan-data.js'
import { isTucked } from './plan-data.js'
import { listOf } from './plan-data.js'
import { loadPlan } from './plan-data.js'
import { needsReview } from './plan-data.js'
import { planActions } from './plan-data.js'
import { sameItem } from './plan-data.js'
import { statusOf } from './plan-data.js'
import { unfinishedWork } from './plan-data.js'
import { PlanDrawer } from './plan-drawer.js'
import { ActionDialog } from './plan-ui.js'
import { Confirm } from './plan-ui.js'
import { ItemForm } from './plan-ui.js'
import { KindGlyph } from './plan-ui.js'
import { LinkDialog } from './plan-ui.js'
import { Menu } from './plan-ui.js'
import { MissionStrip } from './plan-ui.js'
import { PlanDialog } from './plan-ui.js'
import { Tag } from './plan-ui.js'
import { errorText } from './plan-ui.js'

const KINDS = ['initiative', 'milestone', 'objective', 'goal']
const PLURAL = { initiative: 'Инициативы', milestone: 'Вехи', objective: 'Задачи-цели', goal: 'Цели' }
const EMPTY = {
  initiative: 'Открытых инициатив нет. Предложите одну: она ждёт одобрения до начала работы.',
  milestone: 'Вех пока нет. Веха группирует работу к одной дате поставки.',
  objective: 'Задач-целей пока нет. Задача-цель — это доказательство того, что работа дала результат.',
  goal: 'Целей пока нет. Цель достигнута, когда её задачи-цели проходят.',
}
// Where finished and archived items are: named once, used by every message.
const TUCKED = 'Показать завершённые и архивные'

// "plan:<kind>:<id>" is how another screen (the Roadmap's Open) asks the
// Vision screen to open on one item.
export function parsePlanFocus(entry) {
  const match = /^plan:(initiative|milestone|objective|goal):(.+)$/.exec(String(entry ?? ''))
  return match ? { kind: match[1], id: match[2] } : null
}

const plural = (n, word) => `${word}: ${number(n)}`
function summaryOf(item) {
  const linked = item.initiatives?.length ? plural(item.initiatives.length, 'инициативы') : 'без инициативы'
  if (item.kind === 'initiative') return [`риск: ${item.risk}`, plural(item.milestones.length, 'вехи'), plural(item.objectives.length, 'задачи-цели')].join(' · ')
  if (item.kind === 'milestone') return [item.due ? `срок ${item.due}` : 'без срока', `${number(item.done)}/${number(item.total)} готово`, linked].join(' · ')
  if (item.kind === 'objective') return [`цель ${item.target}`, `важность: ${item.severity}`, linked].join(' · ')
  return [plural(item.objectiveIds.length, 'задачи-цели'), item.objectivesPassed !== null ? `прошло: ${number(item.objectivesPassed)}` : null].filter(Boolean).join(' · ')
}

function rowMenu(item, ui) {
  if (ui.readOnly) return null
  const entry = (id, label, onSelect, danger) => ({ id, label, onSelect, danger })
  const items = [entry('open', 'Открыть детали', () => ui.open(item))]
  if (item.kind === 'initiative') {
    if (item.status === 'pending_approval') items.push(entry('review', 'Обзор…', () => ui.review(item)))
    if (item.status === 'changes_requested') items.push(entry('revise', 'Доработать и отправить заново…', () => ui.edit(item)))
    if (isLinkable(item)) items.push(entry('link-milestone', 'Разместить под вехой…', () => ui.link(item, 'milestone')), entry('link-objective', 'Разместить под задачей-целью…', () => ui.link(item, 'objective')))
    if (COMPLETABLE_STATUSES.includes(item.status)) items.push(entry('complete', 'Отметить завершённым…', () => ui.complete(item)))
    if (WITHDRAWABLE_STATUSES.includes(item.status)) items.push(entry('withdraw', 'Отозвать…', () => ui.withdraw(item), true))
  } else if (item.archived) {
    // An archived objective has no restore route; milestones and goals do.
    if (item.kind !== 'objective') items.push(entry('restore', 'Восстановить…', () => ui.restore(item)))
    items.push(entry('delete', 'Удалить навсегда…', () => ui.remove(item), true))
  } else {
    items.push(entry('edit', 'Изменить…', () => ui.edit(item)))
    items.push(item.kind === 'goal' ? entry('link-objective', 'Разместить под задачей-целью…', () => ui.link(item, 'objective')) : entry('link-initiative', 'Разместить под инициативой…', () => ui.link(item, 'initiative')))
    items.push(entry('archive', 'В архив…', () => ui.archive(item), true))
  }
  return jsx(Menu, { label: `Действия для «${item.title}»`, trigger: '⋯', action: `row-${item.kind}`, items })
}

function Row({ item, ui, selected }) {
  const status = statusOf(item)
  const quick = ui.readOnly || item.kind !== 'initiative' ? null
    : item.status === 'pending_approval' ? jsx(Button, { small: true, variant: 'primary', action: 'plan-row-review', onClick: () => ui.review(item), children: 'Обзор' })
      : item.status === 'changes_requested' ? jsx(Button, { small: true, action: 'plan-row-revise', onClick: () => ui.edit(item), children: 'Доработать' }) : null
  return jsxs('div', {
    className: ['dy-plan-row', selected && 'selected', item.archived && 'archived', isClosed(item) && 'closed'].filter(Boolean).join(' '),
    'data-plan-row': item.kind, 'data-plan-id': String(item.id), role: 'listitem',
    children: [
      jsxs('button', { type: 'button', className: 'dy-plan-row-open', 'aria-pressed': selected, onClick: () => ui.open(item), children: [
        jsx(KindGlyph, { kind: item.kind }),
        jsxs('span', { className: 'dy-plan-row-text', children: [jsx('strong', { children: item.title }), jsx('small', { children: summaryOf(item) })] }),
      ] }),
      jsx('span', { className: 'dy-plan-row-status', children: jsx(StatusTag, { tone: status.tone, label: status.label }) }),
      quick,
      rowMenu(item, ui),
    ],
  })
}

function SectionHead({ kind, count, ui, note }) {
  return jsxs('header', { className: 'dy-plan-section-head', children: [
    jsxs('h3', { children: [jsx(KindGlyph, { kind }), PLURAL[kind], jsx('span', { className: 'dy-plan-count', children: number(count) })] }),
    note ? jsx('span', { className: 'dy-plan-section-note', children: note }) : null,
    ui.readOnly ? null : jsx(Button, { small: true, action: `plan-new-${kind}`, onClick: () => ui.create(kind), children: kind === 'initiative' ? '+ Предложить' : '+ Создать' }),
  ] })
}

// The outline: four sections, one under the other.
function Outline({ lists, ui, selected, openNote }) {
  return jsx('div', { className: 'dy-plan-outline', children: KINDS.map((kind) => jsxs('section', { className: 'dy-plan-section', 'data-plan-section': kind, 'aria-label': PLURAL[kind], children: [
    jsx(SectionHead, { kind, count: lists[kind].length, ui, note: kind === 'initiative' ? openNote : null }),
    lists[kind].length
      ? jsx('div', { className: 'dy-plan-rows', role: 'list', children: lists[kind].map((item) => jsx(Row, { item, ui, selected: sameItem(item, selected) }, `${item.kind}:${item.id}`)) })
      : jsx('p', { className: 'dy-plan-empty', children: EMPTY[kind] }),
  ] }, kind)) })
}

// Reviews use the Inbox's approval panel (same checks, same decisions),
// handed the same initiative record the Inbox gives it.
function ReviewDialog({ initiative, projectId, onClose, onResolved }) {
  const item = { ref: initiative.ref, title: initiative.title, risk: initiative.risk, project: projectId, detail: initiative.record }
  return jsx(PlanDialog, {
    dialogKey: 'review', eyebrow: `Обзор · ${projectId}`, title: initiative.title, wide: true, onClose,
    actions: [jsx(Button, { onClick: onClose, children: 'Закрыть' }, 'close')],
    children: jsx(ApprovalDetail, { item, onResolved: () => { onResolved(); onClose() } }),
  })
}

export function PlanScreen({ project, focus, onFocusConsumed, onOpenRoadmap }) {
  const [plan, setPlan] = useState(null)
  const [failure, setFailure] = useState(null)
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [action, setAction] = useState(null)
  const [query, setQuery] = useState('')
  const [showTucked, setShowTucked] = useState(false)
  const actions = useMemo(() => planActions(project.id), [project.id])
  const reload = useCallback(async () => {
    try { setPlan(await loadPlan(project.id)); setFailure(null) } catch (error) { setFailure(errorText(error)) }
  }, [project.id])
  useEffect(() => { setPlan(null); setSelected(null); reload() }, [reload])
  useEffect(() => {
    if (!focus || !plan) return
    const item = findItem(plan, focus)
    if (item) { setSelected({ kind: item.kind, id: item.id }); if (isTucked(item)) setShowTucked(true) }
    onFocusConsumed?.()
  }, [focus, plan])
  // One Escape handler: it closes the drawer, never while a dialog,
  // confirmation or menu has the key (they handle their own Escape).
  useEffect(() => {
    if (!selected) return undefined
    const key = (event) => {
      if (event.key === 'Escape' && !document.querySelector('[data-plan-dialog], [data-destructive-confirm], .dy-plan-menu-list')) setSelected(null)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [selected])
  if (!plan) {
    return jsxs('section', { className: 'dockyard-feature-card', 'data-plan-screen': failure ? 'error' : 'loading', 'aria-busy': !failure, children: failure ? [
      jsx('h2', { children: 'Видение' }), jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Не удалось загрузить «Видение»: ${failure}` }),
      jsx(Button, { action: 'plan-retry', onClick: reload, children: 'Попробовать снова' }),
    ] : [jsx('p', { className: 'dockyard-meta', children: 'Загрузка «Видения»…' })] })
  }

  const noun = (item) => KIND_LABEL[item.kind].toLowerCase()
  const eyebrow = (item) => `Инициатива · ${item.ref}`
  const ui = {
    readOnly: !plan.canWrite,
    open: (item) => setSelected({ kind: item.kind, id: item.id }),
    create: (kind, linkTo) => setDialog({ type: 'form', kind, mode: 'create', linkTo }),
    edit: (item) => setDialog({ type: 'form', kind: item.kind, mode: 'edit', item }),
    link: (item, target) => setDialog({ type: 'link', from: item, target }),
    review: (item) => setDialog({ type: 'review', item }),
    confirm: setConfirm,
    // Before approval only (the backend refuses later states). The record stays.
    withdraw: (item) => setAction({
      key: 'withdraw', eyebrow: eyebrow(item), title: `Отозвать «${item.title}»?`, label: 'Отозвать', variant: 'danger',
      lines: [
        'Перестаёт ждать одобрения и освобождает свой открытый слот.',
        `Она не удаляется: запись сохраняется, а сама инициатива переходит в «${TUCKED}».`,
        'Это нельзя отменить. Чтобы попробовать позже, предложите заново.',
      ],
      reasonLabel: 'Причина', done: `Инициатива «${item.title}» отозвана.`,
      run: (reason) => actions.withdrawInitiative(item.ref, reason),
    }),
    // Approved or in progress only. Same call as the browser dashboard's Complete.
    complete: (item) => {
      const open = unfinishedWork(item.delivery)
      setAction({
        key: 'complete', eyebrow: eyebrow(item), title: `Отметить «${item.title}» завершённой?`, label: 'Отметить завершённым', variant: 'primary',
        lines: [
          'Используйте это, когда работа выполнена.',
          open ? `Ещё не завершено связанных рабочих элементов: ${number(open)}.` : null,
          'Его собственные незакрытые задачи доски помечаются выполненными.',
          `Освобождает свой открытый слот и переходит в «${TUCKED}». Её задачи-цели продолжают измерять, сработало ли это.`,
        ],
        done: `«${item.title}» отмечена завершённой.`,
        run: () => actions.completeInitiative(item.ref),
      })
    },
    archive: (item) => setConfirm({
      key: 'plan-archive', title: `В архив: ${noun(item)}?`, label: 'В архив', done: `${KIND_LABEL[item.kind]} в архиве.`,
      description: item.kind === 'objective' ? `«${item.title}» перестаёт оцениваться и покидает «Видение». После этого её можно удалить навсегда.`
        : `«${item.title}» скрывается из «Видения»${item.kind === 'milestone' ? ' и с дорожной карты' : ''}. Восстановить или удалить навсегда можно из «${TUCKED}».`,
      run: () => ({ milestone: () => actions.archiveMilestone(item.name), objective: () => actions.archiveObjective(item.id), goal: () => actions.archiveGoal(item.id) })[item.kind](),
    }),
    restore: (item) => setConfirm({
      key: 'plan-restore', title: `Восстановить: ${noun(item)}?`, label: 'Восстановить', done: `${KIND_LABEL[item.kind]} восстановлена.`,
      description: `«${item.title}» возвращается в «Видение».`,
      run: () => (item.kind === 'milestone' ? actions.restoreMilestone(item.name) : actions.restoreGoal(item.id)),
    }),
    // Archived items only (the backend refuses anything else).
    remove: (item) => setConfirm({
      key: 'plan-delete', title: `Удалить навсегда: ${noun(item)}?`, label: 'Удалить', done: `${KIND_LABEL[item.kind]} удалена.`,
      description: {
        objective: `«${item.title}» и её связи с целями и инициативами удаляются. Это нельзя отменить.`,
        milestone: `«${item.title}» и её связи с инициативами удаляются. Её рабочие элементы остаются, но больше не сгруппированы под ней, а имя можно использовать снова. Это нельзя отменить.`,
        goal: `«${item.title}» удаляется. Её задачи-цели остаются и могут войти в другую цель. Это нельзя отменить.`,
      }[item.kind],
      run: () => ({ objective: () => actions.removeObjective(item.id), milestone: () => actions.deleteMilestone(item.name), goal: () => actions.deleteGoal(item.id) })[item.kind](),
      after: () => setSelected(null),
    }),
  }
  const needle = query.trim().toLowerCase()
  const lists = Object.fromEntries(KINDS.map((kind) => [kind, listOf(plan, kind).filter((item) => (showTucked || !isTucked(item)) && item.title.toLowerCase().includes(needle))]))
  const openCount = plan.initiatives.filter((row) => OPEN_STATUSES.includes(row.status)).length
  const openNote = `Открыто ${number(openCount)} из ${number(plan.maxOpenInitiatives)}`
  const reviewCount = plan.initiatives.filter(needsReview).length
  const tuckedCount = KINDS.reduce((sum, kind) => sum + listOf(plan, kind).filter(isTucked).length, 0)
  const selectedItem = findItem(plan, selected)
  const done = () => { setDialog(null); reload() }

  return jsxs('section', { className: `dy-plan${selectedItem ? ' with-drawer' : ''}`, 'data-plan-screen': project.id, children: [
    jsxs('header', { className: 'dy-plan-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Видение' }),
        jsx('p', { className: 'dockyard-meta', children: `Инициативы, вехи, задачи-цели и цели проекта «${plan.label}». Дорожная карта показывает их по всем проектам.` }),
      ] }),
      jsxs('div', { className: 'dy-plan-toolbar', children: [
        reviewCount ? jsx(Tag, { tone: 'warning', data: { 'data-plan-review-count': reviewCount }, children: `На проверку: ${number(reviewCount)}` }) : null,
        jsx('input', { type: 'search', className: 'dy-plan-search', placeholder: 'Найти в «Видении»', 'aria-label': 'Найти в «Видении»', 'data-plan-search': true, value: query, onChange: (event) => setQuery(event.target.value) }),
        jsxs('label', { className: 'dy-plan-check', children: [
          jsx('input', { type: 'checkbox', 'data-plan-show-archived': true, checked: showTucked, onChange: (event) => setShowTucked(event.target.checked) }),
          `${TUCKED}${tuckedCount ? ` (${number(tuckedCount)})` : ''}`,
        ] }),
        ui.readOnly ? null : jsx(Menu, { label: 'Создать', trigger: '+ Создать', action: 'new', variant: 'primary', items: KINDS.map((kind) => ({
          id: kind, label: kind === 'initiative' ? 'Предложить инициативу…' : `Новая ${KIND_LABEL[kind].toLowerCase()}…`, onSelect: () => ui.create(kind),
        })) }),
        jsx(Menu, { label: 'Другие действия «Видения»', trigger: '⋯', action: 'plan-more', items: [
          onOpenRoadmap ? { id: 'roadmap', label: 'Открыть дорожную карту (все проекты)', onSelect: onOpenRoadmap } : null,
          ui.readOnly ? null : { id: 'freeze', label: 'Заморозить проект…', danger: true, onSelect: () => setConfirm({
            key: 'freeze-project', title: 'Заморозить этот проект?', description: 'Заморозка останавливает новое исполнение, пока проект явно не разморозят.',
            label: 'Заморозить проект', done: 'Проект заморожен. Новое исполнение остановлено до разморозки.', run: actions.freeze,
          }) },
        ] }),
      ] }),
    ] }),
    ui.readOnly ? jsx('p', { className: 'dy-plan-note', role: 'status', children: 'Только чтение: эта сессия может смотреть «Видение», но не менять его.' }) : null,
    failure ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `Не удалось обновить: ${failure}` }) : null,
    jsx(MissionStrip, { plan, actions, onChanged: reload, onConfirm: setConfirm }, `${project.id}:${plan.mission}`),
    jsxs('div', { className: 'dy-plan-main', children: [
      jsx(Outline, { lists, ui, selected, openNote }),
      // Narrow screens show the drawer as a bottom sheet; the backdrop closes it.
      selectedItem ? jsx('div', { className: 'dy-plan-sheet-backdrop', 'aria-hidden': true, onClick: () => setSelected(null) }) : null,
      selectedItem ? jsx(PlanDrawer, { item: selectedItem, plan, actions, ui, onClose: () => setSelected(null), onChanged: reload }, `${selectedItem.kind}:${selectedItem.id}`) : null,
    ] }),
    dialog?.type === 'form' ? jsx(ItemForm, { kind: dialog.kind, mode: dialog.mode, item: dialog.item, linkTo: dialog.linkTo, plan, actions, onClose: () => setDialog(null), onDone: done }) : null,
    dialog?.type === 'link' ? jsx(LinkDialog, {
      from: dialog.from, target: dialog.target, plan, actions, onClose: () => setDialog(null), onDone: done,
      // From an initiative, a milestone or objective can be created and linked in one go.
      onCreateNew: dialog.from.kind === 'initiative'
        ? () => setDialog({ type: 'form', kind: dialog.target, mode: 'create', linkTo: { ref: dialog.from.ref, title: dialog.from.title, relationship: dialog.target === 'milestone' ? 'delivers' : 'supports' } })
        : null,
    }) : null,
    dialog?.type === 'review' ? jsx(ReviewDialog, { initiative: dialog.item, projectId: project.id, onClose: () => setDialog(null), onResolved: reload }) : null,
    confirm ? jsx(Confirm, { spec: confirm, onCancel: () => setConfirm(null), onDone: () => { setConfirm(null); reload() } }) : null,
    action ? jsx(ActionDialog, { spec: action, onCancel: () => setAction(null), onDone: () => { setAction(null); reload() } }) : null,
  ] })
}
