import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initializeAppearance,
  readAccent,
  readPreference,
  setAppearancePreference,
  siteLinks,
} from '../shared/appearance.js'

function browser(t, address, saved = {}, blockedStorage = false) {
  let url = new URL(address)
  const storage = new Map(Object.entries(saved))
  const dataset = {}
  const meta = {}
  const accessStorage = action => {
    if (blockedStorage) throw new Error('Storage unavailable')
    return action()
  }
  const globals = {
    window: { get location() { return url } },
    document: {
      documentElement: { dataset },
      querySelector: () => ({ setAttribute: (key, value) => { meta[key] = value } }),
    },
    localStorage: {
      getItem: key => accessStorage(() => storage.get(key) ?? null),
      setItem: (key, value) => accessStorage(() => storage.set(key, value)),
      removeItem: key => accessStorage(() => storage.delete(key)),
    },
    history: { replaceState: (_state, _title, next) => { url = new URL(next) } },
    getComputedStyle: () => ({ getPropertyValue: () => dataset.theme === 'light' ? '#fff' : '#000' }),
  }
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { configurable: true, get: () => url })
  t.after(() => {
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation)
    else delete globalThis.location
  })
  return { storage, dataset, meta, get url() { return url } }
}

test('URL preferences win over saved settings and invalid accents use the default', t => {
  const state = browser(t, 'https://example.test/forklift/?lang=sk&theme=light&accent=invalid', {
    locale: 'en', theme: 'dark', accent: 'cyan',
  })
  assert.equal(readPreference('locale', 'en'), 'sk')
  initializeAppearance()
  assert.deepEqual(state.dataset, { theme: 'light', accent: 'violet' })
  assert.equal(state.meta.content, '#fff')
})

test('appearance changes preserve the game route, level, locale and fragment', t => {
  const state = browser(t, 'https://example.test/office-escape/?lang=sk&level=4&accent=cyan#game', {
    'motion-accent': 'rose',
  })
  setAppearancePreference('accent', 'blue')
  assert.equal(state.url.href, 'https://example.test/office-escape/?lang=sk&level=4&accent=blue#game')
  assert.equal(state.storage.get('accent'), 'blue')
  assert.equal(state.storage.has('motion-accent'), false)
  assert.equal(readAccent().id, 'blue')
  setAppearancePreference('theme', 'light')
  assert.equal(state.url.searchParams.has('theme'), false, 'do not add an unused URL override')
  assert.equal(state.meta.content, '#fff')
})

test('blocked browser storage still allows appearance changes', t => {
  const state = browser(t, 'https://example.test/lego/?theme=dark', {}, true)
  initializeAppearance()
  assert.equal(readPreference('locale', 'en'), 'en')
  assert.equal(readAccent().id, 'violet')
  setAppearancePreference('theme', 'light')
  assert.equal(state.dataset.theme, 'light')
  assert.equal(state.url.searchParams.get('theme'), 'light')
})

test('shared navigation preserves both portfolio language routes', () => {
  assert.deepEqual(siteLinks('en'), { home: '/', games: '/games/?lang=en' })
  assert.deepEqual(siteLinks('sk'), { home: '/sk/', games: '/games/?lang=sk' })
})
