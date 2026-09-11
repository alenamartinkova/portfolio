export const SITE_ORIGIN = 'https://martinkova.dev'

export const portfolioUrl = locale => `${SITE_ORIGIN}/${locale === 'sk' ? 'sk/' : ''}`

/** Keep the person/site identity shared, and the profile page locale-specific. */
export function localizeStructuredData(data, locale, meta) {
  return {
    ...data,
    '@graph': data['@graph'].map(node => {
      if (node['@type'] === 'Person') return { ...node, description: meta.description }
      if (node['@type'] !== 'ProfilePage') return node
      const url = portfolioUrl(locale)
      return { ...node, '@id': `${url}#page`, url, inLanguage: locale, name: meta.title, description: meta.description }
    }),
  }
}
