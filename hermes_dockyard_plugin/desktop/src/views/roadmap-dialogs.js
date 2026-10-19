// Batch L Roadmap dialogs, split out of roadmap.js to keep each module under
// the ~800-line rule. PlaceDialog sets one parent on a child (or null to
// unplace); ConfirmDeliveredDialog is the human delivery confirmation.
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { loadRoadmapData } from '../data/loaders.js'
import { ROADMAP_WORDS } from '../lib/panel-words.js'

// v42 placement: one parent per level. The Roadmap only shows and places; each
// item's own screen still owns create/edit. The human picks the parent from the
// project's own candidates, so a stale or cross-project list is never offered
// and nothing is chosen for them.
export const PLACE_KIND = {
  milestone: {
    title: 'Разместить веху под инициативой',
    itemLabel: 'Веха',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/milestones/${itemId}/initiative`,
    candidates: (project) => (project.initiatives ?? [])
      .filter((row) => row.governance !== 'rejected' && row.governance !== 'cancelled')
      .map((row) => ({ id: row.ref, label: row.title })),
  },
  objective: {
    title: 'Разместить задачу-цель под вехой',
    itemLabel: 'Задача-цель',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/objectives/${itemId}/milestone`,
    candidates: (project) => (project.milestones ?? []).map((row) => ({ id: String(row.id), label: row.name })),
  },
  goal: {
    title: 'Разместить цель под задачей-целью',
    itemLabel: 'Цель',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/goals/${encodeURIComponent(itemId)}/objective`,
    candidates: (project) => (project.objectives ?? []).map((row) => ({ id: String(row.id), label: row.name })),
  },
  task: {
    title: 'Разместить задачу под целью',
    itemLabel: 'Задача',
    path: (projectId, itemId) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(itemId)}/goal`,
    candidates: (project) => (project.goals ?? []).map((row) => ({ id: row.id, label: row.title })),
  },
}

export function PlaceDialog({ kind, itemId, projectId, projectLabel, onClose, onDone }) {
  const spec = PLACE_KIND[kind]
  const [candidates, setCandidates] = useState(null)
  const [parent, setParent] = useState('')
  const [step, setStep] = useState('choose')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  useDialogFocusManager(`[data-rm-place-dialog][data-rm-step="${step}"] .dy-rm-modal`)
  useEffect(() => {
    let current = true
    loadRoadmapData(projectId)
      .then((result) => {
        if (!current) return
        const project = result.projects?.[0]
        setCandidates(project ? spec.candidates(project) : [])
      })
      .catch((failure) => { if (current) setError(String(failure?.message ?? failure)) })
    return () => { current = false }
  }, [])
  const parentLabel = candidates?.find((row) => row.id === parent)?.label ?? ''
  const ready = Boolean(candidates && parent)
  // A null parent is a real instruction: it unplaces the item ("Not placed yet").
  const submit = async (nextParent) => {
    setBusy(true); setError(null)
    try {
      await api(spec.path(projectId, itemId), { method: 'PUT', body: { parent_id: nextParent } })
      emitToast('success', nextParent === null
        ? `Родитель у «${itemId}» снят. Элемент снова не размещён.`
        : `«${itemId}» размещён под «${parentLabel}».`)
      onDone()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setBusy(false)
    }
  }
  const field = (id, label, value, onChange, options) => jsxs('label', { htmlFor: id, children: [
    label,
    jsx('select', { id, value, onChange: (event) => onChange(event.target.value), children: options }),
  ] })
  const choose = jsxs('div', { className: 'dy-rm-modal-body', children: [
    candidates === null && !error ? jsx('p', { role: 'status', children: 'Загрузка вариантов…' }) : null,
    candidates && candidates.length === 0
      ? jsx('p', { children: `Разместить не под чем: у этого проекта пока нет подходящих элементов. Сначала создайте его на экране проекта.` })
      : null,
    candidates && candidates.length > 0
      ? field('dy-rm-place-choice', spec.itemLabel === 'Веха' ? 'Инициатива'
          : spec.itemLabel === 'Задача-цель' ? 'Веха'
          : spec.itemLabel === 'Цель' ? 'Задача-цель' : 'Цель',
          parent, setParent, [
            jsx('option', { value: '', children: 'Выберите…' }, ''),
            ...candidates.map((row) => jsx('option', { value: row.id, children: row.label }, row.id)),
          ])
      : null,
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  const confirm = jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-place-confirm': true, children: [
    jsx('p', { className: 'dy-rm-confirm', children: `Разместить «${itemId}» под «${parentLabel}»?` }),
    jsx('p', { className: 'dy-rm-confirm', children: 'Это запишет одно размещение и запись аудита под вашим именем.' }),
    jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
  ]})
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-place-dialog': true, 'data-rm-step': step,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': spec.title, children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [
          jsx('p', { className: 'dockyard-meta', children: 'Разместить' }),
          jsx('h3', { children: spec.title }),
          jsx('p', { children: `Проект ${projectLabel}` }),
        ] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Закрыть диалог размещения', children: '×' }),
      ] }),
      step === 'choose' ? choose : confirm,
      step === 'choose'
        ? jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { onClick: onClose, children: 'Отмена' }),
            jsx(Button, { variant: 'primary', disabled: !ready, onClick: () => { setError(null); setStep('confirm') }, children: 'Продолжить' }),
          ] })
        : jsxs('div', { className: 'dy-rm-modal-actions', children: [
            jsx(Button, { disabled: busy, onClick: () => { setError(null); setStep('choose') }, children: 'Назад' }),
            jsx(Button, { variant: 'primary', disabled: busy, onClick: () => submit(parent), children: busy ? 'Размещение…' : 'Разместить' }),
          ] }),
    ] }),
  })
}

