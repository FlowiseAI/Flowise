import i18n from '@/i18n'

export const getPersistedLanguage = () => {
    return localStorage.getItem('i18nextLng')
}

export const applyPersistedLanguage = async () => {
    const persistedLanguage = getPersistedLanguage()
    if (!persistedLanguage) return
    if (i18n.resolvedLanguage === persistedLanguage) return

    await i18n.changeLanguage(persistedLanguage)
}

export const getI18nLanguages = (instance) => {
    const supportedLngs = instance.options?.supportedLngs?.filter((lng) => lng && lng !== 'cimode')
    if (supportedLngs?.length) return supportedLngs

    const loadedLngs = Object.keys(instance.store?.data || {})
    if (loadedLngs.length) return loadedLngs

    if (instance.resolvedLanguage) return [instance.resolvedLanguage]

    if (Array.isArray(instance.options?.fallbackLng)) return instance.options.fallbackLng
    if (typeof instance.options?.fallbackLng === 'string') return [instance.options.fallbackLng]

    return ['en']
}

export const setPersistedLanguage = (language) => {
    if (!language) return
    localStorage.setItem('i18nextLng', language)
}
