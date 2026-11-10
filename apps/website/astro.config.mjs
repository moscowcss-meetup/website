import { defineConfig } from 'astro/config';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { markdownSafety } from './src/content/markdown-safety.ts';
import { markdownTypography } from './src/content/typography.ts';

// Прод: https://css.moscow/ (custom domain на GitHub Pages).
export default defineConfig({
  site: 'https://css.moscow',
  base: '/',
  // Страницы собираются каталогами (/en/index.html); слэш в конце делает canonical, hreflang и
  // внутренние ссылки адресами с кодом 200, без редиректа на хостинге.
  trailingSlash: 'always',
  // На Windows `localhost` часто даёт только IPv6, и часть инструментов сервер не находит.
  server: { host: '127.0.0.1' },
  // ru без префикса (`/`), en под `/en/`; список языков держать в синхроне с src/i18n/config.ts.
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // Сырой HTML и ссылки не на https/mailto в контенте роняют сборку (XSS через Markdown).
  // Типограф по тексту Markdown: неразрывные пробелы, тире, ёлочки в русском (правила в typography.ts).
  integrations: [markdownSafety, markdownTypography],
  vite: {
    plugins: [vanillaExtractPlugin()],
  },
});
