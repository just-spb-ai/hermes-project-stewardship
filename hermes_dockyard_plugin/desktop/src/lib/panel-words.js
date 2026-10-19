// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// The panel's own words for the controls a browser test has to find by name:
// the console's sections, the project screen's views, the project switcher,
// the Roadmap's place/confirm dialogs, and the work card's full-details
// action. The UI imports these and the tests import the same constants, so a
// renamed control fails wherever the word is read instead of drifting apart.
// Pure data with no imports, so a node test can read it directly.
export const CONSOLE_TABS = Object.freeze({
  dashboard: 'Панель',
  project: 'Проекты',
  roadmap: 'Дорожная карта',
  backlog: 'Бэклог',
  workflows: 'Процессы',
  inbox: 'Входящие одобрения',
  notifications: 'Уведомления',
  settings: 'Настройки приложения',
})

// The project screen's view bar (ProjectDashboard), in order.
export const PROJECT_VIEWS = Object.freeze({
  overview: 'Обзор',
  plan: 'Видение',
  board: 'Канбан',
  planning: 'Планирование',
  workflows: 'Процессы',
  content: 'Контент',
  memory: 'Память',
  activity: 'Активность',
  reports: 'Отчёты',
  settings: 'Настройки',
})

// The global project switcher: the trigger, the search box and the listbox.
export const SWITCHER_WORDS = Object.freeze({
  context: 'Контекст проекта',
  find: 'Найти проект',
  list: 'Проекты',
  // The trigger's text when no project is in scope yet.
  empty: 'Выбрать проект',
})

// The Roadmap's place action and the confirm-delivered dialog.
export const ROADMAP_WORDS = Object.freeze({
  place: 'Разместить…',
  confirmDelivered: 'Подтвердить поставку',
  closeConfirmDialog: 'Закрыть диалог подтверждения',
})

// The expanded work card's open action.
export const WORK_CARD_WORDS = Object.freeze({
  openDetails: 'Полные детали',
})
