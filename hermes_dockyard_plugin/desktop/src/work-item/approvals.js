// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useEffect, useState } from '../runtime/react.js'
import { api, emitToast } from '../runtime/context.js'
import { jsx, jsxs } from '../runtime/react.js'
import { Button, StatusTag, formatWhen, riskDetails, useDialogFocusManager } from '../lib/ui.js'
import { mergeActivity } from '../inbox/model.js'

const decisionText = (value) => {
  if (value == null || value === '') return 'Не задано'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const Section = ({ title, children, className = '' }) => jsxs('section', {
  className: `dockyard-inbox-section ${className}`.trim(),
  children: [jsx('h3', { children: title }), children],
})

function RejectDialog({ item, busy, reason, onReason, onCancel, onConfirm }) {
  useDialogFocusManager('[data-destructive-confirm]')
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy, onCancel])
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-destructive-confirm': `reject-${item.ref}`,
    onClick: (event) => { if (event.target === event.currentTarget && !busy) onCancel() },
    children: jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-label': `Reject ${item.title}`, children: [
      jsx('h2', { children: 'Отклонить эту инициативу?' }),
      jsx('p', { children: `${item.title} will leave the approval queue. Record the reason in this one confirmation step.` }),
      jsxs('label', { children: ['Причина отклонения ', jsx('input', {
        value: reason,
        onChange: (event) => onReason(event.target.value),
        placeholder: 'Почему эту инициативу не стоит продолжать',
        autoFocus: true,
      })] }),
      jsxs('div', { className: 'dockyard-modal-actions', children: [
        jsx(Button, { disabled: busy, onClick: onCancel, children: 'Отмена' }),
        jsx(Button, {
          action: 'confirm-destructive-action',
          variant: 'danger',
          disabled: busy || !reason.trim(),
          onClick: onConfirm,
          children: busy ? 'Отклонение...' : 'Отклонить инициативу',
        }),
      ]}),
    ]}),
  })
}

