// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { number, pluralRu } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { DiscoveredProfilePicker } from '../views/dashboard.js'
import { Button } from '../lib/ui.js'
import { initials } from '../data/loaders.js'
import { Icon } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
import { UnlinkedNotice } from '../lib/ui.js'
import { isUnlinked } from '../data/unlinked.js'
// Backend lifecycle words for bot, session, transfer and item rows.
const STATUS_WORDS = { busy: 'Занят', idle: 'Свободен', stuck: 'Застрял', offline: 'Не в сети', active: 'Активна', completed: 'Завершён', failed: 'Ошибка', running: 'В работе' }

export function TeamsView({ view, onRefresh }) {
  const bots = view.bots ?? []
  const workload = view.workload ?? { busy: [], idle: [], stuck: [], offline: [] }
  const total = Math.max(1, bots.length)
  const [selectedBot, setSelectedBot] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [sessionState, setSessionState] = useState('idle')
  const [sessionError, setSessionError] = useState(null)
  const [profiles, setProfiles] = useState(view.profiles ?? [])
  const [team, setTeam] = useState(view.team ?? null)
  const [teamError, setTeamError] = useState(null)
  const [chosenProfile, setChosenProfile] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [preview, setPreview] = useState(null)
  const [operation, setOperation] = useState(null)
  const [pendingOperations, setPendingOperations] = useState([])
  const transferScope = useRef(null)
  const projectId = view.project?.id || view.projects?.[0]?.id || ''
  const unlinked = isUnlinked(view.project)
  useEffect(() => {
    const members = team?.members ?? []
    setProfiles((view.profiles ?? []).filter((profile) => profile.available !== false))
    setTransferFrom(members.find((member) => member.role !== 'lead')?.profile_slug || '')
    setTransferTo(members.find((member) => member.role === 'lead')?.profile_slug || '')
  }, [projectId])
  useEffect(() => {
    let cancelled = false
    const scope = { projectId }
    transferScope.current = scope
    setOperation(null)
    setPendingOperations([])
    if (projectId) api(`/projects/${encodeURIComponent(projectId)}/transfers/pending`)
      .then((result) => { if (!cancelled) setPendingOperations(result.operations ?? []) })
      .catch((failure) => { if (!cancelled) setTeamError(String(failure?.message ?? failure)) })
    return () => { cancelled = true; transferScope.current = null }
  }, [projectId])
  const refreshTeam = async () => setTeam(await api(`/projects/${encodeURIComponent(projectId)}/team`))
  const addMember = async () => {
    setTeamError(null)
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/members`, { method: 'POST', body: { profile_slug: chosenProfile, role: 'member' } })
      await refreshTeam()
    } catch (failure) { setTeamError(String(failure?.message ?? failure)) }
  }
  const transferLead = async () => {
    setTeamError(null)
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(chosenProfile)}/lead`, { method: 'POST', body: { profile_slug: chosenProfile } })
      await refreshTeam()
    } catch (failure) { setTeamError(String(failure?.message ?? failure)) }
  }
  const previewTransfer = async () => {
    setTeamError(null); setPreview(null)
    try { setPreview(await api(`/projects/${encodeURIComponent(projectId)}/transfers/preview`, { method: 'POST', body: { from_profile: transferFrom, to_profile: transferTo } })) }
    catch (failure) { setTeamError(String(failure?.message ?? failure)) }
  }
  const executeTransfer = async () => {
    setTeamError(null)
    try {
      const result = await api(`/projects/${encodeURIComponent(projectId)}/transfers/execute`, { method: 'POST', body: { from_profile: transferFrom, to_profile: transferTo, fingerprint: preview.fingerprint, idempotency_key: `desktop-${preview.fingerprint}` } })
      setOperation(await api(`/operations/${encodeURIComponent(result.op_id)}`))
      await refreshTeam()
    } catch (failure) { setPreview(null); setTeamError(`Предпросмотр устарел или перенос не удался: ${String(failure?.message ?? failure)}`) }
  }
  const acceptTransfer = (result, scope) => {
    if (transferScope.current !== scope || result.project_id !== scope?.projectId) return false
    setOperation(result)
    if (result.state === 'completed') setPendingOperations((items) => items.filter((item) => item.op_id !== result.op_id))
    return true
  }
  const resumeTransfer = async (opId) => {
    const scope = transferScope.current
    if (!scope || scope.projectId !== projectId) return
    try { acceptTransfer(await api(`/operations/${encodeURIComponent(opId)}`), scope) }
    catch (failure) { if (transferScope.current === scope) setTeamError(String(failure?.message ?? failure)) }
  }
  const retryTransfer = async () => {
    const scope = transferScope.current
    if (!scope || scope.projectId !== projectId || operation?.project_id !== projectId) return
    try {
      await api(`/operations/${encodeURIComponent(operation.op_id)}/retry`, { method: 'POST', body: {} })
      if (transferScope.current !== scope) return
      const refreshed = await api(`/operations/${encodeURIComponent(operation.op_id)}`)
      if (!acceptTransfer(refreshed, scope)) return
      const roster = await api(`/projects/${encodeURIComponent(projectId)}/team`)
      if (transferScope.current === scope) setTeam(roster)
    } catch (failure) { if (transferScope.current === scope) setTeamError(String(failure?.message ?? failure)) }
  }
  const openSessions = async (botId) => {
    setSelectedBot(botId)
    setTranscript(null)
    setSessionData(null)
    setSessionState('loading')
    setSessionError(null)
    try {
      setSessionData(await api(`/bots/${encodeURIComponent(botId)}/sessions`))
      setSessionState('ready')
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure))
      setSessionState('error')
    }
  }
  const openTranscript = async (sessionId) => {
    if (!selectedBot) return
    setSessionState('loading-transcript')
    setSessionError(null)
    try {
      setTranscript(await api(`/bots/${encodeURIComponent(selectedBot)}/sessions/${encodeURIComponent(sessionId)}`))
      setSessionState('ready')
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure))
      setSessionState('error')
    }
  }
  return jsxs('div', { 'data-bot-teams': true, children: [
    jsx(PageHead, {
      title: 'Команды ботов',
      description: 'Возможности, доступность, групповое владение и структурированные передачи.',
      status: workload.stuck?.length > 0 ? `Застряло: ${number(workload.stuck.length)}` : null,
      onRefresh,
    }),
    jsxs('section', { className: 'dockyard-feature-card', 'data-team-management': true, children: [
      jsxs('header', { children: [jsx('h2', { children: 'Команда проекта' }), jsx('span', { children: team ? `Ревизия ${team.membership_revision}` : unlinked ? 'Не связан' : 'Загрузка канонического состава…' })] }),
      // The roster lives in Hermes: an unlinked project has none (10/10/2026).
      unlinked ? jsx(UnlinkedNotice, { projectId }) : null,
      teamError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: teamError }) : null,
      jsx('div', { className: 'dockyard-bot-grid', children: (team?.members ?? []).map((member) => jsxs('article', { className: 'dockyard-bot-card', 'data-project-member': member.profile_slug, children: [
        jsxs('strong', { children: [member.profile_slug, member.role === 'lead' ? ' · Ведущий' : ' · Участник'] }),
        jsx(StatusTag, { tone: member.hermes_available ? 'success' : 'warning', label: member.hermes_available ? 'Hermes доступен' : 'Недоступно' }),
        jsx('span', { children: `канонических рабочих элементов: ${number(member.workload?.total ?? 0)}` }),
        jsx('small', { children: member.state }),
      ] }, member.profile_slug)) }),
      jsx(DiscoveredProfilePicker, { profiles, name: 'team-member-lead', label: 'Обнаруженный профиль Hermes', value: chosenProfile, onChange: setChosenProfile }),
      jsxs('div', { className: 'dockyard-modal-actions', children: [
        jsx(Button, { action: 'add-project-member', disabled: !chosenProfile || !projectId, onClick: addMember, children: 'Добавить участника' }),
        jsx(Button, { action: 'transfer-project-lead', disabled: !chosenProfile || !projectId, onClick: transferLead, children: 'Передать ведущего' }),
      ] }),
      jsxs('div', { className: 'dockyard-settings-grid', children: [
        jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Участник покидает проект' }), jsx('select', { ['data-transfer-fr' + 'om']: true, value: transferFrom, onChange: (event) => setTransferFrom(event.target.value), children: (team?.members ?? []).map((member) => jsx('option', { value: member.profile_slug, children: member.profile_slug }, member.profile_slug)) })] }),
        jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Замена' }), jsx('select', { 'data-transfer-to': true, value: transferTo, onChange: (event) => setTransferTo(event.target.value), children: (team?.members ?? []).map((member) => jsx('option', { value: member.profile_slug, children: member.profile_slug }, member.profile_slug)) })] }),
      ] }),
      jsx(Button, { action: 'preview-work-transfer', disabled: !transferFrom || !transferTo || transferFrom === transferTo, onClick: previewTransfer, children: 'Посмотреть точные последствия' }),
      preview ? jsxs('div', { 'data-transfer-preview': preview.fingerprint, children: [
        jsx('strong', { children: `Перечислено элементов: ${number(preview.enumerated_count)} · отпечаток ${preview.fingerprint}` }),
        jsx('ul', { children: [...(preview.eligible_items ?? []), ...(preview.excluded_items ?? [])].map((item) => jsx('li', { children: `${item.id} · ${item.title || ''} · ${item.status} · ${item.reason || 'подходит'}` }, item.id)) }),
        jsx(Button, { action: 'execute-work-transfer', variant: 'primary', disabled: preview.complete !== true || (preview.excluded_items ?? []).length > 0, onClick: executeTransfer, children: 'Подтвердить точный перенос' }),
      ] }) : null,
      pendingOperations.length ? jsxs('section', { 'data-pending-transfers': true, children: [
        jsx('h3', { children: 'Незавершённые передачи · уход участника' }),
        ...pendingOperations.map((pending) => jsx(Button, {
          onClick: () => resumeTransfer(pending.op_id),
          children: `Продолжить ${pending.op_id}`,
        }, pending.op_id)),
      ] }) : null,
      operation?.project_id === projectId ? jsxs('div', { 'data-transfer-operation': operation.op_id, role: 'status', children: [
        jsx('strong', { children: `${operation.op_id} · ${STATUS_WORDS[operation.state] ?? operation.state}` }),
        jsx('span', { children: `Перенесено ${(operation.items ?? []).filter((item) => item.outcome === 'completed').length} из ${(operation.items ?? []).length}` }),
        jsx('ul', { children: (operation.items ?? []).map((item) => jsx('li', { children: `${item.item_id} · ${STATUS_WORDS[item.outcome] ?? item.outcome}${item.detail ? ` · ${item.detail}` : ''}` }, item.item_id)) }),
        operation.state !== 'completed' ? jsx(Button, { action: 'retry-work-transfer', onClick: retryTransfer, children: 'Повторить оставшиеся пункты' }) : null,
      ] }) : null,
    ]}),
    jsxs('section', { className: 'dockyard-workload-card', 'data-workload-visual': true, children: [
      jsxs('div', { children: [jsx('h2', { children: 'Нагрузка' }), jsx('p', { children: 'Текущая доступность флота по его работе.' })] }),
      jsxs('div', { className: 'dockyard-workload-chart', children: [
        jsxs('div', { className: 'dockyard-work-visual', role: 'img', 'aria-label': `занято: ${workload.busy?.length ?? 0}, свободно: ${workload.idle?.length ?? 0}, застряло: ${workload.stuck?.length ?? 0}, не в сети: ${workload.offline?.length ?? 0}`, children: [
          workload.busy?.length > 0 ? jsx('span', { className: 'active', style: { width: `${(workload.busy.length / total) * 100}%` } }) : null,
          workload.idle?.length > 0 ? jsx('span', { className: 'done', style: { width: `${(workload.idle.length / total) * 100}%` } }) : null,
          workload.stuck?.length > 0 ? jsx('span', { className: 'danger', style: { width: `${(workload.stuck.length / total) * 100}%` } }) : null,
        ]}),
        jsx('p', { children: `${number(workload.busy?.length ?? 0)} занято / ${number(workload.idle?.length ?? 0)} свободно / ${number(workload.stuck?.length ?? 0)} застряло / ${number(workload.offline?.length ?? 0)} не в сети` }),
      ]}),
    ]}),
    jsxs('div', { className: 'dockyard-teams-layout', children: [
      jsxs('section', { className: 'dockyard-feature-card', children: [
        jsx('h2', { children: 'Реестр' }),
        jsx('p', { children: 'Заявленные возможности и текущее состояние. Возможности не расширяют права.' }),
        jsx('div', { className: 'dockyard-bot-grid', children:
          bots.map((bot) => jsxs('article', { className: 'dockyard-bot-card', 'data-bot-card': bot.id, children: [
            jsxs('header', { children: [
              jsx('span', { className: 'dockyard-avatar', children: initials(bot.name || bot.id) }),
              jsxs('span', { children: [jsx('strong', { children: bot.name || bot.id }), jsx('small', { children: bot.current_item || 'Нет активного элемента' })] }),
              jsx(StatusTag, { tone: bot.status === 'busy' ? 'warning' : bot.status === 'idle' ? 'success' : 'neutral', label: STATUS_WORDS[bot.status] ?? (bot.status || 'неизвестно') }),
            ]}),
            jsx('div', { className: 'dockyard-capabilities', children:
              (bot.capabilities ?? []).length > 0
                ? bot.capabilities.map((capability) => jsx('span', { children: capability }, capability))
                : jsx('span', { children: 'Возможности не заявлены' }),
            }),
            jsxs('button', {
              type: 'button',
              className: 'dockyard-bot-session-button',
              'data-action': 'open-bot-sessions',
              'data-bot-id': bot.id,
              'aria-expanded': selectedBot === bot.id,
              onClick: () => openSessions(bot.id),
              children: [jsx(Icon, { name: 'activity' }), jsx('span', { children: 'Журналы сессий' }), jsx(Icon, { name: 'chevron' })],
            }),
          ]}, bot.id)),
        }),
      ]}),
      jsxs('section', { className: 'dockyard-feature-card', children: [
        jsx('h2', { children: 'Группы и передачи' }),
        jsx('p', { children: 'Состав групп и аудируемые A2A-сообщения из канонического потока.' }),
        jsx('div', { className: 'dockyard-group-list', children:
          (view.groups ?? []).length > 0
            ? view.groups.map((group) => jsxs('article', { className: 'dockyard-group-card', 'data-bot-group': group.name, children: [
                jsxs('header', { children: [jsx('strong', { children: group.name }), jsx('span', { children: `${number(group.members?.length ?? 0)} ${pluralRu(group.members?.length ?? 0, 'участник', 'участника', 'участников')}` })] }),
                jsx('p', { children: group.purpose || 'Назначение не указано' }),
                jsx('div', { className: 'dockyard-group-members', children: (group.members ?? []).map((member) => jsx('span', { className: 'dockyard-avatar', title: member, children: initials(member) }, member)) }),
                jsx('div', { className: 'dockyard-handoff-list', children:
                  (view.messages?.[group.name] ?? []).length > 0
                    ? view.messages[group.name].map((message, index) => jsxs('div', { children: [
                        jsx('strong', { children: message.payload?.summary || message.msg_type || 'Событие A2A' }),
                        jsx('span', { children: `${message.from_actor || 'Автор неизвестен'} / ${formatWhen(message.created_at)}` }),
                      ]}, String(message.id ?? index)))
                    : jsx('span', { className: 'dockyard-meta', children: 'Сообщения о передаче не записаны.' }),
                }),
              ]}, group.name))
            : jsx('p', { className: 'dockyard-meta', children: 'Группы ботов не настроены.' }),
        }),
      ]}),
    ]}),
    selectedBot ? jsxs('section', { className: 'dockyard-feature-card dockyard-bot-session-panel', 'data-bot-session-panel': selectedBot, children: [
      jsxs('header', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('span', { className: 'dockyard-card-label', children: 'ДОКАЗАТЕЛЬСТВА СЕССИИ' }),
          jsx('h2', { children: `Активность: ${bots.find((bot) => bot.id === selectedBot)?.name || selectedBot}` }),
          jsx('p', { children: sessionData?.scope_note || 'Системные промпты и приватные рассуждения исключены.' }),
        ]}),
        jsx(Button, { small: true, onClick: () => { setSelectedBot(null); setSessionData(null); setTranscript(null) }, children: 'Закрыть' }),
      ]}),
      sessionError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: sessionError }) : null,
      sessionState === 'loading'
        ? jsx('p', { className: 'dockyard-meta', children: 'Загрузка сессий…' })
        : jsxs('div', { className: 'dockyard-session-layout', children: [
            jsxs('aside', { className: 'dockyard-session-list', children: [
              jsx('h3', { children: 'Недавние сессии' }),
              sessionData?.available === false
                ? jsx('p', { className: 'dockyard-meta', children: 'Для этого профиля бота нет хранилища сессий Hermes.' })
                : (sessionData?.sessions ?? []).length > 0
                  ? sessionData.sessions.map((session) => jsxs('button', {
                      type: 'button',
                      'data-bot-session': session.session_id,
                      className: transcript?.session?.session_id === session.session_id ? 'active' : '',
                      onClick: () => openTranscript(session.session_id),
                      children: [
                        jsxs('span', { children: [jsx('strong', { children: session.title }), jsx('small', { children: `${session.source} / ${formatWhen(session.last_activity_at)}` })] }),
                        jsx(StatusTag, { tone: session.status === 'active' ? 'success' : 'neutral', label: STATUS_WORDS[session.status] ?? session.status }),
                      ],
                    }, session.session_id))
                  : jsx('p', { className: 'dockyard-meta', children: 'Сессии этого бота не записаны.' }),
            ]}),
            transcript
              ? jsxs('article', { className: 'dockyard-transcript', 'data-session-transcript': transcript.session?.session_id, children: [
                  jsxs('header', { children: [
                    jsxs('div', { children: [jsx('h3', { children: transcript.session?.title || 'Транскрипт сессии' }), jsx('span', { children: `${transcript.session?.source || 'неизвестно'} / ${transcript.session?.model || 'модель не записана'}` })] }),
                    jsx(StatusTag, { tone: 'info', label: `${number(transcript.messages?.length ?? 0)} ${pluralRu(transcript.messages?.length ?? 0, 'сообщение', 'сообщения', 'сообщений')}` }),
                  ]}),
                  jsx('div', { className: 'dockyard-transcript-messages', children:
                    (transcript.messages ?? []).map((message, index) => jsxs('div', { className: `dockyard-transcript-message ${message.role}`, 'data-transcript-message': message.role, children: [
                      jsxs('div', { children: [jsx('strong', { children: message.tool_name || message.role }), jsx('span', { children: formatWhen(message.timestamp) })] }),
                      jsx('pre', { children: message.content || '(пустое сообщение)' }),
                      message.truncated ? jsx('small', { children: 'Сообщение обрезано по лимиту безопасного показа.' }) : null,
                    ]}, String(message.message_id ?? index))),
                  }),
                  jsx('p', { className: 'dockyard-transcript-scope', children: transcript.scope_note }),
                ]})
              : jsx('div', { className: 'dockyard-transcript-placeholder', children: sessionState === 'loading-transcript' ? 'Загрузка транскрипта...' : 'Выберите сессию, чтобы посмотреть её транскрипт.' }),
          ]}),
    ]}) : null,
  ]})
}
