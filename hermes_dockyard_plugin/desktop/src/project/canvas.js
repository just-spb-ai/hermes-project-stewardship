// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { gridSlot } from '../../planning-canvas-geometry.js'
import { useState } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { CANVAS_MIN_POS } from '../../planning-canvas-geometry.js'
import { number } from '../lib/ui.js'
import { layoutConnectors } from '../../planning-canvas-geometry.js'
import { jsx } from '../runtime/react.js'
import { layoutFrames } from '../../planning-canvas-geometry.js'
import { jsxs } from '../runtime/react.js'
import { Button, Icon } from '../lib/ui.js'
import { fileAsBase64 } from '../lib/ui.js'
import { RichTextEditor } from './rich-text.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { CANVAS_WORDS } from '../lib/canvas-words.js'
export const CANVAS_OBJECT_KINDS = Object.freeze(['evidence', 'claim', 'question', 'decision', 'plan_block', 'risk', 'assumption', 'note', 'link', 'media'])
export const CANVAS_CONNECTOR_MEANINGS = Object.freeze(['supports', 'contradicts', 'derived_from', 'clarifies', 'depends_on', 'implements', 'raises_question'])
export const CANVAS_KIND_LABELS = Object.freeze({ evidence: 'Доказательства', claim: 'Утверждение', question: 'Вопрос', decision: 'Решение', plan_block: 'Блок плана', risk: 'Риск', assumption: 'Допущение', note: 'Заметка', link: 'Связать', media: 'Медиа' })
export const CANVAS_STICKER_COLOURS = Object.freeze(['yellow', 'orange', 'coral', 'pink', 'purple', 'indigo', 'blue', 'teal', 'green', 'lime', 'clay', 'slate'])
export const CANVAS_STICKER_LABELS = Object.freeze({ yellow: 'Солнце', green: 'Мята', blue: 'Небо', pink: 'Роза', purple: 'Фиолет', orange: 'Янтарь', coral: 'Коралл', teal: 'Бирюза', lime: 'Лайм', clay: 'Глина', slate: 'Грифель', indigo: 'Индиго' })
// D-P1 a11y: each kind carries its own Lucide icon so it is never identified
// by colour alone. Names must exist in the generated lucide-icons.js subset.
export const CANVAS_KIND_ICONS = Object.freeze({
  evidence: 'file-text', claim: 'message-square', question: 'lightbulb',
  decision: 'flag', plan_block: 'list-checks', note: 'sticky-note',
  link: 'link', media: 'image', risk: 'shield-alert', assumption: 'circle-help',
})
// Stage 1 card fields (owner 30/09). Mirrors canvas_service field rules; the
// server stays the authority. Fields a kind does not list are kept, hidden.
// [field, input, label, choices?, maxLength?]
const LEVELS = ['low', 'medium', 'high']
export const CANVAS_KIND_FIELDS = Object.freeze({
  evidence: [['source', 'text', 'Источник', null, 300], ['observed_on', 'date', 'Дата наблюдения'], ['confidence', 'choice', 'Уверенность', LEVELS], ['quote', 'area', 'Цитата', null, 5000]],
  claim: [['claim_status', 'choice', 'Статус', ['unverified', 'supported', 'disputed', 'refuted']], ['confidence', 'choice', 'Уверенность', LEVELS]],
  question: [['question_status', 'choice', 'Статус', ['open', 'answered']], ['owner', 'member', 'Владелец'], ['answer', 'area', 'Ответ', null, 5000]],
  decision: [['decision_status', 'choice', 'Статус', ['proposed', 'accepted', 'rejected', 'superseded']], ['decided_by', 'member', 'Кто решил'], ['decided_on', 'date', 'Когда решено'], ['rationale', 'area', 'Обоснование', null, 5000], ['alternatives', 'list', 'Рассмотренные альтернативы']],
  plan_block: [['plan_status', 'choice', 'Статус', ['todo', 'in_progress', 'blocked', 'done']], ['owner', 'member', 'Владелец'], ['due_on', 'date', 'Срок'], ['estimate', 'text', 'Оценка', null, 50], ['checklist', 'checklist', 'Чек-лист']],
  risk: [['risk_status', 'choice', 'Статус', ['open', 'mitigating', 'closed']], ['likelihood', 'choice', 'Вероятность', LEVELS], ['impact', 'choice', 'Влияние', LEVELS], ['owner', 'member', 'Владелец'], ['mitigation', 'area', 'Митигация', null, 5000]],
  assumption: [['assumption_status', 'choice', 'Статус', ['untested', 'validated', 'invalidated']], ['confidence', 'choice', 'Уверенность', LEVELS], ['test', 'area', 'Как мы это проверим', null, 2000]],
  media: [['content_id', 'image', 'Изображение'], ['alt', 'text', 'Альт-текст (описание изображения)', null, 300], ['caption', 'text', 'Подпись', null, 500]],
  link: [], note: [],
})
export const canvasChoiceLabel = (value) => ({ todo: 'Сделать', in_progress: 'В работе', done: 'Готово', blocked: 'Заблокировано', open: 'Открыто', answered: 'Отвечено', unverified: 'Не проверено', supported: 'Подтверждено', disputed: 'Оспаривается', refuted: 'Опровергнуто', proposed: 'Предложено', accepted: 'Принято', rejected: 'Отклонено', superseded: 'Заменено', mitigating: 'Снижается', closed: 'Закрыто', untested: 'Не проверено', validated: 'Подтверждено', invalidated: 'Опровергнуто', low: 'Низкий', medium: 'Средний', high: 'Высокий' }[value] ?? (value ? value.charAt(0).toUpperCase() + value.slice(1) : ''))
export const CANVAS_IMAGE_TYPES = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })
export const CANVAS_IMAGE_MAX = 5 * 1024 * 1024
// Same rule as the server (_WEB_URL): scheme, a dotted host, no spaces.
export const canvasSafeUrl = (value) => /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(String(value ?? '').trim())
const linksOf = (content) => (Array.isArray(content?.links) ? content.links : (content?.url ? [{ url: content.url }] : []))
// One short line under the title: status, owner, links, checklist progress.
export const canvasSummary = (item) => {
  const c = item?.content ?? {}
  const parts = []
  const status = (CANVAS_KIND_FIELDS[item?.kind] ?? []).find(([, input]) => input === 'choice')
  if (status && c[status[0]]) parts.push(canvasChoiceLabel(c[status[0]]))
  const who = c.owner ?? c.decided_by
  if (who && (CANVAS_KIND_FIELDS[item?.kind] ?? []).some(([f]) => f === 'owner' || f === 'decided_by')) parts.push(who)
  if (item?.kind === 'plan_block' && Array.isArray(c.checklist) && c.checklist.length) parts.push(`${c.checklist.filter((x) => x.done).length}/${c.checklist.length} готово`)
  const links = linksOf(c).length
  if (links) parts.push(`${links} ${links === 1 ? CANVAS_WORDS.linkOne : CANVAS_WORDS.linkMany}`)
  return parts.join(' · ')
}
// Verified image bytes come back as base64 from the server (PNG/JPEG/WebP
// only, checked by content, never SVG). Small bounded cache per session.
const imageCache = new Map()
export function CanvasImage({ projectId, contentId, alt, className }) {
  const key = `${projectId}/${contentId}`
  const [src, setSrc] = useState(() => imageCache.get(key) ?? null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    if (imageCache.has(key)) { setSrc(imageCache.get(key)); setFailed(false); return undefined }
    setSrc(null); setFailed(false)
    api(`/projects/${encodeURIComponent(projectId)}/content/${encodeURIComponent(contentId)}/image`).then((result) => {
      if (!live) return
      if (!CANVAS_IMAGE_TYPES[result?.media_type] || typeof result?.data_base64 !== 'string') throw new Error('not an image')
      const url = `data:${result.media_type};base64,${result.data_base64}`
      imageCache.set(key, url)
      // Bound memory by total size (about 30 MB of data URLs), oldest out first.
      let total = 0
      for (const value of imageCache.values()) total += value.length
      while (total > 30 * 1024 * 1024 && imageCache.size > 1) {
        const oldest = imageCache.keys().next().value
        total -= imageCache.get(oldest).length
        imageCache.delete(oldest)
      }
      setSrc(url)
    }).catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [key])
  if (failed) return jsx('span', { className: 'dy-pc-img-note', 'data-canvas-image-missing': contentId, children: 'Изображение недоступно' })
  if (!src) return jsx('span', { className: 'dy-pc-img-note', children: 'Загрузка изображения…' })
  return jsx('img', { className, src, alt: alt || '', draggable: false, 'data-canvas-image': contentId })
}
// D14: board lifecycle. Mirrors canvas_service._MOVES; the server stays the
// authority and refuses any other move.
export const CANVAS_BOARD_STATUS_LABELS = Object.freeze({ draft: 'Черновик', submitted: 'Отправлено', planned: 'План составлен', completed: 'Завершено', archived: 'В архиве' })
export const CANVAS_BOARD_MOVES = Object.freeze({ draft: ['submitted'], submitted: ['draft', 'planned'], planned: ['submitted', 'completed'], completed: ['planned'] })
export const CANVAS_READ_ONLY = Object.freeze(['completed', 'archived'])
export const CANVAS_MEANING_LABELS = Object.freeze({ supports: 'поддерживает', contradicts: 'противоречит', derived_from: 'следует из', clarifies: 'уточняет', depends_on: 'зависит от', implements: 'реализует', raises_question: 'ставит вопрос' })
export const CANVAS_WORLD = Object.freeze({ width: 2000, height: 1400 })
export const CANVAS_CARD = Object.freeze({ width: 240, height: 140 })
export const CANVAS_ZOOM = Object.freeze({ min: 0.5, max: 1.5, step: 0.1 })
export let canvasObjectSeq = 0
export let canvasEdgeSeq = 0

export const canvasText = (item) => String(item?.content?.text ?? item?.content?.title ?? item?.content?.url ?? '')
export const canvasNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
export const canvasClamp = (value, min, max) => Math.min(Math.max(value, min), max)
export const canvasRect = (item) => ({
  x: canvasNumber(item?.x), y: canvasNumber(item?.y),
  width: canvasNumber(item?.width) || CANVAS_CARD.width,
  height: canvasNumber(item?.height) || CANVAS_CARD.height,
})
// Deterministic free-slot placement: the first grid cell that does not overlap
// an existing card. No randomness, so the same canvas always places the same.
export const canvasPlaced = (objects) => {
  const cols = 4
  for (let slot = 0; slot < cols * 12; slot += 1) {
    const { x, y } = gridSlot(slot, cols)
    const overlaps = objects.some((item) => {
      const rect = canvasRect(item)
      return x < rect.x + rect.width && x + CANVAS_CARD.width > rect.x && y < rect.y + rect.height && y + CANVAS_CARD.height > rect.y
    })
    if (!overlaps) return { x, y }
  }
  return { x: 60, y: 60 }
}
// Signed-v1 de-overlap on drop: push a dropped card out of every card it
// overlaps, deterministically (rightward only, resolved against each hit).
export const canvasDeOverlap = (objects, movedId) => {
  const moved = objects.find((item) => item.id === movedId)
  if (!moved) return objects
  const rect = canvasRect(moved)
  let x = rect.x
  const y = rect.y
  const others = objects.filter((item) => item.id !== movedId).map(canvasRect)
  for (let guard = 0; guard < 64; guard += 1) {
    const hit = others.find((other) => x < other.x + other.width && x + rect.width > other.x && y < other.y + other.height && y + rect.height > other.y)
    if (!hit) break
    x = hit.x + hit.width + 20
  }
  if (x === rect.x) return objects
  return objects.map((item) => item.id === movedId ? { ...item, x } : item)
}

