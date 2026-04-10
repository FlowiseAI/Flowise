import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        backend: {
            loadPath: '/locales/{{lng}}.json'
        },
        fallbackLng: 'en',
        saveMissing: true,
        debug: true
    })

export default i18n
