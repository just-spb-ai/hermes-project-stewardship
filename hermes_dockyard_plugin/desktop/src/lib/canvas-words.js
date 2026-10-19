// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// The planning canvas's own words for the ribbon tools, the proposal/plan
// card and the backlog step. The panel imports these and the browser tests
// import the same constants, so a renamed control fails wherever the word is
// read instead of drifting apart. Pure data with no imports, so a node test
// can read it directly (batch-p-plan-journey.test.mjs, batch-p-screenshots.mjs).
// Stable, language-independent ids of the ribbon's five groups (data-pc-group).
export const RIBBON_GROUPS = ['edit', 'add', 'view', 'ai', 'save']

export const CANVAS_WORDS = Object.freeze({
  addObject: 'Добавить объект',
  undo: 'Отменить',
  redo: 'Повторить',
  duplicate: 'Дублировать',
  saveCanvas: 'Сохранить канвас',
  canvasSaved: 'Холст сохранён',
  curate: 'Собрать предложения',
  answer: 'Ответ',
  approve: 'Одобрить',
  planFromProposal: 'План из предложения',
  planReady: 'План готов к проверке',
  saveDocToContent: 'Сохранить документ в «Контент»',
  docSavedToContent: 'Документ сохранён в «Контент»',
  createBacklogItems: 'Создать элементы бэклога',
  backlogItemsCreated: 'Созданные пункты бэклога',
  confirmCreate: 'Подтвердить создание',
  backlogCreatedNotice: 'Создано элементов бэклога',
  documentSavedNotice: 'Документ реализации сохранён',
  // The ribbon's five groups, in order. `data-pc-group` carries a stable English
  // id — the canvas stylesheet matches [data-pc-group="edit"] and friends to clamp
  // tooltips at the frame edges — so the ids must never follow the label's
  // language. RIBBON_GROUPS publishes them for tests and for the panel itself.
  ribbonEdit: 'Изменить',
  ribbonAdd: 'Добавить',
  ribbonView: 'Вид',
  ribbonAi: 'AI',
  ribbonSave: 'Сохранить',
  // Words inside the canvas's own messages (review summary, link refusal).
  reviewClaims: 'утверждений',
  notWebLink: 'не веб-ссылка',
  // The owner picker's empty choice and the card summary's link count.
  unassigned: 'Не назначен',
  linkOne: 'связь',
  linkMany: 'связей',
})

// The words the rich-text editor refuses a card with, in order of the checks
// in src/project/rich-text.js. Pure, so a browser test can read them and
// compare the editor's warning exactly instead of restating it.
export const RICH_TEXT_PROBLEMS = Object.freeze({
  tooLong: (chars, limit) => `Слишком длинно: ${chars} из ${limit} символов. Сократите текст перед применением.`,
  tooMuchFormatting: (nodes, limit) => `Слишком много форматирования: ${nodes} из ${limit} фрагментов. Уберите часть абзацев или форматирования перед применением.`,
  tooLarge: 'Карточка слишком большая для сохранения. Уберите часть текста или форматирования перед применением.',
})
