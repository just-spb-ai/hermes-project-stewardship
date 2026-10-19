// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// The host notification the pop-up poller puts up when the backend returns
// more due items than it surfaces (src/index.js). Pure data with no imports, so
// the jsdom contract test (e5-popup-contract.test.mjs) reads the same words the
// poller shows instead of spelling them out a second time.
export const POPUP_WORDS = Object.freeze({
  // "Ещё 2 уведомления": Russian has three plural forms, so the count phrase
  // is built here (the same rule as lib/ui.js pluralRu, which cannot be
  // imported here without React).
  more: Object.freeze({ one: 'уведомление', few: 'уведомления', many: 'уведомлений' }),
  moreTitle: (count) => {
    const n = Math.abs(Number(count) || 0)
    const mod100 = n % 100
    const mod10 = n % 10
    const word = mod100 >= 11 && mod100 <= 14 ? POPUP_WORDS.more.many
      : mod10 === 1 ? POPUP_WORDS.more.one
        : mod10 >= 2 && mod10 <= 4 ? POPUP_WORDS.more.few
          : POPUP_WORDS.more.many
    return `Ещё ${n} ${word}`
  },
})