export function ConfirmDeliveredDialog({ projectId, ref, title, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useDialogFocusManager('[data-rm-confirm-dialog] .dy-rm-modal')
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api(
        `/projects/${encodeURIComponent(projectId)}/initiatives/${encodeURIComponent(ref)}/confirm-delivered`,
        { method: 'POST', body: {} })
      emitToast('success', `«${title}»: поставка подтверждена.`)
      onDone()
    } catch (failure) {
      // A 409 (a milestone is not reached) shows its message in plain words.
      setError(String(failure?.message ?? failure))
      setBusy(false)
    }
  }
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-confirm-dialog': true,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': ROADMAP_WORDS.confirmDelivered, children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [
          jsx('p', { className: 'dockyard-meta', children: 'Подтвердить' }),
          jsx('h3', { children: ROADMAP_WORDS.confirmDelivered }),
          jsx('p', { children: `Проект ${projectId}` }),
        ] }),
        jsx(Button, { onClick: onClose, ariaLabel: ROADMAP_WORDS.closeConfirmDialog, children: '×' }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-confirm-body': true, children: [
        jsx('p', { className: 'dy-rm-confirm', children: `Подтвердить поставку «${title}»? Все вехи достигнуты.` }),
        jsx('p', { className: 'dy-rm-confirm', children: 'Это фиксирует поставку под вашим именем и запись аудита.' }),
        jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-actions', children: [
        jsx(Button, { disabled: busy, onClick: onClose, children: 'Отмена' }),
        jsx(Button, { variant: 'primary', disabled: busy, onClick: submit, children: busy ? 'Подтверждение…' : ROADMAP_WORDS.confirmDelivered }),
      ] }),
    ] }),
  })
}

// v43 waiver: a person takes an item out of the requirement without deleting
// it or faking a completion. The reason is required and is shown on the item.
export function WaiveDialog({ kind, itemId, itemLabel, projectId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useDialogFocusManager('[data-rm-waive-dialog] .dy-rm-modal')
  const ready = reason.trim().length >= 4
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api(
        `/projects/${encodeURIComponent(projectId)}/waivers/${encodeURIComponent(kind)}/${encodeURIComponent(itemId)}`,
        { method: 'PUT', body: { reason: reason.trim() } })
      emitToast('success', `«${itemLabel}»: больше не требуется.`)
      onDone()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setBusy(false)
    }
  }
  return jsx('div', {
    className: 'dy-rm-modal-backdrop', 'data-rm-waive-dialog': true,
    onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } },
    children: jsxs('section', { className: 'dy-rm-modal', role: 'dialog', 'aria-modal': true, 'aria-label': 'Отметить как больше не требуемое', children: [
      jsxs('header', { className: 'dy-rm-modal-head', children: [
        jsxs('div', { children: [
          jsx('p', { className: 'dockyard-meta', children: 'Больше не требуется' }),
          jsx('h3', { children: 'Отметить как больше не требуемое' }),
          jsx('p', { children: `Проект ${projectId}` }),
        ] }),
        jsx(Button, { onClick: onClose, ariaLabel: 'Закрыть диалог отказа', children: '×' }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-body', 'data-rm-waive-body': true, children: [
        jsx('p', { className: 'dy-rm-confirm', children: `«${itemLabel}» перестаёт блокировать работу выше и считается закрытым. История сохраняется.` }),
        jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [
          jsx('span', { children: 'Почему это больше не требуется?' }),
          jsx('textarea', {
            rows: 3, 'data-rm-waive-reason': true, value: reason,
            onInput: (event) => setReason(event.target.value),
            onChange: (event) => setReason(event.target.value),
            placeholder: 'напр. поставлено по старому плану; для этой инициативы не требуется',
          }),
        ] }),
        jsx('p', { className: 'dy-rm-modal-error', role: 'alert', children: error }),
      ] }),
      jsxs('div', { className: 'dy-rm-modal-actions', children: [
        jsx(Button, { disabled: busy, onClick: onClose, children: 'Отмена' }),
        jsx(Button, { variant: 'primary', disabled: busy || !ready, onClick: submit, children: busy ? 'Отмечаем…' : 'Отметить как больше не требуемое' }),
      ] }),
    ] }),
  })
}
