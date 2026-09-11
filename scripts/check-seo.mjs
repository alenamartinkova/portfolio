/** Validate the actual HTML/assets that will ship, without executing page JS. */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import en from '../src/i18n/en.js'
import sk from '../src/i18n/sk.js'
import { portfolioUrl, SITE_ORIGIN } from '../src/seo.js'

const build = new URL('../build/', import.meta.url)
const read = path => readFileSync(new URL(path, build), 'utf8')
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'")
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))]
  .map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])))

export function checkPortfolioHtml(html, locale, dictionary) {
  const canonical = portfolioUrl(locale)
  const meta = tags(html, 'meta')
  const links = tags(html, 'link')
  const value = key => {
    const matches = meta.filter(tag => tag.name === key || tag.property === key)
    assert.equal(matches.length, 1, `${locale}: exactly one ${key}`)
    return matches[0].content
  }
  assert.equal(tags(html, 'html')[0]?.lang, locale)
  assert.equal((html.match(/<title>/g) || []).length, 1)
  assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || ''), dictionary.meta.title)
  assert.equal(value('description'), dictionary.meta.description)
  assert.ok(!meta.some(tag => /^(robots|googlebot)$/i.test(tag.name || '') && /noindex|nofollow|none/i.test(tag.content)), 'Portfolio must remain indexable')
  assert.deepEqual(links.filter(tag => tag.rel === 'canonical').map(tag => tag.href), [canonical])
  assert.deepEqual(Object.fromEntries(links.filter(tag => tag.hreflang).map(tag => [tag.hreflang, tag.href])), {
    en: portfolioUrl('en'), sk: portfolioUrl('sk'), 'x-default': portfolioUrl('en'),
  })
  for (const key of ['og:title', 'twitter:title']) assert.equal(value(key), dictionary.meta.title)
  for (const key of ['og:description', 'twitter:description']) assert.equal(value(key), dictionary.meta.description)
  assert.equal(value('og:url'), canonical)
  assert.equal(value('og:locale'), locale === 'sk' ? 'sk_SK' : 'en_US')
  assert.equal(value('og:locale:alternate'), locale === 'sk' ? 'en_US' : 'sk_SK')
  assert.equal(value('og:image'), value('twitter:image'))
  assert.equal(value('twitter:card'), 'summary')

  const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] || ''
  assert.equal(tags(body, 'h1').length, 1, 'Exactly one visible hero heading')
  assert.ok(body.includes('Alena Martinková') && body.includes('Rankacy'))
  assert.ok(body.replace(/<[^>]*>/g, ' ').split(/\s+/).length > 700, 'Portfolio content must be prerendered')
  const ids = tags(body, '[a-z][a-z0-9]*').map(tag => tag.id).filter(Boolean)
  assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique')
  for (const id of ['about', 'stack', 'work', 'career', 'contact', 'client-work-grid']) assert.ok(ids.includes(id), `Missing ${id}`)
  const anchors = tags(body, 'a')
  for (const link of anchors.filter(tag => tag.href?.startsWith('#'))) assert.ok(ids.includes(link.href.slice(1)), `Broken anchor ${link.href}`)
  const alternate = locale === 'en' ? 'sk' : 'en'
  const alternatePath = alternate === 'sk' ? '/sk/' : '/'
  assert.ok(anchors.some(tag => tag.href === alternatePath && (tag.hrefLang || tag.hreflang) === alternate), 'Crawlable language switch')
  assert.ok(anchors.some(tag => tag.href === `/games/?lang=${locale}`))
  for (const image of tags(body, 'img')) {
    assert.ok(image.alt?.trim(), 'Portrait needs an alt description')
    assert.ok(Number(image.width) > 0 && Number(image.height) > 0, 'Image dimensions reserve layout space')
  }
  const json = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  assert.equal(json.length, 1)
  const data = JSON.parse(json[0][1])
  assert.equal(data['@context'], 'https://schema.org')
  const person = data['@graph'].find(node => node['@type'] === 'Person')
  const website = data['@graph'].find(node => node['@type'] === 'WebSite')
  const page = data['@graph'].find(node => node['@type'] === 'ProfilePage')
  assert.equal(page.url, canonical)
  assert.equal(page['@id'], `${canonical}#page`)
  assert.equal(page.inLanguage, locale)
  assert.equal(page.name, dictionary.meta.title)
  assert.equal(page.description, dictionary.meta.description)
  assert.equal(page.mainEntity['@id'], person['@id'])
  assert.equal(page.isPartOf['@id'], website['@id'])
  assert.equal(person.name, 'Alena Martinková')
  assert.equal(person.description, dictionary.meta.description)
  assert.deepEqual(website.inLanguage, ['en', 'sk'])
}

function checkBuild() {
  for (const [locale, dictionary, path] of [['en', en, 'index.html'], ['sk', sk, 'sk/index.html']]) {
    const html = read(path)
    checkPortfolioHtml(html, locale, dictionary)
    const resources = [
      ...tags(html, 'link').filter(tag => ['stylesheet', 'preload', 'modulepreload', 'icon'].includes(tag.rel)).map(tag => tag.href),
      ...tags(html, 'script').map(tag => tag.src),
      ...tags(html, 'img').flatMap(tag => [tag.src, ...(tag.srcSet || tag.srcset || '').split(',').map(item => item.trim().split(/\s+/)[0])]),
      ...tags(html, 'meta').filter(tag => ['og:image', 'twitter:image'].includes(tag.property || tag.name)).map(tag => tag.content),
    ].filter(Boolean)
    for (const resource of resources) {
      const url = new URL(resource, SITE_ORIGIN)
      if (url.origin === SITE_ORIGIN) assert.ok(existsSync(new URL(`.${url.pathname}`, build)), `Missing asset: ${url.pathname}`)
    }
    console.log(`SEO: ${locale} — content, headings, language links, metadata, structured data and assets OK`)
  }
  const sitemap = read('sitemap.xml')
  assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url), [portfolioUrl('en'), portfolioUrl('sk')])
  for (const [, entry] of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    assert.ok(entry.includes(`hreflang="en" href="${portfolioUrl('en')}"`))
    assert.ok(entry.includes(`hreflang="sk" href="${portfolioUrl('sk')}"`))
  }
  const robots = read('robots.txt')
  assert.ok(!/^Disallow:\s*\/\s*$/mi.test(robots))
  assert.ok(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`))
  console.log('SEO: sitemap and robots.txt OK')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkBuild()
