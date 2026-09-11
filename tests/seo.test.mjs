import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { localizeStructuredData, portfolioUrl } from '../src/seo.js'
import en from '../src/i18n/en.js'
import sk from '../src/i18n/sk.js'

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const data = JSON.parse(template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])

test('localized structured data retains shared identity and follows the canonical page', () => {
  const original = structuredClone(data)
  for (const [locale, dictionary] of [['sk', sk], ['en', en]]) {
    const localized = localizeStructuredData(data, locale, dictionary.meta)
    const page = localized['@graph'].find(node => node['@type'] === 'ProfilePage')
    const person = localized['@graph'].find(node => node['@type'] === 'Person')
    assert.equal(page.url, portfolioUrl(locale))
    assert.equal(page['@id'], `${portfolioUrl(locale)}#page`)
    assert.equal(page.inLanguage, locale)
    assert.equal(page.description, dictionary.meta.description)
    assert.equal(person.description, dictionary.meta.description)
    assert.equal(page.mainEntity['@id'], 'https://martinkova.dev/#person')
    assert.deepEqual(localizeStructuredData(localized, 'en', en.meta), localizeStructuredData(data, 'en', en.meta), 'Language changes must restore English metadata')
  }
  assert.deepEqual(data, original, 'Never mutate the shared source graph')
})