export function PlanningCanvasPanel({ project, canvas: initialCanvas, content = [], onRefresh, onDirty }) {
  const [canvas, setCanvas] = useState(initialCanvas ?? null)
  const [objects, setObjects] = useState(initialCanvas?.objects ?? [])
  const [connectors, setConnectors] = useState(initialCanvas?.connectors ?? [])
  const [dirty, setDirty] = useState(false)
  const [kind, setKind] = useState('note')
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('select')
  const [pendingConnect, setPendingConnect] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [drawerText, setDrawerText] = useState('')
  const [drawerKind, setDrawerKind] = useState('note')
  const [drawerFields, setDrawerFields] = useState({})
  // Set by the description editor when it is over the server's size limits;
  // Apply stays disabled until it is fixed (Quan re-check M2).
  const [richProblem, setRichProblem] = useState(null)
  const [members, setMembers] = useState([])
  const [imageBusy, setImageBusy] = useState(false)
  const [linkSource, setLinkSource] = useState('')
  const [linkTarget, setLinkTarget] = useState('')
  const [linkMeaning, setLinkMeaning] = useState('supports')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [chatOpen, setChatOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [answer, setAnswer] = useState('')
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  // Signed-v1 undo/redo: a bounded scratch history of object/connector
  // snapshots taken before each board edit. Client-side edit aid only; the
  // server revision only moves through Save.
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [marquee, setMarquee] = useState(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatLog, setChatLog] = useState([])
  const [chatBusy, setChatBusy] = useState(false)
  const [planPanel, setPlanPanel] = useState(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [backlogConfirm, setBacklogConfirm] = useState(null)
  // Batch L: optionally place the created backlog tasks under one goal.
  const [backlogGoal, setBacklogGoal] = useState('')
  const [backlogGoals, setBacklogGoals] = useState([])
  const [boards, setBoards] = useState([])
  const [boardListOpen, setBoardListOpen] = useState(true)
  const [boardBusy, setBoardBusy] = useState(false)
  // null = follow the Desktop host theme; 'light'/'dark' = this board's choice.
  const [theme, setTheme] = useState(initialCanvas?.theme ?? null)
  const [hostTheme, setHostTheme] = useState('light')
  const [modelOptions, setModelOptions] = useState(null)
  // True once this host answered the multi-board list. Every board action
  // then names the open board explicitly; legacy hosts keep /canvas.
  const [boardsApi, setBoardsApi] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [boardForm, setBoardForm] = useState(null)
  const [chatPill, setChatPill] = useState(false)
  const [chatPos, setChatPos] = useState(null)
  const [chatDragging, setChatDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [stepsDraft, setStepsDraft] = useState(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  // Full screen: the canvas frame takes the whole window (CSS, not the
  // browser Fullscreen API, so the host window keeps working).
  const [fullscreen, setFullscreen] = useState(false)
  // Connect mode: where the pointer is (world coords) for the preview line.
  const [connectPointer, setConnectPointer] = useState(null)
  // Unsaved-changes prompt: { label, action } while waiting for Save / Discard / Cancel.
  const [pendingLeave, setPendingLeave] = useState(null)
  // Status dropdown picks are confirmed before anything is sent.
  const [pendingStatus, setPendingStatus] = useState(null)
  const [panning, setPanning] = useState(false)
  // Fit-if-hidden runs after a board opens (and on first render).
  const [fitTick, setFitTick] = useState(0)
  const stageRef = useRef(null)
  const chatRef = useRef(null)
  const addMenuRef = useRef(null)
  // Late answers must never land on the wrong board or after Stop: every
  // async AI/board read checks the board it started on and its own token.
  const boardRef = useRef(initialCanvas?.canvas_id ?? null)
  const chatToken = useRef(0)
  const dirtyRef = useRef(false)
  const boardsApiRef = useRef(false)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const encoded = encodeURIComponent(project.id)
  const revision = Number(canvas?.revision ?? 0)
  const selected = objects.find((item) => item.id === selectedId) ?? null
  useEffect(() => {
    let live = true
    api(`/projects/${encodeURIComponent(project.id)}/members`).then((result) => {
      if (live) setMembers((result?.members ?? []).filter((m) => m && m.state !== 'departed').map((m) => String(m.profile_slug)))
    }).catch(() => { if (live) setMembers([]) })
    return () => { live = false }
  }, [project.id])
  const boardPath = (id) => `/projects/${encoded}/canvases/${encodeURIComponent(id)}`
  const boardScoped = boardsApi && Boolean(canvas?.canvas_id)
  const canvasRoute = boardScoped ? boardPath(canvas.canvas_id) : `/projects/${encoded}/canvas`
  const boardStatus = canvas?.status ?? 'draft'
  const readOnly = CANVAS_READ_ONLY.includes(boardStatus)
  boardRef.current = canvas?.canvas_id ?? null
  // QA M-8: the large view and the unsaved prompt move focus in, keep Tab
  // inside, and hand focus back to the button that opened them.
  useDialogFocusManager(pendingLeave ? '[data-canvas-unsaved-prompt] .dy-pc-overlay-card' : pendingStatus ? '[data-canvas-status-confirm] .dy-pc-overlay-card' : (expanded ? '[data-canvas-expanded] .dy-pc-overlay-card' : null))
  dirtyRef.current = dirty
  boardsApiRef.current = boardsApi
  useEffect(() => { if (!pendingConnect) setConnectPointer(null) }, [pendingConnect])
  zoomRef.current = zoom
  panRef.current = pan
  const failureText = (failure) => String(failure?.message ?? failure)
  useEffect(() => {
    // QA H-3: once the board routes answer, this panel owns the open board. A
    // parent refresh re-reads the legacy "most recent board" and must never
    // swap the open board or drop unsaved edits.
    if (boardsApiRef.current || dirtyRef.current) return
    const next = initialCanvas ?? { revision: 0, objects: [], connectors: [] }
    setCanvas(next); setObjects(next.objects ?? []); setConnectors(next.connectors ?? []); setDirty(false)
    setHistory([]); setFuture([]); setSelectedIds([]); setSelectedId(null)
    setTheme(next.theme ?? null)
  }, [initialCanvas])
  // Unsaved edits are reported upwards (project switch / view change guard)
  // and protect the window from being closed without a prompt.
  // F-2: parents get a save handle so their prompts can offer Save too.
  const saveRef = useRef(null)
  useEffect(() => { onDirty?.(dirty, dirty ? () => saveRef.current?.() : null) }, [dirty])
  useEffect(() => () => onDirty?.(false), [])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const root = stageRef.current?.closest?.('.dockyard-root')
    if (!root) return undefined
    const read = () => setHostTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    read()
    const watcher = new MutationObserver(read)
    watcher.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => watcher.disconnect()
  }, [])
  useEffect(() => {
    let live = true
    api(`/projects/${encoded}/canvases`).then((result) => {
      // A host without multi-board routes answers with no list: stay on the
      // legacy single-board routes rather than guessing.
      if (live && Array.isArray(result?.canvases)) { setBoards(result.canvases); setBoardsApi(true) }
    }).catch(() => {})
    api('/canvas/models').then((result) => { if (live) setModelOptions(result) }).catch(() => {})
    return () => { live = false }
  }, [encoded])
  const refreshBoards = async (withArchived = showArchived) => {
    try {
      const result = await api(`/projects/${encoded}/canvases${withArchived ? '?include_archived=true' : ''}`)
      if (Array.isArray(result?.canvases)) { setBoards(result.canvases); setBoardsApi(true); return result.canvases }
    } catch (failure) { /* legacy host: keep the single board */ }
    return null
  }
  // Everything that belongs to one board is dropped when another opens, so a
  // chat, review or plan from board A can never be acted on from board B.
  const resetBoardState = () => {
    chatToken.current += 1
    setSession(null); setReview(null); setChatLog([]); setPlanPanel(null); setBacklogConfirm(null); setAnswer('')
    setChatBusy(false); setBusy(false); setPlanBusy(false); setExpanded(false); setStepsDraft(null)
    setDirty(false); setSelectedId(null); setSelectedIds([]); setPendingConnect(null)
    setHistory([]); setFuture([]); setMarquee(null); setLinkSource(''); setLinkTarget('')
  }
  const loadBoard = (fresh) => {
    resetBoardState()
    boardRef.current = fresh?.canvas_id ?? null
    setCanvas(fresh); setObjects(fresh?.objects ?? []); setConnectors(fresh?.connectors ?? [])
    setTheme(fresh?.theme ?? null)
    // A new board starts at the origin, then fits only if a card is hidden.
    setPan({ x: 0, y: 0 }); setZoom(1); setFitTick((tick) => Math.max(2, tick + 1))
  }
  // Metadata-only merge (name/status/theme/model): never replaces local
  // objects, so a rename or theme flip keeps unsaved edits intact.
  // QA H-4: a response for another board is ignored, never merged.
  const mergeMeta = (fresh) => setCanvas((current) => (
    current?.canvas_id && fresh?.canvas_id && current.canvas_id !== fresh.canvas_id ? current : {
      ...(current ?? {}),
      name: fresh.name, status: fresh.status, archived_from: fresh.archived_from ?? null,
      theme: fresh.theme ?? null, model: fresh.model ?? null,
    }))
  // Re-read the open board's name/status after the server moved it on its own
  // (first AI run -> Submitted, plan -> Plan made).
  const refreshMeta = async (at) => {
    if (!boardsApiRef.current || !at) return
    try {
      const fresh = await api(boardPath(at))
      if (boardRef.current === at) mergeMeta(fresh)
    } catch (failure) { /* the next action reports it */ }
    refreshBoards()
  }
  // Anything that leaves this board with unsaved edits asks first:
  // Save and continue, Discard and continue, or Cancel.
  const guardUnsaved = (label, action) => {
    if (!dirtyRef.current) return action()
    setPendingLeave({ label, action })
    return null
  }
  const leaveSaving = async () => {
    const pending = pendingLeave
    if (!pending) return
    const ok = await save()
    // F-4: a conflict reload leaves nothing unsaved; close the prompt then.
    if (!ok) { if (!dirtyRef.current) setPendingLeave(null); return }
    setPendingLeave(null)
    await pending.action()
  }
  const leaveDiscarding = async () => {
    const pending = pendingLeave
    if (!pending) return
    setPendingLeave(null)
    dirtyRef.current = false
    setDirty(false); setHistory([]); setFuture([])
    setObjects(canvas?.objects ?? []); setConnectors(canvas?.connectors ?? [])
    await pending.action()
  }
  const openBoard = async (board) => {
    setBoardBusy(true)
    try {
      const fresh = await api(boardPath(board.canvas_id))
      loadBoard(fresh)
      setNotice({ tone: 'ok', text: `Доска ${fresh.name} открыта, ревизия ${fresh.revision}.` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Не удалось открыть доску: ${failureText(failure)}` }) }
    setBoardBusy(false)
  }
  const selectBoard = (board) => {
    if (!board?.canvas_id || board.canvas_id === canvas?.canvas_id) return null
    return guardUnsaved(`открыть ${board.name ?? 'эту доску'}`, () => openBoard(board))
  }
  const submitBoardForm = async () => {
    const name = String(boardForm?.name ?? '').trim()
    if (!name) { setNotice({ tone: 'danger', text: 'Доске нужно имя.' }); return }
    setBoardBusy(true)
    try {
      if (boardForm.mode === 'rename') {
        const at = boardRef.current
        const fresh = await api(boardPath(at), { method: 'PATCH', body: { name } })
        if (boardRef.current === at) {
          mergeMeta(fresh)
          setNotice({ tone: 'ok', text: `Доска переименована в ${fresh.name}.` })
        }
      } else {
        const created = await api(`/projects/${encoded}/canvases`, { method: 'POST', body: { name } })
        setBoardForm(null)
        await refreshBoards()
        setBoardBusy(false)
        // Opening the new board leaves this one: unsaved edits ask first.
        guardUnsaved(`открыть новую доску ${created.name} (она уже создана)`, () => openBoard(created))
        return
      }
      setBoardForm(null)
      await refreshBoards()
    } catch (failure) { setNotice({ tone: 'danger', text: `Не удалось сохранить доску: ${failureText(failure)}` }) }
    setBoardBusy(false)
  }
  const moveBoardStatus = async (status) => {
    const at = boardRef.current
    setBoardBusy(true)
    try {
      const fresh = await api(boardPath(at), { method: 'PATCH', body: { status } })
      if (boardRef.current !== at) return
      mergeMeta(fresh)
      await refreshBoards()
      setNotice({ tone: 'ok', text: `Доска теперь: ${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status}.` })
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось изменить статус: ${failureText(failure)}` })
    } finally { setBoardBusy(false) }
  }
  const changeBoardStatus = (status) => {
    if (!boardScoped || !status || status === boardStatus) return null
    setPendingStatus(status)
    return null
  }
  const confirmBoardStatus = () => {
    const status = pendingStatus
    setPendingStatus(null)
    if (!status || status === boardStatus) return null
    // Only a move INTO a read-only status would strand unsaved edits; a
    // reopen (e.g. Completed -> Plan made) keeps them so they can be saved.
    if (CANVAS_READ_ONLY.includes(status)) return guardUnsaved(`перевести эту доску в «${CANVAS_BOARD_STATUS_LABELS[status] ?? status}»`, () => moveBoardStatus(status))
    return moveBoardStatus(status)
  }
  const archiveBoard = (board) => {
    if (board.canvas_id === canvas?.canvas_id) return guardUnsaved(`архивировать ${board.name}`, () => archiveNow(board))
    return archiveNow(board)
  }
  const archiveNow = async (board) => {
    const active = board.canvas_id === canvas?.canvas_id
    setBoardBusy(true)
    try {
      await api(boardPath(board.canvas_id), { method: 'PATCH', body: { status: 'archived' } })
      const list = await refreshBoards()
      if (active) {
        // Never leave an archived board open: move to the next live board, or
        // let the legacy route create a fresh "Main board" when none is left.
        const next = (list ?? []).find((row) => row.status !== 'archived' && row.canvas_id !== board.canvas_id)
        const fresh = next ? await api(boardPath(next.canvas_id)) : await api(`/projects/${encoded}/canvas`)
        loadBoard(fresh)
        if (!next) await refreshBoards()
      }
      setNotice({ tone: 'ok', text: `Доска ${board.name} в архиве — восстановить её можно через «Показать архивные».` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Не удалось архивировать доску: ${failureText(failure)}` }) }
    setBoardBusy(false)
  }
  const restoreBoard = async (board) => {
    setBoardBusy(true)
    try {
      const fresh = await api(boardPath(board.canvas_id), { method: 'PATCH', body: { status: board.archived_from ?? 'draft' } })
      await refreshBoards()
      // Restoring the open board's twin never swaps what is open.
      setNotice({ tone: 'ok', text: `Доска ${fresh.name} восстановлена как «${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status}».` })
    } catch (failure) { setNotice({ tone: 'danger', text: `Не удалось восстановить доску: ${failureText(failure)}` }) }
    setBoardBusy(false)
  }
  const toggleArchived = async () => {
    const next = !showArchived
    setShowArchived(next)
    await refreshBoards(next)
  }
  // D19: the theme is per board and only changes the canvas area.
  const setBoardTheme = async (picked) => {
    const previous = theme
    // Clicking the theme a board already chose returns it to "follow the app".
    const nextTheme = picked === theme ? null : picked
    setTheme(nextTheme)
    if (!boardScoped) return
    const at = boardRef.current
    try {
      const fresh = await api(boardPath(at), { method: 'PATCH', body: { theme: nextTheme } })
      if (boardRef.current === at) mergeMeta(fresh)
    } catch (failure) {
      if (boardRef.current !== at) return
      setTheme(previous)
      setNotice({ tone: 'danger', text: `Не удалось сохранить тему: ${failureText(failure)}` })
    }
  }
  // D16: per-board model. '' means the Hermes main model.
  const modelKey = (model) => (model?.provider && model?.model ? `${model.provider}::${model.model}` : '')
  const setBoardModel = async (value) => {
    if (!boardScoped) return
    const [provider, ...rest] = String(value || '').split('::')
    const model = value ? { provider, model: rest.join('::') } : null
    const at = boardRef.current
    setBoardBusy(true)
    try {
      const fresh = await api(boardPath(at), { method: 'PATCH', body: { model } })
      if (boardRef.current !== at) return
      mergeMeta(fresh)
      setNotice({ tone: 'ok', text: model ? `Эта доска теперь использует модель ${model.model}.` : 'Доска теперь использует основную модель Hermes.' })
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось задать модель: ${failureText(failure)}` })
    } finally { setBoardBusy(false) }
  }
  const selectedColour = selected?.colour ?? null
  const setSelectedColour = (colour) => {
    if (!selected || readOnly) return
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, colour: colour || null } : item))
    setHistory((current) => [...current.slice(-49), before]); setFuture([]); setDirty(true)
  }
  // D15: the chat window can be dragged (pointer or arrow keys), minimised to
  // a pill and expanded; it is always kept inside the stage.
  const clampChat = (x, y) => {
    const stage = stageRef.current
    const chat = chatRef.current
    if (!stage || !chat) return { x, y }
    return {
      x: canvasClamp(x, 0, Math.max(0, stage.clientWidth - chat.offsetWidth)),
      // A normal drag may lift the window partly above the stage; an
      // extreme pointer jump (e.g. to -2000,-2000) snaps it back inside.
      y: canvasClamp(y < -stage.clientHeight ? 0 : y, -Math.max(0, chat.offsetHeight - 40), Math.max(0, stage.clientHeight - chat.offsetHeight)),
    }
  }
  useEffect(() => {
    if (!chatPos) return undefined
    const fix = () => setChatPos((current) => {
      if (!current) return current
      const next = clampChat(current.x, current.y)
      return next.x === current.x && next.y === current.y ? current : next
    })
    fix()
    window.addEventListener('resize', fix)
    return () => window.removeEventListener('resize', fix)
  }, [chatPos, chatOpen, chatPill])
  const beginChatDrag = (event) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    const stage = stageRef.current
    const chat = chatRef.current
    if (!stage || !chat) return
    const stageBox = stage.getBoundingClientRect()
    const chatBox = chat.getBoundingClientRect()
    const offsetX = event.clientX - chatBox.left
    const offsetY = event.clientY - chatBox.top
    setChatDragging(true)
    const move = (moveEvent) => setChatPos(clampChat(moveEvent.clientX - stageBox.left - offsetX, moveEvent.clientY - stageBox.top - offsetY))
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      setChatDragging(false)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  const nudgeChat = (event) => {
    const chat = chatRef.current
    if (!chat) return
    if (event.key === 'Home') { event.preventDefault(); setChatPos(null); return }
    const step = event.shiftKey ? 48 : 16
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key]
    if (!delta) return
    event.preventDefault()
    setChatPos(clampChat(chat.offsetLeft + delta[0], chat.offsetTop + delta[1]))
  }
  const minimiseChat = () => { setChatPill(true); setChatOpen(false) }
  const toggleChat = () => {
    if (chatPill) { setChatPill(false); setChatOpen(true); return }
    setChatOpen((current) => !current)
  }
  const openExpanded = () => { setExpanded(true); setChatPill(false) }
  useEffect(() => {
    if (!addMenuOpen) return undefined
    const close = (event) => { if (!addMenuRef.current?.contains(event.target)) setAddMenuOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [addMenuOpen])

  const snapshot = (currentObjects, currentConnectors) => ({ objects: currentObjects.map((row) => ({ ...row })), connectors: currentConnectors.map((row) => ({ ...row })) })
  const undo = () => {
    if (readOnly) return
    setHistory((current) => {
      if (!current.length) return current
      const before = current[current.length - 1]
      setFuture((next) => [...next, snapshot(objects, connectors)])
      setObjects(before.objects); setConnectors(before.connectors); setDirty(true)
      return current.slice(0, -1)
    })
  }
  const redo = () => {
    if (readOnly) return
    setFuture((current) => {
      if (!current.length) return current
      const after = current[current.length - 1]
      setHistory((next) => [...next, snapshot(objects, connectors)])
      setObjects(after.objects); setConnectors(after.connectors); setDirty(true)
      return current.slice(0, -1)
    })
  }
  const duplicateSelection = () => {
    if (readOnly) return
    const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : [])
    if (!ids.length) return
    const before = snapshot(objects, connectors)
    const stamp = Date.now()
    setObjects((current) => {
      const next = [...current]
      ids.forEach((id) => {
        const origin = current.find((row) => row.id === id)
        if (!origin) return
        canvasObjectSeq += 1
        const rect = canvasRect(origin)
        next.push({
          ...origin,
          id: `canvas-obj-${stamp}-${canvasObjectSeq}`,
          content: { ...(origin.content ?? {}) },
          tags: [...(origin.tags ?? [])],
          x: canvasClamp(rect.x + 24, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
          y: canvasClamp(rect.y + 24, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y),
        })
      })
      return next
    })
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: `Дублировано объектов: ${ids.length} — «Сохранить холст», чтобы закрепить копии.` })
  }
  const persistableObjects = () => objects.map((item) => ({
    id: item.id, kind: item.kind, content: item.content ?? { text: canvasText(item) },
    x: canvasNumber(item.x), y: canvasNumber(item.y),
    width: canvasNumber(item.width) || CANVAS_CARD.width, height: canvasNumber(item.height) || CANVAS_CARD.height,
    tags: Array.isArray(item.tags) ? item.tags : [],
    evidence_ref: item.evidence_ref ?? null, work_ref: item.work_ref ?? null,
    colour: CANVAS_STICKER_COLOURS.includes(item.colour) ? item.colour : null,
  }))
  const persistableConnectors = (rows) => {
    const ids = new Set(rows.map((item) => item.id))
    return connectors
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, meaning: edge.meaning }))
  }
  const reload = async () => {
    setBusy(true)
    const at = boardRef.current
    try {
      const fresh = await api(canvasRoute)
      if (boardRef.current !== at) return
      const discarded = dirty
      setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? [])
      setDirty(false); setSelectedId(null); setHistory([]); setFuture([]); setSelectedIds([])
      setNotice(discarded
        ? { tone: 'danger', text: `Холст перечитан на ревизии ${fresh.revision} — несохранённые правки отброшены, не применены.` }
        : { tone: 'ok', text: `Холст перечитан на ревизии ${fresh.revision}.` })
    } catch (failure) { if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось перечитать: ${failureText(failure)}` }) }
    setBusy(false)
  }
  const save = async () => {
    if (readOnly) { setNotice({ tone: 'danger', text: `Эта доска в состоянии «${CANVAS_BOARD_STATUS_LABELS[boardStatus]}» и доступна только для чтения — чтобы править, верните её в «План составлен».` }); return false }
    const at = boardRef.current
    setBusy(true)
    try {
      const rows = persistableObjects()
      const edges = persistableConnectors(rows)
      const saved = await api(canvasRoute, { method: 'PUT', body: { expected_revision: revision, objects: rows, connectors: edges } })
      if (boardRef.current !== at) return false
      dirtyRef.current = false
      setCanvas(saved); setObjects(saved.objects ?? []); setConnectors(saved.connectors ?? []); setDirty(false)
      refreshBoards()
      setNotice({ tone: 'ok', text: `${CANVAS_WORDS.canvasSaved} — ревизия ${saved.revision}, объектов: ${(saved.objects ?? []).length}, связей: ${(saved.connectors ?? []).length}.` })
      onRefresh?.()
      return true
    } catch (failure) {
      if (boardRef.current !== at) return false
      const message = failureText(failure)
      if (/\b409\b|conflict|board_locked|read-only/i.test(message)) {
        try {
          const fresh = await api(canvasRoute)
          if (boardRef.current !== at) return false
          if (CANVAS_READ_ONLY.includes(fresh.status ?? 'draft') || /board_locked|read-only/i.test(message)) {
            // QA M-1: the board was locked elsewhere. That is not a revision
            // conflict: keep the edits on screen and say how to save them.
            mergeMeta(fresh)
            refreshBoards()
            setNotice({ tone: 'danger', text: `Не сохранено — эта доска теперь «${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status}» и только для чтения. Правки остались здесь: верните доску в «План составлен» (или восстановите её), затем сохраните.` })
          } else {
            // Stale revision: never overwrite silently. Re-read the canonical
            // canvas, state the conflict, and keep the unsaved edit out of it.
            dirtyRef.current = false
            setCanvas(fresh); setObjects(fresh.objects ?? []); setConnectors(fresh.connectors ?? []); setDirty(false)
            setNotice({ tone: 'danger', text: `Конфликт ревизий — холст изменился в другом месте и был перечитан на ревизии ${fresh.revision}. Несохранённая правка не применена.` })
          }
        } catch (reloadFailure) { setNotice({ tone: 'danger', text: `Не удалось сохранить холст: ${message}` }) }
      } else {
        setNotice({ tone: 'danger', text: `Не удалось сохранить холст: ${message}` })
      }
      return false
    } finally {
      if (boardRef.current === at) setBusy(false)
    }
  }
  saveRef.current = save
  const addObject = (objectKind, text) => {
    const body = String(text ?? '').trim()
    if (!body || readOnly) return null
    const before = snapshot(objects, connectors)
    const position = canvasPlaced(objects)
    canvasObjectSeq += 1
    const item = {
      id: `canvas-obj-${Date.now()}-${canvasObjectSeq}`, kind: objectKind, content: { text: body },
      ...(objectKind === 'media' ? { height: 230 } : {}),
      x: position.x, y: position.y, width: CANVAS_CARD.width, height: CANVAS_CARD.height,
      tags: [], evidence_ref: null, work_ref: null,
    }
    setObjects((current) => [...current, item])
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: `${CANVAS_KIND_LABELS[objectKind] ?? objectKind} добавлено как черновик — «Сохранить холст», чтобы закрепить.` })
    return item
  }
  const addFromDraft = () => {
    if (!addObject(kind, draft)) return
    setDraft('')
  }
  const openDrawer = (item) => {
    setSelectedId(item.id)
    setDrawerText(canvasText(item))
    setDrawerKind(item.kind)
    const { text: _text, ...rest } = item.content ?? {}
    setDrawerFields({ ...rest, links: linksOf(item.content ?? {}).map((link) => ({ url: link.url ?? '', label: link.label ?? '' })) })
  }
  const setField = (field, value) => setDrawerFields((current) => ({ ...current, [field]: value }))
  const uploadImage = async (file) => {
    if (!file || readOnly) return
    const mediaType = CANVAS_IMAGE_TYPES[file.type] ? file.type : null
    if (!mediaType) { setNotice({ tone: 'danger', text: 'Выберите изображение PNG, JPEG или WebP. Видео — на следующем этапе.' }); return }
    if (file.size <= 0 || file.size > CANVAS_IMAGE_MAX) { setNotice({ tone: 'danger', text: 'Изображения должны быть меньше 5 МБ.' }); return }
    setImageBusy(true)
    try {
      const created = await api(`/projects/${encodeURIComponent(project.id)}/content`, { method: 'POST', body: { filename: file.name, media_type: mediaType, content_base64: await fileAsBase64(file) } })
      setField('content_id', created.content_id)
      const guess = String(file.name).replace(/\.[a-z0-9]+$/i, '').slice(0, 300)
      setDrawerFields((current) => (current.alt ? current : { ...current, alt: guess }))
      setNotice({ tone: 'ok', text: 'Изображение загружено — нажмите «Применить», затем «Сохранить холст», чтобы разместить его на карточке.' })
    } catch (failure) {
      setNotice({ tone: 'danger', text: `Не удалось загрузить изображение: ${failureText(failure)}` })
    } finally { setImageBusy(false) }
  }
  const applyDrawer = () => {
    // QA H-5: a read-only board shows details but never becomes dirty.
    if (!selected || readOnly) return
    const text = drawerText.trim()
    if (!text) return
    if (richProblem) { setNotice({ tone: 'danger', text: richProblem }); return }
    const links = (drawerFields.links ?? []).map((link) => ({ url: String(link.url ?? '').trim(), label: String(link.label ?? '').trim() })).filter((link) => link.url)
    const bad = links.find((link) => !canvasSafeUrl(link.url))
    if (bad) { setNotice({ tone: 'danger', text: `«${bad.url.slice(0, 60)}» — ${CANVAS_WORDS.notWebLink}. Ссылки должны начинаться с http:// или https://.` }); return }
    if (links.length > 20) { setNotice({ tone: 'danger', text: 'Карточка вмещает не более 20 связей.' }); return }
    const fields = {
      ...drawerFields,
      links: links.map((link) => (link.label ? link : { url: link.url })),
      ...(Array.isArray(drawerFields.alternatives) ? { alternatives: drawerFields.alternatives.map((v) => String(v).trim()).filter(Boolean) } : {}),
      ...(Array.isArray(drawerFields.checklist) ? { checklist: drawerFields.checklist.map((v) => ({ text: String(v.text ?? '').trim(), done: Boolean(v.done) })).filter((v) => v.text) } : {}),
    }
    // Links are always stored as a list; a legacy single `url` moves into it,
    // so removing that row really removes it.
    if (typeof selected.content?.url === 'string' && !Array.isArray(selected.content?.links)) fields.url = ''
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, kind: drawerKind, content: { ...(item.content ?? {}), ...fields, text } } : item))
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Объект обновлён — «Сохранить холст», чтобы закрепить изменение.' })
  }
  const removeSelected = async () => {
    if (!selected || readOnly) return
    const before = snapshot(objects, connectors)
    const persistable = new Set((canvas?.objects ?? []).map((row) => row.id))
    // A persisted object with no other unsaved work goes through the real
    // DELETE route (revision bumped server-side). Anything else is removed
    // locally and persisted by the next save — never two half-writes.
    if (!persistable.has(selected.id) || dirty) {
      const wasPersisted = persistable.has(selected.id)
      const removedId = selected.id
      setObjects((current) => current.filter((row) => row.id !== removedId))
      setConnectors((current) => current.filter((edge) => edge.source !== removedId && edge.target !== removedId))
      setHistory((current) => [...current.slice(-49), before]); setFuture([])
      setDirty(true); setSelectedId(null)
      setNotice({ tone: 'ok', text: wasPersisted ? 'Удалено локально — «Сохранить холст», чтобы закрепить удаление.' : 'Черновой объект удалён — он никогда не сохранялся.' })
      return
    }
    const at = boardRef.current
    setBusy(true)
    try {
      const saved = await api(`${canvasRoute}/objects/${encodeURIComponent(selected.id)}?expected_revision=${revision}`, { method: 'DELETE' })
      if (boardRef.current !== at) return
      setCanvas(saved); setObjects(saved.objects ?? []); setConnectors(saved.connectors ?? []); setDirty(false); setSelectedId(null)
      setNotice({ tone: 'ok', text: `Объект удалён — ревизия ${saved.revision}, объектов: ${(saved.objects ?? []).length}.` })
      onRefresh?.()
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось удалить: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setBusy(false) }
  }
  const addConnector = (source, target, meaning) => {
    if (!source || !target || source === target) {
      setNotice({ tone: 'danger', text: 'Соединителю нужны два разных объекта.' })
      return
    }
    if (connectors.some((edge) => edge.source === source && edge.target === target && edge.meaning === meaning)) {
      setNotice({ tone: 'danger', text: `Уже связано: эти два объекта уже соединены связью «${meaning}».` })
      return
    }
    const before = snapshot(objects, connectors)
    canvasEdgeSeq += 1
    setConnectors((current) => [...current, { id: `canvas-edge-${Date.now()}-${canvasEdgeSeq}`, source, target, meaning }])
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: `Связь добавлена (${CANVAS_MEANING_LABELS[meaning] ?? meaning}) — «Сохранить холст», чтобы закрепить.` })
  }
  const connectFromEditor = () => addConnector(linkSource, linkTarget, linkMeaning)
  const beginObjectDrag = (event, item) => {
    if (event.button !== 0) return
    event.preventDefault()
    // A read-only board still opens the details panel, but nothing moves.
    if (readOnly) { openDrawer(item); return }
    if (mode === 'connect') {
      if (!pendingConnect) { setPendingConnect(item.id); setNotice({ tone: 'ok', text: 'Режим связи: выберите второй объект.' }); return }
      if (pendingConnect === item.id) { setPendingConnect(null); setNotice({ tone: 'ok', text: 'Связывание отменено — один и тот же объект выбран дважды (без самосвязей).' }); return }
      addConnector(pendingConnect, item.id, linkMeaning)
      setPendingConnect(null)
      return
    }
    const startX = event.clientX
    const startY = event.clientY
    const origin = canvasRect(item)
    let moved = false
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
      moved = true
      setObjects((current) => current.map((row) => row.id === item.id ? {
        ...row,
        x: canvasClamp(origin.x + dx / zoom, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
        y: canvasClamp(origin.y + dy / zoom, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y),
      } : row))
      setDirty(true)
    }
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      // Drag moves the card; a click (no travel) opens the drawer instead, so
      // the drawer can never cover the drop target mid-gesture.
      if (moved) {
        // Signed v1: de-overlap on drop, then state the save intent.
        setObjects((current) => canvasDeOverlap(current, item.id))
        setNotice({ tone: 'ok', text: 'Перемещено — «Сохранить холст», чтобы закрепить новую позицию.' })
      }
      else openDrawer(item)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  // Keep some of the board in view whatever the pan: the world can move
  // freely but never disappear off the stage entirely.
  const clampPan = (x, y, scale = zoomRef.current) => {
    const stage = stageRef.current
    if (!stage) return { x, y }
    const margin = 160
    const minX = Math.min(0, stage.clientWidth - CANVAS_WORLD.width * scale) - margin
    const minY = Math.min(0, stage.clientHeight - CANVAS_WORLD.height * scale) - margin
    return { x: canvasClamp(x, minX, margin), y: canvasClamp(y, minY, margin) }
  }
  // Empty stage: drag (or middle-drag) pans the board; Shift+drag draws a
  // marquee to select several stickers; a click with no travel clears the
  // selection. Scroll / trackpad pans too (see the wheel handler).
  const beginPan = (event) => {
    if (event.button !== 0 && event.button !== 1) return
    const target = event.target
    if (target?.closest?.('.dy-pc-obj') || target?.closest?.('.dy-pc-drawer') || target?.closest?.('.dy-pc-chat') || target?.closest?.('.dy-pc-overlay')) return
    // Connect mode: the left button never drags the board (owner 01/10 - the
    // pan fought the two-click link). A click on empty space drops a half-made
    // link; scroll and middle-drag still move around.
    if (mode === 'connect' && event.button === 0) {
      event.preventDefault()
      if (pendingConnect) { setPendingConnect(null); setConnectPointer(null); setNotice({ tone: 'ok', text: 'Связывание: отменено. Нажмите стикер, чтобы начать заново.' }) }
      return
    }
    const stageBox = stageRef.current?.getBoundingClientRect()
    if (!stageBox) return
    const startX = event.clientX
    const startY = event.clientY
    const originPan = { ...panRef.current }
    let moved = false
    if (mode === 'select' && event.shiftKey && event.button === 0) {
      const band = { x: startX - stageBox.x, y: startY - stageBox.y, width: 0, height: 0 }
      const marqueeMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
        moved = true
        band.x = dx < 0 ? startX - stageBox.x + dx : startX - stageBox.x
        band.y = dy < 0 ? startY - stageBox.y + dy : startY - stageBox.y
        band.width = Math.abs(dx)
        band.height = Math.abs(dy)
        setMarquee({ ...band })
      }
      const marqueeFinish = (moveEvent) => {
        document.removeEventListener('pointermove', marqueeMove)
        document.removeEventListener('pointerup', marqueeFinish)
        setMarquee(null)
        if (!moved) { setSelectedId(null); setPendingConnect(null); setSelectedIds([]); return }
        const scale = zoomRef.current
        const offset = panRef.current
        const x1 = (Math.min(startX, moveEvent.clientX) - stageBox.x - offset.x) / scale
        const y1 = (Math.min(startY, moveEvent.clientY) - stageBox.y - offset.y) / scale
        const x2 = (Math.max(startX, moveEvent.clientX) - stageBox.x - offset.x) / scale
        const y2 = (Math.max(startY, moveEvent.clientY) - stageBox.y - offset.y) / scale
        const hits = []
        objects.forEach((row) => {
          const rect = canvasRect(row)
          if (rect.x < x2 && rect.x + rect.width > x1 && rect.y < y2 && rect.y + rect.height > y1) hits.push(row.id)
        })
        setSelectedIds(hits)
        if (hits.length) setNotice({ tone: 'ok', text: `Рамкой выбрано объектов: ${hits.length}.` })
      }
      document.addEventListener('pointermove', marqueeMove)
      document.addEventListener('pointerup', marqueeFinish)
      return
    }
    if (event.button === 1) event.preventDefault()
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return
      if (!moved) setPanning(true)
      moved = true
      setPan(clampPan(originPan.x + dx, originPan.y + dy))
    }
    const finish = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', finish)
      setPanning(false)
      if (!moved) { setSelectedId(null); setPendingConnect(null); setSelectedIds([]) }
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', finish)
  }
  // Scroll / two-finger swipe pans; Ctrl/Cmd+scroll (and pinch) zooms around
  // the pointer. Registered natively so it can stop the page scrolling.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const onWheel = (event) => {
      if (event.target?.closest?.('.dy-pc-chat, .dy-pc-drawer, .dy-pc-overlay')) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? stage.clientHeight : 1)
      const current = zoomRef.current
      const offset = panRef.current
      if (event.ctrlKey || event.metaKey) {
        const box = stage.getBoundingClientRect()
        const px = event.clientX - box.left
        const py = event.clientY - box.top
        const next = Number(canvasClamp(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2))
        if (next === current) return
        const wx = (px - offset.x) / current
        const wy = (py - offset.y) / current
        setZoom(next)
        setPan(clampPan(px - wx * next, py - wy * next, next))
        return
      }
      const sideways = event.shiftKey && !event.deltaX
      const dx = (sideways ? event.deltaY : event.deltaX) * unit
      const dy = (sideways ? 0 : event.deltaY) * unit
      setPan(clampPan(offset.x - dx, offset.y - dy))
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])
  const zoomBy = (delta) => setZoom((current) => canvasClamp(Number((current + delta).toFixed(2)), CANVAS_ZOOM.min, CANVAS_ZOOM.max))
  const fit = () => {
    const stage = stageRef.current
    if (!stage || objects.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return }
    const box = stage.getBoundingClientRect()
    const rects = objects.map(canvasRect)
    const minX = Math.min(...rects.map((rect) => rect.x))
    const minY = Math.min(...rects.map((rect) => rect.y))
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.width))
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.height))
    // A docked (not dragged) chat sits over the stage. On a wide stage an open
    // chat takes the right-hand side; otherwise it sits along the bottom. Fit
    // keeps every card clear of it so none is hidden or unclickable.
    const chat = chatRef.current
    const docked = !chatPos && chat
    const reserveRight = docked && box.width >= 760 && chatOpen && !chatPill ? chat.offsetWidth + 28 : 0
    const reserveBottom = docked && !reserveRight ? chat.offsetHeight + 14 : 0
    const next = Number(canvasClamp(Math.min((box.width - 80 - reserveRight) / Math.max(1, maxX - minX), (box.height - 80 - reserveBottom) / Math.max(1, maxY - minY)), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2))
    setZoom(next)
    setPan({ x: 40 - minX * next, y: 40 - minY * next })
  }
  // True when a card is off the stage or under the docked chat window.
  const cardsObstructed = () => {
    const stage = stageRef.current
    if (!stage) return false
    const box = stage.getBoundingClientRect()
    const chat = !chatPos && chatRef.current ? chatRef.current.getBoundingClientRect() : null
    return [...stage.querySelectorAll('.dy-pc-obj')].some((el) => {
      const r = el.getBoundingClientRect()
      const outside = r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1
      const underChat = Boolean(chat) && r.left < chat.right && r.right > chat.left && r.top < chat.bottom && r.bottom > chat.top
      return outside || underChat
    })
  }
  // After a board opens, fit only when a card would otherwise be hidden.
  useEffect(() => {
    if (fitTick < 2) return undefined
    const frame = requestAnimationFrame(() => { if (cardsObstructed()) fit() })
    return () => cancelAnimationFrame(frame)
  }, [fitTick])
  // Opening the docked chat on a wide stage makes room if it would cover a card.
  useEffect(() => {
    if (!chatOpen || chatPill || chatPos) return undefined
    const frame = requestAnimationFrame(() => {
      if ((stageRef.current?.clientWidth ?? 0) >= 760 && cardsObstructed()) fit()
    })
    return () => cancelAnimationFrame(frame)
  }, [chatOpen, chatPill])
  // Tidy is a deterministic grid, not a layout engine: it only rewrites
  // positions and still needs the save that follows any other edit.
  const tidy = () => {
    if (readOnly) return
    const before = snapshot(objects, connectors)
    setObjects((current) => current.map((item, index) => ({ ...item, ...gridSlot(index, 3) })))
    setHistory((current) => [...current.slice(-49), before]); setFuture([])
    setDirty(true)
    setNotice({ tone: 'ok', text: 'Упорядочено в сетку — «Сохранить холст», чтобы закрепить новые позиции.' })
  }
  // Full keyboard support (signed v1): Del removes, Ctrl/Cmd+Z undo,
  // Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Ctrl/Cmd+D duplicate, Escape clears.
  const onStageKeyDown = (event) => {
    const key = event.key
    // Typing in a field (title, description editor, links, chat) must never
    // trigger board shortcuts: Delete/Backspace would remove the card and
    // Ctrl+Z would undo the board instead of the text.
    // The same goes for any button, link or toolbar with focus, and for
    // anything inside the details drawer, chat, overlays or link bar (Quan
    // re-check H1: Delete on a focused Bold button removed the open card).
    const target = event.target
    if (target && target !== stageRef.current && (target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
        || target.closest?.('.dy-pc-drawer, .dy-pc-chat, .dy-pc-overlay, .dy-pc-linkbar, [role="toolbar"]'))) {
      // Cards are buttons too: Delete on a focused card still removes it.
      if (!target.closest?.('.dy-pc-obj')) return
    }
    const meta = event.ctrlKey || event.metaKey
    if (key === 'Escape') { setSelectedId(null); setSelectedIds([]); setPendingConnect(null); return }
    // Arrow keys move around the board when nothing is selected.
    const arrow = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[key]
    if (arrow && !selectedId && !selectedIds.length && event.target === stageRef.current) {
      event.preventDefault()
      const step = event.shiftKey ? 240 : 80
      setPan(clampPan(panRef.current.x + arrow[0] * step, panRef.current.y + arrow[1] * step))
      return
    }
    // A completed or archived board is read-only: no keyboard edit applies.
    if (readOnly) return
    if (meta && key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo(); else undo()
      return
    }
    if (meta && key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
    if (meta && key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); return }
    if (key === 'Delete' || key === 'Backspace') {
      const ids = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : [])
      if (!ids.length) return
      event.preventDefault()
      const before = snapshot(objects, connectors)
      setObjects((current) => current.filter((row) => !ids.includes(row.id)))
      setConnectors((current) => current.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)))
      setHistory((current) => [...current.slice(-49), before]); setFuture([])
      setDirty(true); setSelectedId(null); setSelectedIds([])
      setNotice({ tone: 'ok', text: `Удалено локально объектов: ${ids.length} — «Сохранить холст», чтобы закрепить.` })
    }
  }
  const curate = async (message = null) => {
    if (readOnly) { setNotice({ tone: 'danger', text: `Эта доска «${CANVAS_BOARD_STATUS_LABELS[boardStatus]}» — откройте её заново, чтобы спросить стюарда.` }); return }
    const at = boardRef.current
    const token = ++chatToken.current
    setSelectedId(null); setSelectedIds([])
    setBusy(true); setChatOpen(true); setChatPill(false); setChatBusy(true)
    try {
      // Board-scoped: the chat always reads the board that is open, never
      // "the most recently updated board" the legacy route falls back to.
      const result = await api(`${canvasRoute}/sessions`, { method: 'POST', body: message ? { message } : {} })
      if (token !== chatToken.current || boardRef.current !== at) return
      setSession(result)
      refreshMeta(at)
      const proposals = (result.proposals ?? []).length
      setNotice(result.status === 'active' && result.current_question
        ? { tone: 'ok', text: `Вопрос: ${result.current_question.question}` }
        : { tone: 'ok', text: `Предложений к рассмотрению: ${number(proposals)} — ничего не применяется автоматически.` })
    } catch (failure) {
      if (token !== chatToken.current || boardRef.current !== at) return
      setNotice({ tone: 'danger', text: `Не удалось собрать предложения: ${failureText(failure)}` })
    }
    if (token === chatToken.current && boardRef.current === at) { setBusy(false); setChatBusy(false) }
  }
  const reviewCanvas = async () => {
    const at = boardRef.current
    setBusy(true); setChatOpen(true); setChatPill(false)
    try {
      const result = await api(`${canvasRoute}/curate`, { method: 'POST', body: {} })
      if (boardRef.current !== at) return
      setReview(result)
      const summary = result.summary ?? {}
      const questions = (result.clarifying_questions ?? []).length
      setNotice({ tone: 'ok', text: `Обзор: доказательств ${number(summary.evidence_count)}, утверждений ${number(summary.claim_count)}, вопросов ${number(summary.question_count)}, блоков плана ${number(summary.plan_block_count)} — ${questions ? `без ответа вопросов: ${number(questions)}` : 'открытых вопросов нет'}.` })
    } catch (failure) { if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось провести обзор: ${failureText(failure)}` }) }
    if (boardRef.current === at) setBusy(false)
  }
  const answerQuestion = async (outcome) => {
    if (!session?.session_id) return
    const at = boardRef.current
    setBusy(true)
    try {
      const result = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}/answer`, { method: 'POST', body: { outcome, answer } })
      if (boardRef.current !== at) return
      setSession(result); setAnswer('')
      const proposals = (result.proposals ?? []).length
      if (result.status === 'active' && result.current_question) setNotice({ tone: 'ok', text: `Вопрос: ${result.current_question.question}` })
      else if (outcome === 'stop') setNotice({ tone: 'ok', text: `Сессия остановлена — предложений сохранено как черновик: ${number(proposals)}.` })
      else setNotice({ tone: 'ok', text: `Предложений к рассмотрению: ${number(proposals)} — одобрите или отклоните каждое.` })
    } catch (failure) { if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось отправить ответ: ${failureText(failure)}` }) }
    if (boardRef.current === at) setBusy(false)
  }
  // The docked assistant chat: Enter sends, Shift+Enter newline, Stop
  // interrupts a pending ask. The log is real state, never simulated replies.
  const sendChat = async () => {
    const text = chatDraft.trim()
    if (!text || chatBusy) return
    setChatLog((current) => [...current, { role: 'me', text }])
    setChatDraft('')
    await curate(text)
  }
  const stopChat = () => {
    // Invalidate the pending ask so a late answer is dropped, not shown.
    chatToken.current += 1
    setChatBusy(false)
    setBusy(false)
    setNotice({ tone: 'ok', text: 'Остановлено — этот ответ здесь будет проигнорирован. Стюард может всё же завершить и записать его; без твоего одобрения на доску ничего не применяется.' })
  }
  const decideProposal = async (proposal, approve) => {
    const at = boardRef.current
    setBusy(true)
    try {
      const result = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/decision`, { method: 'POST', body: { approve, project_id: project.id } })
      if (boardRef.current !== at) return
      // Read the decision back from the session rather than trusting the local
      // optimistic flip; the recorded status is the one that counts.
      if (session?.session_id) {
        try {
          const fresh = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}`)
          if (boardRef.current !== at) return
          setSession(fresh)
        } catch (readFailure) {
          setSession((current) => current ? { ...current, proposals: (current.proposals ?? []).map((row) => row.proposal_id === result.proposal_id ? { ...row, status: result.status } : row) } : current)
        }
      }
      setNotice({ tone: 'ok', text: `Предложение ${result.status === 'approved' ? 'одобрено' : 'отклонено'} — только записано; холст не меняется, пока вы не сохраните правку.` })
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось принять решение: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setBusy(false) }
  }
  // Plan synthesis (NEW-3): from an APPROVED technical_plan proposal only.
  const synthesizePlan = async (proposal) => {
    const at = boardRef.current
    setPlanBusy(true)
    try {
      const plan = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/plan`, { method: 'POST', body: { project_id: project.id }, suppressErrorToast: true })
      if (boardRef.current !== at) return
      setPlanPanel(plan)
      refreshMeta(at)
      const edited = plan.edited_by || (plan.status ?? 'draft') !== 'draft'
      setNotice({ tone: 'ok', text: edited
        ? `У этого предложения уже есть план (статус: ${plan.status ?? 'черновик'}) — он показан без изменений, ваши правки сохранены.`
        : `План составлен по одобренному предложению — шагов: ${number((plan.steps ?? []).length)}, на доску ничего не применено.` })
    } catch (failure) {
      if (boardRef.current !== at) return
      setPlanPanel(null)
      setNotice({ tone: 'danger', text: `Не удалось составить план: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setPlanBusy(false) }
  }
  const savePlanDocument = async () => {
    if (!planPanel?.plan_id) return
    const at = boardRef.current
    setPlanBusy(true)
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/document/save`, { method: 'POST', body: {} })
      if (boardRef.current !== at) return
      setPlanPanel((current) => ({ ...(current ?? {}), ...saved }))
      setNotice({ tone: 'ok', text: `${CANVAS_WORDS.documentSavedNotice} на вкладке «Материалы» в формате Markdown.` })
      onRefresh?.()
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось сохранить документ: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setPlanBusy(false) }
  }
  const planEditable = Boolean(planPanel?.plan_id) && (planPanel?.status ?? 'draft') === 'draft' && !readOnly
  const startStepEdit = () => {
    canvasObjectSeq += 1
    setStepsDraft((planPanel?.steps ?? []).map((step) => ({ key: `s${step.order}-${canvasObjectSeq}`, order: step.order, title: step.title ?? '' })))
    openExpanded()
  }
  const editStep = (index, patch) => setStepsDraft((current) => current.map((row, at) => at === index ? { ...row, ...patch } : row))
  const moveStep = (index, delta) => setStepsDraft((current) => {
    const to = index + delta
    if (to < 0 || to >= current.length) return current
    const next = [...current]
    const [row] = next.splice(index, 1)
    next.splice(to, 0, row)
    return next
  })
  const addStep = () => { canvasObjectSeq += 1; setStepsDraft((current) => [...(current ?? []), { key: `new-${canvasObjectSeq}`, order: null, title: '' }]) }
  const removeStep = (index) => setStepsDraft((current) => (current.length > 1 ? current.filter((_, at) => at !== index) : current))
  const saveSteps = async () => {
    if (!planPanel?.plan_id || !stepsDraft?.length) return
    if (stepsDraft.some((row) => !row.title.trim())) { setNotice({ tone: 'danger', text: 'Каждому шагу нужен заголовок — удалите пустые шаги перед сохранением.' }); return }
    const at = boardRef.current
    setPlanBusy(true)
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}`, {
        method: 'PATCH',
        body: { steps: stepsDraft.map((row) => (row.order ? { order: row.order, title: row.title.trim() } : { title: row.title.trim() })) },
      })
      if (boardRef.current !== at) return
      setPlanPanel((current) => ({ ...(current ?? {}), ...saved }))
      setStepsDraft(null)
      setNotice({ tone: 'ok', text: `Шаги плана сохранены — шагов: ${number((saved.steps ?? []).length)}.` })
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось сохранить шаги плана: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setPlanBusy(false) }
  }
  const planDocSaved = planPanel?.status === 'documented'
  const createdOrders = new Set((planPanel?.backlog_created ?? []).map((row) => row.order))
  const pendingSteps = (planPanel?.steps ?? []).map((step) => step.order).filter((order) => !createdOrders.has(order))
  const createBacklogItems = async () => {
    if (!planPanel?.plan_id || !backlogConfirm?.length) return
    const at = boardRef.current
    setPlanBusy(true)
    try {
      const result = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/backlog`, { method: 'POST', body: { step_orders: backlogConfirm, goal_id: backlogGoal === '' ? null : backlogGoal } })
      if (boardRef.current !== at) return
      setPlanPanel((current) => ({ ...(current ?? {}), backlog_created: result.backlog_created ?? [] }))
      setNotice({ tone: 'ok', text: `${CANVAS_WORDS.backlogCreatedNotice}: ${number((result.created ?? []).length)}: ${(result.created ?? []).map((row) => row.ref).join(', ')}.` })
      setBacklogConfirm(null)
      setBacklogGoal('')
      onRefresh?.()
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: 'danger', text: `Не удалось создать элементы бэклога: ${failureText(failure)}` })
    } finally { if (boardRef.current === at) setPlanBusy(false) }
  }
  // Batch L: load the project's goals for the optional backlog goal picker.
  useEffect(() => {
    if (!backlogConfirm?.length) return undefined
    let alive = true
    api(`/roadmap?project_id=${encoded}`)
      .then((result) => { if (alive) setBacklogGoals((result?.projects ?? [])[0]?.goals ?? []) })
      .catch(() => { if (alive) setBacklogGoals([]) })
    return () => { alive = false }
  }, [backlogConfirm?.length, encoded])
  const renderConnectors = () => {
    const byId = new Map(objects.map((item) => [item.id, item]))
    const laid = layoutConnectors(objects.map((item) => ({ ...item, ...canvasRect(item) })), connectors, (meaning) => CANVAS_MEANING_LABELS[meaning] ?? meaning, CANVAS_WORLD)
    const lines = [
      jsx('defs', { children: jsx('marker', { id: 'dy-pc-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', children: jsx('path', { className: 'dy-pc-arrowhead', d: 'M0,0 L10,5 L0,10 z' }) }) }, 'defs'),
    ]
    laid.forEach((edge) => {
      const box = edge.labelBox
      lines.push(jsx('line', { 'data-canvas-connector': edge.id, 'data-canvas-meaning': edge.meaning, 'data-canvas-source': edge.source, 'data-canvas-target': edge.target, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, markerEnd: 'url(#dy-pc-arrow)' }, edge.id))
      if (edge.leader) lines.push(jsx('line', { className: 'dy-pc-leader', x1: edge.anchor.x, y1: edge.anchor.y, x2: box.x + box.width / 2, y2: box.y + box.height / 2 }, `${edge.id}:leader`))
      lines.push(jsx('rect', { className: 'dy-pc-edge-chip', 'data-canvas-meaning': edge.meaning, x: box.x, y: box.y, width: box.width, height: box.height, rx: box.height / 2 }, `${edge.id}:chip`))
      lines.push(jsx('text', { className: 'dy-pc-edge-label', 'data-canvas-edge-label': edge.id, x: box.x + box.width / 2, y: box.y + box.height / 2, textAnchor: 'middle', dominantBaseline: 'central', children: edge.label }, `${edge.id}:label`))
    })
    if (pendingConnect) {
      const pending = byId.get(pendingConnect)
      if (pending) {
        const rect = canvasRect(pending)
        if (connectPointer) lines.push(jsx('line', { 'data-pc-pending': 'true', 'data-canvas-connect-preview': pendingConnect, x1: rect.x + rect.width / 2, y1: rect.y + rect.height / 2, x2: connectPointer.x, y2: connectPointer.y }, 'pending-line'))
        lines.push(jsx('circle', { 'data-canvas-pending': pendingConnect, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, r: 7 }, 'pending'))
      }
    }
    return lines
  }
  const renderFrames = () => layoutFrames(objects.map((item) => ({ ...item, ...canvasRect(item) })), CANVAS_WORLD).map((frame) =>
    jsx('div', { className: 'dy-pc-frame', 'data-canvas-frame': frame.tag, style: { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` }, children: frame.tag }, frame.tag))
  // Stage 1 details panel: description, links (+), then this kind's own fields.
  const renderFieldEditors = () => {
    const f = drawerFields
    const off = readOnly
    const out = []
    // Stage 2: Word-style formatted description. The server derives the plain
    // `description` copy from `description_doc`, so the two never disagree.
    out.push(jsx(RichTextEditor, { value: f.description_doc, fallbackText: f.description, readOnly: off, onChange: (doc, plain) => { setField('description_doc', plain ? doc : undefined); setField('description', plain || undefined) }, onProblem: setRichProblem, rest: { ...f, text: drawerText } }, `rt-${selected?.id}`))
    const links = f.links ?? []
    out.push(jsxs('fieldset', { className: 'dy-pc-fieldset', 'data-canvas-links': true, children: [
      jsx('legend', { children: `Связи${links.length ? ` (${links.length})` : ''}` }),
      ...links.map((link, index) => jsxs('div', { className: 'dy-pc-row', 'data-canvas-link-row': index, children: [
        jsx('input', { 'data-canvas-link-url': index, type: 'url', inputMode: 'url', placeholder: 'https://…', maxLength: 2048, value: link.url, disabled: off, 'aria-label': `Адрес связи ${index + 1}`, 'aria-invalid': link.url && !canvasSafeUrl(link.url) ? 'true' : undefined, onChange: (event) => setField('links', links.map((l, i) => (i === index ? { ...l, url: event.target.value } : l))) }),
        jsx('input', { 'data-canvas-link-label': index, placeholder: 'Метка (необязательно)', maxLength: 200, value: link.label, disabled: off, 'aria-label': `Метка связи ${index + 1}`, onChange: (event) => setField('links', links.map((l, i) => (i === index ? { ...l, label: event.target.value } : l))) }),
        canvasSafeUrl(link.url) ? jsx('a', { className: 'dy-pc-open', href: link.url.trim(), target: '_blank', rel: 'noopener noreferrer nofollow', title: 'Открыть связь', 'aria-label': `Открыть связь ${index + 1}`, children: jsx(Icon, { name: 'arrow-up-right' }) }) : null,
        off ? null : jsx(Button, { small: true, action: 'pc-link-remove', ariaLabel: `Удалить связь ${index + 1}`, onClick: () => setField('links', links.filter((_, i) => i !== index)), children: jsx(Icon, { name: 'x' }) }),
      ]}, `link-${index}`)),
      off ? null : jsx(Button, { small: true, action: 'pc-link-add', disabled: links.length >= 20, onClick: () => setField('links', [...links, { url: '', label: '' }]), children: [jsx(Icon, { name: 'plus' }, 'i'), 'Добавить связь'] }),
    ]}))
    for (const [field, input, label, choices, max] of CANVAS_KIND_FIELDS[drawerKind] ?? []) {
      const value = f[field]
      let control
      if (input === 'choice') control = jsx('select', { 'data-canvas-field': field, value: value ?? '', disabled: off, onChange: (event) => setField(field, event.target.value), children: [jsx('option', { value: '', children: 'Не задано' }, ''), ...choices.map((c) => jsx('option', { value: c, children: canvasChoiceLabel(c) }, c))] })
      else if (input === 'member') {
        const known = members.includes(value)
        control = jsx('select', { 'data-canvas-field': field, value: value ?? '', disabled: off, onChange: (event) => setField(field, event.target.value), children: [
          jsx('option', { value: '', children: CANVAS_WORDS.unassigned }, ''),
          ...members.map((m) => jsx('option', { value: m, children: m }, m)),
          value && !known ? jsx('option', { value, children: `${value} (больше не участник)` }, 'former') : null,
        ] })
      } else if (input === 'date') control = jsx('input', { type: 'date', 'data-canvas-field': field, value: value ?? '', disabled: off, onChange: (event) => setField(field, event.target.value) })
      else if (input === 'area') control = jsx('textarea', { 'data-canvas-field': field, rows: 3, maxLength: max, value: value ?? '', readOnly: off, disabled: off, onChange: (event) => setField(field, event.target.value) })
      else if (input === 'text') control = jsx('input', { 'data-canvas-field': field, maxLength: max, value: value ?? '', readOnly: off, disabled: off, onChange: (event) => setField(field, event.target.value) })
      else if (input === 'list') {
        const rows = Array.isArray(value) ? value : []
        out.push(jsxs('fieldset', { className: 'dy-pc-fieldset', 'data-canvas-field': field, children: [
          jsx('legend', { children: label }),
          ...rows.map((row, index) => jsxs('div', { className: 'dy-pc-row', children: [
            jsx('input', { maxLength: 500, value: row, disabled: off, 'aria-label': `${label} ${index + 1}`, onChange: (event) => setField(field, rows.map((r, i) => (i === index ? event.target.value : r))) }),
            off ? null : jsx(Button, { small: true, ariaLabel: `Удалить ${label} ${index + 1}`, onClick: () => setField(field, rows.filter((_, i) => i !== index)), children: jsx(Icon, { name: 'x' }) }),
          ]}, index)),
          off ? null : jsx(Button, { small: true, action: `pc-${field}-add`, disabled: rows.length >= 50, onClick: () => setField(field, [...rows, '']), children: [jsx(Icon, { name: 'plus' }, 'i'), 'Добавить'] }),
        ]}))
        continue
      } else if (input === 'checklist') {
        const rows = Array.isArray(value) ? value : []
        out.push(jsxs('fieldset', { className: 'dy-pc-fieldset', 'data-canvas-field': field, children: [
          jsx('legend', { children: `${label}${rows.length ? ` (${rows.filter((r) => r.done).length}/${rows.length})` : ''}` }),
          ...rows.map((row, index) => jsxs('div', { className: 'dy-pc-row', children: [
            jsx('input', { type: 'checkbox', checked: Boolean(row.done), disabled: off, 'aria-label': `Готово: ${row.text || `элемент ${index + 1}`}`, onChange: (event) => setField(field, rows.map((r, i) => (i === index ? { ...r, done: event.target.checked } : r))) }),
            jsx('input', { maxLength: 300, value: row.text ?? '', disabled: off, 'aria-label': `Пункт чек-листа ${index + 1}`, onChange: (event) => setField(field, rows.map((r, i) => (i === index ? { ...r, text: event.target.value } : r))) }),
            off ? null : jsx(Button, { small: true, ariaLabel: `Удалить пункт чек-листа ${index + 1}`, onClick: () => setField(field, rows.filter((_, i) => i !== index)), children: jsx(Icon, { name: 'x' }) }),
          ]}, index)),
          off ? null : jsx(Button, { small: true, action: 'pc-checklist-add', disabled: rows.length >= 50, onClick: () => setField(field, [...rows, { text: '', done: false }]), children: [jsx(Icon, { name: 'plus' }, 'i'), 'Добавить элемент'] }),
        ]}))
        continue
      } else if (input === 'image') {
        out.push(jsxs('div', { className: 'dy-pc-fieldset', 'data-canvas-image-field': true, children: [
          jsx('span', { className: 'dy-pc-field-label', children: label }),
          value ? jsx('span', { className: 'dy-pc-drawer-thumb', children: jsx(CanvasImage, { projectId: project.id, contentId: value, alt: f.alt }) }) : jsx('p', { className: 'dy-pc-drawer-meta', children: 'Изображения пока нет.' }),
          off ? null : jsxs('label', { className: 'dy-pc-upload', children: [
            jsx('span', { children: imageBusy ? 'Загрузка…' : (value ? 'Заменить изображение' : 'Загрузить изображение (PNG, JPEG или WebP, до 5 МБ)') }),
            jsx('input', { type: 'file', 'data-canvas-image-upload': true, accept: 'image/png,image/jpeg,image/webp', disabled: imageBusy, onChange: (event) => { const file = event.target.files?.[0]; event.target.value = ''; uploadImage(file) } }),
          ]}),
          off || !value ? null : jsx(Button, { small: true, action: 'pc-image-clear', onClick: () => setField('content_id', ''), children: 'Убрать изображение с карточки' }),
        ]}))
        continue
      }
      out.push(jsxs('label', { children: [jsx('span', { children: label }), control] }))
    }
    return out
  }
  const renderObject = (item) => {
    const rect = canvasRect(item)
    const tag = (Array.isArray(item.tags) ? item.tags : [])[0]
    const label = CANVAS_KIND_LABELS[item.kind] ?? item.kind
    const multiSelected = selectedIds.includes(item.id)
    return jsxs('button', {
      type: 'button',
      className: `dy-pc-obj${selectedId === item.id ? ' selected' : ''}${pendingConnect === item.id ? ' pending' : ''}${multiSelected ? ' marquee-selected' : ''}`,
      'data-canvas-object': item.id,
      'data-canvas-kind': item.kind,
      'data-canvas-colour': item.colour ?? '',
      'data-canvas-x': String(Math.round(rect.x)),
      'data-canvas-y': String(Math.round(rect.y)),
      style: { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` },
      'data-canvas-height': String(Math.round(rect.height)),
      'aria-label': `${label}: ${canvasText(item) || 'без названия'}`,
      onPointerDown: (event) => beginObjectDrag(event, item),
      children: [
        jsx('small', { children: `${label}${tag ? ` · ${tag}` : ''}` }),
        jsx('span', { className: 'dy-pc-obj-kind-icon', 'aria-hidden': true, children: jsx(Icon, { name: CANVAS_KIND_ICONS[item.kind] ?? 'sticky-note' }) }),
        jsx('strong', { children: canvasText(item) || 'Объект без имени' }),
        item.kind === 'media' && item.content?.content_id ? jsx('span', { className: 'dy-pc-obj-thumb', children: jsx(CanvasImage, { projectId: project.id, contentId: item.content.content_id, alt: item.content.alt }) }) : null,
        canvasSummary(item) ? jsx('span', { className: 'dy-pc-obj-sub', 'data-canvas-summary': true, children: canvasSummary(item) }) : null,
        item.content?.description ? jsx('span', { className: 'dy-pc-obj-desc', children: item.content.description }) : null,
        jsx('span', { className: 'dy-pc-obj-meta', children: `${item.evidence_ref ? `доказательство ${item.evidence_ref}` : 'без ссылки на доказательства'}${item.work_ref ? ` · работа ${item.work_ref}` : ''}` }),
      ],
    }, item.id)
  }
  const pendingProposals = (session?.proposals ?? []).filter((proposal) => (proposal.status ?? 'pending') === 'pending').length
  const assistantSummary = session?.current_question
    ? 'Прежде чем что-либо предложить, мне нужно одно уточнение. Ничего не применяется автоматически.'
    : (session?.proposals ?? []).length
      ? `Черновиков предложений: ${number((session.proposals ?? []).length)} — одобрите или отклоните каждое. На холст ничего не применяется.`
      : 'Сессии пока не было. Запустите «Собрать предложения», чтобы разобрать этот холст; каждое предложение попадает в черновик и ждёт вашего решения.'
  const questionBlock = session?.current_question ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-question': session.current_question.id ?? 'question', children: [
    jsx('strong', { children: `Вопрос: ${session.current_question.question}` }),
    jsx('textarea', { 'data-canvas-answer': true, rows: 2, value: answer, placeholder: 'Ответьте — или пропустите, отложите либо остановите это уточнение…', onChange: (event) => setAnswer(event.target.value) }),
    jsxs('div', { className: 'dockyard-form-actions', children: [
      jsx(Button, { small: true, action: 'skip-canvas-question', disabled: busy, onClick: () => answerQuestion('skip'), children: 'Пропустить' }),
      jsx(Button, { small: true, action: 'defer-canvas-question', disabled: busy, onClick: () => answerQuestion('defer'), children: 'Отложить' }),
      jsx(Button, { small: true, action: 'stop-canvas-session', disabled: busy, onClick: () => answerQuestion('stop'), children: 'Остановить' }),
      jsx(Button, { small: true, variant: 'primary', action: 'answer-canvas-question', disabled: busy || !answer.trim(), onClick: () => answerQuestion('answer'), children: CANVAS_WORDS.answer }),
    ]}),
  ]}) : null
  const proposalCards = (session?.proposals ?? []).map((proposal) => {
    const status = proposal.status ?? 'pending'
    return jsxs('article', { className: 'dy-pc-proposal', 'data-canvas-proposal': proposal.proposal_id, 'data-canvas-proposal-status': status, children: [
      jsx('strong', { children: proposal.title ?? CANVAS_KIND_LABELS[proposal.kind] ?? proposal.kind ?? 'Предложение' }),
      jsx('small', { children: `${CANVAS_KIND_LABELS[proposal.kind] ?? 'предложение'} · ${status === 'pending' ? 'ждёт решения' : status === 'approved' ? 'одобрено' : 'отклонено'} · черновик + предложение · объектов-источников: ${number((proposal.source_object_ids ?? []).length)}` }),
      status === 'pending'
        ? jsxs('div', { className: 'dockyard-form-actions', children: [
            jsx(Button, { small: true, action: 'dismiss-canvas-proposal', disabled: busy, onClick: () => decideProposal(proposal, false), children: 'Отклонить' }),
            jsx(Button, { small: true, variant: 'primary', action: 'approve-canvas-proposal', disabled: busy, onClick: () => decideProposal(proposal, true), children: CANVAS_WORDS.approve }),
          ]})
        : status === 'approved' && proposal.kind === 'technical_plan'
          ? jsx(Button, { small: true, action: 'plan-from-proposal', disabled: planBusy, onClick: () => synthesizePlan(proposal), children: CANVAS_WORDS.planFromProposal })
          : jsx('small', { children: 'Решение записано — повторно по этому предложению решить нельзя.' }),
    ]}, proposal.proposal_id)
  })
  const chatBody = () => [
    jsx('div', { className: 'dy-pc-msg bot', children: assistantSummary }, 'summary'),
    jsx('div', { 'data-canvas-chat-log': true, ref: (node) => { if (node) node.lastElementChild?.scrollIntoView?.({ block: 'nearest' }) }, children: (chatLog ?? []).map((message, index) => jsx('div', { className: `dy-pc-msg ${message.role}`, children: message.text }, `chat-${index}`)) }, 'log'),
    questionBlock ? jsx('div', { children: questionBlock }, 'question') : null,
    review ? jsx('p', { className: 'dy-pc-drawer-meta', 'data-canvas-review': true, children: `Обзор: доказательств ${number(review.summary?.evidence_count)}, ${CANVAS_WORDS.reviewClaims} ${number(review.summary?.claim_count)}, вопросов ${number(review.summary?.question_count)}, блоков плана ${number(review.summary?.plan_block_count)}.` }, 'review') : null,
    proposalCards.length ? jsx('div', { 'data-canvas-proposals': true, children: proposalCards }, 'proposals') : null,
    session?.answers?.length ? jsx('div', { className: 'dy-pc-msg me', children: `Записано уточняющих ответов: ${number(session.answers.length)}.` }, 'answers') : null,
    planPanel ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-plan': planPanel.plan_id, children: [
      jsx('strong', { children: CANVAS_WORDS.planReady }),
      jsx('small', { children: `шагов: ${number((planPanel.steps ?? []).length)} · из предложения ${planPanel.proposal_id} · на доску ничего не применено.` }),
      jsx('pre', { className: 'dy-pc-plan-steps', children: (planPanel.steps ?? []).map((step) => `${step.order}. ${step.title}`).join('\n') }),
      jsxs('div', { className: 'dockyard-form-actions', children: [
        planEditable ? jsx(Button, { small: true, action: 'pc-steps-edit', disabled: planBusy, onClick: startStepEdit, children: 'Изменить шаги' }) : null,
        jsx(Button, { small: true, variant: planDocSaved ? '' : 'primary', action: 'save-plan-document', disabled: planBusy || planDocSaved, onClick: savePlanDocument, children: planDocSaved ? CANVAS_WORDS.docSavedToContent : CANVAS_WORDS.saveDocToContent }),
        jsx(Button, { small: true, variant: planDocSaved && pendingSteps.length ? 'primary' : '', action: 'backlog-from-plan', disabled: planBusy || !planDocSaved || !pendingSteps.length || Boolean(backlogConfirm?.length), onClick: () => setBacklogConfirm(pendingSteps), children: planDocSaved && !pendingSteps.length ? CANVAS_WORDS.backlogItemsCreated : CANVAS_WORDS.createBacklogItems }),
      ]}),
      backlogConfirm?.length ? jsxs('div', { className: 'dy-pc-proposal', 'data-canvas-backlog-confirm': true, children: [
        jsx('small', { children: `Создать элементов бэклога: ${number(backlogConfirm.length)}? Одно подтверждение на партию, ничего не запускается само.` }),
        jsxs('label', { className: 'dockyard-field', children: [jsx('span', { className: 'field-optional-hint', children: 'Цель (необязательно)' }), jsx('select', { 'aria-label': 'Цель', value: backlogGoal, onChange: (event) => setBacklogGoal(event.target.value), children: [
          jsx('option', { value: '', children: 'Ещё не размещено' }, 'none'),
          ...backlogGoals.map((goal) => jsx('option', { value: String(goal.id), children: goal.title }, String(goal.id))),
        ] })] }),
        jsx(Button, { small: true, variant: 'primary', action: 'confirm-backlog-from-plan', disabled: planBusy, onClick: createBacklogItems, children: CANVAS_WORDS.confirmCreate }),
        jsx(Button, { small: true, action: 'cancel-backlog-from-plan', disabled: planBusy, onClick: () => { setBacklogConfirm(null); setBacklogGoal('') }, children: 'Отмена' }),
      ]}) : null,
    ]}, 'plan') : null,
  ]
  // D17: one toolbar button = icon + accessible name + hover/focus tooltip
  // (name and one line). The tooltip is a sibling, so the button's accessible
  // name stays its short label.
  const tool = ({ action, icon, name, tip, onClick, disabled = false, variant = '', label = null, data = {} }) => jsxs('span', { className: 'dy-pc-tool', children: [
    jsx(Button, { small: true, variant, action, ariaLabel: name, disabled, onClick, data: { title: `${name} — ${tip}`, ...data }, children: label ? [jsx(Icon, { name: icon }, 'i'), jsx('span', { children: label }, 'l')] : jsx(Icon, { name: icon }) }),
    jsxs('span', { className: 'dy-pc-tip', role: 'tooltip', 'aria-hidden': true, children: [jsx('strong', { children: name }), jsx('span', { children: tip })] }),
  ]}, action)
  // Stage 3 ribbon: each group is a column with its name in the shared title
  // strip on top and its tools on the row beneath.
  const group = (id, label, children) => jsxs('div', { className: 'dy-pc-group', role: 'group', 'aria-label': label, 'data-pc-group': id, children: [
    jsx('span', { className: 'dy-pc-group-label', 'aria-hidden': true, children: label }, 'label'),
    jsxs('div', { className: 'dy-pc-group-tools', children }, 'tools'),
  ] })
  const liveBoards = boards.filter((board) => board.status !== 'archived')
  const archivedBoards = boards.filter((board) => board.status === 'archived')
  const listed = boardsApi ? liveBoards : [canvas].filter(Boolean)
  const statusMoves = CANVAS_BOARD_MOVES[boardStatus] ?? []
  const modelValue = modelKey(canvas?.model)
  const modelChoices = (modelOptions?.providers ?? []).flatMap((provider) => (provider.models ?? []).map((model) => ({ value: `${provider.slug}::${model}`, label: `${provider.name ?? provider.slug} · ${model}` })))
  // A board can keep a model Hermes no longer lists; show it rather than
  // silently displaying "default".
  if (modelValue && !modelChoices.some((choice) => choice.value === modelValue)) modelChoices.unshift({ value: modelValue, label: `${canvas.model.provider} · ${canvas.model.model} (не настроена)` })
  const defaultModelLabel = modelOptions?.default?.model ? `Основная модель Hermes (${modelOptions.default.model})` : 'Основная модель Hermes'
  const effectiveTheme = theme ?? hostTheme
  const chatState = chatPill ? 'pill' : (chatOpen ? 'open' : 'closed')
  const chatStyle = chatPos ? { left: `${chatPos.x}px`, top: `${chatPos.y}px`, right: 'auto', bottom: 'auto' } : undefined
  return jsxs('section', {
    className: 'dockyard-feature-card dy-pc-scope',
    'data-planning-canvas': project.id,
    'data-canvas-revision': String(revision),
    'data-canvas-dirty': dirty ? 'true' : 'false',
    'data-canvas-theme': effectiveTheme,
    'data-canvas-theme-source': theme ? 'board' : 'app',
    // Full screen: the page under the fixed frame is hidden (not just covered)
    // so its controls cannot be focused or hit-tested through the frame.
    'data-canvas-fullscreen-active': fullscreen ? 'true' : 'false',
    'data-canvas-board': canvas?.canvas_id ?? '',
    'data-canvas-status': boardStatus,
    onKeyDown: (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || boardForm) return
      if (pendingLeave) { setPendingLeave(null); return }
      if (pendingStatus) { setPendingStatus(null); return }
      if (expanded) { setExpanded(false); return }
      if (addMenuOpen) { setAddMenuOpen(false); return }
      if (selectedId || selectedIds.length) { setSelectedId(null); setSelectedIds([]); setPendingConnect(null); return }
      if (pendingConnect) { setPendingConnect(null); return }
      if (fullscreen) setFullscreen(false)
    },
    children: [
      jsxs('div', { className: `dy-pc-board-bar${boardListOpen ? ' open' : ' collapsed'}`, children: [
        jsx(Button, { small: true, action: 'pc-board-toggle', ariaLabel: boardListOpen ? 'Скрыть список досок' : 'Показать список досок', data: { title: boardListOpen ? 'Скрыть список досок' : 'Показать список досок', 'aria-expanded': boardListOpen ? 'true' : 'false', 'data-canvas-board-toggle': boardListOpen ? 'open' : 'closed' }, onClick: () => setBoardListOpen((value) => !value), children: jsx(Icon, { name: boardListOpen ? 'chevron-up' : 'chevron-down' }) }),
        jsxs('div', { className: 'dy-pc-board-title', children: [
          jsx('span', { className: 'dockyard-card-label', children: 'ОТКРЫТАЯ ДОСКА' }),
          jsx('strong', { 'data-canvas-board-name': true, children: canvas?.name ?? 'Доска планирования' }),
          jsxs('span', { className: 'dy-pc-board-chip', 'data-canvas-board-chip': boardStatus, children: [jsx('span', { className: 'dy-pc-board-dot', 'data-status': boardStatus }, 'd'), CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus, readOnly ? ' · только чтение' : ''] }),
          jsx('span', { className: 'dy-pc-board-count', children: `досок: ${listed.length || 1}` }),
        ]}),
        boardScoped ? jsxs('label', { className: 'dy-pc-board-status', children: [
          jsx('span', { className: 'dy-pc-board-dot', 'data-status': boardStatus }),
          jsxs('select', { 'data-canvas-board-status': true, 'aria-label': 'Статус доски', value: boardStatus, disabled: boardBusy || boardStatus === 'archived', onChange: (event) => changeBoardStatus(event.target.value), children: [
            jsx('option', { value: boardStatus, children: CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus }, boardStatus),
            ...statusMoves.map((status) => jsx('option', { value: status, children: `Перевести в «${CANVAS_BOARD_STATUS_LABELS[status]}»` }, status)),
          ]}),
        ]}) : null,
      ]}),
      boardListOpen ? jsxs('div', { className: 'dy-pc-board-panel', children: [
        // Actions sit ABOVE the list so they are found first.
        boardsApi ? (boardForm ? jsxs('div', { className: 'dy-pc-board-form', children: [
          jsx('input', { 'data-canvas-board-form': boardForm.mode, 'aria-label': boardForm.mode === 'rename' ? 'Имя новой доски' : 'Имя доски', maxLength: 120, value: boardForm.name, placeholder: 'Имя доски', autoFocus: true, onChange: (event) => setBoardForm({ ...boardForm, name: event.target.value }), onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); submitBoardForm() } if (event.key === 'Escape') setBoardForm(null) } }),
          jsx(Button, { small: true, variant: 'primary', action: 'pc-board-form-save', disabled: boardBusy || !String(boardForm.name ?? '').trim(), onClick: submitBoardForm, children: boardForm.mode === 'rename' ? 'Переименовать' : 'Создать доску' }),
          jsx(Button, { small: true, action: 'pc-board-form-cancel', onClick: () => setBoardForm(null), children: 'Отмена' }),
        ]}) : jsxs('div', { className: 'dy-pc-board-form', children: [
          jsx(Button, { small: true, variant: 'primary', action: 'pc-board-new', disabled: boardBusy, onClick: () => setBoardForm({ mode: 'create', name: '' }), children: [jsx(Icon, { name: 'plus' }, 'i'), 'Новая доска'] }),
          jsx(Button, { small: true, action: 'pc-board-rename', disabled: boardBusy || !boardScoped, onClick: () => setBoardForm({ mode: 'rename', name: canvas?.name ?? '' }), children: [jsx(Icon, { name: 'square-pen' }, 'i'), 'Переименовать открытую доску'] }),
          jsx(Button, { small: true, action: 'pc-board-show-archived', disabled: boardBusy, data: { 'aria-pressed': showArchived ? 'true' : 'false' }, onClick: toggleArchived, children: [jsx(Icon, { name: 'archive' }, 'i'), showArchived ? 'Скрыть архивные' : 'Показать архивные'] }),
        ]})) : null,
        jsxs('nav', { className: 'dy-pc-board-list', 'aria-label': 'Доски планирования', children: [
          ...listed.map((board) => {
            const active = board.canvas_id === canvas?.canvas_id
            return jsxs('div', { className: `dy-pc-board-item${active ? ' active' : ''}`, 'data-canvas-board-row': board.canvas_id ?? 'legacy', 'data-canvas-board-active': active ? 'true' : 'false', children: [
              jsxs('button', { type: 'button', className: `dy-pc-board-row${active ? ' active' : ''}`, 'aria-current': active ? 'true' : undefined, 'aria-label': active ? `${board.name ?? 'Основная доска'} (открыта)` : `Открыть ${board.name ?? 'доску'}`, disabled: boardBusy, onClick: () => selectBoard(board), children: [
                jsx('span', { className: 'dy-pc-board-dot', 'data-status': board.status ?? 'draft' }),
                jsxs('span', { className: 'dy-pc-board-row-copy', children: [jsx('strong', { children: board.name ?? 'Основная доска' }), jsx('small', { children: `${CANVAS_BOARD_STATUS_LABELS[board.status ?? 'draft'] ?? board.status} · объектов: ${number(board.object_count ?? board.objects?.length ?? 0)}` })] }),
                active ? jsx('span', { className: 'dy-pc-board-open', 'data-canvas-board-open': true, children: 'Открыть' }) : null,
                board.changed_since_plan ? jsx('span', { className: 'dy-pc-board-warning', title: 'Доска изменилась после составления плана', 'aria-label': 'Изменено с момента плана', children: '!' }) : null,
              ]}),
              boardsApi && board.canvas_id ? jsx(Button, { small: true, action: 'pc-board-archive', ariaLabel: `Архивировать ${board.name}`, data: { title: liveBoards.length > 1 ? `Архивировать ${board.name}` : 'Последнюю живую доску нельзя архивировать — сначала создайте другую' }, disabled: boardBusy || liveBoards.length <= 1, onClick: () => archiveBoard(board), children: jsx(Icon, { name: 'archive' }) }) : null,
            ]}, board.canvas_id ?? 'legacy')
          }),
          boardsApi && showArchived ? (archivedBoards.length
            ? archivedBoards.map((board) => jsxs('div', { className: 'dy-pc-board-item archived', 'data-canvas-board-row': board.canvas_id, 'data-canvas-board-archived': true, children: [
                jsxs('span', { className: 'dy-pc-board-row', children: [jsx('span', { className: 'dy-pc-board-dot', 'data-status': 'archived' }), jsxs('span', { className: 'dy-pc-board-row-copy', children: [jsx('strong', { children: board.name }), jsx('small', { children: `В архиве · был статус «${CANVAS_BOARD_STATUS_LABELS[board.archived_from] ?? 'Черновик'}»` })] })] }),
                jsx(Button, { small: true, action: 'pc-board-restore', ariaLabel: `Восстановить ${board.name}`, data: { title: `Восстановить ${board.name}` }, disabled: boardBusy, onClick: () => restoreBoard(board), children: jsx(Icon, { name: 'archive-restore' }) }),
              ]}, board.canvas_id))
            : [jsx('p', { className: 'dy-pc-board-archived', children: 'Нет архивных досок.' }, 'none')]) : null,
        ]}),
      ]}) : null,
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('span', { className: 'dockyard-card-label', children: 'ХОЛСТ ПЛАНИРОВАНИЯ' }),
          jsx('h2', { children: 'От доказательств к плану' }),
          jsx('p', { children: `Объектов: ${number(objects.length)}, связей: ${number(connectors.length)}, ревизия ${number(revision)}${dirty ? ' · есть несохранённые правки' : ' · сохранено'}${readOnly ? ` · ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} (только чтение)` : ''}. Стюард только предлагает; ничего не применяется автоматически.` }),
          content.length ? jsx('p', { className: 'dockyard-meta', children: `Доступно материалов проекта для ссылок: ${number(content.length)}.` }) : null,
        ]}),
      ]}),
      jsxs('div', { className: `dy-pc${fullscreen ? ' dy-pc-full' : ''}`, 'data-canvas-theme': theme ?? undefined, 'data-canvas-fullscreen': fullscreen ? 'true' : 'false', children: [
        jsxs('div', { className: 'dy-pc-toolbar dy-pc-ribbon', role: 'toolbar', 'aria-label': 'Инструменты канваса', children: [
          group('edit', CANVAS_WORDS.ribbonEdit, [
            tool({ action: 'pc-mode-select', icon: 'mouse-pointer-2', name: 'Выбрать', tip: 'Нажмите, чтобы править; перетащите стикер, чтобы переместить. Тяните пустое место или прокручивайте, чтобы двигаться; Shift+перетаскивание — выбор нескольких; Ctrl+прокрутка — масштаб.', variant: mode === 'select' ? 'primary' : '', onClick: () => { setMode('select'); setPendingConnect(null) } }),
            tool({ action: 'pc-mode-connect', icon: 'spline', name: 'Соединить', tip: 'Нажмите два стикера, чтобы связать их выбранным значением.', variant: mode === 'connect' ? 'primary' : '', disabled: readOnly, onClick: () => { setMode('connect'); setPendingConnect(null); setNotice({ tone: 'ok', text: 'Режим связи: нажмите стикер, затем стикер, с которым связать. Пока идёт связывание, перетаскивание выключено; прокрутка двигает холст, Esc отменяет.' }) } }),
            tool({ action: 'pc-undo', icon: 'undo-2', name: CANVAS_WORDS.undo, tip: 'Отменить одно изменение доски (Ctrl+Z).', disabled: !history.length || readOnly, onClick: undo }),
            tool({ action: 'pc-redo', icon: 'redo-2', name: CANVAS_WORDS.redo, tip: 'Повторно применить отменённую правку (Ctrl+Shift+Z).', disabled: !future.length || readOnly, onClick: redo }),
            tool({ action: 'pc-duplicate', icon: 'copy-plus', name: CANVAS_WORDS.duplicate, tip: 'Копировать выбранные стикеры (Ctrl+D).', disabled: !(selectedIds.length || selectedId) || readOnly, onClick: duplicateSelection }),
            tool({ action: 'pc-tidy', icon: 'layout-dashboard', name: 'Аккуратно', tip: 'Выровнять все стикеры по сетке.', disabled: !objects.length || readOnly, onClick: tidy }),
          ]),
          group('add', CANVAS_WORDS.ribbonAdd, [
            jsxs('div', { className: 'dy-pc-add', children: [
              jsx('select', { 'data-canvas-kind-picker': true, 'aria-label': 'Тип объекта', value: kind, disabled: readOnly, onChange: (event) => setKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx('option', { value, children: CANVAS_KIND_LABELS[value] }, value)) }),
              jsx('input', { 'data-canvas-draft': true, 'aria-label': 'Текст нового объекта', value: draft, disabled: readOnly, maxLength: 4000, placeholder: 'Заметка, вопрос или ссылка…', onChange: (event) => setDraft(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); addFromDraft() } } }),
              tool({ action: 'add-canvas-object', icon: 'plus', name: CANVAS_WORDS.addObject, tip: 'Добавить текст выше как стикер выбранного типа.', variant: 'primary', disabled: !draft.trim() || readOnly, onClick: addFromDraft }),
            ]}),
            jsxs('div', { className: 'dy-pc-tool', ref: addMenuRef, children: [
              jsx(Button, { small: true, action: 'pc-add-menu', ariaLabel: 'Добавить стикер', disabled: readOnly, data: { title: 'Добавить стикер — выберите тип, чтобы создать пустой стикер', 'aria-haspopup': 'menu', 'aria-expanded': addMenuOpen ? 'true' : 'false' }, onClick: () => setAddMenuOpen((value) => !value), children: [jsx(Icon, { name: 'sticky-note' }, 'i'), jsx(Icon, { name: 'chevron-down' }, 'c')] }),
              jsx('div', { className: 'dy-pc-addmenu', role: 'menu', 'aria-label': 'Добавить стикер', hidden: !addMenuOpen, children: CANVAS_OBJECT_KINDS.map((value) => jsxs('button', {
                type: 'button', role: 'menuitem', 'data-action': `add-canvas-${value}`, 'data-canvas-add-kind': value,
                onClick: () => { addObject(value, `Новое: ${CANVAS_KIND_LABELS[value]}`); setAddMenuOpen(false) },
                children: [jsx('span', { className: 'swatch', style: { background: `var(--dy-pc-fill-${value})`, borderLeft: `3px solid var(--dy-pc-kind-${value})` } }, 's'), jsx(Icon, { name: CANVAS_KIND_ICONS[value] }, 'i'), CANVAS_KIND_LABELS[value]],
              }, `add-${value}`)) }),
            ]}),
          ]),
          group('view', CANVAS_WORDS.ribbonView, [
            tool({ action: 'pc-zoom-out', icon: 'zoom-out', name: 'Отдалить', tip: 'Уменьшить вид доски.', onClick: () => zoomBy(-CANVAS_ZOOM.step) }),
            jsx('span', { className: 'dy-pc-readout', 'data-canvas-zoom-readout': String(Math.round(zoom * 100)), children: `${Math.round(zoom * 100)}%` }, 'zoom'),
            tool({ action: 'pc-zoom-in', icon: 'zoom-in', name: 'Приблизить', tip: 'Увеличить вид доски.', onClick: () => zoomBy(CANVAS_ZOOM.step) }),
            tool({ action: 'pc-fit', icon: 'scan', name: 'Вписать', tip: 'Вписать все стикеры в вид.', onClick: fit }),
            tool({ action: 'pc-fullscreen', icon: fullscreen ? 'minimize-2' : 'maximize-2', name: fullscreen ? 'Выйти из полноэкранного' : 'На весь экран', tip: fullscreen ? 'Назад к обычной раскладке (Esc).' : 'Отдать доске всё окно. Esc — назад.', variant: fullscreen ? 'primary' : '', onClick: () => setFullscreen((value) => !value), data: { 'aria-pressed': fullscreen ? 'true' : 'false' } }),
            tool({ action: 'pc-theme-light', icon: 'sun', name: 'Светлый канвас', tip: 'Светлый холст только для этой доски. Нажмите ещё раз, чтобы следовать за приложением.', variant: theme === 'light' ? 'primary' : '', onClick: () => setBoardTheme('light'), data: { 'aria-pressed': theme === 'light' ? 'true' : 'false' } }),
            tool({ action: 'pc-theme-dark', icon: 'moon', name: 'Тёмный канвас', tip: 'Тёмный светящийся холст только для этой доски. Нажмите ещё раз, чтобы следовать за приложением.', variant: theme === 'dark' ? 'primary' : '', onClick: () => setBoardTheme('dark'), data: { 'aria-pressed': theme === 'dark' ? 'true' : 'false' } }),
          ]),
          group('ai', CANVAS_WORDS.ribbonAi, [
            tool({ action: 'pc-curate', icon: 'sparkles', name: CANVAS_WORDS.curate, tip: 'Попросить стюарда превратить эту доску в предложения.', disabled: busy || readOnly, onClick: () => curate() }),
            tool({ action: 'pc-review', icon: 'list-checks', name: 'Обзор', tip: 'Подсчёт того, что есть на этой доске; ничего не отправляется ИИ.', disabled: busy, onClick: reviewCanvas }),
          ]),
          jsx('div', { className: 'dy-pc-ribbon-fill', 'aria-hidden': true }, 'fill'),
          group('save', CANVAS_WORDS.ribbonSave, [
            tool({ action: 'pc-reload', icon: 'refresh-cw', name: 'Перезагрузить', tip: 'Перечитать сохранённую доску; несохранённые правки отбрасываются.', disabled: busy, onClick: reload }),
            tool({ action: 'pc-save', icon: 'save', name: CANVAS_WORDS.saveCanvas, tip: 'Сохранить эту доску как новую ревизию.', variant: 'primary', label: busy ? 'Работаем…' : 'Сохранить', disabled: busy || readOnly, onClick: save }),
          ]),
        ]}),
        objects.length >= 2 && !readOnly ? jsxs('div', { className: 'dy-pc-linkbar', 'data-canvas-connector-editor': true, children: [
          jsxs('label', { children: [jsx('span', { children: 'От' }), jsx('select', { value: linkSource, onChange: (event) => setLinkSource(event.target.value), children: [jsx('option', { value: '', children: 'Выбрать источник' }, 'none'), ...objects.map((item) => jsx('option', { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsxs('label', { children: [jsx('span', { children: 'Связь' }), jsx('select', { value: linkMeaning, onChange: (event) => setLinkMeaning(event.target.value), children: CANVAS_CONNECTOR_MEANINGS.map((value) => jsx('option', { value, children: CANVAS_MEANING_LABELS[value] ?? value }, value)) })] }),
          jsxs('label', { children: [jsx('span', { children: 'К' }), jsx('select', { value: linkTarget, onChange: (event) => setLinkTarget(event.target.value), children: [jsx('option', { value: '', children: 'Выбрать назначение' }, 'none'), ...objects.map((item) => jsx('option', { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsx(Button, { small: true, action: 'connect-canvas-objects', disabled: !linkSource || !linkTarget || linkSource === linkTarget, onClick: connectFromEditor, children: 'Соединить объекты' }),
        ]}) : null,
        jsxs('div', {
          ref: stageRef,
          className: 'dy-pc-stage',
          'data-pc-stage': true,
          'data-pc-mode': mode,
          'data-pc-panning': panning ? 'true' : 'false',
          role: 'group',
          'aria-label': 'Этап канваса планирования',
          tabIndex: 0,
          onPointerDown: beginPan,
          onPointerMove: mode === 'connect' && pendingConnect ? (event) => {
            const box = stageRef.current?.getBoundingClientRect()
            if (!box) return
            setConnectPointer({ x: (event.clientX - box.left - panRef.current.x) / zoomRef.current, y: (event.clientY - box.top - panRef.current.y) / zoomRef.current })
          } : undefined,
          onKeyDown: onStageKeyDown,
          children: [
            jsxs('div', {
              className: 'dy-pc-world',
              'data-pc-world': true,
              'data-canvas-pan': `${Math.round(pan.x)},${Math.round(pan.y)}`,
              'data-canvas-zoom': String(Math.round(zoom * 100)),
              style: { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` },
              children: [
                jsx('svg', { className: 'dy-pc-svg', viewBox: `0 0 ${CANVAS_WORLD.width} ${CANVAS_WORLD.height}`, width: CANVAS_WORLD.width, height: CANVAS_WORLD.height, 'aria-hidden': true, children: renderConnectors() }),
                ...renderFrames(),
                ...objects.map(renderObject),
                marquee ? jsx('div', { className: 'dy-pc-marquee', 'data-pc-marquee': true, style: { left: `${marquee.x}px`, top: `${marquee.y}px`, width: `${marquee.width}px`, height: `${marquee.height}px` } }) : null,
                objects.length === 0 ? jsx('p', { className: 'dy-pc-empty', children: 'Объектов на холсте пока нет. Захватите заметку или доказательство выше и перетащите на место.' }) : null,
              ],
            }),
            jsx('div', { className: `dy-pc-backdrop${selected ? ' open' : ''}`, 'data-pc-backdrop': true, onClick: () => setSelectedId(null) }),
            jsxs('aside', { ref: chatRef, className: `dy-pc-chat ${chatState}${chatDragging ? ' dragging' : ''}${selected ? ' behind-drawer' : ''}`, 'data-canvas-assistant': true, 'data-canvas-chat-state': chatState, style: chatStyle, 'aria-label': 'Чат со стюардом', children: [
              jsxs('div', { className: 'dy-pc-chat-bar', children: [
                jsx('span', { className: 'dy-pc-chat-grip', 'data-canvas-chat-grip': true, role: 'button', tabIndex: 0, 'aria-label': 'Переместить окно чата (стрелки; Home — сброс)', title: 'Перетащите, чтобы сдвинуть · стрелки двигают · Home сбрасывает', onPointerDown: beginChatDrag, onKeyDown: nudgeChat, children: jsx(Icon, { name: 'grip-horizontal' }) }),
                jsxs('button', { type: 'button', className: 'dy-pc-chat-h', 'data-action': 'pc-chat-toggle', 'aria-expanded': chatOpen && !chatPill ? 'true' : 'false', onClick: toggleChat, children: [
                  jsx('span', { className: 'av', 'aria-hidden': true, children: jsx(Icon, { name: 'bot' }) }),
                  jsxs('span', { style: { flex: '1 1 auto', minWidth: 0 }, children: [
                    jsx('strong', { children: 'Steward' }),
                    chatPill ? null : jsx('span', { className: 'sub', children: session?.current_question ? 'идёт уточнение · ничего не применено' : `предложений ждёт: ${number(pendingProposals)} · ничего не применено` }),
                  ]}),
                  chatPill ? null : jsx('span', { className: 'tog', 'aria-hidden': true, children: chatOpen ? '▼' : '▲' }),
                ]}),
                chatPill ? null : jsx(Button, { small: true, action: 'pc-chat-minimise', ariaLabel: 'Свернуть чат в пилюлю', data: { title: 'Свернуть в пилюлю' }, onClick: minimiseChat, children: jsx(Icon, { name: 'minimize-2' }) }),
                chatPill ? null : jsx(Button, { small: true, action: 'pc-chat-expand', ariaLabel: 'Развернуть чат в большой вид', data: { title: 'Развернуть для чтения и правки планов' }, onClick: openExpanded, children: jsx(Icon, { name: 'maximize-2' }) }),
              ]}),
              boardScoped ? jsxs('label', { className: 'dy-pc-chat-model', children: [
                jsx('span', { children: 'Модель' }),
                jsxs('select', { 'data-canvas-model': true, 'aria-label': 'Модель для этой доски', value: modelValue, disabled: boardBusy || readOnly, onChange: (event) => setBoardModel(event.target.value), children: [
                  jsx('option', { value: '', children: defaultModelLabel }, 'default'),
                  ...modelChoices.map((choice) => jsx('option', { value: choice.value, children: choice.label }, choice.value)),
                ]}),
              ]}) : null,
              jsxs('div', { className: 'dy-pc-chat-b', children: chatBody() }),
              jsxs('div', { className: 'dy-pc-chat-f', children: [
                jsx('span', { className: 'dy-pc-readout', children: readOnly ? `Доска «${CANVAS_BOARD_STATUS_LABELS[boardStatus]}» — откройте её заново, чтобы общаться в чате.` : 'Контракт одобрения: только черновик + предложение.' }),
                jsx('input', { 'data-canvas-chat-input': true, 'aria-label': 'Написать стюарду', value: chatDraft, maxLength: 4000, disabled: readOnly, placeholder: 'Спросить стюарда об этой доске…', onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChat() } } }),
                jsx(Button, { small: true, action: 'pc-chat-send', ariaLabel: 'Отправить', disabled: chatBusy || !chatDraft.trim() || readOnly, onClick: sendChat, children: [jsx(Icon, { name: 'send' }, 'i'), 'Отправить'] }),
                jsx(Button, { small: true, action: 'pc-chat-stop', ariaLabel: 'Остановить', disabled: !chatBusy, onClick: stopChat, children: [jsx(Icon, { name: 'square' }, 'i'), 'Остановить'] }),
              ]}),
            ]}),
            expanded ? jsx('div', { className: 'dy-pc-overlay', 'data-canvas-expanded': stepsDraft ? 'steps' : 'chat', onPointerDown: (event) => { if (event.target === event.currentTarget) setExpanded(false) }, onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); setExpanded(false) } }, children: jsxs('div', { className: `dy-pc-overlay-card${stepsDraft ? ' steps' : ' chat'}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': stepsDraft ? 'Шаги плана' : 'Чат со стюардом — большой вид', children: [
              jsxs('div', { className: 'dy-pc-overlay-h', children: [
                jsx('span', { className: 'dy-pc-overlay-av', 'aria-hidden': true, children: jsx(Icon, { name: 'bot' }) }),
                jsxs('div', { className: 'dy-pc-overlay-title', children: [
                  jsx('strong', { children: stepsDraft ? 'Шаги плана' : 'Steward' }),
                  jsx('span', { children: `${canvas?.name ?? 'Доска планирования'} · ${CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus}` }),
                ]}),
                jsx(Button, { small: true, action: 'pc-expanded-close', ariaLabel: 'Закрыть большой вид', data: { title: 'Назад к канвасу (Esc)' }, onClick: () => setExpanded(false), children: jsx(Icon, { name: 'minimize-2' }) }),
              ]}),
              !stepsDraft && boardScoped ? jsxs('label', { className: 'dy-pc-chat-model dy-pc-overlay-model', children: [
                jsx('span', { children: 'Модель' }),
                jsxs('select', { 'aria-label': 'Модель доски (большое окно)', value: modelValue, disabled: boardBusy || readOnly, onChange: (event) => setBoardModel(event.target.value), children: [
                  jsx('option', { value: '', children: defaultModelLabel }, 'default'),
                  ...modelChoices.map((choice) => jsx('option', { value: choice.value, children: choice.label }, choice.value)),
                ]}),
              ]}) : null,
              jsxs('div', { className: 'dy-pc-overlay-b', 'data-canvas-expanded-body': true, children: [
                ...(stepsDraft ? [] : chatBody()),
                stepsDraft ? jsxs('div', { 'data-canvas-steps-editor': planPanel?.plan_id ?? true, children: [
                  jsx('p', { className: 'dy-pc-drawer-meta', children: 'Правьте, меняйте порядок, добавляйте и удаляйте шаги. У сохранённых шагов источники остаются; новые шаги начинаются без них.' }),
                  jsx('ol', { children: stepsDraft.map((row, index) => jsxs('li', { children: [
                    jsx('span', { children: `${index + 1}.` }),
                    jsx('input', { 'data-canvas-step-title': index, 'aria-label': `Заголовок шага ${index + 1}`, maxLength: 400, value: row.title, onChange: (event) => editStep(index, { title: event.target.value }) }),
                    jsx(Button, { small: true, action: 'pc-step-up', ariaLabel: `Поднять шаг ${index + 1}`, disabled: index === 0, onClick: () => moveStep(index, -1), children: '↑' }),
                    jsx(Button, { small: true, action: 'pc-step-down', ariaLabel: `Опустить шаг ${index + 1}`, disabled: index === stepsDraft.length - 1, onClick: () => moveStep(index, 1), children: '↓' }),
                    jsx(Button, { small: true, action: 'pc-step-remove', ariaLabel: `Удалить шаг ${index + 1}`, disabled: stepsDraft.length === 1, onClick: () => removeStep(index), children: jsx(Icon, { name: 'trash-2' }) }),
                  ]}, row.key)) }),
                ]}) : null,
              ]}),
              stepsDraft ? jsxs('div', { className: 'dy-pc-overlay-f', children: [
                jsx(Button, { small: true, action: 'pc-step-add', onClick: addStep, disabled: stepsDraft.length >= 50, children: [jsx(Icon, { name: 'plus' }, 'i'), 'Добавить шаг'] }),
                jsx(Button, { small: true, action: 'pc-steps-cancel', onClick: () => setStepsDraft(null), children: 'Отмена' }),
                jsx(Button, { small: true, variant: 'primary', action: 'pc-steps-save', disabled: planBusy, onClick: saveSteps, children: 'Сохранить шаги' }),
              ]}) : jsxs('div', { className: 'dy-pc-overlay-f dy-pc-overlay-composer', children: [
                jsx('textarea', { 'data-canvas-chat-input-large': true, 'aria-label': 'Написать стюарду (большое окно)', value: chatDraft, maxLength: 4000, rows: 3, disabled: readOnly, placeholder: readOnly ? `Доска «${CANVAS_BOARD_STATUS_LABELS[boardStatus]}» — откройте её заново, чтобы общаться в чате.` : 'Спросить стюарда об этой доске… (Enter — отправить, Shift+Enter — новая строка)', onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChat() } } }),
                jsxs('div', { className: 'dy-pc-overlay-actions', children: [
                  jsx(Button, { small: true, action: 'pc-chat-stop-large', ariaLabel: 'Остановить', disabled: !chatBusy, onClick: stopChat, children: [jsx(Icon, { name: 'square' }, 'i'), 'Остановить'] }),
                  jsx(Button, { small: true, variant: 'primary', action: 'pc-chat-send-large', ariaLabel: 'Отправить', disabled: chatBusy || !chatDraft.trim() || readOnly, onClick: sendChat, children: [jsx(Icon, { name: 'send' }, 'i'), 'Отправить'] }),
                ]}),
              ]}),
            ]}) }) : null,
            pendingStatus ? jsx('div', { className: 'dy-pc-overlay dy-pc-leave', 'data-canvas-status-confirm': pendingStatus, children: jsxs('div', { className: 'dy-pc-overlay-card dy-pc-leave-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'dy-pc-status-title', 'aria-describedby': 'dy-pc-status-body', onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); setPendingStatus(null) } }, children: [
              jsxs('div', { className: 'dy-pc-overlay-h', children: [
                jsx('span', { className: 'dy-pc-overlay-av', 'aria-hidden': true, children: jsx(Icon, { name: 'list-checks' }) }),
                jsx('strong', { id: 'dy-pc-status-title', children: 'Изменить статус доски?' }),
              ]}),
              jsx('p', { className: 'dy-pc-leave-body', id: 'dy-pc-status-body', children: `Перевести «${canvas?.name ?? 'эту доску'}» из «${CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus}» в «${CANVAS_BOARD_STATUS_LABELS[pendingStatus] ?? pendingStatus}»?${CANVAS_READ_ONLY.includes(pendingStatus) ? ' Доска станет доступной только для чтения, пока вы не вернёте её назад.' : ''}` }),
              jsxs('div', { className: 'dy-pc-overlay-f', children: [
                jsx(Button, { small: true, action: 'pc-status-cancel', onClick: () => setPendingStatus(null), children: 'Отмена' }),
                jsx(Button, { small: true, variant: 'primary', action: 'pc-status-confirm', disabled: boardBusy, onClick: confirmBoardStatus, children: `Перевести в «${CANVAS_BOARD_STATUS_LABELS[pendingStatus] ?? pendingStatus}»` }),
              ]}),
            ]}) }) : null,
            pendingLeave ? jsx('div', { className: 'dy-pc-overlay dy-pc-leave', 'data-canvas-unsaved-prompt': true, children: jsxs('div', { className: 'dy-pc-overlay-card dy-pc-leave-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'dy-pc-leave-title', 'aria-describedby': 'dy-pc-leave-body', onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); setPendingLeave(null) } }, children: [
              jsxs('div', { className: 'dy-pc-overlay-h', children: [
                jsx('span', { className: 'dy-pc-overlay-av warn', 'aria-hidden': true, children: jsx(Icon, { name: 'save' }) }),
                jsx('strong', { id: 'dy-pc-leave-title', children: 'Несохранённые изменения' }),
              ]}),
              jsx('p', { className: 'dy-pc-leave-body', id: 'dy-pc-leave-body', children: `На доске «${canvas?.name ?? 'эта доска'}» есть несохранённые правки. Сохранить их, прежде чем ${pendingLeave.label}?` }),
              jsxs('div', { className: 'dy-pc-overlay-f', children: [
                jsx(Button, { small: true, action: 'pc-leave-cancel', autoFocus: true, onClick: () => setPendingLeave(null), children: 'Отмена' }),
                jsx(Button, { small: true, variant: 'danger', action: 'pc-leave-discard', disabled: busy, onClick: leaveDiscarding, children: 'Отменить изменения' }),
                jsx(Button, { small: true, variant: 'primary', action: 'pc-leave-save', disabled: busy || readOnly, onClick: leaveSaving, children: busy ? 'Сохранение...' : 'Сохранить и продолжить' }),
              ]}),
            ]}) }) : null,
            jsxs('aside', { className: `dy-pc-drawer${selected ? ' open' : ''}`, 'data-canvas-drawer': selected?.id ?? 'none', 'aria-hidden': selected ? undefined : 'true', onKeyDown: (event) => { if (event.key === 'Escape') { event.stopPropagation(); setSelectedId(null); setSelectedIds([]) } }, children: [
              jsxs('div', { className: 'dy-pc-drawer-h', children: [
                jsxs('div', { children: [
                  jsx('strong', { children: selected ? `${CANVAS_KIND_LABELS[selected.kind] ?? selected.kind} · выбрано` : 'Выбранный объект' }),
                  jsx('span', { className: 'dy-pc-drawer-meta', children: selected ? `x ${Math.round(canvasNumber(selected.x))} · y ${Math.round(canvasNumber(selected.y))}` : 'Ничего не выбрано' }),
                ]}),
                jsx(Button, { small: true, action: 'pc-close-drawer', ariaLabel: 'Закрыть панель выбора', onClick: () => setSelectedId(null), children: '✕' }),
              ]}),
              selected ? jsxs('div', { className: 'dy-pc-drawer-b', children: [
                readOnly ? jsx('p', { className: 'dy-pc-drawer-meta', 'data-canvas-drawer-readonly': true, children: `Эта доска «${CANVAS_BOARD_STATUS_LABELS[boardStatus]}» — только просмотр.` }) : null,
                jsxs('label', { children: [jsx('span', { children: 'Заголовок' }), jsx('input', { 'data-canvas-object-title': true, maxLength: 4000, value: drawerText, readOnly, disabled: readOnly, onChange: (event) => setDrawerText(event.target.value) })] }),
                jsxs('label', { children: [jsx('span', { children: 'Тип' }), jsx('select', { 'data-canvas-object-kind': true, value: drawerKind, disabled: readOnly, onChange: (event) => setDrawerKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx('option', { value, children: CANVAS_KIND_LABELS[value] }, value)) })] }),
                jsxs('div', { className: 'dy-pc-colours-field', children: [
                  jsx('span', { className: 'dy-pc-field-label', id: 'dy-pc-colour-label', children: `Цвет стикера · ${selectedColour ? CANVAS_STICKER_LABELS[selectedColour] : 'По умолчанию для типа'}` }),
                  // Owner 01/10: a coloured dot per choice so the colour is visible before
                  // picking. Dots read the live theme tokens, so a dark board shows dark fills.
                  jsx('div', { className: 'dy-pc-colours', role: 'group', 'aria-labelledby': 'dy-pc-colour-label', 'data-canvas-object-colour': selectedColour ?? '', children: [null, ...CANVAS_STICKER_COLOURS].map((value) => jsx('button', {
                    type: 'button', className: 'dy-pc-colour', 'data-canvas-colour-option': value ?? 'default', disabled: readOnly,
                    'aria-pressed': (selectedColour ?? null) === value ? 'true' : 'false', 'aria-label': value ? CANVAS_STICKER_LABELS[value] : 'По умолчанию для типа', title: value ? CANVAS_STICKER_LABELS[value] : 'По умолчанию для типа',
                    onClick: () => setSelectedColour(value),
                    children: jsx('span', { className: `dy-pc-colour-dot${value ? '' : ' default'}`, style: { background: value ? `var(--dy-pc-sticker-${value})` : `var(--dy-pc-fill-${selected.kind})` } }),
                  }, value ?? 'default')) }),
                ] }),
                ...renderFieldEditors(),
                jsx('p', { className: 'dy-pc-drawer-meta', children: selected.evidence_ref ? `Ссылка на доказательство: ${selected.evidence_ref}` : 'У объекта нет ссылки на доказательства.' }),
                readOnly ? null : jsxs('div', { className: 'dockyard-form-actions', children: [
                  jsx(Button, { small: true, variant: 'danger', action: 'remove-canvas-object', disabled: busy, onClick: removeSelected, children: 'Удалить объект' }),
                  jsx(Button, { small: true, variant: 'primary', action: 'apply-canvas-object', disabled: busy || !drawerText.trim() || Boolean(richProblem), onClick: applyDrawer, children: 'Применить' }),
                ]}),
              ]}) : jsx('p', { className: 'dy-pc-drawer-meta', children: 'Выберите объект на холсте, чтобы изменить заголовок, тип или удалить его.' }),
            ]}),
          ],
        }),
        notice ? jsx('p', { className: 'dy-pc-notice', role: 'status', 'data-pc-tone': notice.tone, 'data-canvas-notice': true, children: notice.text }) : null,
      ]}),
    ],
  })
}