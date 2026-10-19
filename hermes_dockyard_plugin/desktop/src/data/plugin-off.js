// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// A Hermes profile without the plugin's backend (a second profile,
// 10/10/2026). The Desktop half is the same for every profile, so the sidebar
// still offers Project Stewardship; every call to the backend then fails with
// the host's "404: Plugin not found". That is a setting to change, not a
// broken page: say so and how, instead of the error card (owner decision
// 11/10/2026).
export const PLUGIN_OFF_TITLE = 'Project Stewardship не включён для этого профиля'
export const PLUGIN_OFF_DETAIL = 'Он работает отдельно для каждого профиля Hermes, и в этом профиле он не включён, поэтому здесь нечего показывать. Ничего не потеряно: ваши проекты остаются в профилях, где он включён.'
export const PLUGIN_OFF_COMMAND = 'hermes -p <profile> plugins enable hermes-project-stewardship'
export const PLUGIN_OFF_NEXT_STEP = 'Включите его для этого профиля на странице «Плагины» или выполните команду ниже, затем нажмите «Попробовать снова».'

// The host's own words when the plugin's backend is not enabled for the
// profile. The status may come with or without the colon.
const PLUGIN_OFF = /^404:?\s*Plugin not found\b/i

export function isPluginOffError(error) {
  return error?.pluginOff === true || PLUGIN_OFF.test(String(error?.message ?? error ?? ''))
}
