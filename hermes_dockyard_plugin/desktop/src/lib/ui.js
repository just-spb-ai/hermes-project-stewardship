// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { LUCIDE_ICON_NODES } from '../../lucide-icons.js'
import { ProjectSwitcher } from './project-switcher.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { readableLabel } from '../data/loaders.js'
import { UNLINKED_TITLE } from '../data/unlinked.js'
import { UNLINKED_DETAIL } from '../data/unlinked.js'
import { unlinkedNextStep } from '../data/unlinked.js'
import { isPluginOffError } from '../data/plugin-off.js'
import { PLUGIN_OFF_TITLE } from '../data/plugin-off.js'
import { PLUGIN_OFF_DETAIL } from '../data/plugin-off.js'
import { PLUGIN_OFF_NEXT_STEP } from '../data/plugin-off.js'
import { PLUGIN_OFF_COMMAND } from '../data/plugin-off.js'
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { useRef } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
export const ICON_NAME = Object.freeze({
  dock: 'layout-dashboard', project: 'folder-kanban', check: 'circle-check',
  alert: 'triangle-alert', refresh: 'rotate-cw', activity: 'activity',
  eye: 'eye', chevron: 'chevron-right', 'chevron-down': 'chevron-down',
  search: 'search', pencil: 'pencil', bell: 'bell',
  'type-epic': 'list-checks', 'type-feature': 'folders', 'type-initiative': 'flag',
  'type-task': 'square-check-big', 'type-subtask': 'list-checks',
  'type-bug': 'bug', 'type-spike': 'zap',
})
// LANE-TOOLBAR: backlog group-by labels shared by the toolbar and count summary.
export const GROUP_LABELS = Object.freeze({ none: 'Нет', status: 'Статус', assignee: 'Владелец', type: 'Тип', initiative: 'Инициатива', month: 'Месяц срока' })
export function Icon({ name }) {
  const iconName = ICON_NAME[name] ?? name
  const nodes = LUCIDE_ICON_NODES[iconName] ?? LUCIDE_ICON_NODES.bell
  return jsxs('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
    // Copy: React 19 reuses the config object as props and tags it with a key getter,
    // which would mutate the shared icon table and warn on the next render.
    children: nodes.map(([tag, attributes], index) => jsx(tag, { ...attributes }, `${iconName}-${index}`)),
  })
}

export function number(value) {
  return new Intl.NumberFormat('en-GB').format(Number(value ?? 0))
}

export function plural(value, singular, multiple = `${singular}s`) {
  return Number(value) === 1 ? singular : multiple
}

export function healthDetails(value) {
  const map = {
    healthy: ['success', 'Здоров'],
    watch: ['warning', 'Наблюдение'],
    frozen: ['danger', 'Заморожен'],
    attention: ['danger', 'Требует внимания'],
    degraded: ['warning', 'Деградация'],
    critical: ['danger', 'Критично'],
    unknown: ['neutral', 'Не проверено'],
  }
  return map[value] ?? ['neutral', 'Не проверено']
}

export function riskDetails(value) {
  const risk = String(value || 'medium').toLowerCase()
  if (risk === 'low') return ['success', 'Низкий риск']
  if (risk === 'high' || risk === 'critical') return ['danger', `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk`]
  return ['warning', 'Средний риск']
}

export function severityTone(value) {
  const severity = String(value || 'info').toLowerCase()
  if (severity === 'high' || severity === 'critical' || severity === 'error') return 'danger'
  if (severity === 'medium' || severity === 'warning') return 'warning'
  return 'info'
}

