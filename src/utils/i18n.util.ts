import { I18nContext, TranslateOptions } from 'nestjs-i18n';

export function t(key: string, options?: TranslateOptions): string {
  const i18n = I18nContext.current();
  return i18n?.t(key, options) ?? key;
}

export function currentLang(): string | undefined {
  return I18nContext.current()?.lang;
}
