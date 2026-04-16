import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import id from './locales/id.json';

const stored = typeof window !== 'undefined' ? localStorage.getItem('app_lang') : null;
const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
const lang = stored || (browserLang === 'id' ? 'id' : 'en');

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, id: { translation: id } },
  lng: lang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
