// Sahil's demo feedback (04/10, point g; videos 05/10): images, PDFs and videos
// show in the Content tab. End-to-end through the REAL plugin bundle, proxy and backend (disposable
// data), project payments-relaunch: upload through the screen, open the item,
// see the image drawn and the PDF framed from its exact stored bytes.
// Headless Chromium cannot paint a PDF, so the PDF check is that the frame holds
// the stored bytes; Sahil checks the painted page on the practice server.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from './browser-harness.mjs'
import { readFileSync } from 'node:fs'
import { SWITCHER_WORDS } from './src/lib/panel-words.js'
// The words a person reads are read from the source module that renders them,
// never spelled out here: the panel stays translatable without touching this test.
const sourceText = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const rendered = (text, pattern, what) => {
  const found = text.match(pattern)
  if (!found) throw new Error(`src no longer renders ${what}`)
  return found[1]
}
const PICKER = { button: SWITCHER_WORDS.context, find: SWITCHER_WORDS.find, list: SWITCHER_WORDS.list }
const CONTENT_SRC = sourceText('./src/project/content.js')
const PDF_TITLE = rendered(CONTENT_SRC, /title: `([^`$]*)\$\{selected\.filename\}`/, 'the PDF preview title')
const VIDEO_LABEL = rendered(CONTENT_SRC, /'aria-label': `([^`$]*)\$\{selected\.filename\}`/, 'the video player label')
const LIMIT_ALERT = CONTENT_SRC.match(/children: `([^`$]+)\$\{limitOf\(mediaTypeOf\(file\)\) \/ \(1024 \* 1024\)\}([^`]+)`/)
if (!LIMIT_ALERT) throw new Error('src no longer renders the file-limit alert')
const EXCEEDS_SENTENCE = `${LIMIT_ALERT[1]}5${LIMIT_ALERT[2]}`
const EXCEEDS_PHRASE = LIMIT_ALERT[1].trim().split(/\s+/).slice(1).join(' ')

const BASE = process.env.STEWARD_DESKTOP_URL
const PROJECT = 'payments-relaunch'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64')
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')
// The EBML magic number the backend checks for WebM, then filler.
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(20)])
const MB = 1024 * 1024

test('Content shows images, PDFs and videos from their stored bytes; videos may be 25 MB, other files 5 MB', async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: PICKER.button, exact: true }).click()
    await page.getByRole('combobox', { name: PICKER.find }).fill(PROJECT)
    await page.getByRole('listbox', { name: PICKER.list }).getByRole('option', { name: PROJECT, exact: true }).click()
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="content"]').click()
    const upload = async (name, mimeType, buffer) => {
      await page.locator('[data-content-file]').setInputFiles({ name, mimeType, buffer })
      await page.locator('[data-action="upload-project-content"]').click()
      const item = page.locator('[data-project-content-item]').filter({ hasText: name }).first()
      await item.waitFor()
      return item
    }

    await (await upload('pixel-preview.png', 'image/png', PNG)).click()
    const image = page.locator('[data-content-preview][data-preview-kind="image"]')
    await image.waitFor()
    assert.equal(await image.getAttribute('alt'), 'pixel-preview.png')
    await page.waitForFunction(() => document.querySelector('[data-preview-kind="image"]')?.complete)
    assert.deepEqual(await image.evaluate((img) => [img.naturalWidth, img.naturalHeight]), [1, 1], 'the browser decoded the image')

    await (await upload('brief-preview.pdf', 'application/pdf', PDF)).click()
    const frame = page.locator('[data-content-preview][data-preview-kind="pdf"]')
    await frame.waitFor()
    assert.equal(await frame.getAttribute('title'), `${PDF_TITLE}brief-preview.pdf`)
    const src = await frame.getAttribute('src')
    assert.match(src, /^blob:/)
    const bytes = await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), src)
    assert.deepEqual(Buffer.from(bytes), PDF, 'the frame holds the stored PDF, byte for byte')

    await (await upload('clip-preview.webm', 'video/webm', WEBM)).click()
    const video = page.locator('[data-content-preview][data-preview-kind="video"]')
    await video.waitFor()
    assert.equal(await video.getAttribute('aria-label'), `${VIDEO_LABEL}clip-preview.webm`)
    assert.equal(await video.evaluate((node) => node.controls), true)
    const videoBytes = await page.evaluate(async (url) => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), await video.getAttribute('src'))
    assert.deepEqual(Buffer.from(videoBytes), WEBM, 'the player holds the stored video, byte for byte')

    // Limits, before anything is sent: a 6 MB image is refused, a 6 MB video is fine.
    const button = page.locator('[data-action="upload-project-content"]')
    await page.locator('[data-content-file]').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.concat([PNG, Buffer.alloc(6 * MB)]) })
    assert.equal(await page.getByRole('alert').filter({ hasText: EXCEEDS_PHRASE }).innerText(), EXCEEDS_SENTENCE)
    assert.ok(await button.isDisabled())
    await page.locator('[data-content-file]').setInputFiles({ name: 'long.webm', mimeType: 'video/webm', buffer: Buffer.concat([WEBM, Buffer.alloc(6 * MB)]) })
    assert.equal(await page.getByRole('alert').filter({ hasText: EXCEEDS_PHRASE }).count(), 0)
    assert.ok(await button.isEnabled())

    // Switching back to the image releases the PDF's object URL.
    await page.locator('[data-project-content-item]').filter({ hasText: 'pixel-preview.png' }).first().click()
    await image.waitFor()
    assert.equal(await page.evaluate(async (url) => { try { await fetch(url); return 'still there' } catch { return 'released' } }, src), 'released')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
test('the PDF preview is sandboxed (catalog review, PR #136752)', { timeout: 120000 }, async () => {
  assert.ok(BASE, 'Run via run-browser-suite.mjs')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.setDefaultTimeout(10000)
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: PICKER.button, exact: true }).click()
    await page.getByRole('combobox', { name: PICKER.find }).fill(PROJECT)
    await page.getByRole('listbox', { name: PICKER.list }).getByRole('option', { name: PROJECT, exact: true }).click()
    await page.locator('[data-tab="project"]').click()
    await page.locator('[data-project-view="content"]').click()
    const name = `sandbox-check-${Date.now().toString(36)}.pdf`
    await page.locator('[data-content-file]').setInputFiles({ name, mimeType: 'application/pdf', buffer: PDF })
    await page.locator('[data-action="upload-project-content"]').click()
    const item = page.locator('[data-project-content-item]').filter({ hasText: name }).first()
    await item.waitFor()
    await item.click()
    const frame = page.locator('[data-content-preview][data-preview-kind="pdf"]')
    await frame.waitFor()
    const sandbox = await frame.getAttribute('sandbox')
    assert.ok(sandbox && sandbox.includes('allow-same-origin'), `blob PDFs render inside the plugin origin (${sandbox})`)
    assert.ok(!sandbox.includes('allow-scripts'), 'PDF previews run no scripts')
  } finally {
    await browser.close()
  }
})
