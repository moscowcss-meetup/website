import { localizePath, type Locale, type UiKey } from '../i18n';

// Сообщество появилось раньше первого митапа (2017): подвал считает годы от сообщества.
const COMMUNITY_FOUNDED = 2015;

const moscowYear = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric' });

/** Строка копирайта; конец периода — год сборки по Москве, ночная пересборка переводит его сама. */
export function copyrightOf(t: (key: UiKey) => string, now: Date): string {
  return t('footer.copyright').replace('{years}', `${COMMUNITY_FOUNDED}–${moscowYear.format(now)}`);
}

export function footerLinksOf(locale: Locale, t: (key: UiKey) => string, telegramUrl: string) {
  return [
    { href: localizePath(locale, 'privacy'), label: t('footer.rules') },
    { href: telegramUrl, label: t('footer.telegram'), external: true },
  ];
}
