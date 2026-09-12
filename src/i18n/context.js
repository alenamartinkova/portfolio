import { createContext, useContext } from 'react'
export const LocaleContext = createContext({ locale: 'en', t: {}, setLocale: () => {} })
export function useT() { return useContext(LocaleContext).t }
export function useLocale() { const { locale, setLocale } = useContext(LocaleContext); return [locale, setLocale] }
