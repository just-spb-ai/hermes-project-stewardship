// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { jsx, jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { dockyardTypeLabel as typeLabel } from './backlog-model.js'

export function BacklogReasonModal(props) {
  const { pendingMove, reason, setReason, error, saving, pendingParentItem,
    pendingParentRef, pendingParentChoices, pendingParentChanged, saveParent,
    saveMove, setPendingMove } = props
  return jsxs('section', { className: 'dockyard-modal-layer', 'data-reason-modal': true, hidden: !pendingMove, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-reason-title', children: [
        jsx('h2', { id: 'dockyard-reason-title', children: pendingMove?.mode === 'parent' ? 'Сменить родителя' : 'Записать причину' }),
        jsx('p', { children: pendingMove ? (pendingMove.mode === 'parent'
          ? `Изменить, под чем находится «${pendingMove.title}». Перемещение попадёт в аудит.`
          : `Переместить «${pendingMove.title}» на ранг ${pendingMove.newRank}.`) : '' }),
        pendingMove?.mode === 'parent' ? jsxs('label', { children: [
          jsx('span', { children: 'Новый родитель' }, 'np-label'),
          jsx('select', {
            id: 'dockyard-parent-select',
            value: pendingParentRef,
            onChange: (event) => setPendingMove((current) => ({ ...current, parent_ref: event.target.value })),
            children: [
              pendingParentItem?.type !== 'subtask' ? jsx('option', { value: '', children: 'Без родителя · верхний уровень' }, 'none') : null,
              ...pendingParentChoices.map((parent) => jsx('option', { value: parent.ref, children: `${parent.title || parent.ref} · ${typeLabel(parent.type)}` }, parent.ref)),
            ],
          }, 'np-select'),
        ] }) : null,
        jsx('label', { htmlFor: 'dockyard-rank-reason', children: pendingMove?.mode === 'parent' ? 'Причина смены родителя' : 'Причина этого изменения приоритета' }),
        jsx('textarea', { id: 'dockyard-rank-reason', value: reason, onChange: (event) => setReason(event.target.value), placeholder: pendingMove?.mode === 'parent' ? 'Объясните, почему этот родитель подходит.' : 'Объясните, почему этот ранг подходит проекту.' }),
        jsx('p', { className: 'dockyard-form-hint', children: 'Введите минимум 4 символа; причина сохраняется в истории аудита.' }),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { onClick: () => setPendingMove(null), children: 'Отмена' }),
          pendingMove?.mode === 'parent'
            ? jsx(Button, { variant: 'primary', disabled: saving || !pendingParentChanged || reason.trim().length < 4, onClick: saveParent, children: saving ? 'Сохранение...' : 'Сохранить смену родителя' })
            : jsx(Button, { variant: 'primary', disabled: saving || reason.trim().length < 4, onClick: saveMove, children: saving ? 'Сохранение...' : 'Сохранить смену ранга' }),
        ]}),
      ]}),
    ]})
}