export function formatWhen(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export function formatBytes(value) {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes < 0) return 'Неизвестный размер'
  if (bytes < 1024) return `${number(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mediaTypeLabel(value) {
  return {
    'text/plain': 'Text',
    'text/markdown': 'Markdown',
    'application/pdf': 'PDF',
    'image/png': 'Изображение PNG',
    'image/jpeg': 'Изображение JPEG',
    'image/webp': 'Изображение WebP',
    'video/mp4': 'Видео MP4',
    'video/webm': 'Видео WebM',
  }[value] || readableLabel(value, 'Файл')
}

export function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Выбранный файл не удалось прочитать.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      if (comma < 0) {
        reject(new Error('Выбранный файл не удалось закодировать.'))
        return
      }
      resolve(result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

export function StatusTag({ tone = 'neutral', label }) {
  return jsxs('span', { className: `dockyard-status-tag ${tone}`, children: [
    jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
    label,
  ]})
}

export function Button({ children, onClick, variant = '', small = false, disabled = false, action, ariaLabel, data = {} }) {
  return jsx('button', {
    type: 'button',
    className: `dockyard-button${variant ? ` ${variant}` : ''}${small ? ' small' : ''}`,
    disabled,
    onClick,
    'data-action': action,
    'aria-label': ariaLabel,
    ...data,
    children,
  })
}

// PM-0604/Phase6 UX hardening (Lane-B-03): one focus manager for MODAL
// dialog surfaces (ConfirmDialog, OnboardingWizard). Behaviour, driven only
// by real DOM events:
//   1. initial focus moves to the first enabled focusable element inside
//      the dialog on mount (the least-destructive control for confirms);
//   2. Tab / Shift+Tab are trapped — they cycle within the dialog and
//      never escape it while it is mounted;
//   3. on unmount, focus returns to the control that was active at mount
//      (the trigger a real browser focused on click/keyboard activation).
// Inline fields such as DiscoveredProfilePicker are deliberately NOT wired:
// they are not dialogs, and trapping Tab inside an inline field would make
// it impossible to keyboard-navigate past it. Inside the wizard they are
// covered by the wizard's dialog-level manager.
export function useDialogFocusManager(containerSelector) {
  useEffect(() => {
    if (!containerSelector) return undefined
    const container = () => document.querySelector(containerSelector)
    const focusables = (root) => Array.from(
      root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.closest('[hidden]'))
    const restoreTo = document.activeElement
    // Initial focus: first enabled focusable inside the container.
    const initial = focusables(container())
    initial[0]?.focus()
    // Tab containment: cycle focus inside the container on real keydowns.
    const onKeydown = (event) => {
      if (event.key !== 'Tab') return
      const root = container()
      if (!root) return
      const items = focusables(root)
      if (items.length === 0) return
      const current = document.activeElement
      const index = items.indexOf(current)
      event.preventDefault()
      let next
      if (event.shiftKey) {
        next = items[(index <= 0 ? items.length : index) - 1]
      } else {
        next = items[(index + 1) % items.length]
        if (index === -1) next = items[0]
      }
      next?.focus()
    }
    window.addEventListener('keydown', onKeydown, true)
    return () => {
      window.removeEventListener('keydown', onKeydown, true)
      // Return focus to the trigger that opened the dialog.
      if (restoreTo && typeof restoreTo.focus === 'function') {
        restoreTo.focus()
      }
    }
  }, [containerSelector])
}

export function ConfirmDialog({ confirmKey, title, description, confirmLabel, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])
  useDialogFocusManager('[data-destructive-confirm]')
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-destructive-confirm': confirmKey,
    onClick: (event) => { if (event.target === event.currentTarget && !busy) onCancel() },
    children: jsxs('div', {
      className: 'dockyard-modal',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': `dockyard-confirm-${confirmKey}`,
      children: [
        jsx('h2', { id: `dockyard-confirm-${confirmKey}`, children: title }),
        jsx('p', { children: description }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'cancel-destructive-action', disabled: busy, onClick: onCancel, children: 'Отмена' }),
          jsx(Button, { action: 'confirm-destructive-action', variant: 'danger', disabled: busy, onClick: onConfirm, children: busy ? 'Применение…' : confirmLabel }),
        ]}),
      ],
    }),
  })
}

export function ToastRegion({ toasts, onDismiss }) {
  return jsx('div', {
    className: 'dockyard-toast-region',
    'data-toast-region': true,
    'aria-label': 'Сообщения о статусе',
    children: toasts.map((toast) => jsxs('div', {
      className: `dockyard-toast ${toast.tone}`,
      role: toast.tone === 'danger' ? 'alert' : 'status',
      children: [
        jsx('span', { className: 'dockyard-toast-icon', 'aria-hidden': true, children: jsx(Icon, { name: toast.tone === 'danger' ? 'alert' : 'check' }) }),
        jsx('span', { children: toast.message }),
        jsx('button', { type: 'button', 'aria-label': 'Скрыть сообщение', onClick: () => onDismiss(toast.id), children: '×' }),
      ],
    }, toast.id)),
  })
}

// intent: which button opened the wizard, 'new' (New project) or 'existing'
// (Onboard existing project, Sahil 05/10). It only changes the heading label;
// the steps, discovery and the host's create-or-connect check are the same.
export function OnboardingWizard({ onClose, onComplete, intent = 'new' }) {
  useDialogFocusManager('[data-onboarding-wizard]')
  const [step, setStep] = useState(1)
  const [projectId, setProjectId] = useState('')
  const [repoPath, setRepoPath] = useState('')
  const [mission, setMission] = useState('')
  const [leadProfile, setLeadProfile] = useState('')
  const [memberProfiles, setMemberProfiles] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // P7.1: host-driven discovery replaces hard-coded lead choices and lists
  // existing projects (connect-existing before create-new). R4: discovery
  // failure fails CLOSED — no manual profile entry, no invented choices.
  const [discovered, setDiscovered] = useState(null)
  const [discoverFailed, setDiscoverFailed] = useState(false)
  const [discoveryRefresh, setDiscoveryRefresh] = useState(0)
  const [preflightState, setPreflightState] = useState(null)
  const [preflightBusy, setPreflightBusy] = useState(false)
  // R4: preflight validity bound to the exact current field set.
  const [preflightFields, setPreflightFields] = useState(null)
  const [preflightContract, setPreflightContract] = useState(null)
  const currentFields = () => JSON.stringify({
    project_id: projectId.trim(),
    repo_path: repoPath.trim(),
    mission: mission.trim(),
    lead_profile: leadProfile.trim(),
    member_profiles: memberProfiles,
  })
  const preflightCurrent = preflightFields === currentFields()

  useEffect(() => {
    let current = true
    setDiscoverFailed(false)
    api('/onboard/discover').then((result) => {
      if (!current) return
      setDiscovered(result)
      setDiscoverFailed(false)
      // Refresh must not overwrite values already entered in the wizard.
    }).catch(() => {
      if (current) {
        setDiscovered(null)
        // Keep wizard input intact while explaining how to recover externally.
        setDiscoverFailed(true)
      }
    })
    return () => { current = false }
  }, [discoveryRefresh])

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const valid = step === 1
    ? /^[a-z0-9][a-z0-9-]*$/.test(projectId.trim()) && repoPath.trim().startsWith('/')
    : step === 2
      ? mission.trim().length >= 12
      : step === 3
        ? leadProfile.trim().length > 0
        : true
  // P7.2: preflight runs the host's own validator BEFORE commitment.
  // P7.4: the response's preview + suggestions are carried into the review.
  const runPreflight = async () => {
    setPreflightBusy(true)
    setPreflightState(null)
    try {
      const result = await api('/onboard/preflight', {
        method: 'POST',
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles,
        },
      })
      setPreflightState({
        ok: true,
        mode: result.mode,
        text: result.mode === 'connect_existing'
          ? 'Хост уже владеет этим проектом — он будет подключён, а не создан заново.'
          : 'Хост проверил данные; пока ничего не существует — создание с нуля.',
        projects: (result?.existing?.projects ?? []).map((p) => p.slug),
        // P7.4: exact proposed targets + automation state.
        preview: result.preview ?? null,
        // P7.3: inert suggestions for explicit owner review.
        suggestions: result.suggestions ?? [],
      })
      // R4: bind validity to the exact current field set.
      setPreflightFields(currentFields())
      setPreflightContract(result.preflight ?? null)
    } catch (failure) {
      setPreflightState({ ok: false, message: String(failure?.message ?? failure) })
      setPreflightFields(null)
      setPreflightContract(null)
    }
    setPreflightBusy(false)
  }
  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api('/onboard', {
        method: 'POST',
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles,
          idempotency_key: `dockyard-onboard:${projectId.trim()}`,
          expected_membership_revision: preflightContract?.membership_revision,
          preflight_token: preflightContract?.token,
        },
      })
      onComplete(result)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setSubmitting(false)
    }
  }
  const steps = [
    ['Проект', 'Имя и репозиторий'],
    ['Миссия', 'Определить результат'],
    ['Ведущий', 'Назначить ответственного'],
    ['Обзор', 'Подтвердить контракт'],
  ]
  return jsx('div', { className: 'dockyard-modal-backdrop', children:
    jsxs('section', {
      className: 'dockyard-onboarding',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'dockyard-onboarding-title',
      'data-onboarding-wizard': true,
      'data-onboarding-intent': intent === 'existing' ? 'existing' : 'new',
      children: [
        jsxs('header', { className: 'dockyard-onboarding-head', children: [
          jsxs('div', { children: [
            jsx('span', { className: 'dockyard-card-label', children: intent === 'existing' ? 'EXISTING PROJECT' : 'NEW PROJECT' }),
            jsx('h2', { id: 'dockyard-onboarding-title', children: 'Подключить проект к управлению' }),
            jsx('p', { children: 'Четыре ограниченных шага. Ничего не запускается до финального ревью.' }),
          ]}),
          jsx('button', { type: 'button', className: 'dockyard-modal-close', 'aria-label': 'Закрыть онбординг', disabled: submitting, onClick: onClose, children: '×' }),
        ]}),
        jsx('div', { className: 'dockyard-wizard-progress', role: 'progressbar', 'aria-label': 'Прогресс онбординга', 'aria-valuemin': 1, 'aria-valuemax': 4, 'aria-valuenow': step, children:
          steps.map(([label, detail], index) => jsxs('div', { className: index + 1 <= step ? 'complete' : '', children: [
            jsx('span', { children: number(index + 1) }),
            jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: detail })] }),
          ]}, `step-${index}`)),
        }),
        jsxs('div', { className: 'dockyard-wizard-body', children: [
          jsxs('div', { className: step === 1 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 1, 'data-wizard-step': '1', children: [
            jsx('h3', { children: 'Идентификация проекта' }),
            jsx('p', { children: 'Используйте стабильный идентификатор проекта и его абсолютный путь к репозиторию.' }),
            discovered
              ? jsxs('div', { children: [
                  jsxs('p', { className: 'dockyard-meta', 'data-discovered-projects': true, children: [
                    'Проекты хоста: ',
                    (discovered.projects ?? []).length > 0
                      ? (discovered.projects ?? []).map((project) => project.slug).join(', ')
                      : 'пока нет — создание с нуля ниже',
                  ]}),
                  jsx('p', { className: 'dockyard-meta', 'data-profile-guidance': true, children: 'Профили управляются в менеджере профилей хоста Hermes.' }),
                  jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Обновить поиск хоста' }),
                ]})
              : discoverFailed
                ? jsxs('div', { children: [
                    jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-discovery-failed': true, children: 'Host discovery failed. Retry — onboarding stays closed until the host answers. No fallback choices are offered. If profiles are missing, manage them in the Hermes host profile manager, then retry.' }),
                    jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Повторить поиск хоста' }),
                  ]})
                : jsxs('div', { children: [
                    jsx('p', { className: 'dockyard-meta', children: 'Loading host discovery…' }),
                    jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Обновить поиск хоста' }),
                  ]}),
            // R4: connect-existing as a real selectable path — fills/binds
            // the discovered host project into the form.
            discovered && (discovered.projects ?? []).length > 0
              ? jsxs('div', { className: 'dockyard-connect-existing', 'data-connect-existing': true, children: [
                  jsx('p', { className: 'dockyard-card-label', children: 'CONNECT AN EXISTING HOST PROJECT' }),
                  ...(discovered.projects ?? []).map((project) => jsx(Button, {
                    action: `connect-existing-${project.slug}`,
                    small: true,
                    onClick: () => {
                      setProjectId(project.slug)
                      setRepoPath(project.repo_path)
                    },
                    children: `Connect ${project.slug}`,
                  }, project.slug)),
                ]})
              : null,
            jsx('label', { htmlFor: 'dockyard-project-id', children: 'ID проекта' }),
            jsx('input', { id: 'dockyard-project-id', 'data-field': 'project-id', value: projectId, placeholder: 'payments-relaunch', autoComplete: 'off', onInput: (event) => setProjectId(event.target.value) }),
            jsx('small', { children: 'Строчные буквы, цифры и дефисы.' }),
            jsx('label', { htmlFor: 'dockyard-repo-path', children: 'Путь к репозиторию' }),
            jsx('input', { id: 'dockyard-repo-path', 'data-field': 'repo-path', value: repoPath, placeholder: '/path/to/repos/project', autoComplete: 'off', onInput: (event) => setRepoPath(event.target.value) }),
          ]}),
          jsxs('div', { className: step === 2 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 2, 'data-wizard-step': '2', children: [
            jsx('h3', { children: 'Миссия и результат' }),
            jsx('p', { children: 'Сформулируйте, что проект должен улучшить. Это станет опорой для решений по инициативам.' }),
            jsx('label', { htmlFor: 'dockyard-mission', children: 'Миссия' }),
            jsx('textarea', { id: 'dockyard-mission', 'data-field': 'mission', value: mission, rows: 5, placeholder: 'Снизить сбои платежей, не ослабляя релизные гейты.', onInput: (event) => setMission(event.target.value) }),
            jsx('small', { children: `${number(mission.trim().length)} characters / minimum 12` }),
          ]}),
          jsxs('div', { className: step === 3 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 3, 'data-wizard-step': '3', children: [
            jsx('h3', { children: 'Роль ведущего' }),
            jsx('p', { children: 'Назначьте профиль-специалиста, ответственного за проект.' }),
            jsx('label', { htmlFor: 'dockyard-lead-profile', children: 'Профиль ведущего' }),
            // jsxs: a fixed placeholder plus the profiles (keyed), like the other static lists here.
            jsxs('select', { id: 'dockyard-lead-profile', 'data-field': 'lead-profile', value: leadProfile, onChange: (event) => setLeadProfile(event.target.value), children: [
              jsx('option', { value: '', children: 'Выберите профиль ведущего' }),
              ...(discovered?.profiles ?? []).map((profile) => jsx('option', {
                value: profile.name,
                disabled: profile.available === false || profile.selectable === false || ((profile.host_capabilities ?? []).length > 0 && !(profile.host_capabilities ?? []).includes('lead')),
                children: `${profile.name}${profile.available === false || profile.selectable === false ? ' — unavailable' : ''}`,
              }, profile.name)),
            ]}),
            jsx('small', { children: discovered
              ? `Valid host profiles: ${(discovered.profiles ?? []).map((p) => `${p.name}${p.available === false || p.selectable === false ? ' (unavailable)' : ''}`).join(', ') || 'n/a'}.`
              : discoverFailed
                ? 'Список профилей хоста недоступен — онбординг закрыт, пока обнаружение не удастся.'
                : 'Loading host profiles…' }),
            jsx('label', { htmlFor: 'dockyard-member-search', children: 'Участники команды' }),
            jsx('input', { id: 'dockyard-member-search', 'data-field': 'member-search', value: memberSearch, placeholder: 'Поиск профилей', autoComplete: 'off', onInput: (event) => setMemberSearch(event.target.value) }),
            jsx('div', { 'data-member-picker': true, children: (discovered?.profiles ?? [])
              .filter((profile) => profile.name.toLowerCase().includes(memberSearch.trim().toLowerCase()))
              .filter((profile) => profile.name !== leadProfile)
              .map((profile) => {
                const selectable = profile.available !== false && profile.selectable !== false && ((profile.host_capabilities ?? []).length === 0 || (profile.host_capabilities ?? []).includes('member'))
                return jsxs('label', { 'data-member-option': profile.name, children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: memberProfiles.includes(profile.name),
                    disabled: !selectable,
                    onChange: (event) => setMemberProfiles((current) => event.target.checked ? [...current, profile.name] : current.filter((name) => name !== profile.name)),
                  }),
                  `${profile.name}${selectable ? '' : ' — unavailable'}`,
                ] }, profile.name)
              }) }),
            jsx('small', { children: 'Это фиксирует владение; права не расширяются.' }),
          ]}),
          jsxs('div', { className: step === 4 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 4, 'data-wizard-step': '4', children: [
            jsx('h3', { children: 'Проверить контракт онбординга' }),
            jsxs('dl', { className: 'dockyard-onboarding-review', children: [
              jsx('dt', { children: 'Проект' }), jsx('dd', { children: projectId }),
              jsx('dt', { children: 'Репозиторий' }), jsx('dd', { children: repoPath }),
              jsx('dt', { children: 'Миссия' }), jsx('dd', { children: mission }),
              jsx('dt', { children: 'Ведущий' }), jsx('dd', { children: leadProfile }),
              jsx('dt', { children: 'Участники' }), jsx('dd', { children: memberProfiles.join(', ') || 'Нет' }),
            ]}),
            jsx(Button, {
              action: 'run-onboarding-preflight',
              disabled: preflightBusy || !valid,
              onClick: runPreflight,
              children: preflightBusy ? 'Проверка…' : 'Проверить на хосте перед фиксацией',
            }),
            preflightState
              ? jsx('p', {
                  className: preflightState.ok ? 'dockyard-review-note' : 'dockyard-inline-error',
                  role: preflightState.ok ? undefined : 'alert',
                  'data-preflight-result': preflightState.ok ? preflightState.mode : 'error',
                  children: preflightState.ok ? `${preflightState.text} Host projects: ${preflightState.projects.join(', ') || 'none'}.` : preflightState.message,
                })
              : null,
            // P7.4: the exact proposed governance/board/automation preview.
            preflightState?.ok && preflightState.preview
              ? jsx('pre', {
                  className: 'dockyard-onboarding-preview',
                  'data-onboarding-preview': true,
                  children: JSON.stringify(preflightState.preview, null, 2),
                })
              : null,
            // P7.3: reviewable inert suggestions; unsupported ones stay
            // visible as unsupported; acceptance is explicit per item.
            preflightState?.ok && (preflightState.suggestions ?? []).length > 0
              ? jsxs('div', { className: 'dockyard-onboarding-suggestions', 'data-onboarding-suggestions': true, children: [
                  jsx('p', { className: 'dockyard-card-label', children: 'ПРЕДЛОЖЕННЫЕ ЗАДАЧИ-ЦЕЛИ ВРУЧНУЮ — ничего не запускается автоматически' }),
                  ...preflightState.suggestions.map((suggestion) => jsxs('p', { className: 'dockyard-review-note', 'data-suggestion': suggestion.name, children: [
                    `${suggestion.name} — ${suggestion.description}`,
                    suggestion.supported === false ? ' (unsupported — shown for review only)' : '',
                  ] }, suggestion.name)),
                ]})
              : null,
            jsx('p', { className: 'dockyard-review-note', children: 'Onboarding creates the project record and its initial oversight surfaces. It does not approve future initiatives.' }),
          ]}),
        ]}),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('footer', { className: 'dockyard-wizard-actions', children: [
          jsx(Button, { action: step === 1 ? 'cancel-onboarding' : 'wizard-back', disabled: submitting, onClick: step === 1 ? onClose : () => setStep((value) => value - 1), children: step === 1 ? 'Отмена' : 'Назад' }),
          step < 4
            ? jsx(Button, { action: 'wizard-next', variant: 'primary', disabled: !valid, onClick: () => setStep((value) => value + 1), children: 'Продолжить' })
            // R4: final confirmation opens only with a successful preflight of
            // the exact current field set; any later edit re-locks it.
            : jsx(Button, {
                action: 'submit-onboarding',
                variant: 'primary',
                disabled: submitting || !preflightCurrent,
                data: { 'data-preflight-gate': preflightCurrent ? 'open' : 'locked' },
                onClick: submit,
                children: submitting ? 'Onboarding…' : (preflightCurrent ? 'Подключить проект' : 'Проверить перед онбордингом'),
              }),
        ]}),
      ],
    }),
  })
}

export function FleetSearch({ onOpen }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setActive(true)
      }
      if (event.key === 'Escape' && active) { setActive(false); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [active])
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setResults([]); setBusy(false); setError(''); return undefined }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setBusy(true)
      try {
        const response = await api(`/search?q=${encodeURIComponent(term)}&limit=20`)
        if (!cancelled) { setResults(response.results ?? []); setError('') }
      } catch (failure) {
        if (!cancelled) { setResults([]); setError(String(failure?.message ?? failure)) }
      } finally { if (!cancelled) setBusy(false) }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])
  return jsxs('div', { className: 'dockyard-fleet-search', children: [
    jsx('input', { ref: inputRef, type: 'search', 'aria-label': 'Поиск по проектам, работе и инициативам',
      'aria-expanded': active && query.trim().length >= 2, 'aria-controls': 'dockyard-search-results',
      placeholder: 'Поиск по проектам, работе, инициативам…', value: query,
      onFocus: () => setActive(true), onChange: (event) => { setQuery(event.target.value); setActive(true) },
      onKeyDown: (event) => { if (event.key === 'Enter' && results[0]) { onOpen?.(results[0].deep_link); setActive(false) } },
    }),
    jsx('span', { className: 'dockyard-search-shortcut', 'aria-hidden': true, children: '⌘K' }),
    active && query.trim().length >= 2 ? jsxs('div', { id: 'dockyard-search-results', className: 'dockyard-search-results', role: 'region', 'aria-label': 'Результаты поиска', children: [
      busy ? jsx('p', { children: 'Поиск…' }) : error ? jsx('p', { role: 'alert', children: error })
        : results.length === 0 ? jsx('p', { children: 'Совпадений не найдено' }) :
          results.map((item) => jsxs('button', { type: 'button', onClick: () => { onOpen?.(item.deep_link); setActive(false) }, children: [
            jsx('strong', { children: item.title }),
            jsx('small', { children: `${readableLabel(item.kind)} · ${item.project}` }),
          ]}, `${item.kind}:${item.ref}`)),
    ]}) : null,
  ]})
}

export function ConsoleBar({ tab, counts, onTab, onNewProject, onOnboardExisting, projects = [], selectedProject, onProjectChange, onOpen, onOpenArchived, archivedCount = 0 }) {
  // P3: the project context is persistent in the shell, not repeated in each panel.
  // Sahil 05/10: the Onboard tab became the "Onboard existing project" button
  // beside New project; both open the onboarding wizard.
  const tabs = [
    ['dashboard', 'Панель', null],
    ['project', 'Проекты', null],
    ['roadmap', 'Дорожная карта', null],
    ['backlog', 'Бэклог', null],
    ['workflows', 'Процессы', null],
    ['inbox', 'Входящие одобрения', counts.approvals],
    ['notifications', 'Уведомления', counts.notifications],
    // Sahil 04/10: app-wide settings only; each project's settings live in the project.
    ['settings', 'Настройки приложения', null],
  ]
  const moveTab = (event, index) => {
    let next = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    const nextKey = tabs[next][0]
    onTab(nextKey)
    document.getElementById(`dockyard-tab-${nextKey}`)?.focus()
  }
  // Sahil 04/10 (demo feedback d): one global project switcher, next to the brand.
  return jsxs('header', { className: 'dockyard-consolebar', children: [
    jsxs('div', { className: 'dockyard-brand-zone', children: [
      jsxs('div', { className: 'dockyard-brand', children: [
        jsx('span', { className: 'dockyard-brand-mark', children: jsx(Icon, { name: 'dock' }) }),
        jsxs('span', { className: 'dockyard-brand-copy', children: [
          jsx('strong', { children: 'Управление проектами' }),
          jsx('span', { children: 'Надзор флота' }),
        ]}),
      ]}),
      // Kept while archived projects exist, even with none listed, so the way
      // back to them never disappears (11/10/2026).
      projects.length > 0 || (onOpenArchived && archivedCount > 0)
        ? jsx(ProjectSwitcher, { projects, scope: selectedProject, onChange: onProjectChange, onNewProject, onOnboardExisting, onOpenArchived, archivedCount })
        : null,
    ]}),
    jsx(FleetSearch, { onOpen }),
    jsx('nav', { className: 'dockyard-tabs', role: 'tablist', 'aria-label': 'Разделы Project Stewardship', children:
      tabs.map(([key, label, count], index) => jsxs('button', {
        id: `dockyard-tab-${key}`,
        type: 'button',
        role: 'tab',
        className: 'dockyard-tab',
        'data-tab': key,
        'aria-selected': tab === key,
        'aria-controls': 'dockyard-panel',
        tabIndex: tab === key ? 0 : -1,
        onClick: () => onTab(key),
        onKeyDown: (event) => moveTab(event, index),
        children: [
          label,
          Number(count) > 0 ? jsx('span', { className: 'dockyard-tab-count', children: number(count) }) : null,
        ],
      }, key)),
    }),
    // Primary: New project. Secondary: Onboard existing project (Sahil 05/10).
    // Narrow widths show the icons only; the names stay as labels and tooltips.
    jsxs('div', { className: 'dockyard-console-actions', children: [
      jsx(Button, {
        action: 'open-onboarding',
        variant: 'primary dockyard-console-action',
        small: true,
        ariaLabel: 'Новый проект',
        data: { title: 'Новый проект' },
        onClick: onNewProject,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'project' }), jsx('span', { className: 'dockyard-console-action-label', children: 'Новый проект' })] }),
      }),
      jsx(Button, {
        action: 'open-onboard-existing',
        variant: 'dockyard-console-action',
        small: true,
        ariaLabel: 'Подключить существующий проект',
        data: { title: 'Подключить существующий проект' },
        onClick: onOnboardExisting,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'folder-open' }), jsx('span', { className: 'dockyard-console-action-label', children: 'Подключить существующий проект' })] }),
      }),
    ]}),
  ]})
}

export function PageHead({ title, description, onRefresh, status }) {
  return jsxs('div', { className: 'dockyard-page-head', children: [
    jsxs('div', { children: [
      jsx('h1', { children: title }),
      jsx('p', { children: description }),
    ]}),
    status || onRefresh ? jsxs('div', { className: 'dockyard-page-actions', children: [
      status ? jsxs('span', { className: 'dockyard-owed-pill', children: [
        jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
        status,
      ]}) : null,
      onRefresh ? jsx(Button, {
        action: 'refresh',
        onClick: onRefresh,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'refresh' }), 'Обновить'] }),
      }) : null,
    ]}) : null,
  ]})
}

export function EmptyState({ title, description, icon = 'project' }) {
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'empty', children: [
    jsx('span', { className: 'dockyard-empty-icon', children: jsx(Icon, { name: icon }) }),
    jsx('h2', { children: title }),
    jsx('p', { children: description }),
  ]})
}

export function ErrorState({ error, onRetry }) {
  // A profile without the plugin's backend: a setting, not a failure (11/10/2026).
  if (isPluginOffError(error)) {
    return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'plugin-off', role: 'status', children: [
      jsx('span', { className: 'dockyard-error-icon', children: jsx(Icon, { name: 'circle-help' }) }),
      jsx('h2', { children: PLUGIN_OFF_TITLE }),
      jsx('p', { children: PLUGIN_OFF_DETAIL }),
      jsx('p', { children: PLUGIN_OFF_NEXT_STEP }),
      jsx('code', { className: 'dockyard-plugin-off-command', 'data-plugin-off-command': true, children: PLUGIN_OFF_COMMAND }),
      jsx(Button, { action: 'retry', variant: 'primary', onClick: onRetry, children: 'Попробовать снова' }),
    ]})
  }
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'error', children: [
    jsx('span', { className: 'dockyard-error-icon', children: jsx(Icon, { name: 'alert' }) }),
    jsx('h2', { children: 'Project Stewardship не смог загрузить этот экран' }),
    jsx('p', { children: String(error) }),
    jsx(Button, { action: 'retry', variant: 'primary', onClick: onRetry, children: 'Попробовать снова' }),
  ]})
}

// A project Hermes has no project for (10/10/2026): say what is missing and
// how to link it, where its work would have been. A state, not an error.
export function UnlinkedNotice({ projectId }) {
  return jsxs('div', { className: 'dockyard-view-only-note', role: 'status', 'data-unlinked-notice': projectId, children: [
    jsx(Icon, { name: 'alert' }),
    jsxs('span', { children: [jsx('strong', { children: UNLINKED_TITLE }), `. ${UNLINKED_DETAIL} ${unlinkedNextStep(projectId)}`] }),
  ]})
}

export function LoadingState() {
  return jsxs('div', { className: 'dockyard-skeleton-page', 'data-state': 'loading', 'aria-label': 'Загрузка данных Project Stewardship', children: [
    jsx('div', { className: 'dockyard-skeleton title' }),
    jsx('div', { className: 'dockyard-skeleton copy' }),
    jsxs('div', { className: 'dockyard-overview-grid', children: [
      jsx('div', { className: 'dockyard-skeleton summary' }),
      jsx('div', { className: 'dockyard-skeleton summary' }),
    ]}),
    jsx('div', { className: 'dockyard-section', children:
      [0, 1, 2].map((index) => jsx('div', { className: 'dockyard-skeleton row' }, index)),
    }),
  ]})
}
