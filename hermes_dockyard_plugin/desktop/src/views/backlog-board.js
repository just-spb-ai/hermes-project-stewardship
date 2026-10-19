// Backlog board render tree.
//
// Structure-only extraction from views/backlog.js. The markup below is moved
// verbatim; state and handlers arrive through ctx so this module stays
// presentation-only. Do not restyle or reorder children: rendered output must
// stay byte-identical to the pre-split plugin.
import { jsx, jsxs } from '../runtime/react.js'
import { readableLabel } from '../data/loaders.js'
import { api } from '../runtime/context.js'
import { Button, EmptyState, GROUP_LABELS, Icon, number, PageHead, pluralRu } from '../lib/ui.js'
import { BacklogImportWizard } from './backlog-import-wizard.js'
import { BacklogReasonModal } from './backlog-reason-modal.js'
import { WorkItemDetail } from '../work-item/detail.js'

// Bulk and transfer operation words as the backend reports them.
const RUN_STATE_WORDS = { pending: 'Ожидает', running: 'В работе', completed: 'Завершён', failed: 'Ошибка', skipped: 'Пропущен' }

export function BacklogBoard(ctx) {
  const {
    UNASSIGNED,
    unassigned,
    ROOT_TYPES,
    STATUS_LABELS,
    STATUS_OPTIONS,
    STATUS_UI,
    TYPE_NAMES,
    activeFilterCount,
    assignItem,
    assigneeFilterValues,
    availableCreateParents,
    availableCreateTypes,
    branchMatch,
    bulkBusy,
    bulkError,
    bulkOperation,
    bulkPreview,
    bulkSameSource,
    bulkSelected,
    canCreate,
    cellError,
    changeStatus,
    changeType,
    childTypesFor,
    childrenOf,
    closeImport,
    cmMenu,
    collapsedSet,
    columnFilters,
    commitRank,
    commitTitle,
    createError,
    createForm,
    createOpen,
    createSaving,
    createTouched,
    createValid,
    detailItem,
    draggedRef,
    editing,
    entries,
    error,
    executeBulk,
    flashCell,
    groupBy,
    groups,
    hasFilters,
    hasUnassignedItems,
    hiddenCols,
    importBusy,
    importColumnMetadata,
    importError,
    importMode,
    importOpen,
    importResult,
    importRows,
    importSelected,
    importStep,
    importText,
    importValid,
    importWarningsOnly,
    initiativeFilterValues,
    initiativeLabel,
    maxInitialRank,
    menuRef,
    onRefresh,
    openCreate,
    ownerLabel,
    parentOf,
    parentRefOf,
    parseImport,
    pendingMove,
    pendingParentChanged,
    pendingParentChoices,
    pendingParentItem,
    pendingParentRef,
    previewBulk,
    project,
    q,
    reason,
    refreshTransfer,
    reparentTargets,
    requestMove,
    requestReparent,
    resetFilters,
    retryBulk,
    retryTransfer,
    runImport,
    saveCreate,
    saveMove,
    saveParent,
    saving,
    search,
    selectedEligible,
    setBulkError,
    setBulkOperation,
    setBulkPreview,
    setBulkReplacement,
    setBulkSelected,
    setCmMenu,
    setColumnFilters,
    setCreateOpen,
    setDetailItem,
    setDraggedRef,
    setEditing,
    setGroupBy,
    setImportBusy,
    setImportError,
    setImportMode,
    setImportOpen,
    setImportResult,
    setImportRows,
    setImportSelected,
    setImportStep,
    setImportText,
    setImportValid,
    setMenuRef,
    setPendingMove,
    setReason,
    setSearch,
    setSortDir,
    setSortKey,
    sortDir,
    sortHeader,
    sortKey,
    sortLabels,
    statusChoicesFor,
    statusFilterValues,
    todayISO,
    toggleBulk,
    toggleCollapse,
    transfers,
    treeRows,
    typeChoicesFor,
    typeFilterValues,
    typeLabel,
    updateCreate,
    view,
    workByRef,
  } = ctx
  return jsxs('div', { 'data-backlog-board': project.id, children: [
    jsx(PageHead, {
      title: 'Бэклог',
      description: 'Одна ранжированная очередь того, что должно произойти дальше.',
      status: `Ранжировано: ${number(entries.length)}`,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-project-toolbar backlog-create-toolbar', children: [
      jsx('span', { className: 'dockyard-meta', children: `${project.name || project.id} / Рабочие элементы` }),
      jsx(Button, { action: 'open-bulk-import', small: true, disabled: !canCreate, onClick: () => { setImportOpen(true); setImportRows(null); setImportValid(false); setImportError(null); setImportResult(null); setImportStep(1) }, children: 'Импорт' }),
      jsx(Button, { action: 'open-create-backlog-item', variant: 'primary', small: true, disabled: !canCreate, onClick: () => openCreate(), children: 'Создать элемент' }),
    ]}),
    // Sahil 04/10 (demo feedback b): a gentle note, never a blocker. Unassigned
    // work is never picked up by a bot; each item opens so it can be assigned.
    unassigned.length ? jsxs('div', { className: 'dockyard-soft-alert', 'data-unassigned-alert': project.id, role: 'status', children: [
      jsx(Icon, { name: 'user' }),
      jsxs('div', { className: 'dockyard-soft-alert-body', children: [
        jsx('strong', { children: `${number(unassigned.length)} ${pluralRu(unassigned.length, 'рабочий элемент не назначен', 'рабочих элемента не назначены', 'рабочих элементов не назначено')} — ни один бот их не подхватит.` }),
        jsxs('span', { className: 'dockyard-soft-alert-items', children: [
          ...unassigned.slice(0, 5).map((item) => jsx('button', { type: 'button', className: 'dockyard-soft-alert-item', 'data-unassigned-item': item.ref, onClick: () => setDetailItem(item), children: `${item.ref} ${item.title}` }, item.ref)),
          unassigned.length > 5 ? jsx('span', { children: `и ещё ${number(unassigned.length - 5)}` }, 'more') : null,
        ] }),
      ] }),
      hasUnassignedItems ? jsx(Button, { small: true, onClick: () => setColumnFilters((current) => ({ ...current, assignee: '__unassigned__' })), children: 'Показать в списке' }) : null,
    ] }) : null,
    // PROTOTYPE v4: bulk reassignment now lives in the selection popover;
    // preview/execute/retry handlers unchanged.
    bulkError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: bulkError }) : null,
    bulkPreview ? jsxs('div', { className: 'dockyard-view-only-note', 'data-bulk-preview': bulkPreview.fingerprint, children: [
      jsx('strong', { children: `Предпросмотр · элементов: ${number(bulkPreview.enumerated_count)} · отпечаток ${bulkPreview.fingerprint}` }),
      jsx('span', { children: `подходят: ${(bulkPreview.eligible_items ?? []).length} · исключены: ${(bulkPreview.excluded_items ?? []).length} · подтвердите во всплывающем окне ниже` }),
      jsx('ul', { children: [...(bulkPreview.eligible_items ?? []), ...(bulkPreview.excluded_items ?? [])].map((item) => jsx('li', { children: `${item.id} · ${item.title || ''} · ${item.status} · ${item.reason || 'подходит'}` }, item.id)) }),
    ] }) : null,
    bulkOperation ? jsxs('div', { className: 'dockyard-view-only-note', 'data-bulk-operation': bulkOperation.op_id, role: 'status', children: [
      jsx('strong', { children: `${bulkOperation.op_id} · ${RUN_STATE_WORDS[bulkOperation.state] ?? bulkOperation.state}` }),
      jsx('span', { children: `выполнено ${(bulkOperation.items ?? []).filter((item) => item.outcome === 'completed').length} из ${(bulkOperation.items ?? []).length} · исполнитель: ${bulkOperation.actor || 'подтверждённый субъект'}` }),
      jsx('ul', { children: (bulkOperation.items ?? []).map((item) => jsx('li', { children: `${item.item_id} · ${RUN_STATE_WORDS[item.outcome] ?? item.outcome} · ${item.audit?.actor || bulkOperation.actor || 'подтверждённый субъект'} · ${item.audit?.action || 'запись аудита ожидается'}${item.detail ? ` · ${item.detail}` : ''}` }, item.item_id)) }),
      bulkOperation.state !== 'completed' ? jsx(Button, { action: 'retry-bulk-reassignment', disabled: bulkBusy, small: true, onClick: retryBulk, children: 'Повторить оставшиеся пункты' }) : null,
    ] }) : null,
    Object.values(transfers).map((operation) => jsxs('div', { className: 'dockyard-view-only-note', 'data-transfer-operation': operation.op_id, role: 'status', children: [
      jsx('strong', { children: `${operation.op_id} · ${RUN_STATE_WORDS[operation.state] ?? operation.state}` }),
      jsx('span', { children: `элементов: ${(operation.items ?? []).length} · проект ${operation.project_id || project.id}` }),
      jsx('button', { type: 'button', 'data-transfer-refresh': operation.op_id, onClick: () => refreshTransfer(operation.op_id), children: 'Обновить' }),
      jsx('button', { type: 'button', 'data-transfer-retry': operation.op_id, onClick: () => retryTransfer(operation.op_id), children: 'Повторить оставшиеся пункты' }),
    ] }, operation.op_id)),
    entries.length > 0 ? jsxs('section', { className: 'dockyard-backlog-list', 'data-backlog-table': true, children: [
      jsxs('div', { className: 'dockyard-cmdbar', 'data-column-filters': true, children: [
        jsxs('label', { className: 'cm-search', children: [
          jsx(Icon, { name: 'search' }, 'v4-search'),
          jsx('input', { type: 'search', 'data-cm-search': true, 'aria-label': 'Поиск в бэклоге', placeholder: 'Поиск в бэклоге', value: search, onInput: (event) => setSearch(event.target.value) }),
        ] }),
        // LANE-TOOLBAR: icon-driven Sort/Group controls with floating popover menus.
        ...[
          ['sort', 'arrow-up-down', 'Сортировка', `${sortLabels[sortKey]} ${sortDir > 0 ? '↑' : '↓'}`, sortKey !== 'rank' || sortDir < 0,
            ['rank', 'type', 'title', 'status', 'initiative', 'assignee', 'age'].map((key) => [key, sortLabels[key], sortKey === key]),
            (key) => { if (sortKey === key) setSortDir(-sortDir); else { setSortKey(key); setSortDir(1) } }],
          ['group', 'layers', 'Группировка', GROUP_LABELS[groupBy], groupBy !== 'none',
            Object.entries(GROUP_LABELS).map(([key, label]) => [key, label, groupBy === key]),
            (key) => setGroupBy(key)],
        ].map(([menu, icon, label, value, modified, options, choose]) => jsxs('span', { className: 'cm-anchor', 'data-cm-anchor': menu, children: [
          jsxs('button', { type: 'button', className: `cm-icon-btn${modified ? ' is-modified' : ''}`, 'data-cm-menu-btn': menu, 'aria-haspopup': 'menu', 'aria-expanded': cmMenu === menu ? 'true' : 'false', 'aria-label': `${label}: ${value}`, title: `${label}: ${value}`,
            onClick: (event) => { event.stopPropagation(); setCmMenu(cmMenu === menu ? null : menu) },
            onKeyDown: (event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setCmMenu(menu) } },
            children: [jsx(Icon, { name: icon }, `${menu}-icon`), modified ? jsx('span', { className: 'cm-icon-dot', 'aria-hidden': true }, `${menu}-dot`) : null] }),
          cmMenu === menu ? jsxs('div', { className: 'cm-menu cm-popover', role: 'menu', 'aria-label': `${label}`, 'data-cm-menu': menu, onClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              const items = [...event.currentTarget.querySelectorAll('[data-cm-option]')]
              const at = items.indexOf(document.activeElement)
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus() }
              else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus() }
              else if (event.key === 'End') { event.preventDefault(); items[items.length - 1]?.focus() }
              else if (event.key === 'Tab') setCmMenu(null)
            },
            children: [
              jsx('div', { className: 'menu-label', children: label }, 'label'),
              ...options.map(([key, optionLabel, active]) => jsxs('button', { type: 'button', role: 'menuitemradio', 'aria-checked': active ? 'true' : 'false', className: active ? 'is-active' : '', 'data-cm-option': `${menu}-${key}`, autoFocus: active,
                onClick: () => { choose(key); setCmMenu(null); document.querySelector(`[data-cm-menu-btn="${menu}"]`)?.focus() },
                children: [
                  jsx('span', { className: 'cm-check', children: active ? jsx(Icon, { name: 'check' }) : null }, 'check'),
                  jsx('span', { className: 'cm-option-label', children: optionLabel }, 'label'),
                  menu === 'sort' && active ? jsx('span', { className: 'cm-dir', title: sortDir > 0 ? 'По возрастанию — нажмите ещё раз для обратного' : 'По убыванию — нажмите ещё раз для обратного', children: jsx(Icon, { name: sortDir > 0 ? 'arrow-up-narrow-wide' : 'arrow-down-wide-narrow' }) }, 'dir') : null,
                ] }, key)),
            ] }) : null,
        ] }, menu)),
        jsx('span', { className: 'cm-divider', 'aria-hidden': true }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Тип' }),
          jsx('select', { 'data-filter-field': 'type', 'aria-label': 'Фильтр по типу', value: columnFilters.type, onChange: (event) => setColumnFilters((current) => ({ ...current, type: event.target.value })), children: [
            jsx('option', { value: '', children: 'Все типы' }, 'all'),
            ...typeFilterValues.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Статус' }),
          jsx('select', { 'data-filter-field': 'status', 'aria-label': 'Фильтр по статусу', value: columnFilters.status, onChange: (event) => setColumnFilters((current) => ({ ...current, status: event.target.value })), children: [
            jsx('option', { value: '', children: 'Все статусы' }, 'all'),
            ...statusFilterValues.map((status) => jsx('option', { value: status, children: STATUS_LABELS[status] || readableLabel(status) }, status)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Инициатива' }),
          jsx('select', { 'data-filter-field': 'initiative', 'aria-label': 'Фильтр по инициативе', value: columnFilters.initiative, onChange: (event) => setColumnFilters((current) => ({ ...current, initiative: event.target.value })), children: [
            jsx('option', { value: '', children: 'Все инициативы' }, 'all'),
            ...initiativeFilterValues.map((ref) => jsx('option', { value: ref, children: initiativeLabel(ref) }, ref)),
          ] }),
        ] }),
        jsxs('label', { className: 'cm-filter', children: [
          jsx('span', { children: 'Исполнитель' }),
          jsx('select', { 'data-filter-field': 'assignee', 'aria-label': 'Фильтр по исполнителю', value: columnFilters.assignee, onChange: (event) => setColumnFilters((current) => ({ ...current, assignee: event.target.value })), children: [
            jsx('option', { value: '', children: 'Все исполнители' }, 'all'),
            hasUnassignedItems ? jsx('option', { value: '__unassigned__', children: 'Не назначен' }, 'unassigned') : null,
            ...assigneeFilterValues.map((owner) => jsx('option', { value: owner, children: ownerLabel(owner) }, owner)),
          ] }),
        ] }),
        hasFilters ? jsx('button', { type: 'button', className: 'cm-reset-filters', 'data-clear-filters': true, onClick: resetFilters, children: 'Очистить всё' }) : null,
        jsx('span', { className: 'cm-count', 'data-cm-count': true, role: 'status', title: [
          `показано ${number(treeRows.length)} из ${number(entries.length)}`,
          q ? `поиск «${search}»` : '',
          activeFilterCount ? `фильтров: ${activeFilterCount}` : '',
          sortKey !== 'rank' ? `сортировка: ${sortLabels[sortKey]}` : '',
          groupBy !== 'none' ? `группировка: ${GROUP_LABELS[groupBy]}` : '',
        ].filter(Boolean).join(' · '), children: treeRows.length === entries.length ? `элементов: ${number(entries.length)}` : `${number(treeRows.length)} из ${number(entries.length)}` }),
      ] }),
      jsxs('div', { className: 'tree-head', children: [
        jsx('span', { className: 'th-gutter' }),
        sortHeader('rank', 'Ранг', 'th-rank'),
        sortHeader('type', 'Тип', 'th-type'),
        sortHeader('title', 'Рабочий элемент', 'th-title'),
        sortHeader('status', 'Статус', 'th-status'),
        sortHeader('initiative', 'Инициатива', 'th-initiative'),
        sortHeader('assignee', 'Исполнитель', 'th-who'),
        sortHeader('age', 'Давность', 'th-age'),
        jsx('span', { className: 'th-reason', children: 'Причина приоритета' }),
        jsx('span', { className: 'th-act', 'aria-label': 'Действия' }),
      ] }),
      treeRows.length === 0 ? jsxs('div', { className: 'tree-group-head', 'data-no-matches': true, children: [
        jsx('span', { children: hasFilters ? 'Нет пунктов, соответствующих поиску и фильтрам.' : 'Нет пунктов бэклога для показа.' }),
        hasFilters ? jsx('button', { type: 'button', className: 'cm-chip', onClick: resetFilters, children: 'Сбросить фильтры' }) : null,
      ] }) : null,
      ...groups.flatMap(([label, rows], gi) => [
        label !== null ? jsxs('div', { className: 'tree-group-head', children: [
          jsx('span', { children: label }),
          jsx('span', { className: 'grp-count', children: `· ${rows.length}` }),
        ] }, `grp-${String(label)}-${gi}`) : null,
        ...rows.map(({ ref, depth, guides }) => {
          const entry = entries.find((candidate) => candidate.item_ref === ref)
          const item = workByRef[ref] ?? { ref, title: ref, status: 'backlog', type: 'task' }
          const kids = (childrenOf[ref] ?? []).filter(branchMatch)
          const overdue = Boolean(item.due) && item.status !== 'done' && item.due < todayISO()
          const stUi = (item.status && STATUS_UI[item.status]) || item.status || 'backlog'
          const err = cellError && cellError.ref === ref ? cellError : null
          const cell = editing && editing.ref === ref ? editing.field : null
          const titleText = item.title || ref
          const validTypeChoices = typeChoicesFor(ref)
          const validStatusChoices = statusChoicesFor(item)
          const validParentChoices = reparentTargets(ref)
          const mayAddChild = canCreate && childTypesFor(item.type).length > 0
          const mayReparent = Boolean(validParentChoices.length || parentRefOf(item))
          const estimateDays = item.estimate_days !== null && item.estimate_days !== undefined && item.estimate_days !== ''
            ? Number(item.estimate_days) : null
          const { openDetails, openDetailsSoon, startTitleEdit } = (function () {
            // Shared per-row click timer: single click opens the detail drawer
            // after a short delay; a double click cancels it and switches to
            // inline title editing (JIRA-style). The timer id lives on the
            // row's closures via titleClickTimer.
            let titleClickTimer = null
            const cancelTitleTimer = () => { if (titleClickTimer) { clearTimeout(titleClickTimer); titleClickTimer = null } }
            var openDetails = (event) => { event.stopPropagation(); cancelTitleTimer(); setDetailItem(item) }
            var openDetailsSoon = (event) => { event.stopPropagation(); cancelTitleTimer(); titleClickTimer = setTimeout(() => { titleClickTimer = null; setDetailItem(item) }, 220) }
            var startTitleEdit = (event) => { event.stopPropagation(); cancelTitleTimer(); setEditing({ ref, field: 'title' }) }
            return { openDetails, openDetailsSoon, startTitleEdit, cancelTitleTimer }
          })()
          return jsxs('div', {
            onClick: (event) => { if (event.target.closest('button, input, select, a, [data-bulk-select], .tree-twisty, .drag-grip')) return; openDetails(event) },
            className: `dockyard-tree-row${draggedRef === ref ? ' tree-dragging' : ''}`, role: 'treeitem', 'aria-level': depth + 1,
            'aria-expanded': kids.length ? String(!collapsedSet.has(ref)) : undefined,
            'data-backlog-item': ref, 'data-tree-depth': depth,
            onDragOver: (event) => { if (draggedRef && depth === 0 && entry) { event.preventDefault(); event.currentTarget.classList.add('tree-drop') } },
            onDragLeave: (event) => event.currentTarget.classList.remove('tree-drop'),
            onDrop: (event) => {
              event.preventDefault(); event.currentTarget.classList.remove('tree-drop')
              if (!draggedRef || !entry) return
              const source = entries.find((candidate) => candidate.item_ref === draggedRef)
              if (source && draggedRef !== ref) requestMove(source, Number(entry.rank))
              setDraggedRef(null)
            },
            children: [
              jsxs('span', { className: 'tree-gutter', children: [
                ...guides.map((mode, idx) => jsx('span', { className: `tree-guide ${mode}`, 'aria-hidden': true }, `g${idx}`)),
                kids.length ? jsx('button', { type: 'button', className: 'tree-twisty', 'data-collapse-ref': ref, 'aria-expanded': String(!collapsedSet.has(ref)), 'aria-label': `${collapsedSet.has(ref) ? 'Развернуть' : 'Свернуть'} ${kids.length} ${pluralRu(kids.length, 'дочерний элемент', 'дочерних элемента', 'дочерних элементов')}`, onClick: (event) => { event.stopPropagation(); toggleCollapse(ref) }, children: jsx(Icon, { name: 'chevron' }) }) : null,
                jsx('input', { type: 'checkbox', className: 'tree-check', 'data-bulk-select': ref, 'aria-label': `Выбрать: ${titleText}`, checked: bulkSelected.includes(ref), onClick: (event) => event.stopPropagation(), onChange: () => toggleBulk(ref) }),
              ] }),
              !hiddenCols.includes('rank') ? jsxs('span', { className: 'tree-rank', children: [
                depth === 0 ? jsx('span', { className: 'drag-grip', 'aria-hidden': true, draggable: true, onDragStart: (event) => { event.stopPropagation(); setDraggedRef(ref) }, children: '⠿' }) : null,
                entry ? (cell === 'rank'
                  ? jsx('input', { autoFocus: true, type: 'number', min: 1, max: entries.length, 'data-cell-input': 'rank', defaultValue: String(entry.rank), onKeyDown: (event) => { if (event.key === 'Enter') event.target.blur(); if (event.key === 'Escape') setEditing(null) }, onBlur: (event) => commitRank(entry, event.target.value) })
                  : jsx('button', { type: 'button', className: 'cell-edit cell-rank', 'data-cell': 'rank', onClick: (event) => { event.stopPropagation(); setEditing({ ref, field: 'rank' }) }, children: number(entry.rank) }))
                  : jsx('span', { children: '·' }),
              ] }) : null,
              jsxs('span', { className: 'tree-type-cell', title: `Тип: ${typeLabel(item.type)}`, children: [
                jsx('span', { className: `tree-type ${TYPE_NAMES.includes(item.type) ? item.type : 'task'}`, 'aria-hidden': true, children: jsx(Icon, { name: `type-${TYPE_NAMES.includes(item.type) ? item.type : 'task'}` }) }),
                jsx('span', { children: typeLabel(item.type) }),
              ] }),
              jsxs('span', { className: 'tree-title', children: [
                cell === 'title'
                  ? jsxs('span', { className: 'cell-edit is-input', style: { display: 'inline-flex', alignItems: 'center', minWidth: 0, flex: 1 }, children: [
                      jsx('input', { autoFocus: true, className: 'cell-title-input', 'data-cell-input': 'title', defaultValue: item.title || '', onKeyDown: (event) => { if (event.key === 'Enter') { event.target.blur(); } if (event.key === 'Escape') { setEditing(null) } }, onBlur: (event) => commitTitle(ref, event.target.value) }),
                      err && err.field === 'title' ? jsx('span', { className: 'dockyard-inline-error', role: 'alert', 'data-cell-error': 'title', style: { fontSize: 10.5, padding: '1px 6px', whiteSpace: 'nowrap' }, children: err.message }) : null,
                    ] })
                  : jsxs('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }, children: [
                      jsxs('span', { className: 'tree-title-stack', children: [
                        jsxs('span', { className: 'tree-title-line', children: [
                          jsx('span', { className: 'tree-ref-chip', children: item.ref }),
                          jsx('button', {
                            type: 'button', className: 'cell-edit cell-title', 'data-cell': 'title', 'data-title-edit': ref,
                            title: 'Двойной клик — правка заголовка на месте · одиночный клик открывает детали',
                            onDoubleClick: startTitleEdit,
                            onClick: openDetailsSoon, children: titleText,
                          }),
                          depth && parentOf[ref] ? jsx('span', { className: 'tree-parent', children: ` · в «${workByRef[parentOf[ref]]?.title || parentOf[ref]}»` }) : null,
                        ] }),
                        item.body ? jsx('span', { className: 'tree-desc', children: String(item.body).replace(/\s+/g, ' ').slice(0, 90) }) : null,
                      ] }),
                      err && err.field === 'title' ? jsx('span', { className: 'dockyard-inline-error', role: 'alert', 'data-cell-error': 'title', style: { fontSize: 10.5, padding: '1px 6px', whiteSpace: 'nowrap' }, children: err.message }) : null,

                    ] }),
              ] }),

              jsxs('span', { className: 'tree-status', children: [
                cell === 'status'
                  ? jsx('select', { autoFocus: true, className: 'cell-edit is-input', 'data-cell-input': 'status', value: (item.status && STATUS_UI[item.status]) || 'backlog', onChange: (event) => { setEditing(null); changeStatus(ref, event.target.value) }, onBlur: () => setEditing(null), children: validStatusChoices.map((st) => jsx('option', { value: st, children: STATUS_LABELS[st] }, st)) })
                  : jsxs('button', { type: 'button', className: `cell-edit cell-status tree-status ${stUi === 'done' ? 'success' : (overdue || stUi === 'blocked') ? 'danger' : stUi === 'in_progress' ? 'info' : stUi === 'in_review' ? 'warning' : 'neutral'}`, 'data-cell': 'status', title: 'Изменить статус', onClick: (event) => { event.stopPropagation(); setEditing({ ref, field: 'status' }) }, children: [
                      jsx('span', { className: 'tree-status-icon', 'aria-hidden': true }),
                      jsx('span', { children: STATUS_LABELS[item.status] || 'Бэклог' }),
                    ] }),
                err && err.field === 'status' ? jsx('span', { className: 'cell-due overdue', children: err.message }) : null,
              ] }),
              jsxs('span', { className: 'tree-initiative', title: item.initiative_ref ? `Инициатива ${item.initiative_ref}` : 'Связанной инициативы нет', children: [
                item.initiative_ref
                  ? jsxs('span', { className: 'initiative-cell-value', children: [
                      jsx('strong', { children: initiativeLabel(item.initiative_ref) }),
                      jsx('small', { children: item.initiative_ref }),
                    ] })
                  : jsx('span', { className: 'initiative-cell-empty', children: '—' }),
              ] }),
              jsxs('span', { className: 'tree-who', children: [
                cell === 'assignee'
                  ? jsxs('select', { autoFocus: true, className: 'cell-edit is-input', 'data-cell-input': 'assignee', value: item.assignee || '', onChange: (event) => { setEditing(null); assignItem(ref, event.target.value) }, onBlur: () => setEditing(null), children: [
                      jsx('option', { value: '', children: 'Не назначен' }),
                      ...(view.bots ?? []).map((bot) => jsx('option', { value: bot.id, children: bot.name || bot.id }, bot.id)),
                    ] })
                  : jsxs('button', { type: 'button', className: 'cell-edit cell-who', 'data-cell': 'assignee', title: (item.type === 'epic') ? 'Эпики не назначаются — работу несут их дочерние элементы' : 'Сменить исполнителя', disabled: (item.type || 'task') === 'epic', onClick: (event) => { event.stopPropagation(); if ((item.type || 'task') === 'epic') { flashCell(ref, 'assignee', 'Эпики не назначаются — назначьте одного из его дочерних элементов.'); return } setEditing({ ref, field: 'assignee' }) }, children: [
                      item.assignee ? jsx('span', { className: 'tree-avatar', children: String(item.assignee).replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() }) : jsx('span', { className: 'tree-avatar none', children: '—' }),
                      jsx('span', { className: 'who-name', children: ownerLabel(item.assignee) }),
                    ] }),
                err && err.field === 'assignee' ? jsx('span', { className: 'cell-due overdue', children: err.message }) : null,
              ] }),
              jsx('span', { className: 'tree-age', title: entry?.aged_since ? `В ранге с ${entry.aged_since}` : 'Дата ранга недоступна', children: entry?.aged_since ? `${Math.max(0, Math.floor((Date.now() - Date.parse(entry.aged_since)) / 86400000))} дн.` : '—' }),
              jsx('span', { className: 'tree-priority-reason', title: entry?.priority_reason || 'Причина приоритета не записана', children: entry?.priority_reason || 'Причина не записана' }),
              jsxs('span', { className: 'tree-actions', children: [
                jsx('button', { type: 'button', className: 'tree-menu-btn', 'data-menu-ref': ref, 'aria-expanded': String(menuRef === ref), 'aria-label': `Действия: ${titleText}`, onClick: (event) => { event.stopPropagation(); setMenuRef(menuRef === ref ? null : ref) }, children: '⋯' }),
              ] }),
              menuRef === ref ? jsxs('div', { className: 'tree-menu', role: 'menu', onClick: (event) => event.stopPropagation(), children: [
                jsx('div', { className: 'menu-label', children: 'Открыть' }),
                jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'details', onClick: () => { setMenuRef(null); setDetailItem(item) }, children: [jsx(Icon, { name: 'pencil' }), 'Детали задачи'] }),
                validTypeChoices.length > 1 ? jsxs('label', { className: 'tree-menu-field', children: [
                  jsx('span', { children: 'Тип' }),
                  jsx('select', { 'data-menu-type': ref, 'aria-label': `Сменить тип: ${titleText}`, value: item.type, onChange: (event) => { setMenuRef(null); changeType(ref, event.target.value) }, children:
                    validTypeChoices.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
                  }),
                ] }) : jsxs('div', { className: 'tree-menu-static', children: [jsx('span', { children: 'Тип' }), jsx('strong', { children: typeLabel(item.type) })] }),
                mayAddChild || mayReparent || (depth === 0 && entry)
                  ? jsx('div', { className: 'menu-label', children: 'Структура' }) : null,
                mayAddChild ? jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'add-child', onClick: () => { setMenuRef(null); openCreate(ref) }, children: [jsx(Icon, { name: 'type-subtask' }), 'Добавить дочерний элемент'] }) : null,
                mayReparent ? jsxs('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'reparent', onClick: () => requestReparent(ref), children: [jsx(Icon, { name: 'arrow-right' }), 'Сменить родителя…'] }) : null,
                depth === 0 && entry ? jsxs('div', { className: 'tree-menu-rank-actions', children: [
                  jsx('div', { className: 'menu-label', children: 'Приоритет' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'up', disabled: Number(entry.rank) <= 1, onClick: () => { setMenuRef(null); requestMove(entry, Number(entry.rank) - 1) }, children: 'Вверх' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'down', disabled: Number(entry.rank) >= entries.length, onClick: () => { setMenuRef(null); requestMove(entry, Number(entry.rank) + 1) }, children: 'Вниз' }),
                ] }) : null,
                item.status !== 'done' && item.type !== 'epic' ? jsxs('div', { className: 'tree-menu-status-actions', children: [
                  jsx('div', { className: 'menu-label', children: 'Статус' }),
                  jsx('button', { type: 'button', role: 'menuitem', 'data-menu-action': 'status-done', onClick: () => { setMenuRef(null); changeStatus(ref, 'done') }, children: 'Отметить выполненным' }),
                ] }) : null,
              ] }) : null,
            ],
          }, ref)
        }),
      ]),
      bulkSelected.length ? jsxs('div', { className: 'sel-pop', 'data-selection-popover': true, onClick: (event) => event.stopPropagation(), children: [
        jsx('span', { className: 'sel-count', children: `Выбрано: ${bulkSelected.length}` }),
        jsx('span', { className: 'sel-sep' }),
        jsxs('select', { 'data-pop-target': true, 'aria-label': 'Цель массовой операции', defaultValue: '', children: [
          jsx('option', { value: '', disabled: true, children: 'Действие над выбранным…' }),
          ...(view.bots ?? []).map((bot) => jsxs('option', { value: `assign:${bot.id}`, children: [`Переназначить всем → ${bot.name || bot.id}`] }, `a-${bot.id}`)),
          ...STATUS_OPTIONS.map((st) => jsxs('option', { value: `status:${st}`, children: [`Сменить статус → ${STATUS_LABELS[st]}`] }, `s-${st}`)),
        ], onChange: (event) => {
          const [op, value] = event.target.value.split(':')
          event.target.value = ''
          const refs = bulkSelected.slice()
          if (!op || !refs.length) return
          if (op === 'assign') {
            setBulkReplacement(value)
            setBulkSelected(refs)
            setBulkPreview(null); setBulkOperation(null)
            previewBulk()
            return
          }
          setBulkSelected([])
          refs.forEach((ref) => changeStatus(ref, value))
        } }),
        !bulkSameSource && bulkSelected.length > 0 ? jsx('span', { style: { fontSize: 11, color: 'var(--dy-warning)', padding: '0 6px' }, children: 'у выбранных разные исполнители' }) : null,
        bulkPreview ? jsxs('button', { type: 'button', 'data-pop-action': 'execute', disabled: bulkBusy || !selectedEligible, onClick: () => { executeBulk(); }, children: [`Подтвердить переназначение (${(bulkPreview.eligible_items ?? []).length})`] }) : null,
        jsxs('button', { type: 'button', 'data-pop-action': 'clear', onClick: () => { setBulkSelected([]); setBulkPreview(null); setBulkOperation(null); setBulkError(null) }, children: ['Очистить', jsx('span', { style: { opacity: .6 }, children: ' esc' })] }),
      ] }) : null,
    ] }) : (q ? jsx(EmptyState, { title: 'Совпадений нет', description: `В бэклоге ничего нет по запросу «${search}». Сбросьте фильтр, чтобы увидеть все элементы.`, icon: 'project', children: jsx(Button, { small: true, onClick: () => setSearch(''), children: 'Сбросить фильтр' }) }) : jsx(EmptyState, { title: 'Нет ранжированных пунктов бэклога', description: 'Рабочие элементы появятся здесь после добавления в бэклог проекта.', icon: 'project' })),
    detailItem ? jsx(WorkItemDetail, { item: detailItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setDetailItem(null), onRefresh }) : null,
    jsx(BacklogImportWizard, {
      project, importOpen, importStep, importText, importMode, importRows, importValid, importError, importBusy, importResult, importSelected, importWarningsOnly, importColumnMetadata, setImportMode, setImportText, setImportRows, setImportValid, setImportError, setImportBusy, setImportStep, setImportSelected, closeImport, parseImport, runImport, api,
    }),
    jsx(BacklogReasonModal, { pendingMove, reason, setReason, error, saving, pendingParentItem, pendingParentRef, pendingParentChoices, pendingParentChanged, saveParent, saveMove, setPendingMove, typeLabel }),
    jsxs('section', {
      className: 'dockyard-modal-layer',
      'data-create-backlog-layer': true,
      hidden: !createOpen,
      onClick: (event) => { if (event.target === event.currentTarget && !createSaving) setCreateOpen(false) },
      children: [
      jsxs('form', { className: 'dockyard-modal dockyard-create-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-create-title', 'data-create-backlog-item': true, onSubmit: (event) => { event.preventDefault(); saveCreate() }, children: [
        jsxs('header', { className: 'dockyard-modal-head', children: [
          jsxs('div', { children: [jsx('span', { className: 'dockyard-create-eyebrow', children: `Новый рабочий элемент · ${project.id}` }), jsx('h2', { id: 'dockyard-create-title', children: 'Создать элемент бэклога' })] }),
          jsx(Button, { action: 'close-create-backlog-item', ariaLabel: 'Закрыть диалог создания элемента', disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Закрыть' }),
        ]}),
        jsxs('div', { className: 'dockyard-create-body', children: [
          jsxs('p', { className: 'dockyard-create-context', children: [jsx('span', { className: 'dockyard-status-dot status-backlog', 'aria-hidden': true }), 'Начинает в статусе «Бэклог» · автором запишется Sahil'] }),
          jsxs('div', { className: 'dockyard-settings-grid dockyard-create-fields', children: [
          jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [jsx('span', { children: 'Заголовок' }), jsx('input', { 'data-create-field': 'title', value: createForm.title, onInput: (event) => updateCreate('title', event.target.value), onChange: (event) => updateCreate('title', event.target.value), placeholder: 'Опишите результат поставки' })] }),
          jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Описание (необязательно)' }), jsx('textarea', { rows: 3, 'data-create-field': 'body', value: createForm.body, onChange: (event) => updateCreate('body', event.target.value), placeholder: 'Опишите результат и критерии приёмки…' })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Родитель (необязательно)' }), jsx('select', { 'data-create-field': 'parent', value: createForm.parent, onChange: (event) => updateCreate('parent', event.target.value), children: [
            ROOT_TYPES.includes(createForm.type) ? jsx('option', { value: '', children: 'Верхний уровень' }, 'none') : null,
            ...availableCreateParents.map((parent) => jsx('option', { value: parent.ref, children: `${parent.title || parent.ref} · ${typeLabel(parent.type)}` }, parent.ref)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Срок (необязательно)' }), jsx('input', { type: 'date', 'data-create-field': 'due', value: createForm.due, onInput: (event) => updateCreate('due', event.target.value), onChange: (event) => updateCreate('due', event.target.value) })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Тип' }), jsx('select', { 'data-create-field': 'type', value: createForm.type, onChange: (event) => updateCreate('type', event.target.value), children:
            availableCreateTypes.map((type) => jsx('option', { value: type, children: typeLabel(type) }, type)),
          })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Оценка в днях (необязательно)' }), jsx('input', { type: 'number', min: 0, step: 0.5, 'data-create-field': 'estimate_days', value: createForm.estimate_days, onInput: (event) => updateCreate('estimate_days', event.target.value), onChange: (event) => updateCreate('estimate_days', event.target.value), placeholder: 'напр. 2.5' })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Исполнитель' }), jsx('select', { 'data-create-field': 'assignee', value: createForm.assignee, onChange: (event) => updateCreate('assignee', event.target.value), children: [
            jsx('option', { value: '', children: 'Выбрать исполнителя' }, 'choose'),
            jsx('option', { value: UNASSIGNED, children: 'Не назначен' }, 'unassigned'),
            ...(view.bots ?? []).map((bot) => jsx('option', { value: bot.id, children: bot.name || bot.id }, bot.id)),
          ]}),
          // The note sits under the field it explains (Sahil 04/10).
          createForm.assignee === UNASSIGNED ? jsx('small', { className: 'create-help', 'data-create-help': 'unassigned', children: 'Ни один бот не подхватит это, пока оно не назначено.' }) : null,
          ] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { className: 'field-optional-hint', children: 'Инициатива' }), jsx('select', { 'data-create-field': 'initiative', value: createForm.initiative, onChange: (event) => updateCreate('initiative', event.target.value), children: [
            jsx('option', { value: '', children: 'Без инициативы' }, 'none'),
            ...(view.initiatives ?? []).map((initiative) => jsx('option', { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Ссылки на доказательства (необязательно)' }), jsx('input', { 'data-create-field': 'evidence_refs', value: createForm.evidence_refs, onChange: (event) => updateCreate('evidence_refs', event.target.value), placeholder: 'Ссылки через запятую' })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Метки (необязательно)' }), jsx('input', { 'data-create-field': 'labels', value: createForm.labels, onChange: (event) => updateCreate('labels', event.target.value), placeholder: 'Метки через запятую' })] }),
          jsxs('label', { className: 'dockyard-field field-required', children: [jsx('span', { children: 'Начальный ранг' }), jsx('input', { type: 'number', min: 1, max: maxInitialRank, 'data-create-field': 'rank', value: createForm.rank, onInput: (event) => updateCreate('rank', event.target.value), onChange: (event) => updateCreate('rank', event.target.value) })] }),
          jsxs('label', { className: 'dockyard-field dockyard-field-wide field-required', children: [jsx('span', { children: 'Причина приоритета' }), jsx('textarea', { rows: 3, 'data-create-field': 'reason', value: createForm.reason, onInput: (event) => updateCreate('reason', event.target.value), onChange: (event) => updateCreate('reason', event.target.value), placeholder: 'Почему этот элемент должен держать этот ранг?' })] }),
        ]}),
        createTouched.title && createForm.title.trim().length < 3 ? jsx('p', { className: 'create-help bad', 'data-create-help': 'title', children: 'Заголовок — минимум 3 символа.' }) : null,
        createTouched.assignee && !createForm.assignee ? jsx('p', { className: 'create-help bad', 'data-create-help': 'assignee', children: 'Выберите исполнителя или «Не назначен».' }) : null,
        createTouched.reason && createForm.reason.trim().length < 4 ? jsx('p', { className: 'create-help bad', 'data-create-help': 'reason', children: 'Требуется причина ранжирования — она становится записью аудита.' }) : null,
        jsx('p', { className: 'create-help', 'data-create-reqnote': true, children: '* обязательные поля. Начальный ранг и причина приоритета записываются в аудит бэклога.' }),
        createError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: createError }) : null,
        ]}),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Отмена' }),
          jsx(Button, { action: 'submit-create-backlog-item', variant: 'primary', disabled: createSaving || !createValid, onClick: saveCreate, children: createSaving ? 'Создание…' : 'Создать и добавить' }),
        ]}),
      ]}),
    ]}),
  ]})
}
