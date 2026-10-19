// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { fileAsBase64 } from '../lib/ui.js'
import { emitToast } from '../runtime/context.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { mediaTypeLabel } from '../lib/ui.js'
import { formatBytes } from '../lib/ui.js'
import { formatWhen } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { ConfirmDialog } from '../lib/ui.js'
import { readableLabel } from '../data/loaders.js'
// What Content accepts (the backend checks again). Sahil 05/10: videos up to 25 MB.
const EXTENSION_TYPES = { txt: 'text/plain', md: 'text/markdown', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' }
const mediaTypeOf = (file) => file?.type || EXTENSION_TYPES[String(file?.name ?? '').toLowerCase().split('.').pop()] || ''
const limitOf = (mediaType) => (mediaType.startsWith('video/') ? 25 : 5) * 1024 * 1024
const tooBig = (file) => Boolean(file) && file.size > limitOf(mediaTypeOf(file))

export function ProjectContentPanel({ project, content, onRefresh }) {
  const [items, setItems] = useState(content ?? [])
  const [selected, setSelected] = useState(null)
  const [previewState, setPreviewState] = useState('idle')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [contentAction, setContentAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const encoded = encodeURIComponent(project.id)
  // Sahil 04/10 (demo feedback g): a PDF or a video plays from an object URL
  // (Chromium will not frame a data: PDF). It is released when the selection changes.
  const [mediaUrl, setMediaUrl] = useState(null)
  useEffect(() => {
    if (previewState !== 'ready' || !['pdf', 'video'].includes(selected?.preview_kind) || !selected?.data_base64) { setMediaUrl(null); return undefined }
    const bytes = Uint8Array.from(atob(selected.data_base64), (char) => char.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: selected.media_type }))
    setMediaUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selected, previewState])
  const openPreview = async (item) => {
    setSelected(item)
    setPreviewState('loading')
    setError(null)
    try {
      const result = await api(`/projects/${encoded}/content/${encodeURIComponent(item.content_id)}/preview`)
      setSelected(result)
      setPreviewState('ready')
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
  }
  const upload = async () => {
    if (!file || file.size <= 0 || tooBig(file)) return
    setUploading(true)
    setError(null)
    try {
      const mediaType = mediaTypeOf(file)
      if (!mediaType) throw new Error('Выберите файл: текст, Markdown, PDF, PNG, JPEG, WebP, MP4 или WebM.')
      const contentBase64 = await fileAsBase64(file)
      const created = await api(`/projects/${encoded}/content`, {
        method: 'POST',
        body: { filename: file.name, media_type: mediaType, content_base64: contentBase64 },
      })
      setItems((current) => [created, ...current.filter((item) => item.content_id !== created.content_id)])
      setFile(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setUploading(false)
  }
  const applyContentAction = async () => {
    if (!selected || !contentAction) return
    setActionBusy(true)
    setError(null)
    try {
      const cid = encodeURIComponent(selected.content_id)
      if (contentAction === 'remove') {
        const dependencyResult = await api(`/projects/${encoded}/content/${cid}/dependencies`)
        if ((dependencyResult.dependencies ?? []).length > 0) throw new Error('Удаление заблокировано: на это содержимое ещё ссылаются.')
        await api(`/projects/${encoded}/content/${cid}`, { method: 'DELETE' })
      } else {
        await api(`/projects/${encoded}/content/${cid}/${contentAction}`, { method: 'POST', body: {} })
      }
      const refreshed = await api(`/projects/${encoded}/content`)
      setItems(refreshed.content ?? [])
      setSelected(null)
      setPreviewState('idle')
      setContentAction(null)
      emitToast('success', `Content ${contentAction === 'remove' ? 'removed' : `${contentAction}d`}.`)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setActionBusy(false)
  }
  return jsxs('div', { className: 'dockyard-content-layout', 'data-project-content': project.id, children: [
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('h2', { children: 'Документация проекта' }), jsx('p', { children: 'Материалы, связанные с этим проектом.' })] }),
        jsx(StatusTag, { tone: 'neutral', label: `${number(items.length)} ${plural(items.length, 'file')}` }),
      ]}),
      items.length > 0 ? jsx('div', { className: 'dockyard-content-list', children: items.map((item) => jsxs('button', { type: 'button', 'data-project-content-item': item.content_id, onClick: () => openPreview(item), children: [
        jsxs('span', { children: [jsx('strong', { children: item.filename }), jsx('small', { children: `${mediaTypeLabel(item.media_type)} / ${formatBytes(item.size_bytes)} / ${formatWhen(item.uploaded_at) || 'Uploaded'}` })] }),
        jsx(Icon, { name: 'chevron' }),
      ]}, item.content_id)) }) : jsx('p', { className: 'dockyard-meta', children: 'Материалы пока не загружены.' }),
      jsxs('div', { className: 'dockyard-upload-panel', children: [
        jsxs('label', { className: 'dockyard-upload-dropzone', children: [
          jsx('span', { children: file ? file.name : 'Выбрать материалы' }),
          jsx('small', { children: file ? `${formatBytes(file.size)} selected` : 'Текст, Markdown, PDF или изображение до 5 МБ, либо видео MP4 или WebM до 25 МБ.' }),
          jsx('input', { type: 'file', 'data-content-file': true, accept: '.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp,video/mp4,video/webm', onChange: (event) => { setFile(event.target.files?.[0] ?? null); setError(null) } }),
        ]}),
        jsx(Button, { action: 'upload-project-content', variant: 'primary', disabled: uploading || !file || file.size <= 0 || tooBig(file), onClick: upload, children: uploading ? 'Загрузка…' : 'Загрузить контент' }),
      ]}),
      tooBig(file) ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: `This file exceeds the ${limitOf(mediaTypeOf(file)) / (1024 * 1024)} MB limit.` }) : null,
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    ]}),
    jsxs('aside', { className: 'dockyard-feature-card dockyard-content-preview-card', children: [
      jsx('span', { className: 'dockyard-card-label', children: 'PREVIEW' }),
      selected ? jsx('h2', { children: selected.filename }) : jsx('h2', { children: 'Выберите документ' }),
      previewState === 'loading' ? jsx('p', { children: 'Загрузка предпросмотра…' }) : null,
      previewState === 'ready' && selected?.preview_kind === 'text'
        ? jsx('pre', { 'data-content-preview': true, className: 'dockyard-content-preview', children: selected.text || 'Этот текстовый файл пуст.' })
        : previewState === 'ready' && selected?.preview_kind === 'image' && selected.data_base64
          ? jsx('img', { 'data-content-preview': true, 'data-preview-kind': 'image', className: 'dockyard-content-image', alt: selected.filename, src: `data:${selected.media_type};base64,${selected.data_base64}` })
        : previewState === 'ready' && selected?.preview_kind === 'pdf' && mediaUrl
          ? jsx('iframe', { 'data-content-preview': true, 'data-preview-kind': 'pdf', className: 'dockyard-content-pdf', title: `PDF preview: ${selected.filename}`, src: mediaUrl, sandbox: 'allow-same-origin' })
        : previewState === 'ready' && selected?.preview_kind === 'video' && mediaUrl
          ? jsx('video', { 'data-content-preview': true, 'data-preview-kind': 'video', className: 'dockyard-content-video', controls: true, preload: 'metadata', 'aria-label': `Video: ${selected.filename}`, src: mediaUrl })
        : previewState === 'ready'
          ? jsx('div', { 'data-content-preview': true, className: 'dockyard-report-placeholder', children: `Preview is not available for ${mediaTypeLabel(selected?.media_type)}. File metadata remains visible.` })
          : previewState === 'idle'
            ? jsx('p', { className: 'dockyard-meta', children: 'Здесь показываются текст, Markdown, изображения, PDF и видео.' })
            : null,
      selected ? jsxs('div', { className: 'dockyard-form-actions', children: [
        selected.archived_at
          ? jsx(Button, { action: 'restore-project-content', disabled: actionBusy, onClick: () => setContentAction('restore'), children: 'Восстановить' })
          : jsx(Button, { action: 'archive-project-content', disabled: actionBusy, onClick: () => setContentAction('archive'), children: 'В архив' }),
        jsx(Button, { action: 'remove-project-content', variant: 'danger', disabled: actionBusy, onClick: () => setContentAction('remove'), children: 'Удалить файл' }),
      ]}) : null,
    ]}),
    contentAction ? jsx(ConfirmDialog, {
      confirmKey: `content-${contentAction}`,
      title: `${contentAction === 'remove' ? 'Remove' : readableLabel(contentAction)} this content?`,
      description: contentAction === 'remove' ? 'The managed file is deleted only after authority, dependency, containment and identity checks pass.' : 'Запись содержимого и история сохраняются.',
      confirmLabel: contentAction === 'remove' ? 'Удалить управляемый файл' : readableLabel(contentAction),
      busy: actionBusy,
      onConfirm: applyContentAction,
      onCancel: () => setContentAction(null),
    }) : null,
  ]})
}