export function ApprovalDetail({ item, onResolved, onBack }) {
  const [decision, setDecision] = useState(null)
  const [decisionError, setDecisionError] = useState(null)
  const [comments, setComments] = useState([])
  const [receipts, setReceipts] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [changesOpen, setChangesOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let current = true
    setDecision(null)
    setDecisionError(null)
    setComments([])
    setReceipts([])
    setState('idle')
    setError(null)
    setRejectOpen(false)
    setChangesOpen(false)
    Promise.all([
      api(`/initiatives/${encodeURIComponent(item.ref)}/decision`),
      api(`/initiatives/${encodeURIComponent(item.ref)}/comments`).catch(() => ({ comments: [] })),
      api(`/initiatives/${encodeURIComponent(item.ref)}/decision/receipts`).catch(() => ({ receipts: [] })),
    ]).then(([scope, thread, ledger]) => {
      if (!current) return
      setDecision(scope)
      setComments(thread.comments ?? [])
      setReceipts(ledger.receipts ?? [])
    }).catch(() => {
      if (current) setDecisionError('Доказательства недоступны; обновите перед решением.')
    })
    return () => { current = false }
  }, [item.ref])

  const confirmReceipt = async (expected) => {
    const ledger = await api(`/initiatives/${encodeURIComponent(item.ref)}/decision/receipts`)
    const rows = ledger?.receipts ?? []
    const latest = rows[rows.length - 1]
    if (latest?.decision !== expected) {
      throw new Error(`Decision receipt did not confirm ${expected}. Refresh before trying again.`)
    }
    setReceipts(rows)
  }

  const finish = (message) => {
    emitToast('success', message)
    onResolved(item.ref)
  }

  const decide = async (action) => {
    if (!decision) return
    setState(action === 'approve' ? 'approving' : 'rejecting')
    setError(null)
    const expected = action === 'approve' ? 'approved' : 'rejected'
    try {
      const body = action === 'reject'
        ? { expected_fingerprint: decision.fingerprint, reason: rejectReason.trim() }
        : { expected_fingerprint: decision.fingerprint }
      await api(`/initiatives/${encodeURIComponent(item.ref)}/${action}`, {
        method: 'POST', body, suppressErrorToast: true,
      })
      await confirmReceipt(expected)
      finish(action === 'approve' ? 'Одобрено; подтверждено квитанцией решения' : 'Отклонено; подтверждено квитанцией решения')
    } catch (failure) {
      setState('failed')
      setRejectOpen(false)
      const message = `${action === 'approve' ? 'Approve' : 'Reject'} could not be confirmed. ${String(failure?.message ?? failure)}`
      setError(message)
      emitToast('danger', message)
    }
  }

  const requestChanges = async () => {
    if (!decision || !feedback.trim()) return
    setState('returning')
    setError(null)
    try {
      await api(`/initiatives/${encodeURIComponent(item.ref)}/request-changes`, {
        method: 'POST',
        body: { expected_fingerprint: decision.fingerprint, feedback: feedback.trim() },
        suppressErrorToast: true,
      })
      await confirmReceipt('changes_requested')
      finish('Возвращено автору предложения с вашим отзывом')
    } catch (failure) {
      setState('failed')
      const message = `Request changes could not be confirmed. ${String(failure?.message ?? failure)}`
      setError(message)
      emitToast('danger', message)
    }
  }

  const addComment = async () => {
    const body = commentBody.trim()
    if (!body) return
    try {
      const created = await api(`/initiatives/${encodeURIComponent(item.ref)}/comments`, {
        method: 'POST', body: { body }, suppressErrorToast: true,
      })
      setComments((rows) => [...rows, created])
      setCommentBody('')
    } catch (failure) {
      emitToast('danger', `Comment was not recorded. ${String(failure?.message ?? failure)}`)
    }
  }

  const scope = decision ?? {
    title: item.title,
    risk: item.risk,
    reason: item.detail?.rationale,
    expected_outcome: item.detail?.expected_outcome,
    validation: { contract: item.detail?.validation_contract },
    authority: null,
    proposer: null,
  }
  const [riskTone, riskLabel] = riskDetails(scope.risk)
  const contract = scope.validation?.contract ?? {}
  const steps = Array.isArray(contract.steps) ? contract.steps : []
  const affected = item.detail?.affected_work_items ?? item.detail?.work_items ?? []
  const activity = mergeActivity({ comments, receipts, events: item.detail?.events ?? [] })
  const busy = ['approving', 'rejecting', 'returning'].includes(state)

  return jsxs('article', {
    className: 'dockyard-inbox-panel dockyard-approval-row',
    'data-inbox-panel': 'true',
    'data-approval-card': true,
    'data-approval-ref': item.ref,
    'data-state': state,
    children: [
      jsxs('header', { className: 'dockyard-inbox-panel-head', children: [
        jsxs('div', { children: [
          onBack ? jsx(Button, { variant: 'quiet', small: true, onClick: onBack, children: 'Назад' }) : null,
          jsx('h2', { children: scope.title }),
          jsx('small', { children: `${item.project || scope.project_id || 'Unknown project'} · ${item.ref}` }),
        ]}),
        jsx(StatusTag, { tone: riskTone, label: riskLabel }),
      ]}),
      decisionError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: decisionError }) : null,
      jsx(Section, { title: 'Запрошено изменение', children: jsx('p', { children: decisionText(scope.reason) }) }),
      jsx(Section, { title: 'Политический гейт', children: jsx('p', { className: 'dim', children: decision ? `Decision revision ${decision.revision}; the displayed fingerprint is required before mutation.` : 'Loading the decision gate…' }) }),
      jsx(Section, { title: 'Потенциальное влияние', children: jsx('p', { children: decisionText(scope.expected_outcome) }) }),
      jsx(Section, { title: 'Граница возможностей', children: jsx('p', { children: scope.authority?.granted ? jsxs('span', { children: [jsx('code', { children: scope.authority.granted }), ` for ${decisionText(scope.authority.scope)}`] }) : 'Разрешения возможностей не предоставлены.' }) }),
      jsx(Section, { title: 'Кто запросил', children: jsx('p', { children: decisionText(scope.proposer) }) }),
      jsx(Section, { title: 'Доказательства', children: jsxs('ul', { className: 'dockyard-inbox-evidence-list', children: [
        ...steps.map((step, index) => jsx('li', { 'data-evidence-cell': true, children: `Step ${index + 1}: ${decisionText(step)}` }, `${item.ref}-step-${index}`)),
        contract.tests ? jsx('li', { 'data-evidence-cell': true, children: `Tests: ${decisionText(contract.tests)}` }) : null,
        steps.length === 0 && !contract.tests ? jsx('li', { 'data-evidence-cell': true, children: 'Доказательства проверки не предоставлены.' }) : null,
      ] }) }),
      jsx(Section, { title: 'Затронутые рабочие элементы', children: jsx('ul', { className: 'dockyard-inbox-workitems', children: affected.length
        ? affected.map((work) => jsx('li', { children: decisionText(work) }, decisionText(work)))
        : jsx('li', { children: 'Связанные рабочие элементы не предоставлены.' }) }) }),
      jsx(Section, { title: 'Активность', children: jsx('div', { className: 'dockyard-comment-thread', children: activity.length
        ? activity.map((entry, index) => jsx('p', { children: `${entry.actor || entry.kind} · ${formatWhen(entry.at)} · ${entry.body || entry.summary || entry.decision || entry.kind}` }, `${entry.kind}-${entry.at}-${index}`))
        : jsx('p', { children: 'Активность пока не записана.' }) }) }),
      jsx(Section, { title: "Комментарии не меняют решение", children: jsxs('div', { className: 'dockyard-approval-comments', 'data-approval-comments': true, children: [
        jsx('p', { className: 'dim', children: 'Comments add audit context only. They do not approve, reject, or alter the decision fingerprint.' }),
        jsxs('div', { className: 'dockyard-comment-form', children: [
          jsx('input', { value: commentBody, onChange: (event) => setCommentBody(event.target.value), placeholder: 'Добавить контекст, не принимая решение', 'aria-label': 'Комментарий' }),
          jsx(Button, { small: true, variant: 'quiet', onClick: addComment, disabled: !commentBody.trim(), children: 'Комментарий' }),
        ]}),
      ] }) }),
      changesOpen ? jsxs('section', { className: 'dockyard-request-changes', 'data-request-changes-form': 'true', children: [
        // Sahil 05/10: the box sits under its label and is big enough to write real feedback in.
        jsxs('label', { className: 'dockyard-request-changes-field', children: [
          jsx('span', { children: 'Отзыв автору' }),
          jsx('textarea', { value: feedback, rows: 6, onChange: (event) => setFeedback(event.target.value), placeholder: 'Что должно измениться до одобрения' }),
        ] }),
        jsxs('div', { className: 'dockyard-request-changes-actions', children: [
          jsx(Button, { variant: 'primary', action: 'confirm-request-changes', disabled: busy || !feedback.trim(), onClick: requestChanges, children: busy ? 'Returning…' : 'Вернуть автору' }),
          jsx(Button, { variant: 'quiet', disabled: busy, onClick: () => setChangesOpen(false), children: 'Отмена' }),
        ]}),
      ]}) : null,
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
      jsxs('footer', { className: 'dockyard-inbox-actions', children: [
        jsx(Button, { action: 'approve', variant: 'primary', disabled: busy || !decision, onClick: () => decide('approve'), children: state === 'approving' ? 'Одобрение...' : 'Одобрить' }),
        jsx(Button, { action: 'reject', variant: 'danger', disabled: busy || !decision, onClick: () => setRejectOpen(true), children: 'Отклонить' }),
        jsx(Button, { action: 'request-changes', variant: 'quiet', disabled: busy || !decision, onClick: () => setChangesOpen((open) => !open), children: 'Запросить правки' }),
        jsx('span', { className: 'spacer' }),
        jsx('span', { className: 'dockyard-inbox-status', children: decision ? 'Требуется квитанция' : 'Loading evidence…' }),
      ]}),
      rejectOpen ? jsx(RejectDialog, {
        item,
        busy: state === 'rejecting',
        reason: rejectReason,
        onReason: setRejectReason,
        onCancel: () => setRejectOpen(false),
        onConfirm: () => decide('reject'),
      }) : null,
    ],
  })
}

// Kept as a compatibility export for external imports. The Inbox now owns row
// selection and renders ApprovalDetail only for the selected decision.
export const ApprovalRow = ApprovalDetail
