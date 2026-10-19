import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: deviceLanguage === 'vi' ? 'vi' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
