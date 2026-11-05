import type { APIRoute } from 'astro';
import { defaultLocale, useTranslations } from '../i18n';

// Адреса старого сайта (`/28.html`) ведут на новые страницы. GitHub Pages не умеет редиректы,
// поэтому каждый старый адрес — страница-заглушка с мгновенным переходом.
export const LEGACY_REDIRECTS = {
  '28.html': '/events/28/',
  '29.html': '/events/29/',
  '30.html': '/events/30/',
  'personal-data.html': '/privacy/',
  // Политика жила на /personal-data/ до переноса на /privacy/: этот адрес ищут агенты.
  'personal-data/index.html': '/privacy/',
  'en/personal-data/index.html': '/en/privacy/',
  // Контакты слились со страницей «О митапе» (раздел «Контакты»); id раздела — slug заголовка.
  'contact/index.html': '/about/#%D0%BA%D0%BE%D0%BD%D1%82%D0%B0%D0%BA%D1%82%D1%8B',
  'en/contact/index.html': '/en/about/#contacts',
} as const;

export type LegacyName = keyof typeof LEGACY_REDIRECTS;

/** HTML-заглушка: переход, canonical на новый адрес, noindex и видимая ссылка. */
export function legacyStubOf(target: string, site: URL, siteName: string, lang: string): string {
  const url = new URL(target, site);
  // Якорь — для перехода к разделу; в canonical он лишний: каноническая страница одна.
  url.hash = '';
  const canonical = url.href;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${siteName}</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="noindex">
</head>
<body>
<p><a href="${target}">${target}</a></p>
</body>
</html>
`;
}

/** Эндпоинт одного старого адреса. Файл на адрес, а не `[legacy].html`: у динамического сегмента с расширением Astro 7 теряет параметр. */
export const legacyRoute =
  (name: LegacyName): APIRoute =>
  ({ site }) => {
    if (!site) throw new Error(`${name}: в astro.config не задан site`);
    const lang = name.startsWith('en/') ? 'en' : defaultLocale;
    const html = legacyStubOf(LEGACY_REDIRECTS[name], site, useTranslations(lang)('site.name'), lang);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  };
