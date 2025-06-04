import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Add this line to use i18next-http-backend
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: { // Configure the backend
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
    },
    // ns: ['translation'], // Optional: define namespaces if you use them
    // defaultNS: 'translation', // Optional: default namespace
  });

export default i18n;
